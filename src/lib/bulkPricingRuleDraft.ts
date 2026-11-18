import {
  floorPricePerSqcm,
  normalizeBulkRules,
  type BulkRuleRow,
} from "./bulkRules";

export type BulkRuleDraft = {
  id: string;
  minSqcm: string;
  pricePerSqcm: string;
  /** "" = all products */
  productId: string;
};

export function safeNum(v: string): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function newBulkRuleDraftId() {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyBulkRuleDraft(defaults?: {
  pricePerSqcm?: string;
  productId?: string;
}): BulkRuleDraft {
  return {
    id: newBulkRuleDraftId(),
    minSqcm: "0",
    pricePerSqcm: defaults?.pricePerSqcm ?? "",
    productId: defaults?.productId ?? "",
  };
}

export function normalizeBulkRulesForSave(rules: BulkRuleRow[]): BulkRuleRow[] {
  return normalizeBulkRules(rules);
}

export type ParsedBulkRuleDraft = {
  id: string;
  valid: boolean;
  min_sqcm: number | null;
  price_per_sqcm: number | null;
  product_id: string | null;
};

export function parseBulkRuleDraft(r: BulkRuleDraft): ParsedBulkRuleDraft {
  const min = safeNum(r.minSqcm);
  const product_id = r.productId?.trim() ? r.productId.trim() : null;
  if (min === null || min < 0) {
    return { id: r.id, valid: false, min_sqcm: min, price_per_sqcm: null, product_id };
  }
  const price = safeNum(r.pricePerSqcm);
  const valid = price !== null && price > 0;
  return {
    id: r.id,
    valid,
    min_sqcm: min,
    price_per_sqcm: valid ? floorPricePerSqcm(price) : null,
    product_id,
  };
}

export function parseAllBulkRuleDrafts(rules: BulkRuleDraft[]): ParsedBulkRuleDraft[] {
  return rules.map(parseBulkRuleDraft);
}

export function bulkRuleDraftsFromSaved(
  rules: BulkRuleRow[] | Array<{ min_sqcm: number; price_per_sqcm: number; product_id?: string | null }>
): BulkRuleDraft[] {
  return normalizeBulkRulesForSave((rules || []) as BulkRuleRow[]).map((r, idx) => ({
    id: `rule-${idx}-${Math.random().toString(36).slice(2, 8)}`,
    minSqcm: String(r.min_sqcm),
    pricePerSqcm: String(r.price_per_sqcm),
    productId: r.product_id || "",
  }));
}
