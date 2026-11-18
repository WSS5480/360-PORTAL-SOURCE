import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { canViewOrders } from "@/lib/portal/portalRoles";
import { applyPortalOrdersScope } from "@/lib/portal/portalRowScope";
import { portalUserHasVirtualWarehouseAccess } from "@/lib/portal/portalVirtualWarehouseAccess";

export const dynamic = "force-dynamic";

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeInt(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function sqcmFromVariant(v: any): number {
  const direct = safeNum(v?.total_sqcm);
  if (direct > 0) return direct;
  const w = safeNum(v?.width_cm);
  const l = safeNum(v?.length_cm);
  if (w > 0 && l > 0) return w * l;
  return 0;
}

function isVwBulkDepositLine(desc: unknown): boolean {
  return safeStr(desc).startsWith("Virtual warehouse bulk purchase");
}

export async function GET() {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;
  if (!accountId) return NextResponse.json({ ok: false, error: "No account selected." }, { status: 400 });

  if (!canViewOrders(ctx.currentRole)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const sb: any = createSupabaseAdminClient();
  const portalUserId = String((ctx.user as any)?.id ?? "");

  const { data: pricing } = await sb
    .from("account_pricing")
    .select("virtual_warehouse_enabled")
    .eq("account_id", accountId)
    .maybeSingle();

  if (!(pricing as any)?.virtual_warehouse_enabled) {
    return NextResponse.json({ ok: false, error: "Virtual warehouse is not enabled for this account." }, { status: 403 });
  }

  const vwUserOk = await portalUserHasVirtualWarehouseAccess(sb, String(accountId), portalUserId);
  if (!vwUserOk) {
    return NextResponse.json({ ok: false, error: "Virtual warehouse access is not enabled for your user." }, { status: 403 });
  }

  let ordQ = sb
    .from("orders")
    .select(
      "id, order_number, status, created_at, placed_at, bulk_mode, bulk_contract_sqcm, total_sqcm, virtual_warehouse_shipment"
    )
    .eq("account_id", accountId)
    .eq("bulk_mode", true)
    .gt("bulk_contract_sqcm", 0);
  const scopedVwOrders = await applyPortalOrdersScope(sb, ordQ, accountId, portalUserId, ctx.currentRole);

  const { data: orderRows, error: ordErr } = await scopedVwOrders.query.order("created_at", { ascending: false }).limit(100);

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });

  const ordersRaw = (orderRows ?? []).filter((o: any) => !o?.virtual_warehouse_shipment);
  const orderIds = ordersRaw.map((o: any) => String(o.id)).filter(Boolean);

  // PostgREST rejects `.in("order_id", [])` — return early when there are no bulk VW orders yet.
  if (!orderIds.length) {
    return NextResponse.json({ ok: true, orders: [] });
  }

  const invoiceByOrder = new Map<
    string,
    { id: string; status: string | null; invoice_number: string | null; amount_paid: number | null; total: number | null }
  >();

  if (orderIds.length) {
    const { data: invRows } = await sb
      .from("invoices")
      .select("id, order_id, status, invoice_number, amount_paid, total, created_at")
      .in("order_id", orderIds as any)
      .eq("invoice_kind", "PRIMARY")
      .order("created_at", { ascending: false });
    const seenOrder = new Set<string>();
    for (const inv of invRows ?? []) {
      const oid = safeStr((inv as any).order_id);
      if (!oid || seenOrder.has(oid)) continue;
      seenOrder.add(oid);
      invoiceByOrder.set(oid, inv as any);
    }
  }

  const { data: itemRows, error: itemErr } = await sb
    .from("order_items")
    .select("id, order_id, description, quantity, virtual_warehouse_qty, line_type, product_variant_id")
    .in("order_id", orderIds as any)
    .limit(5000);

  if (itemErr) return NextResponse.json({ ok: false, error: itemErr.message }, { status: 500 });

  const variantIds = Array.from(
    new Set(
      (itemRows ?? [])
        .map((r: any) => String(r.product_variant_id || ""))
        .filter((x: string) => x.length > 10)
    )
  );

  const metaByVid = new Map<string, { sku: string; sqcm: number }>();
  if (variantIds.length) {
    const { data: vrows } = await sb
      .from("product_variants")
      .select("id, sku, total_sqcm, width_cm, length_cm")
      .in("id", variantIds as any);
    for (const v of vrows ?? []) {
      const pv: any = v;
      metaByVid.set(String(pv.id), {
        sku: safeStr(pv.sku),
        sqcm: sqcmFromVariant(pv),
      });
    }
  }

  const itemsByOrder = new Map<string, any[]>();
  for (const r of itemRows ?? []) {
    const oid = safeStr((r as any).order_id);
    if (!oid) continue;
    const list = itemsByOrder.get(oid) ?? [];
    list.push(r);
    itemsByOrder.set(oid, list);
  }

  const orders = ordersRaw.map((ord: any) => {
    const oid = String(ord.id);
    const contract = safeNum(ord.bulk_contract_sqcm);
    const inv = invoiceByOrder.get(oid) ?? null;
    const items = itemsByOrder.get(oid) ?? [];

    let allocatedSqcm = 0;
    let shipNowSqcm = 0;
    let vwLineSqcm = 0;

    const lines: Array<{
      description: string;
      sku: string;
      quantity: number;
      virtual_warehouse_qty: number;
      ship_now_qty: number;
      sqcm_per_unit: number;
      line_sqcm: number;
      ship_now_sqcm: number;
      vw_sqcm: number;
      is_bulk_deposit_line: boolean;
    }> = [];

    for (const it of items) {
      if (String(it.line_type ?? "").toUpperCase() !== "PRODUCT") continue;
      const desc = safeStr(it.description);
      const isDep = isVwBulkDepositLine(desc);
      const vid = safeStr(it.product_variant_id);
      const meta = metaByVid.get(vid) ?? { sku: "", sqcm: 0 };
      const per = meta.sqcm;
      const qty = safeNum(it.quantity);
      const vwQ = Math.min(safeInt(it.virtual_warehouse_qty), Math.floor(qty));
      const shipQ = Math.max(0, Math.floor(qty) - vwQ);

      if (isDep) {
        lines.push({
          description: desc || "Virtual warehouse bulk purchase",
          sku: meta.sku || "—",
          quantity: qty,
          virtual_warehouse_qty: 0,
          ship_now_qty: 0,
          sqcm_per_unit: contract > 0 && qty > 0 ? contract / qty : per,
          line_sqcm: contract,
          ship_now_sqcm: 0,
          vw_sqcm: 0,
          is_bulk_deposit_line: true,
        });
        continue;
      }

      const lineSq = per * qty;
      const shipSq = per * shipQ;
      const vwSq = per * vwQ;
      allocatedSqcm += lineSq;
      shipNowSqcm += shipSq;
      vwLineSqcm += vwSq;

      lines.push({
        description: desc,
        sku: meta.sku || "—",
        quantity: qty,
        virtual_warehouse_qty: vwQ,
        ship_now_qty: shipQ,
        sqcm_per_unit: per,
        line_sqcm: lineSq,
        ship_now_sqcm: shipSq,
        vw_sqcm: vwSq,
        is_bulk_deposit_line: false,
      });
    }

    const headroomSqcm = Math.max(0, contract - allocatedSqcm);

    return {
      id: oid,
      order_number: ord.order_number ?? null,
      status: ord.status ?? null,
      created_at: ord.created_at ?? null,
      placed_at: ord.placed_at ?? null,
      bulk_contract_sqcm: contract,
      total_sqcm: safeNum(ord.total_sqcm),
      allocated_sqcm: allocatedSqcm,
      headroom_sqcm: headroomSqcm,
      ship_now_sqcm: shipNowSqcm,
      vw_line_sqcm: vwLineSqcm,
      invoice: inv
        ? {
            id: inv.id,
            status: inv.status ?? null,
            invoice_number: inv.invoice_number ?? null,
            amount_paid: inv.amount_paid != null ? safeNum(inv.amount_paid) : null,
            total: inv.total != null ? safeNum(inv.total) : null,
          }
        : null,
      lines,
    };
  });

  return NextResponse.json({ ok: true, orders });
}
