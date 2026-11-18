import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { canViewOrders } from "@/lib/portal/portalRoles";
import { applyPortalOrdersScope } from "@/lib/portal/portalRowScope";
import { sqcmFromVariant } from "@/lib/virtualWarehouse/sqcmFromVariant";
import { shipNowQtyForLine } from "@/lib/virtualWarehouse/shipNowQty";
import { portalUserHasVirtualWarehouseAccess } from "@/lib/portal/portalVirtualWarehouseAccess";

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Parse account_pricing.virtual_sqcm_balance (numeric in DB; tolerate comma-formatted strings). */
function parseSqcmPool(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, v);
  const s = String(v ?? "")
    .trim()
    .replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function isVwBulkDepositLine(desc: unknown): boolean {
  return safeStr(desc).startsWith("Virtual warehouse bulk purchase");
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

function metaFromVariantRow(pv: any): {
  product_id: string | null;
  sku: string;
  size_label: string | null;
  product_name: string | null;
  product_code: string | null;
  product_qcode: string | null;
  total_sqcm: number;
} {
  const prod = pv.products && typeof pv.products === "object" ? pv.products : null;
  const pname = prod?.name ? String(prod.name) : null;
  const pcode = prod?.code != null ? String(prod.code) : null;
  const pqcode = prod?.qcode != null ? String(prod.qcode) : null;
  const direct = Number(pv.total_sqcm);
  let per = Number.isFinite(direct) && direct > 0 ? direct : 0;
  if (per <= 0) {
    const w = Number(pv.width_cm);
    const l = Number(pv.length_cm);
    if (Number.isFinite(w) && Number.isFinite(l) && w > 0 && l > 0) per = w * l;
  }
  return {
    product_id: pv.product_id ? String(pv.product_id) : null,
    sku: String(pv.sku ?? ""),
    size_label: pv.size_label ? String(pv.size_label) : null,
    product_name: pname,
    product_code: pcode,
    product_qcode: pqcode,
    total_sqcm: per,
  };
}

/** Max whole units of this SKU if the entire fungible pool were spent on it alone (UI hint; real cap is shared via sqcm_pool). */
function soloMaxUnits(sqcmPool: number, perUnitSqcm: number): number {
  if (sqcmPool <= 0 || perUnitSqcm <= 0) return 0;
  return Math.max(0, Math.floor(sqcmPool / perUnitSqcm));
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

  const { data: pricing, error: prErr } = await sb
    .from("account_pricing")
    .select("virtual_warehouse_enabled, virtual_sqcm_balance")
    .eq("account_id", accountId)
    .maybeSingle();

  if (prErr) return NextResponse.json({ ok: false, error: prErr.message }, { status: 500 });

  if (!(pricing as any)?.virtual_warehouse_enabled) {
    return NextResponse.json({ ok: false, error: "Virtual warehouse is not enabled for this account." }, { status: 403 });
  }

  const vwUserOk = await portalUserHasVirtualWarehouseAccess(sb, String(accountId), portalUserId);
  if (!vwUserOk) {
    return NextResponse.json({ ok: false, error: "Virtual warehouse access is not enabled for your user." }, { status: 403 });
  }

  const sqcmPool = parseSqcmPool((pricing as any)?.virtual_sqcm_balance);
  const sqcmPoolJson = sqcmPool;

  /**
   * Second pie slice (not double-counting pool balance): sq cm committed outside the fungible pool remainder —
   * placed VW-shipment orders (total_sqcm debited at confirm) + bulk orders' ship-now line sq cm (qty − vw_qty) × per.
   * Do NOT add bulk "headroom" here: that amount is already credited into virtual_sqcm_balance (on hand).
   */
  let sqcmVwUsed = 0;
  let vwPlacedQ = sb
    .from("orders")
    .select("total_sqcm")
    .eq("account_id", accountId)
    .eq("virtual_warehouse_shipment", true)
    .not("placed_at", "is", null);
  const scopedVwPlaced = await applyPortalOrdersScope(sb, vwPlacedQ, accountId, portalUserId, ctx.currentRole);
  const { data: vwPlaced } = await scopedVwPlaced.query.limit(5000);
  for (const row of vwPlaced ?? []) {
    const t = Number((row as any)?.total_sqcm);
    if (Number.isFinite(t) && t > 0) sqcmVwUsed += t;
  }

  /**
   * Bulk orders credit the fungible pool on payment as:
   * - headroom: bulk_contract_sqcm − Σ(per×qty) on non-deposit PRODUCT lines (see creditBulkHeadroomToAccountInventory)
   * - line VW: Σ(per×virtual_warehouse_qty) on those lines (see applyVirtualWarehouseCreditsForPaidInvoice)
   * The pie "VW used" must include both; line-only sum misses headroom when vw_qty is 0 in DB (portal form default).
   */
  let bulkPlacedQ = sb
    .from("orders")
    .select("id, bulk_contract_sqcm")
    .eq("account_id", accountId)
    .eq("bulk_mode", true)
    .eq("virtual_warehouse_shipment", false)
    .not("status", "eq", "DRAFT");
  const scopedBulkPlaced = await applyPortalOrdersScope(sb, bulkPlacedQ, accountId, portalUserId, ctx.currentRole);
  const { data: bulkPlaced } = await scopedBulkPlaced.query.limit(5000);

  const bulkOrderIds: string[] = ((bulkPlaced ?? []) as Array<{ id?: unknown }>)
    .map((o) => String(o?.id ?? ""))
    .filter((id): id is string => UUID_RE.test(id));
  const contractByOrderId = new Map<string, number>();
  for (const o of bulkPlaced ?? []) {
    const id = String((o as any).id);
    if (!UUID_RE.test(id)) continue;
    contractByOrderId.set(id, Math.max(0, safeNum((o as any).bulk_contract_sqcm)));
  }

  if (bulkOrderIds.length) {
    const { data: bulkItems, error: bulkItemsErr } = await sb
      .from("order_items")
      .select("order_id, description, quantity, virtual_warehouse_qty, line_type, product_variant_id")
      .in("order_id", bulkOrderIds)
      .limit(10000);
    if (bulkItemsErr) return NextResponse.json({ ok: false, error: bulkItemsErr.message }, { status: 500 });

    const itemsByOrder = new Map<string, any[]>();
    for (const it of bulkItems ?? []) {
      const oid = safeStr((it as any).order_id);
      if (!UUID_RE.test(oid)) continue;
      const list = itemsByOrder.get(oid) ?? [];
      list.push(it);
      itemsByOrder.set(oid, list);
    }

    const variantIds = Array.from(
      new Set(
        (bulkItems ?? [])
          .map((r: any) => safeStr((r as any).product_variant_id))
          .filter((id: string) => UUID_RE.test(id))
      )
    );
    const perByVid = new Map<string, number>();
    if (variantIds.length) {
      const { data: vrows } = await sb
        .from("product_variants")
        .select("id, total_sqcm, width_cm, length_cm, size_label")
        .in("id", variantIds);
      for (const v of vrows ?? []) {
        perByVid.set(String((v as any).id), sqcmFromVariant(v as any));
      }
    }

    for (const oid of bulkOrderIds) {
      const rows = itemsByOrder.get(oid) ?? [];
      for (const it of rows) {
        if (String((it as any).line_type ?? "").toUpperCase() !== "PRODUCT") continue;
        if (isVwBulkDepositLine((it as any).description)) continue;
        const vid = safeStr((it as any).product_variant_id);
        if (!UUID_RE.test(vid)) continue;
        const per = perByVid.get(vid) ?? 0;
        const shipQ = shipNowQtyForLine(it);
        sqcmVwUsed += per * shipQ;
      }
    }
  }

  const { data: bulkProducts } = await sb
    .from("products")
    .select("id")
    .eq("is_active", true)
    .eq("bulk_enabled", true)
    .limit(500);
  const bulkPids = (bulkProducts ?? []).map((p: any) => String(p.id)).filter(Boolean);

  let catalogVariants: any[] = [];
  if (bulkPids.length) {
    const { data: cv, error: cvErr } = await sb
      .from("product_variants")
      .select("id, sku, size_label, product_id, total_sqcm, width_cm, length_cm, products(name, code, qcode)")
      .eq("is_active", true)
      .eq("bulk_enabled", true)
      .in("product_id", bulkPids)
      .limit(2000);
    if (cvErr) return NextResponse.json({ ok: false, error: cvErr.message }, { status: 500 });
    catalogVariants = cv ?? [];
  }

  const catalogIdSet = new Set(catalogVariants.map((v: any) => String(v.id)));

  const { data: invRows } = await sb
    .from("account_virtual_inventory")
    .select("product_variant_id, updated_at")
    .eq("account_id", accountId)
    .limit(2000);

  const updatedAtByVariant = new Map<string, string | null>();
  for (const r of invRows ?? []) {
    const id = String((r as any).product_variant_id ?? "");
    if (!id) continue;
    updatedAtByVariant.set(id, (r as any).updated_at ?? null);
  }

  const invIds: string[] = [
    ...new Set(
      ((invRows ?? []) as any[]).map((r: any) => String(r.product_variant_id ?? "")).filter((x: string) => x.length > 0)
    ),
  ];
  const orphanIds = invIds.filter((id: string) => !catalogIdSet.has(id));

  const metaById: Record<string, ReturnType<typeof metaFromVariantRow>> = {};
  for (const v of catalogVariants) {
    const m = metaFromVariantRow(v);
    metaById[String((v as any).id)] = m;
  }
  if (orphanIds.length) {
    const { data: vorph } = await sb
      .from("product_variants")
      .select("id, sku, size_label, product_id, total_sqcm, width_cm, length_cm, products(name, code, qcode)")
      .in("id", orphanIds);
    for (const v of vorph ?? []) {
      metaById[String((v as any).id)] = metaFromVariantRow(v);
    }
  }

  function rowFrom(id: string, m: ReturnType<typeof metaFromVariantRow>) {
    const per = m.total_sqcm > 0 ? m.total_sqcm : 0;
    const qty = soloMaxUnits(sqcmPool, per);
    return {
      product_variant_id: id,
      product_id: m.product_id,
      quantity: qty,
      sku: m.sku,
      size_label: m.size_label,
      product_name: m.product_name,
      product_code: m.product_code,
      product_qcode: m.product_qcode,
      sqcm_per_unit: m.total_sqcm > 0 ? m.total_sqcm : null,
      line_sqcm: per > 0 ? per * qty : null,
      updated_at: updatedAtByVariant.get(id) ?? null,
    };
  }

  const balances: ReturnType<typeof rowFrom>[] = [];
  for (const v of catalogVariants) {
    const id = String((v as any).id);
    const m = metaById[id];
    if (!m) continue;
    balances.push(rowFrom(id, m));
  }

  balances.sort((a, b) => {
    const an = String(a.product_name ?? "");
    const bn = String(b.product_name ?? "");
    const c = an.localeCompare(bn);
    if (c !== 0) return c;
    return String(a.sku).localeCompare(String(b.sku));
  });

  for (const id of orphanIds) {
    const m = metaById[id];
    if (!m) continue;
    balances.push(rowFrom(id, m));
  }

  return NextResponse.json({
    ok: true,
    balances,
    sqcm_pool: sqcmPoolJson,
    total_sqcm_on_hand: sqcmPoolJson,
    sqcm_vw_used: Math.round(sqcmVwUsed * 10000) / 10000,
  });
}
