"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

function safeNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function roundCents(v: unknown) {
  const n = safeNum(v);
  return Math.round(n * 100) / 100;
}

function money(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "—";
}

function AdminStripePaymentForm({
  invoiceId,
  amount,
  remaining,
  returnPath,
  onPaid,
}: {
  invoiceId: string;
  amount: number;
  remaining: number;
  returnPath: string;
  onPaid: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setSubmitting(true);

    try {
      if (amount <= 0 || amount > remaining) {
        setError("Enter a valid amount.");
        return;
      }

      const returnUrl = `${window.location.origin}${returnPath}?stripe_paid=1`;

      const { error: stripeErr, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: "if_required",
      });

      if (stripeErr) {
        setError(stripeErr.message ?? "Payment failed.");
        return;
      }

      if (!paymentIntent?.id) return;

      const confirmRes = await fetch(`/api/admin/invoices/${encodeURIComponent(invoiceId)}/stripe-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_intent: paymentIntent.id }),
      });
      const confirmJson = await confirmRes.json().catch(() => null);

      if (!confirmRes.ok) {
        setError(String(confirmJson?.error || "Could not record payment. Try refreshing the page."));
        return;
      }

      if (confirmJson?.reconciliation === "open") {
        setError(String(confirmJson?.error || "The payment was captured and recorded for reconciliation. It was not applied to the invoice."));
        return;
      }

      if (confirmJson?.pending) {
        setError(
          "Bank payment is processing. Refresh this page in a few minutes — the invoice will update when the bank clears."
        );
        return;
      }

      if (confirmJson?.failed) {
        setError(
          String(confirmJson?.error_message || "Payment was not completed. Try another card or payment method.")
        );
        return;
      }

      onPaid();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
      <PaymentElement />
      {error ? (
        <div
          style={{
            padding: 10,
            borderRadius: 12,
            background: "rgba(220, 38, 38, 0.10)",
            border: "1px solid rgba(220, 38, 38, 0.25)",
            color: "rgb(153, 27, 27)",
            fontWeight: 900,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={!stripe || submitting || amount <= 0 || amount > remaining}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.12)",
          fontWeight: 950,
          cursor: submitting ? "not-allowed" : "pointer",
          background: "#111",
          color: "white",
          opacity: submitting || !stripe ? 0.6 : 1,
        }}
      >
        {submitting ? "Processing..." : `Charge ${money(amount)}`}
      </button>
    </form>
  );
}

export default function AdminInvoiceStripePayClient({
  invoiceId,
  remaining,
  accountName,
  disabled,
  returnPath,
}: {
  invoiceId: string;
  remaining: number;
  accountName: string;
  disabled?: boolean;
  /** Path after Stripe redirect (defaults to admin invoice page). */
  returnPath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasStripeKey = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const stripeReturnPath =
    returnPath || `/admin/invoices/${encodeURIComponent(invoiceId)}`;

  const [amount, setAmount] = useState(() => roundCents(remaining || 0));
  const [amountInput, setAmountInput] = useState(() =>
    Number.isFinite(remaining) ? Number(remaining).toFixed(2) : "0.00"
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerSessionClientSecret, setCustomerSessionClientSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    const redirectStatus = searchParams.get("redirect_status");
    const paymentIntent = searchParams.get("payment_intent");
    const paidFlag = searchParams.get("stripe_paid");

    async function confirmReturn() {
      if (!paymentIntent) return;
      try {
        const res = await fetch(`/api/admin/invoices/${encodeURIComponent(invoiceId)}/stripe-confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_intent: paymentIntent }),
        });
        const json = await res.json().catch(() => null);
        const url = new URL(window.location.href);
        url.searchParams.delete("payment_intent");
        url.searchParams.delete("payment_intent_client_secret");
        url.searchParams.delete("redirect_status");
        url.searchParams.delete("stripe_paid");
        window.history.replaceState({}, "", url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : ""));

        if (!res.ok) {
          setError(String(json?.error || "Payment confirmed, but invoice update failed."));
          return;
        }
        if (json?.reconciliation === "open") {
          setError(String(json?.error || "The payment was captured and recorded for reconciliation. It was not applied to the invoice."));
          return;
        }
        if (json?.pending) {
          setOk("Bank payment is processing. Refresh this page when the bank clears.");
          return;
        }
        if (json?.failed) {
          setError(String(json?.error_message || "Payment was not completed."));
          return;
        }
        setOk("Payment applied.");
        router.refresh();
      } catch {
        setError("Could not apply payment to the invoice. Try refreshing the page.");
      }
    }

    if (paymentIntent && (redirectStatus === "succeeded" || redirectStatus === "processing" || redirectStatus === "pending" || redirectStatus === "failed")) {
      void confirmReturn();
      return;
    }

    if (paidFlag === "1") {
      setOk("Payment applied.");
      router.refresh();
    }
  }, [searchParams, invoiceId, router]);

  function clampAmount(next: number) {
    if (next < 0) return 0;
    return Math.min(next, remaining);
  }

  function parseAmount(raw: string): number | null {
    const cleaned = String(raw ?? "").replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    if (!Number.isFinite(n)) return null;
    return roundCents(n);
  }

  async function startPayment() {
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/invoices/${encodeURIComponent(invoiceId)}/stripe-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.clientSecret) {
        throw new Error(json?.error || "Failed to initialize payment.");
      }
      setClientSecret(json.clientSecret);
      setCustomerSessionClientSecret(json.customerSessionClientSecret ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize payment.");
    } finally {
      setBusy(false);
    }
  }

  if (!hasStripeKey) {
    return (
      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
        Stripe is not configured.
      </div>
    );
  }

  if (disabled || remaining <= 0) {
    return null;
  }

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.85 }}>
        Charge customer via Stripe
      </div>
      <div style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.45, fontWeight: 700 }}>
        Charge <b>{accountName}</b>&apos;s saved card or enter payment details on their behalf. Payments are applied to
        this invoice immediately when Stripe confirms.
      </div>

      {ok ? (
        <div
          style={{
            padding: 10,
            borderRadius: 12,
            background: "rgba(16, 185, 129, 0.10)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            color: "rgb(6, 95, 70)",
            fontWeight: 900,
            fontSize: 12,
          }}
        >
          {ok}
        </div>
      ) : null}
      {error ? (
        <div
          style={{
            padding: 10,
            borderRadius: 12,
            background: "rgba(220, 38, 38, 0.10)",
            border: "1px solid rgba(220, 38, 38, 0.25)",
            color: "rgb(153, 27, 27)",
            fontWeight: 900,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 900, opacity: 0.85 }}>Amount to charge</label>
        <input
          type="text"
          inputMode="decimal"
          value={amountInput}
          disabled={!!clientSecret || busy}
          onChange={(e) => {
            const nextRaw = e.target.value;
            setAmountInput(nextRaw);
            const parsed = parseAmount(nextRaw);
            if (parsed != null) setAmount(clampAmount(parsed));
            setClientSecret(null);
            setCustomerSessionClientSecret(null);
          }}
          onBlur={() => {
            const parsed = parseAmount(amountInput);
            const next = clampAmount(parsed ?? 0);
            setAmount(next);
            setAmountInput(next.toFixed(2));
          }}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            fontWeight: 900,
          }}
        />
        <div style={{ fontSize: 11, opacity: 0.65, fontWeight: 800 }}>Up to {money(remaining)}</div>
      </div>

      {clientSecret ? (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            ...(customerSessionClientSecret ? { customerSessionClientSecret } : {}),
            appearance: { theme: "stripe" },
          }}
        >
          <AdminStripePaymentForm
            invoiceId={invoiceId}
            amount={amount}
            remaining={remaining}
            returnPath={stripeReturnPath}
            onPaid={() => {
              setOk("Payment applied.");
              setClientSecret(null);
              setCustomerSessionClientSecret(null);
              router.refresh();
            }}
          />
        </Elements>
      ) : (
        <button
          type="button"
          disabled={busy || amount <= 0}
          onClick={() => void startPayment()}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            fontWeight: 950,
            cursor: busy ? "not-allowed" : "pointer",
            background: "#111",
            color: "white",
            opacity: busy || amount <= 0 ? 0.6 : 1,
            justifySelf: "start",
          }}
        >
          {busy ? "Loading..." : "Continue to payment"}
        </button>
      )}
    </div>
  );
}
