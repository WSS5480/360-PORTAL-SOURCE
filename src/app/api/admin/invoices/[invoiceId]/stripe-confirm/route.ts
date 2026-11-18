import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";
import { applySucceededPaymentIntentToInvoice } from "@/lib/stripe/applySucceededPaymentIntentToInvoice";
import { syncStripePaymentSubmissionFromIntent } from "@/lib/stripe/syncStripePaymentSubmissionFromIntent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return s;
}

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

function stripeLastPaymentErrorMessage(intent: Stripe.PaymentIntent): string | null {
  const e = intent.last_payment_error as { message?: string } | null | undefined;
  const m = e?.message;
  return typeof m === "string" && m.trim() ? m.trim() : null;
}

async function resolveAccountBillingEmail(accountId: string): Promise<string | null> {
  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("billing_email")
    .eq("id", accountId)
    .maybeSingle();
  const billing = safeStr((account as any)?.billing_email);
  if (billing) return billing;

  const { data: invMeta } = await supabaseAdmin
    .from("invoices")
    .select("metadata")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const metaBilling = safeStr((invMeta as any)?.metadata?.billing_email);
  return metaBilling || null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  await requireOrdersStaffOrAdmin();

  const resolved = await Promise.resolve(params as any);
  const invoiceId = normalizeParam(resolved?.invoiceId ?? "");
  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ ok: false, error: "Invalid invoiceId" }, { status: 400 });
  }

  const payload = await req.json().catch(() => null);
  const paymentIntentId = safeStr(payload?.payment_intent);
  if (!paymentIntentId) {
    return NextResponse.json({ ok: false, error: "Missing payment_intent" }, { status: 400 });
  }

  const { data: invoice, error: invErr } = await supabaseAdmin
    .from("invoices")
    .select("id, account_id, order_id, metadata")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!invoice) return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });

  const accountId = safeStr((invoice as any).account_id);

  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["payment_method"],
    });

    const metaInvoiceId = safeStr(intent.metadata?.invoice_id);
    const metaAccountId = safeStr(intent.metadata?.account_id);
    const metaSource = safeStr(intent.metadata?.source);

    if (metaInvoiceId && metaInvoiceId !== invoiceId) {
      return NextResponse.json({ ok: false, error: "Invoice mismatch." }, { status: 400 });
    }
    if (metaAccountId && metaAccountId !== accountId) {
      return NextResponse.json({ ok: false, error: "Account mismatch." }, { status: 400 });
    }
    if (metaSource && metaSource !== "admin") {
      return NextResponse.json({ ok: false, error: "Payment was not initiated from admin." }, { status: 400 });
    }

    const invMeta = (invoice as any)?.metadata ?? {};
    const receiptEmail =
      safeStr(invMeta?.billing_email) ||
      (await resolveAccountBillingEmail(accountId)) ||
      safeStr(intent.metadata?.admin_user_email) ||
      null;

    if (intent.status === "succeeded") {
      const result = await applySucceededPaymentIntentToInvoice(intent, {
        expectedInvoiceId: invoiceId,
        ...(metaInvoiceId ? {} : { forcedInvoiceId: invoiceId }),
        receiptEmailOverride: receiptEmail,
      });

      if (!result.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: result.reason?.startsWith("not_succeeded")
              ? "Payment not completed."
              : result.reason || "Failed to apply payment.",
          },
          { status: result.reason?.startsWith("reconciliation_record_failed") || result.reason?.startsWith("insert_payment_failed") ? 500 : 400 }
        );
      }

      if (result.reconciliation === "open") {
        return NextResponse.json(
          {
            ok: true,
            applied: false,
            reconciliation: "open",
            status: intent.status,
            error: "The payment was captured and recorded for reconciliation. It was not applied because it exceeds the invoice balance.",
          },
          { status: 200 }
        );
      }

      return NextResponse.json({ ok: true, applied: true, status: intent.status }, { status: 200 });
    }

    await syncStripePaymentSubmissionFromIntent(intent);

    if (
      intent.status === "processing" ||
      intent.status === "requires_action" ||
      intent.status === "requires_confirmation"
    ) {
      return NextResponse.json(
        { ok: true, pending: true, status: intent.status, stripe_status: intent.status },
        { status: 200 }
      );
    }

    if (intent.status === "canceled" || intent.last_payment_error) {
      return NextResponse.json(
        {
          ok: true,
          failed: true,
          status: intent.status,
          stripe_status: intent.status,
          error_message: stripeLastPaymentErrorMessage(intent),
        },
        { status: 200 }
      );
    }

    if (intent.status === "requires_payment_method") {
      const errMsg = stripeLastPaymentErrorMessage(intent);
      const hasErr = !!errMsg || !!intent.last_payment_error;
      return NextResponse.json(
        {
          ok: true,
          failed: hasErr,
          pending: !hasErr,
          status: intent.status,
          stripe_status: intent.status,
          error_message: errMsg,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Payment not completed.", status: intent.status, stripe_status: intent.status },
      { status: 400 }
    );
  } catch (err) {
    console.error("[admin stripe-confirm]", err);
    return NextResponse.json({ ok: false, error: "Could not confirm payment. Try refreshing the page." }, { status: 500 });
  }
}
