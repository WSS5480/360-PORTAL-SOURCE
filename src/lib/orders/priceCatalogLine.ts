import { getBulkMatchingRule, type BulkRuleRow } from "@/lib/bulkRules";
import { sqcmFromVariant } from "@/lib/virtualWarehouse/sqcmFromVariant";

export type CatalogVariantPriceInput = {
  id: string;
  product_id?: string | null;
  sku?: string | null;
  size_label?: string | null;
  base_unit_price?: number | string | null;
  width_cm?: number | string | null;
  length_cm?: number | string | null;
  total_sqcm?: number | string | null;
};

export type PricedCatalogLineAmounts = {
  description: string;
  quantity: number;
  uom: "Units";
  unit_price: number;
  discount_percent: number;
  line_total: number;
  line_type: "PRODUCT";
  virtual_warehouse_qty: number;
  /** True when bulk mode is on and no tier matched this product. */
  missingBulkRule: boolean;
};

/**
 * Portal create, admin intake, and partner intake share this line price.
 * Bulk mode uses the matched dollars-per-sq-cm tier. Otherwise the account
 * discount percent is applied to the variant base price.
 */
export function priceOneCatalogLine(args: {
  variant: CatalogVariantPriceInput;
  quantity: number;
  virtualWarehouseQty: number;
  bulkEnabled: boolean;
  bulkMode: boolean;
  bulkRules: BulkRuleRow[];
  sqcmForBulkTier: number;
  accountDiscountPercent: number;
  productLinesFree?: boolean;
}): PricedCatalogLineAmounts {
  const qty = Number(args.quantity) || 0;
  const vwQty = Math.min(Math.max(0, Math.floor(args.virtualWarehouseQty || 0)), qty);
  const perSq = sqcmFromVariant(args.variant);
  const productLinesFree = !!args.productLinesFree;
  const lineBulkRule =
    args.bulkEnabled && args.bulkMode
      ? getBulkMatchingRule(args.sqcmForBulkTier, args.bulkRules, args.variant.product_id ?? null)
      : null;

  let unitPriceForLine: number;
  let discPct: number;
  let lineTotal: number;
  if (lineBulkRule) {
    unitPriceForLine = perSq > 0 ? lineBulkRule.price_per_sqcm * perSq : 0;
    discPct = 0;
    lineTotal = productLinesFree ? 0 : unitPriceForLine * qty;
  } else {
    const base = Number(args.variant.base_unit_price ?? 0) || 0;
    unitPriceForLine = base;
    discPct = args.accountDiscountPercent;
    const discountedUnit = base * (1 - args.accountDiscountPercent / 100);
    lineTotal = productLinesFree ? 0 : discountedUnit * qty;
  }

  const descParts = [args.variant.sku].filter(Boolean);
  if (args.variant.size_label) descParts.push(String(args.variant.size_label));
  const description = descParts.length ? descParts.join(" ") : "Product";

  return {
    description,
    quantity: qty,
    uom: "Units",
    unit_price: productLinesFree ? 0 : unitPriceForLine,
    discount_percent: productLinesFree ? 0 : discPct,
    line_total: lineTotal,
    line_type: "PRODUCT",
    virtual_warehouse_qty: vwQty,
    missingBulkRule: !!(args.bulkEnabled && args.bulkMode && !lineBulkRule),
  };
}
