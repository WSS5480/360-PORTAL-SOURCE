import { describe, expect, it } from "vitest";
import { extractRawDebriefFromStoredNotes } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefRawNotes";

describe("extractRawDebriefFromStoredNotes", () => {
  it("returns plain notes unchanged", () => {
    expect(extractRawDebriefFromStoredNotes("Met the scheduler in the OR.")).toBe(
      "Met the scheduler in the OR.",
    );
  });

  it("strips operational intelligence block from legacy formatted notes", () => {
    const stored = `What happened:
Met the scheduler in the OR.

Operational intelligence captured:
• OR access pathway identified`;
    expect(extractRawDebriefFromStoredNotes(stored)).toBe("Met the scheduler in the OR.");
  });
});
