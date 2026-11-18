import { describe, expect, it } from "vitest";
import { buildDebriefCompletionValidationModel } from "./buildDebriefCompletionValidationModel";
import type { DebriefCompletionContext } from "./debriefCompletionValidationTypes";
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
    ],
    primaryHypothesisPattern: {
      label: "Extra visualization time before fixation",
      count: 2,
      total: 5,
      importance: 10,
    },
    hypothesisText:
      "Visualization delays in complex cases may be worth addressing with Dr. Lettuce.",
    ...overrides,
  };
}

describe("buildDebriefCompletionValidationModel", () => {
  it("qualifies visualization pattern when dictation limits issue to large AWR cases", () => {
    const narrative =
      "Provider says the visualization issue exists only in large AWR cases, not small hernias. Follow up after the next complex case.";

    const model = buildDebriefCompletionValidationModel({
      completionContext: completionContext(),
      narrative,
      recordedAt: "2026-06-12T12:05:00.000Z",
    });

    const visualization = model.patternValidations.find((row) =>
      /visualization/i.test(row.pattern_label),
    );
    expect(visualization?.status).toBe("qualified");
    expect(visualization?.rep_accepted).toBe(true);
    expect(visualization?.reason).toMatch(/limits|downplayed|scope/i);
    expect(model.nextStep.recommendation).toBe("follow_up");
  });

  it("confirms hypothesis-aligned pattern when provider agrees issue matters", () => {
    const narrative =
      "Provider confirmed the extra visualization time before fixation is annoying and worth addressing.";

    const model = buildDebriefCompletionValidationModel({
      completionContext: completionContext(),
      narrative,
    });

    const visualization = model.patternValidations.find((row) =>
      /visualization/i.test(row.pattern_label),
    );
    expect(visualization?.status).toBe("confirmed");
    expect(model.hypothesisValidation?.status).toBe("confirmed");
  });

  it("rejects staff comfort pattern when provider dismisses it", () => {
    const narrative =
      "Staff appeared comfortable with the current process is not a concern for Dr. Lettuce. No action needed on staff workflow.";

    const model = buildDebriefCompletionValidationModel({
      completionContext: completionContext(),
      narrative,
    });

    const staff = model.patternValidations.find((row) => /staff appeared comfortable/i.test(row.pattern_label));
    expect(staff?.status).toBe("rejected");
    expect(model.nextStep.recommendation).toBe("no_action");
  });

  it("classifies Dr. Lettuce debrief without evaluation or strong pain", () => {
    const model = buildDebriefCompletionValidationModel({
      completionContext: completionContext(),
      narrative: DR_LETTUCE_DEBRIEF_NARRATIVE,
    });

    const visualization = model.patternValidations.find((row) =>
      row.canonical_finding_key === "visualization_exposure_workflow",
    );
    expect(visualization?.status).toBe("qualified");
    expect(visualization?.commercial_status).toBe("qualified_issue");
    expect(model.nextStep.recommendation).toBe("no_action");
    expect(model.nextStep.provider_interest).toBe("not_interested");
    expect(model.nextStep.opportunity_strength).toBe("none");
  });

  it("recommends evaluation when provider agrees to schedule evaluation case", () => {
    const model = buildDebriefCompletionValidationModel({
      completionContext: completionContext(),
      narrative: MARK_ONION_PROVIDER_DEBRIEF_EXAMPLE_DICTATION,
    });

    expect(model.nextStep.recommendation).toBe("evaluation");
    expect(model.nextStep.opportunity_strength).not.toBe("none");
    expect(model.nextStep.reason).toMatch(/agreed to schedule evaluation/i);
    expect(model.nextStep.provider_interest).toBe("interested");
  });
});
