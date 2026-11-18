// src/app/api/admin/orders/[orderId]/email-tracking/route.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { INVOICE_KIND_PRIMARY } from "@/lib/billing/invoiceKinds";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/sendEmail";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeUpper(v: unknown) {
  return String(v ?? "").toUpperCase();
}

function safeStr(v: unknown) {
  return typeof v === "string" ? v : "";
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return null;
}

function baseUrlFromReq(req: Request): string {
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
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

  const form = await req.formData().catch(() => null);
  const toEmail = safeStr(form?.get("to_email")).trim();

  if (!toEmail) {
    return NextResponse.json({ ok: false, error: "Recipient email is required." }, { status: 400 });
  }

  const { data: invoice, error: invErr } = await sb
    .from("invoices")
    .select("id, status, voided_at, metadata")
    .eq("order_id", orderId)
    .eq("invoice_kind", INVOICE_KIND_PRIMARY)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!invoice) return NextResponse.json({ ok: false, error: "No invoice exists for this order yet." }, { status: 400 });

  if (invoice.voided_at || safeUpper(invoice.status) === "VOID") {
    return NextResponse.json({ ok: false, error: "Invoice is voided; cannot email." }, { status: 400 });
  }

  const meta: any = invoice.metadata ?? {};
  const ship: any = meta?.shipping ?? {};
  const trackingNumber = String(ship?.tracking_number ?? "").trim();
  const carrier = String(ship?.carrier ?? "").trim();
  const labelUrl = String(ship?.label_url ?? "").trim();

  if (!trackingNumber) {
    return NextResponse.json(
      { ok: false, error: "No tracking number saved. Save tracking on the invoice first." },
      { status: 400 }
    );
  }

  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select("id, order_number")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });

  // Persist recipient + timestamp
  const nextMeta: any = {
    ...meta,
    billing_email: toEmail,
    last_tracking_emailed_at: new Date().toISOString(),
  };

  const { error: upErr } = await sb.from("invoices").update({ metadata: nextMeta }).eq("id", invoice.id);
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  const base = baseUrlFromReq(req);
  const portalLink = `${base}/portal/orders/${encodeURIComponent(String(orderId))}`;

  const carrierLabel = carrier ? `${carrier} ` : "";
  const subject = `Tracking for Order ${order.order_number ?? String(orderId).slice(0, 8)}`;
  const plainText =
    `Your order has shipped.\n\n` +
    `Order: ${order.order_number ?? String(orderId).slice(0, 8)}\n` +
    `Tracking: ${carrierLabel}${trackingNumber}\n` +
    (labelUrl ? `Label: ${labelUrl}\n` : "") +
    `View order in portal: ${portalLink}\n`;

  const html =
    `<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.45">` +
    `<h2 style="margin:0 0 10px">Your order has shipped</h2>` +
    `<div style="color:#334155; font-size:14px">` +
    `<div><b>Order:</b> ${String(order.order_number ?? "").replaceAll("<", "&lt;")}</div>` +
    `<div><b>Tracking:</b> ${carrierLabel}${trackingNumber}</div>` +
    (labelUrl
      ? `<div style="margin-top:6px"><a href="${labelUrl}" style="color:#1e88e5; font-weight:800; text-decoration:none">View label</a></div>`
      : ``) +
    `</div>` +
    `<div style="margin-top:14px">` +
    `<a href="${portalLink}" style="display:inline-block; padding:10px 12px; border-radius:10px; background:#111; color:white; text-decoration:none; font-weight:800">View in portal</a>` +
    `</div>` +
    `<div style="margin-top:14px; color:#64748b; font-size:12px">If you have questions, reply to this email.</div>` +
    `</div>`;

  await sendEmail({
    to: [toEmail], // ✅ array
    subject,
    text: plainText, // ✅ required
    html,
    emailType: "order",
  });

  // Best-effort audit
  try {
    await sb.from("order_audit_log").insert({
      order_id: orderId,
      actor_user_id: String(ctx?.user?.id ?? ""),
      action: "TRACKING_EMAILED",
      meta: { invoice_id: invoice.id, to: toEmail, carrier: carrier || null, tracking_number: trackingNumber },
      ip: getClientIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {
    // ignore
  }

  return NextResponse.redirect(urlFromRequest(req, `/admin/invoices/${invoice.id}`));
}
