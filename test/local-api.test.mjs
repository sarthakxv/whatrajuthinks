import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../lib/store.mjs';

test('hot reload upgrades a cached store before removing an existing failed process', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'raju-reload-'));
  const previousPath = process.env.DATA_PATH;
  const previousStore = globalThis.rajuStore;
  const previousLocks = globalThis.rajuReportLocks;
  process.env.DATA_PATH = join(directory, 'app.sqlite');
  const store = createStore(process.env.DATA_PATH);
  const session = store.newSession(), conversationId = randomUUID(), id = randomUUID();
  store.addConversation(session, {id: conversationId, title: 'Saved chat'}, [{sender: 'A', text: 'Saved message'}]);
  store.addJob(session, {id, requestId: randomUUID(), conversationIds: [conversationId], status: 'failed', stage: 'Reading stopped', calls: []});
  // The dev server cached this object before the removal method existed.
  delete store.deleteJob;
  globalThis.rajuStore = store;
  globalThis.rajuReportLocks = new Set();
  try {
    const {handleApi} = await import(`../lib/local-api.ts?reload=${randomUUID()}`);
    const request = (method) => new Request(`http://localhost:4173/api/report-jobs/${id}`, {method, headers: {cookie: `raju_session=${session}`}});
    const response = await handleApi(request('DELETE'));
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    assert.equal((await handleApi(request('GET'))).status, 404);
    assert.equal(globalThis.rajuStore, store, 'Existing workers keep the same store object.');
    assert.ok(store.conversation(session, conversationId).messages);
  } finally {
    globalThis.rajuStore.close();
    globalThis.rajuStore = previousStore;
    globalThis.rajuReportLocks = previousLocks;
    if (previousPath === undefined) delete process.env.DATA_PATH;
    else process.env.DATA_PATH = previousPath;
    rmSync(directory, {recursive: true, force: true});
  }
});
