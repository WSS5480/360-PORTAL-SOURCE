import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getBulkMatchingRule, normalizeBulkRules } from "@/lib/bulkRules";
import { formatCentralTime, sendOrderEmails } from "@/lib/orders/orderEmails";
import { aggregateInventoryNeed, findInventoryShortages } from "@/lib/orders/inventoryCheck";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeUpper(v: unknown) {
  return String(v ?? "").toUpperCase();
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function safeNum(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function clampDiscount(v: unknown): number {
  const n = safeNum(v);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n * 100) / 100;
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
  const ctx = await requireOrdersStaffOrAdmin();
  const { orderId } = await Promise.resolve(params);
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }

  const sb: any = createSupabaseAdminClient();

  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select(
      "id, account_id, order_number, status, placed_at, locked_at, subtotal, shipping_total, total, invoice_address, delivery_address, discount_percent_snapshot, bulk_price_per_sqcm_snapshot, submitted_by_contact_id, bulk_mode, total_sqcm, bulk_contract_sqcm"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const statusUpper = safeUpper(order.status);
  if (statusUpper === "CONFIRMED" || statusUpper === "LOCKED" || order.placed_at) {
    const back = new URL(`/admin/orders/${encodeURIComponent(orderId)}`, new URL(req.url).origin);
    return NextResponse.redirect(back);
  }

  if (statusUpper !== "DRAFT") {
    return NextResponse.json(
      { ok: false, error: `Only DRAFT orders can be confirmed (current: ${order.status}).` },
      { status: 400 }
    );
  }

  const accountId = String(order.account_id || "");
  if (!UUID_RE.test(accountId)) {
    return NextResponse.json({ ok: false, error: "Order account invalid." }, { status: 400 });
  }

  const { data: acct, error: acctErr } = await sb
    .from("accounts")
    .select("name, billing_email, discount_percent, is_demo")
    .eq("id", accountId)
    .maybeSingle();

  if (acctErr) return NextResponse.json({ ok: false, error: acctErr.message }, { status: 500 });
  const isDemoAccount = !!(acct as { is_demo?: boolean | null } | null)?.is_demo;

  const accountDiscount = clampDiscount(acct?.discount_percent ?? 0);
  const { data: pricingRow } = await sb
    .from("account_pricing")
    .select("bulk_enabled, bulk_rules")
    .eq("account_id", accountId)
    .maybeSingle();
  const bulkEnabled = !!pricingRow?.bulk_enabled;
  const bulkRules = normalizeBulkRules((pricingRow?.bulk_rules as any) || []);

  const { data: items, error: itemErr } = await sb
    .from("order_items")
    .select("id, product_variant_id, quantity, line_type, description, sort_order, unit_price, discount_percent, line_total")
    .eq("order_id", orderId)
    .order("sort_order", { ascending: true });

  if (itemErr) return NextResponse.json({ ok: false, error: itemErr.message }, { status: 500 });

  const productLines = (items ?? []).filter((it: any) => {
    const lt = safeUpper(it.line_type);
    const vid = safeStr(it.product_variant_id);
    return lt === "PRODUCT" && !!vid && UUID_RE.test(vid);
  });

  if (productLines.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No product line items found. Please add items before submitting." },
      { status: 400 }
    );
  }

  const variantIds = Array.from(new Set(productLines.map((x: any) => String(x.product_variant_id)).filter(Boolean)));
  const { data: variants, error: varErr } = await sb
    .from("product_variants")
    .select("id, product_id, base_unit_price, width_cm, length_cm, total_sqcm, size_label")
    .in("id", variantIds);
  if (varErr) return NextResponse.json({ ok: false, error: varErr.message }, { status: 500 });

  const byVariantId = new Map<string, any>();
  for (const v of variants ?? []) {
    byVariantId.set(String((v as any).id), v);
  }

  const bulkContractOrder = safeNum((order as any).bulk_contract_sqcm);
  const hasVwBulkDepositLine = productLines.some((it: any) => isVirtualWarehouseBulkDepositLine(it));

  let computedSqcm = 0;
  if (hasVwBulkDepositLine && bulkContractOrder > 0) {
    computedSqcm = bulkContractOrder;
  } else {
    for (const it of productLines as any[]) {
      const v = byVariantId.get(String(it.product_variant_id));
      const qty = safeNum(it.quantity);
      computedSqcm += sqcmFromVariant(v) * qty;
    }
  }

  const totalSqcm = computedSqcm;
  const bulkRule =
    bulkEnabled && (order as any).bulk_mode ? getBulkMatchingRule(totalSqcm, bulkRules, null) : null;

  if (bulkEnabled && (order as any).bulk_mode) {
    if (hasVwBulkDepositLine && !bulkRule) {
      return NextResponse.json(
        { ok: false, error: "No all-products bulk price tier matched this order. Adjust bulk rules or line quantities." },
        { status: 400 }
      );
    }
    for (const it of productLines as any[]) {
      if (isVirtualWarehouseBulkDepositLine(it)) continue;
      if (hasVwBulkDepositLine && bulkContractOrder > 0 && safeNum(it.unit_price) === 0 && safeNum(it.line_total) === 0) {
        continue;
      }
      const v = byVariantId.get(String(it.product_variant_id));
      if (!getBulkMatchingRule(totalSqcm, bulkRules, v?.product_id ?? null)) {
        return NextResponse.json(
          { ok: false, error: "No bulk price tier matched a product on this order. Adjust bulk rules or line quantities." },
          { status: 400 }
        );
      }
    }
  }

  const effectiveDiscount = bulkEnabled && (order as any).bulk_mode ? null : accountDiscount;

  const currentSnap = clampDiscount(order.discount_percent_snapshot ?? 0);
  const currentBulkSnap = safeNum((order as any).bulk_price_per_sqcm_snapshot);
  const totalSqcmNeedsUpdate = Math.abs((Number((order as any).total_sqcm ?? 0) || 0) - totalSqcm) > 0.0001;

  const discountChanged = (order as any).bulk_mode
    ? Math.abs(currentBulkSnap - (bulkRule?.price_per_sqcm ?? currentBulkSnap)) > 0.00001 || totalSqcmNeedsUpdate
    : Math.abs(accountDiscount - currentSnap) > 0.00001 || totalSqcmNeedsUpdate;

  const lineDiscountMismatch = productLines.some((it: any) => {
    if ((order as any).bulk_mode) {
      if (isVirtualWarehouseBulkDepositLine(it)) {
        if (!bulkRule) return true;
        const bc = bulkContractOrder > 0 ? bulkContractOrder : totalSqcm;
        const exp = bulkRule.price_per_sqcm * bc;
        return Math.abs(safeNum(it.line_total) - exp) > 0.02;
      }
      if (hasVwBulkDepositLine && bulkContractOrder > 0 && safeNum(it.unit_price) === 0 && safeNum(it.line_total) === 0) {
        return false;
      }
      const v = byVariantId.get(String(it.product_variant_id));
      const lineRule = getBulkMatchingRule(totalSqcm, bulkRules, v?.product_id ?? null);
      if (!lineRule) return true;
      const perSq = sqcmFromVariant(v);
      const qty = safeNum(it.quantity);
      const exp = (perSq > 0 ? lineRule.price_per_sqcm * perSq : 0) * qty;
      return Math.abs(safeNum(it.discount_percent)) > 0.00001 || Math.abs(safeNum(it.line_total) - exp) > 0.02;
    }
    if (isVirtualWarehouseBulkDepositLine(it)) return false;
    if (hasVwBulkDepositLine && bulkContractOrder > 0) {
      const lineDisc = clampDiscount(it?.discount_percent ?? 0);
      const lt = Number(it?.line_total ?? 0);
      return Math.abs(lineDisc) > 0.00001 || Math.abs(lt) > 0.00001;
    }
    const lineDisc = clampDiscount(it?.discount_percent ?? 0);
    return Math.abs(lineDisc - (effectiveDiscount ?? 0)) > 0.00001;
  });
  const shouldReprice = discountChanged || lineDiscountMismatch;

  if (shouldReprice) {
    const baseById = new Map<string, number>();
    for (const v of byVariantId.values()) {
      const id = String((v as any).id);
      const base = Number((v as any).base_unit_price ?? 0);
      baseById.set(id, Number.isFinite(base) ? base : 0);
    }

    for (const it of productLines as any[]) {
      const vid = String(it.product_variant_id);

      if ((order as any).bulk_mode) {
        if (isVirtualWarehouseBulkDepositLine(it)) {
          const bc = bulkContractOrder > 0 ? bulkContractOrder : totalSqcm;
          const lineTotal = (bulkRule?.price_per_sqcm ?? 0) * bc;
          const { error: upDepErr } = await sb
            .from("order_items")
            .update({
              unit_price: lineTotal,
              discount_percent: 0,
              line_total: lineTotal,
            })
            .eq("id", it.id);
          if (upDepErr) return NextResponse.json({ ok: false, error: upDepErr.message }, { status: 500 });
          continue;
        }

        if (hasVwBulkDepositLine && bulkContractOrder > 0) {
          const { error: upFreeErr } = await sb
            .from("order_items")
            .update({
              unit_price: 0,
              discount_percent: 0,
              line_total: 0,
            })
            .eq("id", it.id);
          if (upFreeErr) return NextResponse.json({ ok: false, error: upFreeErr.message }, { status: 500 });
          continue;
        }

        const v = byVariantId.get(vid);
        const lineRule = getBulkMatchingRule(totalSqcm, bulkRules, v?.product_id ?? null);
        const perSq = sqcmFromVariant(v);
        const qty = safeNum(it.quantity);
        const unitAtTier = perSq > 0 && lineRule ? lineRule.price_per_sqcm * perSq : 0;
        const lineTotal = unitAtTier * qty;
        const { error: upItErr } = await sb
          .from("order_items")
          .update({
            unit_price: unitAtTier,
            discount_percent: 0,
            line_total: lineTotal,
          })
          .eq("id", it.id);
        if (upItErr) return NextResponse.json({ ok: false, error: upItErr.message }, { status: 500 });
        continue;
      }

      if (isVirtualWarehouseBulkDepositLine(it)) {
        const v = byVariantId.get(vid);
        const perSq = v ? sqcmFromVariant(v) : 0;
        const base = Number(v?.base_unit_price ?? 0) || 0;
        const bc = bulkContractOrder > 0 ? bulkContractOrder : totalSqcm;
        const unitPriceList = perSq > 0 ? (base * bc) / perSq : 0;
        const ed = effectiveDiscount ?? accountDiscount;
        const lineTotal = unitPriceList * (1 - ed / 100);
        const { error: upDepErr } = await sb
          .from("order_items")
          .update({
            unit_price: unitPriceList,
            discount_percent: ed,
            line_total: lineTotal,
          })
          .eq("id", it.id);
        if (upDepErr) return NextResponse.json({ ok: false, error: upDepErr.message }, { status: 500 });
        continue;
      }

      if (hasVwBulkDepositLine && bulkContractOrder > 0) {
        const { error: upFreeErr } = await sb
          .from("order_items")
          .update({
            unit_price: 0,
            discount_percent: 0,
            line_total: 0,
          })
          .eq("id", it.id);
        if (upFreeErr) return NextResponse.json({ ok: false, error: upFreeErr.message }, { status: 500 });
        continue;
      }

      const baseFromVariant = baseById.get(vid);
      const unitPriceRaw = Number(it.unit_price ?? 0);
      const baseFromItem = Number.isFinite(unitPriceRaw) ? unitPriceRaw : 0;
      const base: number =
        typeof baseFromVariant === "number" && Number.isFinite(baseFromVariant) ? baseFromVariant : baseFromItem;

      const qty = safeNum(it.quantity);
      const ed = effectiveDiscount ?? accountDiscount;
      const discountedUnit = base * (1 - ed / 100);
      const lineTotal = discountedUnit * qty;

      const { error: upItErr } = await sb
        .from("order_items")
        .update({
          unit_price: base,
          discount_percent: ed,
          line_total: lineTotal,
        })
        .eq("id", it.id);

      if (upItErr) return NextResponse.json({ ok: false, error: upItErr.message }, { status: 500 });
    }

    const { data: items2, error: itemErr2 } = await sb
      .from("order_items")
      .select("line_type, line_total")
      .eq("order_id", orderId);

    if (itemErr2) return NextResponse.json({ ok: false, error: itemErr2.message }, { status: 500 });

    const subtotal = (items2 ?? [])
      .filter((r: any) => safeUpper(r.line_type) === "PRODUCT")
      .reduce((s: number, r: any) => s + (Number(r.line_total) || 0), 0);

    const shippingTotal = (items2 ?? [])
      .filter((r: any) => safeUpper(r.line_type) === "SHIPPING")
      .reduce((s: number, r: any) => s + (Number(r.line_total) || 0), 0);

    const total = subtotal + shippingTotal;

    const { error: updSnapErr } = await sb
      .from("orders")
      .update({
        discount_percent_snapshot: (order as any).bulk_mode ? 0 : accountDiscount,
        bulk_price_per_sqcm_snapshot: (order as any).bulk_mode && bulkRule ? bulkRule.price_per_sqcm : null,
        total_sqcm: totalSqcm,
        subtotal,
        shipping_total: shippingTotal,
        total,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updSnapErr) return NextResponse.json({ ok: false, error: updSnapErr.message }, { status: 500 });
  }

  const needByVariant = aggregateInventoryNeed(productLines as any[], "full", {
    skipLine: isVirtualWarehouseBulkDepositLine,
  });

  const variantIdsForInv = Array.from(needByVariant.keys());
  const { data: invRows, error: invErr } = await sb
    .from("product_variant_inventory")
    .select("variant_id, qty_on_hand")
    .in("variant_id", variantIdsForInv);

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });

  const onHandByVariant = new Map<string, number>();
  for (const r of invRows ?? []) {
    onHandByVariant.set(safeStr((r as any).variant_id), safeNum((r as any).qty_on_hand));
  }

  const insuff = findInventoryShortages(needByVariant, onHandByVariant);

  if (insuff.length > 0 && !isDemoAccount) {
    return NextResponse.json(
      { ok: false, error: "Some items are no longer in stock for the requested quantities.", details: insuff },
      { status: 400 }
    );
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const actorUserId = ctx?.user?.id ?? null;
  const actorEmail = ctx?.user?.email ?? null;

  const { error: updErr } = await sb
    .from("orders")
    .update({ status: "CONFIRMED", placed_at: nowIso })
    .eq("id", orderId);

  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

  try {
    await sb.from("order_status_events").insert({
      order_id: orderId,
      from_status: "DRAFT",
      to_status: "CONFIRMED",
      changed_by_user_id: actorUserId,
      comment: "Submitted by admin",
    });
  } catch {}

  try {
    await sb.from("audit_events").insert({
      account_id: accountId,
      actor_user_id: actorUserId,
      action: "ORDER_CONFIRMED",
      resource_type: "order",
      resource_id: orderId,
      metadata: {
        order_number: order.order_number,
        discount_percent: accountDiscount,
        bulk_price_per_sqcm: bulkRule?.price_per_sqcm ?? null,
        bulk_mode: !!(order as any).bulk_mode,
        total_sqcm: totalSqcm,
      },
    });
  } catch {}

  try {
    let submittedBy = actorEmail ?? actorUserId ?? "—";
    let customerEmail = actorEmail ?? "";
    if ((order as any)?.submitted_by_contact_id) {
      const { data: contact } = await sb
        .from("account_contacts")
        .select("email, full_name")
        .eq("id", (order as any).submitted_by_contact_id)
        .maybeSingle();
      const cName = safeStr(contact?.full_name);
      const cEmail = safeStr(contact?.email);
      if (cName) submittedBy = cName;
      else if (cEmail) submittedBy = cEmail;
      if (cEmail) customerEmail = cEmail;
    }

    const origin = new URL(req.url).origin;
    const adminOrderUrl = new URL(`/admin/orders/${encodeURIComponent(orderId)}`, origin).toString();
    const portalOrderUrl = new URL(`/portal/orders/${encodeURIComponent(orderId)}`, origin).toString();
    await sendOrderEmails({
      sb,
      orderId,
      accountId,
      submittedAt: formatCentralTime(now),
      submittedBy,
      customerEmail,
      adminUrl: adminOrderUrl,
      portalUrl: portalOrderUrl,
      skipEmails: isDemoAccount,
    });
  } catch (e: any) {
    console.error("[ORDER_NOTIFY] failed", e?.message ?? e);
  }

  const back = new URL(`/admin/orders/${encodeURIComponent(orderId)}`, new URL(req.url).origin);
  return NextResponse.redirect(back);
}
