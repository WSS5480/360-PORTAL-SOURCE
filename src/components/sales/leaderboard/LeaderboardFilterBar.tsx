"use client";

import {
  LEADERBOARD_PERIOD_FILTERS,
  LEADERBOARD_TEAM_FILTERS,
} from "@/lib/surgical-sales/leaderboardPresentation";
import type { LeaderboardPeriodKey } from "@/lib/surgical-sales/leaderboardPeriod";
import type { LeaderboardTeamFilterType } from "@/lib/surgical-sales/leaderboardTeamFilters";

export function LeaderboardFilterBar({
  period,
  onPeriodChange,
  teamType,
  onTeamTypeChange,
  teamValue,
  onTeamValueChange,
  teamValueOptions,
  customStart,
  onCustomStartChange,
  customEnd,
  onCustomEndChange,
  periodMeta,
}: {
  period: LeaderboardPeriodKey;
  onPeriodChange: (period: LeaderboardPeriodKey) => void;
  teamType: LeaderboardTeamFilterType;
  onTeamTypeChange: (type: LeaderboardTeamFilterType) => void;
  teamValue: string;
  onTeamValueChange: (value: string) => void;
  teamValueOptions: string[];
  customStart: string;
  onCustomStartChange: (value: string) => void;
  customEnd: string;
  onCustomEndChange: (value: string) => void;
  periodMeta?: string | null;
}) {
  return (
    <div className="lb-filter-bar">
      <div className="lb-filter-bar-row" role="group" aria-label="Period">
        <div className="lb-filter-pills">
          {LEADERBOARD_PERIOD_FILTERS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`lb-pill lb-pill--compact${period === opt.id ? " is-active" : ""}`}
              onClick={() => onPeriodChange(opt.id)}
              aria-pressed={period === opt.id}
            >
              {opt.label}
            </button>
          ))}
          {period === "custom" ? (
            <div className="lb-custom-dates lb-custom-dates--inline">
              <input
                type="date"
                value={customStart}
                onChange={(e) => onCustomStartChange(e.target.value)}
                aria-label="Start date"
              />
              <span className="lb-custom-sep">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => onCustomEndChange(e.target.value)}
                aria-label="End date"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="lb-filter-bar-row" role="group" aria-label="Team">
        <div className="lb-filter-pills">
          {LEADERBOARD_TEAM_FILTERS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`lb-pill lb-pill--compact${teamType === opt.id ? " is-active" : ""}`}
              onClick={() => onTeamTypeChange(opt.id)}
              aria-pressed={teamType === opt.id}
            >
              {opt.label}
            </button>
          ))}
          {teamType !== "all" ? (
            <select
              className="lb-select lb-select--compact"
              value={teamValue}
              onChange={(e) => onTeamValueChange(e.target.value)}
              aria-label={`Select ${LEADERBOARD_TEAM_FILTERS.find((f) => f.id === teamType)?.label ?? teamType}`}
            >
              <option value="">Select…</option>
              {teamValueOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        {periodMeta ? <span className="lb-period-meta">{periodMeta}</span> : null}
      </div>
    </div>
  );
}
