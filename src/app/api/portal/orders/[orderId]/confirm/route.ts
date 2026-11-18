// src/app/api/portal/orders/[orderId]/confirm/route.ts
import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { canCreateOrders } from "@/lib/portal/portalRoles";
import { formatCentralTime, sendOrderEmails } from "@/lib/orders/orderEmails";
import { aggregateInventoryNeed, findInventoryShortages } from "@/lib/orders/inventoryCheck";
import { INVOICE_KIND_PRIMARY } from "@/lib/billing/invoiceKinds";
import { issuePortalInvoiceForOrder } from "@/lib/billing/issuePortalInvoiceForOrder";
import { invoiceMeetsVirtualWarehouseBulkPrepayment } from "@/lib/virtualWarehouse/vwBulkPrepaymentGate";
import {
  getVirtualSqcmBalance,
  incrementVirtualSqcmBalance,
  trySubtractVirtualSqcmBalance,
} from "@/lib/virtualWarehouse/virtualSqcmBalance";
import { getBulkMatchingRule, normalizeBulkRules } from "@/lib/bulkRules";
import { isPortalOrderRowViewable } from "@/lib/portal/portalRowScope";
import { portalUserHasVirtualWarehouseAccess } from "@/lib/portal/portalVirtualWarehouseAccess";
import { accountIsDemo } from "@/lib/accounts/demoAccount";

export const dynamic = "force-dynamic";

// ✅ Keep the correct UUID regex (your “double [89ab] block” version is wrong)
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

/** Portal VW-only bulk orders: one line priced from bulk_contract_sqcm (see POST /api/portal/orders). */
function isVirtualWarehouseBulkDepositLine(it: any): boolean {
  return safeStr(it?.description).startsWith("Virtual warehouse bulk purchase");
}


export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;

  if (!accountId) {
    return NextResponse.json({ ok: false, error: "No account selected." }, { status: 400 });
  }

  if (!canCreateOrders(ctx.currentRole)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { orderId } = await Promise.resolve(params);
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }

  const sb: any = createSupabaseAdminClient();

  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select(
      "id, account_id, order_number, status, placed_at, locked_at, subtotal, shipping_total, total, invoice_address, delivery_address, discount_percent_snapshot, bulk_price_per_sqcm_snapshot, submitted_by_contact_id, created_by_user_id, bulk_mode, total_sqcm, bulk_contract_sqcm, virtual_warehouse_shipment"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (String(order.account_id) !== String(accountId)) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const portalUserId = String((ctx.user as any)?.id ?? "");
  const viewable = await isPortalOrderRowViewable(sb, accountId, portalUserId, ctx.currentRole, order as any);
  if (!viewable) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const statusUpper = safeUpper(order.status);

  // Idempotent (do not use placed_at alone — VW orders get placed_at when invoiced, before payment)
  if (
    statusUpper === "CONFIRMED" ||
    statusUpper === "LOCKED" ||
    statusUpper === "PAID" ||
    statusUpper === "FULFILLING" ||
    statusUpper === "COMPLETED"
  ) {
    const back = new URL(`/portal/orders/${encodeURIComponent(orderId)}`, new URL(req.url).origin);
    return NextResponse.redirect(back);
  }

  if (statusUpper !== "DRAFT" && statusUpper !== "INVOICED") {
    return NextResponse.json(
      { ok: false, error: `This order cannot be confirmed (current: ${order.status}).` },
      { status: 400 }
    );
  }

  const isDemoAccount = await accountIsDemo(accountId);

  const isVwShipmentOrder = !!(order as any).virtual_warehouse_shipment;

  if (isVwShipmentOrder) {
    const { data: vwItems, error: vwItemErr } = await sb
      .from("order_items")
      .select("id, product_variant_id, quantity, line_type")
      .eq("order_id", orderId)
      .order("sort_order", { ascending: true });

    if (vwItemErr) return NextResponse.json({ ok: false, error: vwItemErr.message }, { status: 500 });

    const vwProductLines = (vwItems ?? []).filter((it: any) => {
      const lt = safeUpper(it.line_type);
      const vid = safeStr(it.product_variant_id);
      return lt === "PRODUCT" && !!vid && UUID_RE.test(vid);
    });

    if (vwProductLines.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No product line items found. Please add items before submitting." },
        { status: 400 }
      );
    }

    const vwVariantIds = Array.from(
      new Set(
        (vwProductLines as any[])
          .map((it) => safeStr(it.product_variant_id))
          .filter((id) => UUID_RE.test(id))
      )
    );

    const { data: vwVariants, error: vwVarErr } = await sb
      .from("product_variants")
      .select("id, total_sqcm, width_cm, length_cm, size_label")
      .in("id", vwVariantIds as any);

    if (vwVarErr) return NextResponse.json({ ok: false, error: vwVarErr.message }, { status: 500 });

    const vwById = new Map<string, any>((vwVariants ?? []).map((v: any) => [String(v.id), v]));

    let needSqcm = 0;
    for (const it of vwProductLines as any[]) {
      const vid = safeStr(it.product_variant_id);
      const qty = safeNum(it.quantity);
      if (!vid || !UUID_RE.test(vid) || qty <= 0) continue;
      needSqcm += sqcmFromVariant(vwById.get(vid)) * qty;
    }

    const pool = await getVirtualSqcmBalance(sb, String(accountId));
    if (!isDemoAccount && needSqcm > pool + 0.01) {
      return NextResponse.json(
        {
          ok: false,
          error: "Insufficient virtual warehouse sq cm balance for this order.",
        },
        { status: 400 }
      );
    }

    if (!isDemoAccount) {
      const debited = await trySubtractVirtualSqcmBalance(sb, String(accountId), needSqcm);
      if (!debited) {
        return NextResponse.json(
          {
            ok: false,
            error: "Insufficient virtual warehouse sq cm balance for this order.",
          },
          { status: 400 }
        );
      }
    }

    const nowVw = new Date();
    const submittedAtVw = formatCentralTime(nowVw);
    const actorUserIdVw = (ctx.user as any)?.id ?? null;
    const actorEmailVw = (ctx.user as any)?.email ?? null;

    const { error: updVwErr } = await sb
      .from("orders")
      .update({ status: "CONFIRMED", placed_at: nowVw })
      .eq("id", orderId);

    if (updVwErr) {
      try {
        await incrementVirtualSqcmBalance(sb, String(accountId), needSqcm);
      } catch (e) {
        console.error("[VW_CONFIRM] rollback sq cm failed", e);
      }
      return NextResponse.json({ ok: false, error: updVwErr.message }, { status: 500 });
    }

    try {
      await sb.from("order_status_events").insert({
        order_id: orderId,
        from_status: "DRAFT",
        to_status: "CONFIRMED",
        changed_by_user_id: actorUserIdVw,
        comment: "Virtual warehouse ship request submitted",
      });
    } catch {}

    try {
      await sb.from("audit_events").insert({
        account_id: accountId,
        actor_user_id: actorUserIdVw,
        action: "ORDER_CONFIRMED",
        resource_type: "order",
        resource_id: orderId,
        metadata: { order_number: order.order_number, virtual_warehouse_shipment: true },
      });
    } catch {}

    try {
      let submittedBy = actorEmailVw ?? actorUserIdVw ?? "—";
      let customerEmail = actorEmailVw ?? "";
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
        submittedAt: submittedAtVw,
        submittedBy,
        customerEmail,
        adminUrl: adminOrderUrl,
        portalUrl: portalOrderUrl,
        skipEmails: isDemoAccount,
      });
    } catch (e: any) {
      console.error("[ORDER_NOTIFY] failed", e?.message ?? e);
    }

    const backVw = new URL(`/portal/orders/${encodeURIComponent(orderId)}`, new URL(req.url).origin);
    return NextResponse.redirect(backVw);
  }

  // ✅ Pull account discount + sync snapshot (and if needed, recompute pricing)
  const { data: acct, error: acctErr } = await sb
    .from("accounts")
    .select("name, billing_email, discount_percent")
    .eq("id", accountId)
    .maybeSingle();

  if (acctErr) return NextResponse.json({ ok: false, error: acctErr.message }, { status: 500 });

  // Load items (we already do this for inventory check; expand selection to include unit_price/line_total)
  const { data: items, error: itemErr } = await sb
    .from("order_items")
    .select(
      "id, product_variant_id, quantity, line_type, description, sort_order, unit_price, discount_percent, line_total, virtual_warehouse_qty"
    )
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

  const accountDiscount = clampDiscount(acct?.discount_percent ?? 0);
  const { data: pricingRow } = await sb
    .from("account_pricing")
    .select("bulk_enabled, bulk_rules, virtual_warehouse_enabled")
    .eq("account_id", accountId)
    .maybeSingle();
  const bulkEnabled = !!pricingRow?.bulk_enabled;
  const virtualWarehouseEnabled = await portalUserHasVirtualWarehouseAccess(sb, String(accountId), portalUserId);
  const bulkRules = normalizeBulkRules((pricingRow?.bulk_rules as any) || []);

  const pricingVariantIds = Array.from(new Set(productLines.map((x: any) => String(x.product_variant_id)).filter(Boolean)));
  const { data: variants, error: varErr } = await sb
    .from("product_variants")
    .select("id, product_id, base_unit_price, width_cm, length_cm, total_sqcm, size_label")
    .in("id", pricingVariantIds);

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

  // If discount changed, recompute product line totals from current variant base prices to ensure correctness.
  if (shouldReprice) {
    const baseById = new Map<string, number>();
    for (const v of byVariantId.values()) {
      const id = String((v as any).id);
      const base = Number((v as any).base_unit_price ?? 0);
      baseById.set(id, Number.isFinite(base) ? base : 0);
    }

    const repricingTasks = productLines.map(async (it: any) => {
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
          if (upDepErr) throw new Error(upDepErr.message);
          return;
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
          if (upFreeErr) throw new Error(upFreeErr.message);
          return;
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
        if (upItErr) throw new Error(upItErr.message);
        return;
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
        if (upDepErr) throw new Error(upDepErr.message);
        return;
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
        if (upFreeErr) throw new Error(upFreeErr.message);
        return;
      }

      const baseFromVariant = baseById.get(vid);
      const unitPriceRaw = Number(it.unit_price ?? 0);
      const baseFromItem = Number.isFinite(unitPriceRaw) ? unitPriceRaw : 0;

      const base: number =
        typeof baseFromVariant === "number" && Number.isFinite(baseFromVariant)
          ? baseFromVariant
          : baseFromItem;

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

      if (upItErr) throw new Error(upItErr.message);
    });

    try {
      await Promise.all(repricingTasks);
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message || "Failed to update line items" }, { status: 500 });
    }

    // Recompute totals from DB rows (reload minimal)
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

  // ✅ Inventory sufficiency check (read-only, bulk-aware)
  const needByVariant = aggregateInventoryNeed(productLines as any[], "ship_now", {
    skipLine: isVirtualWarehouseBulkDepositLine,
  });

  const invVariantIds = Array.from(needByVariant.keys());
  const { data: invRows, error: invErr } = await sb
    .from("product_variant_inventory")
    .select("variant_id, qty_on_hand")
    .in("variant_id", invVariantIds);

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

  /** VW + bulk + positive contract: pay bulk invoice before confirm (line-level vw_qty no longer required). */
  const needsVwBulkPrepay =
    !isDemoAccount && !!(order as any).bulk_mode && virtualWarehouseEnabled && bulkContractOrder > 0;

  const isAjaxConfirm = safeStr(req.headers.get("x-portal-order-confirm")).toLowerCase() === "1";

  let vwBulkInvoiceId = "";

  if (needsVwBulkPrepay) {
    const actorForInvoice = (ctx.user as any)?.id ?? null;
    const { data: invExisting } = await sb
      .from("invoices")
      .select("id")
      .eq("order_id", orderId)
      .eq("invoice_kind", INVOICE_KIND_PRIMARY)
      .maybeSingle();
    let invoiceId = invExisting?.id ? String(invExisting.id) : "";

    if (!invoiceId) {
      const issued = await issuePortalInvoiceForOrder(sb, orderId, actorForInvoice);
      if (!issued.ok) {
        return NextResponse.json({ ok: false, error: issued.error }, { status: 500 });
      }
      invoiceId = issued.invoiceId;
      const placedStamp = new Date().toISOString();
      await sb
        .from("orders")
        .update({
          status: "INVOICED",
          placed_at: (order as any).placed_at ?? placedStamp,
        })
        .eq("id", orderId);
    }

    const payOk = await invoiceMeetsVirtualWarehouseBulkPrepayment(sb, invoiceId);
    if (!payOk) {
      const payUrl = new URL(`/portal/invoices/${encodeURIComponent(invoiceId)}/pay`, new URL(req.url).origin);
      payUrl.searchParams.set(
        "return_to",
        `/portal/orders/${encodeURIComponent(orderId)}?autosubmit=1`
      );
      if (isAjaxConfirm) {
        return NextResponse.json(
          {
            ok: false,
            code: "NEEDS_PAYMENT",
            invoice_id: invoiceId,
            pay_url: payUrl.toString(),
          },
          { status: 402 }
        );
      }
      return NextResponse.redirect(payUrl);
    }
    vwBulkInvoiceId = invoiceId;
  }

  const now = new Date();
  const submittedAt = formatCentralTime(now);
  const actorUserId = (ctx.user as any)?.id ?? null;
  const actorEmail = (ctx.user as any)?.email ?? null;

  let nextOrderStatus = "CONFIRMED";
  if (needsVwBulkPrepay && vwBulkInvoiceId) {
    const { data: invRow } = await sb
      .from("invoices")
      .select("status")
      .eq("id", vwBulkInvoiceId)
      .maybeSingle();
    if (safeUpper((invRow as any)?.status) === "PAID") {
      nextOrderStatus = "PAID";
    }
  }

  const fromStatusForEvent = statusUpper;

  const { error: updErr } = await sb
    .from("orders")
    .update({ status: nextOrderStatus, placed_at: (order as any).placed_at ?? now })
    .eq("id", orderId);

  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

  // Status history (best-effort)
  try {
    await sb.from("order_status_events").insert({
      order_id: orderId,
      from_status: fromStatusForEvent,
      to_status: nextOrderStatus,
      changed_by_user_id: actorUserId,
      comment: "Submitted by portal user",
    });
  } catch {}

  // Audit (best-effort)
  try {
    await sb.from("audit_events").insert({
      account_id: accountId,
      actor_user_id: actorUserId,
      action: "ORDER_CONFIRMED",
      resource_type: "order",
      resource_id: orderId,
      metadata: { order_number: order.order_number, discount_percent: accountDiscount },
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
      submittedAt,
      submittedBy,
      customerEmail,
      adminUrl: adminOrderUrl,
      portalUrl: portalOrderUrl,
      skipEmails: isDemoAccount,
    });
  } catch (e: any) {
    console.error("[ORDER_NOTIFY] failed", e?.message ?? e);
  }

  const back = new URL(`/portal/orders/${encodeURIComponent(orderId)}`, new URL(req.url).origin);
  return NextResponse.redirect(back);
}
