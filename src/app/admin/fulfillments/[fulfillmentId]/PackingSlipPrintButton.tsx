"use client";

import React, { useState } from "react";

export default function PackingSlipPrintButton(props: { fulfillmentId: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setErr(null);

    try {
      const res = await fetch(
        `/api/admin/fulfillments/${encodeURIComponent(props.fulfillmentId)}/packing-slip/url`,
        { headers: { accept: "application/json" } }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok || !data?.url) {
        setErr(data?.error || `Failed to open (${res.status})`);
        return;
      }

      window.open(String(data.url), "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button
        type="button"
        onClick={open}
        disabled={busy}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.12)",
          background: "white",
          color: "#111",
          fontWeight: 950,
          cursor: busy ? "not-allowed" : "pointer",
          width: "100%",
          opacity: busy ? 0.7 : 1,
        }}
        title="Open packing slip PDF in a new tab"
      >
        {busy ? "Opening…" : "Open / Print Packing Slip"}
      </button>

      {err ? <div style={{ fontSize: 12, fontWeight: 900, color: "crimson" }}>{err}</div> : null}
    </div>
  );
}
