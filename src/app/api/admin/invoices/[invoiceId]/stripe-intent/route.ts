import { NextResponse } from "next/server";
import { requireOrdersStaffOrAdmin } from "@/lib/admin/requireOrdersStaffOrAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";
import {
  stripePublicErrorMessage,
  tryAttachStripeCustomerForPayment,
} from "@/lib/stripe/accountCustomer";

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

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const adminCtx = await requireOrdersStaffOrAdmin();

  const resolved = await Promise.resolve(params as any);
  const invoiceId = normalizeParam(resolved?.invoiceId ?? "");
  if (!UUID_RE.test(invoiceId)) {
    return NextResponse.json({ ok: false, error: "Invalid invoiceId" }, { status: 400 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const amount = safeNum(payload.amount);
  if (amount <= 0) {
    return NextResponse.json({ ok: false, error: "Amount must be greater than 0." }, { status: 400 });
  }

  const { data: invoice, error: invErr } = await supabaseAdmin
    .from("invoices")
    .select("id, account_id, order_id, status, total, amount_paid")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr) return NextResponse.json({ ok: false, error: invErr.message }, { status: 500 });
  if (!invoice) return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });

  const accountId = safeStr((invoice as any).account_id);
  if (!accountId) {
    return NextResponse.json({ ok: false, error: "Invoice missing account." }, { status: 400 });
  }

  const statusUpper = String((invoice as any).status ?? "").toUpperCase();
  if (statusUpper === "VOID" || statusUpper === "VOIDED") {
    return NextResponse.json({ ok: false, error: "Invoice is voided." }, { status: 400 });
  }

  let paymentsTotal = 0;
  try {
    const { data: payRows } = await supabaseAdmin
      .from("invoice_payments")
      .select("amount")
      .eq("invoice_id", invoiceId);
    paymentsTotal = (payRows ?? []).reduce((sum: number, r: any) => sum + safeNum(r?.amount), 0);
  } catch {
    paymentsTotal = 0;
  }

  const total = safeNum((invoice as any).total);
  const storedPaid = safeNum((invoice as any).amount_paid);
  const amountPaid = Math.max(storedPaid, paymentsTotal);
  const remaining = Math.max(0, total - amountPaid);

  if (amount > remaining) {
    return NextResponse.json({ ok: false, error: "Amount exceeds remaining balance." }, { status: 400 });
  }

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("name, billing_email")
    .eq("id", accountId)
    .maybeSingle();

  const adminUserId = safeStr(adminCtx.user?.id);
  const adminEmail = safeStr(adminCtx.user?.email);

  const amountCents = Math.round(amount * 100);

  try {
    const { customerId, customerSessionClientSecret } = await tryAttachStripeCustomerForPayment(
      supabaseAdmin as any,
      accountId,
      {
        email: safeStr((account as any)?.billing_email) || undefined,
        name: safeStr((account as any)?.name) || undefined,
      }
    );

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      ...(customerId ? { customer: customerId, setup_future_usage: "off_session" as const } : {}),
      payment_method_types: ["card", "us_bank_account"],
      payment_method_options: {
        us_bank_account: {
          verification_method: "automatic",
          financial_connections: { permissions: ["payment_method"] },
        },
      },
      metadata: {
        invoice_id: invoiceId,
        account_id: accountId,
        source: "admin",
        admin_user_id: adminUserId,
        admin_user_email: adminEmail,
      },
    });

    try {
      await supabaseAdmin.from("invoice_payment_submissions").insert({
        invoice_id: invoiceId,
        account_id: accountId,
        method: "STRIPE",
        amount,
        status: "PENDING",
        reference: intent.id,
        created_by_user_id: adminUserId || null,
        stripe_payment_intent_status: intent.status,
      });
    } catch {
      // ignore
    }

    return NextResponse.json(
      { ok: true, clientSecret: intent.client_secret, customerSessionClientSecret },
      { status: 200 }
    );
  } catch (err) {
    console.error("[admin stripe-intent]", err);
    return NextResponse.json(
      { ok: false, error: stripePublicErrorMessage(err, "Failed to initialize payment.") },
      { status: 500 }
    );
  }
}
