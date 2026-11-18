// src/app/api/admin/fulfillments/[fulfillmentId]/ship/route.ts
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  debitVirtualWarehouseForShippedFulfillment,
  validateVirtualWarehouseDebitForFulfillment,
} from "@/lib/virtualWarehouse/debitOnFulfillmentShipped";
import { INVOICE_KIND_PRIMARY } from "@/lib/billing/invoiceKinds";
import { issuePortalInvoiceForOrder } from "@/lib/billing/issuePortalInvoiceForOrder";
import { schedulePartnerFulfillmentSync } from "@/lib/integrations/outbound/schedulePartnerFulfillmentSync";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  return s.split("?")[0].split("#")[0].trim();
}

function safeUpper(v: unknown) {
  return String(v ?? "").toUpperCase();
}

function safeStr(v: any) {
  return typeof v === "string" ? v : "";
}

function safeBoolish(v: any): boolean {
  if (v === true) return true;
  if (v === 1 || v === "1") return true;
  if (typeof v === "string" && v.toLowerCase() === "true") return true;
  return false;
}

function safeNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function primaryInvoiceFinanciallyLocked(inv: { status?: unknown; amount_paid?: unknown; total?: unknown } | null): boolean {
  if (!inv) return false;
  const st = safeUpper(inv.status);
  if (st === "PAID") return true;
  const total = safeNum(inv.total);
  const paid = safeNum(inv.amount_paid);
  return total > 0 && paid + 0.02 >= total;
}

function parseMoneyOrNull(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;

  // allow "12", "12.3", "12.34"
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;

  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseNumOrNull(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return null;
}

// If any OPEN fulfillments remain, keep order FULFILLING.
// If none remain:
//  - if invoice exists => SENT
//  - else => NEEDS_INVOICE
async function updateOrderAfterFulfillmentClosed(sb: any, orderId: string) {
  if (!UUID_RE.test(orderId)) return { order_status: null as string | null, invoice_id: null as string | null };

  const [{ data: openAny }, { data: invoice }] = await Promise.all([
    sb
      .from("fulfillments")
      .select("id")
      .eq("order_id", orderId)
      .eq("status", "OPEN")
      .limit(1)
      .maybeSingle(),
    sb.from("invoices").select("id").eq("order_id", orderId).eq("invoice_kind", INVOICE_KIND_PRIMARY).maybeSingle(),
  ]);

  const invoiceId = invoice?.id ? String(invoice.id) : null;

  if (openAny?.id) {
    try {
      await sb.from("orders").update({ status: "FULFILLING" }).eq("id", orderId);
    } catch {}
    return { order_status: "FULFILLING", invoice_id: invoiceId };
  }

  const nextStatus = invoiceId ? "SENT" : "NEEDS_INVOICE";

  try {
    await sb.from("orders").update({ status: nextStatus }).eq("id", orderId);
  } catch {}

  return { order_status: nextStatus, invoice_id: invoiceId };
}

async function validateDropshipTraceComplete(sb: any, fulfillmentId: string) {
  const { data: items, error: iErr } = await sb
    .from("fulfillment_items")
    .select("id, required_qty")
    .eq("fulfillment_id", fulfillmentId)
    .limit(2000);

  if (iErr) throw new Error(iErr.message);

  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) throw new Error("No fulfillment lines found");

  const requiredByItem = new Map<string, number>();
  for (const r of rows) requiredByItem.set(String((r as any).id), safeNum((r as any).required_qty));

  const { data: traces, error: tErr } = await sb
    .from("fulfillment_item_trace")
    .select("fulfillment_item_id, qty")
    .eq("fulfillment_id", fulfillmentId)
    .limit(10000);

  if (tErr) throw new Error(tErr.message);

  const gotByItem = new Map<string, number>();
  for (const t of Array.isArray(traces) ? traces : []) {
    const k = String((t as any).fulfillment_item_id || "");
    if (!k) continue;
    gotByItem.set(k, (gotByItem.get(k) ?? 0) + safeNum((t as any).qty));
  }

  const missing: string[] = [];
  for (const [itemId, reqQty] of requiredByItem.entries()) {
    if (reqQty <= 0) continue;
    const got = gotByItem.get(itemId) ?? 0;
    if (got + 1e-9 < reqQty) missing.push(itemId);
  }

  if (missing.length) {
    throw new Error("Enter lot/serial traceability for all dropship items before marking shipped.");
  }
}

// ✅ Update orders.shipping_total from ALL fulfillments metadata.shipping.shipping_usd
// Returns the computed sum for use by upsertOrderItemsShipping
async function syncOrderShippingTotalFromFulfillments(sb: any, orderId: string): Promise<number> {
  if (!UUID_RE.test(orderId)) return 0;

  const { data: fs, error } = await sb
    .from("fulfillments")
    .select("id, metadata")
    .eq("order_id", orderId)
    .limit(5000);

  if (error) return 0;

  let sum = 0;
  for (const f of Array.isArray(fs) ? fs : []) {
    const meta = (f as any)?.metadata;
    const m = meta && typeof meta === "object" ? meta : {};
    const ship = m?.shipping && typeof m.shipping === "object" ? m.shipping : {};
    const v = ship?.shipping_usd;
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) sum += n;
  }

  try {
    await sb.from("orders").update({ shipping_total: sum }).eq("id", orderId);
  } catch {}
  return sum;
}

// ✅ Upsert order_items SHIPPING line so portal shows actual shipping cost when shipped
async function upsertOrderItemsShipping(sb: any, orderId: string, shippingUsd: number) {
  if (!UUID_RE.test(orderId) || !Number.isFinite(shippingUsd) || shippingUsd <= 0) return;

  const { data: items } = await sb
    .from("order_items")
    .select("id, line_type, sort_order")
    .eq("order_id", orderId)
    .order("sort_order", { ascending: true });

  const rows = items ?? [];
  const existingShipping = rows.find((r: any) => safeUpper(r.line_type) === "SHIPPING");
  const maxSort = rows.reduce((m: number, r: any) => Math.max(m, Number(r.sort_order ?? 0)), 0);
  const sortOrder = existingShipping?.id ? Number(existingShipping.sort_order ?? maxSort + 10) : maxSort + 10;

  if (existingShipping?.id) {
    await sb
      .from("order_items")
      .update({
        description: "Shipping",
        quantity: 1,
        uom: "Service",
        unit_price: shippingUsd,
        discount_percent: 0,
        line_total: shippingUsd,
        line_type: "SHIPPING",
        sort_order: sortOrder,
      })
      .eq("id", existingShipping.id);
  } else {
    await sb.from("order_items").insert({
      order_id: orderId,
      product_variant_id: null,
      description: "Shipping",
      quantity: 1,
      uom: "Service",
      unit_price: shippingUsd,
      discount_percent: 0,
      line_total: shippingUsd,
      line_type: "SHIPPING",
      sort_order: sortOrder,
    });
  }

  // Recompute order totals from order_items
  const { data: orderItems } = await sb.from("order_items").select("line_total, line_type").eq("order_id", orderId);
  const oi = orderItems ?? [];
  const subtotal = oi
    .filter((r: any) => safeUpper(r.line_type) === "PRODUCT")
    .reduce((sum: number, r: any) => sum + safeNum(r.line_total), 0);
  const shipping_total = oi
    .filter((r: any) => safeUpper(r.line_type) === "SHIPPING")
    .reduce((sum: number, r: any) => sum + safeNum(r.line_total), 0);
  await sb.from("orders").update({ subtotal, shipping_total, total: subtotal + shipping_total }).eq("id", orderId);

  // Mirror shipping to primary invoice_items only while primary is not paid-in-full (else use shipping supplement invoice).
  try {
    const { data: inv } = await sb
      .from("invoices")
      .select("id, status, amount_paid, total")
      .eq("order_id", orderId)
      .eq("invoice_kind", INVOICE_KIND_PRIMARY)
      .maybeSingle();
    if (!inv?.id || primaryInvoiceFinanciallyLocked(inv)) return;

    const { data: shipItem } = await sb
      .from("order_items")
      .select("id, sort_order")
      .eq("order_id", orderId)
      .eq("line_type", "SHIPPING")
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!shipItem?.id) return;

    const { data: existingInvShip } = await sb
      .from("invoice_items")
      .select("id")
      .eq("invoice_id", inv.id)
      .eq("order_item_id", shipItem.id)
      .maybeSingle();

    if (existingInvShip?.id) {
      await sb
        .from("invoice_items")
        .update({
          description: "Shipping",
          quantity: 1,
          uom: "Service",
          unit_price: shippingUsd,
          discount_percent: 0,
          line_total: shippingUsd,
          line_type: "SHIPPING",
          sort_order: Number(shipItem.sort_order ?? 0),
        })
        .eq("id", existingInvShip.id);
    } else {
      await sb.from("invoice_items").insert({
        invoice_id: inv.id,
        order_item_id: shipItem.id,
        product_variant_id: null,
        description: "Shipping",
        quantity: 1,
        uom: "Service",
        unit_price: shippingUsd,
        discount_percent: 0,
        line_total: shippingUsd,
        line_type: "SHIPPING",
        sort_order: Number(shipItem.sort_order ?? 0),
      });
    }

    const { data: invoiceItems } = await sb.from("invoice_items").select("line_total, line_type").eq("invoice_id", inv.id);
    const ii = invoiceItems ?? [];
    const invSubtotal = ii
      .filter((r: any) => safeUpper(r.line_type) === "PRODUCT")
      .reduce((sum: number, r: any) => sum + safeNum(r.line_total), 0);
    const invShipping = ii
      .filter((r: any) => safeUpper(r.line_type) === "SHIPPING")
      .reduce((sum: number, r: any) => sum + safeNum(r.line_total), 0);
    await sb.from("invoices").update({ subtotal: invSubtotal, shipping_total: invShipping, total: invSubtotal + invShipping }).eq("id", inv.id);
  } catch {
    // ignore
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ fulfillmentId: string }> }
) {
  const ctx: any = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const resolved = await Promise.resolve(params as any);
  const fulfillmentId = normalizeParam(resolved?.fulfillmentId ?? "");

  if (!UUID_RE.test(fulfillmentId)) {
    return NextResponse.json({ ok: false, error: "Invalid fulfillmentId" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as any));

  const carrier = safeStr(body?.carrier).trim() || null;
  const service = safeStr(body?.service).trim() || null;
  const service_change_reason = safeStr(body?.service_change_reason).trim() || null;
  const service_changed_from = safeStr(body?.service_changed_from).trim() || null;
  const service_changed_to = safeStr(body?.service_changed_to).trim() || null;
  const tracking_number_raw = safeStr(body?.tracking_number).trim() || null;
  const label_url = safeStr(body?.label_url).trim() || null;
  const no_tracking = safeBoolish(body?.no_tracking);
  const weight_lbs = parseNumOrNull(body?.weight_lbs);
  const length_in = parseNumOrNull(body?.length_in);
  const width_in = parseNumOrNull(body?.width_in);
  const height_in = parseNumOrNull(body?.height_in);
  const saturday_delivery_from_body = Object.prototype.hasOwnProperty.call(body, "saturday_delivery")
    ? safeBoolish(body?.saturday_delivery)
    : undefined;

  const shipping_usd = parseMoneyOrNull(body?.shipping_usd);
  if (
    body?.shipping_usd !== null &&
    body?.shipping_usd !== undefined &&
    String(body?.shipping_usd).trim() !== "" &&
    shipping_usd === null
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid shipping_usd (must be a non-negative number with max 2 decimals)" },
      { status: 400 }
    );
  }

  if (!no_tracking && !tracking_number_raw) {
    return NextResponse.json(
      { ok: false, error: "Tracking number is required (or choose No tracking)." },
      { status: 400 }
    );
  }

  const { data: f, error: fErr } = await sb
    .from("fulfillments")
    .select("id, order_id, status, metadata, fulfillment_source")
    .eq("id", fulfillmentId)
    .maybeSingle();

  if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  if (!f) return NextResponse.json({ ok: false, error: "Fulfillment not found" }, { status: 404 });

  if (safeUpper((f as any).status) !== "OPEN") {
    return NextResponse.json({ ok: false, error: "Fulfillment must be OPEN to mark shipped." }, { status: 400 });
  }

  const src = safeUpper((f as any).fulfillment_source || "INVENTORY");

  const orderIdForVw = String((f as any).order_id || "");
  const { data: ordVw } = await sb
    .from("orders")
    .select("virtual_warehouse_shipment")
    .eq("id", orderIdForVw)
    .maybeSingle();
  const isVwShipmentOrder = !!(ordVw as any)?.virtual_warehouse_shipment;

  if (src === "DROPSHIP") {
    try {
      await validateDropshipTraceComplete(sb, fulfillmentId);
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: e?.message ? String(e.message) : "Missing traceability." },
        { status: 400 }
      );
    }
  } else if (!isVwShipmentOrder) {
    const { data: lines, error: lErr } = await sb
      .from("fulfillment_items")
      .select("required_qty, picked_qty")
      .eq("fulfillment_id", fulfillmentId)
      .limit(2000);

    if (lErr) return NextResponse.json({ ok: false, error: lErr.message }, { status: 500 });

    const anyShort = (lines ?? []).some((x: any) => safeNum(x.picked_qty) < safeNum(x.required_qty));
    if (anyShort) {
      return NextResponse.json({ ok: false, error: "Pick all required quantities before marking shipped." }, { status: 400 });
    }
  }

  if (isVwShipmentOrder) {
    const vwOk = await validateVirtualWarehouseDebitForFulfillment(sb, fulfillmentId);
    if (!vwOk.ok) {
      return NextResponse.json({ ok: false, error: vwOk.error }, { status: 400 });
    }
  }

  const nowIso = new Date().toISOString();
  const prevMeta =
    typeof (f as any).metadata === "object" && (f as any).metadata ? (f as any).metadata : {};
  const prevShip =
    prevMeta?.shipping && typeof prevMeta.shipping === "object" ? prevMeta.shipping : {};

  // ✅ Canonical shipping snapshot in metadata.shipping (works for BOTH inventory + dropship)
  const shippingObj = {
    ...prevShip,
    carrier,
    service,
    tracking_number: no_tracking ? null : tracking_number_raw,
    label_url,
    no_tracking: no_tracking ? true : false,
    weight_lbs,
    length_in,
    width_in,
    height_in,
    shipping_usd, // ✅ persisted here
    saturday_delivery:
      saturday_delivery_from_body !== undefined ? saturday_delivery_from_body : !!prevShip.saturday_delivery,
    shipped_at: nowIso,
    updated_at: nowIso,
    ...(service_change_reason
      ? {
          service_change_reason,
          service_changed_from: service_changed_from || null,
          service_changed_to: service_changed_to || service,
          service_changed_at: nowIso,
        }
      : {
          service_change_reason: null,
          service_changed_from: null,
          service_changed_to: null,
          service_changed_at: null,
        }),
  };

  const nextMeta = { ...prevMeta, shipping: shippingObj };

  const orderId = String((f as any).order_id || "");
  const actorUserId = ctx?.user?.id ? String(ctx.user.id) : "";

  const dropshipShipDate = nowIso.slice(0, 10); // YYYY-MM-DD

  const { error: upErr } = await sb
    .from("fulfillments")
    .update({
      metadata: nextMeta,
      status: "CLOSED",
      closed_at: nowIso,
      shipped_at: nowIso,

      // keep the legacy column for inventory
      tracking_number: src === "INVENTORY" ? (no_tracking ? null : tracking_number_raw) : null,

      ...(src === "DROPSHIP"
        ? {
            dropship_carrier: carrier,
            dropship_tracking_number: no_tracking ? null : tracking_number_raw,
            dropship_ship_date: dropshipShipDate,
          }
        : {}),
    })
    .eq("id", fulfillmentId)
    .eq("status", "OPEN");

  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  const debitRes = await debitVirtualWarehouseForShippedFulfillment(sb, fulfillmentId);
  if (!debitRes.ok) {
    console.error("[VW_SHIP_DEBIT]", debitRes.error);
    return NextResponse.json(
      { ok: false, error: "Shipment saved but virtual warehouse debit failed. Contact engineering.", detail: debitRes.error },
      { status: 500 }
    );
  }

  // ✅ sync orders.shipping_total so Order Details shows it
  const shippingTotal = await syncOrderShippingTotalFromFulfillments(sb, orderId);

  // ✅ upsert order_items SHIPPING line so portal shows actual shipping cost
  if (shippingTotal > 0) {
    await upsertOrderItemsShipping(sb, orderId, shippingTotal);
  }

  // Virtual warehouse ship requests: no invoice until fulfillment ships (product $0 + shipping from admin).
  if (isVwShipmentOrder) {
    try {
      const issued = await issuePortalInvoiceForOrder(sb, orderId, actorUserId);
      if (!issued.ok) console.error("[VW_SHIP_INVOICE] issuePortalInvoiceForOrder failed:", issued.error);
    } catch (e: any) {
      console.error("[VW_SHIP_INVOICE] issuePortalInvoiceForOrder threw:", e?.message ?? e);
    }
  }

  const stage = await updateOrderAfterFulfillmentClosed(sb, orderId);

  try {
    await sb.from("order_audit_log").insert({
      order_id: orderId,
      actor_user_id: actorUserId,
      action: "FULFILLMENT_SHIPPED",
      meta: {
        fulfillment_id: fulfillmentId,
        fulfillment_source: src,
        shipping: shippingObj,
        order_status_after: stage.order_status,
      },
      ip: getClientIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {}

  await schedulePartnerFulfillmentSync(sb, orderId);

  return NextResponse.json({
    ok: true,
    fulfillment_id: fulfillmentId,
    order_id: orderId,
    invoice_id: stage.invoice_id,
    order_status: stage.order_status,
    closed_at: nowIso,
    shipping: shippingObj,
  });
}
