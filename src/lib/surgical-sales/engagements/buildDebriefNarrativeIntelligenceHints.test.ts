import { describe, expect, it } from "vitest";
import { DR_JOHN_HAM_INTRO } from "@/lib/surgical-sales/debriefIntroCallRegressionFixtures";
import {
  buildDebriefNarrativeDossierHints,
  extractDossierHintsFromDebriefNarrative,
  extractFollowUpLinesFromDebriefNarrative,
} from "@/lib/surgical-sales/engagements/buildDebriefNarrativeIntelligenceHints";

describe("buildDebriefNarrativeIntelligenceHints", () => {
  it("extracts Ham intro debrief procedure, products, scheduling, and friction", () => {
    const hints = extractDossierHintsFromDebriefNarrative(DR_JOHN_HAM_INTRO);

    expect(hints.procedureFocus).toMatch(/robotic ventral and inguinal hernia/i);
    expect(hints.currentProducts.some((product) => /bard soft mesh/i.test(product))).toBe(true);
    expect(hints.productInterests.some((interest) => /published outcomes/i.test(interest))).toBe(true);
    expect(hints.workflowNotes.some((note) => /tuesdays? and thursdays?/i.test(note))).toBe(true);
    expect(hints.positioningFrictions.some((friction) => /larger defects/i.test(friction))).toBe(true);
  });

  it("extracts rep-facing follow-up lines without raw dictation phrasing", () => {
    const lines = extractFollowUpLinesFromDebriefNarrative(DR_JOHN_HAM_INTRO);

    expect(lines).toHaveLength(2);
    expect(lines).toEqual([
      "Share comparative clinical data and schedule observation case",
      "Email proposed observation dates",
    ]);
    expect(lines.every((line) => !/^I told him/i.test(line))).toBe(true);
    expect(lines.every((line) => !/\bshe said\b/i.test(line))).toBe(true);
  });

  it("does not emit garbled product names from narrative debrief", () => {
    const hints = extractDossierHintsFromDebriefNarrative(DR_JOHN_HAM_INTRO);

    expect(hints.currentProducts).toEqual(["Bard Soft Mesh"]);
    expect(hints.currentProducts.some((product) => /him for long|tuesdays and thursdays/i.test(product))).toBe(
      false,
    );
  });

  it("reads narrative hints from engagement snapshot live notes", () => {
    const hints = buildDebriefNarrativeDossierHints({
      engagements: [
        {
          id: "eng-ham",
          engagement_type: "intro_call",
          engagement_type_label: "Intro Call",
          status: "completed",
          status_label: "Completed",
          engagement_date: "2026-07-06",
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          briefing_status: "not_started",
          briefing_status_label: "Not Started",
          planning_status: "not_started",
          planning_status_label: "Not Started",
          outcome_label: "Completed",
          debrief_completed: true,
          debrief_completed_at: "2026-07-06T12:00:00.000Z",
          debrief_intelligence_snapshot: {
            start_mission: { live_notes: DR_JOHN_HAM_INTRO },
          },
        },
      ],
    });

    expect(hints?.procedureFocus).toMatch(/robotic ventral and inguinal hernia/i);
    expect(hints?.currentProducts.some((product) => /bard/i.test(product))).toBe(true);
  });
});
