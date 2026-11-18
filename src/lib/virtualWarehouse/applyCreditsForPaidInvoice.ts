import type { SupabaseClient } from "@supabase/supabase-js";
import { INVOICE_KIND_PRIMARY, normalizeInvoiceKind } from "@/lib/billing/invoiceKinds";
import { creditBulkHeadroomToAccountInventory } from "./creditBulkHeadroomToAccountInventory";
import { sqcmFromVariant } from "./sqcmFromVariant";
import { incrementVirtualSqcmBalance } from "./virtualSqcmBalance";

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

/**
 * When an invoice becomes fully paid, credit virtual-warehouse balances from order line
 * `virtual_warehouse_qty` (idempotent per invoice via virtual_warehouse_credit_events).
 * Skips invoices for `virtual_warehouse_shipment` orders ($0 ship-from-stock requests).
 * Credits fungible sq cm on account_pricing.virtual_sqcm_balance (any bulk SKU can draw from it).
 */
export async function applyVirtualWarehouseCreditsForPaidInvoice(
  sb: SupabaseClient,
  invoiceId: string
): Promise<void> {
  const invId = safeStr(invoiceId);
  if (!UUID_RE.test(invId)) return;

  const { data: inv, error: invErr } = await sb
    .from("invoices")
    .select("id, status, order_id, invoice_kind")
    .eq("id", invId)
    .maybeSingle();

  if (invErr || !inv) return;
  if (normalizeInvoiceKind((inv as any).invoice_kind) !== INVOICE_KIND_PRIMARY) return;
  if (String((inv as any).status ?? "").toUpperCase() !== "PAID") return;

  const orderId = safeStr((inv as any).order_id);
  if (!orderId || !UUID_RE.test(orderId)) return;

  const { data: ord, error: ordErr } = await sb
    .from("orders")
    .select("id, account_id, virtual_warehouse_shipment")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr || !ord) return;
  if ((ord as any).virtual_warehouse_shipment === true) return;

  const accountId = safeStr((ord as any).account_id);
  if (!accountId || !UUID_RE.test(accountId)) return;

  const { data: pricing } = await sb
    .from("account_pricing")
    .select("virtual_warehouse_enabled")
    .eq("account_id", accountId)
    .maybeSingle();

  if (!(pricing as any)?.virtual_warehouse_enabled) return;

  const { error: insEvErr } = await sb.from("virtual_warehouse_credit_events").insert({ invoice_id: invId });

  if (insEvErr) {
    const code = (insEvErr as any)?.code;
    if (code === "23505") return;
    console.error("[VW_CREDIT] insert event failed", insEvErr.message);
    return;
  }

  const { data: lines, error: liErr } = await sb
    .from("order_items")
    .select("product_variant_id, virtual_warehouse_qty, line_type")
    .eq("order_id", orderId);

  if (liErr) {
    console.error("[VW_CREDIT] load items failed", liErr.message);
    return;
  }

  const productLines = (lines ?? []).filter((r) => String((r as any).line_type ?? "").toUpperCase() === "PRODUCT");
  const vwRows = productLines.filter((r) => safeInt((r as any).virtual_warehouse_qty) > 0);
  const variantIds = Array.from(
    new Set(
      vwRows
        .map((r) => safeStr((r as any).product_variant_id))
        .filter((id) => UUID_RE.test(id))
    )
  );

  let addSqcm = 0;
  if (variantIds.length) {
    const { data: vars, error: vErr } = await sb
      .from("product_variants")
      .select("id, total_sqcm, width_cm, length_cm, size_label")
      .in("id", variantIds as any);

    if (vErr) {
      console.error("[VW_CREDIT] load variants failed", vErr.message);
    } else {
      const byId = new Map<string, any>((vars ?? []).map((v: any) => [String(v.id), v]));
      for (const row of vwRows) {
        const vid = safeStr((row as any).product_variant_id);
        const vw = safeInt((row as any).virtual_warehouse_qty);
        if (!vid || !UUID_RE.test(vid) || vw <= 0) continue;
        const v = byId.get(vid);
        const per = sqcmFromVariant(v);
        if (per > 0) addSqcm += vw * per;
      }
    }
  }

  if (addSqcm > 0) {
    try {
      await incrementVirtualSqcmBalance(sb, accountId, addSqcm);
    } catch (e: any) {
      console.error("[VW_CREDIT] increment pool failed", e?.message || e);
    }
  }

  try {
    await creditBulkHeadroomToAccountInventory(sb, orderId, accountId);
  } catch (e: any) {
    console.error("[VW_HEADROOM] credit failed", e?.message || e);
  }
}
