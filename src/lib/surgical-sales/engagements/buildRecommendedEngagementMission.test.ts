import { describe, expect, it } from "vitest";
import { buildRecommendedEngagementMission } from "./buildRecommendedEngagementMission";
import type { ProviderEngagementSummary } from "./providerEngagementSummary";

function engagement(
  partial: Partial<ProviderEngagementSummary> & Pick<ProviderEngagementSummary, "id" | "engagement_type">,
): ProviderEngagementSummary {
  return {
    status: "completed",
    engagement_type_label: partial.engagement_type ?? "Engagement",
    ...partial,
  } as ProviderEngagementSummary;
}

describe("buildRecommendedEngagementMission", () => {
  it("defaults to intro call without provider context", () => {
    const mission = buildRecommendedEngagementMission({});
    expect(mission.type).toBe("intro_call");
    expect(mission.name).toBe("Intro Call");
  });

  it("recommends observation debrief after a completed observation", () => {
    const mission = buildRecommendedEngagementMission({
      relationshipStage: "observation_scheduled",
      engagements: [
        engagement({
          id: "obs-1",
          engagement_type: "or_visit",
          status: "completed",
          updated_at: "2026-06-01T12:00:00Z",
        }),
      ],
    });
    expect(mission.type).toBe("provider_debrief");
  });

  it("recommends reactivation for dormant providers", () => {
    const mission = buildRecommendedEngagementMission({
      relationshipStage: "dormant",
    });
    expect(mission.type).toBe("reactivation");
  });

  it("recommends follow-up after intro is complete", () => {
    const mission = buildRecommendedEngagementMission({
      relationshipStage: "engagement_active",
      engagements: [
        engagement({
          id: "intro-1",
          engagement_type: "intro_call",
          status: "completed",
        }),
      ],
    });
    expect(mission.type).toBe("follow_up");
  });
});
