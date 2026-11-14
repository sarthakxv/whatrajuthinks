"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode,
  type CSSProperties,
} from "react";
import { BackButton, Icon, LoadingView, PrivacyButton } from "@/components/ui";
import { api } from "@/lib/client";
import type { Conversation, Report, Session, Stats } from "@/lib/types";

const paths = [
  "/setup",
  "/upload",
  "/chat-context",
  "/chat-names",
  "/chat-person",
  "/report-launch",
];
const contexts = [
  {
    id: "partner",
    emoji: "💌",
    title: "Romantic",
    description: "Partner, situationship, ex…",
  },
  {
    id: "friendsGroup",
    emoji: "😂",
    title: "Friends group",
    description: "The boys, trip chat, uni crew…",
  },
  {
    id: "closeFriend",
    emoji: "🫶",
    title: "Any friend",
    description: "Best friend, childhood friend, work bestie…",
  },
  {
    id: "family",
    emoji: "🏠",
    title: "Family",
    description: "Family group, mum or dad, siblings…",
  },
  {
    id: "work",
    emoji: "📋",
    title: "Work / team",
    description: "Team chat, colleagues, cofounder…",
  },
  {
    id: "other",
    emoji: "💬",
    title: "Other",
    description: "Roommates, neighbours, anything else…",
  },
];
const participantColors = ["#ff91e7", "#ffc800", "#82c8f5", "#a8d78b", "#c6a4f4", "#ffa583"];
function participantStyle(index: number): CSSProperties {
  return { "--participant-color": participantColors[index % participantColors.length] } as CSSProperties;
}

const maxUpload = 10 * 1024 * 1024;
const draftKey = "raju-draft";
let memoryDraft: Draft | null = null;

type Draft = {
  context: string;
  platform: string;
  language: string;
  tone: string;
  mode: "local" | "ai";
  conversation?: Conversation;
  stats?: Stats;
  person?: string;
  notes?: string;
  lastReportId?: string;
};

type ImportBody = { filename: string; text?: string; base64?: string };

function readDraft(): Draft {
  const defaults: Draft = {
    context: "",
    platform: "WhatsApp",
    language: "English",
    tone: "Balanced",
    mode: "local",
  };
  try {
    const raw = sessionStorage.getItem(draftKey);
    if (!raw) return memoryDraft || defaults;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object" || Array.isArray(saved))
      return memoryDraft || defaults;
    const conversation = saved.conversation;
    return {
      ...defaults,
      ...saved,
      context: typeof saved.context === "string" ? saved.context : "",
      language: typeof saved.language === "string" ? saved.language : "English",
      tone: "Balanced",
      mode: saved.mode === "ai" ? "ai" : "local",
      person: typeof saved.person === "string" ? saved.person : undefined,
      notes: "",
      conversation:
        conversation &&
        typeof conversation.id === "string" &&
        Array.isArray(conversation.participants) &&
        conversation.participants.every(
          (name: unknown) => typeof name === "string",
        ) &&
        typeof conversation.title === "string" &&
        typeof conversation.messageCount === "number"
          ? conversation
          : undefined,
    };
  } catch {
    return memoryDraft || defaults;
  }
}

function persistDraft(draft: Draft) {
  memoryDraft = draft;
  try {
    sessionStorage.setItem(draftKey, JSON.stringify(draft));
  } catch {
    // The in-memory flow remains usable when browser storage is unavailable.
  }
}

function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function ErrorNotice({ children }: { children: string }) {
  return children ? (
    <div className="error" role="alert">
      {children}
    </div>
  ) : null;
}

function ContinueButton({
  children = "Continue",
  busy = false,
  disabled = false,
}: {
  children?: ReactNode;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="wizard-actions">
      <button
        className="btn btn-primary"
        type="submit"
        disabled={disabled || busy}
      >
        {busy ? (
          "Saving…"
        ) : (
          <>
            {children} <Icon name="arrow" />
          </>
        )}
      </button>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="setup-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-top">
        <h2 id="setup-modal-title">{title}</h2>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function PeopleForm({ draft, busy, error, onSave }: {
  draft: Draft;
  busy: boolean;
  error: string;
  onSave: (aliases: Record<string, string>) => void;
}) {
  const conversation = draft.conversation!;
  const [names, setNames] = useState(() => [...conversation.participants]);
  const [index, setIndex] = useState(0);
  const [validationError, setValidationError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, [index]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanNames = names.map((name) => name.trim());
    if (!cleanNames[index]) return setValidationError("Give this person a first name.");
    if (index < names.length - 1) {
      setValidationError("");
      setIndex(index + 1);
      return;
    }
    if (new Set(cleanNames).size < 2)
      return setValidationError("Keep at least two different people in this chat.");
    setValidationError("");
    onSave(Object.fromEntries(conversation.participants.map((name, i) => [name, cleanNames[i]])));
  }

  return (
    <>
      <h1>Clean up the names</h1>
      <p className="lead">Replace nicknames and emojis with simple first names, so Raju knows who’s who.</p>
      <form onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy} className="names-fields">
          <div className="name-preview" style={participantStyle(index)}>
            <span className="setup-avatar" aria-hidden="true">{Array.from(names[index])[0]?.toUpperCase()}</span>
            <p className="small muted">From your export: {conversation.participants[index]}</p>
          </div>
          <div className="field">
            <label htmlFor="first-name">First name</label>
            <input ref={input} id="first-name" value={names[index]} maxLength={100} required
              onChange={(event) => setNames(names.map((name, i) => i === index ? event.target.value : name))} />
          </div>
          <ErrorNotice>{validationError || error}</ErrorNotice>
          <ContinueButton busy={busy}>Next ({index + 1}/{names.length})</ContinueButton>
          {index > 0 && <button type="button" className="btn btn-quiet" onClick={() => { setValidationError(""); setIndex(index - 1); }}>Previous person</button>}
        </fieldset>
      </form>
    </>
  );
}

export default function SetupWizard({ step }: { step: number }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [modal, setModal] = useState<"paste" | "tutorial" | null>(null);
  const [pasted, setPasted] = useState("");
  const busyRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const saved = readDraft();
    const requestedContext = new URL(window.location.href).searchParams.get(
      "context",
    );
    if (
      step === 1 &&
      requestedContext &&
      contexts.some((context) => context.id === requestedContext)
    ) {
      const nextDraft = { ...saved, context: requestedContext };
      persistDraft(nextDraft);
      setDraft(nextDraft);
      router.replace("/upload");
      return;
    }
    setDraft(saved);
    if (step > 1 && !saved.context) router.replace("/setup");
    else if (step > 2 && !saved.conversation) router.replace("/upload");
    else if (step === 6 && !saved.person) router.replace("/chat-context");
  }, [router, step]);

  useEffect(() => {
    if (step !== 6) return;
    let active = true;
    api<Session>("/api/session")
      .then((result) => {
        if (active) setSession(result);
      })
      .catch((reason) => {
        if (active) setError(message(reason));
      });
    return () => {
      active = false;
    };
  }, [step]);

  function save(patch: Partial<Draft>) {
    if (!draft) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    persistDraft(next);
    return next;
  }

  function next(nextStep: number, patch: Partial<Draft> = {}) {
    save(patch);
    setError("");
    router.push(paths[nextStep - 1]);
  }

  function selectFile(selected: File | undefined) {
    if (!selected || busyRef.current) return;
    if (selected.size > maxUpload)
      return setError(
        "This file is over 10 MB. Export the chat again and choose Without media.",
      );
    if (!/\.(zip|txt)$/i.test(selected.name))
      return setError(
        "Choose the .zip or .txt file from WhatsApp’s Export Chat option.",
      );
    setError("");
    setFile(selected);
  }

  async function importChat(source: "file" | "paste") {
    if (!draft || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      let body: ImportBody;
      if (source === "paste") {
        if (!pasted.trim())
          throw new Error("Paste some exported chat text first.");
        body = { filename: "Pasted WhatsApp chat.txt", text: pasted.trim() };
      } else {
        if (!file) throw new Error("Choose your WhatsApp export first.");
        if (file.size > maxUpload || !/\.(zip|txt)$/i.test(file.name))
          throw new Error("Choose a WhatsApp .zip or .txt export under 10 MB.");
        if (/\.zip$/i.test(file.name)) {
          const bytes = new Uint8Array(await file.arrayBuffer());
          let binary = "";
          for (let index = 0; index < bytes.length; index += 8192)
            binary += String.fromCharCode(
              ...bytes.subarray(index, index + 8192),
            );
          body = { filename: file.name, base64: btoa(binary) };
        } else body = { filename: file.name, text: await file.text() };
      }
      if (!mounted.current) return;
      const result = await api<{ conversation: Conversation; stats: Stats }>(
        "/api/import",
        {
          method: "POST",
          body: {
            ...body,
            context: draft.context || "closeFriend",
            platform: "WhatsApp",
          },
        },
      );
      if (!mounted.current) return;
      save({
        context: draft.context || "closeFriend",
        platform: "WhatsApp",
        conversation: result.conversation,
        stats: result.stats,
        person: undefined,
        mode: "local",
      });
      setModal(null);
      router.push("/chat-context");
    } catch (reason) {
      if (mounted.current) setError(message(reason));
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function savePeople(
    aliases?: Record<string, string>,
    person?: string,
  ) {
    if (!draft?.conversation || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ conversation: Conversation }>(
        `/api/conversations/${draft.conversation.id}`,
        { method: "PATCH", body: { aliases, person } },
      );
      next(person ? 6 : 5, {
        conversation: result.conversation,
        stats: result.conversation.stats,
        person,
      });
    } catch (reason) {
      setError(message(reason));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft?.conversation || busyRef.current) return;
    const form = new FormData(event.currentTarget);
    const mode = form.get("mode") === "ai" ? "ai" : "local";
    if (mode === "ai" && !session?.aiConfigured)
      return setError(
        "Your AI provider is not connected. Choose local analysis or configure the provider first.",
      );
    busyRef.current = true;
    setBusy(true);
    setGenerating(true);
    setError("");
    save({ mode });
    try {
      const { report } = await api<{ report: Report }>("/api/reports", {
        method: "POST",
        body: {
          conversationId: draft.conversation.id,
          person: draft.person,
          language: draft.language,
          tone: "Balanced",
          contextNotes: "",
          mode,
          character: "Raju",
        },
      });
      save({ mode, lastReportId: report.id });
      router.push(`/r/${report.id}`);
    } catch (reason) {
      setError(message(reason));
      setGenerating(false);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files.length > 1)
      return setError("Choose one WhatsApp conversation export at a time.");
    selectFile(event.dataTransfer.files[0]);
  }

  if (!draft)
    return (
      <main className="wizard narrow" id="main" aria-busy="true">
        <p className="muted">Opening your setup…</p>
      </main>
    );
  if (generating)
    return (
      <LoadingView
        ai={draft.mode === "ai"}
        label={draft.mode === "ai" ? undefined : "Looking through the numbers."}
      />
    );
  if (
    (step > 1 && !draft.context) ||
    (step > 2 && !draft.conversation) ||
    (step === 6 && !draft.person)
  )
    return null;
  const conversation = draft.conversation;

  return (
    <>
      <header className="wizard-header">
        <BackButton
          disabled={busy}
          onClick={() => router.push(step === 1 ? "/" : paths[step - 2])}
        />
        <div
          className="progress"
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={1}
          aria-valuemax={6}
          aria-valuenow={step}
        >
          <span style={{ width: `${(step / 6) * 100}%` }} />
        </div>
        <span className="step-count">{step} of 6</span>
      </header>
      <main className={`wizard narrow${step >= 3 && step <= 5 ? " participant-setup" : ""}`} id="main">
        {step === 1 && (
          <>
            <span className="eyebrow">First, a little context</span>
            <h1>Which chat are we reading?</h1>
            <p className="lead">
              Some conversations need an outside perspective.
            </p>
            <div className="choices">
              {contexts.map((context) => (
                <button
                  type="button"
                  className="choice"
                  key={context.id}
                  onClick={() => next(2, { context: context.id })}
                >
                  <span className="emoji" aria-hidden="true">
                    {context.emoji}
                  </span>
                  <span>
                    <strong>{context.title}</strong>
                    <small>{context.description}</small>
                  </span>
                  <span className="chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <span className="eyebrow">The good stuff</span>
            <h1>Upload your WhatsApp chat.</h1>
            <p className="lead">
              A .zip or .txt export. No screenshots needed.
            </p>
            {file ? (
              <div className="file-card">
                <span className="file-icon" aria-hidden="true">
                  📄
                </span>
                <div>
                  <div className="filename">{file.name}</div>
                  <span className="small muted">
                    {(file.size / 1024).toFixed(1)} KB · Ready to read
                  </span>
                </div>
                <button
                  className="icon-btn"
                  type="button"
                  disabled={busy}
                  aria-label="Remove selected file"
                  onClick={() => {
                    setFile(null);
                    setError("");
                  }}
                >
                  <Icon name="close" />
                </button>
              </div>
            ) : (
              <label
                className={`dropzone ${dragOver ? "dragover" : ""}`}
                htmlFor="chat-file"
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={drop}
              >
                <span className="upload-icon">
                  <Icon name="upload" />
                </span>
                <h3>Click to upload</h3>
                <span className="small muted">
                  or drag and drop your export here
                </span>
                <small>WhatsApp .zip / .txt · up to 10 MB</small>
                <input
                  className="sr-only"
                  id="chat-file"
                  aria-label="Choose WhatsApp chat export"
                  type="file"
                  accept=".zip,.txt,application/zip,text/plain"
                  disabled={busy}
                  onChange={(event) => selectFile(event.target.files?.[0])}
                />
              </label>
            )}
            <div className="privacy-line">
              <Icon name="shield" /> Your workspace is private to this browser{" "}
              <PrivacyButton />
            </div>
            {modal !== "paste" && <ErrorNotice>{error}</ErrorNotice>}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void importChat("file");
              }}
              aria-busy={busy}
            >
              <div className="wizard-actions">
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={!file || busy}
                >
                  {busy ? (
                    "Reading your export…"
                  ) : (
                    <>
                      Continue <Icon name="arrow" />
                    </>
                  )}
                </button>
              </div>
            </form>
            <div className="or-line">OR</div>
            <button
              type="button"
              className="btn wide"
              disabled={busy}
              onClick={() => {
                setError("");
                setModal("paste");
              }}
            >
              Paste a chat instead
            </button>
            <button
              className="btn btn-quiet wide"
              type="button"
              disabled={busy}
              onClick={() => setModal("tutorial")}
            >
              How do I export my chat?
            </button>
            {conversation && (
              <div className="notice">
                Your last accepted chat, <strong>{conversation.title}</strong>,
                is still saved.{" "}
                <button
                  type="button"
                  className="text-link"
                  disabled={busy}
                  onClick={() => next(3)}
                >
                  Continue with that chat
                </button>
              </div>
            )}
          </>
        )}
        {step === 3 && (
          <>
            <h1>Who does the talking</h1>
            <div className="talking-list">
              {(draft.stats || conversation!.stats)?.participants.map((person) => (
                <div className="talking-person" key={person.name} style={participantStyle(conversation!.participants.indexOf(person.name))}>
                  <div className="talking-label">
                    <span className="talking-name"><span className="participant-dot" />{person.name}</span>
                    <span className="talking-count">{person.messages.toLocaleString()} <Icon name="bubble" /> <span>{Math.round(person.percentage)}%</span></span>
                  </div>
                  <div className="talking-track" role="meter" aria-label={`${person.name}’s share of messages`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={person.percentage}>
                    <span style={{ width: `${person.messages / Math.max(...(draft.stats || conversation!.stats)!.participants.map((p) => p.messages)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={(event) => { event.preventDefault(); next(4); }}><ContinueButton /></form>
          </>
        )}
        {step === 4 && (
          <PeopleForm key={conversation!.id + conversation!.participants.join("|")} draft={draft} busy={busy} error={error} onSave={savePeople} />
        )}
        {step === 5 && (
          <>
            <h1>Which one is you?</h1>
            <div className="participant-choices" aria-busy={busy}>
              {conversation!.participants.map((name, index) => (
                <button type="button" className={`participant-choice${draft.person === name ? " selected" : ""}`} key={name}
                  style={participantStyle(index)} disabled={busy} onClick={() => void savePeople(undefined, name)}>
                  <span className="setup-avatar" aria-hidden="true">{Array.from(name)[0]?.toUpperCase()}</span>
                  <span>{name}</span>
                </button>
              ))}
            </div>
            <ErrorNotice>{error}</ErrorNotice>
          </>
        )}
        {step === 6 && (
          <>
            <span className="eyebrow">Ready when you are</span>
            <h1>Your chat. A new perspective.</h1>
            <p className="lead">One last look before Raju gets reading.</p>
            <div className="summary">
              {[
                ["Conversation", conversation!.title],
                ["The people", conversation!.participants.join(", ")],
                ["That’s you", draft.person],
                [
                  "Chat type",
                  contexts.find((context) => context.id === draft.context)
                    ?.title || draft.context,
                ],
                ["Messages", conversation!.messageCount.toLocaleString()],
                ["Language / tone", `${draft.language} / Balanced`],
              ].map(([label, value]) => (
                <div className="summary-row" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <form onSubmit={generate} aria-busy={busy}>
              <p className="small">
                <strong>Choose your reading</strong>
              </p>
              <div className="mode-options">
                <label className="mode-option">
                  <span>
                    <input
                      type="radio"
                      name="mode"
                      value="local"
                      checked={draft.mode !== "ai" || !session?.aiConfigured}
                      onChange={() => save({ mode: "local" })}
                    />{" "}
                    Local analysis
                  </span>
                  <small>
                    Real counts, reply gaps and quotes. No AI provider request.
                    Free.
                  </small>
                </label>
                <label className="mode-option">
                  <span>
                    <input
                      type="radio"
                      name="mode"
                      value="ai"
                      checked={
                        draft.mode === "ai" && Boolean(session?.aiConfigured)
                      }
                      disabled={!session?.aiConfigured}
                      onChange={() => save({ mode: "ai" })}
                    />{" "}
                    Raju’s AI report
                  </span>
                  <small>
                    {session?.aiConfigured
                      ? "A personal, contextual reading. Uses your configured AI provider."
                      : "Connect an AI provider in .env to enable the full reading."}
                  </small>
                </label>
              </div>
              {session?.aiConfigured ? (
                <p className="small muted">
                  Choosing AI sends this chat to the configured
                  provider. Provider usage charges may apply.
                </p>
              ) : (
                <div className="notice">
                  The local report works now. The long-form AI reading becomes
                  available when your provider is connected.{" "}
                  <Link href="/settings" className="text-link">
                    See setup details
                  </Link>
                </div>
              )}
              <ErrorNotice>{error}</ErrorNotice>
              <ContinueButton busy={busy}>Create my report</ContinueButton>
              <p className="wizard-footnote">
                No payment or email required for this local prototype.
              </p>
            </form>
          </>
        )}
      </main>
      {modal === "paste" && (
        <Modal
          title="Paste your WhatsApp chat"
          onClose={() => {
            if (!busy) setModal(null);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void importChat("paste");
            }}
            aria-busy={busy}
          >
            <div className="field">
              <label htmlFor="pasted-chat">Exported chat text</label>
              <textarea
                id="pasted-chat"
                value={pasted}
                onChange={(event) => setPasted(event.target.value)}
                required
                maxLength={1_000_000}
                disabled={busy}
                placeholder="[01/10/2026, 09:12:00] Alex: Hey, you free later?"
              />
              <small>
                Include the dates, sender names, and at least five messages from
                two people.
              </small>
            </div>
            <ErrorNotice>{error}</ErrorNotice>
            <button
              className="btn btn-primary wide"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                "Reading your chat…"
              ) : (
                <>
                  Read this chat <Icon name="arrow" />
                </>
              )}
            </button>
          </form>
        </Modal>
      )}
      {modal === "tutorial" && (
        <Modal
          title="How to export your WhatsApp chat"
          onClose={() => setModal(null)}
        >
          <p>
            <strong>On iPhone</strong>
          </p>
          <ol>
            <li>Open the chat and tap the name at the top.</li>
            <li>Scroll down to Export Chat, then choose Without Media.</li>
            <li>
              Save to Files and return here to upload the .zip or .txt file.
            </li>
          </ol>
          <p style={{ marginTop: 20 }}>
            <strong>On Android</strong>
          </p>
          <ol>
            <li>Open the chat and tap the three-dot menu.</li>
            <li>Choose More → Export chat → Without media.</li>
            <li>Save the export, then return here and choose the file.</li>
          </ol>
          <p style={{ marginTop: 20 }}>
            Group chats work the same way. Choose the exported file, rather than
            a screenshot or encrypted backup.
          </p>
        </Modal>
      )}
    </>
  );
}
