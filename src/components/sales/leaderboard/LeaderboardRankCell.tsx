"use client";

import {
  formatRankMovementCompact,
  rankMovementCompactClass,
} from "@/lib/surgical-sales/leaderboardPresentation";

export function LeaderboardRankCell({ rank, delta }: { rank: number; delta: number | null | undefined }) {
  const move = formatRankMovementCompact(delta);

  return (
    <div className="lb-rank-table-rank-stack">
      <span className="lb-rank-table-rank-num">#{rank}</span>
      {move ? (
        <span className={rankMovementCompactClass(delta)} aria-label={`Rank change ${move}`}>
          {move}
        </span>
      ) : null}
    </div>
  );
}
