import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui";
export const metadata: Metadata = { title: "Meet Raju" };
export default function AboutPage() {
  return (
    <main className="narrow prose" id="main">
      <span className="eyebrow">What Raju Thinks</span>
      <h1>Meet Raju.</h1>
      <div className="author">
        <img src="/assets/raju.svg" alt="Raju" width={42} height={42} />
        <div>
          <strong>A fresh perspective. A few receipts.</strong>
          <p>Your unofficial chat commentator.</p>
        </div>
      </div>
      <p>
        Some chats are an archive of a friendship. Some are a thousand ways of
        avoiding one conversation. Sometimes, it helps to look at the whole
        thing from the outside.
      </p>
      <p>
        What Raju Thinks imports your WhatsApp history, shows what can actually
        be counted, and can turn it into a personal reading with your configured
        AI provider.
      </p>
      <h2>A clear reading</h2>
      <p>
        Local reports are factual summaries generated on your computer. AI
        reports are interpretations, written in the language and tone you
        choose. Every report tells you which one you’re reading.
      </p>
      <p>
        This independent project is inspired by the chat-report format. It is
        not affiliated with What Brandon Thinks or GumGum.
      </p>
      <Link href="/setup" className="btn btn-primary">
        Let Raju read your chat <Icon name="arrow" />
      </Link>
    </main>
  );
}
