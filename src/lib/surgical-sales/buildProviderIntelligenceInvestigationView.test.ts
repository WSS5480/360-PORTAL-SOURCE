import { describe, expect, it } from "vitest";
import { buildProviderIntelligenceInvestigationView } from "./buildProviderIntelligenceInvestigationView";
import { PROVIDER_INTELLIGENCE_INVESTIGATION } from "./providerIntelligenceInvestigationLabels";
import type { ProviderPlanningCompletion } from "./providerPlanningCompletion";

function basePlanning(): ProviderPlanningCompletion {
  return {
    filled: 0,
    total: 20,
    percent: 0,
    status: "not_started",
    sections_complete: 0,
    sections_total: 4,
    sections: [
      { id: "clinical_workflow", label: "Clinical workflow", status: "not_started", filled: 0, total: 3, percent: 0, last_updated_at: null },
      { id: "or_environment", label: "OR environment", status: "not_started", filled: 0, total: 1, percent: 0, last_updated_at: null },
      { id: "relationship_intelligence", label: "Relationship", status: "not_started", filled: 0, total: 8, percent: 0, last_updated_at: null },
      { id: "commercial_signals", label: "Commercial", status: "not_started", filled: 0, total: 5, percent: 0, last_updated_at: null },
    ],
  } as ProviderPlanningCompletion;
}

describe("buildProviderIntelligenceInvestigationView", () => {
  it("caps visible priorities and hides empty workflow tiles", () => {
    const view = buildProviderIntelligenceInvestigationView({
      contact: { provider_relationship_stage: "prospect" },
      planning: basePlanning(),
    });

    expect(view).not.toBeNull();
    expect(view!.operationalWarnings.length).toBeLessThanOrEqual(3);
    expect(view!.fieldDiscoveries.length).toBeLessThanOrEqual(3);
    expect(view!.workflowOnFile.length).toBeLessThanOrEqual(3);
    expect(view!.workflowMissingCount).toBeGreaterThan(0);
    expect(view!.deployLine.length).toBeGreaterThan(5);
    expect(PROVIDER_INTELLIGENCE_INVESTIGATION.watchFor).toBe("Likely risks");
    expect(view!.deployLine).not.toMatch(/protect field time/i);
    expect(view!.fieldDiscoveries[0]?.title.length).toBeGreaterThan(2);
  });
});
