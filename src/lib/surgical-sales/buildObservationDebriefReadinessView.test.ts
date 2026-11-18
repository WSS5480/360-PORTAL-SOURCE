import { describe, expect, it } from "vitest";
import { buildObservationDebriefReadinessView } from "./buildObservationDebriefReadinessView";

describe("buildObservationDebriefReadinessView", () => {
  it("returns empty-state guidance when no intelligence exists", () => {
    const view = buildObservationDebriefReadinessView({});

    expect(view.hasIntelligence).toBe(false);
    expect(view.signalCount).toBe(0);
    expect(view.painPoints).toEqual([]);
    expect(view.suggestedTopics.length).toBeGreaterThan(0);
    expect(view.readinessSummary).toMatch(/Capture observation notes/i);
  });

  it("maps intelligence into debrief readiness sections", () => {
    const view = buildObservationDebriefReadinessView({
      live_observation_clinical_pain_points: "Fixation inconsistency",
      live_observation_competitors: "Competitor drill on field",
      live_observation_product_fit: "ACSIS may improve visualization",
      live_observation_workflow: "Extra setup steps required",
      observation_key_questions: "What products are currently used?",
    });

    expect(view.painPoints).toEqual(["Fixation inconsistency"]);
    expect(view.competitiveProducts).toEqual(["Competitor drill on field"]);
    expect(view.potentialProductFits).toEqual(["ACSIS"]);
    expect(view.unansweredQuestions[0]).toMatch(/What products are currently used/i);
    expect(view.hasIntelligence).toBe(true);
    expect(view.signalCount).toBeGreaterThanOrEqual(3);
  });

  it("derives suggested debrief topics from pain points and product fits", () => {
    const view = buildObservationDebriefReadinessView({
      live_observation_clinical_pain_points: "Fixation inconsistency",
      live_observation_product_fit: "ACSIS may improve visualization",
    });

    const painTopic = view.suggestedTopics.find((topic) => topic.kind === "pain_point");
    expect(painTopic?.sourceValue).toBe("Fixation inconsistency");
    expect(painTopic?.topic).toMatch(/fixation challenges/i);

    const productTopic = view.suggestedTopics.find((topic) => topic.kind === "product_fit");
    expect(productTopic?.sourceValue).toBe("ACSIS");
    expect(productTopic?.topic).toMatch(/ACSIS fit/i);
  });

  it("builds conversation objectives from captured intelligence", () => {
    const view = buildObservationDebriefReadinessView({
      live_observation_clinical_pain_points: "Fixation inconsistency",
      live_observation_competitors: "Competitor tray on field",
      live_observation_product_fit: "ACSIS may improve visualization",
    });

    expect(view.suggestedObjectives.some((objective) => objective.includes("Fixation inconsistency"))).toBe(true);
    expect(view.suggestedObjectives.some((objective) => objective.includes("competitive product"))).toBe(true);
    expect(view.suggestedObjectives.some((objective) => objective.includes("ACSIS"))).toBe(true);
  });

  it("turns planned validation targets into unanswered questions", () => {
    const view = buildObservationDebriefReadinessView({
      observation_validation_targets: [
        {
          id: "watch-1",
          label: "Visualization challenges",
          source: "chip",
          status: "planned",
          created_at: "2026-05-01T00:00:00.000Z",
        },
      ],
    });

    expect(view.unansweredQuestions.some((question) => question.includes("visualization challenges"))).toBe(true);
  });
});
