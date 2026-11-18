import { describe, expect, it } from "vitest";
import {
  buildCommercialDeploymentReadinessSnapshot,
  buildDeploymentReadinessImprovementReasons,
  deploymentDiscoveryCta,
  normalizeReadinessReasonLine,
} from "./commercialDeploymentReadiness";
import { GUIDED_INTEL_CAPTURE } from "./providerGuidedIntelCapture";

describe("commercialDeploymentReadiness", () => {
  it("separates facility and provider deployment confidence tiers", () => {
    const sparse = buildCommercialDeploymentReadinessSnapshot({ contact: {} });
    expect(sparse.facility.tier).toBe("low");
    expect(sparse.provider.tier).toBe("low");
    expect(sparse.facility.tierLabel).toBe("Early");
    expect(sparse.provider.tierLabel).not.toMatch(/%/);

    const mapped = buildCommercialDeploymentReadinessSnapshot({
      contact: {
        provider_observation_feasibility: "easy",
        provider_observation_coordinator_contact: "Jane — office",
        provider_procedure_focus: "lap chole",
        provider_technique_preferences: "laparoscopic",
        provider_communication_style: "warm",
        provider_evaluation_openness: "open",
        provider_observation_access_path: "scheduler",
      },
    });
    expect(["building", "high"]).toContain(mapped.facility.tier);
    expect(["low", "building", "high"]).toContain(mapped.provider.tier);
  });

  it("drives discovery CTA from combined tier not field completion", () => {
    expect(deploymentDiscoveryCta("low", 8)).toBe(GUIDED_INTEL_CAPTURE.buildAccountIntel);
    expect(deploymentDiscoveryCta("high", 0)).toBe(GUIDED_INTEL_CAPTURE.refineVisibility);
  });

  it("builds operational why lines without percentages", () => {
    const before = buildCommercialDeploymentReadinessSnapshot({ contact: {} });
    const after = buildCommercialDeploymentReadinessSnapshot({
      contact: {
        provider_observation_feasibility: "easy",
        provider_observation_coordinator_contact: "scheduler contact",
        provider_workflow_pain_points: "turnover",
      },
    });
    const reasons = buildDeploymentReadinessImprovementReasons({
      before,
      after,
      answerDbKey: "provider_observation_coordinator_contact",
      answerValue: "scheduler contact",
      impactReasons: ["+ Scheduling owner clarified"],
    });
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.some((r) => /%/.test(r))).toBe(false);
    expect(reasons.some((r) => /scheduler/i.test(r))).toBe(true);
  });

  it("normalizes feedback into field-operational bullets", () => {
    expect(normalizeReadinessReasonLine("+ Workflow visibility improved")).toMatch(/workflow/i);
    expect(normalizeReadinessReasonLine("+ Evaluation readiness increased")).toMatch(/evaluation/i);
  });
});
