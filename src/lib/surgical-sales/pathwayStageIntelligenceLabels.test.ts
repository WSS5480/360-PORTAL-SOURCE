import { describe, expect, it } from "vitest";

import {
  engagementPathwayIntelligenceSectionLabel,
  pathwayStageIntelligenceSectionLabel,
  PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS,
} from "./pathwayStageIntelligenceLabels";

describe("pathwayStageIntelligenceLabels", () => {
  it("maps sales pathway stages to workflow intelligence section labels", () => {
    expect(pathwayStageIntelligenceSectionLabel("discovery")).toBe("Discovery Targets");
    expect(pathwayStageIntelligenceSectionLabel("observe")).toBe("Observation Objectives");
    expect(pathwayStageIntelligenceSectionLabel("debrief")).toBe("Debrief Validation");
    expect(pathwayStageIntelligenceSectionLabel("evaluation")).toBe("Evaluation Planning");
    expect(pathwayStageIntelligenceSectionLabel("commitment")).toBe("Evaluation Planning");
    expect(pathwayStageIntelligenceSectionLabel("outcomes")).toBe("Growth Opportunities");
  });

  it("maps early discovery engagements to discovery targets", () => {
    expect(engagementPathwayIntelligenceSectionLabel("intro_call")).toBe(
      PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS.discovery,
    );
    expect(engagementPathwayIntelligenceSectionLabel("observation_request")).toBe(
      PATHWAY_WORKFLOW_STAGE_INTELLIGENCE_LABELS.observation,
    );
  });
});
