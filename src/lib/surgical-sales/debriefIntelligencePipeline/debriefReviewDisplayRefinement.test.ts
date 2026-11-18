import { describe, expect, it } from "vitest";

import {
  dedupeSchedulingWorkflowPrimaryLines,
  enrichClinicalProcedureFocusWithModality,
  executiveProcedureFocusTakeaway,
  mergeSchedulingPreferenceLines,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewDisplayRefinement";

describe("debriefReviewDisplayRefinement", () => {
  it("merges overlapping scheduling preference lines into one superset line", () => {
    expect(
      mergeSchedulingPreferenceLines([
        "Workflow priority: Tuesday/Thursdays mornings preferred for scheduling",
        "Workflow priority: Thursdays preferred for scheduling",
      ]),
    ).toBe("Workflow priority: Tuesday/Thursdays mornings preferred for scheduling");
    expect(
      dedupeSchedulingWorkflowPrimaryLines([
        "Positioning difficulty in larger defects",
        "Workflow priority: Tuesday/Thursdays mornings preferred for scheduling",
        "Workflow priority: Thursdays preferred for scheduling",
      ]),
    ).toEqual([
      "Positioning difficulty in larger defects",
      "Workflow priority: Tuesday/Thursdays mornings preferred for scheduling",
    ]);
  });

  it("enriches procedure focus labels with modality from evidence", () => {
    expect(
      enrichClinicalProcedureFocusWithModality(
        "Ventral and inguinal hernia repair",
        "He primarily performs robotic ventral and inguinal hernia repairs.",
      ),
    ).toBe("Robotic ventral and inguinal hernia repair");
  });

  it("builds specific procedure focus takeaways for executive summary", () => {
    expect(executiveProcedureFocusTakeaway("Robotic ventral and inguinal hernia repair")).toBe(
      "Robotic ventral and inguinal hernia repair focus noted",
    );
  });

  it("does not prepend robotic to abdominal wall reconstruction when only hernia is robotic", () => {
    const evidence =
      "Clinically, he mentioned they've been doing more robotic ventral hernia repairs lately and are seeing a higher volume of abdominal wall reconstruction cases than they were a year ago.";
    const blob = `Abdominal wall reconstruction ${evidence}`;
    expect(/\brobotic\b[^.!?]{0,56}\breconstruction\b/i.test(blob)).toBe(false);
    expect(enrichClinicalProcedureFocusWithModality("Abdominal wall reconstruction", evidence)).toBe(
      "Abdominal wall reconstruction",
    );
    expect(enrichClinicalProcedureFocusWithModality("Robotic ventral hernia repair", evidence)).toBe(
      "Robotic ventral hernia repair",
    );
  });
});
