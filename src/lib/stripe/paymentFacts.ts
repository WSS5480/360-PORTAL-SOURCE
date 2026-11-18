type PaymentMethodLike = { type?: string | null } | string | null | undefined;
type ChargeLike = { id?: string | null; payment_method_details?: { type?: string | null } | null } | string | null | undefined;

export type PartnerPaymentMethod = "credit_card" | "ach" | "wire";

export function partnerPaymentFacts(intent: {
  id: string;
  payment_method?: PaymentMethodLike;
  latest_charge?: ChargeLike;
  metadata?: Record<string, string> | null;
}): { method: PartnerPaymentMethod | null; confirmationCode: string } {
  const methodObject = intent.payment_method && typeof intent.payment_method === "object" ? intent.payment_method.type : null;
  const charge = intent.latest_charge && typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const raw = methodObject || charge?.payment_method_details?.type || intent.metadata?.payment_method_type || "";
  const method = raw === "card" ? "credit_card" : raw === "us_bank_account" ? "ach" : raw === "wire" ? "wire" : null;
  const confirmationCode = charge?.id || (typeof intent.latest_charge === "string" ? intent.latest_charge : "") || intent.id;
  return { method, confirmationCode };
}
