import { describe, expect, it } from "vitest";
import {
  formatRankMovement,
  formatRankMovementCompact,
  leaderboardStreakKind,
  pickPodiumPathwayBadges,
  rankMovementClass,
  showLeaderboardRowPrimaryPathway,
  showLeaderboardRowPrimaryStreak,
  streakLabel,
} from "@/lib/surgical-sales/leaderboardPresentation";

describe("leaderboardPresentation visuals", () => {
  it("detects streak tiers from score trend", () => {
    expect(leaderboardStreakKind({ trend: 9 } as never)).toBe("hot");
    expect(leaderboardStreakKind({ trend: 50 } as never)).toBe("surge");
    expect(leaderboardStreakKind({ trend: 3.5 } as never)).toBe("rising");
    expect(leaderboardStreakKind({ trend: 1 } as never)).toBeNull();
    expect(streakLabel("hot")).toBe("Hot streak");
  });

  it("limits podium pathway badges when a placement award is shown", () => {
    const badges = [
      { id: "field_investigator" },
      { id: "intel_hunter" },
      { id: "opportunity_builder" },
    ];
    expect(pickPodiumPathwayBadges("Gold Field Commander", badges as never, 2)).toHaveLength(1);
    expect(pickPodiumPathwayBadges(null, badges as never, 2)).toHaveLength(2);
  });

  it("prefers award and streak over pathway for row primary badge", () => {
    const entry = { badge_label: "Gold Field Commander", trend: 9 } as never;
    expect(showLeaderboardRowPrimaryStreak(entry)).toBe(false);
    expect(showLeaderboardRowPrimaryPathway(2, entry)).toBe(false);
  });

  it("formats rank movement copy and classes", () => {
    expect(formatRankMovement(2)).toBe("▲ 2 ranks");
    expect(formatRankMovement(1)).toBe("▲ 1 rank");
    expect(formatRankMovement(-1)).toBe("▼ 1 rank");
    expect(formatRankMovement(0)).toBeNull();
    expect(rankMovementClass(2)).toContain("up");
    expect(rankMovementClass(-1)).toContain("down");
  });

  it("formats compact rank movement for table cells", () => {
    expect(formatRankMovementCompact(2)).toBe("↑2");
    expect(formatRankMovementCompact(-1)).toBe("↓1");
    expect(formatRankMovementCompact(0)).toBeNull();
  });
});
