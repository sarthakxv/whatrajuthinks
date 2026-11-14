import type { Metadata } from "next";
export const metadata: Metadata = { title: "Your privacy" };
export default function PrivacyPage() {
  return (
    <main className="narrow prose" id="main">
      <span className="eyebrow">What Raju Thinks</span>
      <h1>Your chat stays yours.</h1>
      <p>This page describes the actual local prototype.</p>
      <h2>What is stored</h2>
      <p>
        Your imported messages, participant names, report preferences and
        generated reports are stored in a SQLite database on this computer. The
        database is not encrypted by the app. There is no analytics, advertising
        tracker, or cloud account.
      </p>
      <h2>Where your messages go</h2>
      <p>
        Local analysis runs on this computer. If you explicitly select AI
        analysis, the uploaded chat, your notes and your question are sent to
        the AI provider configured in the server environment. Check that
        provider’s retention terms before using it.
      </p>
      <h2>How long it stays</h2>
      <p>
        Unreported source conversations expire after 48 hours. A generated
        report extends its source conversation’s retention to seven days from
        that report. Expired source text is purged on the next API request.
        Reports remain until you delete them.
      </p>
      <h2>You’re in control</h2>
      <p>
        Delete a source chat from Your reports → Your chats. Its saved reports
        stay available. Delete individual reports separately, or clear the
        entire workspace from Local data settings.
      </p>
      <h2>About this prototype</h2>
      <p>
        It runs on localhost and identifies your workspace with an HttpOnly
        cookie. It is intended for local use; production accounts, encryption
        and infrastructure need a separate deployment design.
      </p>
    </main>
  );
}
