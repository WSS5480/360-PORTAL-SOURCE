const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type InventoryNeedLine = {
  product_variant_id?: unknown;
  quantity?: unknown;
  virtual_warehouse_qty?: unknown;
};

export type InventoryShortage = {
  variant_id: string;
  required: number;
  on_hand: number;
};

function safeNum(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

/**
 * Quantity that confirm and lock treat as demand.
 * `ship_now` is the portal confirm rule (quantity minus virtual-warehouse allocation).
 * `full` is the admin confirm rule.
 */
export function aggregateInventoryNeed(
  lines: InventoryNeedLine[],
  mode: "full" | "ship_now",
  opts?: { skipLine?: (line: InventoryNeedLine) => boolean }
): Map<string, number> {
  const need = new Map<string, number>();
  for (const line of lines) {
    if (opts?.skipLine?.(line)) continue;
    const vid = safeStr(line.product_variant_id);
    const qty = safeNum(line.quantity);
    const demand =
      mode === "ship_now" ? Math.max(0, qty - safeNum(line.virtual_warehouse_qty ?? 0)) : qty;
    if (!vid || !UUID_RE.test(vid) || demand <= 0) continue;
    need.set(vid, (need.get(vid) ?? 0) + demand);
  }
  return need;
}

export function findInventoryShortages(
  needByVariant: Map<string, number>,
  onHandByVariant: Map<string, number>
): InventoryShortage[] {
  const shortages: InventoryShortage[] = [];
  for (const [variantId, required] of needByVariant.entries()) {
    const onHand = onHandByVariant.get(variantId) ?? 0;
    if (onHand < required) shortages.push({ variant_id: variantId, required, on_hand: onHand });
  }
  return shortages;
}
