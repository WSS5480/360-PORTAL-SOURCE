import { describe, expect, it } from "vitest";
import {
  buildProductSupportOutcomePatch,
  parseProductSupportCaseOutcome,
  productSupportCaseOutcomeLabel,
} from "./productSupportCaseOutcome";

describe("productSupportCaseOutcome", () => {
  it("parses stored outcome ids", () => {
    expect(parseProductSupportCaseOutcome("product_used")).toBe("product_used");
    expect(parseProductSupportCaseOutcome("invalid")).toBeNull();
  });

  it("labels outcomes for display", () => {
    expect(productSupportCaseOutcomeLabel("issue_occurred")).toBe("Issue occurred");
  });

  it("builds patch with follow-up flag for issue and follow-up outcomes", () => {
    expect(buildProductSupportOutcomePatch("follow_up_needed")).toEqual({
      case_support_outcome: "follow_up_needed",
      follow_up_needed: true,
    });
    expect(buildProductSupportOutcomePatch("completed_as_planned")).toEqual({
      case_support_outcome: "completed_as_planned",
      follow_up_needed: false,
    });
  });
});
