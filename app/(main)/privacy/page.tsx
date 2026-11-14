import type { Metadata } from "next";
export const metadata: Metadata = { title: "Your privacy" };
export default function PrivacyPage() {
  return (
    <main className="narrow prose" id="main">
      <span className="eyebrow">What Raju Thinks</span>
      <h1>Your chat stays yours.</h1>
      <p>This page describes both the hosted app and the local prototype.</p>
      <h2>What is stored</h2>
      <p>
        Your imported messages, participant names, report preferences and
        generated reports are stored on the server hosting this app. The hosted
        version uses a private Cloudflare workspace identified by this browser’s
        cookie. The local version uses a SQLite file on the computer running
        the server, without application-level encryption. There is no analytics
        or advertising tracker.
      </p>
      <h2>Where your messages go</h2>
      <p>
        Factual analysis runs on the app’s server without an AI provider request. If you explicitly select AI
        analysis, the uploaded chat, your notes and your question are sent to
        the AI provider configured in the server environment. Check that
        provider’s retention terms before using it.
      </p>
      <h2>How long it stays</h2>
      <p>
        Unreported source conversations expire after 48 hours. A generated
        report extends its source conversation’s retention to seven days from
        that report. The hosted app schedules expiry cleanup; the local prototype purges expired text on the next API request.
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
        An HttpOnly cookie identifies your workspace. Hosted connections use
        HTTPS and a Secure cookie. There is no email sign-in or cross-device
        account recovery. Signing out removes this browser’s access; it does
        not delete saved data.
      </p>
    </main>
  );
}
