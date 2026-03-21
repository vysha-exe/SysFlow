"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type HeadmateRow = {
  id: string;
  name: string;
  pronouns: string;
  description: string;
  customFields: Record<string, string>;
  privacyLevel: string;
};

const FETCH_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(input: string, init?: RequestInit) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export function HeadmatesClient() {
  const { status } = useSession();
  const [headmates, setHeadmates] = useState<HeadmateRow[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  /** False after fetch when API returns 401 (real sign-in required). Bypass mode still returns 200 without a session. */
  const [canUseApp, setCanUseApp] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Do not wait for useSession() to finish — with AUTH_ENABLED=false the API works
    // without a session; otherwise we can get stuck on "Loading headmates…".
    setLoading(true);
    setError("");
    let hRes: Response;
    let aRes: Response;
    try {
      [hRes, aRes] = await Promise.all([
        fetchWithTimeout("/api/headmates", { credentials: "include" }),
        fetchWithTimeout("/api/front/active", { credentials: "include" }),
      ]);
    } catch (e) {
      const aborted = e instanceof Error && e.name === "AbortError";
      setError(
        aborted
          ? "Request timed out. Check that MongoDB is running and MONGODB_URI is set in frontend/.env.local, then restart the dev server."
          : "Could not reach the server.",
      );
      setCanUseApp(false);
      setLoading(false);
      return;
    }
    if (hRes.status === 401) {
      setHeadmates([]);
      setActiveIds([]);
      setCanUseApp(false);
      setLoading(false);
      return;
    }
    if (!hRes.ok) {
      const d = await hRes.json().catch(() => ({}));
      setError((d.error as string) || "Could not load headmates.");
      setCanUseApp(false);
      setLoading(false);
      return;
    }
    const hData = (await hRes.json()) as { headmates: HeadmateRow[] };
    let activeIdsNext: string[] = [];
    if (aRes.ok) {
      const aData = (await aRes.json()) as {
        active: { headmateIds: string[] } | null;
      };
      activeIdsNext = aData.active?.headmateIds ?? [];
    }
    setHeadmates(hData.headmates);
    setActiveIds(activeIdsNext);
    setCanUseApp(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [status, load]);

  async function mutate(
    action: "add" | "set" | "remove",
    headmateId: string,
  ) {
    setBusy(`${action}:${headmateId}`);
    setError("");
    try {
      const res = await fetchWithTimeout("/api/front", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, headmateId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data.error as string) || "Request failed");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="headmates-loading">
        Loading headmates…
      </p>
    );
  }

  if (!canUseApp) {
    return (
      <div className="rounded-xl border border-warning/40 bg-warning-bg p-4 text-sm text-warning-foreground">
        Sign in to load your headmates and manage who is fronting. (To skip sign-in locally, set{" "}
        <code className="rounded bg-background/80 px-1">AUTH_ENABLED=false</code> in{" "}
        <code className="rounded bg-background/80 px-1">.env.local</code> and restart the dev
        server.)
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Each change creates a <strong className="text-foreground">new front session</strong>{" "}
        (logged in Front history), including when{" "}
        <strong className="text-foreground">no one</strong> is fronting. If someone is
        already fronting, use <strong className="text-foreground">Remove from front</strong>{" "}
        — add/set are hidden for current fronters so we don&apos;t duplicate the same
        state.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {headmates.map((headmate) => {
          const isFronting = activeIds.includes(headmate.id);
          const spin = (a: "add" | "set" | "remove") =>
            busy === `${a}:${headmate.id}`;

          return (
            <article
              key={headmate.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{headmate.name}</h2>
                  {isFronting && (
                    <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                      Fronting
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{headmate.pronouns}</p>
              <p className="mt-2 text-sm text-card-foreground">{headmate.description}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                Privacy: {headmate.privacyLevel.replaceAll("_", " ")}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                {Object.entries(headmate.customFields ?? {}).map(([key, value]) => (
                  <div key={key}>
                    <dt className="font-medium text-foreground">{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                {!isFronting && (
                  <>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => mutate("add", headmate.id)}
                      className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      {spin("add") ? "…" : "Add to front"}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => mutate("set", headmate.id)}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {spin("set") ? "…" : "Set as front"}
                    </button>
                  </>
                )}
                {isFronting && (
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => mutate("remove", headmate.id)}
                    className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                  >
                    {spin("remove") ? "…" : "Remove from front"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
