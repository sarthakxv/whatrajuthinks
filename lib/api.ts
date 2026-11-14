import { randomUUID } from "node:crypto";
import { parseChat, computeStats, decodeImport } from "./parser.mjs";
import type { Store } from "./store.mjs";
import { aiConfiguration, aiConfigured, createReport } from "./reports.ts";
import { isLargeChat, isLargeHistory } from "./chat-size.ts";
import { AnalysisError } from "./ai-analysis.ts";
import { reportJobs } from "./report-jobs.ts";
import type {
  Conversation,
  Report,
  ReportOptions,
  ReportSummary,
  StoredConversation,
} from "./types";

const BODY_LIMIT = 15 * 1024 * 1024;

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function fail(status: number, message: string): never {
  throw new ApiError(status, message);
}

function requiredString(value: unknown, label: string, max = 100): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    fail(400, `${label} must contain 1–${max} characters.`);
  }
  return value.trim();
}

function optionalString(value: unknown, label: string, max = 100): string {
  return value == null || value === "" ? "" : requiredString(value, label, max);
}

function cleanConversation(conversation: StoredConversation): Conversation {
  const { messages, ...metadata } = conversation;
  return {
    ...metadata,
    available: Array.isArray(messages),
    ...(messages ? { stats: computeStats(messages) } : {}),
    ...(messages ? { isLargeChat: isLargeChat({ ...metadata, messages }) } : {}),
  };
}

function summary(report: Report): ReportSummary {
  const { sections, ...metadata } = report;
  return metadata;
}

async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    fail(415, "Use application/json.");
  if (Number(request.headers.get("content-length")) > BODY_LIMIT)
    fail(413, "The request is too large.");
  const reader = request.body?.getReader();
  let length = 0;
  const chunks: Uint8Array[] = [];
  if (reader) {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > BODY_LIMIT) {
          await reader.cancel();
          fail(413, "The request is too large.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail(400, "Expected a JSON object.");
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    fail(400, "Invalid JSON.");
  }
}

function reportOptions(
  input: Record<string, unknown>,
  participants: string[],
): ReportOptions {
  const person = requiredString(input.person, "Your name", 200);
  if (!participants.includes(person))
    fail(400, "Choose a participant from this conversation.");
  const character = input.character ?? "Raju";
  if (
    typeof character !== "string" ||
    !["Raju", "Meera", "Kabir"].includes(character)
  )
    fail(400, "Choose Raju, Meera or Kabir.");
  if (input.mode != null && input.mode !== "local" && input.mode !== "ai")
    fail(400, "Invalid report mode.");
  if (input.mode === "ai" && !aiConfigured())
    fail(
      409,
      "An AI provider is not configured. Choose local analysis or configure the server.",
    );
  return {
    person,
    language: optionalString(input.language, "Language", 60) || "English",
    tone: optionalString(input.tone, "Tone", 60) || "Balanced",
    contextNotes: optionalString(input.contextNotes, "Context", 5000),
    question: optionalString(input.question, "Question", 2000),
    character,
    mode: input.mode === "ai" ? "ai" : "local",
  };
}

export function createApi({
  store,
  busy = new Set<string>(),
  origin,
  jobs = reportJobs(store),
}: {
  store: Store;
  busy?: Set<string>;
  origin?: string;
  jobs?: ReturnType<typeof reportJobs>;
}): (request: Request) => Promise<Response> {
  return async function handle(request: Request): Promise<Response> {
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    });
    const json = (status: number, value: unknown): Response =>
      new Response(JSON.stringify(value), { status, headers });
    try {
      const url = new URL(request.url);
      const host = request.headers.get("host") ?? url.host;
      if (origin ? url.origin !== origin || host !== new URL(origin).host : !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host))
        fail(403, "This app only accepts localhost requests.");
      const requestOrigin = request.headers.get("origin");
      if (requestOrigin && requestOrigin !== (origin ?? url.origin))
        fail(403, "Cross-origin requests are not allowed.");
      const path = url.pathname;
      let session = request.headers
        .get("cookie")
        ?.match(/(?:^|;\s*)raju_session=([a-f0-9-]{36})(?:;|$)/)?.[1];
      if (!store.session(session)) {
        session = store.newSession();
        headers.set(
          "Set-Cookie",
          `raju_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${url.protocol === "https:" ? "; Secure" : ""}`,
        );
      }
      // The store validated the existing session or created one above.
      const sessionId = session!;
      store.purge();
      const reportAvailability = (report: Report): Report => ({
        ...report,
        sourceAvailable: (
          report.conversationIds ?? [report.conversationId!]
        ).every((id) => Boolean(store.conversation(sessionId, id)?.messages)),
      });
      if (path === "/api/session" && request.method === "GET") {
        return json(200, {
          mode: origin ? "hosted" : "local",
          aiConfigured: aiConfigured(),
          characters: ["Raju", "Meera", "Kabir"],
          paymentsEnabled: false,
          emailEnabled: false,
        });
      }
      if (path === "/api/report-jobs" && request.method === "GET")
        return json(200, { jobs: store.jobs(sessionId).map(job => jobs.get(sessionId, job.id)) });
      const jobMatch = path.match(/^\/api\/report-jobs\/([a-f0-9-]{36})(?:\/(confirm|resume))?$/);
      if (jobMatch) {
        if (request.method === "GET" && !jobMatch[2]) return json(200, { job: jobs.get(sessionId, jobMatch[1]) });
        if (request.method === "DELETE" && !jobMatch[2]) {
          jobs.remove(sessionId, jobMatch[1]);
          return json(200, { deleted: true });
        }
        if (request.method === "POST" && jobMatch[2]) return json(200, { job: jobs.act(sessionId, jobMatch[1], jobMatch[2] as "confirm" | "resume") });
        fail(405, "Method not allowed.");
      }
      if (path === "/api/import" && request.method === "POST") {
        const input = await body(request);
        const filename = requiredString(input.filename, "Filename", 250);
        if (input.text !== undefined && typeof input.text !== "string")
          fail(400, "The chat text must be a string.");
        if (input.base64 !== undefined && typeof input.base64 !== "string")
          fail(400, "The uploaded file must be base64 text.");
        let parsed: ReturnType<typeof parseChat>;
        try {
          const text = await decodeImport({
            filename,
            text: input.text as string | undefined,
            base64: input.base64 as string | undefined,
          });
          parsed = parseChat(text, filename);
        } catch (error) {
          fail(
            400,
            error instanceof Error
              ? error.message
              : "Unable to read this chat export.",
          );
        }
        const stats = computeStats(parsed.messages);
        const metadata: Conversation = {
          id: randomUUID(),
          title:
            parsed.participants.slice(0, 3).join(" & ") +
            (parsed.participants.length > 3 ? " & friends" : ""),
          participants: parsed.participants,
          messageCount: parsed.messages.length,
          firstDate: stats.firstDate,
          lastDate: stats.lastDate,
          platform:
            optionalString(input.platform, "Platform", 40) || parsed.format,
          context: optionalString(input.context, "Chat type", 100) || "Other",
          createdAt: new Date().toISOString(),
        };
        metadata.isLargeChat = isLargeChat({ ...metadata, messages: parsed.messages });
        const conversation = store.addConversation(
          sessionId,
          metadata,
          parsed.messages,
        );
        return json(201, {
          conversation: { ...conversation, available: true },
          stats,
        });
      }
      if (path === "/api/conversations" && request.method === "GET")
        return json(200, { conversations: store.conversations(sessionId).map(metadata => {
          if (metadata.isLargeChat !== undefined || !metadata.available) return metadata;
          const source = store.conversation(sessionId, metadata.id);
          return source?.messages ? { ...metadata, isLargeChat: isLargeChat({ ...source, messages: source.messages }) } : metadata;
        }) });
      const chatMatch = path.match(/^\/api\/conversations\/([a-f0-9-]{36})$/);
      if (chatMatch) {
        const conversation = store.conversation(sessionId, chatMatch[1]);
        if (!conversation) fail(404, "Conversation not found.");
        if (request.method === "GET")
          return json(200, { conversation: cleanConversation(conversation) });
        if (request.method === "DELETE") {
          if (jobs.active(sessionId)) fail(409, "Wait for the current reading to stop before deleting source chats.");
          store.deleteConversation(sessionId, conversation.id);
          return json(200, { deleted: true, reportsPreserved: true });
        }
        if (request.method === "PATCH") {
          if (jobs.active(sessionId)) fail(409, "Wait for the current reading to stop before changing source chats.");
          const input = await body(request);
          const metadata = cleanConversation(conversation);
          delete metadata.stats;
          delete metadata.available;
          delete metadata.expiresAt;
          if (input.title !== undefined)
            metadata.title = requiredString(input.title, "Title", 200);
          let messages = conversation.messages;
          if (input.aliases !== undefined) {
            if (!messages) fail(410, "The original chat has expired.");
            if (
              !input.aliases ||
              typeof input.aliases !== "object" ||
              Array.isArray(input.aliases)
            )
              fail(400, "Aliases must map original names to display names.");
            const aliases = new Map<string, string>();
            for (const [original, name] of Object.entries(input.aliases)) {
              if (!conversation.participants.includes(original))
                fail(400, "An alias refers to an unknown participant.");
              aliases.set(original, requiredString(name, "Display name", 200));
            }
            messages = messages.map((message) => ({
              ...message,
              sender: aliases.get(message.sender) ?? message.sender,
            }));
            metadata.participants = [
              ...new Set(messages.map((message) => message.sender)),
            ];
            if (metadata.participants.length < 2)
              fail(400, "Keep at least two distinct participants.");
          }
          if (input.person !== undefined) {
            const person = requiredString(input.person, "Your name", 200);
            if (!metadata.participants.includes(person))
              fail(400, "Choose a participant from the conversation.");
            metadata.person = person;
          } else if (
            metadata.person &&
            !metadata.participants.includes(metadata.person)
          )
            delete metadata.person;
          if (messages) metadata.isLargeChat = isLargeChat({ ...metadata, messages });
          store.updateConversation(
            sessionId,
            conversation.id,
            metadata,
            messages,
          );
          return json(200, {
            conversation: cleanConversation({
              ...metadata,
              messages,
              expiresAt: conversation.expiresAt,
            }),
          });
        }
        fail(405, "Method not allowed.");
      }
      if (path === "/api/reports" && request.method === "GET")
        return json(200, {
          reports: store
            .reports(sessionId)
            .map((report) => summary(reportAvailability(report))),
        });
      const reportMatch = path.match(/^\/api\/reports\/([a-f0-9-]{36})$/);
      if (reportMatch) {
        const report = store.report(sessionId, reportMatch[1]);
        if (!report) fail(404, "Report not found.");
        if (request.method === "GET")
          return json(200, { report: reportAvailability(report) });
        if (request.method === "DELETE") {
          store.deleteReport(sessionId, report.id);
          return json(200, { deleted: true });
        }
        fail(405, "Method not allowed.");
      }
      if (
        (path === "/api/reports" || path === "/api/ultimate" || path === "/api/report-jobs") &&
        request.method === "POST"
      ) {
        if (busy.has(sessionId))
          fail(409, "A report is already being generated. Please wait.");
        const input = await body(request);
        const candidateIds =
          path === "/api/ultimate" || (path === "/api/report-jobs" && input.conversationIds !== undefined)
            ? input.conversationIds : [input.conversationId];
        if (
          !Array.isArray(candidateIds) ||
          candidateIds.some((id) => typeof id !== "string") ||
          new Set(candidateIds).size !== candidateIds.length ||
          (path === "/api/ultimate"
            ? candidateIds.length < 2 || candidateIds.length > 5
            : path === "/api/report-jobs" ? candidateIds.length < 1 || candidateIds.length > 5 : candidateIds.length !== 1)
        ) {
          fail(400, "Select the required number of unique conversations.");
        }
        const ids = candidateIds as string[];
        const conversations = ids.map((id) => {
          const conversation = store.conversation(sessionId, id);
          if (!conversation) fail(404, "Conversation not found.");
          if (!conversation.messages)
            fail(
              410,
              "The original chat is no longer available. Upload it again to generate a new report.",
            );
          return { ...conversation, messages: conversation.messages };
        });
        const options = reportOptions(input, [
          ...new Set(
            conversations.flatMap((conversation) => conversation.participants),
          ),
        ]);
        if (path === "/api/report-jobs" && options.mode !== "ai") fail(400, "Report jobs are for AI readings. Use local analysis for a factual report.");
        if (options.mode === "ai" && aiConfiguration().provider === "anthropic") {
          const requestId = input.requestId === undefined ? randomUUID() : requiredString(input.requestId, "Request identifier", 100);
          return json(202, { job: jobs.create(sessionId, conversations, options, requestId) });
        }
        if (jobs.active(sessionId)) fail(409, "A report is already being prepared. Wait for it to finish.");
        if (options.mode === "ai" && isLargeHistory(conversations)) fail(409, "Large-chat AI confirmation currently requires the Anthropic pipeline. Choose local analysis or configure Anthropic.");
        busy.add(sessionId);
        try {
          let report: Report;
          try {
            report = await createReport(conversations, options);
          } catch (error) {
            fail(
              502,
              error instanceof Error
                ? error.name === "TimeoutError"
                  ? "The AI provider timed out. Please try again."
                  : error.message
                : "Report generation failed.",
            );
          }
          if (ids.some((id) => !store.conversation(sessionId, id)?.messages))
            fail(
              409,
              "A source conversation was removed while the report was being generated.",
            );
          store.addReport(sessionId, report, ids);
          return json(201, { report });
        } finally {
          busy.delete(sessionId);
        }
      }
      if (path === "/api/account" && request.method === "POST") {
        headers.set(
          "Set-Cookie",
          "raju_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        );
        return json(200, { signedOut: true });
      }
      if (path === "/api/account" && request.method === "DELETE") {
        if (busy.has(sessionId) || jobs.active(sessionId))
          fail(
            409,
            "Wait for report generation to finish before deleting local data.",
          );
        store.deleteAccount(sessionId);
        headers.set(
          "Set-Cookie",
          "raju_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        );
        return json(200, { deleted: true });
      }
      fail(404, "API route not found.");
    } catch (error) {
      return json(error instanceof ApiError || error instanceof AnalysisError ? error.status : 500, {
        error:
          error instanceof ApiError || error instanceof AnalysisError
            ? error.message
            : "Something went wrong on the local server.",
      });
    }
  };
}
