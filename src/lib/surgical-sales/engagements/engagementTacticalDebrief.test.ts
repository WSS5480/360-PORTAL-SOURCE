import { describe, expect, it } from "vitest";
import {
  buildStoredTacticalDebriefNotes,
  engagementHasTacticalDebrief,
  engagementNeedsTacticalDebrief,
  engagementNotesHaveTacticalDebrief,
  TACTICAL_DEBRIEF_NOTE_MARKER,
} from "./engagementTacticalDebrief";
import type { ProviderEngagementSummary } from "./providerEngagementSummary";

function engagement(
  overrides: Partial<ProviderEngagementSummary> & { id: string; status: string },
): ProviderEngagementSummary {
  return {
    engagement_type: "intro_call",
    engagement_type_label: "Intro call",
    status_label: "Completed",
    pre_call_filled: 0,
    pre_call_total: 0,
    pre_call_complete: false,
    outcome_label: "",
    ...overrides,
  };
}

describe("engagementTacticalDebrief", () => {
  it("detects marker and formatted debrief notes", () => {
    expect(engagementNotesHaveTacticalDebrief("raw only")).toBe(false);
    expect(
      engagementNotesHaveTacticalDebrief(`${TACTICAL_DEBRIEF_NOTE_MARKER}\n\nWhat happened:\nMet surgeon`),
    ).toBe(true);
    expect(
      engagementNotesHaveTacticalDebrief("What happened:\nMet surgeon\n\nOperational intelligence captured:"),
    ).toBe(true);
  });

  it("treats debrief_completed_at as debriefed", () => {
    expect(
      engagementHasTacticalDebrief(
        engagement({
          id: "e1",
          status: "completed",
          notes: "Quick field notes",
          debrief_completed_at: "2026-05-27T12:00:00.000Z",
        }),
      ),
    ).toBe(true);
    expect(
      engagementNeedsTacticalDebrief(
        engagement({
          id: "e1",
          status: "completed",
          notes: "Quick field notes",
          debrief_completed_at: "2026-05-27T12:00:00.000Z",
        }),
      ),
    ).toBe(false);
  });

  it("does not require debrief while touch is in progress", () => {
    expect(
      engagementNeedsTacticalDebrief(
        engagement({ id: "e-live", status: "in_progress", notes: null }),
      ),
    ).toBe(false);
  });

  it("stores debrief notes with marker", () => {
    const notes = buildStoredTacticalDebriefNotes({ narrative: "Strong interest in observation." });
    expect(notes).toContain(TACTICAL_DEBRIEF_NOTE_MARKER);
    expect(notes).toContain("What happened:");
    expect(engagementNotesHaveTacticalDebrief(notes)).toBe(true);
  });
});
