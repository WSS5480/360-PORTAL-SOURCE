"use client";

import PortalProcessingOverlay from "@/components/portal/PortalProcessingOverlay";
import { clearPaymentOverlayFlag, setPaymentOverlayFlag } from "@/lib/portal/portalOverlaySession";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * When Stripe redirects back to the order page (return_to from pay flow), the URL includes
 * payment_intent + redirect_status but we never POST /stripe-confirm — invoice stays unpaid until refresh.
 * This applies the payment and refreshes server-rendered order/invoice state.
 */
export default function StripePaymentReturnClient({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);
  const [overlay, setOverlay] = useState<null | { phase: "processing" | "success" } | { phase: "error"; text: string }>(
    null
  );

  useEffect(() => {
    if (ran.current) return;
    const paymentIntent = searchParams.get("payment_intent");
    const redirectStatus = searchParams.get("redirect_status");
    if (!paymentIntent || redirectStatus !== "succeeded") return;

    ran.current = true;
    setPaymentOverlayFlag();

    (async () => {
      try {
        const res = await fetch(`/api/portal/invoices/${encodeURIComponent(invoiceId)}/stripe-confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment_intent: paymentIntent }),
        });
        const url = new URL(window.location.href);
        url.searchParams.delete("payment_intent");
        url.searchParams.delete("payment_intent_client_secret");
        url.searchParams.delete("redirect_status");
        url.searchParams.delete("autosubmit");
        const qs = url.searchParams.toString();
        const next = qs ? `${url.pathname}?${qs}` : url.pathname;

        if (res.ok) {
          clearPaymentOverlayFlag();
          setOverlay({ phase: "success" });
          window.setTimeout(() => {
            router.replace(next);
            router.refresh();
          }, 1200);
          return;
        }

        const json = await res.json().catch(() => null);
        const err = String(json?.error || "").toLowerCase();
        ran.current = false;
        clearPaymentOverlayFlag();
        if (err.includes("not completed") || err.includes("processing")) {
          setOverlay({
            phase: "error",
            text:
              "Payment is still processing (e.g. bank transfer). Refresh in a minute or open the invoice — it will update when the bank clears.",
          });
        } else {
          setOverlay({
            phase: "error",
            text: json?.error || "Could not apply payment to the invoice. Try refreshing the page.",
          });
        }
      } catch {
        ran.current = false;
        clearPaymentOverlayFlag();
        setOverlay({
          phase: "error",
          text: "Could not confirm payment. Check your connection and refresh.",
        });
      }
    })();
  }, [invoiceId, router, searchParams]);

  if (!overlay) return null;

  if (overlay.phase === "error") {
    return (
      <div
        style={{
          marginBottom: 12,
          padding: 12,
          borderRadius: 12,
          fontWeight: 900,
          fontSize: 13,
          background: "color-mix(in srgb, var(--danger) 10%, var(--surface))",
          border: "1px solid color-mix(in srgb, var(--danger) 26%, var(--border))",
          color: "var(--danger)",
        }}
      >
        {overlay.text}
      </div>
    );
  }

  return (
    <PortalProcessingOverlay
      show
      success={overlay.phase === "success"}
      title={overlay.phase === "success" ? "Payment confirmed" : "Processing payment…"}
      subtitle={
        overlay.phase === "success"
          ? "Updating your order and invoice."
          : "Applying your payment securely. Please wait."
      }
      zIndex={280}
    />
  );
}
