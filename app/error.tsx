"use client";
import { Header } from "@/components/ui";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Header />
      <main className="narrow prose" id="main">
        <h1>This page hit a snag.</h1>
        <p>
          Try loading it again. Your saved reports stay in your local workspace.
        </p>
        <button className="btn btn-primary" onClick={reset}>
          Try again
        </button>
      </main>
    </>
  );
}
