import test from 'node:test';
import assert from 'node:assert/strict';
import { aiConfiguration, aiConfigured, createReport } from '../lib/reports.ts';

const source = [{
  id: 'one', title: 'Friends', participants: ['A', 'B'], context: 'closeFriend',
  messages: Array.from({length: 6}, (_, i) => ({sender: i % 2 ? 'A' : 'B', text: `Exact original line ${i}`, timestamp: null})),
}];
const sections = () => Array.from({length: 5}, (_, i) => ({
  title: `Observation ${i + 1}`, body: 'First observation {{0}}. Reply {{1}}.',
  quotes: [{sender: 'A', text: 'Exact original line 1'}, {sender: 'B', text: 'Exact original line 2'}],
}));
const envKeys = ['AI_PROVIDER', 'AI_MODEL', 'AI_BASE_URL', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY'];

async function withProvider(provider, run) {
  const before = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  for (const key of envKeys) delete process.env[key];
  Object.assign(process.env, {AI_PROVIDER: provider, AI_MODEL: 'test-model', AI_BASE_URL: 'https://provider.invalid/v1', [`${provider.toUpperCase()}_API_KEY`]: 'test-key'});
  try { await run(); }
  finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
}

function providerResponse(provider, report) {
  const text = JSON.stringify(report);
  return Response.json(provider === 'anthropic' ? {
    id: 'msg_test', type: 'message', role: 'assistant', model: 'test-model',
    content: [{type: 'text', text}], stop_reason: 'end_turn', stop_sequence: null,
    usage: {input_tokens: 100, output_tokens: 100},
  } : {
    id: 'resp_test', object: 'response', status: 'completed', created_at: 1, model: 'test-model',
    output: [{id: 'msg_test', type: 'message', role: 'assistant', status: 'completed', content: [{type: 'output_text', text, annotations: []}]}],
    usage: {input_tokens: 100, output_tokens: 100, total_tokens: 200},
  });
}

test('report defaults to local even when an AI provider is configured', async () => {
  await withProvider('anthropic', async () => {
    assert.equal(aiConfigured(), true);
    let requests = 0;
    globalThis.fetch = async () => { requests++; throw new Error('Local mode must not send any request.'); };
    const report = await createReport(source, {person: 'A'});
    assert.equal(report.mode, 'local'); assert.equal(report.person, 'A'); assert.equal(report.messageCount, 6);
    assert.ok(report.sections.some(s => s.body.includes('Local analysis'))); assert.equal(requests, 0);
    for (const section of report.sections) for (const quote of section.quotes ?? []) assert.match(quote.text, /^Exact original line \d$/);
  });
});

for (const provider of ['anthropic', 'openai']) {
  test(`${provider} AI SDK adapter uses its provider API and validates exact source quotes`, async () => {
    await withProvider(provider, async () => {
      let request;
      globalThis.fetch = async (url, options) => {
        request = {url: String(url), options};
        return providerResponse(provider, {title: 'The original line and the reply', sections: sections()});
      };
      const report = await createReport(source, {mode: 'ai', person: 'A', language: 'Hinglish', tone: 'No filter'});
      assert.equal(report.mode, 'ai'); assert.equal(report.title, 'The original line and the reply'); assert.equal(report.person, 'A');
      assert.deepEqual(report.sections, sections(), 'Evidence and its placement must remain unchanged.');
      assert.equal(report.language, 'Hinglish');
      assert.match(request.url, provider === 'anthropic' ? /\/v1\/messages$/ : /\/v1\/responses$/);
      const payload = JSON.parse(request.options.body);
      assert.equal(payload.model, 'test-model');
      if (provider === 'anthropic') {
        assert.equal(payload.max_tokens, 12000);
        assert.equal(payload.output_config.effort, 'high');
        assert.equal(payload.thinking.type, 'between_tools');
      }
      assert.match(request.options.body, /Exact original line 1/);
      assert.match(request.options.body, /my read/);
      assert.match(request.options.body, /\{\{0\}\}/);
      assert.doesNotMatch(JSON.stringify(aiConfiguration()), /test-key/);
    });
  });
}

test('provider failures are surfaced and malformed structured reports are rejected', async () => {
  await withProvider('openai', async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({error: {message: 'Invalid API key', type: 'authentication_error', code: 'invalid_api_key'}}, {status: 401}); };
    await assert.rejects(() => createReport(source, {mode: 'ai', person: 'A'}), /401/);
    assert.equal(calls, 1, 'A failed billable generation is not automatically retried.');
    globalThis.fetch = async () => providerResponse('openai', {title: 'Too short', sections: sections().slice(0, 1)});
    await assert.rejects(() => createReport(source, {mode: 'ai', person: 'A'}), /5–8 sections/);
  });
});

test('missing provider keys cannot silently turn an AI request into a local report', async () => {
  await withProvider('anthropic', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    assert.equal(aiConfigured(), false);
    await assert.rejects(() => createReport(source, {mode: 'ai', person: 'A'}), /not configured/);
    assert.equal((await createReport(source, {person: 'A'})).mode, 'local');
  });
});

test('invented or misattributed quotes reject the report instead of shifting evidence', async () => {
  await withProvider('openai', async () => {
    for (const index of [0, 1]) {
      for (const invalid of [
        {sender: 'A', text: 'Invented quote'},
        {sender: 'B', text: 'Exact original line 1'},
      ]) {
        const output = sections();
        output[0].quotes[index] = invalid;
        globalThis.fetch = async () => providerResponse('openai', {title: 'Invalid evidence', sections: output});
        await assert.rejects(() => createReport(source, {mode: 'ai', person: 'A'}), /quote that did not match/);
      }
    }
  });
});

test('missing, duplicate and out-of-range quote references reject the report', async () => {
  await withProvider('anthropic', async () => {
    for (const body of [
      'One marker for two quotes {{0}}.',
      'No markers at all.',
      'Duplicated {{0}} {{0}} {{1}}.',
      'Wrong index {{0}} {{2}}.',
      'Only invalid indexes {{2}} {{3}}.',
    ]) {
      const output = sections();
      output[0].body = body;
      globalThis.fetch = async () => providerResponse('anthropic', {title: 'Broken references', sections: output});
      await assert.rejects(() => createReport(source, {mode: 'ai', person: 'A'}), /invalid quote references/);
    }
    const output = sections();
    output[0].quotes = [];
    globalThis.fetch = async () => providerResponse('anthropic', {title: 'Dangling references', sections: output});
    await assert.rejects(() => createReport(source, {mode: 'ai', person: 'A'}), /invalid quote references/);
  });
});

for (const timestamp of ['2026-05-20T07:17:00.000Z', null]) {
  test(`repeated messages are preserved with timestamp ${timestamp}`, async () => {
    const messages = [
      {sender: 'A', text: 'same', timestamp},
      {sender: 'A', text: 'same', timestamp},
      {sender: 'B', text: 'other', timestamp},
    ];
    const conversations = [{id: 'repeated', title: 'Repeated', participants: ['A', 'B'], messages}];
    const local = await createReport(conversations, {person: 'A'});
    assert.equal(local.messageCount, 3);
    assert.equal(local.stats.wordCount, 3);
    assert.equal(local.stats.participants.find(p => p.name === 'A').messages, 2);
    await withProvider('openai', async () => {
      let payload;
      globalThis.fetch = async (_, options) => {
        payload = JSON.parse(options.body);
        const output = sections().map(s => ({...s, body: 'Repeated {{0}}. Reply {{1}}.', quotes: [
          {sender: 'A', text: 'same'}, {sender: 'B', text: 'other'},
        ]}));
        return providerResponse('openai', {title: 'Repeated messages', sections: output});
      };
      const ai = await createReport(conversations, {person: 'A', mode: 'ai'});
      assert.equal(ai.messageCount, 3);
      const prompt = payload.input.find(item => item.role === 'user').content[0].text;
      assert.deepEqual(JSON.parse(prompt).conversations[0].messages, messages);
    });
    assert.equal(messages.length, 3);
  });
}

test('Ultimate does not imply replies between separate chats', async () => {
  const report = await createReport(['one', 'two'].map((id, i) => ({id, title: id, participants: ['A', 'B'], messages: [{sender: i ? 'A' : 'B', text: 'A real message', timestamp: `2026-11-13T10:0${i}:00.000Z`}]})), {mode: 'local', person: 'A'});
  assert.equal(report.kind, 'ultimate'); assert.ok(report.stats.participants.every(p => p.medianReplyMinutes === null));
  assert.deepEqual(report.conversationIds, ['one', 'two']);
});

test('truncated Claude output reports the output limit instead of a section-count error', async () => {
  await withProvider('anthropic', async () => {
    globalThis.fetch = async () => Response.json({
      id: 'msg_truncated', type: 'message', role: 'assistant', model: 'test-model',
      content: [{type: 'text', text: '{"title":"A report","sections":['}],
      stop_reason: 'max_tokens', stop_sequence: null,
      usage: {input_tokens: 100, output_tokens: 10000},
    });
    await assert.rejects(() => createReport(source, {mode:'ai',person:'A'}), /output limit/);
  });
});
