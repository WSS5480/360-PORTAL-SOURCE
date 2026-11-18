import { describe, expect, it } from "vitest";

import { buildObservationCaseBriefingRepView } from "./observationCaseBriefingPresentation";
import { buildObservationRepPresentationView } from "./buildObservationRepPresentationView";
import {
  containsOntologyLearningObjectiveLabel,
  formatRepeatEvidenceConsistencyObjective,
  formatRepeatEvidenceCrossCaseObjective,
  translateLearningObjectiveTopic,
} from "./observationLearningObjectiveDisplay";

describe("observationLearningObjectiveDisplay", () => {
  it("maps ontology topic keys to rep-facing learning language", () => {
    expect(translateLearningObjectiveTopic("uncertainty_stocked_products")).toBe(
      "product availability issues",
    );
    expect(translateLearningObjectiveTopic("Uncertainty Stocked Products")).toBe(
      "product availability issues",
    );
    expect(translateLearningObjectiveTopic("workflow_burden")).toBe("workflow delays");
    expect(translateLearningObjectiveTopic("staff_workflow_familiarity")).toBe(
      "staff familiarity with the workflow",
    );
    expect(translateLearningObjectiveTopic("provider_clinical_frustration")).toBe(
      "provider frustration during procedures",
    );
    expect(translateLearningObjectiveTopic("product_availability")).toBe(
      "product availability verification",
    );
  });

  it("formats repeat-evidence consistency objectives without ontology leakage", () => {
    expect(formatRepeatEvidenceConsistencyObjective("uncertainty stocked products")).toBe(
      "Watch whether staff still need to verify product availability before cases start",
    );
    expect(formatRepeatEvidenceConsistencyObjective("workflow_burden")).toBe(
      "Watch whether workflow delays keep slowing cases",
    );
    expect(formatRepeatEvidenceConsistencyObjective("provider_clinical_frustration")).toBe(
      "Watch whether provider frustration shows up again during cases",
    );
    expect(formatRepeatEvidenceCrossCaseObjective("uncertainty_stocked_products")).toBe(
      "Watch whether product availability issues keep showing up across cases",
    );
    expect(containsOntologyLearningObjectiveLabel("uncertainty stocked products")).toBe(true);
    expect(
      containsOntologyLearningObjectiveLabel(
        "Determine whether product availability issues occur consistently across cases",
      ),
    ).toBe(false);
  });

  it("uses the same mappings in briefing and intelligence still-need objectives", () => {
    const input = {
      caseRow: {
        id: "case-current",
        status: "confirmed",
        provider_name: "Dr. Example",
        live_observation_staff_process: "Uncertainty Stocked Products",
      },
      activities: [
        {
          activity_type: "note",
          body: "Staff needed to verify stocked products again before the case could proceed.",
        },
      ],
      priorCases: [
        {
          id: "case-prior",
          status: "completed",
          live_observation_staff_process: "Uncertainty Stocked Products",
          notes: "Staff verified stocked products before proceeding.",
        },
      ],
    };

    const briefing = buildObservationCaseBriefingRepView(input);
    const intelligence = buildObservationRepPresentationView(input);

    const briefingStillNeed = briefing.stillNeedToLearn.join("\n");
    const intelligenceStillNeed = intelligence.stillNeedToLearn.map((item) => item.text).join("\n");

    expect(briefingStillNeed).not.toMatch(/uncertainty stocked products/i);
    expect(intelligenceStillNeed).not.toMatch(/uncertainty stocked products/i);
    expect(containsOntologyLearningObjectiveLabel(briefingStillNeed)).toBe(false);
    expect(containsOntologyLearningObjectiveLabel(intelligenceStillNeed)).toBe(false);

    if (/watch whether/i.test(briefingStillNeed)) {
      expect(briefingStillNeed).toMatch(/product availability|verify product/i);
    }
  });
});
