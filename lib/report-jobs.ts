import { randomUUID } from "node:crypto";
import { APICallError } from "ai";
import type { Store } from "./store.mjs";
import { createReport, planReport } from "./reports.ts";
import { isLargeHistory } from "./chat-size.ts";
import { AnalysisError, analysisSettings, consumedCost, digest, settingsFingerprint, sourceFingerprint, type AnalysisPlan, type AnalysisRuntime } from "./ai-analysis.ts";
import type { Consumption, ReportJobView, ReportOptions, SourceConversation } from "./types";

export interface ReportJob extends Omit<ReportJobView, "consumedCostUsd"> {
  requestId: string;
  key: string;
  conversationIds: string[];
  options?: ReportOptions;
  sourceHash: string;
  fingerprint: string;
  calls: Consumption[];
  plan?: AnalysisPlan;
  confirmedAt?: string;
  workerId?: string;
  leaseUntil?: number;
  diagnostic?: AnalysisError["diagnostic"];
}

export function jobView(job: ReportJob): ReportJobView {
  const { id, status, stage, completedChunks, totalChunks, estimatedCostUsd, budgetUsd, requiresConfirmation, reportId, error, createdAt } = job;
  return { id, status, stage, completedChunks, totalChunks, estimatedCostUsd, budgetUsd, consumedCostUsd: consumedCost(job.calls), coverage: job.plan?.coverage, requiresConfirmation, reportId, error, createdAt };
}

export function reportJobs(store: Store, enqueue?: (session: string, id: string) => void) {
  function sources(session: string, job: ReportJob): SourceConversation[] {
    return job.conversationIds.map(id => {
      const conversation = store.conversation(session, id);
      if (!conversation?.messages) throw new AnalysisError("The source chat was deleted or expired. Upload it again for a new reading.", 410);
      return { ...conversation, messages: conversation.messages };
    });
  }
  function verify(session: string, job: ReportJob) {
    if (job.fingerprint !== settingsFingerprint() || job.sourceHash !== sourceFingerprint(sources(session, job)))
      throw new AnalysisError("The source or AI configuration changed. Start a new report estimate and confirm it again.", 409);
  }
  function recover(session: string, job: ReportJob) {
    if (["running", "planning", "queued"].includes(job.status) && (job.leaseUntil ?? 0) < Date.now())
      return store.updateJob(session, job.id, current => ({ ...current, status: "interrupted", stage: "Ready to resume", error: "The reading was interrupted. Raju has saved the sections he already read. Resume when you’re ready.", calls: current.calls.map(call => call.status === "reserved" ? { ...call, status: "uncertain" } : call) }));
    return job;
  }
  function runtime(session: string, id: string, workerId: string): AnalysisRuntime {
    const read = () => { const job = store.job(session, id); if (!job) throw new AnalysisError("This report job is no longer available.", 410); return job; };
    return {
      calls: () => read().calls,
      check: () => { const job = read(); if (job.workerId !== workerId || !["running", "planning"].includes(job.status)) throw new AnalysisError("This report job is no longer running.", 409); verify(session, job); },
      record: call => { store.updateJob(session, id, job => { const calls = [...job.calls]; const index = calls.findIndex(c => c.id === call.id); if (index < 0) calls.push(call); else calls[index] = call; return { ...job, calls }; }); },
      progress: (stage, completed, total) => { store.updateJob(session, id, job => ({ ...job, stage, completedChunks: Math.max(job.completedChunks, completed), totalChunks: Math.max(job.totalChunks, total) })); },
      cacheGet: key => store.cachedAnalysis(session, key),
      cachePut: (key, finding) => { const job = read(); verify(session, job); store.cacheAnalysis(session, key, job.conversationIds, finding); },
    };
  }
  function start(session: string, id: string) {
    if (enqueue) {
      store.updateJob(session, id, job => ({ ...job, workerId: undefined, leaseUntil: Date.now() + 60000 }));
      enqueue(session, id);
    }
    else void run(session, id);
  }
  async function run(session: string, id: string) {
    const workerId = randomUUID();
    let claimed = false;
    const job = store.updateJob(session, id, job => {
      if (!["planning", "queued"].includes(job.status) || (job.workerId && (job.leaseUntil ?? 0) > Date.now())) return job;
      claimed = true;
      return { ...job, workerId, leaseUntil: Date.now() + 60000, status: job.status === "queued" ? "running" : "planning", stage: job.status === "queued" ? "Preparing your reading" : "Getting ready to read your chat", error: undefined };
    });
    if (!claimed) return;
    const heartbeat = setInterval(() => {
      try { store.updateJob(session, id, job => job.workerId === workerId ? { ...job, leaseUntil: Date.now() + 60000 } : job); } catch { /* Source deletion also removes its job. */ }
    }, 10000);
    heartbeat.unref?.();
      try {
        const context = runtime(session, id, workerId);
        context.check();
        const conversations = sources(session, job);
        let current = store.job(session, id)!;
        if (!current.plan) {
          const plan = await planReport(conversations, current.options!, context);
          context.check();
          current = store.updateJob(session, id, job => ({ ...job, plan, estimatedCostUsd: plan.estimatedCostUsd, totalChunks: plan.chunks.length, status: (job.requiresConfirmation || plan.coverage?.some(c => c.includedMessages < c.totalMessages)) && !job.confirmedAt ? "awaiting_confirmation" : "running", requiresConfirmation: job.requiresConfirmation || Boolean(plan.coverage?.some(c => c.includedMessages < c.totalMessages)), stage: "Ready to read your recent messages" }));
          if (current.status === "awaiting_confirmation") return;
        }
        if (current.requiresConfirmation && !current.confirmedAt) throw new AnalysisError("Confirm this large-chat reading before generating it.", 409);
        const report = await createReport(conversations, current.options!, { plan: current.plan!, runtime: context });
        context.check();
        store.completeJob(session, id, report);
      } catch (error) {
        const hasProgress = (store.job(session, id)?.completedChunks ?? 0) > 0;
        const message = error instanceof AnalysisError ? error.message : APICallError.isInstance(error) ? `The AI provider returned ${error.statusCode ?? "an error"}. Your chat is saved. Check your connection before trying again.` : hasProgress ? "Raju couldn’t finish this report. The sections already read are saved. You can resume to try again." : "Raju couldn’t read the first section. Your chat is saved. You can try again.";
        try { store.updateJob(session, id, job => ({ ...job, status: "failed", stage: "Reading stopped", error: message, ...(error instanceof AnalysisError ? { diagnostic: error.diagnostic, ...(error.estimatedCostUsd !== undefined ? { estimatedCostUsd: error.estimatedCostUsd } : {}) } : {}), calls: job.calls.map(call => call.status === "reserved" ? { ...call, status: "uncertain" } : call) })); } catch { /* Do not restore a deleted source or job. */ }
      } finally {
        clearInterval(heartbeat);
        try { store.updateJob(session, id, job => job.workerId === workerId ? { ...job, leaseUntil: 0 } : job); } catch { /* Source may have expired. */ }
      }
  }
  return {
    run,
    create(session: string, conversations: SourceConversation[], options: ReportOptions, requestId: string) {
      const config = analysisSettings();
      const sourceHash = sourceFingerprint(conversations), fingerprint = settingsFingerprint();
      const key = digest([sourceHash, fingerprint, options]);
      const existing = store.jobs(session).find(job => job.requestId === requestId || (job.key === key && ["planning", "awaiting_confirmation", "queued", "running", "interrupted"].includes(job.status)));
      if (existing) {
        if (existing.key !== key) throw new AnalysisError("This request identifier already belongs to a different report. Start a new request.", 409);
        return jobView(recover(session, existing));
      }
      if (store.jobs(session).some(job => ["planning", "queued", "running"].includes(recover(session, job).status)))
        throw new AnalysisError("A report is already being prepared. Wait for it to finish.", 409);
      const job: ReportJob = { id: randomUUID(), requestId, key, conversationIds: conversations.map(c => c.id), sourceHash, fingerprint, options, calls: [], status: "planning", stage: "Getting ready to read your chat", completedChunks: 0, totalChunks: 0, budgetUsd: config.budgetUsd, requiresConfirmation: isLargeHistory(conversations), createdAt: new Date().toISOString() };
      store.addJob(session, job);
      start(session, job.id);
      return jobView(store.job(session, job.id)!);
    },
    get(session: string, id: string) {
      const job = store.job(session, id);
      if (!job) throw new AnalysisError("Report job not found or its source has expired.", 404);
      return jobView(recover(session, job));
    },
    remove(session: string, id: string) {
      const job = store.job(session, id);
      if (!job) throw new AnalysisError("Report job not found or its source has expired.", 404);
      recover(session, job);
      if (!store.deleteJob(session, id))
        throw new AnalysisError("This reading is still running. You can remove it once it stops.", 409);
    },
    act(session: string, id: string, action: "confirm" | "resume") {
      let job = store.job(session, id);
      if (!job) throw new AnalysisError("Report job not found or its source has expired.", 404);
      job = recover(session, job);
      if (job.status === "completed") return jobView(job);
      if (action === "resume" && ["failed", "interrupted", "awaiting_confirmation"].includes(job.status) && job.plan?.method !== "recent") {
        if (sourceFingerprint(sources(session, job)) !== job.sourceHash || analysisSettings().budgetUsd !== job.budgetUsd)
          throw new AnalysisError("The chat or reading settings changed. Start a new reading from your account.", 409);
        // Re-plan legacy jobs with fresh consent while preserving every prior charge.
        const fingerprint = settingsFingerprint();
        store.updateJob(session, id, current => ({ ...current, fingerprint, plan: undefined, requiresConfirmation: true, key: digest([current.sourceHash, fingerprint, current.options]), status: "planning", stage: "Getting ready to read your chat", estimatedCostUsd: undefined, completedChunks: 0, totalChunks: 0, confirmedAt: undefined, leaseUntil: 0, workerId: undefined, error: undefined }));
        start(session, id);
        return jobView(store.job(session, id)!);
      }
      verify(session, job);
      if (action === "confirm" && job.status === "awaiting_confirmation") {
        store.updateJob(session, id, current => current.status === "awaiting_confirmation" ? { ...current, status: "queued", confirmedAt: new Date().toISOString(), leaseUntil: 0 } : current);
      } else if (action === "resume" && ["failed", "interrupted"].includes(job.status)) {
        if (job.estimatedCostUsd !== undefined && job.estimatedCostUsd > job.budgetUsd) throw new AnalysisError("This chat needs more processing than this reading allows. Try a smaller export or choose local analysis.", 422);
        const plan = job.plan;
        store.updateJob(session, id, current => ({ ...current, plan, status: current.plan ? (current.requiresConfirmation && !current.confirmedAt ? "awaiting_confirmation" : "queued") : "planning", leaseUntil: 0, error: undefined }));
      }
      const current = store.job(session, id)!;
      if (["queued", "planning"].includes(current.status)) start(session, id);
      return jobView(store.job(session, id)!);
    },
    active(session: string) { return store.jobs(session).some(job => ["planning", "queued", "running"].includes(recover(session, job).status)); },
  };
}
