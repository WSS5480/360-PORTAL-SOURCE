import { NextResponse } from "next/server";
import { assertPortalAuth, requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { isAccountAdmin } from "@/lib/portal/portalRoles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  stripePublicErrorMessage,
  createStripeCustomerSession,
  getOrCreateStripeCustomerForAccount,
} from "@/lib/stripe/accountCustomer";
import { stripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
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

  return null;
}

export async function POST() {
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

  try {
    const userId = safeStr(ctx.user?.id);
    const userEmail = (await resolveUserEmail(userId)) || safeStr(ctx.user?.email);

    const { customerId } = await getOrCreateStripeCustomerForAccount(supabaseAdmin as any, accountId, {
      email: userEmail,
    });

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: {
        account_id: String(accountId),
        source: "portal_settings",
      },
    });

    let customerSessionClientSecret: string | null = null;
    try {
      customerSessionClientSecret = await createStripeCustomerSession(customerId);
    } catch (err) {
      console.error("[stripe] customer session skipped", err);
    }

    return NextResponse.json({
      ok: true,
      clientSecret: setupIntent.client_secret,
      customerSessionClientSecret,
    });
  } catch (err) {
    console.error("[portal setup-intent]", err);
    return NextResponse.json(
      { ok: false, error: stripePublicErrorMessage(err, "Could not open the card form. Try again or pay from the invoice instead.") },
      { status: 500 }
    );
  }
}
