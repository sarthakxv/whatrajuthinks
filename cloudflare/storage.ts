import { createHash } from "node:crypto";
import { createSqlStore } from "../lib/store-core.mjs";
import type { Store } from "../lib/store.mjs";

// SQL cells have a size limit. Keep large exports and analysis plans in bounded chunks.
export function workspaceStore(storage: DurableObjectStorage): Store {
  const sql = storage.sql;
  sql.exec("CREATE TABLE IF NOT EXISTS payload_chunks(id TEXT NOT NULL, part INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(id,part))");
  sql.exec("CREATE TABLE IF NOT EXISTS payload_refs(parent TEXT NOT NULL,child TEXT NOT NULL,PRIMARY KEY(parent,child))");
  function pack(value: unknown): string {
    const children = new Set<string>();
    const text = JSON.stringify(value, (key, item) => {
      if (key === "plan" && item) {
        const packed = JSON.parse(pack(item));
        if (packed.$payload) children.add(packed.$payload);
        return packed;
      }
      return item;
    });
    if (text.length <= 100000) return text;
    const id = createHash("sha256").update(text).digest("hex");
    if (!sql.exec("SELECT id FROM payload_chunks WHERE id=? LIMIT 1", id).toArray().length) {
      let part = 0;
      for (let i = 0; i < text.length;) {
        let end = Math.min(i + 100000, text.length);
        // Never split a surrogate pair when SQLite encodes the chunk as UTF-8.
        if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
        sql.exec("INSERT INTO payload_chunks VALUES (?,?,?)", id, part++, text.slice(i, end));
        i = end;
      }
      for (const child of children) sql.exec("INSERT OR IGNORE INTO payload_refs VALUES (?,?)", id, child);
    }
    const conversationIds = (value as { conversationIds?: string[] }).conversationIds;
    return JSON.stringify({ $payload: id, ...(conversationIds ? { conversationIds } : {}) });
  }
  function unpack(text: string): unknown {
    return JSON.parse(text, (_key, value) => {
      if (value && typeof value === "object" && typeof value.$payload === "string") {
        const rows = sql.exec<{ data: string }>("SELECT data FROM payload_chunks WHERE id=? ORDER BY part", value.$payload).toArray();
        if (!rows.length) throw new Error("Stored payload is missing.");
        return unpack(rows.map(row => row.data).join(""));
      }
      return value;
    });
  }
  return createSqlStore({
    exec: (query: string) => { sql.exec(query); },
    prepare: (query: string) => ({
      get: (...args: (string | number | null)[]) => sql.exec(query, ...args).toArray()[0],
      all: (...args: (string | number | null)[]) => sql.exec(query, ...args).toArray(),
      run: (...args: (string | number | null)[]) => ({ changes: sql.exec(query, ...args).rowsWritten }),
    }),
    transaction: <T>(callback: () => T) => storage.transactionSync(callback),
    close: () => {},
  }, { encode: pack, decode: unpack }) as Store;
}

export function collectPayloads(storage: DurableObjectStorage) {
  const sql = storage.sql;
  const live = new Set<string>();
  function mark(id: string) {
    if (live.has(id)) return;
    live.add(id);
    for (const { child } of sql.exec<{ child: string }>("SELECT child FROM payload_refs WHERE parent=?", id).toArray()) mark(child);
  }
  function visit(text: string) {
    JSON.parse(text, (_key, value) => {
      if (value && typeof value.$payload === "string") mark(value.$payload);
      return value;
    });
  }
  storage.transactionSync(() => {
    for (const { data } of sql.exec<{ data: string }>("SELECT metadata AS data FROM conversations UNION ALL SELECT messages FROM conversations WHERE messages IS NOT NULL UNION ALL SELECT data FROM reports UNION ALL SELECT data FROM report_jobs UNION ALL SELECT data FROM analysis_cache")) visit(data);
    for (const { id } of sql.exec<{ id: string }>("SELECT DISTINCT id FROM payload_chunks").toArray())
      if (!live.has(id)) {
        sql.exec("DELETE FROM payload_chunks WHERE id=?", id);
        sql.exec("DELETE FROM payload_refs WHERE parent=?", id);
      }
  });
}
