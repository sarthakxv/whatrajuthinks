import Link from "next/link";
import { Icon, PrivacyButton } from "@/components/ui";

const chats = [
  ["friendsGroup", "😂 The friend group"],
  ["partner", "💌 Your relationship"],
  ["family", "🏠 The family group"],
  ["partner", "🫣 The situationship"],
  ["closeFriend", "🫶 Your best friend"],
  ["work", "☕ The work chat"],
  ["partner", "👀 Your crush"],
  ["other", "💬 The one you’re thinking of"],
];
export default function HomePage() {
  return (
    <main id="main">
      <section className="hero">
        <div className="avatar-stack" aria-hidden="true">
          <span style={{ background: "#edf2e4" }}>💬</span>
          <span style={{ background: "#f8e7d6" }}>🫶</span>
          <img
            className="mascot-badge"
            src="/assets/raju.svg"
            alt=""
            width={70}
            height={70}
          />
          <span style={{ background: "#e2f0df" }}>😂</span>
          <span style={{ background: "#ecedfc" }}>👀</span>
        </div>
        <h1>
          Upload a chat. <br />
          <em>Raju</em> tells you what’s <br />
          really going on.
        </h1>
        <p>
          The inside jokes. The mixed signals. The things nobody says out loud.
          Let’s look at your chat.
        </p>
        <Link href="/setup" className="btn btn-primary">
          Let Raju read it <Icon name="arrow" />
        </Link>
        <p className="micro">
          WhatsApp chats · No account needed · Yours to delete
        </p>
      </section>
      <div
        className="chat-scene"
        aria-label="An illustrative chat between two friends"
      >
        <div className="chat-bubble you">
          bro are we actually booking this trip<time>14:06 ✓✓</time>
        </div>
        <div className="chat-bubble">
          <span className="sender">Sam</span>I have a spreadsheet this time 😂
          <time>14:10</time>
        </div>
        <div className="chat-bubble you">
          you had a spreadsheet last time<time>14:11 ✓✓</time>
        </div>
        <div className="chat-bubble">
          <span className="sender">Sam</span>this one has colours
          <time>14:12</time>
        </div>
        <div className="chat-bubble you">
          we’re never leaving this group chat<time>14:13 ✓✓</time>
        </div>
      </div>
      <div className="verdict-sticker">
        <img src="/assets/raju.svg" alt="Raju" width={37} height={37} />
        <p>
          “A travel agency with no customers and a very active WhatsApp group.”
        </p>
        <span>ILLUSTRATIVE RAJU MOMENT · NOT A REAL REPORT</span>
      </div>
      <section className="section container">
        <span className="eyebrow">Everyone has a chat</span>
        <h2 style={{ marginTop: 14 }}>Which one came to mind?</h2>
        <div className="types">
          {chats.map(([id, label]) => (
            <Link
              className="type-pill"
              href={`/setup?context=${id}`}
              key={label}
            >
              {label}
            </Link>
          ))}
        </div>
        <p className="small muted">
          The whole history tells a different story.
        </p>
      </section>
      <section className="section how-section" id="how-it-works">
        <div className="container">
          <span className="eyebrow">A few taps. A fresh perspective.</span>
          <h2 style={{ marginTop: 14 }}>The chat does the talking.</h2>
          <div className="how-grid">
            {[
              [
                "Bring your WhatsApp chat.",
                "Export without media and drop the ZIP or text file here. We’ll walk you through it.",
              ],
              [
                "Tell Raju who’s who.",
                "Clean up the names, pick yourself, and add anything the messages don’t explain.",
              ],
              [
                "See it from the outside.",
                "Get the numbers, or choose an AI reading when a provider is connected.",
              ],
            ].map(([title, body], i) => (
              <article className="how-card" key={title}>
                <span className="step-num">{i + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="privacy-feature">
          <div>
            <span className="eyebrow">For your eyes</span>
            <h2>
              Your chat doesn’t need
              <br />
              an audience.
            </h2>
            <p>
              No messages sent to the other person. No public report links. Your
              private workspace, with a clear choice before anything goes to an AI
              provider.
            </p>
            <div style={{ marginTop: 20, fontSize: 12 }}>
              <PrivacyButton>Here’s how your data works</PrivacyButton>
            </div>
          </div>
          <div className="privacy-card">
            <div className="privacy-row">
              <Icon name="lock" /> No account or card required
            </div>
            <div className="privacy-row">
              <Icon name="shield" /> Factual analysis makes no AI request
            </div>
            <div className="privacy-row">
              <Icon name="doc" /> Delete your chats and reports any time
            </div>
          </div>
        </div>
      </section>
      <section className="section cta-section">
        <img src="/assets/raju.svg" alt="Raju" width={78} height={78} />
        <h2>Your chat is next.</h2>
        <Link className="btn btn-primary" href="/setup">
          Okay, let’s do this <Icon name="arrow" />
        </Link>
        <div className="whatsapp-strip" style={{ fontSize: 12, marginTop: 25 }}>
          <span
            className="platform-icon"
            style={{ width: 24, height: 24, borderRadius: 7 }}
          >
            <Icon name="whatsapp" />
          </span>
          Made for WhatsApp
        </div>
      </section>
    </main>
  );
}
