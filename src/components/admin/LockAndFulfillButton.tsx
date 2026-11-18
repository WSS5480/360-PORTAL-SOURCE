"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const buttonStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 950,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.12)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  whiteSpace: "nowrap",
  textDecoration: "none",
  background: "#1e88e5",
  color: "white",
  animation: "order-flow-cta 1.6s ease-in-out infinite",
};

export default function LockAndFulfillButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/lock-and-fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Something went wrong");
        setLoading(false);
        return;
      }

      if (data?.ok && data?.redirect) {
        router.push(data.redirect);
        return;
      }

      setError("Unexpected response");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          ...buttonStyle,
          opacity: loading ? 0.7 : 1,
          cursor: loading ? "wait" : "pointer",
          animation: loading ? undefined : "order-flow-cta 1.6s ease-in-out infinite",
        }}
      >
        {loading ? "Locking & opening…" : "Lock and Start Fulfillment"}
      </button>
      {error ? (
        <span style={{ fontSize: 12, color: "rgba(220,53,69,0.95)", fontWeight: 900 }}>{error}</span>
      ) : null}
    </div>
  );
}
