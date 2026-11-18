import {
  endOfIsoWeekFromMonday,
  endOfUtcMonth,
  startOfIsoWeekMondayUtc,
  startOfUtcMonth,
  utcYmd,
} from "@/lib/surgical-sales/repPerformanceMetrics";

export type LeaderboardPeriodKey = "week" | "month" | "quarter" | "custom";

export type LeaderboardPeriodBounds = {
  start: string;
  end: string;
  label: string;
};

function startOfUtcQuarter(d: Date): string {
  const q = Math.floor(d.getUTCMonth() / 3);
  return utcYmd(new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1)));
}

function endOfUtcQuarter(d: Date): string {
  const q = Math.floor(d.getUTCMonth() / 3);
  return utcYmd(new Date(Date.UTC(d.getUTCFullYear(), q * 3 + 3, 0)));
}

function quarterLabel(d: Date): string {
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q} ${d.getUTCFullYear()}`;
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y || 2000, (m || 1) - 1, d || 1));
}

function daysBetween(startYmd: string, endYmd: string): number {
  const ms = parseYmd(endYmd).getTime() - parseYmd(startYmd).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export function resolveLeaderboardPeriodKey(raw: string | null | undefined): LeaderboardPeriodKey {
  const key = String(raw ?? "").trim().toLowerCase();
  if (key === "week" || key === "month" || key === "quarter" || key === "custom") return key;
  if (key === "mtd" || key === "30d") return "month";
  return "month";
}

export function leaderboardPeriodBounds(
  now: Date,
  period: LeaderboardPeriodKey,
  custom?: { start?: string | null; end?: string | null },
): LeaderboardPeriodBounds {
  if (period === "week") {
    const start = startOfIsoWeekMondayUtc(now);
    const end = endOfIsoWeekFromMonday(start);
    return { start, end, label: "This week" };
  }
  if (period === "quarter") {
    return {
      start: startOfUtcQuarter(now),
      end: endOfUtcQuarter(now),
      label: quarterLabel(now),
    };
  }
  if (period === "custom") {
    const start = custom?.start?.slice(0, 10) || startOfUtcMonth(now);
    const end = custom?.end?.slice(0, 10) || utcYmd(now);
    const safeStart = start <= end ? start : end;
    const safeEnd = start <= end ? end : start;
    return { start: safeStart, end: safeEnd, label: `${safeStart} – ${safeEnd}` };
  }
  return {
    start: startOfUtcMonth(now),
    end: utcYmd(now),
    label: now.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

export function leaderboardPriorPeriodBounds(
  now: Date,
  period: LeaderboardPeriodKey,
  current: LeaderboardPeriodBounds,
): LeaderboardPeriodBounds {
  if (period === "week") {
    const monday = startOfIsoWeekMondayUtc(now);
    const [y, mo, da] = monday.split("-").map(Number);
    const priorMonday = new Date(Date.UTC(y || 2000, (mo || 1) - 1, (da || 1) - 7));
    const start = utcYmd(priorMonday);
    const end = endOfIsoWeekFromMonday(start);
    return { start, end, label: "Prior week" };
  }
  if (period === "quarter") {
    const [y, mo] = current.start.split("-").map(Number);
    const priorEnd = new Date(Date.UTC(y || 2000, (mo || 1) - 1, 0));
    const priorStartMonth = priorEnd.getUTCMonth() - 2;
    const start = utcYmd(new Date(Date.UTC(priorEnd.getUTCFullYear(), priorStartMonth, 1)));
    const end = utcYmd(priorEnd);
    return { start, end, label: "Prior quarter" };
  }
  if (period === "custom") {
    const span = daysBetween(current.start, current.end);
    const priorEnd = new Date(parseYmd(current.start).getTime() - 86_400_000);
    const priorStart = new Date(priorEnd.getTime() - (span - 1) * 86_400_000);
    return {
      start: utcYmd(priorStart),
      end: utcYmd(priorEnd),
      label: "Prior period",
    };
  }

  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const priorMonth = m === 0 ? 11 : m - 1;
  const priorYear = m === 0 ? y - 1 : y;
  const daysInPriorMonth = new Date(Date.UTC(priorYear, priorMonth + 1, 0)).getUTCDate();
  const priorDay = Math.min(d, daysInPriorMonth);
  const start = utcYmd(new Date(Date.UTC(priorYear, priorMonth, 1)));
  const end = utcYmd(new Date(Date.UTC(priorYear, priorMonth, priorDay)));
  const label = new Date(Date.UTC(priorYear, priorMonth, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return { start, end, label: `${label} (same period)` };
}
