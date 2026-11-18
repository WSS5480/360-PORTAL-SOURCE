import { describe, expect, it } from "vitest";
import {
  buildProductSupportCaseResultPatch,
  parseProductSupportCaseResult,
  PRODUCT_SUPPORT_CASE_RESULT_LABELS,
} from "./productSupportCaseMoments";

describe("productSupportCaseMoments", () => {
  it("maps case result to legacy outcome for board compatibility", () => {
    const patch = buildProductSupportCaseResultPatch("issue_encountered");
    expect(patch.case_support_case_result).toBe("issue_encountered");
    expect(patch.case_support_outcome).toBe("issue_occurred");
    expect(patch.follow_up_needed).toBe(true);
  });

  it("parses case result labels", () => {
    expect(parseProductSupportCaseResult("successful")).toBe("successful");
    expect(PRODUCT_SUPPORT_CASE_RESULT_LABELS.successful).toBe("Successful");
  });
});
