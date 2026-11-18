import { describe, expect, it } from "vitest";
import {
  buildIntelligenceLearningGaps,
  learningGapForField,
} from "./providerIntelligenceLearningGaps";
import { intelligenceGapBestLearnedFrom } from "./providerIntelligenceGapDiscoverySource";

describe("providerIntelligenceGapDiscoverySource", () => {
  it("maps user-facing gap themes to best sources", () => {
    expect(intelligenceGapBestLearnedFrom("provider_observation_access_path")).toBe("OR scheduler");
    expect(intelligenceGapBestLearnedFrom("provider_workflow_pain_points")).toBe(
      "Scrub tech or circulating nurse",
    );
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
    expect(workflow?.bestLearnedFrom).toBe("Scrub tech or circulating nurse");

    const gaps = buildIntelligenceLearningGaps(
      {
        provider_observation_coordinator_contact: "Emily — contact info not captured",
        provider_observation_feasibility: "yes",
      },
      undefined,
      24,
      { stageId: "discovery" },
    );
    expect(gaps.every((g) => g.fieldGuidance.bestSource.length > 4)).toBe(true);
  });
});
