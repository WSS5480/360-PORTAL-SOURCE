import { describe, expect, it } from "vitest";
import { buildActiveProviderDebriefGuide } from "./buildActiveProviderDebriefGuide";
import type { DebriefExecutionGuide } from "./debriefExecutionGuideTypes";

function sampleExecutionGuide(overrides: Partial<DebriefExecutionGuide> = {}): DebriefExecutionGuide {
  return {
    whatWeObserved: ["Bard Mesh was used across observed cases."],
    whatToValidate: ["Does visualization actually matter to Dr. Chen?"],
    conversationStarters: ["We noticed visualization took a little extra time in some of the larger cases."],
    recommendedOutcome: "Follow Up / Low Opportunity",
    primaryHypothesis: "Visualization challenges may occur in some cases.",
    source: "generated_from_observation_patterns",
    ...overrides,
  };
}

describe("buildActiveProviderDebriefGuide", () => {
  it("returns null when execution guide is missing", () => {
    expect(
      buildActiveProviderDebriefGuide({
        provider_snapshot: { display_name: "Dr. Chen" } as never,
        upcoming_engagement: {
          engagement_type: "provider_debrief",
          type_label: "Observation Debrief",
        } as never,
        provider_debrief_briefing: {
          is_provider_debrief: true,
          plan_mode: "intelligence",
          completed_observation_count: 5,
          plan: null,
          linked_case_id: "case-1",
          linked_case_href: "/portal/sales/cases/case-1",
          missing_case_message: null,
        },
        debrief_execution_guide: null,
        live_session: null,
      }),
    ).toBeNull();
  });

  it("returns null for non-provider debrief engagements", () => {
    expect(
      buildActiveProviderDebriefGuide({
        provider_snapshot: { display_name: "Dr. Chen" } as never,
        upcoming_engagement: {
          engagement_type: "intro_call",
          type_label: "Intro Call",
        } as never,
        provider_debrief_briefing: {
          is_provider_debrief: false,
          plan_mode: "generic",
          completed_observation_count: 0,
          plan: null,
          linked_case_id: null,
          linked_case_href: null,
          missing_case_message: null,
        },
        debrief_execution_guide: sampleExecutionGuide(),
        live_session: null,
      }),
    ).toBeNull();
  });

  it("uses the shared execution guide for Active Debrief", () => {
    const executionGuide = sampleExecutionGuide({
      source: "saved_prepare_workspace",
      whatToValidate: ["Rep-edited validation goal"],
      conversationStarters: ["Rep-edited conversation starter?"],
    });

    const guide = buildActiveProviderDebriefGuide({
      provider_snapshot: { display_name: "Dr. Chen" } as never,
      upcoming_engagement: {
        engagement_type: "provider_debrief",
        type_label: "Observation Debrief",
      } as never,
      provider_debrief_briefing: {
        is_provider_debrief: true,
        plan_mode: "intelligence",
        completed_observation_count: 5,
        plan: null,
        linked_case_id: "case-1",
        linked_case_href: "/portal/sales/cases/case-1",
        missing_case_message: null,
      },
      debrief_execution_guide: executionGuide,
      live_session: null,
    });

    expect(guide).not.toBeNull();
    expect(guide!.executionGuide).toEqual(executionGuide);
    expect(guide!.providerName).toBe("Dr. Chen");
    expect(guide!.outcomes.some((outcome) => outcome.id === "touch_success")).toBe(true);
  });
});
