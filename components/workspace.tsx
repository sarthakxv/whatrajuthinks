"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, formatDate, num, useApi } from "@/lib/client";
import type { Conversation, ReportJobView, ReportSummary } from "@/lib/types";
import { BackButton, Icon, LoadingView, Modal, PageError, ErrorMessage } from "./ui";

const cardColors = ["#fec901", "#ff91e7", "#7ee1b5", "#c3b6fc"];
const contextEmoji: Record<string, string> = {
  partner: "💌",
  friendsGroup: "😂",
  closeFriend: "🫶",
  family: "🏠",
  work: "📋",
  other: "💬",
};

function reportIds(report: ReportSummary) {
  return (
    report.conversationIds ??
    (report.conversationId ? [report.conversationId] : [])
  );
}

function countLabel(count: number) {
  return `${count} ${count === 1 ? "report" : "reports"}`;
}

export function Workspace() {
  const pending = useApi<{ jobs: ReportJobView[] }>("/api/report-jobs", 5000);
  const [removing, setRemoving] = useState<string[]>([]);
  const [processError, setProcessError] = useState("");
  async function removeProcess(id: string) {
    setRemoving(current => [...current, id]);
    setProcessError("");
    try {
      await api(`/api/report-jobs/${id}`, { method: "DELETE" });
      await pending.refresh(current => current ? { jobs: current.jobs.filter(job => job.id !== id) } : current);
    } catch (error) {
      setProcessError(error instanceof Error ? error.message : "Could not remove this process.");
    } finally {
      setRemoving(current => current.filter(value => value !== id));
    }
  }
  const reports = useApi<{ reports: ReportSummary[] }>("/api/reports", 0, true);
  const chats = useApi<{ conversations: Conversation[] }>("/api/conversations", 0, true);
  if ((reports.error || chats.error) && (!reports.data || !chats.data))
    return <main className="narrow prose" id="main">
      <h1>Your account</h1>
      <ErrorMessage message="Your reports couldn’t be loaded. Please try again." />
      <button className="btn btn-primary" onClick={() => { void reports.refresh(); void chats.refresh(); }}>Try again</button>
    </main>;
  if (!reports.data || !chats.data)
    return <LoadingView label="Opening your conversations." />;
  const reportList = reports.data.reports;
  const conversations = [...chats.data.conversations].reverse();
  const known = new Set(conversations.map((chat) => chat.id));
  const cards: {
    key: string;
    href: string;
    title: string;
    emoji: string;
    count: number;
  }[] = conversations.map((chat) => ({
    key: chat.id,
    href: `/c/${chat.id}`,
    title: chat.title,
    emoji: contextEmoji[chat.context] ?? "💬",
    count: reportList.filter((report) => reportIds(report).includes(chat.id))
      .length,
  }));
  for (const report of reportList) {
    const ids = reportIds(report);
    if (ids.length > 0 && ids.some((id) => known.has(id))) continue;
    cards.push({
      key: report.id,
      href: `/r/${report.id}`,
      title: report.title,
      emoji: "💬",
      count: 1,
    });
  }
  return (
    <main className="account-home" id="main">
      <header className="account-bar">
        <h1 className="text-balance">Your account</h1>
        <Link
          href="/settings"
          className="account-gear"
          aria-label="Account settings"
        >
          <Icon name="gear" />
        </Link>
      </header>
      {!!pending.data?.jobs.some(job => job.status !== "completed") && (
        <section className="background-processes" aria-labelledby="background-processes-title">
          <h2 id="background-processes-title">Background processes</h2>
          <p className="background-processes-hint">Readings run in the background. You can leave this page.</p>
          <ul className="background-process-list">
            {pending.data.jobs.filter(job => job.status !== "completed").map(job => {
              const running = ["planning", "queued", "running"].includes(job.status);
              const waiting = job.status === "awaiting_confirmation";
              const status = running ? "Running in background" : waiting ? "Waiting for you" : job.status === "failed" ? "Failed · Not running" : "Interrupted · Not running";
              return (
                <li className="background-process" key={job.id}>
                  <div className="background-process-copy">
                    <span className="background-process-status">{status}</span>
                    <strong>{job.stage}</strong>
                    {job.error && <p>{job.error}</p>}
                  </div>
                  <div className="background-process-actions">
                    <Link className="text-link" href={`/generating/${job.id}`}>{running ? "View progress" : waiting ? "Review reading" : "View details"}</Link>
                    {!running && <button className="btn" type="button" disabled={removing.includes(job.id)} aria-label={`Remove process: ${job.stage}`} onClick={() => void removeProcess(job.id)}>{removing.includes(job.id) ? "Removing…" : "Remove"}</button>}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="background-processes-hint">Removing a stopped process keeps your chat and reports.</p>
        </section>
      )}
      <ErrorMessage message={processError || pending.error || ""} />
      <div className="convo-grid">
        {cards.map((card, index) => (
          <Link
            className="convo-card"
            href={card.href}
            key={card.key}
            style={{ background: cardColors[index % cardColors.length] }}
          >
            <span className="convo-emoji" aria-hidden="true">
              {card.emoji}
            </span>
            <span className="convo-copy">
              <span className="convo-name">{card.title}</span>
              <span className="convo-count">{countLabel(card.count)}</span>
            </span>
          </Link>
        ))}
        <Link className="convo-card convo-card-new" href="/setup">
          <span className="convo-plus" aria-hidden="true">
            <Icon name="plus" />
          </span>
          <span className="convo-name">Analyze a new conversation</span>
        </Link>
      </div>
    </main>
  );
}

export function ConversationView({ id }: { id: string }) {
  const router = useRouter();
  const { data, error } = useApi<{ conversation: Conversation }>(
    `/api/conversations/${id}`,
  );
  const reports = useApi<{ reports: ReportSummary[] }>("/api/reports");
  const [deletion, setDeletion] = useState<{
    kind: "reports" | "conversations";
    id: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  async function remove() {
    if (!deletion) return;
    setBusy(true);
    setDeleteError("");
    try {
      await api(`/api/${deletion.kind}/${deletion.id}`, { method: "DELETE" });
      setDeletion(null);
      if (deletion.kind === "conversations") router.push("/account");
      else reports.refresh();
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : "Could not delete this item.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (error || reports.error)
    return <PageError message={error || reports.error || ""} />;
  if (!data || !reports.data)
    return <LoadingView label="Opening your conversation." />;
  const c = data.conversation;
  const people = c.participants.join(" & ");
  function resume() {
    sessionStorage.setItem(
      "raju-draft",
      JSON.stringify({
        context: c.context || "closeFriend",
        platform: "WhatsApp",
        conversation: c,
        stats: c.stats,
        language: "English",
        tone: "Balanced",
        person: c.person || "",
        mode: "local",
      }),
    );
    router.push("/chat-context");
  }
  return (
    <main className="narrow prose" id="main">
      <BackButton href="/account" label="Back to your account" />
      <span className="eyebrow" style={{ display: "block", marginTop: 25 }}>
        WhatsApp · {num(c.messageCount)} messages
      </span>
      <h1 className="serif">{c.title}</h1>
      {people !== c.title && <p>{people}</p>}
      {c.available === false ? (
        <div className="notice warning">
          This source chat has expired. Your existing reports remain available.
        </div>
      ) : (
        <div className="notice">
          Source available until {formatDate(c.expiresAt)}. You can delete it
          sooner and keep your reports.
        </div>
      )}
      <div className="chat-actions">
        {c.available !== false && (
          <button className="btn btn-primary" onClick={resume}>
            Make a report <Icon name="arrow" />
          </button>
        )}
        {c.stats && (
          <Link href={`/c/${id}/stats`} className="btn">
            The stats <Icon name="arrow" />
          </Link>
        )}
        <button
          className="btn"
          type="button"
          onClick={() => {
            setDeleteError("");
            setDeletion({ kind: "conversations", id });
          }}
        >
          Delete this chat
        </button>
      </div>
      <h2>Your reports on this chat</h2>
      <div className="report-list">
        {reports.data.reports
          .filter((r) => reportIds(r).includes(id))
          .map((r) => (
            <article className="report-card" key={r.id}>
              <div className="card-info">
                <h3>
                  <Link href={`/r/${r.id}`}>{r.title}</Link>
                </h3>
                <p>
                  {formatDate(r.createdAt)} ·{" "}
                  {r.mode === "ai" ? "AI report" : "Local analysis"}
                </p>
              </div>
              <div className="card-actions">
                <Link href={`/r/${r.id}`} className="btn">
                  Read <Icon name="arrow" />
                </Link>
                <button
                  className="icon-btn"
                  type="button"
                  aria-label={`Delete report: ${r.title}`}
                  onClick={() => {
                    setDeleteError("");
                    setDeletion({ kind: "reports", id: r.id });
                  }}
                >
                  <Icon name="trash" />
                </button>
              </div>
            </article>
          ))}
      </div>
      {!reports.data.reports.some((r) => reportIds(r).includes(id)) && (
        <p>No reports yet. Start a reading above.</p>
      )}
      {deletion && (
        <Modal
          title={
            deletion.kind === "reports"
              ? "Delete this report?"
              : "Delete this source chat?"
          }
          onClose={() => {
            if (!busy) setDeletion(null);
          }}
        >
          <p>
            {deletion.kind === "reports"
              ? "This report will be permanently removed from your workspace. This cannot be undone."
              : "This removes the imported source messages. Your existing reports stay available, but you won’t be able to make another reading from this chat."}
          </p>
          <ErrorMessage message={deleteError} />
          <div className="modal-actions">
            <button
              className="btn"
              type="button"
              disabled={busy}
              onClick={() => setDeletion(null)}
            >
              Keep it
            </button>
            <button
              className="btn btn-danger"
              type="button"
              disabled={busy}
              onClick={remove}
            >
              {busy
                ? "Deleting…"
                : `Delete ${deletion.kind === "reports" ? "report" : "chat"}`}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
