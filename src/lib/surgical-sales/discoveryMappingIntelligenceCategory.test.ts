import { describe, expect, it } from "vitest";
import {
  discoveryMappingIntelligenceCategory,
  DISCOVERY_MAPPING_INTELLIGENCE_CATEGORY_ORDER,
} from "./discoveryMappingIntelligenceCategory";
import {
  OPPORTUNITY_INTELLIGENCE_SIGNALS,
  OPPORTUNITY_INTELLIGENCE_STAGE_MAPPING_QUESTIONS,
} from "./opportunityIntelligenceSignals";

describe("discoveryMappingIntelligenceCategory", () => {
  it("classifies access-pathway signals as operational", () => {
    expect(discoveryMappingIntelligenceCategory("scheduling_owner")).toBe("operational");
    expect(discoveryMappingIntelligenceCategory("observation_approval")).toBe("operational");
  });

  it("classifies commercial execution signals as sales", () => {
    expect(discoveryMappingIntelligenceCategory("workflow_visibility")).toBe("sales");
    expect(discoveryMappingIntelligenceCategory("clinical_champion")).toBe("sales");
  });

  it("classifies opportunity signals as opportunity intelligence", () => {
    for (const spec of OPPORTUNITY_INTELLIGENCE_SIGNALS) {
      expect(discoveryMappingIntelligenceCategory(spec.id)).toBe("opportunity");
    }
  });

  it("lists access intelligence before sales and opportunity by default", () => {
    expect(DISCOVERY_MAPPING_INTELLIGENCE_CATEGORY_ORDER[0]).toBe("operational");
    expect(DISCOVERY_MAPPING_INTELLIGENCE_CATEGORY_ORDER).toEqual([
      "operational",
      "sales",
      "opportunity",
    ]);
  });
});

describe("opportunityIntelligenceSignals", () => {
  it("defines all seven suggested opportunity questions", () => {
    expect(OPPORTUNITY_INTELLIGENCE_SIGNALS).toHaveLength(7);
    expect(OPPORTUNITY_INTELLIGENCE_STAGE_MAPPING_QUESTIONS.opportunity_clinical_frustrations).toBe(
      "What clinical frustrations were mentioned?",
    );
    expect(OPPORTUNITY_INTELLIGENCE_STAGE_MAPPING_QUESTIONS.opportunity_future_signals).toBe(
      "What future opportunities were hinted at?",
    );
  });
});
