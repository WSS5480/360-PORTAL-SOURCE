import { describe, expect, it } from "vitest";

import { runUniversalSurgicalExtraction } from "./runUniversalSurgicalExtraction";

import {
  DEBRIEF_VALIDATION_CONFIRM_SIZING_NOTE,
  DEBRIEF_VALIDATION_REJECT_SIZING_NOTE,
} from "./universalDeclaredSourceTypes";

export const DEBRIEF_VALIDATION_CONFIRM_NOTE = DEBRIEF_VALIDATION_CONFIRM_SIZING_NOTE;
export const DEBRIEF_VALIDATION_REJECT_NOTE = DEBRIEF_VALIDATION_REJECT_SIZING_NOTE;

describe("debrief validation sizing notes", () => {
  it("validates recurring sizing issue without unrelated concepts", () => {
    const result = runUniversalSurgicalExtraction({
      raw_note: DEBRIEF_VALIDATION_CONFIRM_NOTE,
      declared_source_type: "debrief_validation",
    });

    const sizing = result.facts.find((fact) => fact.concept === "sizing_or_fit_issue");
    expect(sizing).toBeDefined();
    expect(sizing?.assertion_level).toBe("validated");
    expect(result.facts.some((fact) => fact.concept === "case_outcome")).toBe(false);
  });

  it("rejects sizing issue without creating unrelated concepts", () => {
    const result = runUniversalSurgicalExtraction({
      raw_note: DEBRIEF_VALIDATION_REJECT_NOTE,
      declared_source_type: "debrief_validation",
    });

    const sizing = result.facts.find((fact) => fact.concept === "sizing_or_fit_issue");
    expect(sizing).toBeDefined();
    expect(sizing?.assertion_level).toBe("rejected");
    expect(result.facts.some((fact) => fact.concept === "case_outcome")).toBe(false);
    expect(result.facts.some((fact) => fact.concept === "no_issue_or_routine")).toBe(false);
  });
});
