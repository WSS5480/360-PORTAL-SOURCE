import { describe, expect, it } from "vitest";
import { buildProviderOverviewCommandSummary } from "./buildProviderOverviewCommandSummary";

describe("buildProviderOverviewCommandSummary", () => {
  it("returns qualitative readiness indicators for early prospect", () => {
    const summary = buildProviderOverviewCommandSummary({
      contact: { provider_relationship_stage: "prospect", relationship_strength: "unknown" },
      relationshipStage: "prospect",
      commercialStage: "early_discovery",
      stageLabel: "Early discovery",
      recommendedNextStep: "Validate OR access pathway before scheduling observation.",
      tone: "brand",
    });

    expect(summary.maturityStage).toBe("Access mapping");
    expect(summary.commercialWorkflowLabel).toBe("Access mapping");
    expect(summary.stageProgression?.heading).toBe("Unlock Operationally qualified");
    expect(summary.stageProgression?.items.map((i) => i.scanLabel)).toContain("Confirm workflow fit");
    expect(summary.readinessIndicators).toHaveLength(4);
    expect(summary.readinessIndicators.map((i) => i.id)).toEqual([
      "observation_readiness",
      "commercial_influence",
      "workflow_understanding",
      "relationship_maturity",
    ]);
    for (const row of summary.readinessIndicators) {
      expect(row.stateLabel).not.toMatch(/%/);
    }
    expect(summary.recommendedNextStep).toContain("OR access");
    expect(summary.recommendedNextStepScan.length).toBeGreaterThan(10);
    expect(summary.recommendedNextStepScan.length).toBeLessThanOrEqual(90);
    expect(summary.briefing.fieldCommand.length).toBeGreaterThan(15);
    expect(summary.briefing.nextFieldAction).toContain("OR access");
    expect(summary.progressionConfidence).toHaveLength(3);
    expect(summary.progressionConfidence.map((r) => r.label)).toEqual([
      "Observation pathway readiness",
      "Evaluation deployment readiness",
      "Commercial expansion readiness",
    ]);
    expect(["emerging", "low"]).toContain(summary.progressionConfidence[0]!.confidence);
  });
});
