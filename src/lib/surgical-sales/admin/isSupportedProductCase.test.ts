import { describe, expect, it } from "vitest";
import { isSupportedProductCase } from "@/lib/surgical-sales/admin/isSupportedProductCase";

describe("isSupportedProductCase", () => {
  const base = {
    case_type: "product_support",
    status: "completed",
  };

  it("requires product_support completed case", () => {
    expect(isSupportedProductCase({ caseRow: { ...base, case_type: "observation" } })).toBe(false);
    expect(isSupportedProductCase({ caseRow: { ...base, status: "scheduled" } })).toBe(false);
  });

  it("counts when actual_quantity > 0 on a line", () => {
    expect(
      isSupportedProductCase({
        caseRow: base,
        productLines: [{ actual_quantity: 0 }, { actual_quantity: 2 }],
      }),
    ).toBe(true);
  });

  it("falls back to note or successful case result", () => {
    expect(isSupportedProductCase({ caseRow: base, hasProductUseNote: true })).toBe(true);
    expect(
      isSupportedProductCase({
        caseRow: { ...base, case_support_case_result: "successful" },
      }),
    ).toBe(true);
  });

  it("excludes zero-quantity lines with no note or result", () => {
    expect(
      isSupportedProductCase({
        caseRow: base,
        productLines: [{ actual_quantity: 0 }],
        hasProductUseNote: false,
      }),
    ).toBe(false);
  });
});
