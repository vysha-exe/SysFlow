"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function SignOutPanel() {
  const { data: session, status } = useSession();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut({ callbackUrl: "/login" });
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-muted" />
        <div className="mx-auto mt-4 h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="mx-auto mt-2 h-3 w-full max-w-xs animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <LogOutIcon className="h-7 w-7" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">You&apos;re not signed in</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              There&apos;s no active session to end. Sign in to use SysFlow.
            </p>
          </div>
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  const label = session?.user?.name?.trim() || session?.user?.email || "your account";

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="space-y-6">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:gap-5 sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 dark:bg-primary/15 dark:ring-primary/25">
              <LogOutIcon className="h-7 w-7" />
            </div>
            <div className="mt-4 min-w-0 flex-1 sm:mt-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Sign out?
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                You&apos;ll be signed out of SysFlow on this device. Unsaved changes in other tabs
                may still be lost—finish up anything important first.
              </p>
              <p className="mt-3 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-xs text-muted-foreground dark:bg-muted/30">
                <span className="font-medium text-foreground">Signed in as </span>
                <span className="break-all text-foreground">{label}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-w-[8rem]"
            >
              Stay signed in
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground shadow-sm transition hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 sm:min-w-[10rem]"
            >
              {busy ? (
                <>
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-destructive-foreground/30 border-t-destructive-foreground"
                    aria-hidden
                  />
                  Signing out…
                </>
              ) : (
                <>
                  <LogOutIcon className="h-4 w-4" />
                  Sign out
                </>
              )}
            </button>
          </div>
        </div>
    </div>
  );
}
