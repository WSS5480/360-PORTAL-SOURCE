import { describe, expect, it } from "vitest";

import { buildObservationRepPresentationView } from "./buildObservationRepPresentationView";
import { buildObservationCaseBriefingRepView } from "./observationCaseBriefingPresentation";
import {
  containsOntologyDisplayLabel,
  formatObservationFindingForRepDisplay,
  formatRepProductUseLine,
  isOntologyDisplayLabel,
  isOntologyProductLabel,
  resolveRepProductName,
  translateFindingLabelToRepLanguage,
} from "./observationIntelligenceDisplayLabels";
import { findingToIntelligenceSignal } from "./caseIntelligenceSignals";
import type { AggregatedFindingEvidence } from "./observationFindingEvidenceConfidence";

function mockFinding(
  overrides: Partial<AggregatedFindingEvidence> = {},
): AggregatedFindingEvidence {
  return {
    label: overrides.label ?? "Staff burden: Workflow",
    matchKey: overrides.matchKey ?? "staff_friction",
    normalizedFindingId: overrides.normalizedFindingId ?? "staff_friction",
    observationCount: 1,
    completedObservationCount: 0,
    capturedFromCurrentNote: true,
    isPositiveStaffSignal: false,
    isEarlySignal: true,
    confidence: "Low",
    evidenceLabel: "Captured in current case",
    sourceCaseIds: ["case-current"],
    ...overrides,
  };
}

describe("observationIntelligenceDisplayLabels", () => {
  it("detects ontology label leaks", () => {
    expect(isOntologyDisplayLabel("Staff burden: Workflow")).toBe(true);
    expect(isOntologyDisplayLabel("Uncertainty Stocked Products")).toBe(true);
    expect(isOntologyDisplayLabel("Staff workflow: Familiarity")).toBe(true);
    expect(isOntologyDisplayLabel("Provider concern: Clinical Frustration")).toBe(true);
    expect(isOntologyDisplayLabel("Staff appeared organized")).toBe(false);
  });

  it("maps ontology labels to natural rep-facing language for current case bullets", () => {
    expect(
      translateFindingLabelToRepLanguage("Staff burden: Workflow", {
        signalType: "staff_pain_point",
        mode: "current_case",
      }),
    ).toBe("Staff experienced workflow delays during the procedure");

    expect(
      translateFindingLabelToRepLanguage("Uncertainty Stocked Products", {
        signalType: "staff_pain_point",
        mode: "current_case",
      }),
    ).toBe("Staff needed to verify product availability before proceeding");

    expect(
      translateFindingLabelToRepLanguage("Staff workflow: Familiarity", {
        signalType: "staff_workflow_signal",
        mode: "current_case",
      }),
    ).toBe("Staff appeared familiar with workflow");

    expect(
      translateFindingLabelToRepLanguage("Provider concern: Clinical Frustration", {
        signalType: "provider_pain_point",
        mode: "current_case",
      }),
    ).toBe("Provider expressed frustration during the procedure");
  });

  it("maps findings through formatObservationFindingForRepDisplay", () => {
    expect(
      formatObservationFindingForRepDisplay(
        mockFinding({ label: "Staff burden: Workflow", normalizedFindingId: "staff_friction" }),
      ),
    ).toBe("Staff experienced workflow delays during the procedure");

    expect(
      translateFindingLabelToRepLanguage("Visualization Delay", {
        signalType: "workflow_signal",
        normalizedFindingId: "workflow_visualization_before_fixation",
        mode: "current_case",
      }),
    ).toBe("Extra time was spent improving visualization before fixation");
  });

  it("resolves real product names and rejects ontology product labels", () => {
    expect(isOntologyProductLabel("Product Used Surgery")).toBe(true);
    expect(isOntologyProductLabel("Apple Product Used Surgery")).toBe(true);
    expect(isOntologyProductLabel("Bard Mesh")).toBe(false);

    const bardFinding = mockFinding({
      label: "Bard Mesh observed",
      normalizedFindingId: "product_in_use:bard mesh",
      matchKey: "product_in_use:bard mesh",
    });
    const bardSignal = findingToIntelligenceSignal(bardFinding, { procedureContext: null });

    expect(resolveRepProductName(bardFinding, bardSignal)).toBe("Bard Mesh");
    expect(formatObservationFindingForRepDisplay(bardFinding)).toBe(
      "Bard Mesh was used during the procedure",
    );

    const junkFinding = mockFinding({
      label: "Product used surgery observed",
      normalizedFindingId: "product_in_use:product_used_surgery",
      matchKey: "product_in_use:product_used_surgery",
    });
    const junkSignal = findingToIntelligenceSignal(junkFinding, { procedureContext: null });

    expect(resolveRepProductName(junkFinding, junkSignal)).toBeNull();
    expect(formatObservationFindingForRepDisplay(junkFinding)).toBe("");

    const appleJunkFinding = mockFinding({
      label: "Apple product used surgery observed",
      normalizedFindingId: "product_in_use:apple_product_used_surgery",
      matchKey: "product_in_use:apple_product_used_surgery",
    });
    expect(formatObservationFindingForRepDisplay(appleJunkFinding)).toBe("");
    expect(formatRepProductUseLine(null, "current_case")).toBe("");
    expect(formatRepProductUseLine(null, "established_pattern")).toBe("Product use observed");
  });

  it("never exposes ontology labels in observation intelligence presentation copy", () => {
    const view = buildObservationRepPresentationView({
      caseRow: {
        id: "case-current",
        status: "confirmed",
        provider_name: "Dr. Example",
        live_observation_staff_process: "Staff burden: Workflow",
        live_observation_clinical_pain_points: "Provider concern: Clinical Frustration",
      },
      activities: [
        {
          activity_type: "note",
          body: "Staff needed to verify stocked products. Provider showed clinical frustration during visualization.",
        },
      ],
      priorCases: [],
    });

    const allCopy = [
      ...view.whatWeKnow.map((item) => item.text),
      ...view.stillNeedToLearn.map((item) => item.text),
      ...view.thisObservation.items.map((item) => item.text),
      ...view.providerBriefing.items.map((item) => item.text),
    ].join("\n");

    expect(allCopy).not.toMatch(/staff burden:/i);
    expect(allCopy).not.toMatch(/staff workflow:/i);
    expect(allCopy).not.toMatch(/provider concern:/i);
    expect(allCopy).not.toMatch(/uncertainty stocked products/i);
    expect(containsOntologyDisplayLabel(allCopy)).toBe(false);
  });

  it("never exposes ontology labels in briefing known-so-far copy", () => {
    const view = buildObservationCaseBriefingRepView({
      caseRow: { id: "case-current", status: "scheduled" },
      activities: [],
      priorCases: [
        {
          id: "case-prior",
          status: "completed",
          live_observation_staff_process: "Staff workflow: Familiarity",
          notes: "Team seemed familiar with workflow.",
        },
      ],
    });

    const allCopy = [
      ...view.knownSoFar,
      ...view.focusToday,
      ...view.stillNeedToLearn,
      view.whyThisMatters,
    ].join("\n");
    expect(allCopy).not.toMatch(/staff workflow:/i);
    expect(allCopy).not.toMatch(/uncertainty stocked products/i);
    expect(containsOntologyDisplayLabel(allCopy)).toBe(false);
  });
});
