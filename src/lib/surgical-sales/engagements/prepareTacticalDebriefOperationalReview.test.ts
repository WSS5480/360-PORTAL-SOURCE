import { describe, expect, it } from "vitest";
import { buildTacticalDebriefAnalysis } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefAnalyze";
import {
  buildTacticalDebriefOperationalReview,
  sanitizeDebriefDisplayText,
} from "@/lib/surgical-sales/engagements/prepareTacticalDebriefOperationalReview";

describe("sanitizeDebriefDisplayText", () => {
  it("strips internal debrief markers", () => {
    expect(sanitizeDebriefDisplayText("--- Tactical debrief ---")).toBe("");
    expect(sanitizeDebriefDisplayText("Met the OR coordinator")).toBe("Met the OR coordinator");
  });
});

describe("buildTacticalDebriefOperationalReview", () => {
  it("maps signals into operational review sections", () => {
    const analysis = buildTacticalDebriefAnalysis(
      "Met the scheduler — observation access is clearer. Follow up next week. Credentialing blocker cleared.",
      { providerId: "p1", existingProviderFields: {} },
    );
    const review = buildTacticalDebriefOperationalReview({ analysis, propagationTargets: [] });
    const ids = review.sections.map((s) => s.id);
    expect(ids).toContain("confirmed");
    expect(review.sections.some((s) => s.lines.some((l) => l.text.includes("pathway") || l.text.includes("Scheduler")))).toBe(
      true,
    );
  });
});
