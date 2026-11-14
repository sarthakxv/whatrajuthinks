import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { setTimeout as pause } from 'node:timers/promises';

const base = process.env.WORKER_TEST_URL;
const transcript = (count = 6, size = 30) => Array.from({length: count}, (_, i) => `[13/11/2026, 10:${String(i % 60).padStart(2, '0')}:00] ${i % 2 ? 'Sam' : 'Alex'}: Message ${i} ${'🙂'.repeat(size)}`).join('\n');
async function request(path, {cookie, method = 'GET', body, origin} = {}) {
  const response = await fetch(`${base}${path}`, {method, headers: {...(cookie ? {cookie} : {}), ...(origin ? {origin} : {}), ...(body ? {'content-type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})});
  const data = await response.json();
  return {response, data, cookie: response.headers.get('set-cookie')?.split(';')[0]};
}
const options = (cookie, body) => ({cookie, body, method: 'POST'});

test('Cloudflare runtime persists large Unicode exports, isolates workspaces and preserves reports', {skip: !base}, async () => {
  const a = await request('/api/session'), b = await request('/api/session');
  assert.equal(a.data.mode, 'hosted');
  assert.notEqual(a.cookie, b.cookie);
  assert.match(a.response.headers.get('set-cookie'), /HttpOnly/);
  const denied = await request('/api/session', {origin: 'https://stranger.invalid'});
  assert.equal(denied.response.status, 403);
  const text = transcript(100, 6000); // Over 2 MB in UTF-8; exercises SQL chunk storage.
  const imported = await request('/api/import', options(a.cookie, {filename: 'synthetic.txt', text}));
  assert.equal(imported.response.status, 201, JSON.stringify(imported.data));
  const id = imported.data.conversation.id;
  assert.equal((await request(`/api/conversations/${id}`, {cookie: b.cookie})).response.status, 404);
  const chat = await request(`/api/conversations/${id}`, {cookie: a.cookie});
  assert.equal(chat.data.conversation.stats.messageCount, 100);
  const report = await request('/api/reports', options(a.cookie, {conversationId: id, person: 'Alex', mode: 'local'}));
  assert.equal(report.response.status, 201, JSON.stringify(report.data));
  assert.equal(report.data.report.messageCount, 100);
  assert.equal((await request(`/api/reports/${report.data.report.id}`, {cookie: b.cookie})).response.status, 404);
  assert.equal((await request(`/api/conversations/${id}`, {cookie: a.cookie, method: 'DELETE'})).response.status, 200);
  const preserved = await request(`/api/reports/${report.data.report.id}`, {cookie: a.cookie});
  assert.equal(preserved.data.report.sourceAvailable, false);
  assert.equal((await request('/api/account', {cookie: a.cookie, method: 'DELETE'})).response.status, 200);
  assert.equal((await request('/api/reports', {cookie: a.cookie})).data.reports.length, 0);
});

test('Cloudflare alarm executes and persists an AI job after the request returns, without real provider calls', {skip: !base || !process.env.WORKER_TEST_MOCK_AI}, async t => {
  let paid = 0;
  const server = createServer(async (req, res) => {
    let raw = '';
    for await (const part of req) raw += part;
    const body = raw ? JSON.parse(raw) : {};
    let result;
    if (req.url.includes('/models/')) result = {id: req.url.split('/').at(-1), max_input_tokens: 1000000, max_tokens: 128000, capabilities: {structured_outputs: {supported: true}, thinking: {types: {disabled: {supported: true}, between_tools: {supported: true}}}}};
    else if (req.url.endsWith('/count_tokens')) result = {input_tokens: Math.ceil(raw.length / 4)};
    else {
      paid++;
      const input = JSON.parse(body.messages[0].content[0].text);
      const quotes = input.conversations.flatMap(c => c.messages).slice(0, 2).map(({sender, text}) => ({sender, text}));
      const output = {title: 'A reading from synthetic messages', sections: Array.from({length: 5}, (_, i) => ({title: `Scene ${i}`, body: 'These friends keep talking {{0}}. A reply follows {{1}}.', quotes}))};
      result = {id: 'msg_test', type: 'message', role: 'assistant', model: body.model, content: [{type: 'text', text: JSON.stringify(output)}], stop_reason: 'end_turn', usage: {input_tokens: 100, output_tokens: 100}};
    }
    res.writeHead(200, {'content-type': 'application/json'});
    res.end(JSON.stringify(result));
  });
  await new Promise(resolve => server.listen(8790, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const {cookie} = await request('/api/session');
  const imported = await request('/api/import', options(cookie, {filename: 'synthetic.txt', text: transcript()}));
  const payload = {conversationId: imported.data.conversation.id, person: 'Alex', mode: 'ai', requestId: crypto.randomUUID()};
  const started = await request('/api/reports', options(cookie, payload));
  assert.equal(started.response.status, 202, JSON.stringify(started.data));
  const id = started.data.job.id;
  let job;
  for (let i = 0; i < 100; i++) {
    job = (await request(`/api/report-jobs/${id}`, {cookie})).data.job;
    if (['completed', 'failed', 'interrupted'].includes(job.status)) break;
    await pause(100);
  }
  assert.equal(job.status, 'completed', JSON.stringify(job));
  assert.equal((await request(`/api/reports/${job.reportId}`, {cookie})).data.report.mode, 'ai');
  assert.equal((await request('/api/reports', options(cookie, payload))).data.job.id, id);
  assert.equal(paid, 1, 'A duplicate request must not spend again');
  await request('/api/account', {cookie, method: 'DELETE'});
});
