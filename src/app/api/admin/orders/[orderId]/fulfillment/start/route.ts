import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { INVOICE_KIND_PRIMARY } from "@/lib/billing/invoiceKinds";
import { shipNowQtyForLine } from "@/lib/virtualWarehouse/shipNowQty";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeUpper(v: unknown) {
  return String(v ?? "").toUpperCase();
}

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return s;
}

function safeNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const ctx: any = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const resolved = await Promise.resolve(params as any);
  const orderId = normalizeParam(resolved?.orderId ?? "");

  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }

  // Load order
  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select("id, account_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

  const statusUpper = safeUpper(order.status);
  const canStart =
    statusUpper === "LOCKED" ||
    statusUpper === "FULFILLING" ||
    statusUpper === "NEEDS_INVOICE" ||
    statusUpper === "INVOICED" ||
    statusUpper === "PENDING_WIRE" ||
    statusUpper === "PAID" ||
    statusUpper === "PARTIALLY_PAID";
  if (!canStart) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Order must be LOCKED, INVOICED, PENDING_WIRE, PAID, FULFILLING, NEEDS_INVOICE, or PARTIALLY_PAID to start fulfillment",
      },
      { status: 400 }
    );
  }

  // Idempotent: if an OPEN INVENTORY fulfillment already exists, redirect to it
  const { data: existing, error: exErr } = await sb
    .from("fulfillments")
    .select("id, fulfillment_source")
    .eq("order_id", orderId)
    .eq("status", "OPEN")
    .eq("fulfillment_source", "INVENTORY")
    .maybeSingle();

  if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });
  if (existing?.id) {
    return NextResponse.redirect(urlFromRequest(req, `/admin/fulfillments/${encodeURIComponent(String(existing.id))}`));
  }

  // Load order items to build pick list (PRODUCT lines only)
  const { data: items, error: itemsErr } = await sb
    .from("order_items")
    .select("id, product_variant_id, description, quantity, virtual_warehouse_qty, uom, line_type, sort_order")
    .eq("order_id", orderId)
    .order("sort_order", { ascending: true });

  if (itemsErr) return NextResponse.json({ ok: false, error: itemsErr.message }, { status: 500 });

  const all = Array.isArray(items) ? items : [];
  const productLines = all.filter((r: any) => safeUpper(r.line_type) === "PRODUCT");

  if (productLines.length === 0) {
    return NextResponse.json({ ok: false, error: "No PRODUCT lines to fulfill." }, { status: 400 });
  }

  const missingVariant = productLines.find((r: any) => !r.product_variant_id);
  if (missingVariant) {
    return NextResponse.json(
      { ok: false, error: "Order has a PRODUCT line without product_variant_id; cannot fulfill." },
      { status: 400 }
    );
  }

  // Determine remaining qty per order_item based on prior fulfillments (OPEN + CLOSED)
  // This prevents creating a new fulfillment that re-allocates lines already fulfilled/allocated.
  const { data: allocatedRows, error: allocErr } = await sb
    .from("fulfillment_items")
    .select("order_item_id, required_qty, fulfillments!inner(order_id, status, fulfillment_source)")
    .eq("fulfillments.order_id", orderId)
    .in("fulfillments.status", ["OPEN", "CLOSED"])
    .eq("fulfillments.fulfillment_source", "INVENTORY")
    .limit(20000);

  if (allocErr) return NextResponse.json({ ok: false, error: allocErr.message }, { status: 500 });

  const allocatedByOrderItem = new Map<string, number>();
  for (const r of Array.isArray(allocatedRows) ? allocatedRows : []) {
    const oid = String((r as any).order_item_id || "");
    if (!oid) continue;
    const qty = safeNum((r as any).required_qty);
    allocatedByOrderItem.set(oid, (allocatedByOrderItem.get(oid) ?? 0) + qty);
  }

  const remainingLines = productLines
    .map((it: any) => {
      const orderItemId = String(it.id);
      const shipCap = shipNowQtyForLine(it);
      const orderedQty = Math.min(shipCap, safeNum(it.quantity));
      const allocatedQty = allocatedByOrderItem.get(orderItemId) ?? 0;
      const remainingQty = Math.max(0, orderedQty - allocatedQty);

      return {
        order_item_id: orderItemId,
        variant_id: String(it.product_variant_id),
        description: String(it.description ?? ""),
        required_qty: remainingQty,
        uom: String(it.uom ?? "Units"),
        sort_order: Number(it.sort_order ?? 0) || 0,
      };
    })
    .filter((x) => x.required_qty > 0);

  if (remainingLines.length === 0) {
    const actorUserIdSkip = ctx?.user?.id ?? null;
    try {
      await sb.from("order_audit_log").insert({
        order_id: orderId,
        actor_user_id: String(actorUserIdSkip ?? ""),
        action: "INVENTORY_FULFILLMENT_SKIPPED_NO_SHIP_NOW",
        meta: { reason: "all_quantity_virtual_warehouse", via: "fulfillment_start" },
        ip: getClientIp(req),
        user_agent: req.headers.get("user-agent"),
      });
    } catch {}
    return NextResponse.redirect(
      urlFromRequest(req, `/admin/orders/${encodeURIComponent(orderId)}?skipped_fulfillment=1`)
    );
  }

  const actorUserId = ctx?.user?.id ?? null;

  // OPTIONAL: if an invoice exists already, attach it; otherwise leave null.
  const { data: invoice } = await sb
    .from("invoices")
    .select("id")
    .eq("order_id", orderId)
    .eq("invoice_kind", INVOICE_KIND_PRIMARY)
    .maybeSingle();
  const invoiceId = invoice?.id ? String(invoice.id) : null;

  // Create fulfillment session
  const { data: f, error: fErr } = await sb
    .from("fulfillments")
    .insert({
      order_id: orderId,
      invoice_id: invoiceId, // may be null
      status: "OPEN",
      fulfillment_source: "INVENTORY",
      created_by_user_id: actorUserId,
      metadata: {
        shipment: { stage: "PICKING" },
      },
    })
    .select("id")
    .single();

  if (fErr) {
    const msg = String(fErr.message || "").toLowerCase();

    // If you have "one open per order+source" uniqueness, fetch and redirect
    const likelyUnique = msg.includes("duplicate") || msg.includes("unique");
    if (likelyUnique) {
      const { data: ex2 } = await sb
        .from("fulfillments")
        .select("id")
        .eq("order_id", orderId)
        .eq("status", "OPEN")
        .eq("fulfillment_source", "INVENTORY")
        .maybeSingle();

      if (ex2?.id) {
        return NextResponse.redirect(urlFromRequest(req, `/admin/fulfillments/${encodeURIComponent(String(ex2.id))}`));
      }
    }

    return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
  }

  const fulfillmentId = String(f.id);

  // Create fulfillment_items from remaining lines
  const payload = remainingLines.map((it: any) => ({
    fulfillment_id: fulfillmentId,
    order_item_id: it.order_item_id,
    variant_id: it.variant_id,
    description: it.description,
    required_qty: it.required_qty,
    picked_qty: 0,
    uom: it.uom,
    sort_order: it.sort_order,
  }));

  const { error: fiErr } = await sb.from("fulfillment_items").insert(payload);

  if (fiErr) {
    // rollback best-effort
    try {
      await sb.from("fulfillment_items").delete().eq("fulfillment_id", fulfillmentId);
      await sb.from("fulfillments").delete().eq("id", fulfillmentId);
    } catch {}
    return NextResponse.json({ ok: false, error: fiErr.message }, { status: 500 });
  }

  // Move order into FULFILLING (recommended)
  if (statusUpper !== "FULFILLING") {
    try {
      await sb.from("orders").update({ status: "FULFILLING" }).eq("id", orderId);
    } catch {}
  }

  // Best-effort audit
  try {
    await sb.from("order_audit_log").insert({
      order_id: orderId,
      actor_user_id: String(actorUserId ?? ""),
      action: "FULFILLMENT_STARTED",
      meta: { fulfillment_id: fulfillmentId, invoice_id: invoiceId, source: "INVENTORY" },
      ip: getClientIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {}

  return NextResponse.redirect(urlFromRequest(req, `/admin/fulfillments/${encodeURIComponent(fulfillmentId)}`));
}
