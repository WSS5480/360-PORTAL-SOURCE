// src/app/api/admin/orders/[orderId]/shipping/route.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { INVOICE_KIND_PRIMARY } from "@/lib/billing/invoiceKinds";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeUpper(v: unknown) {
  return String(v ?? "").toUpperCase();
}

function parseMoney(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

function safeNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Paid primary invoice: do not mutate lines/totals from order shipping edits (use shipping supplement instead). */
function primaryInvoiceFinanciallyLocked(inv: { status?: unknown; amount_paid?: unknown; total?: unknown } | null): boolean {
  if (!inv) return false;
  const st = safeUpper(inv.status);
  if (st === "PAID") return true;
  const total = safeNum(inv.total);
  const paid = safeNum(inv.amount_paid);
  return total > 0 && paid + 0.02 >= total;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { orderId } = await Promise.resolve(params);
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }

  const form = await req.formData();
  const shippingUsd = parseMoney(form.get("shipping_usd"));

  // Load order + items
  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

  const st = safeUpper(order.status);
  if (!(st === "CONFIRMED" || st === "LOCKED" || st === "FULFILLING" || st === "NEEDS_INVOICE" || st === "COMPLETED")) {
    return NextResponse.json(
      { ok: false, error: "Shipping can only be edited when order is CONFIRMED, LOCKED, FULFILLING, NEEDS_INVOICE, or COMPLETED." },
      { status: 400 }
    );
  }

  const { data: items, error: itemsErr } = await sb
    .from("order_items")
    .select("id, line_type, sort_order, line_total")
    .eq("order_id", orderId)
    .order("sort_order", { ascending: true });

  if (itemsErr) return NextResponse.json({ ok: false, error: itemsErr.message }, { status: 500 });

  const rows = items ?? [];
  const existingShipping = rows.find((r: any) => safeUpper(r.line_type) === "SHIPPING") ?? null;

  // If blank or <= 0 => remove shipping line (if present)
  if (shippingUsd == null || shippingUsd <= 0) {
    if (existingShipping?.id) {
      const { error: delErr } = await sb.from("order_items").delete().eq("id", existingShipping.id);
      if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });

      // If primary invoice exists and is not locked, delete linked invoice shipping item too (best-effort)
      try {
        const { data: inv } = await sb
          .from("invoices")
          .select("id, status, amount_paid, total")
          .eq("order_id", orderId)
          .eq("invoice_kind", INVOICE_KIND_PRIMARY)
          .maybeSingle();
        if (inv?.id && !primaryInvoiceFinanciallyLocked(inv)) {
          await sb
            .from("invoice_items")
            .delete()
            .eq("invoice_id", inv.id)
            .eq("order_item_id", existingShipping.id);
        }
      } catch {}
    }

    // Recompute totals and update order (+ invoice if exists)
    await recomputeAndUpdateTotals(sb, orderId);
    return NextResponse.redirect(urlFromRequest(req, `/admin/orders/${orderId}`));
  }

  // Upsert shipping order_item
  const maxSort = rows.reduce((m: number, r: any) => Math.max(m, Number(r.sort_order ?? 0)), 0);
  const sortOrder = existingShipping?.id ? Number(existingShipping.sort_order ?? maxSort + 10) : maxSort + 10;

  if (existingShipping?.id) {
    const { error: upErr } = await sb
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

    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  } else {
    const { error: insErr } = await sb.from("order_items").insert({
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

    if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  }

  // If primary invoice exists and is not paid-in-full, mirror/update shipping as an invoice_item too
  try {
    const { data: inv } = await sb
      .from("invoices")
      .select("id, status, amount_paid, total")
      .eq("order_id", orderId)
      .eq("invoice_kind", INVOICE_KIND_PRIMARY)
      .maybeSingle();
    if (inv?.id && !primaryInvoiceFinanciallyLocked(inv)) {
      // Reload shipping item id (since it might have just been inserted)
      const { data: ship2 } = await sb
        .from("order_items")
        .select("id, sort_order")
        .eq("order_id", orderId)
        .eq("line_type", "SHIPPING")
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (ship2?.id) {
        const { data: existingInvShip } = await sb
          .from("invoice_items")
          .select("id")
          .eq("invoice_id", inv.id)
          .eq("order_item_id", ship2.id)
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
              sort_order: Number(ship2.sort_order ?? 0),
            })
            .eq("id", existingInvShip.id);
        } else {
          await sb.from("invoice_items").insert({
            invoice_id: inv.id,
            order_item_id: ship2.id,
            product_variant_id: null,
            description: "Shipping",
            quantity: 1,
            uom: "Service",
            unit_price: shippingUsd,
            discount_percent: 0,
            line_total: shippingUsd,
            line_type: "SHIPPING",
            sort_order: Number(ship2.sort_order ?? 0),
          });
        }
      }
    }
  } catch {
    // ignore (invoice mirroring is best-effort)
  }

  // Recompute totals and update order (+ invoice if exists)
  await recomputeAndUpdateTotals(sb, orderId);

  return NextResponse.redirect(urlFromRequest(req, `/admin/orders/${orderId}`));
}

async function recomputeAndUpdateTotals(sb: any, orderId: string) {
  // Order totals from order_items
  const { data: orderItems } = await sb
    .from("order_items")
    .select("line_total, line_type")
    .eq("order_id", orderId);

  const oi = orderItems ?? [];

  const subtotal = oi
    .filter((r: any) => safeUpper(r.line_type) === "PRODUCT")
    .reduce((sum: number, r: any) => sum + safeNum(r.line_total), 0);

  const shipping_total = oi
    .filter((r: any) => safeUpper(r.line_type) === "SHIPPING")
    .reduce((sum: number, r: any) => sum + safeNum(r.line_total), 0);

  const total = subtotal + shipping_total;

  await sb.from("orders").update({ subtotal, shipping_total, total }).eq("id", orderId);

  // If primary invoice exists and is not locked, sync invoice totals from invoice_items
  const { data: inv } = await sb
    .from("invoices")
    .select("id, status, amount_paid, total")
    .eq("order_id", orderId)
    .eq("invoice_kind", INVOICE_KIND_PRIMARY)
    .maybeSingle();
  if (!inv?.id || primaryInvoiceFinanciallyLocked(inv)) return;

  const { data: invoiceItems } = await sb.from("invoice_items").select("line_total, line_type").eq("invoice_id", inv.id);
  const ii = invoiceItems ?? [];

  const invSubtotal = ii
    .filter((r: any) => safeUpper(r.line_type) === "PRODUCT")
    .reduce((sum: number, r: any) => sum + safeNum(r.line_total), 0);

  const invShipping = ii
    .filter((r: any) => safeUpper(r.line_type) === "SHIPPING")
    .reduce((sum: number, r: any) => sum + safeNum(r.line_total), 0);

  const invTotal = invSubtotal + invShipping;

  await sb.from("invoices").update({ subtotal: invSubtotal, shipping_total: invShipping, total: invTotal }).eq("id", inv.id);
}
