import {
  leaderboardPeriodBounds,
  leaderboardPriorPeriodBounds,
  type LeaderboardPeriodBounds,
} from "@/lib/surgical-sales/leaderboardPeriod";
import { utcYmd } from "@/lib/surgical-sales/repPerformanceMetrics";

export type AdminTeamDashboardPeriodKey = "month" | "30d" | "quarter";

export type AdminTeamDashboardPeriod = LeaderboardPeriodBounds & {
  key: AdminTeamDashboardPeriodKey;
};

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y || 2000, (m || 1) - 1, d || 1));
}

function daysBetween(startYmd: string, endYmd: string): number {
  const ms = parseYmd(endYmd).getTime() - parseYmd(startYmd).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export function resolveAdminTeamDashboardPeriodKey(raw: string | null | undefined): AdminTeamDashboardPeriodKey {
  const key = String(raw ?? "").trim().toLowerCase();
  if (key === "30d" || key === "last_30_days") return "30d";
  if (key === "quarter") return "quarter";
  return "month";
}

export function adminTeamDashboardPeriodBounds(
  now: Date,
  period: AdminTeamDashboardPeriodKey,
): AdminTeamDashboardPeriod {
  if (period === "30d") {
    const end = utcYmd(now);
    const start = utcYmd(new Date(now.getTime() - 29 * 86_400_000));
    return { start, end, label: "Last 30 days", key: period };
  }
  if (period === "quarter") {
    const bounds = leaderboardPeriodBounds(now, "quarter");
    return { ...bounds, key: period };
  }
  const bounds = leaderboardPeriodBounds(now, "month");
  return { ...bounds, key: period };
}

export function adminTeamDashboardPriorPeriodBounds(
  now: Date,
  period: AdminTeamDashboardPeriodKey,
  current: LeaderboardPeriodBounds,
): LeaderboardPeriodBounds {
  if (period === "30d") {
    const span = daysBetween(current.start, current.end);
    const priorEnd = new Date(parseYmd(current.start).getTime() - 86_400_000);
    const priorStart = new Date(priorEnd.getTime() - (span - 1) * 86_400_000);
    return {
      start: utcYmd(priorStart),
      end: utcYmd(priorEnd),
      label: "Prior 30 days",
    };
  }
  return leaderboardPriorPeriodBounds(now, period === "quarter" ? "quarter" : "month", current);
}

export function ymdInPeriod(ymd: string | null | undefined, start: string, end: string): boolean {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return false;
  const d = ymd.slice(0, 10);
  return d >= start && d <= end;
}
