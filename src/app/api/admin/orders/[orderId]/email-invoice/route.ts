// src/app/api/admin/orders/[orderId]/email-invoice/route.ts
import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { INVOICE_KIND_PRIMARY } from "@/lib/billing/invoiceKinds";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/sendEmail";
import { regenerateInvoicePdfAfterPayment } from "@/lib/billing/adminInvoicePdf";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeUpper(v: unknown) {
  return String(v ?? "").toUpperCase();
}

function safeStr(v: unknown) {
  return typeof v === "string" ? v : "";
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeObj(v: unknown): Record<string, any> | null {
  return v && typeof v === "object" ? (v as any) : null;
}

function safeBucket(v: unknown, fallback: string) {
  const s = safeStr(v).trim();
  if (!s || s === "undefined" || s === "null") return fallback;
  return s;
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
  const explicitInvoiceId = safeStr(form?.get("invoice_id")).trim();

  if (!toEmail) {
    return NextResponse.json({ ok: false, error: "Recipient email is required." }, { status: 400 });
  }

  // Primary invoice by default; optional invoice_id for shipping supplement (or any invoice on this order)
  const invSelect =
    "id, account_id, order_id, invoice_number, status, issued_at, voided_at, total, amount_paid, metadata, invoice_kind" as const;
  const { data: invoice, error: invErr } = UUID_RE.test(explicitInvoiceId)
    ? await sb.from("invoices").select(invSelect).eq("order_id", orderId).eq("id", explicitInvoiceId).maybeSingle()
    : await sb.from("invoices").select(invSelect).eq("order_id", orderId).eq("invoice_kind", INVOICE_KIND_PRIMARY).maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!invoice) return NextResponse.json({ ok: false, error: "No invoice exists for this order yet." }, { status: 400 });

  if (invoice.voided_at || safeUpper(invoice.status) === "VOID") {
    return NextResponse.json({ ok: false, error: "Invoice is voided; cannot email." }, { status: 400 });
  }

  const meta = safeObj((invoice as any).metadata) || {};
  const pdfBucket = safeBucket((meta as any)?.invoice_pdf_bucket || (meta as any)?.invoice_pdf?.bucket, "order-private");
  const pdfPath = safeStr((meta as any)?.invoice_pdf_path || (meta as any)?.invoice_pdf?.path).trim();

  if (!pdfPath) {
    return NextResponse.json(
      { ok: false, error: "Invoice PDF not generated yet. Generate the PDF before emailing." },
      { status: 400 }
    );
  }

  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select("id, order_number, status, total, placed_at, locked_at")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr) return NextResponse.json({ ok: false, error: ordErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });

  // Persist recipient + audit timestamps and email history into invoice metadata
  const prevMeta: any = invoice.metadata ?? {};
  const now = new Date().toISOString();
  const emailsSent: Array<{ type: "invoice" | "reminder"; at: string }> = Array.isArray(prevMeta.invoice_emails_sent)
    ? [...prevMeta.invoice_emails_sent]
    : [];
  emailsSent.push({ type: "invoice", at: now });
  const nextMeta: any = {
    ...prevMeta,
    billing_email: toEmail,
    last_invoice_emailed_at: now,
    invoice_emails_sent: emailsSent,
  };

  const { error: upErr } = await sb.from("invoices").update({ metadata: nextMeta }).eq("id", invoice.id);
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  const statusUpper = safeUpper(invoice.status);
  if (!["PAID", "PARTIALLY_PAID", "VOID", "VOIDED"].includes(statusUpper)) {
    const { error: statusErr } = await sb
      .from("invoices")
      .update({ status: "ISSUED", issued_at: (invoice as any).issued_at || now })
      .eq("id", invoice.id);
    if (statusErr) return NextResponse.json({ ok: false, error: statusErr.message }, { status: 500 });
  }

  // Sync order status when invoice is issued
  const orderStatusUpper = safeUpper(order?.status);
  if (orderStatusUpper === "NEEDS_INVOICE") {
    const { error: ordStatusErr } = await sb.from("orders").update({ status: "INVOICED" }).eq("id", orderId);
    if (ordStatusErr) return NextResponse.json({ ok: false, error: ordStatusErr.message }, { status: 500 });
  }

  const total = Number(invoice.total ?? order.total ?? 0);
  const amountPaid = Number((invoice as any).amount_paid ?? 0);
  const balanceDue = Math.max(0, total - amountPaid);
  const showPaymentInfo = amountPaid > 0;
  const usd = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  await regenerateInvoicePdfAfterPayment(sb, invoice.id);

  // Build portal link (order page already exists)
  const base = baseUrlFromReq(req);
  const portalLink = `${base}/portal/orders/${encodeURIComponent(String(orderId))}`;

  const isSupplement = safeStr((invoice as any)?.invoice_kind).toUpperCase() === "SHIPPING_SUPPLEMENT";

  let supplementShippedPlain = "";
  let supplementShippedHtml = "";
  if (isSupplement) {
    const { data: supItems } = await sb
      .from("invoice_items")
      .select("description, quantity, line_type, line_total, sort_order")
      .eq("invoice_id", invoice.id)
      .order("sort_order", { ascending: true });
    const products = (supItems ?? []).filter(
      (r: any) =>
        safeStr(r.line_type).toUpperCase() === "PRODUCT" &&
        safeNum(r.quantity) > 0 &&
        safeNum(r.line_total) <= 0.0001
    );
    if (products.length) {
      supplementShippedPlain =
        `Items shipped:\n` +
        products.map((r: any) => `- ${safeNum(r.quantity)} × ${String(r.description ?? "Item")}`).join("\n") +
        `\n\n`;
      supplementShippedHtml =
        `<div style="margin-top:14px; padding-top:12px; border-top:1px solid #e2e8f0">` +
        `<div style="font-weight:800; margin-bottom:6px; color:#0f172a">Items shipped</div>` +
        products
          .map(
            (r: any) =>
              `<div style="color:#334155; font-size:14px">• ${safeNum(r.quantity)} × ${escapeHtml(String(r.description ?? "Item"))}</div>`
          )
          .join("") +
        `</div>`;
    }
  }

  const invoiceNumberDisplay = safeStr((invoice as any).invoice_number).trim() || String(invoice.id).slice(0, 8);

  const subject = isSupplement
    ? `Shipping invoice for Order ${order.order_number ?? String(orderId).slice(0, 8)}`
    : `Invoice for Order ${order.order_number ?? String(orderId).slice(0, 8)}`;
  const paymentLines = showPaymentInfo
    ? `Total: ${usd(total)}\nAmount paid: ${usd(amountPaid)}\nBalance due: ${usd(balanceDue)}\n\n`
    : `Total: ${usd(total)}\n\n`;
  const plainText =
    `Your invoice is ready.\n\n` +
    `Order: ${order.order_number ?? String(orderId).slice(0, 8)}\n` +
    `Invoice: ${invoiceNumberDisplay}\n` +
    supplementShippedPlain +
    paymentLines +
    `View in portal: ${portalLink}\n`;

  const paymentHtml = showPaymentInfo
    ? `<div><b>Total:</b> ${usd(total)}</div><div><b>Amount paid:</b> ${usd(amountPaid)}</div><div><b>Balance due:</b> ${usd(balanceDue)}</div>`
    : `<div><b>Total:</b> ${usd(total)}</div>`;
  const html =
    `<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.45">` +
    `<h2 style="margin:0 0 10px">Invoice ready</h2>` +
    `<div style="color:#334155; font-size:14px">` +
    `<div><b>Order:</b> ${String(order.order_number ?? "").replaceAll("<", "&lt;")}</div>` +
    `<div><b>Invoice:</b> ${escapeHtml(invoiceNumberDisplay)}</div>` +
    paymentHtml +
    `</div>` +
    supplementShippedHtml +
    `<div style="margin-top:14px">` +
    `<a href="${portalLink}" style="display:inline-block; padding:10px 12px; border-radius:10px; background:#111; color:white; text-decoration:none; font-weight:800">View invoice in portal</a>` +
    `</div>` +
    `<div style="margin-top:14px; color:#64748b; font-size:12px">If you have questions, reply to this email.</div>` +
    `</div>`;

  // Attach invoice PDF
  const { data: pdfFile, error: pdfErr } = await sb.storage.from(pdfBucket).download(pdfPath);
  if (pdfErr || !pdfFile) {
    return NextResponse.json({ ok: false, error: pdfErr?.message || "Failed to download invoice PDF." }, { status: 500 });
  }
  const pdfBuf = Buffer.from(await pdfFile.arrayBuffer());
  const pdfBase64 = pdfBuf.toString("base64");
  const filename = `INVOICE-${order.order_number ?? String(orderId).slice(0, 8)}.pdf`;

    await sendEmail({
      to: [toEmail], // ✅ array
      subject,
      emailType: "order",
    text: plainText, // ✅ required
    html,
    attachments: [
      {
        filename,
        contentType: "application/pdf",
        contentBytesBase64: pdfBase64,
      },
    ],
  });

  // Best-effort audit
  try {
    await sb.from("order_audit_log").insert({
      order_id: orderId,
      actor_user_id: String(ctx?.user?.id ?? ""),
      action: "INVOICE_EMAILED",
      meta: { invoice_id: invoice.id, to: toEmail },
      ip: getClientIp(req),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {
    // ignore
  }

  return NextResponse.redirect(urlFromRequest(req, `/admin/invoices/${invoice.id}`));
}
