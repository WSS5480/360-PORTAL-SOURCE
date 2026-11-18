import { describe, expect, it } from "vitest";
import { INTELLIGENCE_GAP_STATE_LABELS } from "@/lib/surgical-sales/providerIntelligenceGapVocabulary";
import {
  INTELLIGENCE_GAP_OPERATIONAL_CONSEQUENCES,
  providerOperationalConsequenceForField,
  providerOperationalImpactForField,
} from "./providerOperationalImpact";

describe("providerOperationalImpact", () => {
  it("covers every intelligence gap field with three-part consequences", () => {
    for (const dbKey of Object.keys(INTELLIGENCE_GAP_STATE_LABELS)) {
      const consequence = INTELLIGENCE_GAP_OPERATIONAL_CONSEQUENCES[dbKey];
      expect(consequence, dbKey).toBeDefined();
      expect(consequence.operationalProblem.length).toBeGreaterThan(10);
      expect(consequence.businessRisk.length).toBeGreaterThan(10);
      expect(consequence.fieldInefficiency.length).toBeGreaterThan(10);
      expect(consequence.summary.length).toBeGreaterThan(0);
      expect(consequence.fieldInefficiency).toContain(
        consequence.summary.replace(/\u2026$/, "").trim().slice(0, 20),
      );
    }
  });

  it("returns direct field language for scheduling and commercial influence gaps", () => {
    const cadence = providerOperationalConsequenceForField("provider_observation_cadence_preference");
    expect(cadence.fieldInefficiency).toMatch(/posting window/i);

    const influence = providerOperationalConsequenceForField("influence_level");
    expect(influence.fieldInefficiency).toMatch(/buying influence|trial motion/i);

    const workflow = providerOperationalConsequenceForField("provider_workflow_pain_points");
    expect(workflow.fieldInefficiency).toMatch(/misread|Turnover/i);
  });

  it("returns default consequence for unmapped fields", () => {
    const fallback = providerOperationalConsequenceForField("unknown_field_key");
    expect(fallback.operationalProblem).toMatch(/wasted until this is confirmed/i);
    expect(providerOperationalImpactForField("unknown_field_key")).toBe(fallback.summary);
  });
});
