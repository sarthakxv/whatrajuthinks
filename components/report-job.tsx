"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, useApi } from "@/lib/client";
import type { ReportJobView } from "@/lib/types";
import { coverageNotice } from "@/lib/report-coverage";
import { BackButton, ErrorMessage, LoadingView, Modal, PageError } from "./ui";

export function ReportJob({ id }: { id: string }) {
  const router = useRouter();
  const { data, error, refresh } = useApi<{ job: ReportJobView }>(`/api/report-jobs/${id}`, 1500);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const actionInFlight = useRef(false);
  const job = data?.job;
  useEffect(() => {
    if (job?.status === "completed" && job.reportId) router.replace(`/r/${job.reportId}`);
  }, [job?.status, job?.reportId, router]);
  async function act(action: "confirm" | "resume") {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusy(true); setActionError("");
    try {
      const next = await api<{ job: ReportJobView }>(`/api/report-jobs/${id}/${action}`, { method: "POST" });
      await refresh(next, { revalidate: false });
    } catch (error) { setActionError(error instanceof Error ? error.message : "Could not continue this reading."); }
    finally { setBusy(false); actionInFlight.current = false; }
  }
  if (error) return <PageError message={error} />;
  if (!job) return <LoadingView label="Opening your reading." />;
  const stopped = job.status === "failed" || job.status === "interrupted";
  const limitExceeded = stopped && (job.estimatedCostUsd ?? 0) > job.budgetUsd;
  const coverage = job.coverage ? coverageNotice({ aiCoverage: job.coverage, messageCount: 0, character: "Raju" }) : "";
  return (
    <main className="narrow prose" id="main">
      <BackButton href="/account" label="Back to your account" />
      <span className="eyebrow" style={{ display: "block", marginTop: 24 }}>Your reading</span>
      <h1 className="text-balance">{limitExceeded ? "This chat needs a larger reading." : stopped ? "Your reading has stopped." : job.stage}</h1>
      <div role="status" aria-live="polite">
        {job.status === "planning" && <p>Choosing the recent messages for your reading.</p>}
        {coverage && <p className="notice">{coverage}</p>}
        {!stopped && <p>This reading runs in the background. You can leave this page and come back from your account. Your progress is saved.</p>}
      </div>
      <ErrorMessage message={actionError || job.error} />
      {limitExceeded && <>
        <p>Your uploaded chat is saved. You can choose local analysis from your account, or upload a smaller export.</p>
        <button className="btn btn-primary" disabled={busy} onClick={() => act("resume")}>{busy ? "Checking…" : "Check this chat again"}</button>{" "}
        <Link className="btn" href="/account">Open your chats</Link>{" "}
        <Link className="btn" href="/upload">Upload a smaller chat</Link>
      </>}
      {stopped && !limitExceeded && <>
        <p>Your chat is saved. Try again to prepare a reading of your recent messages.</p>
        <button className="btn btn-primary" disabled={busy} onClick={() => act("resume")}>{busy ? "Starting…" : "Try again"}</button>
      </>}
      {job.status === "awaiting_confirmation" && (
        <Modal title="This is a large chat" onClose={() => router.back()}>
          <p>Raju will read the most recent part of this chat. Older messages won’t be part of the reading; your statistics will still cover the full chat.</p>
          {coverage && <p>{coverage}</p>}
          <ErrorMessage message={actionError} />
          <div className="report-tools">
            <BackButton disabled={busy} onClick={() => router.back()} />
            <button className="btn btn-primary" disabled={busy} onClick={() => act("confirm")}>{busy ? "Starting…" : "Read my chat"}</button>
          </div>
        </Modal>
      )}
    </main>
  );
}
