import { describe, expect, it } from "vitest";
import { filterSurgicalCaseDetailWarnings } from "./filterSurgicalCaseDetailWarnings";

describe("filterSurgicalCaseDetailWarnings", () => {
  it("removes product-support warnings for observation cases", () => {
    const filtered = filterSurgicalCaseDetailWarnings(
      [
        "Expected revenue is blank or zero — consider entering an amount for forecasting.",
        "Purchase order is not on file yet — upload it when available.",
        "No surgeon contact is linked for this organization — add one when the roster is confirmed.",
      ],
      true,
    );

    expect(filtered).toEqual([
      "No surgeon contact is linked for this organization — add one when the roster is confirmed.",
    ]);
  });
});
