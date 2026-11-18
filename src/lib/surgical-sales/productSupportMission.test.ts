import { describe, expect, it } from "vitest";
import {
  buildCaseSupportPlanSummary,
  caseSupportPlanComplete,
  productInventoryComplete,
  supportSetupComplete,
} from "@/lib/surgical-sales/productSupportMission";

describe("productSupportMission", () => {
  it("tracks phased completion gates", () => {
    expect(
      supportSetupComplete({
        accountId: "acct",
        caseDate: "2026-05-27",
        setupProcedure: "Lap chole",
      }),
    ).toBe(true);
    expect(
      productInventoryComplete({
        productId: "prod",
        skuId: "sku",
        expectedQty: "2",
      }),
    ).toBe(true);
    expect(
      caseSupportPlanComplete({
        supportObjective: "Tray coverage",
        supportRepRole: "Rep in room",
        supportRequiredMaterials: "Hernia set",
      }),
    ).toBe(true);
  });

  it("summarizes support plan state", () => {
    expect(
      buildCaseSupportPlanSummary({
        supportObjective: "Tray coverage for block time",
        supportRepRole: "Rep in room",
        followUpNeeded: true,
        complete: true,
      }),
    ).toContain("Rep in room");
  });
});
