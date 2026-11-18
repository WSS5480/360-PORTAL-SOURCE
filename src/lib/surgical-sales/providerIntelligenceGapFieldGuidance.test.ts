import { describe, expect, it } from "vitest";
import {
  buildIntelligenceLearningGaps,
  learningGapForField,
} from "./providerIntelligenceLearningGaps";
import {
  intelligenceGapBestLearnedFrom,
  intelligenceGapFieldGuidanceForKey,
} from "./providerIntelligenceGapDiscoverySource";
import {
  intelligenceGapFieldGuidance,
  INTELLIGENCE_GAP_FIELD_GUIDANCE,
} from "./providerIntelligenceGapFieldGuidance";
import { discoveryPriorityInteractionTiming } from "./providerDiscoveryExecutionQueue";

describe("providerIntelligenceGapFieldGuidance", () => {
  it("maps OR access and commercial influence to executable field guidance", () => {
    expect(intelligenceGapFieldGuidance("provider_observation_access_path")).toEqual({
      bestSource: "OR scheduler",
      bestInteraction: "Pre-case scheduling call",
      idealTiming: "Before scheduling observation",
    });
    expect(intelligenceGapFieldGuidance("influence_level")).toEqual({
      bestSource: "Office manager or supply chain",
      bestInteraction: "Post-case debrief",
      idealTiming: "After first supported case or evaluation touch",
    });
  });

  it("covers every intelligence gap field key", () => {
    const keys = Object.keys(INTELLIGENCE_GAP_FIELD_GUIDANCE);
    expect(keys.length).toBeGreaterThan(20);
    for (const dbKey of keys) {
      const g = intelligenceGapFieldGuidance(dbKey);
      expect(g.bestSource.length).toBeGreaterThan(2);
      expect(g.bestInteraction.length).toBeGreaterThan(2);
      expect(g.idealTiming.length).toBeGreaterThan(2);
    }
  });

  it("attaches field guidance to learning gaps", () => {
    const workflow = learningGapForField(
      "provider_workflow_pain_points",
      "clinical_workflow",
      {
        provider_workflow_pain_points:
          "Turnover is slow but I still need to understand which step causes the delay.",
      },
      undefined,
      { stageId: "debrief" },
    );
    expect(workflow?.fieldGuidance.bestSource).toBe("Scrub tech or circulating nurse");
    expect(workflow?.bestLearnedFrom).toBe(workflow?.fieldGuidance.bestSource);

    const gaps = buildIntelligenceLearningGaps(
      {
        provider_observation_coordinator_contact: "Emily — contact info not captured",
        provider_observation_feasibility: "yes",
      },
      undefined,
      24,
      { stageId: "discovery" },
    );
    expect(gaps.every((g) => g.fieldGuidance.bestInteraction.length > 4)).toBe(true);
  });

  it("aliases best learned from to best source", () => {
    expect(intelligenceGapBestLearnedFrom("provider_observation_access_path")).toBe("OR scheduler");
    expect(intelligenceGapFieldGuidanceForKey("provider_workflow_pain_points").bestInteraction).toMatch(
      /debrief/i,
    );
  });

  it("uses ideal timing in discovery queue with driver overrides", () => {
    expect(
      discoveryPriorityInteractionTiming("provider_observation_access_path", ["observation_readiness"], 0),
    ).toBe("Before scheduling observation");
    expect(
      discoveryPriorityInteractionTiming("provider_communication_style", ["revalidation"], 1),
    ).toMatch(/revalidate/i);
  });
});
