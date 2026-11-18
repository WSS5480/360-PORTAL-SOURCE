import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/sendEmail";
import { regenerateInvoicePdfAfterPayment } from "@/lib/billing/adminInvoicePdf";
import { applyVirtualWarehouseCreditsForPaidInvoice } from "@/lib/virtualWarehouse/applyCreditsForPaidInvoice";
import { partnerPaymentFacts } from "@/lib/stripe/paymentFacts";
import { recordCapturedStripePayment } from "@/lib/stripe/recordCapturedStripePayment";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

function computeStatus(total: number, amountPaid: number): "ISSUED" | "PARTIALLY_PAID" | "PAID" {
  const t = Math.max(0, total);
  const p = Math.max(0, amountPaid);
  if (t <= 0) return "PAID";
  if (p <= 0) return "ISSUED";
  if (p + 1e-9 >= t) return "PAID";
  return "PARTIALLY_PAID";
}

async function resolveUserEmail(userId: string): Promise<string | null> {
  const uid = safeStr(userId);
  if (!uid) return null;

  const { data: p1 } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id,email")
    .eq("user_id", uid)
    .maybeSingle();
  if (p1?.email) return safeStr((p1 as any).email) || null;

  const { data: p2 } = await supabaseAdmin.from("user_profiles").select("id,email").eq("id", uid).maybeSingle();
  if (p2?.email) return safeStr((p2 as any).email) || null;

  try {
    const res = await supabaseAdmin.auth.admin.getUserById(uid);
    const u: any = (res as any)?.data?.user || null;
    return safeStr(u?.email) || null;
  } catch {
    return null;
  }
}

function baseUrlFromEnv(): string {
  const envBase =
    safeStr(process.env.NEXT_PUBLIC_SITE_URL) ||
    safeStr(process.env.NEXT_PUBLIC_APP_URL) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return envBase ? envBase.replace(/\/+$/, "") : "http://localhost:3000";
}

async function resolveInvoicePdfAttachment(invoice: any) {
  const meta: any = invoice?.metadata ?? {};
  const pdfObj: any = meta?.invoice_pdf && typeof meta.invoice_pdf === "object" ? meta.invoice_pdf : {};
  const bucket = safeStr(pdfObj?.bucket || meta?.invoice_pdf_bucket || "order-private");
  const path = safeStr(pdfObj?.path || meta?.invoice_pdf_path || "");
  if (!path) return null;

  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60 * 5);
  if (error || !data?.signedUrl) return null;

  const res = await fetch(data.signedUrl);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const contentBytesBase64 = buf.toString("base64");
  return {
    filename: `invoice-${String(invoice?.invoice_number || invoice?.id || "invoice").slice(0, 12)}.pdf`,
    contentType: "application/pdf",
    contentBytesBase64,
  };
}

export type ApplySucceededPaymentIntentOptions = {
  /** When set, must match resolved invoice id (from metadata or forcedInvoiceId). */
  expectedInvoiceId?: string;
  /** If PaymentIntent metadata has no invoice_id, use this (portal stripe-confirm only). */
  forcedInvoiceId?: string;
  /** Prefer this address for receipt email (e.g. current portal user). */
  receiptEmailOverride?: string | null;
};

/**
 * Idempotent: applies a succeeded PaymentIntent to invoice_payments, invoices, orders,
 * invoice_payment_submissions, receipt email. Safe to call from webhook and reconciliation.
 */
export async function applySucceededPaymentIntentToInvoice(
  intent: Stripe.PaymentIntent,
  opts?: ApplySucceededPaymentIntentOptions
): Promise<{ ok: boolean; reason?: string; applied?: boolean; reconciliation?: "open" }> {
  if (intent.status !== "succeeded") {
    return { ok: false, reason: "not_succeeded" };
  }

  const fromMeta = safeStr(intent.metadata?.invoice_id);
  const invoiceId = fromMeta || safeStr(opts?.forcedInvoiceId);
  const amount = safeNum(intent.amount_received ?? intent.amount) / 100;
  const facts = partnerPaymentFacts(intent);
  const captured = {
    invoiceId: invoiceId && UUID_RE.test(invoiceId) ? invoiceId : null,
    paymentIntentId: intent.id,
    amount,
    paymentMethod: facts.method,
    confirmationCode: facts.confirmationCode,
  };

  if (!captured.invoiceId) {
    const recorded = await recordCapturedStripePayment(supabaseAdmin, captured);
    if (!recorded.ok) return { ok: false, reason: recorded.reason, applied: false };
    return { ok: true, applied: false, reconciliation: "open", reason: recorded.reason || "missing_invoice" };
  }
  if (opts?.expectedInvoiceId && captured.invoiceId !== opts.expectedInvoiceId) {
    return { ok: false, reason: "invoice_mismatch" };
  }

  const { data: inv, error: invErr } = await supabaseAdmin
    .from("invoices")
    .select("id, order_id, total, metadata")
    .eq("id", captured.invoiceId)
    .maybeSingle();

  if (invErr) return { ok: false, reason: "ledger_failed", applied: false };

  const recorded = await recordCapturedStripePayment(supabaseAdmin, captured);
  if (!recorded.ok) return { ok: false, reason: recorded.reason, applied: false };
  if (!recorded.applied || !inv) {
    return { ok: true, applied: false, reconciliation: "open", reason: recorded.reason || "invoice_not_found" };
  }

  const { data: payRows } = await supabaseAdmin.from("invoice_payments").select("amount").eq("invoice_id", invoiceId);
  const nextPaid = (payRows ?? []).reduce((sum: number, r: any) => sum + safeNum(r?.amount), 0);
  const nextStatus = computeStatus(safeNum((inv as any).total), nextPaid);

  const { error: invUpErr } = await supabaseAdmin
    .from("invoices")
    .update({
      amount_paid: nextPaid,
      status: nextStatus,
      paid_at: nextStatus === "PAID" ? new Date().toISOString() : null,
    })
    .eq("id", invoiceId);

  if (invUpErr) {
    return { ok: false, reason: `update_invoice_failed:${invUpErr.message}` };
  }

  if (nextStatus === "PAID") {
    try {
      await applyVirtualWarehouseCreditsForPaidInvoice(supabaseAdmin, invoiceId);
    } catch {
      // non-blocking
    }
  }

  try {
    await regenerateInvoicePdfAfterPayment(supabaseAdmin, invoiceId);
  } catch {
    // PDF regeneration must not block payment application
  }

  const orderId = String((inv as any).order_id || "");
  if (orderId && UUID_RE.test(orderId)) {
    const map: Record<string, string> = {
      ISSUED: "INVOICED",
      PAID: "PAID",
      PARTIALLY_PAID: "PARTIALLY_PAID",
    };
    const nextOrderStatus = map[nextStatus];
    if (nextOrderStatus) {
      try {
        const { data: ord } = await supabaseAdmin.from("orders").select("id, status").eq("id", orderId).maybeSingle();
        const fromStatus = String((ord as any)?.status || "");
        if (fromStatus.toUpperCase() !== nextOrderStatus) {
          await supabaseAdmin.from("orders").update({ status: nextOrderStatus }).eq("id", orderId);
          try {
            await supabaseAdmin.from("order_status_events").insert({
              order_id: orderId,
              from_status: fromStatus,
              to_status: nextOrderStatus,
              changed_by_user_id: null,
              comment: `Invoice payment updated to ${nextStatus} via Stripe`,
            });
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }
  }

  try {
    await supabaseAdmin
      .from("invoice_payment_submissions")
      .update({
        status: "VERIFIED",
        verified_at: new Date().toISOString(),
        verified_by_user_id: null,
        stripe_payment_intent_status: intent.status,
      })
      .eq("invoice_id", invoiceId)
      .eq("reference", intent.id);
  } catch {
    // ignore
  }

  const meta: any = (inv as any)?.metadata ?? {};
  const lastReceiptIntent = safeStr(meta?.last_receipt_payment_intent);
  if (lastReceiptIntent !== intent.id) {
    const userEmail =
      (opts?.receiptEmailOverride && safeStr(opts.receiptEmailOverride)) ||
      safeStr(intent.metadata?.user_email) ||
      (await resolveUserEmail(safeStr(intent.metadata?.user_id || ""))) ||
      null;
    if (userEmail) {
      try {
        const remaining = Math.max(0, safeNum((inv as any).total) - nextPaid);
        const baseUrl = baseUrlFromEnv();
        const attachment = await resolveInvoicePdfAttachment(inv);
        const statusLine =
          remaining > 0
            ? `Remaining balance: ${remaining.toLocaleString(undefined, { style: "currency", currency: "USD" })}.`
            : "Paid in full.";
        await sendEmail({
          to: [userEmail],
          subject: `Payment receipt for invoice ${String(invoiceId).slice(0, 8)}`,
          emailType: "order",
          text:
            `We received your payment of ${amount.toLocaleString(undefined, { style: "currency", currency: "USD" })}.\n` +
            `${statusLine}\n\n` +
            `View your invoice: ${baseUrl}/portal/invoices/${encodeURIComponent(String(invoiceId))}\n`,
          html:
            `<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.45">` +
            `<h2 style="margin:0 0 10px">Payment received</h2>` +
            `<div style="color:#334155; font-size:14px">Amount: <b>${amount.toLocaleString(undefined, { style: "currency", currency: "USD" })}</b></div>` +
            `<div style="margin-top:6px; color:#334155; font-size:14px">${statusLine}</div>` +
            `<div style="margin-top:14px">` +
            `<a href="${baseUrl}/portal/invoices/${encodeURIComponent(String(invoiceId))}" style="display:inline-block; padding:10px 12px; border-radius:10px; background:#111; color:white; text-decoration:none; font-weight:800">View invoice</a>` +
            `</div>` +
            `</div>`,
          attachments: attachment ? [attachment] : [],
        });
        const nextMeta = {
          ...meta,
          last_receipt_emailed_at: new Date().toISOString(),
          last_receipt_email_to: userEmail,
          last_receipt_payment_intent: intent.id,
        };
        await supabaseAdmin.from("invoices").update({ metadata: nextMeta }).eq("id", invoiceId);
      } catch {
        // ignore
      }
    }
  }

  if (orderId && UUID_RE.test(orderId)) {
    try {
      const { schedulePartnerFulfillmentSync } = await import("@/lib/integrations/outbound/schedulePartnerFulfillmentSync");
      await schedulePartnerFulfillmentSync(supabaseAdmin, orderId);
    } catch {
      // The payment is already recorded. The outbox worker reconciles a missed receipt.
    }
  }

  return { ok: true };
}
