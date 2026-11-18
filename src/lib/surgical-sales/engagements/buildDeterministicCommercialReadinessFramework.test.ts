import { describe, expect, it } from "vitest";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { buildDebriefCommercialSynthesis } from "./buildDebriefCommercialSynthesis";
import {
  buildDeterministicCommercialReadinessFramework,
  buildGenericCommercialReadinessFramework,
} from "./buildDeterministicCommercialReadinessFramework";
import {
  COMMERCIAL_READINESS_DIMENSION_IDS,
  commercialReadinessScoreBand,
} from "./commercialReadinessFrameworkTypes";
import { getDebriefProductKnowledge } from "./debriefProductKnowledge";

const RICH_CASE = {
  id: "case-1",
  surgeon_contact_id: "provider-1",
  procedure_type: "Robotic ventral hernia",
  case_date: "2026-05-28",
  live_observation_clinical_pain_points: "Visualization before fixation creates uncertainty",
  live_observation_competitors: "Competitive mesh tray on field",
  live_observation_product_fit: "Possible",
};

describe("buildDeterministicCommercialReadinessFramework", () => {
  it("scores all six dimensions from observation synthesis", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: RICH_CASE,
      activities: [
        {
          id: "note-1",
          activity_type: "note",
          body: "Surgeon noted visualization before fixation affects decision-making.",
          created_at: "2026-05-28T13:30:00.000Z",
        },
      ],
      providerName: "Dr. Chen",
    });

    const observationNotes = [
      "Surgeon noted visualization before fixation affects decision-making.",
    ];
    const synthesis = buildDebriefCommercialSynthesis({
      plan,
      providerName: "Dr. Chen",
      organizationName: "Metro General",
      completedObservationCount: 4,
      pathwayStageLabel: "Debrief",
      observationNotes,
      productKnowledge: [getDebriefProductKnowledge("ACSIS")],
    });

    const framework = buildDeterministicCommercialReadinessFramework({
      synthesis,
      plan,
      observationNotes,
      completedObservationCount: 4,
    });

    expect(framework.dimensions).toHaveLength(6);
    expect(framework.dimensions.map((d) => d.id)).toEqual([
      ...COMMERCIAL_READINESS_DIMENSION_IDS,
    ]);

    const workflowPain = framework.dimensions.find((d) => d.id === "workflow_pain");
    expect(workflowPain?.score).toBeGreaterThan(30);
    expect(workflowPain?.confidence).toMatch(/High|Medium|Low/);
    expect(workflowPain?.reasoning.length).toBeGreaterThan(20);

    const productFit = framework.dimensions.find((d) => d.id === "product_fit");
    expect(productFit?.score).toBeGreaterThan(0);

    expect(framework.directorSummary).toMatch(/Dr\. Chen|surgeon/i);
    expect(framework.primaryCommercialLever).toBeTruthy();
    expect(framework.primaryRisk.length).toBeGreaterThan(10);
  });

  it("maps score bands correctly", () => {
    expect(commercialReadinessScoreBand(20)).toBe("weak");
    expect(commercialReadinessScoreBand(50)).toBe("developing");
    expect(commercialReadinessScoreBand(70)).toBe("strong");
    expect(commercialReadinessScoreBand(90)).toBe("ready");
  });
});

describe("buildGenericCommercialReadinessFramework", () => {
  it("returns low-score generic framework when no observations exist", () => {
    const framework = buildGenericCommercialReadinessFramework({
      providerName: "Dr. Lee",
      completedObservationCount: 0,
    });

    expect(framework.dimensions).toHaveLength(6);
    expect(framework.dimensions.every((d) => d.confidence === "Low")).toBe(true);
    expect(framework.primaryCommercialLever).toBe("workflow_pain");
  });
});
