"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import { ErrorMessage, Icon, Modal } from "./ui";

export function Settings() {
  const [confirm, setConfirm] = useState<"signout" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await api("/api/account", { method: "POST" });
      sessionStorage.removeItem("raju-draft");
      window.location.assign("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign out.");
      setBusy(false);
    }
  }
  async function clear() {
    setBusy(true);
    setError("");
    try {
      await api("/api/account", { method: "DELETE" });
      sessionStorage.removeItem("raju-draft");
      window.location.assign("/account");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not delete this account.",
      );
      setBusy(false);
    }
  }
  return (
    <main className="account-settings" id="main">
      <div className="account-settings-bar">
        <Link href="/account" className="round-back" aria-label="Back">
          <Icon name="back" />
        </Link>
      </div>
      <div className="account-settings-body">
        <h1 className="text-balance">Account settings</h1>
        <p className="signed-in text-pretty">Signed in as this browser</p>
        <button
          className="account-signout"
          type="button"
          onClick={() => {
            setError("");
            setConfirm("signout");
          }}
        >
          Sign out
        </button>
        <section className="danger-panel" aria-labelledby="delete-account-title">
          <h2 id="delete-account-title">Delete my account and all my data</h2>
          <p className="text-pretty">
            If you delete your account, everything is gone for good:
          </p>
          <ul>
            <li>
              <Icon name="user" /> Your account
            </li>
            <li>
              <Icon name="bubble" /> All your conversations and the messages you
              uploaded
            </li>
            <li>
              <Icon name="doc" /> All your reports, including any you haven’t
              read yet
            </li>
          </ul>
          <p className="danger-final">This can’t be undone.</p>
          <button
            className="account-delete"
            type="button"
            onClick={() => {
              setError("");
              setConfirm("delete");
            }}
          >
            Delete account…
          </button>
        </section>
      </div>
      {confirm && (
        <Modal
          title={
            confirm === "signout"
              ? "Sign out of your account?"
              : "Delete your account?"
          }
          onClose={() => {
            if (!busy) setConfirm(null);
          }}
        >
          <p>
            {confirm === "signout"
              ? "This browser will open a new empty workspace. Chats already stored here stay on this computer, but this browser will not open them again."
              : "This permanently deletes every chat and report in this browser’s workspace. This cannot be undone."}
          </p>
          <ErrorMessage message={error} />
          <div className="modal-actions">
            <button
              className="btn"
              type="button"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              {confirm === "signout" ? "Stay signed in" : "Keep my data"}
            </button>
            <button
              className={confirm === "signout" ? "btn btn-dark" : "btn btn-danger"}
              type="button"
              disabled={busy}
              onClick={confirm === "signout" ? signOut : clear}
            >
              {busy
                ? confirm === "signout"
                  ? "Signing out…"
                  : "Deleting…"
                : confirm === "signout"
                  ? "Sign out"
                  : "Delete account"}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
