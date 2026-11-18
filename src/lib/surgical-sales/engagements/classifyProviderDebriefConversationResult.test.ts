import { describe, expect, it } from "vitest";
import {
  MARK_ONION_PROVIDER_DEBRIEF_EXAMPLE_DICTATION,
  buildProviderDebriefConversationResultDisplay,
  classifyProviderDebriefConversationResult,
} from "./classifyProviderDebriefConversationResult";
import { buildDebriefCompletionValidationModel } from "./buildDebriefCompletionValidationModel";
import type { DebriefCompletionContext } from "./debriefCompletionValidationTypes";
import {
  buildNewEngagementHrefForProvider,
  resolvePostProviderDebriefFinishHref,
  resolvePostProviderDebriefScheduleHref,
} from "./resolvePostProviderDebriefFinishNavigation";

function completionContext(): DebriefCompletionContext {
  return {
    loadedAt: "2026-06-12T12:00:00.000Z",
    completedObservationCount: 5,
    isPostObservationProviderDebrief: true,
    prepareWorkspace: null,
    desiredOutcome: null,
    desiredOutcomeOther: "",
    observationPatterns: [
      { label: "Extra visualization time before fixation", count: 2, total: 5, importance: 10 },
    ],
    primaryHypothesisPattern: {
      label: "Extra visualization time before fixation",
      count: 2,
      total: 5,
      importance: 10,
    },
    hypothesisText: "Visualization delays may matter.",
  };
}

describe("classifyProviderDebriefConversationResult specificity", () => {
  it("classifies Mark Onion example as Evaluation Case Agreed with quote", () => {
    const result = classifyProviderDebriefConversationResult(MARK_ONION_PROVIDER_DEBRIEF_EXAMPLE_DICTATION);
    expect(result.outcomeId).toBe("touch_success");
    expect(result.label).toBe("Evaluation Case Agreed");
    expect(result.evidence).toMatch(/agreed to schedule an evaluation case/i);
  });

  it("uses completion next step for display card", () => {
    const nextStep = buildDebriefCompletionValidationModel({
      completionContext: completionContext(),
      narrative: MARK_ONION_PROVIDER_DEBRIEF_EXAMPLE_DICTATION,
    }).nextStep;

    const display = buildProviderDebriefConversationResultDisplay({
      narrative: MARK_ONION_PROVIDER_DEBRIEF_EXAMPLE_DICTATION,
      nextStep,
    });

    expect(display.label).toBe("Evaluation Case Agreed");
    expect(display.rationale).toMatch(/agreed to schedule evaluation/i);
    expect(display.evidence).toMatch(/evaluation case next month/i);
  });
});

describe("resolvePostProviderDebriefFinishNavigation", () => {
  it("builds new engagement href with provider_id and organization_id", () => {
    const href = buildNewEngagementHrefForProvider({
      providerId: "provider-1",
      organizationId: "org-1",
    });
    expect(href).toContain("provider_id=provider-1");
    expect(href).toContain("organization_id=org-1");
  });

  it("finish without schedule returns provider overview", () => {
    expect(resolvePostProviderDebriefFinishHref({ providerId: "provider-1" })).toBe(
      "/portal/sales/providers/provider-1?tab=overview",
    );
  });

  it("schedule href opens product trial case for evaluation next step", () => {
    const nextStep = buildDebriefCompletionValidationModel({
      completionContext: completionContext(),
      narrative: MARK_ONION_PROVIDER_DEBRIEF_EXAMPLE_DICTATION,
    }).nextStep;

    const href = resolvePostProviderDebriefScheduleHref({
      providerId: "provider-1",
      organizationId: "org-1",
      nextStep,
    });

    expect(href).toContain("surgeon_contact_id=provider-1");
    expect(href).toContain("account_id=org-1");
    expect(href).toContain("case_type=product_support");
    expect(href).not.toContain("engagement_type=product_demo");
  });
});
