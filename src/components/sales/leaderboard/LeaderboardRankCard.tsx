"use client";

import Link from "next/link";
import type { EarnedAchievementBadge } from "@/lib/surgical-sales/executionAchievementBadges";
import type { LeaderboardBoardEntry, LeaderboardBoardId } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import type { PathwayAchievementBadge } from "@/lib/surgical-sales/leaderboardPathwayBadges";
import { LeaderboardRepIdentity } from "@/components/sales/leaderboard/LeaderboardRepIdentity";
import { LeaderboardRankMovement, LeaderboardTrendLine } from "@/components/sales/leaderboard/LeaderboardVisuals";

export function LeaderboardRankCard({
  entry,
  boardId,
  boardTitle,
  selfUserId,
  pathwayBadges,
  onViewDetails,
}: {
  entry: LeaderboardBoardEntry;
  boardId: LeaderboardBoardId;
  boardTitle: string;
  selfUserId?: string | null;
  achievementBadges?: EarnedAchievementBadge[];
  pathwayBadges?: PathwayAchievementBadge[];
  onViewDetails: (entry: LeaderboardBoardEntry) => void;
}) {
  const isSelf = selfUserId === entry.user_id;
  const isTopThree = entry.rank <= 3;

  return (
    <article className={`lb-rank-card${isSelf ? " is-self" : ""}${isTopThree ? " is-top-three" : ""}`}>
      <div className="lb-rank-top">
        <div className="lb-rank-num-col">
          <div className="lb-rank-num">#{entry.rank}</div>
          <LeaderboardRankMovement delta={entry.rank_delta} />
        </div>
        <LeaderboardRepIdentity
          className="lb-rep-identity--card"
          name={entry.display_name}
          entry={entry}
          pathwayBadges={pathwayBadges ?? []}
          celebrate={entry.rank === 1}
          nameSuffix={isSelf ? " (you)" : undefined}
          align="start"
        />
        <div className="lb-rank-meta">
          <div className="lb-key-stat">{entry.key_stat}</div>
        </div>
        <div className="lb-rank-score-col">
          <div className="lb-rank-score">{entry.score.toFixed(1)}</div>
          <LeaderboardTrendLine entry={entry} />
          <button
            type="button"
            className="lb-view-details lb-view-details--inline"
            onClick={() => onViewDetails(entry)}
            aria-label={`View details for ${entry.display_name} on ${boardTitle}`}
          >
            View details
          </button>
        </div>
      </div>
    </article>
  );
}

export function LeaderboardEmptyState({
  teamFilterActive,
}: {
  teamFilterActive?: boolean;
}) {
  return (
    <section className="lb-empty" aria-labelledby="lb-empty-title">
      <div className="lb-empty-icon" aria-hidden>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="6" y="28" width="10" height="14" rx="2" fill="color-mix(in srgb, var(--brand-600) 25%, transparent)" />
          <rect x="19" y="18" width="10" height="24" rx="2" fill="color-mix(in srgb, #f59e0b 35%, transparent)" />
          <rect x="32" y="32" width="10" height="10" rx="2" fill="color-mix(in srgb, var(--brand-600) 18%, transparent)" />
          <path
            d="M8 12h32M12 8h24"
            stroke="color-mix(in srgb, var(--brand-600) 40%, var(--border))"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h2 id="lb-empty-title" className="lb-empty-title">
        {teamFilterActive ? "No scores in this team view yet" : "Your command center is ready"}
      </h2>
      <p className="lb-empty-copy">
        {teamFilterActive
          ? "Reps in this territory, region, or product line haven’t logged weighted execution yet. Broaden the filter or start capturing field intelligence."
          : "Rankings appear when your team completes field engagements, captures clinical intelligence, advances qualified opportunities, and closes case follow-through."}
      </p>
      <ul className="lb-empty-checklist">
        <li>Complete an intro call and schedule an observation</li>
        <li>Capture pain points and product signals during observation</li>
        <li>Create a qualified opportunity with field evidence</li>
      </ul>
      <div className="lb-empty-actions">
        <Link href="/portal/sales/cases" className="lb-empty-btn lb-empty-btn--primary">
          Start in Cases
        </Link>
        <Link href="/portal/sales/leaderboard?demo=1" className="lb-empty-btn">
          Preview demo rankings
        </Link>
      </div>
    </section>
  );
}

export function LeaderboardLoadingSkeleton() {
  return (
    <div className="lb-skeleton" aria-hidden>
      <div className="lb-skeleton-hero" />
      <div className="lb-skeleton-podium">
        <div />
        <div className="is-tall" />
        <div />
      </div>
      <div className="lb-skeleton-tabs" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="lb-skeleton-card" />
      ))}
    </div>
  );
}
