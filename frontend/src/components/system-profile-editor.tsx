"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DESCRIPTION_MAX_CHARS } from "@/lib/display-limits";
import { formatSystemTitle } from "@/lib/system-display-name";
import {
  SYSTEM_DISPLAY_NAME_MAX_LEN,
  SYSTEM_USERNAME_MAX_LEN,
} from "@/lib/system-profile";

export type SystemProfileInitial = {
  id: string;
  name: string;
  username: string;
  description: string;
};

export function SystemProfileEditor({ initial }: { initial: SystemProfileInitial }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initial.name);
  const [username, setUsername] = useState(initial.username);
  const [description, setDescription] = useState(initial.description);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(initial.name);
    setUsername(initial.username);
    setDescription(initial.description);
  }, [initial.name, initial.username, initial.description]);

  useEffect(() => {
    if (!saved) return;
    const id = window.setTimeout(() => setSaved(false), 4000);
    return () => window.clearTimeout(id);
  }, [saved]);

  const unchanged =
    name === initial.name &&
    username === initial.username &&
    description === initial.description;

  function handleCancel() {
    setName(initial.name);
    setUsername(initial.username);
    setDescription(initial.description);
    setError("");
    setSaved(false);
    setEditing(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    setBusy(true);

    const response = await fetch("/api/system", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, description }),
    });

    let data: { error?: string; system?: SystemProfileInitial } = {};
    const text = await response.text();
    try {
      data = text ? (JSON.parse(text) as typeof data) : {};
    } catch {
      setError(`Server error (${response.status}). Try again.`);
      setBusy(false);
      return;
    }

    if (!response.ok) {
      setError(
        data.error ??
          (response.status === 409
            ? "That username is already taken by another system. Pick a different handle."
            : "Could not save profile."),
      );
      setBusy(false);
      return;
    }

    if (data.system) {
      setName(data.system.name);
      setUsername(data.system.username);
      setDescription(data.system.description);
    }
    setSaved(true);
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      {!editing ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                System
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {formatSystemTitle(name)}
              </h2>
              <p className="font-mono text-sm text-muted-foreground">@{username}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setError("");
                setSaved(false);
                setEditing(true);
              }}
              className="shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Edit profile
            </button>
          </div>

          <div className="border-t border-border pt-4">
            {description.trim() ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">
                {description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No description yet.</p>
            )}
          </div>

          {saved ? (
            <p className="text-sm text-success" role="status">
              Profile saved.
            </p>
          ) : null}
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Edit system profile</h2>
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:pointer-events-none"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="system-display-name" className="text-sm font-medium text-foreground">
              Display name
            </label>
            <input
              id="system-display-name"
              type="text"
              required
              maxLength={SYSTEM_DISPLAY_NAME_MAX_LEN}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="e.g. Starlight"
              value={name}
              onChange={(e) => {
                setSaved(false);
                setName(e.target.value);
              }}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Shown as <span className="font-medium text-foreground">{formatSystemTitle(name || "")}</span>{" "}
              on your dashboard and as your name in the top bar (same as signup).{" "}
              {name.length}/{SYSTEM_DISPLAY_NAME_MAX_LEN} characters
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="system-username" className="text-sm font-medium text-foreground">
              Username
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground" aria-hidden>
                @
              </span>
              <input
                id="system-username"
                type="text"
                required
                maxLength={SYSTEM_USERNAME_MAX_LEN}
                className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground"
                placeholder="starlight_system"
                value={username}
                onChange={(e) => {
                  setSaved(false);
                  setUsername(e.target.value.toLowerCase());
                }}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Must be unique across SysFlow (same rules as when your system was created: lowercase
              letters, numbers, underscores).
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="system-description" className="text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              id="system-description"
              rows={4}
              maxLength={DESCRIPTION_MAX_CHARS}
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="A short intro to your system…"
              value={description}
              onChange={(e) => {
                setSaved(false);
                setDescription(e.target.value);
              }}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/{DESCRIPTION_MAX_CHARS} characters
            </p>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={busy || unchanged}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            >
              Cancel
            </button>
            {unchanged && !busy ? (
              <span className="text-xs text-muted-foreground">No changes to save.</span>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}
