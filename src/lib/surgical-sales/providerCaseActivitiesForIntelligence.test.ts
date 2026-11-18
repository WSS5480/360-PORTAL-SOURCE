import { describe, expect, it } from "vitest";

import { observationCaseHasCapturedNotes } from "./buildProviderObservationIntelligenceRollup";

describe("observationCaseHasCapturedNotes", () => {
  it("detects captured notes from nested case activities", () => {
    expect(
      observationCaseHasCapturedNotes({
        id: "case-1",
        activities: [{ activity_type: "note", body: "Bard Mesh used again during the case." }],
      }),
    ).toBe(true);
  });

  it("ignores empty nested activities", () => {
    expect(
      observationCaseHasCapturedNotes({
        id: "case-1",
        activities: [{ activity_type: "note", body: "   " }],
      }),
    ).toBe(false);
  });
});
