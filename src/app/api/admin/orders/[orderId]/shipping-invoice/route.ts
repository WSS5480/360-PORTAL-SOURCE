import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { generateInvoicePdfForInvoiceId } from "@/lib/billing/generateInvoicePdfForInvoiceId";
import { INVOICE_KIND_PRIMARY, INVOICE_KIND_SHIPPING_SUPPLEMENT } from "@/lib/billing/invoiceKinds";
import { BULK_VW_PAYMENT_TERMS_DAYS, BULK_VW_PAYMENT_TERMS_LABEL } from "@/lib/billing/bulkPaymentTerms";
import { aggregateShippedQtyByOrderItem } from "@/lib/fulfillment/aggregateShippedOrderItems";
import { schedulePartnerFulfillmentSync } from "@/lib/integrations/outbound/schedulePartnerFulfillmentSync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeUpper(v: unknown) {
  return String(v ?? "").toUpperCase();
}

function safeNum(v: unknown): number {
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

function nextSupplementNumber(): string {
  return `INV-${Date.now().toString().slice(-6)}-SH`;
}

/**
 * Creates a separate shipping-only invoice after the primary bulk invoice is paid.
 * Does not modify the primary invoice.
 */
export async function POST(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const ctx: any = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { orderId } = await Promise.resolve(params);
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }

  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select("id, account_id, order_number, bulk_mode, invoice_address, delivery_address, shipping_total, total")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

  if (!(order as any).bulk_mode) {
    return NextResponse.json(
      { ok: false, error: "Shipping supplement invoices are only available for bulk (virtual warehouse) orders." },
      { status: 400 }
    );
  }

  const { data: primary, error: pErr } = await sb
    .from("invoices")
    .select("id, invoice_number, status, amount_paid, total, invoice_address, delivery_address, metadata")
    .eq("order_id", orderId)
    .eq("invoice_kind", INVOICE_KIND_PRIMARY)
    .maybeSingle();

  if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 });
  if (!primary?.id) {
    return NextResponse.json({ ok: false, error: "No primary invoice exists for this order yet." }, { status: 400 });
  }

  if (!primaryInvoiceFinanciallyLocked(primary)) {
    return NextResponse.json(
      { ok: false, error: "Primary invoice must be paid before creating a shipping supplement invoice." },
      { status: 400 }
    );
  }

  const { data: shipItem, error: shipErr } = await sb
    .from("order_items")
    .select("id, sort_order, line_total")
    .eq("order_id", orderId)
    .eq("line_type", "SHIPPING")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (shipErr) return NextResponse.json({ ok: false, error: shipErr.message }, { status: 500 });

  const shipAmt = safeNum(shipItem?.line_total);
  if (!shipItem?.id || shipAmt <= 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No shipping charge on this order yet. Enter actual shipping when marking the fulfillment shipped, or set shipping on the order first.",
      },
      { status: 400 }
    );
  }

  const { data: priLines } = await sb
    .from("invoice_items")
    .select("id, line_type, line_total")
    .eq("invoice_id", primary.id)
    .limit(500);

  const primaryHasShipping = (priLines ?? []).some(
    (r: any) => safeUpper(r.line_type) === "SHIPPING" && safeNum(r.line_total) > 0
  );
  if (primaryHasShipping) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "The primary invoice already includes a shipping line. Use that invoice, or void/amend it before adding a supplement.",
      },
      { status: 400 }
    );
  }

  const actorId = ctx?.user?.id ? String(ctx.user.id) : null;

  const billingAddr = (order as any).invoice_address || null;
  const deliveryAddr = (order as any).delivery_address || null;

  const { data: created, error: insErr } = await sb
    .from("invoices")
    .insert({
      order_id: orderId,
      account_id: (order as any).account_id,
      invoice_kind: INVOICE_KIND_SHIPPING_SUPPLEMENT,
      invoice_number: nextSupplementNumber(),
      invoice_address: billingAddr || (primary as any).invoice_address || null,
      delivery_address: deliveryAddr || (primary as any).delivery_address || null,
      discount_percent_snapshot: 0,
      payment_terms_label_snapshot: BULK_VW_PAYMENT_TERMS_LABEL,
      payment_terms_days_snapshot: BULK_VW_PAYMENT_TERMS_DAYS,
      subtotal: 0,
      shipping_total: shipAmt,
      total: shipAmt,
      amount_paid: 0,
      status: "DRAFT",
      created_by_user_id: actorId,
      metadata: {
        supplement_for_invoice_id: primary.id,
        supplement_note: "Additional shipping charges (primary invoice unchanged).",
      },
    })
    .select("id")
    .maybeSingle();

  if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  const supId = String((created as any)?.id || "");
  if (!UUID_RE.test(supId)) return NextResponse.json({ ok: false, error: "Failed to create shipping invoice." }, { status: 500 });

  let shippedLines: Awaited<ReturnType<typeof aggregateShippedQtyByOrderItem>> = [];
  try {
    shippedLines = await aggregateShippedQtyByOrderItem(sb, orderId);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load shipped items." }, { status: 500 });
  }

  const shipSortBase = Number(shipItem.sort_order ?? 0);
  const maxProductSort = shippedLines.reduce((m, r) => Math.max(m, Number(r.sort_order ?? 0)), 0);
  const shippingSortOrder = Math.max(shipSortBase, maxProductSort) + 1;

  const lineRows: Record<string, unknown>[] = shippedLines.map((r) => ({
    invoice_id: supId,
    order_item_id: r.order_item_id,
    product_variant_id: r.product_variant_id,
    description: r.description,
    quantity: r.quantity,
    uom: r.uom,
    unit_price: 0,
    discount_percent: 0,
    line_total: 0,
    line_type: "PRODUCT",
    sort_order: Number(r.sort_order ?? 0),
  }));

  lineRows.push({
    invoice_id: supId,
    order_item_id: shipItem.id,
    product_variant_id: null,
    description: "Shipping",
    quantity: 1,
    uom: "Service",
    unit_price: shipAmt,
    discount_percent: 0,
    line_total: shipAmt,
    line_type: "SHIPPING",
    sort_order: shippingSortOrder,
  });

  const { error: lineErr } = await sb.from("invoice_items").insert(lineRows);
  if (lineErr) return NextResponse.json({ ok: false, error: lineErr.message }, { status: 500 });

  const pdf = await generateInvoicePdfForInvoiceId(sb, supId);
  if (!pdf.ok) {
    return NextResponse.json({ ok: false, error: pdf.error || "PDF failed" }, { status: 500 });
  }

  await schedulePartnerFulfillmentSync(sb, orderId);

  return NextResponse.redirect(urlFromRequest(req, `/admin/invoices/${encodeURIComponent(supId)}?ok=1`), { status: 303 });
}
