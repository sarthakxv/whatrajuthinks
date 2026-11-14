import type { Metadata } from "next";
export const metadata: Metadata = { title: "Questions & answers" };
const faqs = [
  [
    "What does Raju do?",
    "Raju reads WhatsApp chat exports. Local mode gives you message counts, reply patterns and real quotes. With an AI provider configured, Raju writes a personal, contextual report about the people and patterns in your conversation.",
  ],
  [
    "Which chats work?",
    "A conversation with a friend, partner, family member or colleague, or a group chat. You need at least two people and five messages. Export directly from WhatsApp without media, and upload the .zip or .txt file.",
  ],
  [
    "Does it work with Hinglish?",
    "The importer preserves the original text, including Hindi, Hinglish, emoji and multiline messages. You can select Hinglish or Hindi for an AI report. Local summaries are currently in English.",
  ],
  [
    "How do I export my chat?",
    "On iPhone: open the chat, tap the name at the top, scroll to Export Chat, choose Without Media, then Save to Files. On Android: open the chat, tap the three dots, More, Export chat, Without media, and save the file.",
  ],
  [
    "Is this free?",
    "This local prototype has no payments. Local analysis works without an API key. AI analysis uses your own configured provider and may incur that provider’s usage charges.",
  ],
  [
    "Can I ask another question?",
    "Yes. Open a saved report and use the question box at the end. Your source chat must still be available. Each reading is saved as a separate report.",
  ],
  [
    "Does the other person find out?",
    "The app does not contact anyone in your chat. There are no public share links or email notifications in this prototype. Copying or downloading a report is your choice.",
  ],
  [
    "Why can’t I sign in from another device?",
    "This is a local prototype. A browser cookie identifies your workspace on this server. Email sign-in, cloud sync, payments and other messaging apps are outside the first build.",
  ],
  [
    "How accurate is a report?",
    "Counts describe the available export, not the whole relationship. Reply gaps cannot measure care. AI interpretations may be wrong, so treat them as a perspective and check the supporting messages.",
  ],
];
export default function FaqPage() {
  return (
    <main className="narrow prose" id="main">
      <span className="eyebrow">What Raju Thinks</span>
      <h1>A few good questions.</h1>
      <p>Before you hand over the group chat.</p>
      <div className="faq">
        {faqs.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
