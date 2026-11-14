import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setImmediate as tick } from 'node:timers/promises';
import { createApi } from '../lib/api.ts';
import { createStore } from '../lib/store.mjs';
import { createReport, planReport } from '../lib/reports.ts';
import { coverageNotice } from '../lib/report-coverage.ts';
import { isLargeChat } from '../lib/chat-size.ts';
import { consumedCost, guardedFetch, maximumCost, memoryRuntime, modelInfo, sourceFingerprint } from '../lib/ai-analysis.ts';

const envKeys = ['AI_PROVIDER', 'AI_MODEL', 'AI_BASE_URL', 'ANTHROPIC_API_KEY', 'AI_ANALYSIS_MODEL', 'AI_MAX_REPORT_COST_USD', 'AI_TARGET_INPUT_TOKENS'];
async function environment(run, overrides = {}) {
  const before = Object.fromEntries(envKeys.map(key => [key, process.env[key]])), originalFetch = globalThis.fetch;
  Object.assign(process.env, {AI_PROVIDER: 'anthropic', AI_MODEL: 'claude-sonnet-5-5', AI_ANALYSIS_MODEL: 'claude-haiku-5-5', AI_BASE_URL: `https://${randomUUID()}.invalid/v1`, ANTHROPIC_API_KEY: 'fake-test-key', AI_MAX_REPORT_COST_USD: '1', AI_TARGET_INPUT_TOKENS: '80000'}, overrides);
  try { await run(); }
  finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
}
function conversation(count = 60, size = 10000) {
  return {id: randomUUID(), title: 'Friends', participants: ['A', 'B'], context: 'closeFriend', messages: Array.from({length: count}, (_, i) => ({sender: i % 2 ? 'A' : 'B', text: `Original message ${i} ${'-'.repeat(size)} 🙂`, timestamp: `2026-10-${String(1 + i % 28).padStart(2, '0')}T10:00:00.000Z`}))};
}
function answer(body, output) {
  return Response.json({id: 'msg_test', type: 'message', role: 'assistant', model: body.model, content: [{type: 'text', text: JSON.stringify(output)}], stop_reason: 'end_turn', stop_sequence: null, usage: {input_tokens: Math.ceil(JSON.stringify(body).length / 4), output_tokens: 100}});
}
function provider(options = {}) {
  const paid = [], counts = [], metadata = [];
  globalThis.fetch = async (url, init) => {
    url = String(url);
    if (url.includes('/models/')) {
      metadata.push(url);
      if (options.metadataFailure) return Response.json({}, {status: 401});
      const id = url.split('/').at(-1);
      return Response.json({id, max_input_tokens: options.context ?? 1000000, max_tokens: 128000, capabilities: {structured_outputs: {supported: true}, thinking: {types: id.includes('haiku') ? {disabled: {supported: true}} : {between_tools: {supported: true}}}}});
    }
    const body = JSON.parse(init.body);
    if (url.endsWith('/count_tokens')) {
      counts.push(body);
      assert.doesNotMatch(JSON.stringify(body.output_config?.format.schema ?? {}), /"(?:minLength|maxLength|minItems|maxItems)":/, 'Preflight must sanitize unsupported schema constraints just like the generation adapter.');
      return Response.json({input_tokens: options.count ? options.count(body) : Math.ceil(JSON.stringify(body).length / 4)});
    }
    assert.ok(url.endsWith('/messages'), 'No unmocked provider endpoint is allowed.');
    paid.push(body);
    if (options.onPaid) {
      const response = await options.onPaid(body, paid.length);
      if (response) return response;
    }
    const input = JSON.parse(body.messages[0].content[0].text);
    if (body.model.includes('haiku')) {
      assert.equal(body.thinking.type, 'disabled');
      assert.ok([2000, 4000, 8000].includes(body.max_tokens));
      const refs = Array.isArray(input) ? [...new Set(input.flatMap(f => [...f.scenes, ...f.contradictions, ...f.aliases].flatMap(s => s.refs)))] : [...new Set(input.messages.map(m => m[0]))];
      const finding = {chronology: options.longFindings ? 'Context '.repeat(740) : 'These friends stayed in touch, with changes supported by the source references.', aliases: [], contradictions: [], scenes: [{claim: 'A grounded early scene', refs: refs.slice(0, 2)}, {claim: 'A grounded recent scene', refs: refs.slice(-2)}]};
      if (options.invalidRefs) finding.scenes[0].refs = ['invented:100'];
      return answer(body, finding);
    }
    const messages = input.conversations.flatMap(c => c.messages);
    const quotes = messages.slice(0, 2).map(({sender, text}) => ({sender, text}));
    return answer(body, {title: 'The argument in the actual messages', sections: Array.from({length: 5}, (_, i) => ({title: `Grounded section ${i}`, body: quotes.map((_, i) => `A real observation {{${i}}}.`).join(' '), quotes}))});
  };
  return {paid, counts, metadata};
}
function apiFixture(sources) {
  const store = createStore(':memory:'), session = store.newSession(), stranger = store.newSession();
  for (const c of sources) store.addConversation(session, {...c, messages: undefined, messageCount: c.messages.length, platform: 'WhatsApp', createdAt: new Date().toISOString()}, c.messages);
  let handle = createApi({store});
  const request = async (path, method = 'GET', payload, owner = session) => {
    const response = await handle(new Request(`http://localhost:4173${path}`, {method, headers: {cookie: `raju_session=${owner}`, ...(payload ? {'content-type': 'application/json'} : {})}, ...(payload ? {body: JSON.stringify(payload)} : {})}));
    return {status: response.status, data: await response.json()};
  };
  return {store, session, stranger, request, restart: () => { handle = createApi({store}); }};
}
async function settled(fixture, id, expected = ['completed', 'failed', 'awaiting_confirmation', 'interrupted']) {
  for (let i = 0; i < 2000; i++) {
    const result = await fixture.request(`/api/report-jobs/${id}`);
    assert.equal(result.status, 200);
    if (expected.includes(result.data.job.status)) return result.data.job;
    await tick();
  }
  assert.fail('The mocked report job did not settle.');
}
const requestBody = c => ({conversationId: c.id, person: 'A', mode: 'ai', requestId: randomUUID()});

test('large-chat classification uses the previous exact source boundary, including metadata', () => {
  const c = conversation(5, 0), initial = JSON.stringify([{title: c.title, context: c.context, participants: c.participants, messages: c.messages}]).length;
  c.messages[0].text += '-'.repeat(400000 - initial);
  assert.equal(isLargeChat(c), false);
  c.title += 'x';
  assert.equal(isLargeChat(c), true);
});

test('configuration and source edits invalidate large-chat consent before spending', async () => {
  await environment(async () => {
    const mock = provider(), c = conversation(), f = apiFixture([c]);
    try {
      const created = await f.request('/api/report-jobs', 'POST', requestBody(c));
      const job = await settled(f, created.data.job.id);
      process.env.AI_MAX_REPORT_COST_USD = '2';
      assert.equal((await f.request(`/api/report-jobs/${job.id}/confirm`, 'POST')).status, 409);
      process.env.AI_MAX_REPORT_COST_USD = '1';
      assert.equal((await f.request(`/api/conversations/${c.id}`, 'PATCH', {title: 'Changed title'})).status, 200);
      assert.equal((await f.request(`/api/report-jobs/${job.id}/confirm`, 'POST')).status, 409);
      assert.equal(mock.paid.length, 0);
    } finally { f.store.close(); }
  });
});

test('combined multi-chat sources crossing the old cap require confirmation', async () => {
  await environment(async () => {
    const mock = provider(), sources = [conversation(30), conversation(30)], f = apiFixture(sources);
    try {
      assert.ok(sources.every(c => !isLargeChat(c)));
      const created = await f.request('/api/ultimate', 'POST', {conversationIds: sources.map(c => c.id), person: 'A', mode: 'ai'});
      assert.equal((await settled(f, created.data.job.id)).status, 'awaiting_confirmation');
      assert.equal(mock.paid.length, 0);
    } finally { f.store.close(); }
  });
});

test('concurrent requests reserve the same ledger atomically before spending', async () => {
  await environment(async () => {
    let unblock;
    const blocked = new Promise(resolve => { unblock = resolve; });
    const mock = provider({onPaid: async body => { await blocked; return answer(body, {}); }});
    const runtime = memoryRuntime();
    const plan = {budgetUsd: 0.15, targetTokens: 80000, writerModel: 'claude-sonnet-5-5', analysisModel: 'claude-haiku-5-5', writerOutput: 12000};
    const guard = guardedFetch(runtime, plan, 'write');
    const body = JSON.stringify({model: 'claude-sonnet-5-5', messages: [{role: 'user', content: 'A small input'}], max_tokens: 12000});
    const first = guard('https://provider.invalid/v1/messages', {method: 'POST', body});
    for (let i = 0; i < 100 && !mock.paid.length; i++) await tick();
    assert.equal(runtime.calls()[0].status, 'reserved');
    await assert.rejects(() => guard('https://provider.invalid/v1/messages', {method: 'POST', body}), /processing limit/);
    assert.equal(mock.paid.length, 1);
    unblock(); await first;
    assert.ok(consumedCost(runtime.calls()) <= plan.budgetUsd);
  });
});

test('model metadata failure prevents generation and leaks no provider payload', async () => {
  await environment(async () => {
    const mock = provider({metadataFailure: true});
    await assert.rejects(() => createReport([conversation(6, 1)], {person: 'A', mode: 'ai'}), /preflight returned 401/);
    assert.equal(mock.paid.length, 0);
  });
});

test('unreviewed model pricing fails clearly before sending source data or generation', async () => {
  await environment(async () => {
    const mock = provider();
    await assert.rejects(() => createReport([conversation(6, 1)], {person: 'A', mode: 'ai'}), /Choose Sonnet 5.5/);
    assert.equal(mock.counts.length, 0);
    assert.equal(mock.paid.length, 0);
  }, {AI_MODEL: 'unreviewed-model'});
});

test('import and existing-source metadata flag large chats, and edits recompute the boundary', async () => {
  await environment(async () => {
    const c = conversation(5, 0), initial = JSON.stringify([{title: c.title, context: c.context, participants: c.participants, messages: c.messages}]).length;
    c.messages[0].text += '-'.repeat(400000 - initial);
    const f = apiFixture([c]);
    try {
      assert.equal((await f.request(`/api/conversations/${c.id}`)).data.conversation.isLargeChat, false);
      assert.equal((await f.request(`/api/conversations/${c.id}`, 'PATCH', {title: c.title + 'x'})).data.conversation.isLargeChat, true);
      const text = Array.from({length: 6}, (_, i) => `[13/11/2026, 10:0${i}:00] ${i % 2 ? 'A' : 'B'}: ${'-'.repeat(80000)}`).join('\n');
      const imported = await f.request('/api/import', 'POST', {filename: 'chat.txt', text});
      assert.equal(imported.status, 201);
      assert.equal(imported.data.conversation.isLargeChat, true);
      const local = await f.request('/api/reports', 'POST', {conversationId: imported.data.conversation.id, person: 'A', mode: 'local'});
      assert.equal(local.status, 201, 'A large local report never requires AI consent.');
    } finally { f.store.close(); }
  });
});

test('large histories use one Sonnet call with a complete recent suffix and full statistics', async () => {
  await environment(async () => {
    const mock=provider(),c=conversation();
    c.messages.forEach((m,i)=>m.timestamp=new Date(Date.UTC(2020,0,i+1)).toISOString());
    const original=structuredClone(c);
    const report=await createReport([c],{person:'A',mode:'ai'});
    assert.equal(mock.paid.length,1);
    assert.equal(mock.paid[0].model,'claude-sonnet-5-5');
    assert.ok(mock.metadata.every(url=>url.includes('sonnet')));
    const input=JSON.parse(mock.paid[0].messages[0].content[0].text),included=input.conversations[0].messages;
    assert.ok(included.length>0 && included.length<c.messages.length);
    assert.deepEqual(included,c.messages.slice(-included.length));
    assert.equal(input.stats.messageCount,c.messages.length);
    assert.equal(report.stats.messageCount,c.messages.length);
    assert.equal(report.messageCount,c.messages.length);
    assert.equal(report.aiAnalysis.processedMessages,included.length);
    assert.equal(report.aiCoverage[0].firstDate,included[0].timestamp);
    assert.equal(report.aiCoverage[0].lastDate,c.messages.at(-1).timestamp);
    assert.match(coverageNotice(report),/Covers .* to .*Statistics cover the full uploaded chat/);
    assert.deepEqual(c,original);
  });
});

test('recent-message jobs preview coverage before consent and never extract chunks',async()=>{
 await environment(async()=>{
  const mock=provider(),c=conversation(),f=apiFixture([c]);
  try{
   const body=requestBody(c),created=await f.request('/api/report-jobs','POST',body);
   const waiting=await settled(f,created.data.job.id);
   assert.equal(waiting.status,'awaiting_confirmation');
   assert.equal(mock.paid.length,0);
   assert.equal(waiting.totalChunks,0);
   assert.ok(waiting.coverage[0].includedMessages<c.messages.length);
   await f.request(`/api/report-jobs/${waiting.id}/confirm`,'POST');
   const complete=await settled(f,waiting.id,['failed','completed']);
   assert.equal(complete.status,'completed',complete.error);
   assert.equal(mock.paid.length,1);
   assert.ok(complete.consumedCostUsd<=1);
   const report=f.store.report(f.session,complete.reportId);
   f.store.purge('2100-01-01T00:00:00Z');
   assert.deepEqual(f.store.report(f.session,complete.reportId).aiCoverage,report.aiCoverage);
  }finally{f.store.close();}
 });
});

test('remaining budget shrinks the window and cannot be reset by retries',async()=>{
 await environment(async()=>{
  const mock=provider(),c=conversation(),runtime=memoryRuntime();
  runtime.record({id:'prior',model:'claude-sonnet-5-5',stage:'write',status:'uncertain',estimatedCostUsd:0.75,pricingVersion:'test'});
  const plan=await planReport([c],{mode:'ai',person:'A'},runtime);
  assert.ok(plan.estimatedCostUsd+consumedCost(runtime.calls())<=1);
  const report=await createReport([c],{mode:'ai',person:'A'},{plan,runtime});
  assert.equal(mock.paid.length,1);
  assert.ok(consumedCost(report.aiAnalysis.calls)<=1);
 });
});

test('insufficient allowance stops before generation',async()=>{
 await environment(async()=>{
  const mock=provider();
  await assert.rejects(()=>createReport([conversation()],{mode:'ai',person:'A'}),/remaining reading allowance/);
  assert.equal(mock.paid.length,0);
 },{AI_MAX_REPORT_COST_USD:'0.01'});
});

test('unknown and partial dates are disclosed without inventing a period',async()=>{
 await environment(async()=>{
  provider();const c=conversation(6,10);c.messages.forEach(m=>m.timestamp=null);
  const report=await createReport([c],{mode:'ai',person:'A'});
  assert.match(coverageNotice(report),/period is unknown/);
  assert.equal(report.aiCoverage[0].firstDate,null);
  c.messages[2].timestamp='2026-01-02T00:00:00Z';
  const dated=await createReport([c],{mode:'ai',person:'A'});
  assert.match(coverageNotice(dated),/2 Jan 2026/);
  assert.match(coverageNotice(dated),/Some included messages/);
 });
});

test('oversized newest messages are never split or skipped to older messages',async()=>{
 await environment(async()=>{
  const mock=provider(),c=conversation(6,10);c.messages.at(-1).text='-'.repeat(1000000);
  await assert.rejects(()=>createReport([c],{mode:'ai',person:'A'}),/newest complete message/);
  assert.equal(mock.paid.length,0);
 });
});

test('legacy full-history jobs re-prepare recent messages with fresh consent and the same ledger',async()=>{
 await environment(async()=>{
  const mock=provider(),c=conversation(),f=apiFixture([c]);
  try{
   const created=await f.request('/api/report-jobs','POST',requestBody(c));
   const waiting=await settled(f,created.data.job.id);
   f.store.updateJob(f.session,waiting.id,j=>({...j,status:'failed',fingerprint:'old-full-history-version',plan:{...j.plan,method:'chunked'},completedChunks:3,totalChunks:52,confirmedAt:'previous-consent',calls:[{id:'old-extract',model:'claude-haiku-5-5',stage:'extract',status:'completed',costUsd:0.1,estimatedCostUsd:0.1,pricingVersion:'test'}]}));
   assert.equal((await f.request(`/api/report-jobs/${waiting.id}/resume`,'POST')).status,200);
   const preview=await settled(f,waiting.id);
   assert.equal(preview.status,'awaiting_confirmation');
   assert.equal(preview.totalChunks,0);
   assert.equal(preview.consumedCostUsd,0.1);
   assert.equal(preview.budgetUsd,1);
   assert.equal(mock.paid.length,0);
   assert.equal(f.store.job(f.session,waiting.id).plan.method,'recent');
   await f.request(`/api/report-jobs/${waiting.id}/confirm`,'POST');
   const done=await settled(f,waiting.id,['completed','failed']);
   assert.equal(done.status,'completed',done.error);
   assert.equal(mock.paid.length,1);
   assert.equal(mock.paid[0].model,'claude-sonnet-5-5');
  }finally{f.store.close();}
 });
});
