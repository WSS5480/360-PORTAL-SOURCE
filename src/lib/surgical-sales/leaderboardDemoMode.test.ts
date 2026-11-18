import { describe, expect, it } from "vitest";
import {
  buildDemoRepProfileInput,
  buildLeaderboardDemoModeResponse,
  demoProfileToCounts,
  demoRepUserId,
  getDemoRepPersonality,
  LEADERBOARD_DEMO_REP_NAMES,
  LEADERBOARD_DEMO_REP_PERSONALITIES,
  LEADERBOARD_DEMO_TARGET_POINTS,
} from "@/lib/surgical-sales/leaderboardDemoMode";

function rowByName(data: ReturnType<typeof buildLeaderboardDemoModeResponse>, name: string) {
  return data.rows!.find((r) => r.name === name)!;
}

describe("leaderboardDemoMode", () => {
  it("defines 10 distinct rep personalities with believable profiles", () => {
    expect(LEADERBOARD_DEMO_REP_PERSONALITIES).toHaveLength(10);

    const sarah = getDemoRepPersonality(0);
    const mike = getDemoRepPersonality(1);
    const jessica = getDemoRepPersonality(2);
    const ryan = getDemoRepPersonality(3);
    const ashley = getDemoRepPersonality(4);

    expect(sarah.archetype).toBe("Evaluation Leader");
    expect(mike.archetype).toBe("Observation Specialist");
    expect(jessica.archetype).toBe("Relationship Builder");
    expect(ryan.archetype).toBe("Product Support Specialist");
    expect(ashley.archetype).toBe("Rising Rep");

    expect(mike.counts.evaluation_started).toBeLessThan(sarah.counts.evaluation_started!);
    expect(jessica.counts.debrief_completed! / jessica.counts.observation_completed!).toBeGreaterThan(0.85);
    expect(ryan.counts.product_support_case_completed).toBeGreaterThan(mike.counts.product_support_case_completed!);
    expect(ashley.trendPercent).toBeGreaterThan(sarah.trendPercent);
  });

  it("uses hand-tuned counts without homogenizing score shapes", () => {
    const totals = LEADERBOARD_DEMO_TARGET_POINTS;
    const uniqueTotals = new Set(totals);
    expect(uniqueTotals.size).toBe(10);
    expect(Math.max(...totals) - Math.min(...totals)).toBeGreaterThan(1500);
  });

  it("buildDemoRepProfileInput returns personality-driven counts", () => {
    const sarah = buildDemoRepProfileInput(1, 0);
    expect(sarah.name).toBe("Sarah Mitchell");
    expect(sarah.observations).toBe(25);
    expect(demoProfileToCounts(sarah).evaluation_started).toBe(5);
  });

  it("builds full demo payload using the real scoring engine", () => {
    const data = buildLeaderboardDemoModeResponse({ previewUserId: "user-brandon" });
    expect(data.demo_mode).toBe(true);
    expect(data.rows).toHaveLength(10);
    expect(data.boards?.length).toBe(1);

    const names = data.rows!.map((r) => r.name).sort();
    expect(names).toEqual([...LEADERBOARD_DEMO_REP_NAMES].sort());

    const points = data.rows!.map((r) => r.pathway_score.total_points).sort((a, b) => b - a);
    expect(points[0]).toBeGreaterThanOrEqual(3000);
    expect(points[9]).toBeLessThanOrEqual(1200);
  });

  it("maps preview user to Brandon Clark for personal scorecard", () => {
    const uid = "auth-user-123";
    expect(demoRepUserId("Brandon Clark", uid)).toBe(uid);
    const data = buildLeaderboardDemoModeResponse({ previewUserId: uid });
    expect(data.self_user_id).toBe(uid);
    const brandon = data.rows!.find((r) => r.user_id === uid);
    expect(brandon?.name).toBe("Brandon Clark");
  });

  it("assigns personality-driven trend labels on board entries", () => {
    const data = buildLeaderboardDemoModeResponse();
    const overall = data.boards!.find((b) => b.id === "field_commander")!;
    const sarah = overall.entries.find((e) => e.display_name === "Sarah Mitchell")!;
    const ashley = overall.entries.find((e) => e.display_name === "Ashley Parker")!;
    const nicole = overall.entries.find((e) => e.display_name === "Nicole Harris")!;

    expect(sarah.trend_label).toBe("▲ +12%");
    expect(ashley.trend_label).toBe("▲ +17%");
    expect(nicole.trend_label).toBe("▼ -8%");
  });

  it("preserves hand-tuned pathway totals", () => {
    const data = buildLeaderboardDemoModeResponse();
    const sorted = [...data.rows!].sort(
      (a, b) => b.pathway_score.total_points - a.pathway_score.total_points,
    );
    expect(sorted[0]!.name).toBe("Sarah Mitchell");
    expect(sorted[0]!.pathway_score.total_points).toBeGreaterThan(sorted[9]!.pathway_score.total_points);
  });

  it("reflects rep strengths in pathway badges", () => {
    const data = buildLeaderboardDemoModeResponse();

    const sarah = rowByName(data, "Sarah Mitchell");
    const mike = rowByName(data, "Mike Reynolds");
    const jessica = rowByName(data, "Jessica Carter");
    const ryan = rowByName(data, "Ryan Thompson");
    const ashley = rowByName(data, "Ashley Parker");
    const chris = rowByName(data, "Chris Morgan");

    expect(sarah.pathway_badges.some((b) => b.id === "field_investigator")).toBe(true);
    expect(sarah.pathway_badges.some((b) => b.id === "evaluation_leader")).toBe(true);

    expect(mike.pathway_badges.some((b) => b.id === "field_investigator")).toBe(true);
    expect(mike.pathway_score.stats.evaluations).toBeLessThan(sarah.pathway_score.stats.evaluations);

    expect(jessica.pathway_badges.some((b) => b.id === "debrief_driver")).toBe(true);

    expect(ryan.pathway_badges.some((b) => b.id === "case_commander")).toBe(true);

    expect(ashley.achievement_badges.some((b) => b.id === "rising_star")).toBe(true);

    expect(chris.pathway_badges.some((b) => b.id === "evaluation_leader")).toBe(true);
    expect(chris.pathway_score.stats.observations).toBeLessThan(sarah.pathway_score.stats.observations);

    const overall = data.boards!.find((b) => b.id === "field_commander")!;
    expect(overall.entries[0]!.display_name).toBe("Sarah Mitchell");
  });
});
