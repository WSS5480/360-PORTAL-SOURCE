"use client";

import { useCallback, useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

type SavedPaymentMethod = {
  id: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
};

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

function cardLabel(pm: SavedPaymentMethod): string {
  const brand = pm.brand ? pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1) : "Card";
  const last4 = pm.last4 ?? "????";
  const exp =
    pm.expMonth && pm.expYear
      ? `${String(pm.expMonth).padStart(2, "0")}/${String(pm.expYear).slice(-2)}`
      : "—";
  return `${brand} •••• ${last4} · exp ${exp}`;
}

function AddCardForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
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
      const { error: stripeErr } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/portal/settings?card_saved=1`,
        },
        redirect: "if_required",
      });
      if (stripeErr) {
        setError(stripeErr.message ?? "Could not save card.");
        return;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save card.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
      <PaymentElement />
      {error ? (
        <div style={{ padding: 10, borderRadius: 12, background: "rgba(220,38,38,0.08)", color: "rgb(127,29,29)", fontWeight: 800, fontSize: 13 }}>
          {error}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={!stripe || submitting}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            fontWeight: 950,
            cursor: submitting ? "not-allowed" : "pointer",
            background: "#111",
            color: "white",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "Saving..." : "Save card"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onCancel}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            fontWeight: 950,
            cursor: "pointer",
            background: "white",
            color: "#111",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function PaymentMethodsClient({ canManage }: { canManage: boolean }) {
  const hasStripeKey = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);
  const [customerSessionClientSecret, setCustomerSessionClientSecret] = useState<string | null>(null);
  const [setupBusy, setSetupBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadMethods = useCallback(async () => {
    if (!hasStripeKey) {
      setLoading(false);
      return;
    }
    setErr(null);
    try {
      const res = await fetch("/api/portal/payment-methods");
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load payment methods.");
      }
      setMethods(Array.isArray(json?.paymentMethods) ? json.paymentMethods : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load payment methods.");
    } finally {
      setLoading(false);
    }
  }, [hasStripeKey]);

  useEffect(() => {
    void loadMethods();
  }, [loadMethods]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("card_saved") === "1") {
      setOk("Card saved on file.");
      params.delete("card_saved");
      const qs = params.toString();
      const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState({}, "", next);
      void loadMethods();
    }
  }, [loadMethods]);

  async function startAddCard() {
    setSetupBusy(true);
    setErr(null);
    setOk(null);
    try {
      const res = await fetch("/api/portal/payment-methods/setup-intent", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.clientSecret) {
        throw new Error(json?.error || "Failed to open card form.");
      }
      setSetupClientSecret(json.clientSecret);
      setCustomerSessionClientSecret(json.customerSessionClientSecret ?? null);
      setAdding(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to open card form.");
    } finally {
      setSetupBusy(false);
    }
  }

  function cancelAddCard() {
    setAdding(false);
    setSetupClientSecret(null);
    setCustomerSessionClientSecret(null);
  }

  async function handleSaved() {
    setAdding(false);
    setSetupClientSecret(null);
    setCustomerSessionClientSecret(null);
    setOk("Card saved on file.");
    await loadMethods();
  }

  async function removeCard(paymentMethodId: string) {
    setRemovingId(paymentMethodId);
    setErr(null);
    setOk(null);
    try {
      const res = await fetch(`/api/portal/payment-methods/${encodeURIComponent(paymentMethodId)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || "Failed to remove card.");
      }
      setOk("Card removed.");
      await loadMethods();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to remove card.");
    } finally {
      setRemovingId(null);
    }
  }

  if (!hasStripeKey) {
    return (
      <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45, margin: 0 }}>
        Stripe is not configured yet.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45, margin: 0 }}>
        Saved cards are stored securely with Stripe and can be reused when paying invoices. Only account administrators
        can add or remove cards.
      </p>

      {err ? (
        <div style={{ padding: 10, borderRadius: 12, background: "rgba(220,38,38,0.08)", color: "rgb(127,29,29)", fontWeight: 800, fontSize: 13 }}>
          {err}
        </div>
      ) : null}
      {ok ? (
        <div style={{ padding: 10, borderRadius: 12, background: "rgba(16,185,129,0.10)", color: "rgb(6,95,70)", fontWeight: 800, fontSize: 13 }}>
          {ok}
        </div>
      ) : null}

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 800 }}>Loading saved cards…</div>
      ) : methods.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 800 }}>No cards on file yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {methods.map((pm) => (
            <div
              key={pm.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "color-mix(in srgb, var(--surface-2) 40%, var(--surface))",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 850 }}>{cardLabel(pm)}</div>
              {canManage ? (
                <button
                  type="button"
                  disabled={removingId === pm.id}
                  onClick={() => void removeCard(pm.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    fontWeight: 900,
                    fontSize: 12,
                    cursor: removingId === pm.id ? "not-allowed" : "pointer",
                    background: "white",
                    color: "rgb(153,27,27)",
                    opacity: removingId === pm.id ? 0.6 : 1,
                  }}
                >
                  {removingId === pm.id ? "Removing..." : "Remove"}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {canManage && !adding ? (
        <button
          type="button"
          disabled={setupBusy}
          onClick={() => void startAddCard()}
          style={{
            alignSelf: "flex-start",
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            fontWeight: 950,
            cursor: setupBusy ? "not-allowed" : "pointer",
            background: "#111",
            color: "white",
            opacity: setupBusy ? 0.6 : 1,
          }}
        >
          {setupBusy ? "Loading..." : methods.length ? "Add another card" : "Add card"}
        </button>
      ) : null}

      {canManage && adding && setupClientSecret ? (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret: setupClientSecret,
            ...(customerSessionClientSecret ? { customerSessionClientSecret } : {}),
            appearance: { theme: "stripe" },
          }}
        >
          <AddCardForm onSaved={() => void handleSaved()} onCancel={cancelAddCard} />
        </Elements>
      ) : null}
    </div>
  );
}
