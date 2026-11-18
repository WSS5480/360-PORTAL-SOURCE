"use client";

import type { LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import { LeaderboardRepIdentity } from "@/components/sales/leaderboard/LeaderboardRepIdentity";
import type { LeaderboardPortalRepRow } from "@/lib/surgical-sales/leaderboardPortalTypes";
import { formatPathwayPoints } from "@/lib/surgical-sales/leaderboardTransparentScoring";
import { LeaderboardTrendLine } from "@/components/sales/leaderboard/LeaderboardVisuals";

function PodiumStand({ placement }: { placement: "first" | "second" | "third" }) {
  return <div className={`lb-podium-stand is-${placement}`} aria-hidden />;
}

export function LeaderboardPodium({
  entries,
  repById,
  onViewDetails,
}: {
  entries: LeaderboardBoardEntry[];
  repById: Map<string, LeaderboardPortalRepRow>;
  onViewDetails: (entry: LeaderboardBoardEntry) => void;
}) {
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  function PodiumSlot({
    entry,
    placement,
  }: {
    entry: LeaderboardBoardEntry | undefined;
    placement: "first" | "second" | "third";
  }) {
    if (!entry) return <div className="lb-podium-slot lb-podium-slot--empty" />;

    const repMeta = repById.get(entry.user_id);
    const isChampion = placement === "first";
    const totalPoints = repMeta?.pathway_score.total_points ?? 0;

    const avatarSize = placement === "first" ? "lg" : "md";

    return (
      <div className={`lb-podium-slot lb-podium-slot--${placement}${isChampion ? " lb-podium-slot--champion" : ""}`}>
        <button
          type="button"
          className={`lb-podium-card is-${placement}${isChampion ? " is-celebrating" : ""}`}
          onClick={() => onViewDetails(entry)}
          aria-label={`View details for ${entry.display_name}, rank ${entry.rank}`}
        >
          <div className="lb-podium-rank">#{entry.rank}</div>
          <LeaderboardRepIdentity
            className="lb-rep-identity--podium"
            name={entry.display_name}
            entry={entry}
            pathwayBadges={repMeta?.pathway_badges ?? []}
            avatarSize={avatarSize}
            celebrate={isChampion}
          />
          <div className="lb-podium-score">{formatPathwayPoints(totalPoints)}</div>
          <LeaderboardTrendLine entry={entry} />
        </button>
        <PodiumStand placement={placement} />
      </div>
    );
  }

  return (
    <section className="lb-podium-stage" aria-label="Top three reps">
      <div className="lb-podium-stage-glow" aria-hidden />
      <div className="lb-podium-grid">
        <PodiumSlot entry={second} placement="second" />
        <PodiumSlot entry={first} placement="first" />
        <PodiumSlot entry={third} placement="third" />
      </div>
    </section>
  );
}
