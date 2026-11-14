"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { api, useApi, useSession, formatDate } from "@/lib/client";
import type { Conversation, Report } from "@/lib/types";
import {
  Icon,
  BackButton,
  PrivacyButton,
  ErrorMessage,
  LoadingView,
  PageError,
} from "./ui";

function sectionText(section: Report["sections"][number]) {
  const quotes = section.quotes ?? [];
  const used = new Set<number>();
  const body = section.body.replace(/\{\{(\d+)\}\}/g, (_, index) => {
    const quote = quotes[Number(index)];
    if (!quote) return "";
    used.add(Number(index));
    return `\n${quote.sender}: “${quote.text}”\n`;
  });
  const rest = quotes
    .filter((_, index) => !used.has(index))
    .map((quote) => `\n${quote.sender}: “${quote.text}”`)
    .join("\n");
  return `${section.title}\n\n${body}${rest}`;
}

function toText(r: Report) {
  return `${r.title}\nBy ${r.character} · ${r.mode === "ai" ? "AI report" : "Local analysis"}\n${formatDate(r.createdAt)}\n\n${r.sections.map(sectionText).join("\n\n")}\n\nWhat Raju Thinks · Private report`;
}

function QuoteBubble({
  quote,
  person,
}: {
  quote: { sender: string; text: string };
  person: string | null;
}) {
  return (
    <blockquote
      className={`quote${quote.sender === person ? " quote-self" : ""}`}
    >
      <small>{quote.sender}</small>
      {quote.text}
    </blockquote>
  );
}

function SectionBody({
  section,
  person,
}: {
  section: Report["sections"][number];
  person: string | null;
}) {
  const quotes = section.quotes ?? [];
  const used = new Set<number>();
  const nodes: ReactNode[] = [];
  section.body.split(/\{\{(\d+)\}\}/).forEach((chunk, index) => {
    if (index % 2 === 1) {
      const quoteIndex = Number(chunk);
      const quote = quotes[quoteIndex];
      if (!quote || used.has(quoteIndex)) return;
      used.add(quoteIndex);
      nodes.push(
        <QuoteBubble key={`q-${quoteIndex}`} quote={quote} person={person} />,
      );
      return;
    }
    const text = chunk.replace(/^\n+|\n+$/g, "");
    if (text.trim()) nodes.push(<p key={`p-${index}`}>{text}</p>);
  });
  quotes.forEach((quote, index) => {
    if (!used.has(index))
      nodes.push(
        <QuoteBubble key={`q-end-${index}`} quote={quote} person={person} />,
      );
  });
  return nodes;
}
export function ReportView({ id }: { id: string }) {
  const router = useRouter();
  const { data, error } = useApi<{ report: Report }>(`/api/reports/${id}`);
  const { session } = useSession();
  const [feedback, setFeedback] = useState("");
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<"local" | "ai">("local");
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  if (error) return <PageError message={error} />;
  if (!data) return <LoadingView label="Opening your report." />;
  const r = data.report;
  if (generating)
    return (
      <LoadingView
        ai={mode === "ai"}
        label={
          mode === "ai"
            ? "Raju is taking a closer look."
            : "Preparing your local follow-up."
        }
      />
    );
  async function followup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim() || !r.conversationId) return;
    setGenerating(true);
    setGenerationError("");
    try {
      const { conversation } = await api<{ conversation: Conversation }>(
        `/api/conversations/${r.conversationId}`,
      );
      const { report } = await api<{ report: Report }>("/api/reports", {
        method: "POST",
        body: {
          conversationId: r.conversationId,
          person:
            r.person || conversation.person || conversation.participants[0],
          language: r.language,
          tone: r.tone,
          question: question.trim(),
          mode,
          character: "Raju",
        },
      });
      setQuestion("");
      router.push(`/r/${report.id}`);
    } catch (e) {
      setGenerationError(
        e instanceof Error ? e.message : "Could not generate this report.",
      );
    } finally {
      setGenerating(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(toText(r));
      setFeedback("Report copied. Share it only with people you choose.");
    } catch {
      setFeedback("Couldn’t access the clipboard. Use Save text instead.");
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([toText(r)], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `raju-report-${r.id.slice(0, 8)}.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback("Your text download is ready.");
  }
  return (
    <main className="narrow" id="main">
      <div className="report-header">
        <BackButton href="/account" label="All your reports" />
        <h1 className="serif">{r.title}</h1>
        <div className="author">
          <img src="/assets/raju.svg" alt="Raju" width={42} height={42} />
          <div>
            <strong>{r.character}</strong>
            <p>
              {r.mode === "ai"
                ? "An outside perspective, with a soft spot for your inside jokes."
                : "A factual local reading, straight from your messages."}
            </p>
          </div>
        </div>
        <div className="report-tools">
          <button className="btn" onClick={copy}>
            <Icon name="copy" /> Copy report
          </button>
          <button className="btn" onClick={download}>
            <Icon name="download" /> Save text
          </button>
          <button className="btn" onClick={() => window.print()}>
            Print / PDF
          </button>
        </div>
        {feedback && (
          <p className="small muted" role="status">
            {feedback}
          </p>
        )}
        <div className="privacy-line" style={{ justifyContent: "flex-start" }}>
          <Icon name="shield" /> Private to this workspace <PrivacyButton />
        </div>
        <div className="tabs">
          <Link
            className="tab active"
            href={`/r/${id}`}
            aria-current="page"
          >
            The report
          </Link>
          <Link
            className="tab"
            href={`/r/${id}/stats`}
          >
            The stats
          </Link>
        </div>
      </div>
      <article className="report-content">
        {r.sections.map((section, i) => (
          <section className="report-section" key={`${i}-${section.title}`}>
            <h2>{section.title}</h2>
            <SectionBody section={section} person={r.person} />
          </section>
        ))}
      </article>
      <section className="followup">
          <span className="eyebrow">There’s always another question</span>
          <h2 style={{ marginTop: 12 }}>What’s on your mind?</h2>
          <p>
            {r.sourceAvailable === false
              ? "The source chat has been deleted or expired. Upload it again for another reading."
              : "Go deeper on this conversation. Each question creates a new saved report."}
          </p>
          {r.sourceAvailable === false ? (
            <Link href="/setup" className="btn btn-primary">
              Upload again
            </Link>
          ) : (
            <form onSubmit={followup}>
              <div className="suggestions">
                {[
                  [
                    "What are we missing?",
                    "What patterns in our friendship might we be missing?",
                  ],
                  [
                    "What changed?",
                    "How has this friendship changed over time?",
                  ],
                  [
                    "What could I do better?",
                    "What should I do to be a better friend?",
                  ],
                ].map(([label, value]) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => setQuestion(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="field">
                <label htmlFor="followup">Ask Raju</label>
                <textarea
                  id="followup"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={2000}
                  required
                  placeholder="The question you’ve been thinking about…"
                  style={{ minHeight: 100 }}
                />
              </div>
              <div className="field">
                <label htmlFor="followup-mode">Reading mode</label>
                <select
                  id="followup-mode"
                  value={mode}
                  onChange={(e) =>
                    setMode(e.target.value === "ai" ? "ai" : "local")
                  }
                >
                  <option value="local">
                    Local analysis — factual summary
                  </option>
                  <option value="ai" disabled={!session?.aiConfigured}>
                    AI report
                    {!session?.aiConfigured ? " — provider not connected" : ""}
                  </option>
                </select>
              </div>
              {mode === "ai" && (
                <p className="small muted">
                  AI mode sends the source chat and your question to your
                  configured provider.
                </p>
              )}
              <ErrorMessage message={generationError} />
              <button
                className="btn btn-primary wide"
                type="submit"
                disabled={!question.trim()}
              >
                Let’s go deeper <Icon name="arrow" />
              </button>
            </form>
          )}
      </section>
    </main>
  );
}
