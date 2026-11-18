import { describe, expect, it } from "vitest";
import {
  buildMissionReadinessScore,
  deriveOperationalIntelligenceAreaStatus,
  fieldValueSuggestsOpaqueAccount,
  operationalReadinessScoreForStatus,
} from "./operationalIntelligenceReadiness";
import { learningGapForField } from "./providerIntelligenceLearningGaps";

describe("operationalIntelligenceReadiness", () => {
  it("scores readiness by status tier", () => {
    expect(operationalReadinessScoreForStatus("confirmed")).toBe(100);
    expect(operationalReadinessScoreForStatus("not_explored")).toBe(12);
  });

  it("marks empty OR section as not explored", () => {
    const derived = deriveOperationalIntelligenceAreaStatus({
      sectionId: "or_environment",
      contact: {},
      gap: null,
      sectionConfidence: "unknown",
    });
    expect(derived.status).toBe("not_explored");
    expect(derived.uncertaintyKind).toBeNull();
  });

  it("detects politically opaque signals in field text", () => {
    expect(fieldValueSuggestsOpaqueAccount("provider_current_vendors", "committee locked")).toBe(
      true,
    );
  });

  it("elevates opaque partial gaps to high risk", () => {
    const gap = learningGapForField("provider_observation_access_path", "observation_readiness", {
      provider_observation_access_path: "committee approval required for any new vendor",
    });
    const derived = deriveOperationalIntelligenceAreaStatus({
      sectionId: "observation_readiness",
      contact: { provider_observation_access_path: "committee approval required" },
      gap,
      sectionConfidence: "partial",
    });
    expect(derived.status).toBe("high_risk");
    expect(derived.uncertaintyKind).toBe("opaque");
  });

  it("aggregates mission readiness score across areas", () => {
    const score = buildMissionReadinessScore({
      rows: [{ readinessScore: 100 }, { readinessScore: 12 }],
    });
    expect(score).toBe(56);
  });
});
