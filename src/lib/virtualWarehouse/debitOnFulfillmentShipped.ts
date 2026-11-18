import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

function safeInt(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

async function loadFulfillmentDebitNeeds(
  sb: SupabaseClient,
  fulfillmentId: string
): Promise<
  | { ok: false; error: string }
  | { ok: true; accountId: string; needByVariant: Map<string, number>; isVwOrder: false }
  | { ok: true; accountId: string; needByVariant: Map<string, number>; isVwOrder: true }
> {
  const fid = safeStr(fulfillmentId);
  if (!UUID_RE.test(fid)) return { ok: false, error: "invalid_fulfillment" };

  const { data: f, error: fErr } = await sb
    .from("fulfillments")
    .select("id, order_id")
    .eq("id", fid)
    .maybeSingle();

  if (fErr || !f) return { ok: false, error: "fulfillment_not_found" };

  const orderId = safeStr((f as any).order_id);
  if (!orderId || !UUID_RE.test(orderId)) return { ok: false, error: "invalid_order" };

  const { data: ord, error: ordErr } = await sb
    .from("orders")
    .select("id, account_id, virtual_warehouse_shipment")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr || !ord) return { ok: false, error: "order_not_found" };

  const accountId = safeStr((ord as any).account_id);
  if (!accountId || !UUID_RE.test(accountId)) return { ok: false, error: "invalid_account" };

  const { data: lines, error: liErr } = await sb
    .from("fulfillment_items")
    .select("variant_id, required_qty")
    .eq("fulfillment_id", fid);

  if (liErr) return { ok: false, error: liErr.message };

  const needByVariant = new Map<string, number>();
  for (const row of lines ?? []) {
    const vid = safeStr((row as any).variant_id);
    const qty = safeInt((row as any).required_qty);
    if (!vid || !UUID_RE.test(vid) || qty <= 0) continue;
    needByVariant.set(vid, (needByVariant.get(vid) ?? 0) + qty);
  }

  if (!(ord as any).virtual_warehouse_shipment) {
    return { ok: true, accountId, needByVariant, isVwOrder: false };
  }

  return { ok: true, accountId, needByVariant, isVwOrder: true };
}

/** Read-only check before marking a VW shipment fulfillment shipped. */
export async function validateVirtualWarehouseDebitForFulfillment(
  sb: SupabaseClient,
  fulfillmentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const loaded = await loadFulfillmentDebitNeeds(sb, fulfillmentId);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  if (!loaded.isVwOrder) return { ok: true };

  /** Sq cm is deducted when the portal confirms the VW ship request, not at ship time. */
  return { ok: true };
}

/**
 * After a fulfillment is marked shipped: if the parent order is a virtual-warehouse shipment,
 * record idempotency only — sq cm was already deducted when the portal confirmed the order.
 */
export async function debitVirtualWarehouseForShippedFulfillment(
  sb: SupabaseClient,
  fulfillmentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fid = safeStr(fulfillmentId);
  if (!UUID_RE.test(fid)) return { ok: false, error: "invalid_fulfillment" };

  const loaded = await loadFulfillmentDebitNeeds(sb, fid);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  if (!loaded.isVwOrder) return { ok: true };

  const { error: insErr } = await sb.from("virtual_warehouse_ship_debits").insert({ fulfillment_id: fid });

  if (insErr) {
    const code = (insErr as any)?.code;
    if (code === "23505") return { ok: true };
    return { ok: false, error: insErr.message };
  }

  return { ok: true };
}
