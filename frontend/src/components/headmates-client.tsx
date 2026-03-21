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

export function HeadmatesClient() {
  const { status } = useSession();
  const [headmates, setHeadmates] = useState<HeadmateRow[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    setError("");
    const [hRes, aRes] = await Promise.all([
      fetch("/api/headmates", { credentials: "include" }),
      fetch("/api/front/active", { credentials: "include" }),
    ]);
    if (!hRes.ok) {
      const d = await hRes.json().catch(() => ({}));
      setError((d.error as string) || "Could not load headmates.");
      setLoading(false);
      return;
    }
    const hData = (await hRes.json()) as { headmates: HeadmateRow[] };
    const aData = (await aRes.json()) as {
      active: { headmateIds: string[] } | null;
    };
    setHeadmates(hData.headmates);
    setActiveIds(aData.active?.headmateIds ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    if (status === "loading") return;
    void load();
  }, [status, load]);

  async function mutate(
    action: "add" | "set" | "remove",
    headmateId: string,
  ) {
    setBusy(`${action}:${headmateId}`);
    setError("");
    try {
      const res = await fetch("/api/front", {
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

  if (status === "loading" || loading) {
    return (
      <p className="text-sm text-zinc-600" data-testid="headmates-loading">
        Loading headmates…
      </p>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Sign in to load your headmates and manage who is fronting.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Each change creates a <strong>new front session</strong> (logged in Front
        history), including when <strong>no one</strong> is fronting. If someone is
        already fronting, use <strong>Remove from front</strong> — add/set are hidden
        for current fronters so we don&apos;t duplicate the same state.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {headmates.map((headmate) => {
          const isFronting = activeIds.includes(headmate.id);
          const spin = (a: "add" | "set" | "remove") =>
            busy === `${a}:${headmate.id}`;

          return (
            <article
              key={headmate.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{headmate.name}</h2>
                  {isFronting && (
                    <span className="mt-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                      Fronting
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-zinc-600">{headmate.pronouns}</p>
              <p className="mt-2 text-sm text-zinc-700">{headmate.description}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-zinc-500">
                Privacy: {headmate.privacyLevel.replaceAll("_", " ")}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-600">
                {Object.entries(headmate.customFields ?? {}).map(([key, value]) => (
                  <div key={key}>
                    <dt className="font-medium">{key}</dt>
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
                      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      {spin("add") ? "…" : "Add to front"}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => mutate("set", headmate.id)}
                      className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
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
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
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
