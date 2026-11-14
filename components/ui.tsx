"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

export function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const paths: Record<string, ReactNode> = {
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    back: <path d="M20 12H4m6-6-6 6 6 6" />,
    shield: (
      <>
        <path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    upload: <path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />,
    doc: <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    trash: <path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" />,
    download: <path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4" />,
    copy: (
      <>
        <rect x="9" y="9" width="12" height="12" rx="2" />
        <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
      </>
    ),
    share: <path d="M12 15V3m-4 4 4-4 4 4M5 11v10h14V11" />,
    chart: <path d="M4 3v18h17M8 16v-5m5 5V6m5 10v-8" />,
    check: <path d="m5 12 4 4L20 5" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
      </>
    ),
    gear: (
      <>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.6 19.2c1.3-2.8 3.5-4.2 6.4-4.2s5.1 1.4 6.4 4.2" />
      </>
    ),
    bubble: <path d="M6.2 16.2 4 20.2l4.3-1.5a8 8 0 1 0-2.1-2.5Z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    whatsapp: (
      <>
        <path d="M12.04 2.2c-5.15 0-9.35 4.1-9.35 9.15 0 1.7.47 3.3 1.3 4.7L2.4 21.2l5.1-1.33a9.4 9.4 0 0 0 4.54 1.16c5.15 0 9.35-4.1 9.35-9.15 0-2.44-.97-4.74-2.74-6.46A9.2 9.2 0 0 0 12.04 2.2z" />
        <path
          fill="currentColor"
          stroke="none"
          d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
        />
      </>
    ),
  };
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.doc}
    </svg>
  );
}

export function BackButton({
  href,
  label = "Go back",
  onClick,
  disabled,
}: {
  href?: string;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return href ? (
    <Link href={href} className="round-back" aria-label={label}>
      <Icon name="back" />
    </Link>
  ) : (
    <button
      type="button"
      className="round-back"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon name="back" />
    </button>
  );
}

export function Button({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Brand() {
  return (
    <Link className="brand" href="/">
      <img src="/assets/raju.svg" alt="" width={42} height={42} />
      <span>
        whatraju<span className="brand-sub">thinks.</span>
      </span>
    </Link>
  );
}
export function Header() {
  return (
    <header className="header">
      <Link className="account-cta" href="/account">
        Open your account <span aria-hidden="true">→</span>
      </Link>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Brand />
            <p className="small muted" style={{ marginTop: 12 }}>
              A fresh perspective. A few receipts.
            </p>
          </div>
          <div className="footer-links">
            <div>
              <strong>The good stuff</strong>
              <Link href="/setup">Read a chat</Link>
              <Link href="/account">Your account</Link>
              <Link href="/about">Meet Raju</Link>
            </div>
            <div>
              <strong>A little help</strong>
              <Link href="/faq">Questions & answers</Link>
              <Link href="/privacy">Your privacy</Link>
              <Link href="/settings">Account settings</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} What Raju Thinks</span>
          <span>Independent prototype · WhatsApp edition</span>
        </div>
      </div>
    </footer>
  );
}

const appFooterLinks = [
  ["/", "Home"],
  ["/account", "Account"],
  ["/settings", "Account settings"],
  ["/faq", "Get help"],
] as const;

export function AppFooter() {
  const pathname = usePathname();
  return (
    <footer className="footer footer-app">
      <div className="footer-app-inner">
        <p className="footer-app-brand">
          <img src="/assets/raju.svg" alt="" width={28} height={28} />
          <span>© {new Date().getFullYear()} What Raju Thinks</span>
        </p>
        <nav aria-label="Footer">
          <ul className="footer-app-nav">
            {appFooterLinks.map(([href, label]) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={pathname === href ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}

export function RouteFooter() {
  const pathname = usePathname();
  if (pathname === "/") return <Footer />;
  return <AppFooter />;
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = "modal-title";
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} aria-labelledby={titleId} onClose={onClose}>
      <div className="modal-top">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function PrivacyButton({
  children = "Learn more",
}: {
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="text-link" type="button" onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <Modal title="Your chat, your business." onClose={() => setOpen(false)}>
          <p>
            Your export is processed by the server hosting this app.
            Local analysis makes no request to an AI provider.
          </p>
          <p>
            Choosing AI analysis sends the selected chat, notes and question to
            your configured provider. The report clearly labels which mode was
            used.
          </p>
          <p>
            Unreported chats expire after 48 hours. Generating a report keeps
            its source available for seven more days. Reports stay until you
            delete them.
          </p>
          <p>
            When hosted, data is stored in a private Cloudflare workspace.
            When run locally, it is stored in an unencrypted SQLite file. Delete chats and reports from your workspace
            whenever you like.
          </p>
        </Modal>
      )}
    </>
  );
}
export function ErrorMessage({ message }: { message?: string }) {
  return message ? (
    <div className="error" role="alert">
      {message}
    </div>
  ) : null;
}
export function LoadingView({
  ai = false,
  label,
}: {
  ai?: boolean;
  label?: string;
}) {
  return (
    <main className="loading narrow" id="main" aria-live="polite">
      <img src="/assets/raju.svg" alt="Raju" width={90} height={90} />
      <span className="eyebrow">A little perspective is on its way</span>
      <h1 style={{ marginTop: 15 }}>
        {label ?? (ai ? "Raju is reading your chat." : "Getting things ready.")}
      </h1>
      <p>
        {ai
          ? "Connecting the dots, finding the callbacks, keeping the receipts."
          : "Opening your workspace."}
      </p>
      <div className="progress">
        <span />
      </div>
      <small>
        {ai
          ? "This may take up to three minutes. Keep this tab open."
          : "Just a moment."}
      </small>
    </main>
  );
}
export function PageError({ message }: { message: string }) {
  return (
    <main className="narrow prose" id="main">
      <h1>Let’s take another look.</h1>
      <ErrorMessage message={message} />
      <BackButton href="/account" label="Back to your reports" />
    </main>
  );
}
