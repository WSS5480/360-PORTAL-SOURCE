import type { SupabaseClient } from "@supabase/supabase-js";
import { sqcmFromVariant } from "./sqcmFromVariant";
import { incrementVirtualSqcmBalance } from "./virtualSqcmBalance";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isVwBulkDepositLine(desc: unknown): boolean {
  return safeStr(desc).startsWith("Virtual warehouse bulk purchase");
}

/**
 * Credits leftover bulk contract sq cm (not allocated to product lines) into the account's
 * fungible virtual_sqcm_balance (same pool as line-item VW credits).
 */
export async function creditBulkHeadroomToAccountInventory(
  sb: SupabaseClient,
  orderId: string,
  accountId: string
): Promise<void> {
  if (!UUID_RE.test(orderId) || !UUID_RE.test(accountId)) return;

  const { data: ord, error: ordErr } = await sb
    .from("orders")
    .select("bulk_mode, bulk_contract_sqcm")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr || !ord) return;
  if (!(ord as any).bulk_mode) return;

  const contract = safeNum((ord as any).bulk_contract_sqcm);
  if (!Number.isFinite(contract) || contract <= 0) return;

  const { data: lines, error: liErr } = await sb
    .from("order_items")
    .select("product_variant_id, quantity, description, line_type")
    .eq("order_id", orderId);

  if (liErr || !lines) return;

  const productLines = (lines as any[]).filter((r) => String(r.line_type ?? "").toUpperCase() === "PRODUCT");
  const variantIds = Array.from(
    new Set(
      productLines
        .map((r) => safeStr(r.product_variant_id))
        .filter((id) => UUID_RE.test(id))
    )
  );

  const byVid = new Map<string, any>();
  if (variantIds.length) {
    const { data: vars } = await sb
      .from("product_variants")
      .select("id, total_sqcm, width_cm, length_cm, size_label")
      .in("id", variantIds as any);
    for (const v of vars ?? []) {
      byVid.set(String((v as any).id), v);
    }
  }

  let allocatedSqcm = 0;
  for (const row of productLines) {
    if (isVwBulkDepositLine(row.description)) continue;
    const vid = safeStr(row.product_variant_id);
    const v = byVid.get(vid);
    const qty = safeNum(row.quantity);
    allocatedSqcm += sqcmFromVariant(v) * qty;
  }

  const headroom = contract - allocatedSqcm;
  if (headroom <= 0.0001) return;

  try {
    await incrementVirtualSqcmBalance(sb, accountId, headroom);
  } catch (e: any) {
    console.error("[VW_HEADROOM] increment pool failed", e?.message || e);
  }
}
