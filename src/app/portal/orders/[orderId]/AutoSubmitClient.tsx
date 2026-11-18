"use client";

import { clearPlaceOrderOverlayFlag, setPlaceOrderOverlayFlag } from "@/lib/portal/portalOverlaySession";
import { useEffect, useState } from "react";

export default function AutoSubmitClient({ orderId, enabled }: { orderId: string; enabled: boolean }) {
  const [fatal, setFatal] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function submit() {
      setPlaceOrderOverlayFlag();
      try {
        const res = await fetch(`/api/portal/orders/${encodeURIComponent(orderId)}/confirm`, {
          method: "POST",
          headers: { "X-Portal-Order-Confirm": "1" },
        });
        if (res.status === 402) {
          const json = await res.json().catch(() => null);
          const payUrl = json?.pay_url;
          if (typeof payUrl === "string" && payUrl.length > 0) {
            // Keep "Processing your order…" until the payment page loads (cleared on pay page mount).
            window.location.href = payUrl;
            return;
          }
        }
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || `Failed (HTTP ${res.status})`);
        }
        clearPlaceOrderOverlayFlag();
        window.location.href = `/portal/orders/${encodeURIComponent(orderId)}`;
      } catch (e: any) {
        if (!cancelled) {
          clearPlaceOrderOverlayFlag();
          setFatal(e?.message || "Failed to submit order");
        }
      }
    }

    submit();

    return () => {
      cancelled = true;
    };
  }, [enabled, orderId]);

  if (!enabled) return null;

  if (fatal) {
    return (
      <div
        style={{
          marginBottom: 12,
          padding: 12,
          borderRadius: 12,
          background: "color-mix(in srgb, var(--danger) 10%, var(--surface))",
          border: "1px solid color-mix(in srgb, var(--danger) 26%, var(--border))",
          fontWeight: 900,
          color: "var(--danger)",
        }}
      >
        {fatal}
      </div>
    );
  }

  return null;
}
