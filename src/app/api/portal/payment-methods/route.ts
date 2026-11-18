import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { canViewOrders, isAccountAdmin } from "@/lib/portal/portalRoles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  listSavedCardPaymentMethods,
  stripePublicErrorMessage,
} from "@/lib/stripe/accountCustomer";
import { stripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

export async function GET() {
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

  try {
    const { data: account, error } = await supabaseAdmin
      .from("accounts")
      .select("stripe_customer_id")
      .eq("id", accountId)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const customerId = safeStr((account as any)?.stripe_customer_id);
    if (!customerId) {
      return NextResponse.json({
        ok: true,
        canManage: isAccountAdmin(ctx.currentRole),
        paymentMethods: [],
      });
    }

    const customer = await stripe.customers.retrieve(customerId);
    const defaultPm =
      typeof customer !== "string" && !customer.deleted
        ? safeStr(customer.invoice_settings?.default_payment_method)
        : "";

    const methods = await listSavedCardPaymentMethods(customerId, defaultPm || null);

    return NextResponse.json({
      ok: true,
      canManage: isAccountAdmin(ctx.currentRole),
      paymentMethods: methods,
    });
  } catch (err) {
    console.error("[portal payment-methods]", err);
    return NextResponse.json(
      { ok: false, error: stripePublicErrorMessage(err, "Failed to load payment methods.") },
      { status: 500 }
    );
  }
}
