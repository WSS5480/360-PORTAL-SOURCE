import { describe, expect, it } from "vitest";
import { buildDebriefCompletionValidationModel } from "./buildDebriefCompletionValidationModel";
import type { DebriefCompletionContext } from "./debriefCompletionValidationTypes";
import {
  applyPostObservationDebriefReviewGuard,
  autoAcceptPostObservationDebriefFieldUpdates,
  filterPostObservationDebriefCommitPatches,
  serializeDebriefCompletionContextForSnapshot,
  shouldSuppressPostObservationFieldUpdate,
} from "./postObservationDebriefCompletion";
import { isDebriefValidationEngagementType, isPostObservationProviderDebrief } from "./isPostObservationProviderDebrief";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

import { DR_LETTUCE_DEBRIEF_NARRATIVE } from "./drLettuceDebriefCompletion.fixture";
import { MARK_ONION_PROVIDER_DEBRIEF_EXAMPLE_DICTATION } from "./classifyProviderDebriefConversationResult";

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
      { label: "Staff appeared comfortable with current process", count: 5, total: 5, importance: 1 },
      { label: "Bard Mesh used consistently", count: 5, total: 5, importance: 2 },
    ],
    primaryHypothesisPattern: {
      label: "Extra visualization time before fixation",
      count: 2,
      total: 5,
      importance: 10,
    },
    hypothesisText:
      "No clear commercial issue has emerged from observations yet. Confirm whether visualization delays matter before recommending a next step.",
    ...overrides,
  };
}

function logUpdateWithFields(
  fieldUpdates: Array<{ dbKey: string; label: string; proposedValue: string; accepted?: boolean }>,
): LogUpdateParseResult {
  return {
    sourceText: DR_LETTUCE_DEBRIEF_NARRATIVE,
    usesProviderIntelligence: true,
    fieldUpdates: fieldUpdates.map((field, index) => ({
      id: `field-${index}`,
      dbKey: field.dbKey,
      label: field.label,
      proposedValue: field.proposedValue,
      accepted: field.accepted ?? true,
    })),
    suggestedUpdates: [],
    insights: [],
    conflicts: [],
    intelligenceReview: { stillWorthConfirming: [], relatedSignals: [] },
    stillMissing: [],
    saveAsNote: { accepted: false },
  } as LogUpdateParseResult;
}

describe("post-observation debrief completion", () => {
  it("loads serialized completion context with observation pattern metadata", () => {
    const serialized = serializeDebriefCompletionContextForSnapshot(completionContext());
    expect(serialized.completedObservationCount).toBe(5);
    expect(serialized.hypothesisText).toMatch(/No clear commercial issue/i);
    expect(serialized.observationPatterns[0]).toEqual(
      expect.objectContaining({
        label: "Extra visualization time before fixation",
        normalizedKey: "visualization_exposure_workflow",
        frequency: "2 of 5",
        observationCount: 2,
        totalObservationCount: 5,
      }),
    );
  });

  it("Dr. Lettuce narrative qualifies visualization instead of confirming strong pain", () => {
    const model = buildDebriefCompletionValidationModel({
      completionContext: completionContext(),
      narrative: DR_LETTUCE_DEBRIEF_NARRATIVE,
    });

    const visualization = model.patternValidations.find((row) =>
      /visualization/i.test(row.pattern_label),
    );
    expect(visualization?.status).toMatch(/qualified|rejected/);
    expect(visualization?.status).not.toBe("confirmed");
    expect(model.nextStep.opportunity_strength).toMatch(/none/);
    expect(model.nextStep.provider_interest).toMatch(/not_interested|neutral/);
    expect(model.nextStep.recommendation).toMatch(/no_action|follow_up/);
    expect(model.nextStep.recommendation).not.toBe("evaluation");
  });

  it("comfortable current workflow does not create workflow friction validation", () => {
    const model = buildDebriefCompletionValidationModel({
      completionContext: completionContext(),
      narrative: DR_LETTUCE_DEBRIEF_NARRATIVE,
    });

    const staff = model.patternValidations.find((row) => /staff appeared comfortable/i.test(row.pattern_label));
    expect(staff?.status).toBe("rejected");
    expect(model.nextStep.reason.toLowerCase()).not.toMatch(/workflow friction/);
  });

  it('blocks evaluation when provider is "not actively looking to change products"', () => {
    const model = buildDebriefCompletionValidationModel({
      completionContext: completionContext(),
      narrative: DR_LETTUCE_DEBRIEF_NARRATIVE,
    });

    expect(model.nextStep.recommendation).not.toBe("evaluation");
    expect(model.nextStep.provider_interest).not.toBe("interested");
  });

  it("does not treat weak future conditional interest as active evaluation when provider declined", () => {
    const model = buildDebriefCompletionValidationModel({
      completionContext: completionContext(),
      narrative: DR_LETTUCE_DEBRIEF_NARRATIVE,
    });

    expect(model.nextStep.provider_interest).toBe("not_interested");
    expect(model.nextStep.recommendation).toBe("no_action");
    expect(model.nextStep.opportunity_strength).toBe("none");
  });

  it("allows confirmed current product updates when narrative states comfort with current workflow", () => {
    expect(
      shouldSuppressPostObservationFieldUpdate({
        dbKey: "provider_competitive_products",
        label: "Products used",
        proposedValue: "Bard Mesh",
        narrative: DR_LETTUCE_DEBRIEF_NARRATIVE,
      }),
    ).toBe(false);
  });

  it("suppresses generic access/credentialing/OR access updates unless explicitly mentioned", () => {
    const narrative = DR_LETTUCE_DEBRIEF_NARRATIVE;
    expect(
      shouldSuppressPostObservationFieldUpdate({
        dbKey: "provider_observation_access_path",
        label: "Observation access path",
        proposedValue: "Credential through RepTrax",
        narrative,
      }),
    ).toBe(true);
    expect(
      shouldSuppressPostObservationFieldUpdate({
        dbKey: "provider_credentialing_status",
        label: "Credentialing status",
        proposedValue: "Required",
        narrative:
          "Surgeon said observation access still requires credentialing through RepTrax before the next case.",
      }),
    ).toBe(false);
  });

  it("does not suppress clinical frustration when narrative explicitly states major pain", () => {
    expect(
      shouldSuppressPostObservationFieldUpdate({
        dbKey: "provider_clinical_frustrations",
        label: "Clinical frustrations",
        proposedValue: "Visualization delays are a major workflow issue",
        narrative:
          "Provider confirmed visualization delays are a major workflow issue and worth addressing now.",
        validationResults: [],
      }),
    ).toBe(false);
  });

  it("keeps intro-call behavior unchanged by not treating intro_call as post-observation debrief", () => {
    expect(
      isPostObservationProviderDebrief({
        engagementType: "intro_call",
        completedObservationCount: 5,
      }),
    ).toBe(false);
    expect(isDebriefValidationEngagementType("intro_call")).toBe(false);
  });

  it("blocks weaker debrief frustration writes when validation is only qualified", () => {
    const validationResults = buildDebriefCompletionValidationModel({
      completionContext: completionContext(),
      narrative: DR_LETTUCE_DEBRIEF_NARRATIVE,
    }).patternValidations;

    expect(
      shouldSuppressPostObservationFieldUpdate({
        dbKey: "provider_clinical_frustrations",
        label: "Clinical frustrations",
        proposedValue: "Visualization workflow challenge",
        narrative: DR_LETTUCE_DEBRIEF_NARRATIVE,
        validationResults,
      }),
    ).toBe(true);
  });

  it("clears auto-accepted generic patches in review guard for post-observation debrief", () => {
    const guarded = applyPostObservationDebriefReviewGuard({
      logUpdate: logUpdateWithFields([
        {
          dbKey: "provider_clinical_frustrations",
          label: "Clinical frustrations",
          proposedValue: "Visualization workflow challenge",
          accepted: true,
        },
        {
          dbKey: "provider_observation_access_path",
          label: "Observation access path",
          proposedValue: "RepTrax credentialing",
          accepted: true,
        },
      ]),
      narrative: DR_LETTUCE_DEBRIEF_NARRATIVE,
      validationResults: buildDebriefCompletionValidationModel({
        completionContext: completionContext(),
        narrative: DR_LETTUCE_DEBRIEF_NARRATIVE,
      }).patternValidations,
    });

    expect(guarded.fieldUpdates.every((row) => !row.accepted)).toBe(true);
    expect(
      filterPostObservationDebriefCommitPatches({
        fieldPatches: [
          { dbKey: "provider_clinical_frustrations", value: "Visualization workflow challenge", mergeStrategy: "replace" },
          { dbKey: "provider_observation_access_path", value: "RepTrax credentialing", mergeStrategy: "replace" },
        ],
        narrative: DR_LETTUCE_DEBRIEF_NARRATIVE,
      }),
    ).toEqual([]);
  });

  it("auto-accepts supported product updates but not observation access for post-observation debrief", () => {
    const narrative = MARK_ONION_PROVIDER_DEBRIEF_EXAMPLE_DICTATION;
    const validationResults = buildDebriefCompletionValidationModel({
      completionContext: completionContext(),
      narrative,
    }).patternValidations;

    const accepted = autoAcceptPostObservationDebriefFieldUpdates({
      logUpdate: logUpdateWithFields([
        {
          dbKey: "provider_competitive_products",
          label: "Products used",
          proposedValue: "Bard Mesh",
          accepted: false,
        },
        {
          dbKey: "provider_observation_feasibility",
          label: "Observation allowed?: interested",
          proposedValue: "interested",
          accepted: false,
        },
      ]),
      narrative,
      validationResults,
    });

    const byKey = Object.fromEntries(accepted.fieldUpdates.map((row) => [row.dbKey, row.accepted]));
    expect(byKey.provider_competitive_products).toBe(true);
    expect(byKey.provider_observation_feasibility).toBe(false);
  });
});
