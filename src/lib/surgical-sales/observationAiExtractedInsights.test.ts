import { describe, expect, it } from "vitest";
import {
  buildObservationAiExtractedInsightsView,
  hasObservationAiExtractedInsights,
  OBSERVATION_AI_EXTRACTED_SECTIONS,
} from "./observationAiExtractedInsights";

describe("observationAiExtractedInsights", () => {
  it("always returns all five extraction sections", () => {
    const view = buildObservationAiExtractedInsightsView({});
    expect(view.sections).toHaveLength(5);
    expect(view.sections.map((section) => section.id)).toEqual(
      OBSERVATION_AI_EXTRACTED_SECTIONS.map((section) => section.id),
    );
    expect(view.hasAnyContent).toBe(false);
    expect(view.sections.every((section) => !section.hasItems)).toBe(true);
  });

  it("maps legacy snapshot categories into the new section model", () => {
    const view = buildObservationAiExtractedInsightsView({
      observation_workflow_intelligence_snapshot: {
        procedure_workflow: ["Docking starts lateral"],
        friction_points: ["Tray delay at turnover"],
        product_usage: ["Asked about ACSIS navigation"],
        surgeon_preferences: "Prefers low-profile scope",
        follow_up_signals: ["Schedule SPD walkthrough"],
        extracted_at: "2026-05-29T12:00:00.000Z",
      },
    });

    expect(view.hasAnyContent).toBe(true);
    expect(hasObservationAiExtractedInsights({ observation_workflow_intelligence_snapshot: {} })).toBe(false);

    const byId = Object.fromEntries(view.sections.map((section) => [section.id, section.items]));
    expect(byId.workflow_findings).toEqual(expect.arrayContaining(["Docking starts lateral", "Tray delay at turnover"]));
    expect(byId.product_opportunities).toEqual(["Asked about ACSIS navigation"]);
    expect(byId.surgeon_preferences).toEqual(["Prefers low-profile scope"]);
    expect(byId.follow_up_recommendations?.[0]).toMatch(/schedule spd walkthrough/i);
    expect(byId.competitor_observations).toEqual([]);
    expect(view.extractedAt).toBe("2026-05-29T12:00:00.000Z");
  });

  it("parses canonical section ids from sections arrays", () => {
    const view = buildObservationAiExtractedInsightsView({
      observation_workflow_intelligence_snapshot: {
        sections: [
          { id: "workflow_findings", items: ["Circulator owns preference cards"] },
          { id: "competitor_observations", notes: "Competitor drill on field" },
        ],
      },
    });

    const byId = Object.fromEntries(view.sections.map((section) => [section.id, section.items]));
    expect(byId.workflow_findings).toEqual(["Circulator owns preference cards"]);
    expect(byId.competitor_observations).toEqual(["Competitor drill on field"]);
  });
});
