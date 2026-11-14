import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { workspaceStore, collectPayloads } from '../cloudflare/storage.ts';

function storageFixture() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  return {
    close: () => db.close(),
    sql: {
      exec(query, ...args) {
        let rows = [], rowsWritten = 0;
        if (query.includes(';')) db.exec(query);
        else {
          const statement = db.prepare(query);
          if (statement.columns().length) rows = statement.all(...args);
          else rowsWritten = Number(statement.run(...args).changes);
        }
        return {toArray: () => rows, one: () => {assert.equal(rows.length, 1); return rows[0];}, rowsWritten, [Symbol.iterator]: () => rows[Symbol.iterator]()};
      },
    },
    transactionSync(callback) {
      db.exec('BEGIN IMMEDIATE');
      try {const result = callback(); db.exec('COMMIT'); return result;}
      catch (error) {db.exec('ROLLBACK'); throw error;}
    },
  };
}

test('hosted storage reconstructs Unicode payloads and erases expired source chunks', t => {
  const storage = storageFixture(); t.after(() => storage.close());
  const store = workspaceStore(storage), session = store.newSession();
  const metadata = {id: 'synthetic-chat', title: 'Synthetic', participants: ['A', 'B']};
  const messages = [{sender: 'A', text: '🙂'.repeat(160000), timestamp: null}, {sender: 'B', text: 'Reply', timestamp: null}];
  store.addConversation(session, metadata, messages);
  assert.deepEqual(store.conversation(session, metadata.id).messages, messages);
  const report = {id: 'report', sections: [{title: 'Saved report', body: 'A completed summary.'}]};
  store.addReport(session, report, [metadata.id]);
  assert.ok(storage.sql.exec('SELECT id FROM payload_chunks').toArray().length);
  store.purge('2100-01-01T00:00:00.000Z');
  collectPayloads(storage);
  assert.equal(store.conversation(session, metadata.id).messages, null);
  assert.deepEqual(store.report(session, report.id), report);
  assert.equal(storage.sql.exec('SELECT id FROM payload_chunks').toArray().length, 0, 'Expired source must not survive in chunk storage');
});

test('hosted storage rolls back a report if any source is missing and clears payloads on account deletion', t => {
  const storage = storageFixture(); t.after(() => storage.close());
  const store = workspaceStore(storage), session = store.newSession();
  store.addConversation(session, {id: 'chat'}, [{sender: 'A', text: 'x'.repeat(300000)}]);
  assert.throws(() => store.addReport(session, {id: 'invalid'}, ['chat', 'missing']), /not found/);
  assert.equal(store.report(session, 'invalid'), null);
  store.deleteAccount(session);
  collectPayloads(storage);
  assert.equal(storage.sql.exec('SELECT id FROM payload_chunks').toArray().length, 0);
});
