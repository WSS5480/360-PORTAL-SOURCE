/**
 * Bulk tier pricing: absolute base price per sq cm above each threshold.
 * Stored in account_pricing.bulk_rules as JSON:
 *   [{ min_sqcm, price_per_sqcm, product_id? }, ...]
 * - product_id null/omitted → applies to all products (default)
 * - product_id set → product-specific; falls back to all-products rules when none match
 */

export type BulkRuleRow = {
  min_sqcm: number;
  price_per_sqcm: number;
  /** null = applies to all products */
  product_id: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** System-wide default bulk rate ($/sq cm) for new accounts / empty tiers. */
export const DEFAULT_BULK_PRICE_PER_SQCM = 9;

/** Floor to 4 decimal places for $/sq cm (e.g. 18.1234). */
export function floorPricePerSqcm(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return 0;
  return Math.floor(x * 10000 + 1e-9) / 10000;
}

function normalizeProductId(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "all" || s.toLowerCase() === "null") return null;
  return UUID_RE.test(s) ? s : null;
}

export function normalizeBulkRules(rules: unknown): BulkRuleRow[] {
  const arr = Array.isArray(rules) ? rules : [];
  return arr
    .map((r: any) => {
      const min_sqcm = Math.max(0, Number(r?.min_sqcm) || 0);
      const price_per_sqcm = floorPricePerSqcm(r?.price_per_sqcm);
      if (price_per_sqcm <= 0) return null;
      return {
        min_sqcm,
        price_per_sqcm,
        product_id: normalizeProductId(r?.product_id),
      };
    })
    .filter((x): x is BulkRuleRow => x !== null)
    .sort((a, b) => {
      const ap = a.product_id || "";
      const bp = b.product_id || "";
      if (ap !== bp) return ap.localeCompare(bp);
      return a.min_sqcm - b.min_sqcm;
    });
}

/** Global (all-products) rules only. */
export function globalBulkRules(rules: BulkRuleRow[]): BulkRuleRow[] {
  return rules.filter((r) => !r.product_id);
}

/**
 * Rules for a product: product-specific tiers if any exist, otherwise all-products tiers.
 * Pass null/undefined productId to get global (all-products) rules only.
 */
export function rulesForProduct(allRules: BulkRuleRow[], productId: string | null | undefined): BulkRuleRow[] {
  const pid = productId ? String(productId).trim() : "";
  if (pid && UUID_RE.test(pid)) {
    const specific = allRules.filter((r) => r.product_id === pid);
    if (specific.length > 0) return specific;
  }
  return globalBulkRules(allRules);
}

/** Highest tier whose min_sqcm is met. Uses product-specific rules when present, else all-products. */
export function getBulkMatchingRule(
  totalSqcm: number,
  rules: BulkRuleRow[],
  productId?: string | null
): BulkRuleRow | null {
  const scoped = rulesForProduct(rules, productId ?? null);
  let best: BulkRuleRow | null = null;
  for (const r of scoped) {
    if (totalSqcm >= r.min_sqcm) best = r;
  }
  return best;
}

export function formatBulkPricePerSqcmLabel(n: unknown): string {
  const f = floorPricePerSqcm(n);
  if (f <= 0) return "0";
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(f);
}
