"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import InvoiceDownloadClient from "@/app/portal/orders/[orderId]/InvoiceDownloadClient";
import { usePathname, useSearchParams } from "next/navigation";
import PortalProcessingOverlay from "@/components/portal/PortalProcessingOverlay";
import {
  clearPaymentOverlayFlag,
  clearPlaceOrderOverlayFlag,
  setPaymentOverlayFlag,
} from "@/lib/portal/portalOverlaySession";
import { formatStatusLabel } from "@/lib/formatStatusLabel";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

export type PortalInvoicePayment = {
  id: string;
  amount?: number | null;
  note?: string | null;
  created_at?: string | null;
};

export type PortalInvoiceSubmission = {
  id: string;
  method?: string | null;
  amount?: number | null;
  status?: string | null;
  reference?: string | null;
  sent_at?: string | null;
  note?: string | null;
  created_at?: string | null;
  /** Last seen Stripe PaymentIntent.status (e.g. processing, succeeded) */
  stripe_payment_intent_status?: string | null;
};

type InvoiceSummary = {
  id: string;
  invoice_number?: string | null;
  status?: string | null;
  issued_at?: string | null;
  order_id?: string | null;
  total: number;
  amount_paid: number;
  remaining: number;
};

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

function dateTime(v: unknown) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function statusKey(v: unknown) {
  return String(v ?? "").toUpperCase();
}

function pillStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    whiteSpace: "nowrap",
  };

  const s = statusKey(status);
  if (s === "ISSUED") return { ...base, background: "rgba(13, 110, 253, 0.12)" };
  if (s === "PARTIALLY_PAID") return { ...base, background: "rgba(255, 193, 7, 0.18)" };
  if (s === "PAID") return { ...base, background: "rgba(25, 135, 84, 0.16)" };
  if (s === "VOID" || s === "VOIDED") return { ...base, background: "rgba(220, 53, 69, 0.12)" };
  return base;
}

function Button({
  children,
  type = "button",
  disabled,
  onClick,
  tone = "primary",
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "muted";
}) {
  const base: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    fontWeight: 950,
    cursor: disabled ? "not-allowed" : "pointer",
    background: tone === "primary" ? "#111" : "white",
    color: tone === "primary" ? "white" : "#111",
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <button type={type} disabled={disabled} onClick={onClick} style={base}>
      {children}
    </button>
  );
}

function StripePaymentForm({
  invoiceId,
  amount,
  remaining,
  onPaid,
  returnTo,
  payPathname,
}: {
  invoiceId: string;
  amount: number;
  remaining: number;
  onPaid: () => void;
  returnTo: string | null;
  /** Current pay page path e.g. /portal/invoices/.../pay — used after inline success */
  payPathname: string;
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
    setPaymentOverlayFlag();

    try {
      if (amount <= 0 || amount > remaining) {
        setError("Enter a valid amount.");
        clearPaymentOverlayFlag();
        return;
      }

      const ret =
        returnTo && returnTo.startsWith("/portal/")
          ? `${window.location.origin}${returnTo}`
          : `${window.location.origin}/portal/invoices/${encodeURIComponent(invoiceId)}/pay?paid=1`;

      const { error: stripeErr, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: ret,
        },
        redirect: "if_required",
      });

      if (stripeErr) {
        clearPaymentOverlayFlag();
        setError(stripeErr.message ?? "Payment failed.");
        return;
      }

      // 3DS / bank redirect: user leaves the page; Stripe resolves when they return.
      if (!paymentIntent?.id) {
        clearPaymentOverlayFlag();
        return;
      }

      const confirmRes = await fetch(`/api/portal/invoices/${encodeURIComponent(invoiceId)}/stripe-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_intent: paymentIntent.id }),
      });
      const confirmJson = await confirmRes.json().catch(() => null);
      clearPaymentOverlayFlag();

      if (!confirmRes.ok) {
        setError(String(confirmJson?.error || "Could not record payment. Try refreshing the page."));
        return;
      }

      if (confirmJson?.reconciliation === "open") {
        setError(String(confirmJson?.error || "The payment was captured and recorded for reconciliation. It was not applied to the invoice."));
        return;
      }

      if (confirmJson?.pending) {
        window.location.href = payPathname;
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
      clearPaymentOverlayFlag();
      setError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <PaymentElement />
        {error ? <div style={styles.error}>{error}</div> : null}
        <Button type="submit" disabled={!stripe || submitting || amount <= 0 || amount > remaining}>
          {submitting ? "Processing..." : `Pay ${money(amount)}`}
        </Button>
      </form>
    </>
  );
}

export default function PortalInvoicePayClient({
  invoice,
  payments,
  submissions,
  wireInstructions,
}: {
  invoice: InvoiceSummary;
  payments: PortalInvoicePayment[];
  submissions: PortalInvoiceSubmission[];
  wireInstructions: string;
}) {
  const [activeTab, setActiveTab] = useState<"stripe" | "wire">("stripe");
  const [amount, setAmount] = useState(() => roundCents(invoice.remaining || 0));
  const [amountInput, setAmountInput] = useState(() =>
    Number.isFinite(invoice.remaining) ? Number(invoice.remaining).toFixed(2) : "0.00"
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [customerSessionClientSecret, setCustomerSessionClientSecret] = useState<string | null>(null);
  const [stripeBusy, setStripeBusy] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [wireBusy, setWireBusy] = useState(false);
  const [wireError, setWireError] = useState<string | null>(null);
  const [wireOk, setWireOk] = useState<string | null>(null);
  const [localSubmissions, setLocalSubmissions] = useState<PortalInvoiceSubmission[]>([]);
  const [stripeOk, setStripeOk] = useState<string | null>(null);
  const [payOverlay, setPayOverlay] = useState<null | { phase: "processing" | "success" }>(null);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const remaining = invoice.remaining;
  const hasStripeKey = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const returnToOrder = (() => {
    const raw = searchParams.get("return_to");
    if (!raw || !raw.startsWith("/portal/")) return null;
    return raw;
  })();

  const allSubmissions = useMemo(
    () => [...localSubmissions, ...submissions],
    [localSubmissions, submissions]
  );

  /** Place-order overlay stays up until this page loads after redirect from submit → pay. */
  useEffect(() => {
    clearPlaceOrderOverlayFlag();
  }, []);

  /** Drop stale “processing payment” overlay when opening this page (e.g. after redirect from place order). */
  useEffect(() => {
    const redirectStatus = searchParams.get("redirect_status");
    const paymentIntent = searchParams.get("payment_intent");
    if (!(redirectStatus === "succeeded" && paymentIntent)) {
      clearPaymentOverlayFlag();
    }
  }, [searchParams]);

  useEffect(() => {
    const redirectStatus = searchParams.get("redirect_status");
    const paymentIntent = searchParams.get("payment_intent");
    const paidFlag = searchParams.get("paid");

    async function confirmStripeReturn() {
      if (!paymentIntent) return;
      setPaymentOverlayFlag();
      try {
        const res = await fetch(`/api/portal/invoices/${encodeURIComponent(invoice.id)}/stripe-confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_intent: paymentIntent }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          clearPaymentOverlayFlag();
          const err = json?.error || "Payment confirmed, but invoice update failed.";
          if (err.toLowerCase().includes("payment not completed") || err.toLowerCase().includes("not completed")) {
            setStripeError(
              "Your ACH payment is processing. It typically clears within a few minutes—refresh this page and the invoice will update. On localhost, run: stripe listen --forward-to localhost:3000/api/stripe/webhook (and use the whsec_... secret in STRIPE_WEBHOOK_SECRET)."
            );
          } else {
            setStripeError(err);
          }
          return;
        }
        clearPaymentOverlayFlag();
        if (json?.reconciliation === "open") {
          setStripeError(String(json?.error || "The payment was captured and recorded for reconciliation. It was not applied to the invoice."));
          return;
        }
        if (json?.pending) {
          setStripeOk(
            "Bank payment is processing (Stripe: " +
              String(json?.stripe_status || json?.status || "processing") +
              "). This page will refresh — the invoice updates when the bank clears."
          );
          window.setTimeout(() => {
            window.location.href = pathname;
          }, 800);
          return;
        }
        if (json?.failed) {
          setStripeError(
            json?.error_message ||
              "Payment was not completed. Check your bank account or try another payment method."
          );
          window.setTimeout(() => {
            window.location.href = pathname;
          }, 1200);
          return;
        }
        setPayOverlay({ phase: "success" });
        window.setTimeout(() => {
          window.location.href = pathname;
        }, 1400);
      } catch {
        clearPaymentOverlayFlag();
        setStripeError("Could not apply payment to the invoice. Try refreshing the page.");
      }
    }

    if (redirectStatus === "succeeded" && paymentIntent) {
      void confirmStripeReturn();
      return;
    }

    if ((redirectStatus === "processing" || redirectStatus === "pending") && paymentIntent) {
      void confirmStripeReturn();
      return;
    }

    if (redirectStatus === "failed" && paymentIntent) {
      void confirmStripeReturn();
      return;
    }

    if (paidFlag === "1") {
      clearPaymentOverlayFlag();
      setPayOverlay({ phase: "success" });
      const timer = window.setTimeout(() => {
        window.location.href = pathname;
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [searchParams, pathname, invoice.id]);

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

  async function createPaymentIntent() {
    setStripeError(null);
    setStripeBusy(true);
    try {
      const res = await fetch(`/api/portal/invoices/${encodeURIComponent(invoice.id)}/stripe-intent`, {
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
      setStripeError(err instanceof Error ? err.message : "Failed to initialize payment.");
    } finally {
      setStripeBusy(false);
    }
  }

  async function submitWire(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setWireError(null);
    setWireOk(null);
    setWireBusy(true);

    try {
      if (amount <= 0 || amount > remaining) {
        throw new Error("Enter a valid amount.");
      }

      const fd = new FormData(form);
      fd.set("amount", String(amount));

      const res = await fetch(`/api/portal/invoices/${encodeURIComponent(invoice.id)}/wire`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || "Failed to submit wire.");
      }

      const sub = json?.submission;
      setLocalSubmissions((prev) => [
        {
          id: sub?.id ?? `local-${Date.now()}`,
          method: "WIRE",
          amount: safeNum(sub?.amount ?? amount),
          status: String(sub?.status ?? "WIRE_PENDING"),
          reference: sub?.reference ?? null,
          sent_at: sub?.sent_at ?? null,
          note: sub?.note ?? null,
          created_at: sub?.created_at ?? new Date().toISOString(),
        },
        ...prev,
      ]);
      setWireOk("Wire submission received. Status: wire pending — we’ll verify your payment and apply it shortly.");
      form.reset();
    } catch (err) {
      setWireError(err instanceof Error ? err.message : "Failed to submit wire.");
    } finally {
      setWireBusy(false);
    }
  }

  return (
    <main style={styles.page}>
      <PortalProcessingOverlay
        show={payOverlay?.phase === "success"}
        success
        title="Payment confirmed"
        subtitle="Your payment was applied. Refreshing this page."
        zIndex={280}
      />
      <div style={styles.header}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Customer • Invoice</div>
          <h1 style={{ margin: "6px 0 0" }}>
            Pay invoice {invoice.invoice_number ?? invoice.id.slice(0, 8) + "…"}
          </h1>
          <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={pillStyle(String(invoice.status ?? "—"))}>{formatStatusLabel(invoice.status)}</span>
            <span style={styles.meta}>Issued: {dateTime(invoice.issued_at)}</span>
            <span style={styles.meta}>Remaining: {money(remaining)}</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <InvoiceDownloadClient invoiceId={invoice.id} enabled={true} />
          </div>
        </div>
        <div style={{ display: "grid", gap: 8, textAlign: "right" }}>
          <Link href={`/portal/invoices/${encodeURIComponent(invoice.id)}`} style={styles.link}>
            ← Back to invoice
          </Link>
          <Link href="/portal/invoices" style={styles.link}>
            All invoices
          </Link>
          {returnToOrder ? (
            <Link href={returnToOrder} style={styles.link}>
              Back to order
            </Link>
          ) : null}
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>Choose payment method</div>
        <div style={styles.tabs}>
          <button
            type="button"
            onClick={() => setActiveTab("stripe")}
            style={{ ...styles.tabBtn, ...(activeTab === "stripe" ? styles.tabBtnActive : null) }}
          >
            Pay by card/bank
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("wire")}
            style={{ ...styles.tabBtn, ...(activeTab === "wire" ? styles.tabBtnActive : null) }}
          >
            Wire transfer
          </button>
        </div>

        <div style={{ padding: "0 12px 12px", display: "grid", gap: 8 }}>
          {stripeOk ? <div style={styles.success}>{stripeOk}</div> : null}
          {stripeError ? <div style={styles.error}>{stripeError}</div> : null}
        </div>

        <div style={styles.tabBody}>
          <div style={styles.amountRow}>
            <div style={{ fontWeight: 900 }}>Payment amount</div>
            <div style={styles.amountInputWrap}>
              <input
                name="amount"
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => {
                  const nextRaw = e.target.value;
                  setAmountInput(nextRaw);
                  const parsed = parseAmount(nextRaw);
                  if (parsed != null) {
                    setAmount(clampAmount(parsed));
                  }
                  setClientSecret(null);
                  setCustomerSessionClientSecret(null);
                }}
                onBlur={() => {
                  const parsed = parseAmount(amountInput);
                  const next = clampAmount(parsed ?? 0);
                  setAmount(next);
                  setAmountInput(next.toFixed(2));
                }}
                style={styles.amountInput}
              />
              <div style={styles.amountHint}>Up to {money(remaining)}</div>
            </div>
          </div>

          {activeTab === "stripe" ? (
            <div style={{ display: "grid", gap: 12 }}>
              {!hasStripeKey ? (
                <div style={styles.notice}>Stripe is not configured yet.</div>
              ) : clientSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    ...(customerSessionClientSecret ? { customerSessionClientSecret } : {}),
                    appearance: { theme: "stripe" },
                  }}
                >
                  <StripePaymentForm
                    invoiceId={invoice.id}
                    amount={amount}
                    remaining={remaining}
                    payPathname={pathname}
                    onPaid={() => {
                      setStripeError(null);
                      try {
                        window.dispatchEvent(new Event("portal-overlay-sync"));
                      } catch {
                        /* ignore */
                      }
                      window.location.href = `${pathname}?paid=1`;
                    }}
                    returnTo={returnToOrder}
                  />
                </Elements>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={styles.notice}>
                    We’ll open a secure payment form for card or bank account. Your payment will be applied once confirmed.
                  </div>
                  <Button disabled={!hasStripeKey || stripeBusy || amount <= 0} onClick={createPaymentIntent}>
                    {stripeBusy ? "Loading..." : "Continue to payment"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={submitWire} style={{ display: "grid", gap: 12 }}>
              <div style={styles.notice}>
                Send a wire using the instructions below. Include your invoice number in the bank memo. After the wire is
                sent, upload proof (PDF receipt, bank confirmation, or screenshot). An admin will verify before applying
                your payment.
              </div>
              {wireInstructions ? <pre style={styles.wireBox}>{wireInstructions}</pre> : null}

              <div style={styles.formRow}>
                <label style={styles.label}>
                  Reference / confirmation
                  <input name="reference" style={styles.input} placeholder="Bank reference or confirmation ID" />
                </label>
                <label style={styles.label}>
                  Date sent
                  <input name="sent_at" type="date" style={styles.input} />
                </label>
              </div>
              <label style={styles.label}>
                Note (optional)
                <textarea name="note" style={styles.textarea} rows={3} />
              </label>
              <label style={styles.label}>
                Wire proof (required)
                <input name="proof" type="file" accept="image/*,.pdf,application/pdf" required style={styles.input} />
                <div style={styles.meta}>PDF, PNG, JPG, or screenshot — max 12 MB.</div>
              </label>

              {wireError ? <div style={styles.error}>{wireError}</div> : null}
              {wireOk ? <div style={styles.success}>{wireOk}</div> : null}

              <Button type="submit" disabled={wireBusy || amount <= 0 || amount > remaining} tone="primary">
                {wireBusy ? "Submitting..." : "Mark wire as sent"}
              </Button>
            </form>
          )}
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>Payment activity</div>
        <div style={{ padding: 14, display: "grid", gap: 10 }}>
          {allSubmissions.length === 0 && payments.length === 0 ? (
            <div style={styles.meta}>No payment activity yet.</div>
          ) : (
            <>
              {allSubmissions.map((s) => (
                <div key={s.id} style={styles.activityRow}>
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      {s.method ?? "WIRE"} submission · {money(s.amount)}
                    </div>
                    <div style={styles.meta}>
                      Status: {formatStatusLabel(s.status)}
                      {s.stripe_payment_intent_status
                        ? ` · Stripe: ${String(s.stripe_payment_intent_status)}`
                        : ""}{" "}
                      · Sent {dateTime(s.sent_at || s.created_at)}
                    </div>
                  </div>
                  <div style={styles.meta}>{s.reference || "—"}</div>
                </div>
              ))}
              {payments.map((p) => (
                <div key={p.id} style={styles.activityRow}>
                  <div>
                    <div style={{ fontWeight: 900 }}>Payment posted · {money(p.amount)}</div>
                    <div style={styles.meta}>Recorded {dateTime(p.created_at)}</div>
                  </div>
                  <div style={styles.meta}>{p.note || "—"}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 18, maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 },
  header: {
    borderRadius: 20,
    border: "1px solid rgba(0,0,0,0.12)",
    padding: 18,
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    background: "white",
    boxShadow: "0 10px 26px rgba(0,0,0,0.06)",
  },
  meta: { fontSize: 12, opacity: 0.7, fontWeight: 800 },
  link: { textDecoration: "none", fontWeight: 900, color: "var(--brand-700)" },
  card: {
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 18,
    background: "white",
    boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  cardHeader: {
    padding: 12,
    fontWeight: 950,
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    background: "rgba(0,0,0,0.02)",
  },
  tabs: { display: "flex", gap: 8, padding: 12 },
  tabBtn: {
    padding: "8px 12px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(0,0,0,0.12)",
    background: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  tabBtnActive: {
    background: "var(--brand-050)",
    borderColor: "color-mix(in srgb, var(--brand-600) 22%, var(--border))",
  },
  tabBody: { padding: 14, display: "grid", gap: 16 },
  amountRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
  amountInputWrap: { display: "grid", gap: 6, minWidth: 240 },
  amountInput: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    fontWeight: 900,
  },
  amountHint: { fontSize: 12, opacity: 0.65, fontWeight: 800 },
  notice: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(0,0,0,0.02)",
    fontSize: 13,
    fontWeight: 700,
  },
  error: {
    padding: 10,
    borderRadius: 12,
    background: "rgba(220, 38, 38, 0.10)",
    border: "1px solid rgba(220, 38, 38, 0.25)",
    color: "rgb(153, 27, 27)",
    fontWeight: 900,
    fontSize: 12,
  },
  success: {
    padding: 10,
    borderRadius: 12,
    background: "rgba(16, 185, 129, 0.10)",
    border: "1px solid rgba(16, 185, 129, 0.25)",
    color: "rgb(6, 95, 70)",
    fontWeight: 900,
    fontSize: 12,
  },
  wireBox: {
    padding: 12,
    borderRadius: 12,
    background: "rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.12)",
    whiteSpace: "pre-wrap",
    fontSize: 12,
    lineHeight: 1.5,
    fontWeight: 700,
  },
  formRow: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" },
  label: { display: "grid", gap: 6, fontSize: 12, fontWeight: 900 },
  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    fontWeight: 800,
  },
  textarea: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    fontWeight: 800,
  },
  activityRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    paddingBottom: 10,
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },
};
