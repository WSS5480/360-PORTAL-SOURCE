import { describe, expect, it } from "vitest";
import {
  buildProviderOverviewQualitativeReadiness,
  PROVIDER_OVERVIEW_OPERATIONAL_STATE_LABELS,
} from "./providerOverviewQualitativeReadiness";

describe("buildProviderOverviewQualitativeReadiness", () => {
  it("returns four qualitative dimensions without percentages", () => {
    const indicators = buildProviderOverviewQualitativeReadiness({
      contact: { provider_relationship_stage: "prospect", relationship_strength: "unknown" },
      relationshipStage: "prospect",
      commercialStage: "early_discovery",
      engagements: [],
    });

    expect(indicators).toHaveLength(4);
    for (const row of indicators) {
      expect(row.stateLabel).toBe(PROVIDER_OVERVIEW_OPERATIONAL_STATE_LABELS[row.state]);
      expect(row.stateLabel).not.toMatch(/%/);
      expect(row.label.length).toBeGreaterThan(5);
    }
  });

  it("elevates commercial influence to evaluation active in evaluation stage", () => {
    const indicators = buildProviderOverviewQualitativeReadiness({
      contact: {
        provider_evaluation_openness: "open_to_evaluation",
        provider_relationship_stage: "active_relationship",
      },
      relationshipStage: "active_relationship",
      commercialStage: "evaluation",
      opportunities: [{ stage: "evaluation_active" }],
    });

    const commercial = indicators.find((i) => i.id === "commercial_influence");
    expect(commercial?.state).toBe("evaluation_active");
    expect(commercial?.stateLabel).toBe("Evaluation active");
  });
});
