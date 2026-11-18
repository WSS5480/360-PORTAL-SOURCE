import { describe, expect, it } from "vitest";
import {
  isNegativeEvidenceStatement,
  isStaffPainFinding,
  isStaffWorkflowFinding,
  isUnknownEvidenceStatement,
} from "./observationEvidenceClassification";

describe("observationEvidenceClassification", () => {
  it("flags unknown and negative evidence statements", () => {
    expect(
      isUnknownEvidenceStatement(
        "Need a few more cases before I really know where the pain points are.",
      ),
    ).toBe(true);
    expect(isNegativeEvidenceStatement("Didn't hear anyone complaining about products.")).toBe(
      true,
    );
  });

  it("distinguishes staff workflow from staff pain findings", () => {
    expect(isStaffWorkflowFinding("Team appeared organized")).toBe(true);
    expect(isStaffPainFinding("Product availability/setup delays observed")).toBe(true);
    expect(isStaffPainFinding("Team appeared organized")).toBe(false);
  });
});
