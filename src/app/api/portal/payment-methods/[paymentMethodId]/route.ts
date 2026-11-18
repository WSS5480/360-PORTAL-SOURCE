import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { isAccountAdmin } from "@/lib/portal/portalRoles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { detachPaymentMethodFromCustomer } from "@/lib/stripe/accountCustomer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PM_RE = /^pm_[a-zA-Z0-9]+$/;

function normalizeParam(raw: unknown): string {
  let s = typeof raw === "string" ? raw : "";
  try {
    s = decodeURIComponent(s);
  } catch {}
  s = s.split("?")[0].split("#")[0].trim();
  return s;
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ paymentMethodId: string }> }
) {
  const ctx = await requireCurrentAccount({ allowMissingSession: true });
  const unauthorized = assertPortalAuth(ctx);
  if (unauthorized) return unauthorized;

  const accountId = ctx.currentAccountId;
  if (!accountId) {
    return NextResponse.json({ ok: false, error: "No account selected" }, { status: 400 });
  }

  if (!isAccountAdmin(ctx.currentRole)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const resolved = await Promise.resolve(params as any);
  const paymentMethodId = normalizeParam(resolved?.paymentMethodId ?? "");
  if (!PM_RE.test(paymentMethodId)) {
    return NextResponse.json({ ok: false, error: "Invalid payment method id" }, { status: 400 });
  }

  try {
    const { data: account, error } = await supabaseAdmin
      .from("accounts")
      .select("stripe_customer_id")
      .eq("id", accountId)
      .maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const customerId = String((account as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? "").trim();
    if (!customerId) {
      return NextResponse.json({ ok: false, error: "No saved payment methods." }, { status: 400 });
    }

    await detachPaymentMethodFromCustomer(customerId, paymentMethodId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[portal payment-methods delete]", err);
    const message = err instanceof Error ? err.message : "Failed to remove payment method.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
