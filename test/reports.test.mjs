import test from 'node:test';
import assert from 'node:assert/strict';
import { aiConfiguration, aiConfigured, createReport } from '../lib/reports.ts';
import { computeStats } from '../lib/parser.mjs';

const source = [{
  id: 'one', title: 'Friends', participants: ['A', 'B'], context: 'closeFriend',
  messages: Array.from({length: 6}, (_, i) => ({sender: i % 2 ? 'A' : 'B', text: `Exact original line ${i}`, timestamp: null})),
}];
const sections = () => Array.from({length: 5}, (_, i) => ({
  title: `Observation ${i + 1}`, body: 'First observation {{0}}. Reply {{1}}.',
  quotes: [{sender: 'A', text: 'Exact original line 1'}, {sender: 'B', text: 'Exact original line 2'}],
}));
const envKeys = ['AI_PROVIDER', 'AI_MODEL', 'AI_BASE_URL', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'AI_ANALYSIS_MODEL', 'AI_MAX_REPORT_COST_USD', 'AI_TARGET_INPUT_TOKENS'];

async function withProvider(provider, run) {
  const before = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  for (const key of envKeys) delete process.env[key];
  Object.assign(process.env, {AI_PROVIDER: provider, AI_MODEL: provider === 'anthropic' ? 'claude-sonnet-5-5' : 'test-model', AI_BASE_URL: 'https://provider.invalid/v1', [`${provider.toUpperCase()}_API_KEY`]: 'test-key'});
  try { await run(); }
  finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
}

function setProviderFetch(handler) {
  globalThis.fetch = async (url, options) => {
    if (process.env.AI_PROVIDER === 'anthropic') {
      if (String(url).includes('/models/')) return Response.json({id: String(url).split('/').at(-1), max_input_tokens: 1000000, max_tokens: 128000, capabilities: {structured_outputs: {supported: true}, thinking: {types: {between_tools: {supported: true}, disabled: {supported: true}}}}});
      if (String(url).endsWith('/count_tokens')) return Response.json({input_tokens: Math.ceil(String(options.body).length / 4)});
    }
    return handler(url, options);
  };
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

function providerPrompt(provider, options) {
  const payload = JSON.parse(options.body);
  const content = (provider === 'anthropic' ? payload.messages : payload.input)
    .find(item => item.role === 'user').content;
  return typeof content === 'string' ? content : content[0].text;
}

for (const provider of ['openai']) {
  test(`${provider} large chats keep a complete recent suffix within the full input budget`, async () => {
    await withProvider(provider, async () => {
      const messages = Array.from({length: 60}, (_, i) => ({
        sender: i % 2 ? 'A' : 'B',
        text: `Message ${i}: ${'-'.repeat(10000)}\n"quoted" \\ हिन्दी 🙂`,
        timestamp: `2026-10-${String(1 + Math.floor(i / 3)).padStart(2, '0')}T10:00:00.000Z`,
      }));
      const conversations = [{...source[0], messages}];
      const original = structuredClone(conversations);
      let prompt;
      setProviderFetch(async (_, options) => {
        prompt = providerPrompt(provider, options);
        const output = sections();
        output[0].quotes = [
          {sender: messages[0].sender, text: messages[0].text},
          {sender: messages.at(-1).sender, text: messages.at(-1).text},
        ];
        return providerResponse(provider, {title: 'Recent evidence', sections: output});
      });
      const report = await createReport(conversations, {mode: 'ai', person: 'A', contextNotes: 'Notes '.repeat(800)});
      const input = JSON.parse(prompt);
      const included = input.conversations[0].messages;
      assert.ok(prompt.length <= 400000);
      assert.ok(included.length > 0 && included.length < messages.length);
      assert.deepEqual(included, messages.slice(-included.length));
      assert.deepEqual(input.stats, computeStats(messages));
      assert.deepEqual(report.stats, input.stats);
      assert.equal(report.messageCount, messages.length);
      assert.deepEqual(report.aiCoverage, [{conversationId: 'one', totalMessages: messages.length, includedMessages: included.length}]);
      assert.deepEqual(input.coverage, report.aiCoverage);
      assert.equal(input.recentMessages, undefined, 'Recent messages must not bypass the budget in a second copy.');
      assert.deepEqual(report.sections[0].quotes, [{sender: messages.at(-1).sender, text: messages.at(-1).text}], 'Omitted messages are not valid quoted evidence.');
      input.conversations[0].messages.unshift(messages.at(-included.length - 1));
      input.coverage[0].includedMessages++;
      assert.ok(JSON.stringify(input).length > 400000, 'The next complete message would exceed the budget.');
      assert.deepEqual(conversations, original, 'Selecting AI coverage must not mutate the source.');
      setProviderFetch(async () => { throw new Error('Local analysis must not use AI.'); });
      const local = await createReport(conversations, {mode: 'local', person: 'A'});
      assert.deepEqual(local.stats, report.stats);
      assert.equal(local.aiCoverage, undefined);
    });
  });
}

test('the AI input accepts exactly 400,000 characters and drops an older message one character over', async () => {
  await withProvider('openai', async () => {
    const conversations = [{...source[0], messages: source[0].messages.map(m => ({...m, text: '-'}))}];
    let prompt;
    setProviderFetch(async (_, options) => {
      prompt = providerPrompt('openai', options);
      return providerResponse('openai', {title: 'Boundary', sections: sections()});
    });
    await createReport(conversations, {mode: 'ai', person: 'A'});
    conversations[0].messages[0].text = '-'.repeat(400000 - prompt.length + 1);
    const full = await createReport(conversations, {mode: 'ai', person: 'A'});
    assert.equal(prompt.length, 400000);
    assert.equal(full.aiCoverage[0].includedMessages, 6);
    conversations[0].messages[0].text += '-';
    const trimmed = await createReport(conversations, {mode: 'ai', person: 'A'});
    assert.equal(trimmed.aiCoverage[0].includedMessages, 5);
    assert.deepEqual(JSON.parse(prompt).conversations[0].messages, conversations[0].messages.slice(1));
  });
});

test('an oversized middle message ends the recent window instead of skipping to older messages', async () => {
  await withProvider('openai', async () => {
    const messages = source[0].messages.map(m => ({...m}));
    messages[3].text = '-'.repeat(400000);
    let input;
    setProviderFetch(async (_, options) => {
      input = JSON.parse(providerPrompt('openai', options));
      return providerResponse('openai', {title: 'Recent window', sections: sections()});
    });
    const report = await createReport([{...source[0], messages}], {mode: 'ai', person: 'A'});
    assert.deepEqual(input.conversations[0].messages, messages.slice(4));
    assert.equal(report.aiCoverage[0].includedMessages, 2);
    let calls = 0;
    setProviderFetch(async () => { calls++; throw new Error('No request should be sent.'); });
    messages.at(-1).text = '-'.repeat(400000);
    await assert.rejects(() => createReport([{...source[0], messages}], {mode: 'ai', person: 'A'}), /newest message.*too large/);
    await assert.rejects(() => createReport(source, {mode: 'ai', person: 'A', contextNotes: '-'.repeat(400000)}), /statistics and report settings.*too large/);
    assert.equal(calls, 0);
  });
});

test('multi-chat AI coverage retains a recent suffix from every chat in one shared budget', async () => {
  await withProvider('openai', async () => {
    const conversations = ['one', 'two', 'three'].map((id, chat) => ({
      ...source[0], id,
      messages: Array.from({length: chat === 2 ? 6 : 50}, (_, i) => ({
        sender: i % 2 ? 'A' : 'B', text: `${id} ${i} ${'-'.repeat(10000)}`, timestamp: null,
      })),
    }));
    let prompt;
    setProviderFetch(async (_, options) => {
      prompt = providerPrompt('openai', options);
      return providerResponse('openai', {title: 'Across chats', sections: sections()});
    });
    const report = await createReport(conversations, {mode: 'ai', person: 'A'});
    const input = JSON.parse(prompt);
    assert.ok(prompt.length <= 400000);
    assert.equal(report.messageCount, 106);
    input.conversations.forEach((conversation, i) => {
      const count = conversation.messages.length;
      assert.ok(count > 0);
      assert.deepEqual(conversation.messages, conversations[i].messages.slice(-count));
      assert.deepEqual(report.aiCoverage[i], {conversationId: conversations[i].id, totalMessages: conversations[i].messages.length, includedMessages: count});
    });
    assert.equal(report.aiCoverage[2].includedMessages, 6);
  });
});

test('report defaults to local even when an AI provider is configured', async () => {
  await withProvider('anthropic', async () => {
    assert.equal(aiConfigured(), true);
    let requests = 0;
    setProviderFetch(async () => { requests++; throw new Error('Local mode must not send any request.'); });
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
      setProviderFetch(async (url, options) => {
        request = {url: String(url), options};
        return providerResponse(provider, {title: 'The original line and the reply', sections: sections()});
      });
      const report = await createReport(source, {mode: 'ai', person: 'A', language: 'Hinglish', tone: 'No filter'});
      assert.equal(report.mode, 'ai'); assert.equal(report.title, 'The original line and the reply'); assert.equal(report.person, 'A');
      assert.deepEqual(report.sections, sections(), 'Evidence and its placement must remain unchanged.');
      assert.equal(report.language, 'Hinglish');
      assert.match(request.url, provider === 'anthropic' ? /\/v1\/messages$/ : /\/v1\/responses$/);
      const payload = JSON.parse(request.options.body);
      assert.equal(payload.model, process.env.AI_MODEL);
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
    setProviderFetch(async () => { calls++; return Response.json({error: {message: 'Invalid API key', type: 'authentication_error', code: 'invalid_api_key'}}, {status: 401}); });
    await assert.rejects(() => createReport(source, {mode: 'ai', person: 'A'}), /401/);
    assert.equal(calls, 1, 'A failed billable generation is not automatically retried.');
    setProviderFetch(async () => providerResponse('openai', {title: 'Too short', sections: sections().slice(0, 1)}));
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

test('invented or misattributed quotes are dropped without moving the real lines', async () => {
  await withProvider('openai', async () => {
    for (const index of [0, 1]) {
      for (const invalid of [
        {sender: 'A', text: 'Invented quote'},
        {sender: 'B', text: 'Exact original line 1'},
      ]) {
        const output = sections();
        const kept = output[0].quotes.filter((_, quoteIndex) => quoteIndex !== index);
        output[0].quotes[index] = invalid;
        setProviderFetch(async () => providerResponse('openai', {title: 'Invalid evidence', sections: output}));
        const report = await createReport(source, {mode: 'ai', person: 'A'});
        assert.deepEqual(report.sections[0].quotes, kept);
        assert.equal(report.sections[0].body.includes('{{0}}'), true);
        assert.equal(report.sections[0].body.includes('{{1}}'), false);
        assert.equal(report.sections[0].body.includes('Invented quote'), false);
      }
    }
  });
});

test('misplaced quote markers are aligned to the real quotes', async () => {
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
      setProviderFetch(async () => providerResponse('anthropic', {title: 'Broken references', sections: output}));
      const report = await createReport(source, {mode: 'ai', person: 'A'});
      assert.equal(report.sections[0].quotes.length, 2);
      assert.equal(report.sections[0].body.match(/\{\{0\}\}/g).length, 1);
      assert.equal(report.sections[0].body.match(/\{\{1\}\}/g).length, 1);
      assert.equal(report.sections[0].body.includes('{{2}}'), false);
    }
    const output = sections();
    output[0].quotes = [];
    setProviderFetch(async () => providerResponse('anthropic', {title: 'Dangling references', sections: output}));
    const report = await createReport(source, {mode: 'ai', person: 'A'});
    assert.deepEqual(report.sections[0].quotes, []);
    assert.equal(report.sections[0].body.includes('{{'), false);
  });
});

test('an overlong title is shortened instead of discarding the report', async () => {
  await withProvider('anthropic', async () => {
    setProviderFetch(async () => providerResponse('anthropic', {title: 'T'.repeat(250), sections: sections()}));
    const report = await createReport(source, {mode: 'ai', person: 'A'});
    assert.equal(report.title.length, 180);
    assert.equal(report.sections.length, 5);
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
      setProviderFetch(async (_, options) => {
        payload = JSON.parse(options.body);
        const output = sections().map(s => ({...s, body: 'Repeated {{0}}. Reply {{1}}.', quotes: [
          {sender: 'A', text: 'same'}, {sender: 'B', text: 'other'},
        ]}));
        return providerResponse('openai', {title: 'Repeated messages', sections: output});
      });
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
    setProviderFetch(async () => Response.json({
      id: 'msg_truncated', type: 'message', role: 'assistant', model: 'test-model',
      content: [{type: 'text', text: '{"title":"A report","sections":['}],
      stop_reason: 'max_tokens', stop_sequence: null,
      usage: {input_tokens: 100, output_tokens: 10000},
    }));
    await assert.rejects(() => createReport(source, {mode:'ai',person:'A'}), /output limit/);
  });
});
