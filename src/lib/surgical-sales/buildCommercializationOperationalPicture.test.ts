import { describe, expect, it } from "vitest";
import { buildCommercializationOperationalPicture } from "./buildCommercializationOperationalPicture";
import { buildAccountUnderstandingConfirmCards } from "./buildAccountUnderstandingUncertaintyCards";
import { buildIntelligenceLearningGaps } from "./providerIntelligenceLearningGaps";
import type { ProviderPlanningCompletion } from "./providerPlanningCompletion";

const planning = {
  sections: [
    { id: "observation_readiness", label: "Observation", confidence: "partial" as const },
    { id: "clinical_workflow", label: "Workflow", confidence: "partial" as const },
    { id: "relationship_intelligence", label: "Relationship", confidence: "partial" as const },
    { id: "commercial_signals", label: "Commercial", confidence: "unknown" as const },
  ],
} as ProviderPlanningCompletion;

describe("buildCommercializationOperationalPicture", () => {
  it("returns seven commercialization synthesis rows with operational language", () => {
    const contact = {
      provider_observation_feasibility: "easy",
      provider_procedure_focus: "lap chole",
      provider_technique_preferences: "laparoscopic",
      provider_communication_style: "warm",
      provider_evaluation_openness: "cautious",
    };
    const gaps = buildIntelligenceLearningGaps(contact, planning, 24);
    const confirmCards = buildAccountUnderstandingConfirmCards({
      contact,
      gaps,
      knownSummaryForSection: () => null,
      planning,
    });
    const lines = buildCommercializationOperationalPicture({
      contact,
      planning,
      confirmCards,
      gaps,
    });

    expect(lines.map((l) => l.id)).toEqual([
      "how_operates",
      "commercial_blockers",
      "workflow_visibility",
      "evaluation_readiness",
      "relationship_maturity",
      "tactical_implications",
      "recommended_next",
    ]);
    expect(lines.every((l) => l.line.length > 12)).toBe(true);
    expect(lines.some((l) => /still learning/i.test(l.line))).toBe(false);
  });

  it("uses workflow + observation partial synthesis when access path is open", () => {
    const contact = {
      provider_observation_feasibility: "restricted",
      provider_procedure_focus: "general surgery",
      provider_workflow_pain_points: "turnover delays",
    };
    const gaps = buildIntelligenceLearningGaps(contact, planning, 24);
    const confirmCards = buildAccountUnderstandingConfirmCards({
      contact,
      gaps,
      knownSummaryForSection: () => null,
      planning,
    });
    const workflow = buildCommercializationOperationalPicture({
      contact,
      planning,
      confirmCards,
      gaps,
    }).find((l) => l.id === "workflow_visibility");

    expect(workflow?.line).toMatch(/turnover|friction|workflow|procedure/i);
  });

  it("surfaces relationship trust gap when engagement is warm but not validated", () => {
    const contact = {
      provider_communication_style: "warm",
      provider_responsiveness: "fast",
      provider_observation_feasibility: "easy",
    };
    const gaps = buildIntelligenceLearningGaps(contact, planning, 24);
    const confirmCards = buildAccountUnderstandingConfirmCards({
      contact,
      gaps,
      knownSummaryForSection: () => null,
      planning,
    });
    const relationship = buildCommercializationOperationalPicture({
      contact,
      planning,
      confirmCards,
      gaps,
    }).find((l) => l.id === "relationship_maturity");

    expect(relationship?.line).toMatch(/positive|trusted|restrictive|thin/i);
  });
});
