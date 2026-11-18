import { describe, expect, it } from "vitest";
import {
  buildEngagementIntelligenceReadiness,
  classifyIntelligenceGap,
  isEarlyDiscoveryEngagementType,
  isPreVisitCriticalDbKey,
} from "./engagementIntelligenceReadiness";
import type { IntelligenceLearningGap } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";

function gap(dbKey: string, sectionId: IntelligenceLearningGap["sectionId"]): IntelligenceLearningGap {
  return {
    dbKey,
    sectionId,
    phrase: "Unknown",
    fieldGuidance: {
      bestSource: "Ask in person",
      whoToAsk: "Coordinator",
      howToAsk: "Direct",
      whenToAsk: "Before visit",
    },
    bestLearnedFrom: "Ask in person",
    operationalConsequence: { summary: "", businessRisk: "", fieldInefficiency: "" },
    operationalImpact: "",
    unlocksNext: "",
    state: "unknown",
    priorityScore: 1,
  };
}

describe("engagementIntelligenceReadiness", () => {
  it("treats intro call gaps as discovery objectives only", () => {
    expect(isEarlyDiscoveryEngagementType("intro_call")).toBe(true);
    expect(isPreVisitCriticalDbKey("provider_observation_access_path", "intro_call")).toBe(false);
    expect(
      classifyIntelligenceGap(
        gap("provider_observation_access_path", "observation_readiness"),
        "intro_call",
      ),
    ).toBe("discovery_objective");
  });

  it("treats OR access as pre-visit blocker for observation request", () => {
    expect(
      classifyIntelligenceGap(
        gap("provider_observation_access_path", "observation_readiness"),
        "observation_request",
      ),
    ).toBe("pre_visit_blocker");
    expect(
      classifyIntelligenceGap(
        gap("provider_workflow_pain_points", "clinical_workflow"),
        "observation_request",
      ),
    ).toBe("discovery_objective");
  });

  it("splits blockers and objectives on sparse provider", () => {
    const view = buildEngagementIntelligenceReadiness({
      engagementType: "observation_request",
      provider: {
        id: "p1",
        relationship_stage: "prospect",
        provider_observation_access_path: "",
        provider_workflow_pain_points: "",
      },
      providerId: "p1",
    });
    expect(view.preVisitBlockers.some((b) => b.dbKey === "provider_observation_access_path")).toBe(
      true,
    );
    expect(view.discoveryObjectives.some((o) => o.dbKey === "provider_workflow_pain_points")).toBe(
      true,
    );
  });
});
