import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe/server";

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

type AccountRow = {
  id: string;
  name?: string | null;
  billing_email?: string | null;
  stripe_customer_id?: string | null;
};

export type PortalSavedPaymentMethod = {
  id: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
};

export async function getOrCreateStripeCustomerForAccount(
  sb: SupabaseClient,
  accountId: string,
  opts?: { email?: string | null; name?: string | null }
): Promise<{ customerId: string; created: boolean }> {
  const id = safeStr(accountId);
  if (!id) throw new Error("Missing account id.");

  const { data: account, error } = await sb
    .from("accounts")
    .select("id, name, billing_email, stripe_customer_id")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!account) throw new Error("Account not found.");

  const row = account as AccountRow;
  const existing = safeStr(row.stripe_customer_id);
  if (existing) {
    try {
      const customer = await stripe.customers.retrieve(existing);
      if (!(customer as { deleted?: boolean }).deleted) {
        return { customerId: existing, created: false };
      }
    } catch {
      // fall through and recreate
    }
  }

  const email = safeStr(opts?.email) || safeStr(row.billing_email) || undefined;
  const name = safeStr(opts?.name) || safeStr(row.name) || undefined;

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      account_id: id,
      source: "portal",
    },
  });

  const { error: updErr } = await sb
    .from("accounts")
    .update({ stripe_customer_id: customer.id })
    .eq("id", id);

  if (updErr) throw new Error(updErr.message);

  return { customerId: customer.id, created: true };
}

/** Best-effort attach so invoice pay still works if the Stripe key cannot create customers. */
export async function tryAttachStripeCustomerForPayment(
  sb: SupabaseClient,
  accountId: string,
  opts?: { email?: string | null; name?: string | null }
): Promise<{ customerId: string | null; customerSessionClientSecret: string | null }> {
  try {
    const { customerId } = await getOrCreateStripeCustomerForAccount(sb, accountId, opts);
    try {
      const customerSessionClientSecret = await createStripeCustomerSession(customerId);
      return { customerId, customerSessionClientSecret };
    } catch (err) {
      console.error("[stripe] customer session skipped", err);
      return { customerId, customerSessionClientSecret: null };
    }
  } catch (err) {
    console.error("[stripe] customer attach skipped", err);
    return { customerId: null, customerSessionClientSecret: null };
  }
}

export function stripePublicErrorMessage(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : "";
  if (/permission denied|more_permissions_required|does not have the required permissions/i.test(msg)) {
    return fallback;
  }
  return msg.trim() || fallback;
}

export async function createStripeCustomerSession(customerId: string): Promise<string> {
  const session = await stripe.customerSessions.create({
    customer: customerId,
    components: {
      payment_element: {
        enabled: true,
        features: {
          payment_method_redisplay: "enabled",
          payment_method_save: "enabled",
          payment_method_save_usage: "off_session",
          payment_method_remove: "enabled",
        },
      },
    },
  });

  const secret = session.client_secret;
  if (!secret) throw new Error("Stripe customer session missing client secret.");
  return secret;
}

export async function listSavedCardPaymentMethods(
  customerId: string,
  defaultPaymentMethodId?: string | null
): Promise<PortalSavedPaymentMethod[]> {
  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });

  const defaultId = safeStr(defaultPaymentMethodId);

  return (methods.data ?? []).map((pm) => ({
    id: pm.id,
    brand: pm.card?.brand ?? null,
    last4: pm.card?.last4 ?? null,
    expMonth: pm.card?.exp_month ?? null,
    expYear: pm.card?.exp_year ?? null,
    isDefault: defaultId === pm.id,
  }));
}

export async function detachPaymentMethodFromCustomer(
  customerId: string,
  paymentMethodId: string
): Promise<void> {
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (safeStr(pm.customer) !== customerId) {
    throw new Error("Payment method does not belong to this account.");
  }
  await stripe.paymentMethods.detach(paymentMethodId);
}
