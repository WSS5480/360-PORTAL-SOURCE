import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { canViewOrders } from "@/lib/portal/portalRoles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";
import { applySucceededPaymentIntentToInvoice } from "@/lib/stripe/applySucceededPaymentIntentToInvoice";
import { syncStripePaymentSubmissionFromIntent } from "@/lib/stripe/syncStripePaymentSubmissionFromIntent";
import { isPortalInvoiceRowViewable } from "@/lib/portal/portalRowScope";

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

/** Stripe SDK narrows last_payment_error to `never` in some status branches; read safely. */
function stripeLastPaymentErrorMessage(intent: Stripe.PaymentIntent): string | null {
  const e = intent.last_payment_error as { message?: string } | null | undefined;
  const m = e?.message;
  return typeof m === "string" && m.trim() ? m.trim() : null;
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;
  const accountId = ctx.currentAccountId;

  if (!accountId) {
    return NextResponse.json({ ok: false, error: "No account selected" }, { status: 400 });
  }

  if (!canViewOrders(ctx.currentRole)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const resolved = await Promise.resolve(params as any);
  const invoiceId = normalizeParam(resolved?.invoiceId ?? "");
  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ ok: false, error: "Invalid invoiceId" }, { status: 400 });
  }

  const payload = await req.json().catch(() => null);
  const paymentIntentId = String(payload?.payment_intent ?? "").trim();
  if (!paymentIntentId) {
    return NextResponse.json({ ok: false, error: "Missing payment_intent" }, { status: 400 });
  }

  const { data: invoice, error: invErr } = await supabaseAdmin
    .from("invoices")
    .select("id, account_id, order_id")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!invoice) return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });

  if (String((invoice as any).account_id) !== String(accountId)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const portalUserId = String((ctx.user as any)?.id ?? "");
  const viewable = await isPortalInvoiceRowViewable(supabaseAdmin as any, accountId, portalUserId, ctx.currentRole, invoice as any);
  if (!viewable) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["payment_method"],
    });

    const metaInvoiceId = String(intent.metadata?.invoice_id || "");
    if (metaInvoiceId && metaInvoiceId !== invoiceId) {
      return NextResponse.json({ ok: false, error: "Invoice mismatch." }, { status: 400 });
    }

    const receiptEmail =
      (await resolveUserEmail(String(ctx.user?.id || ""))) || safeStr(ctx.user?.email) || null;

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
    console.error("[portal stripe-confirm]", err);
    return NextResponse.json({ ok: false, error: "Could not confirm payment. Try refreshing the page." }, { status: 500 });
  }
}
