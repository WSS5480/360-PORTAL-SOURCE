import { describe, expect, it } from "vitest";

import { buildSharedUnresolvedEvidenceQuestions } from "./observationCaseBriefingPresentation";

/**
 * Post-capture "What We Still Need To Learn" fix: current-case captures resolve
 * or reframe the baseline prompts so the section never contradicts the
 * "This Observation" findings rendered beside it.
 */

const ROUTINE_CASE_NOTE =
  "Pretty routine case overall. They're still using Bard Mesh. One thing I noticed was the surgeon asked for a different angle a couple times because he wasn't getting the view he wanted before fixation. Didn't seem angry about it, but it definitely slowed things down. Staff was good. Everyone seemed to know what they were doing. Still too early for me to know if there's a real opportunity here.";

const CASE_ROW = { id: "case-1", status: "confirmed", case_type: "observation" };

function v2NoteActivity(facts: Array<Record<string, unknown>>, body: string) {
  return {
    activity_type: "note",
    body,
    metadata_json: {
      ai_extraction: {
        facts,
        extractedAt: "2026-06-09T00:00:00.000Z",
        model: "facts-v2-ai",
        validation_version: 1,
      },
    },
  };
}

const PRODUCT_FACT = {
  type: "current_product",
  value: "Bard Mesh",
  evidence: "They're still using Bard Mesh.",
  polarity: "neutral",
  confirmation_state: "witnessed",
  validation: { status: "accepted" },
};

const VISUALIZATION_FACT = {
  type: "visualization_challenge",
  value: "extra visualization time before fixation",
  evidence:
    "the surgeon asked for a different angle a couple times because he wasn't getting the view he wanted before fixation",
  polarity: "negative",
  confirmation_state: "witnessed",
  validation: { status: "accepted" },
};

const POSITIVE_STAFF_FACT = {
  type: "staff_efficiency",
  value: "coordinated team",
  evidence: "Everyone seemed to know what they were doing.",
  polarity: "positive",
  confirmation_state: "witnessed",
  validation: { status: "accepted" },
};

describe("still-need-to-learn post-capture baseline fix", () => {
  it("first observation with product captured removes the product-identification prompt", () => {
    const lines = buildSharedUnresolvedEvidenceQuestions({
      caseRow: CASE_ROW,
      activities: [v2NoteActivity([PRODUCT_FACT], "They're still using Bard Mesh.")],
    });

    expect(lines.join("\n")).not.toMatch(/identify which products/i);
  });

  it("first observation with visualization captured replaces the generic workflow prompt with a recurrence prompt", () => {
    const lines = buildSharedUnresolvedEvidenceQuestions({
      caseRow: CASE_ROW,
      activities: [v2NoteActivity([VISUALIZATION_FACT], ROUTINE_CASE_NOTE)],
      // Lift the display cap so the assertion covers the full reframed list.
      maxItems: 5,
    });

    const joined = lines.join("\n");
    expect(joined).not.toMatch(/watch for workflow delays or friction points/i);
    expect(joined).toMatch(/extra visualization or evaluation time shows up again/i);
    // Generic procedural follow-up — not fixation-specific anatomy language.
    expect(joined).toMatch(/procedural decision-making patterns repeat/i);
  });

  it("first observation with positive staff workflow does not show or imply staff pain", () => {
    const lines = buildSharedUnresolvedEvidenceQuestions({
      caseRow: CASE_ROW,
      activities: [v2NoteActivity([POSITIVE_STAFF_FACT], "Staff was good. Everyone seemed to know what they were doing.")],
    });

    expect(lines.join("\n")).not.toMatch(/staff frustration|workarounds, or complaints/i);
  });

  it("keeps a future-looking provider prompt that does not imply frustration was missed", () => {
    const lines = buildSharedUnresolvedEvidenceQuestions({
      caseRow: CASE_ROW,
      activities: [
        v2NoteActivity([PRODUCT_FACT, VISUALIZATION_FACT, POSITIVE_STAFF_FACT], ROUTINE_CASE_NOTE),
      ],
    });

    const joined = lines.join("\n");
    expect(joined).toMatch(
      /continue listening for provider frustration or product dissatisfaction in future observations/i,
    );
    expect(joined).not.toMatch(/listen for provider frustration during the case/i);
  });

  it("Dr. Lettuce acceptance: prompts no longer contradict This Observation findings", () => {
    const lines = buildSharedUnresolvedEvidenceQuestions({
      caseRow: CASE_ROW,
      activities: [
        v2NoteActivity([PRODUCT_FACT, VISUALIZATION_FACT, POSITIVE_STAFF_FACT], ROUTINE_CASE_NOTE),
      ],
    });

    const joined = lines.join("\n");
    expect(joined).not.toMatch(/identify which products/i);
    expect(joined).not.toMatch(/watch for workflow delays or friction points/i);
    expect(joined).not.toMatch(/staff frustration/i);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("baseline behavior is unchanged when the current case has no captured findings", () => {
    const lines = buildSharedUnresolvedEvidenceQuestions({
      caseRow: CASE_ROW,
      activities: [],
    });

    // Pre-fix behavior: full baseline checklist, default display cap applied.
    expect(lines).toEqual([
      "Identify which products are used during the case",
      "Watch for workflow delays or friction points",
      "Listen for provider frustration during the case",
      "Listen for staff frustration, delays, workarounds, or complaints",
    ]);

    const uncapped = buildSharedUnresolvedEvidenceQuestions({
      caseRow: CASE_ROW,
      activities: [],
      maxItems: 5,
    });
    expect(uncapped).toEqual([
      "Identify which products are used during the case",
      "Watch for workflow delays or friction points",
      "Listen for provider frustration during the case",
      "Listen for staff frustration, delays, workarounds, or complaints",
      "Watch for moments where a different product might help during the case",
    ]);
  });
});
