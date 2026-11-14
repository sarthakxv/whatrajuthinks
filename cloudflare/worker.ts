import { DurableObject } from "cloudflare:workers";
// @ts-ignore OpenNext generates this module during build:cloudflare.
import next from "../.open-next/worker.js";
import { createApi } from "../lib/api";
import { reportJobs } from "../lib/report-jobs";
import { workspaceStore, collectPayloads } from "./storage";

interface Env {
  APP_ORIGIN: string;
  WORKSPACES: DurableObjectNamespace<Workspace>;
}

const sessionPattern = /(?:^|;\s*)raju_session=([a-f0-9-]{36})(?:;|$)/;

export class Workspace extends DurableObject<Env> {
  private store;
  private jobs;
  private handle;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.store = workspaceStore(ctx.storage);
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS pending_jobs(session TEXT NOT NULL,id TEXT PRIMARY KEY)");
    this.jobs = reportJobs(this.store, (session, id) => {
      ctx.storage.sql.exec("INSERT OR IGNORE INTO pending_jobs VALUES (?,?)", session, id);
    });
    this.handle = createApi({ store: this.store, origin: env.APP_ORIGIN, jobs: this.jobs });
  }

  async fetch(request: Request) {
    const session = request.headers.get("cookie")?.match(sessionPattern)?.[1];
    if (!session) return new Response("Workspace session required", { status: 400 });
    if (!this.store.session(session)) this.store.newSession(session);
    const response = await this.handle(request);
    collectPayloads(this.ctx.storage);
    await this.schedule();
    return response;
  }

  private async schedule() {
    const pending = this.ctx.storage.sql.exec("SELECT id FROM pending_jobs LIMIT 1").toArray().length;
    const expires = this.ctx.storage.sql.exec<{ expires: string | null }>("SELECT MIN(expires_at) AS expires FROM conversations WHERE messages IS NOT NULL").one().expires;
    if (pending || expires) await this.ctx.storage.setAlarm(pending ? Date.now() + 100 : Math.max(Date.now() + 100, Date.parse(expires!)));
    else await this.ctx.storage.deleteAlarm();
  }

  async alarm() {
    this.store.purge();
    const pending = this.ctx.storage.sql.exec<{ session: string; id: string }>("SELECT session,id FROM pending_jobs LIMIT 1").toArray()[0];
    if (pending) {
      // Claiming and provider accounting are persisted before a call. Alarm retries never resume a claimed paid call.
      if (this.store.job(pending.session, pending.id)) await this.jobs.run(pending.session, pending.id);
      this.ctx.storage.sql.exec("DELETE FROM pending_jobs WHERE id=?", pending.id);
    }
    collectPayloads(this.ctx.storage);
    await this.schedule();
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return next.fetch(request, env, ctx);
    if (url.origin !== env.APP_ORIGIN || (request.headers.get("origin") && request.headers.get("origin") !== env.APP_ORIGIN))
      return Response.json({ error: "This request origin is not allowed." }, { status: 403 });
    const existing = request.headers.get("cookie")?.match(sessionPattern)?.[1];
    const session = existing ?? crypto.randomUUID();
    const headers = new Headers(request.headers);
    if (!existing) headers.set("cookie", `raju_session=${session}`);
    const stub = env.WORKSPACES.get(env.WORKSPACES.idFromName(session));
    const result = await stub.fetch(new Request(request, { headers }));
    const response = new Response(result.body, result);
    if (!existing && !response.headers.has("set-cookie"))
      response.headers.set("set-cookie", `raju_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${url.protocol === "https:" ? "; Secure" : ""}`);
    return response;
  },
};
