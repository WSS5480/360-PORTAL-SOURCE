import { describe, expect, it } from "vitest";

import {
  buildDebriefCompletionCommercialReview,
  flattenDebriefCompletionProfileUpdates,
} from "./buildDebriefCompletionCommercialReview";

import { buildDebriefCompletionValidationModel } from "./buildDebriefCompletionValidationModel";

import type { DebriefCompletionContext } from "./debriefCompletionValidationTypes";

import { DR_LETTUCE_DEBRIEF_NARRATIVE } from "./drLettuceDebriefCompletion.fixture";
import { MARK_ONION_PROVIDER_DEBRIEF_EXAMPLE_DICTATION } from "./classifyProviderDebriefConversationResult";

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";



function completionContext(

  overrides: Partial<DebriefCompletionContext> = {},

): DebriefCompletionContext {

  return {

    loadedAt: "2026-06-12T12:00:00.000Z",

    completedObservationCount: 5,

    isPostObservationProviderDebrief: true,

    prepareWorkspace: null,

    desiredOutcome: null,

    desiredOutcomeOther: "",

    observationPatterns: [

      { label: "Extra visualization time before fixation", count: 2, total: 5, importance: 10 },

      { label: "Visualization issue", count: 1, total: 5, importance: 8 },

      { label: "Staff appeared comfortable with current process", count: 5, total: 5, importance: 1 },

    ],

    primaryHypothesisPattern: {

      label: "Extra visualization time before fixation",

      count: 2,

      total: 5,

      importance: 10,

    },

    hypothesisText: "Visualization delays may matter.",

    ...overrides,

  };

}



describe("buildDebriefCompletionCommercialReview", () => {

  it("builds rep-facing sections without internal debug payloads", () => {

    const model = buildDebriefCompletionValidationModel({

      completionContext: completionContext(),

      narrative: DR_LETTUCE_DEBRIEF_NARRATIVE,

    });

    const review = buildDebriefCompletionCommercialReview({

      logUpdate: null,

      validationResults: model.patternValidations,

      nextStep: model.nextStep,

    });



    expect(review.whatWeLearned.length).toBeGreaterThan(0);

    expect(review.whatChanged.length).toBeGreaterThan(0);

    expect(review.whatShouldWeDoNext.length).toBeGreaterThan(0);

    expect(review.recommendedNextStep.options.map((row) => row.label)).toEqual([

      "No Action",

      "Follow Up",

      "Evaluation",

      "360 Experience",

      "Product Trial",

      "Opportunity Creation",

    ]);

    expect(JSON.stringify(review)).not.toMatch(/debug|hypothesis_text|normalized_pattern_key/i);

  });



  it("merges duplicate visualization findings and keeps qualified issue, not active opportunity", () => {

    const model = buildDebriefCompletionValidationModel({

      completionContext: completionContext(),

      narrative: DR_LETTUCE_DEBRIEF_NARRATIVE,

    });

    const review = buildDebriefCompletionCommercialReview({

      logUpdate: null,

      validationResults: model.patternValidations,

      nextStep: model.nextStep,

    });



    expect(model.patternValidations.filter((row) => row.canonical_finding_key === "visualization_exposure_workflow")).toHaveLength(1);

    expect(review.commercialFindings.validatedPainPoints).toHaveLength(0);

    expect(review.commercialFindings.opportunitiesIdentified).toHaveLength(0);

    expect(review.commercialFindings.qualifiedPainPoints.some((row) => /Qualified Issue/i.test(row.label))).toBe(true);

    expect(review.commercialFindings.opportunitiesRejected.some((row) => /No active commercial pursuit/i.test(row.label))).toBe(true);

  });



  it("groups accepted profile updates into provider profile sections with rep-facing labels", () => {

    const logUpdate = {

      sourceText: "Uses Bard Mesh for complex repairs.",

      usesProviderIntelligence: true,

      fieldUpdates: [

        {

          id: "field-1",

          dbKey: "provider_competitive_products",

          label: "Products used",

          proposedValue: "Bard Mesh",

          accepted: true,

          conflict: null,

          proposedScope: "provider",

          scopeReason: "",

          proposedDestination: "provider",

          destinationReason: "",

        },

        {

          id: "field-2",

          dbKey: "provider_procedure_focus",

          label: "Procedures performed",

          proposedValue: "Complex abdominal wall reconstruction",

          accepted: true,

          conflict: null,

          proposedScope: "provider",

          scopeReason: "",

          proposedDestination: "provider",

          destinationReason: "",

        },

        {

          id: "field-3",

          dbKey: "provider_observation_feasibility",

          label: "Observation allowed?: interested",

          proposedValue: "interested",

          accepted: true,

          conflict: null,

          proposedScope: "provider",

          scopeReason: "",

          proposedDestination: "provider",

          destinationReason: "",

        },

        {

          id: "field-4",

          dbKey: "provider_clinical_frustrations",

          label: "Clinical frustrations",

          proposedValue: "Visualization workflow challenge",

          accepted: true,

          conflict: null,

          proposedScope: "provider",

          scopeReason: "",

          proposedDestination: "provider",

          destinationReason: "",

        },

      ],

      suggestedUpdates: [],

      insights: [],

      conflicts: [],

      intelligenceReview: { stillWorthConfirming: [], relatedSignals: [] },

      stillMissing: [],

      saveAsNote: { accepted: false },

    } as LogUpdateParseResult;



    const model = buildDebriefCompletionValidationModel({

      completionContext: completionContext(),

      narrative: DR_LETTUCE_DEBRIEF_NARRATIVE,

    });

    const review = buildDebriefCompletionCommercialReview({

      logUpdate,

      validationResults: model.patternValidations,

      nextStep: model.nextStep,

    });



    expect(review.providerProfileUpdates.products_used).toEqual([

      { label: "Current Product / Standard Product", detail: "Bard Mesh" },

    ]);

    expect(review.providerProfileUpdates.procedures_performed).toHaveLength(1);

    expect(review.providerProfileUpdates.facilities).toHaveLength(0);

    expect(JSON.stringify(review.providerProfileUpdates)).not.toMatch(/Observation allowed\?:/i);

    expect(JSON.stringify(review.commercialFindings)).not.toMatch(/Visualization workflow challenge/i);

    expect(review.whatChanged).toMatch(/product usage|procedure focus/i);

  });

  it("surfaces evaluation opportunity for Mark Onion debrief without contradictory rejection", () => {
    const model = buildDebriefCompletionValidationModel({
      completionContext: completionContext(),
      narrative: MARK_ONION_PROVIDER_DEBRIEF_EXAMPLE_DICTATION,
    });

    const review = buildDebriefCompletionCommercialReview({
      logUpdate: null,
      validationResults: model.patternValidations,
      nextStep: model.nextStep,
    });

    expect(model.nextStep.recommendation).toBe("evaluation");
    expect(review.whatWeLearned).toMatch(/occasional on some case types/i);
    expect(review.commercialFindings.opportunitiesIdentified.length).toBeGreaterThan(0);
    expect(review.commercialFindings.opportunitiesRejected).toHaveLength(0);
    expect(review.recommendedNextStep.selectedLabel).toBe("Evaluation");
  });

  it("shows accepted product updates in record updates for Mark Onion debrief", () => {
    const model = buildDebriefCompletionValidationModel({
      completionContext: completionContext(),
      narrative: MARK_ONION_PROVIDER_DEBRIEF_EXAMPLE_DICTATION,
    });

    const logUpdate = {
      sourceText: MARK_ONION_PROVIDER_DEBRIEF_EXAMPLE_DICTATION,
      usesProviderIntelligence: true,
      fieldUpdates: [
        {
          id: "field-1",
          dbKey: "provider_competitive_products",
          label: "Products used",
          proposedValue: "Bard Mesh",
          accepted: true,
          conflict: null,
          proposedScope: "provider",
          scopeReason: "",
          proposedDestination: "provider",
          destinationReason: "",
        },
      ],
      suggestedUpdates: [],
      insights: [],
      conflicts: [],
      intelligenceReview: { stillWorthConfirming: [], relatedSignals: [] },
      stillMissing: [],
      saveAsNote: { accepted: false },
    } as LogUpdateParseResult;

    const review = buildDebriefCompletionCommercialReview({
      logUpdate,
      validationResults: model.patternValidations,
      nextStep: model.nextStep,
    });

    const products = flattenDebriefCompletionProfileUpdates(review.providerProfileUpdates);
    expect(products).toEqual([{ label: "Current Product / Standard Product", detail: "Bard Mesh" }]);
  });

});



describe("buildDebriefCompletionValidationModel commercial status", () => {

  it("requires explicit provider confirmation before validated pain", () => {

    const mentionedOnly = buildDebriefCompletionValidationModel({

      completionContext: completionContext(),

      narrative: "We discussed visualization during the debrief.",

    });

    const visualizationMention = mentionedOnly.patternValidations.find((row) =>

      row.canonical_finding_key === "visualization_exposure_workflow",

    );

    expect(visualizationMention?.status).not.toBe("confirmed");

    expect(visualizationMention?.commercial_status).not.toBe("validated_pain_point");

    expect(visualizationMention?.commercial_status).toBe("mentioned_only");



    const confirmed = buildDebriefCompletionValidationModel({

      completionContext: completionContext(),

      narrative:

        "Provider confirmed the extra visualization time before fixation slows him down enough to be worth addressing.",

    });

    const visualizationConfirmed = confirmed.patternValidations.find((row) =>

      row.canonical_finding_key === "visualization_exposure_workflow",

    );

    expect(visualizationConfirmed?.status).toBe("confirmed");

    expect(visualizationConfirmed?.commercial_status).toBe("validated_pain_point");

  });

});


