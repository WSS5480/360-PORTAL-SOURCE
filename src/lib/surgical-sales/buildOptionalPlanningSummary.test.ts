import { describe, expect, it } from "vitest";
import { buildOptionalPlanningSummary } from "@/lib/surgical-sales/buildOptionalPlanningSummary";

describe("buildOptionalPlanningSummary", () => {
  it("formats empty optional planning state", () => {
    expect(
      buildOptionalPlanningSummary({
        productInterestSelected: false,
        initiativeLinked: false,
        notesAdded: false,
      }),
    ).toBe("Product interest: none · Opportunity: not linked · Notes: not added");
  });

  it("formats populated optional planning state", () => {
    expect(
      buildOptionalPlanningSummary({
        productInterestSelected: true,
        initiativeLinked: true,
        notesAdded: true,
      }),
    ).toBe("Product interest: selected · Opportunity: linked · Notes: added");
  });
});
