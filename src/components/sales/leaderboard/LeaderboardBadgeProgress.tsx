"use client";

import type { ScorecardBadgeProgressItem } from "@/lib/surgical-sales/executionAchievementBadges";
import { scoreProgressPct } from "@/lib/surgical-sales/leaderboardPresentation";

export function LeaderboardBadgeProgress({ items }: { items: ScorecardBadgeProgressItem[] }) {
  return (
    <section className="lb-badge-progress" aria-labelledby="lb-badge-progress-title">
      <h3 id="lb-badge-progress-title" className="lb-scorecard-section-title">
        Badge progress
      </h3>
      <p className="lb-badge-progress-lead">V1 badges — milestones and period improvement</p>
      <ul className="lb-badge-progress-list">
        {items.map((item) => {
          const pct = scoreProgressPct(item.current, item.target);
          const complete = item.earned;

          return (
            <li key={item.id} className={`lb-badge-progress-row${complete ? " is-complete" : ""}`}>
              <div className="lb-badge-progress-head">
                <span className="lb-badge-progress-label">{item.label}</span>
                <span className="lb-badge-progress-count">
                  {complete
                    ? "Earned"
                    : item.id === "rising_star"
                      ? `+${item.current} / +${item.target} pts`
                      : `${item.current}/${item.target}`}
                </span>
              </div>
              <div className="lb-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="lb-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
