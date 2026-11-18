import { describe, expect, it } from "vitest";
import {
  classifyIntroCallConversationResult,
  introCallDebriefFirstEndAllowed,
  resolveEngagementOutcomeAuthorityId,
} from "@/lib/surgical-sales/engagements/introCallDebriefFirstCompletion";

describe("introCallDebriefFirstCompletion", () => {
  it("allows end without outcome for intro call and provider debrief", () => {
    expect(introCallDebriefFirstEndAllowed({ engagementType: "intro_call" })).toBe(true);
    expect(introCallDebriefFirstEndAllowed({ engagementType: "provider_debrief" })).toBe(true);
    expect(
      introCallDebriefFirstEndAllowed({ engagementType: "intro_call", outcomeId: "follow_up_needed" }),
    ).toBe(false);
    expect(introCallDebriefFirstEndAllowed({ engagementType: "follow_up" })).toBe(false);
    expect(
      introCallDebriefFirstEndAllowed({ engagementType: "follow_up", outcomeId: "touch_follow_up" }),
    ).toBe(false);
  });

  it("classifies conversation result from debrief narrative", () => {
    const result = classifyIntroCallConversationResult(
      "She approved observation for next month. Call Karen to schedule.",
    );
    expect(result.outcomeId).toBe("observation_approved");
    expect(result.label).toBe("Observation Approved");
  });

  it("prefers visitOutcome over start_mission tap for intro call authority", () => {
    const snapshot = {
      visitOutcome: {
        outcomeId: "follow_up_needed",
        label: "Follow Up Needed",
        rationale: "Conditional access.",
        recordedAt: "2026-06-15T12:00:00.000Z",
      },
      start_mission: {
        opened_at: "2026-06-15T11:00:00.000Z",
        live_notes: "",
        outcome_id: "no_meaningful_update",
        outcome_label: "No Meaningful Update",
        outcome_recorded_at: "2026-06-15T11:30:00.000Z",
      },
    };
    expect(
      resolveEngagementOutcomeAuthorityId({
        engagementType: "intro_call",
        debriefSnapshot: snapshot,
      }),
    ).toBe("follow_up_needed");
  });

  it("ignores pre-debrief start_mission outcome for intro call when visitOutcome absent", () => {
    const snapshot = {
      start_mission: {
        opened_at: "2026-06-15T11:00:00.000Z",
        live_notes: "",
        outcome_id: "no_meaningful_update",
        outcome_recorded_at: "2026-06-15T11:30:00.000Z",
      },
    };
    expect(
      resolveEngagementOutcomeAuthorityId({
        engagementType: "intro_call",
        debriefSnapshot: snapshot,
      }),
    ).toBeNull();
  });
});
