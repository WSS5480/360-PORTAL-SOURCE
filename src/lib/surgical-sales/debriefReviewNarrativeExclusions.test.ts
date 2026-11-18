import { describe, expect, it } from "vitest";

import { isExcludedNarrativeReviewPhrase } from "@/lib/surgical-sales/debriefReviewNarrativeExclusions";

describe("debriefReviewNarrativeExclusions", () => {
  it("flags narrative AI summary phrases", () => {
    expect(isExcludedNarrativeReviewPhrase("Access Summary")).toBe(true);
    expect(isExcludedNarrativeReviewPhrase("Observation access appears possible.")).toBe(true);
    expect(isExcludedNarrativeReviewPhrase("Key Takeaways")).toBe(true);
    expect(isExcludedNarrativeReviewPhrase("Learned: credentialing required")).toBe(true);
  });

  it("allows structured field values", () => {
    expect(isExcludedNarrativeReviewPhrase("Interested")).toBe(false);
    expect(isExcludedNarrativeReviewPhrase("Scheduling Coordinator")).toBe(false);
    expect(isExcludedNarrativeReviewPhrase("Get Jennifer's phone or email.")).toBe(false);
  });
});
