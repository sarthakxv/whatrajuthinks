import { randomUUID } from "node:crypto";

export function createSqlStore(db, { encode = JSON.stringify, decode = JSON.parse } = {}) {
  db.exec(`CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES sessions(id),metadata TEXT NOT NULL,messages TEXT,expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES sessions(id),data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS report_chats(report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,PRIMARY KEY(report_id,conversation_id));
    CREATE TABLE IF NOT EXISTS report_jobs(id TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,request_id TEXT NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL,UNIQUE(session_id,request_id));
    CREATE TABLE IF NOT EXISTS analysis_cache(key TEXT NOT NULL,session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,source_ids TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(session_id,key));`);
  function cleanupSourceData() {
    db.prepare("DELETE FROM analysis_cache WHERE EXISTS (SELECT 1 FROM json_each(source_ids) s LEFT JOIN conversations c ON c.id=s.value AND c.session_id=analysis_cache.session_id WHERE c.id IS NULL OR c.messages IS NULL)").run();
    db.prepare("DELETE FROM report_jobs WHERE EXISTS (SELECT 1 FROM json_each(json_extract(data,'$.conversationIds')) s LEFT JOIN conversations c ON c.id=s.value AND c.session_id=report_jobs.session_id WHERE c.id IS NULL OR c.messages IS NULL)").run();
  }
  function persistReport(session, report, conversationIds) {
    for (const id of conversationIds)
      if (!db.prepare("SELECT id FROM conversations WHERE id=? AND session_id=? AND messages IS NOT NULL").get(id, session)) throw new Error("Conversation not found or expired.");
    db.prepare("INSERT INTO reports VALUES (?,?,?)").run(report.id, session, encode(report));
    for (const id of conversationIds) {
      db.prepare("INSERT INTO report_chats VALUES (?,?)").run(report.id, id);
      db.prepare("UPDATE conversations SET expires_at=? WHERE id=? AND session_id=?").run(new Date(Date.now() + 7 * 86400000).toISOString(), id, session);
    }
  }
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
      cleanupSourceData();
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
      cleanupSourceData();
      return true;
    },
    updateConversation(session, id, metadata, messages) {
      db.prepare("DELETE FROM analysis_cache WHERE session_id=? AND EXISTS (SELECT 1 FROM json_each(source_ids) WHERE value=?)").run(session, id);
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
        persistReport(session, report, conversationIds);
      });
    },
    addJob(session, job) {
      db.prepare("INSERT INTO report_jobs VALUES (?,?,?,?,?)").run(job.id, session, job.requestId, job.status, encode(job));
    },
    job(session, id) {
      const row = db.prepare("SELECT data FROM report_jobs WHERE id=? AND session_id=?").get(id, session);
      return row ? decode(row.data) : null;
    },
    jobs(session) {
      return db.prepare("SELECT data FROM report_jobs WHERE session_id=? ORDER BY rowid DESC").all(session).map(row => decode(row.data));
    },
    deleteJob(session, id) {
      return db.prepare("DELETE FROM report_jobs WHERE id=? AND session_id=? AND status NOT IN ('planning','queued','running')").run(id, session).changes > 0;
    },
    updateJob(session, id, update) {
      return db.transaction(() => {
        const row = db.prepare("SELECT data FROM report_jobs WHERE id=? AND session_id=?").get(id, session);
        if (!row) throw new Error("Report job no longer available.");
        const job = update(decode(row.data));
        db.prepare("UPDATE report_jobs SET status=?,data=? WHERE id=? AND session_id=?").run(job.status, encode(job), id, session);
        return job;
      });
    },
    completeJob(session, id, report) {
      return db.transaction(() => {
        const row = db.prepare("SELECT data FROM report_jobs WHERE id=? AND session_id=?").get(id, session);
        if (!row) throw new Error("Report job no longer available.");
        const job = decode(row.data);
        if (job.status !== "running") throw new Error("The report job is not running.");
        persistReport(session, report, job.conversationIds);
        Object.assign(job, { status: "completed", stage: "Your report is ready", reportId: report.id, leaseUntil: 0 });
        delete job.plan;
        delete job.options;
        db.prepare("UPDATE report_jobs SET status=?,data=? WHERE id=? AND session_id=?").run(job.status, encode(job), id, session);
      });
    },
    cachedAnalysis(session, key) {
      const row = db.prepare("SELECT data FROM analysis_cache WHERE session_id=? AND key=?").get(session, key);
      return row ? decode(row.data) : null;
    },
    cacheAnalysis(session, key, sourceIds, data) {
      db.prepare("INSERT OR REPLACE INTO analysis_cache VALUES (?,?,?,?)").run(key, session, encode(sourceIds), encode(data));
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
