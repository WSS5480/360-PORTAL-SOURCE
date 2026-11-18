import { describe, expect, it } from "vitest";
import {
  buildProviderLongitudinalIntelligence,
  providerLongitudinalHasSignals,
} from "./buildProviderLongitudinalIntelligence";
import { collectObservationIntelligenceForDebriefPlan } from "./engagements/collectObservationIntelligenceForDebriefPlan";
import { buildProviderDebriefPlan } from "./engagements/buildProviderDebriefPlan";

describe("buildProviderLongitudinalIntelligence", () => {
  it("aggregates procedures, pain points, competitors, and fit trends across observations", () => {
    const summary = buildProviderLongitudinalIntelligence([
      {
        id: "case-1",
        case_type: "observation",
        procedure_type: "Robotic Hernia Repair",
        case_date: "2026-05-01",
        live_observation_clinical_pain_points: "Visualization issues observed",
        live_observation_product_fit: "Possible",
      },
      {
        id: "case-2",
        case_type: "observation",
        procedure_type: "Robotic Hernia Repair",
        case_date: "2026-05-29",
        live_observation_clinical_pain_points: "Visualization issues observed",
        live_observation_product_fit: "ACSIS fit identified",
        live_observation_competitors: "Competitor tray on field",
      },
    ]);

    expect(summary.observationCaseCount).toBe(2);
    expect(summary.observedProcedures[0]).toMatchObject({
      procedure: "Robotic Hernia Repair",
      count: 2,
    });
    expect(summary.recurringPainPoints[0]?.signal).toBe("Visualization issues observed");
    expect(summary.recurringPainPoints[0]?.count).toBe(2);
    expect(summary.competitiveProductsSeen.length).toBeGreaterThan(0);
    expect(summary.productFitTrends.length).toBeGreaterThan(0);
    expect(providerLongitudinalHasSignals(summary)).toBe(true);
  });
});

describe("longitudinal debrief planning", () => {
  const currentCase = {
    id: "case-2",
    case_type: "observation",
    procedure_type: "Robotic ventral hernia",
    case_date: "2026-05-28",
    live_observation_clinical_pain_points: "Hard to see the sac during takedown",
    live_observation_competitors: "Competitor tray on field",
    live_observation_product_fit: "Possible",
  };

  const priorCases = [
    {
      id: "case-1",
      case_type: "observation",
      procedure_type: "Robotic ventral hernia",
      case_date: "2026-04-10",
      live_observation_clinical_pain_points: "Visualization issues observed",
      live_observation_competitors: "Competitor tray on field",
    },
  ];

  it("merges prior observation intelligence into debrief learnings", () => {
    const bundle = collectObservationIntelligenceForDebriefPlan({
      caseRow: currentCase,
      priorObservationCases: priorCases,
    });

    expect(bundle.longitudinalIntelligence.observationCaseCount).toBe(2);
    expect(bundle.learnings.some((item) => item.source === "prior_observation")).toBe(true);

    const plan = buildProviderDebriefPlan({
      caseRow: currentCase,
      priorObservationCases: priorCases,
    });

    expect(plan.longitudinalIntelligence.recurringPainPoints.length).toBeGreaterThan(0);
    expect(plan.inputSummary.priorObservationCaseCount).toBe(1);
    expect(plan.whatWeLearned.some((item) => item.source === "prior_observation")).toBe(true);
  });
});
