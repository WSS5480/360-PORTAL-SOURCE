import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { getBulkMatchingRule, normalizeBulkRules } from "@/lib/bulkRules";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function sqcmFromVariant(v: any): number {
  const direct = safeNum(v?.total_sqcm);
  if (direct > 0) return direct;
  const w = safeNum(v?.width_cm);
  const l = safeNum(v?.length_cm);
  if (w > 0 && l > 0) return w * l;
  const s = safeStr(v?.size_label).toLowerCase().replace(/\s+/g, "");
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)(?:cm)?$/i);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) return a * b;
  }
  return 0;
}

function isVirtualWarehouseBulkDepositLine(it: any): boolean {
  return safeStr(it?.description).startsWith("Virtual warehouse bulk purchase");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  await requireOrdersStaffOrAdmin();
  const resolved = await Promise.resolve(params as any);
  const orderId = safeStr(resolved?.orderId ?? "");
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }

  const { data: order, error: ordErr } = await supabaseAdmin
    .from("orders")
    .select("id, account_id, status, bulk_mode, total_sqcm, bulk_contract_sqcm")
    .eq("id", orderId)
    .maybeSingle();
  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

  const accountId = safeStr((order as any).account_id);
  if (!UUID_RE.test(accountId)) {
    return NextResponse.json({ ok: false, error: "Order account invalid." }, { status: 400 });
  }

  const { data: pricingRow } = await supabaseAdmin
    .from("account_pricing")
    .select("bulk_enabled, bulk_rules")
    .eq("account_id", accountId)
    .maybeSingle();

  const bulkEnabled = !!pricingRow?.bulk_enabled;
  const bulkRules = normalizeBulkRules((pricingRow?.bulk_rules as any) || []);
  if (!bulkEnabled || !bulkRules.length) {
    return NextResponse.json({ ok: false, error: "Bulk rules are not enabled for this account." }, { status: 400 });
  }

  const { data: items, error: itemErr } = await supabaseAdmin
    .from("order_items")
    .select("id, product_variant_id, quantity, line_type, description, unit_price, line_total, discount_percent")
    .eq("order_id", orderId);
  if (itemErr) return NextResponse.json({ ok: false, error: itemErr.message }, { status: 500 });

  const productLines = (items ?? []).filter((it: any) => safeStr(it?.line_type).toUpperCase() !== "SHIPPING");
  const variantIds = Array.from(new Set(productLines.map((x: any) => safeStr(x.product_variant_id)).filter(Boolean)));
  const { data: variants, error: varErr } = await supabaseAdmin
    .from("product_variants")
    .select("id, product_id, base_unit_price, width_cm, length_cm, total_sqcm, size_label")
    .in("id", variantIds as any);
  if (varErr) return NextResponse.json({ ok: false, error: varErr.message }, { status: 500 });

  const byVariantId = new Map<string, any>((variants ?? []).map((v: any) => [safeStr(v.id), v]));

  const bulkContractOrder = safeNum((order as any).bulk_contract_sqcm);
  const hasVwBulkDepositLine = productLines.some((it: any) => isVirtualWarehouseBulkDepositLine(it));

  let computedSqcm = 0;
  if (hasVwBulkDepositLine && bulkContractOrder > 0) {
    computedSqcm = bulkContractOrder;
  } else {
    for (const it of productLines as any[]) {
      const v = byVariantId.get(safeStr(it.product_variant_id));
      const qty = safeNum(it.quantity);
      computedSqcm += sqcmFromVariant(v) * qty;
    }
  }

  const bulkRuleGlobal = getBulkMatchingRule(computedSqcm, bulkRules, null);
  if (hasVwBulkDepositLine && !bulkRuleGlobal) {
    return NextResponse.json(
      { ok: false, error: "No all-products bulk price tier matched this order." },
      { status: 400 }
    );
  }

  for (const it of productLines as any[]) {
    if (isVirtualWarehouseBulkDepositLine(it)) continue;
    if (hasVwBulkDepositLine && bulkContractOrder > 0 && safeNum(it.unit_price) === 0 && safeNum(it.line_total) === 0) {
      continue;
    }
    const v = byVariantId.get(safeStr(it.product_variant_id));
    const lineRule = getBulkMatchingRule(computedSqcm, bulkRules, v?.product_id ?? null);
    if (!lineRule) {
      return NextResponse.json({ ok: false, error: "No bulk price tier matched a product on this order." }, { status: 400 });
    }
  }

  if (!hasVwBulkDepositLine && productLines.length === 0 && !bulkRuleGlobal) {
    return NextResponse.json({ ok: false, error: "No bulk price tier matched this order." }, { status: 400 });
  }

  const P = bulkRuleGlobal?.price_per_sqcm ?? null;

  let subtotal = 0;

  for (const it of productLines as any[]) {
    if (isVirtualWarehouseBulkDepositLine(it)) {
      const bc = bulkContractOrder > 0 ? bulkContractOrder : computedSqcm;
      const lineTotal = (P ?? 0) * bc;
      subtotal += lineTotal;
      const { error: upItErr } = await supabaseAdmin
        .from("order_items")
        .update({
          unit_price: lineTotal,
          discount_percent: 0,
          line_total: lineTotal,
        })
        .eq("id", it.id);
      if (upItErr) return NextResponse.json({ ok: false, error: upItErr.message }, { status: 500 });
      continue;
    }

    if (hasVwBulkDepositLine && bulkContractOrder > 0 && safeNum(it.unit_price) === 0 && safeNum(it.line_total) === 0) {
      continue;
    }

    const v = byVariantId.get(safeStr(it.product_variant_id));
    const perSq = sqcmFromVariant(v);
    const qty = safeNum(it.quantity);
    const lineRule = getBulkMatchingRule(computedSqcm, bulkRules, v?.product_id ?? null)!;
    const unitAtTier = perSq > 0 ? lineRule.price_per_sqcm * perSq : 0;
    const lineTotal = unitAtTier * qty;
    subtotal += lineTotal;

    const { error: upItErr } = await supabaseAdmin
      .from("order_items")
      .update({
        unit_price: unitAtTier,
        discount_percent: 0,
        line_total: lineTotal,
      })
      .eq("id", it.id);
    if (upItErr) return NextResponse.json({ ok: false, error: upItErr.message }, { status: 500 });
  }

  const shippingTotal = 0;
  const total = subtotal + shippingTotal;

  const { error: upErr } = await supabaseAdmin
    .from("orders")
    .update({
      bulk_mode: true,
      total_sqcm: computedSqcm,
      discount_percent_snapshot: 0,
      bulk_price_per_sqcm_snapshot: P,
      subtotal,
      shipping_total: shippingTotal,
      total,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  const back = urlFromRequest(req, `/admin/orders/${encodeURIComponent(orderId)}?bulk=1`);
  return NextResponse.redirect(back, { status: 303 });
}
