import { createHash, randomUUID } from "node:crypto";
import { sanitizeJsonSchema } from "@ai-sdk/anthropic/internal";
import type { AnalysisUsage, Consumption, Message, ReportOptions, SourceConversation, Stats, Report } from "./types";

export const PRICING_VERSION = "anthropic-2026-11-14";
const ANALYSIS_VERSION = "recent-v1";
const DAY = 86400000;
type Stage = Consumption["stage"];
type ModelInfo = { id: string; max_input_tokens: number; max_tokens: number; capabilities: { thinking?: { types?: Record<string, { supported: boolean }> }; structured_outputs?: { supported: boolean } } };
export type WriterSpec = { system: string; schema: Record<string, unknown> };
export type Unit = { ref: string; index: number; start: number; end: number };
export type Chunk = { conversationId: string; units: Unit[]; tokens: number; key: string };
export type Finding = { chronology: string; aliases: {name: string; explanation: string; refs: string[]}[]; scenes: {claim: string; refs: string[]}[]; contradictions: {claim: string; refs: string[]}[] };
export interface AnalysisPlan {
  method: "direct" | "chunked" | "recent";
  chunks: Chunk[];
  estimatedCostUsd: number;
  budgetUsd: number;
  fingerprint: string;
  sourceHash: string;
  writerModel: string;
  analysisModel: string;
  targetTokens: number;
  writerInputLimit: number;
  writerOutput: number;
  analysisOutput: number;
  reductionPasses: number;
  outputLimits?: Record<string, number>;
  messageCounts?: number[];
  coverage?: Report["aiCoverage"];
}
export interface AnalysisRuntime {
  calls: () => Consumption[];
  record: (call: Consumption) => void;
  check: () => void;
  progress: (stage: string, completed: number, total: number) => void;
  cacheGet: (key: string) => Finding | null;
  cachePut: (key: string, finding: Finding) => void;
}
export function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export function analysisSettings() {
  const budgetUsd = Number(process.env.AI_MAX_REPORT_COST_USD ?? 1);
  const targetTokens = Number(process.env.AI_TARGET_INPUT_TOKENS ?? 80000);
  if (!Number.isFinite(budgetUsd) || budgetUsd <= 0 || budgetUsd > 100)
    throw new AnalysisError("AI_MAX_REPORT_COST_USD must be greater than zero and at most 100.", 400);
  if (!Number.isInteger(targetTokens) || targetTokens < 4000 || targetTokens > 90000)
    throw new AnalysisError("AI_TARGET_INPUT_TOKENS must be between 4,000 and 90,000.", 400);
  return { budgetUsd, targetTokens, writerModel: process.env.AI_MODEL?.trim() ?? "", analysisModel: process.env.AI_ANALYSIS_MODEL?.trim() || "claude-haiku-5-5", baseURL: (process.env.AI_BASE_URL?.trim() || "https://api.anthropic.com/v1").replace(/\/$/, "") };
}
export function settingsFingerprint() {
  return digest({ ...analysisSettings(), provider: process.env.AI_PROVIDER || "anthropic", credential: digest(process.env.ANTHROPIC_API_KEY), pricing: PRICING_VERSION, version: ANALYSIS_VERSION });
}
export const sourceFingerprint = (conversations: SourceConversation[]) => digest(conversations.map(({ id, title, context, participants, messages }) => ({ id, title, context, participants, messages })));

function rates(model: string) {
  if (/^claude-sonnet-5-5(?:-\d{8})?$/.test(model)) return { input: 2, output: 10, cacheRead: 0.1 };
  if (/^claude-haiku-5-5(?:-\d{8})?$/.test(model)) return { input: 0.1, output: 0.5, cacheRead: 0.01 };
  throw new AnalysisError(`No reviewed pricing is available for ${model}. Configure Sonnet 5.5 before using budgeted analysis.`, 409);
}
export function maximumCost(model: string, input: number, output: number) {
  const price = rates(model);
  return (Math.ceil(input * 1.05) * price.input + output * price.output) / 1000000;
}
export const consumedCost = (calls: Consumption[]) => calls.reduce((sum, call) => sum + (call.status === "rejected" ? 0 : call.costUsd ?? call.estimatedCostUsd), 0);

const shared = globalThis as typeof globalThis & {
  rajuModelMetadata?: Map<string, { expires: number; info: ModelInfo }>;
  rajuAiSlots?: { active: number; waiters: Array<() => void> };
};
export class AnalysisError extends Error {
  status: number;
  estimatedCostUsd?: number;
  diagnostic?: { finishReason: string; issues: { code: string; path: string }[]; sectionKey?: string; outputLimit?: number };
  constructor(message: string, status = 502, estimatedCostUsd?: number) {
    super(message); this.status = status; this.estimatedCostUsd = estimatedCostUsd;
  }
}

async function providerJson(path: string, data?: unknown) {
  const { baseURL } = analysisSettings();
  let url: URL;
  try { url = new URL(baseURL); } catch { throw new AnalysisError("AI_BASE_URL must be a valid URL."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new AnalysisError("AI_BASE_URL must use HTTP or HTTPS.");
  let response: Response;
  try {
    response = await fetch(`${baseURL}${path}`, { method: data === undefined ? "GET" : "POST", headers: { "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01", "content-type": "application/json" }, ...(data === undefined ? {} : { body: JSON.stringify(data) }), signal: AbortSignal.timeout(30000) });
  } catch { throw new AnalysisError("Could not reach Anthropic to verify model limits or count tokens. No generation was started."); }
  if (!response.ok) throw new AnalysisError(`Anthropic preflight returned ${response.status}. Check provider access and try again. No generation was started.`);
  return response.json();
}

export async function modelInfo(model: string): Promise<ModelInfo> {
  rates(model);
  const key = digest([settingsFingerprint(), model]);
  shared.rajuModelMetadata ??= new Map();
  const cached = shared.rajuModelMetadata.get(key);
  if (cached && cached.expires > Date.now()) return cached.info;
  const info = await providerJson(`/models/${encodeURIComponent(model)}`) as ModelInfo;
  if (!Number.isInteger(info.max_input_tokens) || info.max_input_tokens < 1000 || !Number.isInteger(info.max_tokens) || info.max_tokens < 2000 || !info.capabilities?.structured_outputs?.supported)
    throw new AnalysisError("The selected model did not provide usable token limits and structured-output capabilities.");
  shared.rajuModelMetadata.set(key, { info, expires: Date.now() + DAY });
  return info;
}

export async function countRequest(body: Record<string, unknown>) {
  const allowed = ["model", "system", "messages", "tools", "tool_choice", "thinking", "output_config"];
  const result = await providerJson("/messages/count_tokens", Object.fromEntries(allowed.filter(key => body[key] !== undefined).map(key => [key, body[key]]))) as { input_tokens: number };
  if (!Number.isInteger(result.input_tokens) || result.input_tokens < 0) throw new AnalysisError("Anthropic returned an invalid token count. No generation was started.");
  return result.input_tokens as number;
}
const tokenLimit = (info: ModelInfo, output: number, target: number) => Math.min(target, Math.floor(info.max_input_tokens * 0.95) - output);
function requestBody(model: string, system: string, input: unknown, schema: Record<string, unknown>) {
  return { model, system, messages: [{ role: "user", content: JSON.stringify(input) }], output_config: { format: { type: "json_schema", schema: sanitizeJsonSchema(schema) } } };
}

export function fullInput(conversations: SourceConversation[], options: Partial<ReportOptions>, stats: Stats) {
  return { task: { ...options, character: options.character ?? "Raju" }, stats: compactStats(stats), coverage: conversations.map(c => ({ conversationId: c.id, totalMessages: c.messages.length, includedMessages: c.messages.length })), conversations: conversations.map(({ title, context, participants, messages }) => ({ title, context, participants, messages })) };
}
function compactStats(stats: Stats) {
  return { messageCount: stats.messageCount, wordCount: stats.wordCount, firstDate: stats.firstDate, lastDate: stats.lastDate, monthly: stats.monthly, participants: stats.participants.map(({ topWords, ...person }) => ({ ...person, topWords: topWords?.map(word => word.slice(0, 80)) })), longestSilenceDays: stats.longestSilenceDays };
}

export function coverageFor(conversations: SourceConversation[], selected: SourceConversation[]): NonNullable<Report["aiCoverage"]> {
  return conversations.map((c, i) => {
    const timestamps = selected[i].messages.map(m => m.timestamp).filter((t): t is string => Boolean(t && Number.isFinite(Date.parse(t)))).sort();
    return {conversationId: c.id, title: c.title, totalMessages: c.messages.length, includedMessages: selected[i].messages.length,
      firstDate: timestamps[0] ?? null, lastDate: timestamps.at(-1) ?? null,
      hasUndatedMessages: timestamps.length !== selected[i].messages.length};
  });
}
function recentSource(conversations: SourceConversation[], counts: number[]) {
  return conversations.map((c, i) => ({...c, messages: counts[i] ? c.messages.slice(-counts[i]) : []}));
}
function selectedInput(conversations: SourceConversation[], selected: SourceConversation[], options: Partial<ReportOptions>, stats: Stats) {
  return {...fullInput(selected, options, stats), coverage: coverageFor(conversations, selected)};
}

export async function prepareAnalysis(conversations: SourceConversation[], options: Partial<ReportOptions>, stats: Stats, writer: WriterSpec, runtime: AnalysisRuntime): Promise<AnalysisPlan> {
  const config = analysisSettings();
  if (!/^claude-sonnet-5-5(?:-\d{8})?$/.test(config.writerModel)) throw new AnalysisError("Choose Sonnet 5.5 for this reading.", 409);
  const info = await modelInfo(config.writerModel);
  if (!info.capabilities.thinking?.types?.between_tools?.supported) throw new AnalysisError("The selected model does not support the writing settings.");
  const output = Math.min(12000, info.max_tokens);
  const price = rates(config.writerModel);
  const available = config.budgetUsd - consumedCost(runtime.calls()) - output * price.output / 1000000;
  const limit = Math.min(tokenLimit(info, output, config.targetTokens), Math.floor(available * 1000000 / (price.input * 1.05)));
  if (limit <= 0) throw new AnalysisError("The remaining reading allowance cannot cover a report. Choose local analysis.", 422);
  const counts = conversations.map(() => 0);
  const empty = recentSource(conversations, counts);
  const baseTokens = await countRequest(requestBody(config.writerModel, writer.system, selectedInput(conversations, empty, options, stats), writer.schema));
  if (baseTokens >= limit) throw new AnalysisError("The report settings and statistics leave no room for messages. Choose local analysis or a smaller export.", 422);
  let bytes = 0;
  const open = conversations.map(() => true);
  while (open.some(Boolean)) {
    conversations.forEach((c, i) => {
      if (!open[i]) return;
      const index = c.messages.length - counts[i] - 1;
      if (index < 0) {open[i] = false; return;}
      const weight = Buffer.byteLength(JSON.stringify(c.messages[index]));
      if (bytes + weight > (limit - baseTokens) * 3) {open[i] = false; return;}
      counts[i]++; bytes += weight;
    });
  }
  let selected = recentSource(conversations, counts);
  let tokens = await countRequest(requestBody(config.writerModel, writer.system, selectedInput(conversations, selected, options, stats), writer.schema));
  while (tokens > limit) {
    runtime.check();
    const ratio = Math.min(0.9, (limit - baseTokens) / Math.max(1, tokens - baseTokens) * 0.9);
    for (let i = 0; i < counts.length; i++) counts[i] = Math.floor(counts[i] * ratio);
    selected = recentSource(conversations, counts);
    tokens = await countRequest(requestBody(config.writerModel, writer.system, selectedInput(conversations, selected, options, stats), writer.schema));
  }
  if (counts.some(count => count === 0)) throw new AnalysisError("The newest complete message in a chat cannot fit this reading. Choose local analysis or a smaller export.", 422);
  const estimatedCostUsd = maximumCost(config.writerModel, tokens, output);
  if (consumedCost(runtime.calls()) + estimatedCostUsd > config.budgetUsd + 1e-9) throw new AnalysisError("The remaining reading allowance cannot cover this report. Choose local analysis.", 422);
  runtime.progress("Ready to read your recent messages", 0, 0);
  return {method: "recent", chunks: [], messageCounts: counts, coverage: coverageFor(conversations, selected), estimatedCostUsd,
    budgetUsd: config.budgetUsd, fingerprint: settingsFingerprint(), sourceHash: sourceFingerprint(conversations), writerModel: config.writerModel,
    analysisModel: config.analysisModel, targetTokens: limit, writerInputLimit: limit, writerOutput: output, analysisOutput: 0, reductionPasses: 0};
}

export async function analysisInput(conversations: SourceConversation[], options: Partial<ReportOptions>, stats: Stats, writer: WriterSpec, runtime: AnalysisRuntime, existingPlan?: AnalysisPlan) {
  const plan = existingPlan ?? await prepareAnalysis(conversations, options, stats, writer, runtime);
  runtime.check();
  if (plan.method !== "recent" || !plan.messageCounts || plan.fingerprint !== settingsFingerprint() || plan.sourceHash !== sourceFingerprint(conversations))
    throw new AnalysisError("This reading needs a fresh recent-message preview. Start a new reading from your saved chat.", 409);
  const source = recentSource(conversations, plan.messageCounts);
  runtime.progress("Raju is writing your report", 0, 0);
  const input = selectedInput(conversations, source, options, stats);
  return {plan, source, prompt: JSON.stringify(input), coverage: input.coverage};
}
async function slot() {
  const state = shared.rajuAiSlots ??= { active: 0, waiters: [] };
  if (state.active >= 2) await new Promise<void>(resolve => state.waiters.push(resolve));
  else state.active++;
  return () => { const next = state.waiters.shift(); if (next) next(); else state.active--; };
}

export function guardedFetch(runtime: AnalysisRuntime, plan: AnalysisPlan, stage: Stage): typeof fetch {
  return async (url, init) => {
    runtime.check();
    if (stage !== "write") throw new AnalysisError("Full-history extraction is disabled. Start a recent-message reading.", 409);
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    const model = String(body.model);
    const output = Number(body.max_tokens);
    if (model !== (stage === "write" ? plan.writerModel : plan.analysisModel) || !Number.isInteger(output) || output <= 0 || output > (stage === "write" ? plan.writerOutput : plan.analysisOutput))
      throw new AnalysisError("The AI request does not match its approved model and output budget. No request was sent.");
    const tokens = await countRequest(body);
    const info = await modelInfo(model);
    if (tokens > tokenLimit(info, output, plan.targetTokens) || (model === plan.analysisModel && tokens >= 100000))
      throw new AnalysisError("The complete AI request exceeds its token budget. No request was sent.");
    const release = await slot();
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        runtime.check();
        const call: Consumption = { id: randomUUID(), model, stage, status: "reserved", estimatedCostUsd: maximumCost(model, tokens, output), inputTokens: tokens, pricingVersion: PRICING_VERSION };
        if (consumedCost(runtime.calls()) + call.estimatedCostUsd > plan.budgetUsd + 1e-9)
          throw new AnalysisError("This reading has reached its processing limit. Your chat is saved. Choose local analysis or start a new reading with a smaller export.");
        runtime.record(call);
        let response: Response;
        try { response = await fetch(url, init); }
        catch { runtime.record({ ...call, status: "uncertain" }); throw new AnalysisError("The connection was interrupted. Your chat is saved. You can try this reading again."); }
        if (!response.ok) {
          runtime.record({ ...call, status: response.status < 500 ? "rejected" : "uncertain" });
          const delay = Number(response.headers.get("retry-after"));
          if (response.status === 429 && response.headers.has("retry-after") && Number.isFinite(delay) && delay >= 0 && delay <= 120 && attempt < 2) {
            runtime.progress("Waiting for the provider rate limit", 0, plan.chunks.length);
            await new Promise(resolve => setTimeout(resolve, Math.max(1000, delay * 1000)));
            continue;
          }
          return response;
        }
        try {
          const data = await response.clone().json() as { usage?: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } };
          const usage = data.usage;
          if (!usage) throw new Error("Missing usage");
          const input = usage?.input_tokens, out = usage?.output_tokens;
          const read = usage?.cache_read_input_tokens ?? 0, write = usage?.cache_creation_input_tokens ?? 0;
          if (![input, out, read, write].every(n => Number.isFinite(n) && n >= 0)) throw new Error("Missing usage");
          const price = rates(model);
          const costUsd = (input * price.input + out * price.output + read * price.cacheRead + write * price.input * 2) / 1000000;
          runtime.record({ ...call, status: "completed", inputTokens: input, outputTokens: out, cacheReadTokens: read, cacheWriteTokens: write, costUsd });
        } catch { runtime.record({ ...call, status: "uncertain" }); }
        return response;
      }
      throw new AnalysisError("The provider rate limit could not be cleared. Resume later.");
    } finally { release(); }
  };
}

export function memoryRuntime(): AnalysisRuntime {
  const calls: Consumption[] = [], cache = new Map<string, Finding>();
  return { calls: () => calls, record: call => { const i = calls.findIndex(c => c.id === call.id); if (i < 0) calls.push(call); else calls[i] = call; }, check: () => {}, progress: () => {}, cacheGet: key => cache.get(key) ?? null, cachePut: (key, finding) => { cache.set(key, finding); } };
}
export function usageSummary(plan: AnalysisPlan, runtime: AnalysisRuntime, processedMessages: number, evidenceMessages: number): AnalysisUsage {
  return { method: plan.method, processedMessages, evidenceMessages, budgetUsd: plan.budgetUsd, estimatedCostUsd: plan.estimatedCostUsd, calls: runtime.calls() };
}
