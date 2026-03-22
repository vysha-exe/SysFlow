"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FrontAnalyticsResult } from "@/lib/front-analytics";
import { formatDateTime, formatDurationFromMs } from "@/lib/time";

type RangePreset = "week" | "month" | "year" | "all";

function rangeBounds(
  preset: RangePreset,
): { fromMs: number; toMs: number; label: string } {
  const toMs = Date.now();
  switch (preset) {
    case "week":
      return {
        fromMs: toMs - 7 * 86400000,
        toMs,
        label: "Past 7 days",
      };
    case "month":
      return {
        fromMs: toMs - 30 * 86400000,
        toMs,
        label: "Past 30 days",
      };
    case "year":
      return {
        fromMs: toMs - 365 * 86400000,
        toMs,
        label: "Past 365 days",
      };
    case "all":
    default:
      return {
        fromMs: 0,
        toMs,
        label: "All time",
      };
  }
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

export function FrontAnalyticsPanel() {
  const [preset, setPreset] = useState<RangePreset>("month");
  const [analytics, setAnalytics] = useState<FrontAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const timeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { fromMs, toMs } = rangeBounds(preset);
    const params = new URLSearchParams({
      from: new Date(fromMs).toISOString(),
      to: new Date(toMs).toISOString(),
      timeZone,
    });
    try {
      const res = await fetch(`/api/front/analytics?${params}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data.error as string) || "Could not load analytics.");
      }
      setAnalytics(data.analytics as FrontAnalyticsResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load analytics.");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [preset, timeZone]);

  useEffect(() => {
    void load();
  }, [load]);

  const presetLabel = rangeBounds(preset).label;

  const maxHourCount = analytics
    ? Math.max(1, ...analytics.switchesByHourLocal.map((h) => h.count))
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Days, weeks &amp; hours use{" "}
            <span className="font-medium text-foreground">{timeZone}</span>. Weeks run Mon–Sun.
          </p>
        </div>
        <div
          className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
          role="tablist"
          aria-label="Analytics range"
        >
          {(
            [
              ["week", "Week"],
              ["month", "Month"],
              ["year", "Year"],
              ["all", "All time"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={preset === key}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                preset === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setPreset(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading analytics…</p>
      ) : !analytics ? (
        <p className="text-sm text-muted-foreground">No data.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {presetLabel}: {formatDateTime(new Date(analytics.range.fromMs).toISOString())} →{" "}
            {formatDateTime(new Date(analytics.range.toMs).toISOString())}
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Total switches"
              value={String(analytics.totals.segmentStartsInRange)}
              hint="One per switch; co-front same moment → often two."
            />
            <StatCard
              title="Unique start moments"
              value={String(analytics.totals.uniqueStartSecondsInRange)}
              hint="Clock seconds with ≥1 switch; same second = one moment."
            />
            <StatCard
              title="Switches / day (avg)"
              value={analytics.rates.switchesPerDayAvg.toFixed(1)}
              hint="Total ÷ days in range"
            />
            <StatCard
              title="Switches / week (avg)"
              value={analytics.rates.switchesPerWeekAvg.toFixed(1)}
              hint="If this period kept the same pace, about this many switches each full week."
            />
            <StatCard
              title="Longest switch"
              value={
                analytics.duration.longest
                  ? formatDurationFromMs(analytics.duration.longest.durationMs)
                  : "—"
              }
              sub={
                analytics.duration.longest
                  ? `${analytics.duration.longest.name} · ${formatDateTime(analytics.duration.longest.startedAt)}`
                  : undefined
              }
            />
            <StatCard
              title="Shortest switch"
              value={
                analytics.duration.shortest
                  ? formatDurationFromMs(analytics.duration.shortest.durationMs)
                  : "—"
              }
              sub={
                analytics.duration.shortest
                  ? `${analytics.duration.shortest.name} · ${formatDateTime(analytics.duration.shortest.startedAt)}`
                  : undefined
              }
            />
          </div>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">By headmate</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              <strong>Share</strong>: each person’s front time vs everyone’s total. Co-front
              double-counts clock time, so shares can exceed 100% together.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Headmate</th>
                    <th className="py-2 pr-3 font-medium">Switches</th>
                    <th className="py-2 pr-3 font-medium">Total front</th>
                    <th className="py-2 pr-3 font-medium">Avg length</th>
                    <th className="py-2 pr-3 font-medium">Shortest</th>
                    <th className="py-2 pr-3 font-medium">Longest</th>
                    <th className="py-2 pr-3 font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.alters.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-muted-foreground">
                        Nothing in this time range.
                      </td>
                    </tr>
                  ) : (
                    analytics.alters.map((row) => (
                      <tr
                        key={row.headmateId ?? "empty"}
                        className="border-b border-border/60"
                      >
                        <td className="py-2 pr-3 font-medium text-foreground">
                          {row.name}
                        </td>
                        <td className="py-2 pr-3 text-card-foreground">
                          {row.segmentCount}
                        </td>
                        <td className="py-2 pr-3 text-card-foreground">
                          {formatDurationFromMs(row.totalMs)}
                        </td>
                        <td className="py-2 pr-3 text-card-foreground">
                          {formatDurationFromMs(row.avgMs)}
                        </td>
                        <td className="py-2 pr-3 text-card-foreground">
                          {formatDurationFromMs(row.minMs)}
                        </td>
                        <td className="py-2 pr-3 text-card-foreground">
                          {formatDurationFromMs(row.maxMs)}
                        </td>
                        <td className="py-2 pr-3 text-card-foreground">
                          {pct(row.shareOfPersonTimePct)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">Switches by day</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Switch starts per calendar day.
              </p>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
                {analytics.switchesPerDay.length === 0 ? (
                  <li className="text-muted-foreground">None in this range.</li>
                ) : (
                  analytics.switchesPerDay.slice(0, 60).map((d) => (
                    <li
                      key={d.day}
                      className="flex justify-between gap-2 border-b border-border/40 py-1 text-card-foreground"
                    >
                      <span className="text-foreground">{d.label ?? d.day}</span>
                      <span className="shrink-0 font-medium tabular-nums">{d.count}</span>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">Switches by week</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Each row is one calendar week (Mon–Sun), same timezone as above.
              </p>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
                {analytics.switchesPerWeek.length === 0 ? (
                  <li className="text-muted-foreground">None in this range.</li>
                ) : (
                  analytics.switchesPerWeek.slice(0, 52).map((w) => (
                    <li
                      key={w.weekStart}
                      className="flex justify-between gap-2 border-b border-border/40 py-1 text-card-foreground"
                    >
                      <span className="text-foreground">{w.label}</span>
                      <span className="shrink-0 font-medium tabular-nums">{w.count}</span>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Switches by hour</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              When switch starts happen (local time); taller = more.
            </p>
            <div className="mt-4 flex h-32 items-end gap-1">
              {analytics.switchesByHourLocal.map(({ hour, count }) => (
                <div
                  key={hour}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1"
                  title={`${hour}:00 — ${count} switch${count === 1 ? "" : "es"}`}
                >
                  <div
                    className="w-full max-w-[20px] rounded-t bg-primary/70"
                    style={{
                      height: `${(count / maxHourCount) * 100}%`,
                      minHeight: count > 0 ? "4px" : "0",
                    }}
                  />
                  <span className="text-[9px] text-muted-foreground">{hour}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
  sub,
}: {
  title: string;
  value: string;
  hint?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
