import { describe, expect, it } from "vitest";
import { buildProviderMissionMode } from "./buildProviderMissionMode";

describe("buildProviderMissionMode", () => {
  it("builds five mission sections for discovery prospect", () => {
    const mission = buildProviderMissionMode({
      contact: { provider_relationship_stage: "early_discovery" },
      providerId: "prov-1",
      intelligenceHref: "/providers/prov-1?tab=intelligence",
      newEngagementHref: "/engagements/new",
      activeTouch: null,
    });

    expect(mission.pathwayStageId).toBe("discovery");
    expect(mission.todaysObjective.length).toBeGreaterThan(5);
    expect(mission.questions.length).toBeGreaterThanOrEqual(1);
    expect(mission.questions.length).toBeLessThanOrEqual(5);
    expect(mission.avoid.length).toBeGreaterThan(0);
    expect(mission.mustLearn.length).toBeGreaterThan(0);
    expect(mission.quickActions.some((a) => a.kind === "dictation")).toBe(true);
    expect(JSON.stringify(mission)).not.toMatch(/blocker|pricing discussion|generic/i);
  });

  it("adapts objective for observe stage with observation touch", () => {
    const mission = buildProviderMissionMode({
      contact: { provider_relationship_stage: "observation_requested" },
      providerId: "prov-1",
      intelligenceHref: "/providers/prov-1?tab=intelligence",
      newEngagementHref: "/engagements/new",
      engagements: [
        {
          id: "e1",
          engagement_type: "or_observation",
          status: "scheduled",
          updated_at: "2026-05-01T12:00:00Z",
        },
      ],
      activeTouch: {
        kind: "engagement",
        touchLabel: "OR observation",
        engagementType: "or_observation",
        engagementId: "e1",
        engagementTitle: "First look",
        whenLabel: "Tomorrow",
        organizationName: "Metro General",
        isDraft: false,
        prepareHref: "/engagements/e1/prepare",
        createEngagementHref: "/engagements/new",
      },
    });

    expect(mission.pathwayStageId).toBe("observe");
    expect(mission.touchLabel).toBe("OR observation");
    expect(mission.avoid.length).toBeGreaterThan(0);
  });
});
