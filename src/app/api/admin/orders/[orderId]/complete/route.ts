// src/app/api/admin/orders/[orderId]/complete/route.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { INVOICE_KIND_PRIMARY } from "@/lib/billing/invoiceKinds";
import { orderStatusFromPrimaryInvoice } from "@/lib/billing/orderStatusFromInvoice";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeUpper(v: unknown) {
  return String(v ?? "").toUpperCase();
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return null;
}

function isObj(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const ctx: any = await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { orderId } = await Promise.resolve(params);
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid orderId" }, { status: 400 });
  }

  // Load order
  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

  const s = safeUpper(order.status);
  if (s !== "FULFILLING") {
    return NextResponse.json(
      { ok: false, error: "Order must be FULFILLING to mark complete." },
      { status: 400 }
    );
  }

  // Require invoice + tracking number (so completion implies shipped)
  const { data: invoice, error: invErr } = await sb
    .from("invoices")
    .select("id, status, amount_paid, total, voided_at, metadata")
    .eq("order_id", orderId)
    .eq("invoice_kind", INVOICE_KIND_PRIMARY)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!invoice?.id) {
    return NextResponse.json(
      { ok: false, error: "No invoice found for this order. Create an invoice before completing." },
      { status: 400 }
    );
  }

  const meta = (invoice.metadata ?? {}) as any;
  const shipping = isObj(meta.shipping) ? meta.shipping : {};
  const tracking = String(shipping.tracking_number ?? "").trim();

  if (!tracking) {
    return NextResponse.json(
      { ok: false, error: "Tracking number is required before marking complete." },
      { status: 400 }
    );
  }

  const shippedAt = new Date().toISOString();

  const nextMeta = {
    ...(isObj(meta) ? meta : {}),
    shipping: {
      ...(isObj(shipping) ? shipping : {}),
      tracking_number: tracking,
      shipped_at: shippedAt,
      status: "SHIPPED",
    },
  };

  // Update invoice metadata (stamp shipped_at)
  const { error: metaErr } = await sb
    .from("invoices")
    .update({ metadata: nextMeta })
    .eq("id", invoice.id);

  if (metaErr) return NextResponse.json({ ok: false, error: metaErr.message }, { status: 500 });

  const nextStatus = orderStatusFromPrimaryInvoice(invoice);
  const { error: upErr } = await sb
    .from("orders")
    .update({ status: nextStatus, updated_at: shippedAt })
    .eq("id", orderId);

  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  // Best-effort audit
  try {
    const actorUserId = ctx?.user?.id ?? null;
    await sb.from("order_status_events").insert({
      order_id: orderId,
      from_status: s,
      to_status: nextStatus,
      changed_by_user_id: actorUserId,
      comment: "Fulfillment marked complete; status follows invoice payment.",
    });
    await sb.from("order_audit_log").insert({
      order_id: orderId,
      actor_user_id: String(actorUserId ?? ""),
      action: "ORDER_COMPLETED",
      meta: {
        from: "FULFILLING",
        to: nextStatus,
        invoice_id: invoice.id,
        shipping: { tracking_number: tracking, shipped_at: shippedAt },
      },
      ip: getClientIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {
    // ignore
  }

  return NextResponse.redirect(urlFromRequest(req, `/admin/orders/${encodeURIComponent(orderId)}`));
}
