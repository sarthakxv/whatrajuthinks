import { randomUUID } from "node:crypto";

export function createSqlStore(db, { encode = JSON.stringify, decode = JSON.parse } = {}) {
  db.exec(`CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES sessions(id),metadata TEXT NOT NULL,messages TEXT,expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES sessions(id),data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS report_chats(report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,PRIMARY KEY(report_id,conversation_id));`);
  return {
    session(id) {
      return id && db.prepare("SELECT id FROM sessions WHERE id=?").get(id)?.id;
    },
    newSession(id = randomUUID()) {
      db.prepare("INSERT INTO sessions VALUES (?,?)").run(
        id,
        new Date().toISOString(),
      );
      return id;
    },
    purge(now = new Date().toISOString()) {
      db.prepare(
        "UPDATE conversations SET messages=NULL WHERE expires_at<=? AND messages IS NOT NULL",
      ).run(now);
    },
    addConversation(session, metadata, messages) {
      const expiresAt = new Date(Date.now() + 48 * 3600000).toISOString();
      db.prepare("INSERT INTO conversations VALUES (?,?,?,?,?)").run(
        metadata.id,
        session,
        encode(metadata),
        encode(messages),
        expiresAt,
      );
      return { ...metadata, expiresAt };
    },
    conversations(session) {
      return db
        .prepare(
          "SELECT metadata,expires_at,messages IS NOT NULL AS available FROM conversations WHERE session_id=? ORDER BY rowid DESC",
        )
        .all(session)
        .map((row) => ({
          ...decode(row.metadata),
          expiresAt: row.expires_at,
          available: Boolean(row.available),
        }));
    },
    conversation(session, id) {
      const row = db
        .prepare(
          "SELECT metadata,messages,expires_at FROM conversations WHERE id=? AND session_id=?",
        )
        .get(id, session);
      return row
        ? {
            ...decode(row.metadata),
            messages: row.messages ? decode(row.messages) : null,
            expiresAt: row.expires_at,
          }
        : null;
    },
    deleteConversation(session, id) {
      const row = db
        .prepare("SELECT id FROM conversations WHERE id=? AND session_id=?")
        .get(id, session);
      if (!row) return false;
      db.prepare("DELETE FROM conversations WHERE id=? AND session_id=?").run(
        id,
        session,
      );
      return true;
    },
    updateConversation(session, id, metadata, messages) {
      return (
        db
          .prepare(
            "UPDATE conversations SET metadata=?,messages=? WHERE id=? AND session_id=?",
          )
          .run(
            encode(metadata),
            messages ? encode(messages) : null,
            id,
            session,
          ).changes > 0
      );
    },
    deleteAccount(session) {
      return db.transaction(() => {
        db.prepare("DELETE FROM reports WHERE session_id=?").run(session);
        db.prepare("DELETE FROM conversations WHERE session_id=?").run(session);
        db.prepare("DELETE FROM sessions WHERE id=?").run(session);
      });
    },
    addReport(session, report, conversationIds) {
      return db.transaction(() => {
        for (const id of conversationIds)
          if (
            !db
              .prepare(
                "SELECT id FROM conversations WHERE id=? AND session_id=?",
              )
              .get(id, session)
          )
            throw new Error("Conversation not found.");
        db.prepare("INSERT INTO reports VALUES (?,?,?)").run(
          report.id,
          session,
          encode(report),
        );
        const expires = new Date(Date.now() + 7 * 24 * 3600000).toISOString();
        for (const id of conversationIds) {
          db.prepare("INSERT INTO report_chats VALUES (?,?)").run(
            report.id,
            id,
          );
          db.prepare(
            "UPDATE conversations SET expires_at=? WHERE id=? AND session_id=?",
          ).run(expires, id, session);
        }
      });
    },
    reports(session) {
      return db
        .prepare(
          "SELECT data FROM reports WHERE session_id=? ORDER BY rowid DESC",
        )
        .all(session)
        .map((row) => decode(row.data));
    },
    report(session, id) {
      const row = db
        .prepare("SELECT data FROM reports WHERE id=? AND session_id=?")
        .get(id, session);
      return row ? decode(row.data) : null;
    },
    deleteReport(session, id) {
      return (
        db
          .prepare("DELETE FROM reports WHERE id=? AND session_id=?")
          .run(id, session).changes > 0
      );
    },
    close() {
      db.close();
    },
  };
}
