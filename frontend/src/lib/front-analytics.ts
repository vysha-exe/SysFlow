/**
 * Pure analytics over front intervals (clipped to a time window).
 */

export type AnalyticsIntervalInput = {
  id: string;
  headmateId: string | null;
  startedAt: string;
  endedAt: string | null;
};

export type FrontAnalyticsResult = {
  range: { fromMs: number; toMs: number; timeZone: string };
  totals: {
    /** Switches (new front starts) in this time range */
    segmentStartsInRange: number;
    /** Distinct clock seconds with ≥1 switch start (co-front may share a second) */
    uniqueStartSecondsInRange: number;
    rangeSpanMs: number;
    rangeSpanDays: number;
  };
  rates: {
    switchesPerDayAvg: number;
    switchesPerWeekAvg: number;
  };
  duration: {
    longest: {
      id: string;
      headmateId: string | null;
      name: string;
      durationMs: number;
      startedAt: string;
      endedAt: string | null;
    } | null;
    shortest: {
      id: string;
      headmateId: string | null;
      name: string;
      durationMs: number;
      startedAt: string;
      endedAt: string | null;
    } | null;
  };
  /** `day` is YYYY-MM-DD in `timeZone`; `label` is human-readable (e.g. Mar 3, 2025). */
  switchesPerDay: { day: string; label: string; count: number }[];
  /** Monday-start weeks in `timeZone`; `weekStart` is YYYY-MM-DD (Monday). */
  switchesPerWeek: { weekStart: string; label: string; count: number }[];
  switchesByHourLocal: { hour: number; count: number }[];
  alters: {
    headmateId: string | null;
    name: string;
    segmentCount: number;
    totalMs: number;
    avgMs: number;
    minMs: number;
    maxMs: number;
    shareOfPersonTimePct: number;
  }[];
};

function dayKeyInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function hourInZone(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date(iso));
  const h = parts.find((p) => p.type === "hour")?.value;
  return h !== undefined ? parseInt(h, 10) : 0;
}

/** Shift a Gregorian YYYY-MM-DD by whole days (numeric calendar parts). */
function shiftDayKey(dayKey: string, deltaDays: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Some instant that falls on this local calendar day in `timeZone`.
 * Linear scan (not binary search) so DST / calendar quirks can’t skip the day.
 */
function instantOnLocalCalendarDay(dayKey: string, timeZone: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  const anchor = Date.UTC(y, m - 1, d, 12, 0, 0);
  const stepMs = 30 * 60 * 1000; // 30 minutes
  const spanMs = 5 * 86400000; // ±5 days from anchor
  for (let t = anchor - spanMs; t <= anchor + spanMs; t += stepMs) {
    if (dayKeyInZone(new Date(t).toISOString(), timeZone) === dayKey) {
      return new Date(t);
    }
  }
  return new Date(anchor);
}

function weekdayShortEnUs(iso: string, timeZone: string): string {
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
    })
      .formatToParts(new Date(iso))
      .find((p) => p.type === "weekday")?.value ?? ""
  );
}

/** Monday-start week; stable key = YYYY-MM-DD of Monday in `timeZone`. */
function mondayWeekStartKeyInZone(iso: string, timeZone: string): string {
  let dk = dayKeyInZone(iso, timeZone);
  for (let i = 0; i < 7; i++) {
    const t = instantOnLocalCalendarDay(dk, timeZone);
    const wd = weekdayShortEnUs(t.toISOString(), timeZone);
    if (wd === "Mon") return dk;
    dk = shiftDayKey(dk, -1);
  }
  return dayKeyInZone(iso, timeZone);
}

/** e.g. "Mar 3 – Mar 9, 2025" (Monday–Sunday in `timeZone`). */
function formatWeekRangeLabel(mondayDayKey: string, timeZone: string): string {
  const monInstant = instantOnLocalCalendarDay(mondayDayKey, timeZone);
  const sunDayKey = shiftDayKey(mondayDayKey, 6);
  const sunInstant = instantOnLocalCalendarDay(sunDayKey, timeZone);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${fmt.format(monInstant)} – ${fmt.format(sunInstant)}`;
}

/** e.g. "Mar 3, 2025" in `timeZone` (same style as week rows). */
function formatDayLabel(dayKey: string, timeZone: string): string {
  const instant = instantOnLocalCalendarDay(dayKey, timeZone);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(instant);
}

function nameFor(
  headmateId: string | null,
  names: Map<string, string>,
): string {
  if (headmateId == null) return "Empty front";
  return names.get(headmateId) ?? "?";
}

export function computeFrontAnalytics(
  intervals: AnalyticsIntervalInput[],
  headmateNames: Map<string, string>,
  range: { fromMs: number; toMs: number },
  timeZone: string,
): FrontAnalyticsResult {
  const { fromMs, toMs } = range;
  const nowCap = Math.min(Date.now(), toMs);

  type Clipped = {
    id: string;
    headmateId: string | null;
    durationMs: number;
    startedAtMs: number;
    startedAtIso: string;
    endedAtIso: string | null;
  };

  const clipped: Clipped[] = [];

  for (const row of intervals) {
    const start = new Date(row.startedAt).getTime();
    const endOpen = row.endedAt ? new Date(row.endedAt).getTime() : nowCap;
    const s = Math.max(start, fromMs);
    const e = Math.min(endOpen, toMs);
    if (e <= s) continue;

    clipped.push({
      id: row.id,
      headmateId: row.headmateId,
      durationMs: e - s,
      startedAtMs: start,
      startedAtIso: row.startedAt,
      endedAtIso: row.endedAt,
    });
  }

  const switchStarts = intervals.filter((row) => {
    const t = new Date(row.startedAt).getTime();
    return t >= fromMs && t <= toMs;
  });

  const uniqueStartSeconds = new Set(
    switchStarts.map((r) => Math.floor(new Date(r.startedAt).getTime() / 1000)),
  );

  const switchesPerDayMap: Record<string, number> = {};
  for (const row of switchStarts) {
    const key = dayKeyInZone(row.startedAt, timeZone);
    switchesPerDayMap[key] = (switchesPerDayMap[key] ?? 0) + 1;
  }

  const switchesPerWeekMap: Record<string, number> = {};
  for (const row of switchStarts) {
    const wk = mondayWeekStartKeyInZone(row.startedAt, timeZone);
    switchesPerWeekMap[wk] = (switchesPerWeekMap[wk] ?? 0) + 1;
  }

  const hourCounts = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: 0,
  }));
  for (const row of switchStarts) {
    const h = hourInZone(row.startedAt, timeZone);
    hourCounts[h].count++;
  }

  const rangeSpanMs = Math.max(1, toMs - fromMs);
  const rangeSpanDays = rangeSpanMs / 86400000;
  const rangeSpanWeeks = Math.max(rangeSpanDays / 7, 1 / 7);

  const switchesPerDayAvg = switchStarts.length / Math.max(rangeSpanDays, 1 / 24);
  const switchesPerWeekAvg = switchStarts.length / rangeSpanWeeks;

  let longest: FrontAnalyticsResult["duration"]["longest"] = null;
  let shortest: FrontAnalyticsResult["duration"]["shortest"] = null;
  for (const c of clipped) {
    if (c.durationMs <= 0) continue;
    const name = nameFor(c.headmateId, headmateNames);
    if (!longest || c.durationMs > longest.durationMs) {
      longest = {
        id: c.id,
        headmateId: c.headmateId,
        name,
        durationMs: c.durationMs,
        startedAt: c.startedAtIso,
        endedAt: c.endedAtIso,
      };
    }
    if (!shortest || c.durationMs < shortest.durationMs) {
      shortest = {
        id: c.id,
        headmateId: c.headmateId,
        name,
        durationMs: c.durationMs,
        startedAt: c.startedAtIso,
        endedAt: c.endedAtIso,
      };
    }
  }

  const byAlter = new Map<
    string | null,
    { durations: number[]; totalMs: number }
  >();
  for (const c of clipped) {
    const key = c.headmateId;
    if (!byAlter.has(key)) {
      byAlter.set(key, { durations: [], totalMs: 0 });
    }
    const b = byAlter.get(key)!;
    b.durations.push(c.durationMs);
    b.totalMs += c.durationMs;
  }

  const sumPersonMs = [...byAlter.values()].reduce((a, b) => a + b.totalMs, 0);

  const alters: FrontAnalyticsResult["alters"] = [];
  for (const [headmateId, agg] of byAlter) {
    const avg =
      agg.durations.length > 0
        ? agg.totalMs / agg.durations.length
        : 0;
    const minMs =
      agg.durations.length > 0 ? Math.min(...agg.durations) : 0;
    const maxMs =
      agg.durations.length > 0 ? Math.max(...agg.durations) : 0;
    alters.push({
      headmateId,
      name: nameFor(headmateId, headmateNames),
      segmentCount: agg.durations.length,
      totalMs: agg.totalMs,
      avgMs: avg,
      minMs,
      maxMs,
      shareOfPersonTimePct:
        sumPersonMs > 0 ? (100 * agg.totalMs) / sumPersonMs : 0,
    });
  }
  alters.sort((a, b) => b.totalMs - a.totalMs);

  const switchesPerDay = Object.entries(switchesPerDayMap)
    .map(([day, count]) => ({
      day,
      label: formatDayLabel(day, timeZone),
      count,
    }))
    .sort((a, b) => b.day.localeCompare(a.day));

  const switchesPerWeek = Object.entries(switchesPerWeekMap)
    .map(([weekStart, count]) => ({
      weekStart,
      label: formatWeekRangeLabel(weekStart, timeZone),
      count,
    }))
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  return {
    range: { fromMs, toMs, timeZone },
    totals: {
      segmentStartsInRange: switchStarts.length,
      uniqueStartSecondsInRange: uniqueStartSeconds.size,
      rangeSpanMs,
      rangeSpanDays,
    },
    rates: {
      switchesPerDayAvg,
      switchesPerWeekAvg,
    },
    duration: {
      longest,
      shortest,
    },
    switchesPerDay,
    switchesPerWeek,
    switchesByHourLocal: hourCounts,
    alters,
  };
}
