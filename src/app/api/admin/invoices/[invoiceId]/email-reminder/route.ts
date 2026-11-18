import { urlFromRequest } from "@/lib/http/requestOrigin";
import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/sendEmail";
import { regenerateInvoicePdfAfterPayment } from "@/lib/billing/adminInvoicePdf";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeStr(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function safeObj(v: unknown): Record<string, any> | null {
  return v && typeof v === "object" ? (v as any) : null;
}

function safeBucket(v: unknown, fallback: string) {
  const s = safeStr(v).trim();
  if (!s || s === "undefined" || s === "null") return fallback;
  return s;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function baseUrlFromReq(req: Request): string {
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ invoiceId: string }> }
) {
  await requireOrdersStaffOrAdmin();
  const sb: any = createSupabaseAdminClient();

  const { invoiceId } = await Promise.resolve(ctx.params);
  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ ok: false, error: "Invalid invoiceId" }, { status: 400 });
  }

  const form = await req.formData().catch(() => null);
  const toEmail = safeStr(form?.get("to_email")).trim();
  if (!toEmail) {
    return NextResponse.json({ ok: false, error: "Recipient email is required." }, { status: 400 });
  }

  const { data: invoice, error: invErr } = await sb
    .from("invoices")
    .select("id, account_id, order_id, status, issued_at, voided_at, total, amount_paid, metadata")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!invoice) return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });
  if (invoice.voided_at || String(invoice.status || "").toUpperCase() === "VOID") {
    return NextResponse.json({ ok: false, error: "Invoice is voided; cannot send reminder." }, { status: 400 });
  }

  const meta = safeObj((invoice as any).metadata) || {};
  const pdfBucket = safeBucket((meta as any)?.invoice_pdf_bucket || (meta as any)?.invoice_pdf?.bucket, "order-private");
  const pdfPath = safeStr((meta as any)?.invoice_pdf_path || (meta as any)?.invoice_pdf?.path).trim();
  if (!pdfPath) {
    return NextResponse.json(
      { ok: false, error: "Invoice PDF not generated yet. Generate the PDF before sending reminder." },
      { status: 400 }
    );
  }

  const orderId = String(invoice.order_id || "");
  const { data: order, error: ordErr } = await sb
    .from("orders")
    .select("id, order_number")
    .eq("id", orderId)
    .maybeSingle();
  if (ordErr || !order) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });

  const { data: pricing } = await sb
    .from("account_pricing")
    .select("payment_terms_days")
    .eq("account_id", invoice.account_id)
    .maybeSingle();
  const termsDays = Number(pricing?.payment_terms_days) || 30;
  const baseDate = invoice.issued_at ? new Date(invoice.issued_at) : new Date();
  const dueDate = addDays(baseDate, termsDays);
  const dueDateStr = dueDate.toLocaleDateString(undefined, { dateStyle: "long" });

  const total = Number(invoice.total ?? 0);
  const amountPaid = Number((invoice as any).amount_paid ?? 0);
  const balanceDue = Math.max(0, total - amountPaid);
  const showPaymentInfo = amountPaid > 0;
  const usd = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  await regenerateInvoicePdfAfterPayment(sb, invoiceId);

  const base = baseUrlFromReq(req);
  const portalLink = `${base}/portal/invoices`;

  const subject = `Friendly reminder: Your invoice is due on ${dueDateStr}`;
  const paymentLines = showPaymentInfo
    ? `Total: ${usd(total)}\nAmount paid: ${usd(amountPaid)}\nBalance due: ${usd(balanceDue)}\n\n`
    : `Total: ${usd(total)}\n\n`;
  const plainText =
    `This is a friendly reminder that your invoice is due on ${dueDateStr}.\n\n` +
    `Order: ${order.order_number ?? orderId.slice(0, 8)}\n` +
    paymentLines +
    `View in portal: ${portalLink}\n`;

  const paymentHtml = showPaymentInfo
    ? `<div><b>Total:</b> ${usd(total)}</div><div><b>Amount paid:</b> ${usd(amountPaid)}</div><div><b>Balance due:</b> ${usd(balanceDue)}</div>`
    : `<div><b>Total:</b> ${usd(total)}</div>`;
  const html =
    `<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.45">` +
    `<h2 style="margin:0 0 10px">Friendly reminder</h2>` +
    `<div style="color:#334155; font-size:14px">` +
    `<p style="margin:0 0 12px">This is a friendly reminder that your invoice is due on <b>${dueDateStr}</b>.</p>` +
    `<div><b>Order:</b> ${String(order.order_number ?? "").replaceAll("<", "&lt;")}</div>` +
    paymentHtml +
    `</div>` +
    `<div style="margin-top:14px">` +
    `<a href="${portalLink}" style="display:inline-block; padding:10px 12px; border-radius:10px; background:#111; color:white; text-decoration:none; font-weight:800">View invoices in portal</a>` +
    `</div>` +
    `<div style="margin-top:14px; color:#64748b; font-size:12px">If you have questions, reply to this email.</div>` +
    `</div>`;

  const { data: pdfFile, error: pdfErr } = await sb.storage.from(pdfBucket).download(pdfPath);
  if (pdfErr || !pdfFile) {
    return NextResponse.json({ ok: false, error: pdfErr?.message || "Failed to download invoice PDF." }, { status: 500 });
  }
  const pdfBuf = Buffer.from(await pdfFile.arrayBuffer());
  const pdfBase64 = pdfBuf.toString("base64");
  const filename = `INVOICE-${order.order_number ?? orderId.slice(0, 8)}.pdf`;

  await sendEmail({
    to: [toEmail],
    subject,
    emailType: "order",
    text: plainText,
    html,
    attachments: [
      { filename, contentType: "application/pdf", contentBytesBase64: pdfBase64 },
    ],
  });

  const prevMeta: any = safeObj((invoice as any).metadata) || {};
  const now = new Date().toISOString();
  const emailsSent: Array<{ type: "invoice" | "reminder"; at: string }> = Array.isArray(prevMeta.invoice_emails_sent)
    ? [...prevMeta.invoice_emails_sent]
    : [];
  emailsSent.push({ type: "reminder", at: now });
  const nextMeta = { ...prevMeta, invoice_emails_sent: emailsSent };
  await sb.from("invoices").update({ metadata: nextMeta }).eq("id", invoiceId);

  return NextResponse.redirect(urlFromRequest(req, `/admin/invoices/${invoiceId}`));
}
