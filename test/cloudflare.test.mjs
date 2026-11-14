import test from 'node:test';
import assert from 'node:assert/strict';

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
