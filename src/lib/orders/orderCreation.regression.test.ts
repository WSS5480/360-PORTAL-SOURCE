import { describe, expect, it } from "vitest";
import { aggregateInventoryNeed, findInventoryShortages } from "@/lib/orders/inventoryCheck";
import { makeOrderNumber } from "@/lib/orders/orderNumber";
import { priceOneCatalogLine } from "@/lib/orders/priceCatalogLine";
import { etaForPriority } from "@/lib/orders/shippingPriority";

const variant = {
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  product_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  sku: "FIXTURE-SKU",
  size_label: "2x2",
  base_unit_price: 100,
  width_cm: 2,
  length_cm: 2,
  total_sqcm: 4,
};

describe("portal and admin catalog pricing", () => {
  it("applies the account discount to the variant base price", () => {
    const line = priceOneCatalogLine({
      variant,
      quantity: 2,
      virtualWarehouseQty: 0,
      bulkEnabled: false,
      bulkMode: false,
      bulkRules: [],
      sqcmForBulkTier: 0,
      accountDiscountPercent: 10,
    });

    expect(line.unit_price).toBe(100);
    expect(line.discount_percent).toBe(10);
    expect(line.line_total).toBe(180);
    expect(line.description).toBe("FIXTURE-SKU 2x2");
    expect(line.uom).toBe("Units");
    expect(line.line_type).toBe("PRODUCT");
  });

  it("prices bulk mode from the matched dollars per square centimeter", () => {
    const line = priceOneCatalogLine({
      variant,
      quantity: 3,
      virtualWarehouseQty: 1,
      bulkEnabled: true,
      bulkMode: true,
      bulkRules: [{ min_sqcm: 0, price_per_sqcm: 10, product_id: null }],
      sqcmForBulkTier: 12,
      accountDiscountPercent: 25,
    });

    expect(line.unit_price).toBe(40);
    expect(line.discount_percent).toBe(0);
    expect(line.line_total).toBe(120);
    expect(line.virtual_warehouse_qty).toBe(1);
    expect(line.missingBulkRule).toBe(false);
  });

  it("zeros portal virtual-warehouse product lines when the bulk deposit carries the price", () => {
    const line = priceOneCatalogLine({
      variant,
      quantity: 2,
      virtualWarehouseQty: 2,
      bulkEnabled: true,
      bulkMode: true,
      bulkRules: [{ min_sqcm: 0, price_per_sqcm: 10, product_id: null }],
      sqcmForBulkTier: 8,
      accountDiscountPercent: 10,
      productLinesFree: true,
    });

    expect(line.unit_price).toBe(0);
    expect(line.discount_percent).toBe(0);
    expect(line.line_total).toBe(0);
  });

  it("reports a missing bulk tier instead of silently using the discount price", () => {
    const line = priceOneCatalogLine({
      variant,
      quantity: 1,
      virtualWarehouseQty: 0,
      bulkEnabled: true,
      bulkMode: true,
      bulkRules: [],
      sqcmForBulkTier: 4,
      accountDiscountPercent: 10,
    });

    expect(line.missingBulkRule).toBe(true);
    expect(line.line_total).toBe(90);
  });
});

describe("portal and admin inventory demand", () => {
  const lines = [
    {
      product_variant_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      quantity: 5,
      virtual_warehouse_qty: 3,
      description: "FIXTURE-SKU",
    },
    {
      product_variant_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      quantity: 1,
      description: "Virtual warehouse bulk purchase (10 sq cm)",
    },
  ];

  it("uses ship-now quantity for portal confirm and full quantity for admin confirm", () => {
    const skipDeposit = (line: { description?: unknown }) =>
      String(line.description ?? "").startsWith("Virtual warehouse bulk purchase");

    expect(
      aggregateInventoryNeed(lines, "ship_now", { skipLine: skipDeposit }).get(
        "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
      )
    ).toBe(2);
    expect(
      aggregateInventoryNeed(lines, "full", { skipLine: skipDeposit }).get("dddddddd-dddd-4ddd-8ddd-dddddddddddd")
    ).toBe(5);
    expect(
      aggregateInventoryNeed(lines, "full", { skipLine: skipDeposit }).has("ffffffff-ffff-4fff-8fff-ffffffffffff")
    ).toBe(false);
  });

  it("treats a missing inventory row as zero on hand", () => {
    const need = aggregateInventoryNeed(
      [{ product_variant_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", quantity: 2 }],
      "full"
    );
    expect(findInventoryShortages(need, new Map())).toEqual([
      { variant_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", required: 2, on_hand: 0 },
    ]);
  });
});

describe("order number and shipping eta", () => {
  it("keeps the internal order number format used by portal and admin intake", () => {
    expect(makeOrderNumber(new Date("2026-10-20T12:00:00.000Z"), "ab12cd")).toBe("ORD-20261020-AB12CD");
    expect(etaForPriority("GROUND")).toBe(3);
    expect(etaForPriority("OVERNIGHT_AM")).toBe(1);
    expect(etaForPriority("TWO_DAY")).toBe(2);
  });
});
