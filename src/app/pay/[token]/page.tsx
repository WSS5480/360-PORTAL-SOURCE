import { outstandingCents } from "@/lib/integrations/outbound/paymentPlan";
import { readInvoicePayToken } from "@/lib/stripe/invoicePayToken";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { beginInvoiceCheckout } from "./actions";

export const dynamic = "force-dynamic";

function dollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function PayInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  let invoiceId: string | null = null;
  try {
    invoiceId = readInvoicePayToken(token);
  } catch {
    invoiceId = null;
  }
  if (!invoiceId) {
    return <main style={{ maxWidth: 560, margin: "48px auto", fontFamily: "sans-serif" }}>This payment link is not valid.</main>;
  }

  const [{ data: invoice }, { data: payments }] = await Promise.all([
    supabaseAdmin.from("invoices").select("invoice_number, total, status, voided_at").eq("id", invoiceId).maybeSingle(),
    supabaseAdmin.from("invoice_payments").select("amount").eq("invoice_id", invoiceId),
  ]);
  if (!invoice || invoice.voided_at) {
    return <main style={{ maxWidth: 560, margin: "48px auto", fontFamily: "sans-serif" }}>This invoice is not available for payment.</main>;
  }

  const remainingCents = outstandingCents(
    Number(invoice.total ?? 0),
    (payments ?? []).map((payment) => ({ amount: Number((payment as { amount?: number }).amount ?? 0) }))
  );

  return (
    <main style={{ maxWidth: 560, margin: "48px auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Pay invoice {invoice.invoice_number || ""}</h1>
      <p>No 360 Medical account is required. Card and bank account details are entered on the secure payment page.</p>
      <p>
        Balance due: <strong>{dollars(remainingCents)}</strong>
      </p>
      {query.error === "amount" ? <p>Enter an amount from $0.50 up to the balance due.</p> : null}
      {remainingCents < 50 ? <p>This invoice has no remaining balance.</p> : null}
      {remainingCents >= 50 ? (
        <form action={beginInvoiceCheckout} style={{ display: "grid", gap: 12, marginTop: 20 }}>
          <input type="hidden" name="token" value={token} />
          <label>
            Amount (USD)
            <input
              name="amount"
              type="number"
              min="0.50"
              step="0.01"
              max={(remainingCents / 100).toFixed(2)}
              defaultValue={(remainingCents / 100).toFixed(2)}
              required
              style={{ display: "block", marginTop: 6, padding: 10, width: 180 }}
            />
          </label>
          <button type="submit" style={{ width: 280, padding: "12px 16px", fontWeight: 700 }}>
            Continue to secure payment
          </button>
        </form>
      ) : null}
    </main>
  );
}
