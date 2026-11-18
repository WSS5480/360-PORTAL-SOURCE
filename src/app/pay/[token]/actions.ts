"use server";

import { redirect } from "next/navigation";
import { outstandingCents } from "@/lib/integrations/outbound/paymentPlan";
import { createInvoiceCheckoutSession } from "@/lib/stripe/createInvoiceCheckoutSession";
import { readInvoicePayToken } from "@/lib/stripe/invoicePayToken";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function beginInvoiceCheckout(formData: FormData): Promise<void> {
  const invoiceId = readInvoicePayToken(String(formData.get("token") || ""));
  if (!invoiceId) redirect("/pay/complete?error=invalid");

  const [{ data: invoice }, { data: payments }] = await Promise.all([
    supabaseAdmin.from("invoices").select("id, order_id, invoice_number, total, status, voided_at").eq("id", invoiceId).maybeSingle(),
    supabaseAdmin.from("invoice_payments").select("amount").eq("invoice_id", invoiceId),
  ]);
  if (!invoice || invoice.voided_at || String(invoice.status || "").toUpperCase() === "VOID") {
    redirect("/pay/complete?error=unavailable");
  }

  const remainingCents = outstandingCents(
    Number(invoice.total ?? 0),
    (payments ?? []).map((payment) => ({ amount: Number((payment as { amount?: number }).amount ?? 0) }))
  );
  const requestedCents = Math.round(Number(formData.get("amount")) * 100);
  if (!Number.isInteger(requestedCents) || requestedCents < 50 || requestedCents > remainingCents) {
    redirect(`/pay/${String(formData.get("token"))}?error=amount`);
  }

  const session = await createInvoiceCheckoutSession({
    invoiceId,
    orderId: String(invoice.order_id || ""),
    invoiceNumber: String(invoice.invoice_number || ""),
    amountCents: requestedCents,
  });
  if (!session) redirect("/pay/complete?error=unavailable");
  redirect(session.url);
}
