"use client";

import React, { useState } from "react";

type Resp = { ok: true; url: string | null } | { ok: false; error: string };

export default function InvoicePdfActionsClient(props: { invoiceId: string; hasPdfPath: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/invoices/${encodeURIComponent(props.invoiceId)}/pdf-url`, {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "no-store",
      });

      const data: Resp = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

      if (!res.ok || !(data as any).ok) {
        setErr((data as any).error || `Request failed (${res.status})`);
        return;
      }

      const url = (data as any).url;
      if (!url) {
        setErr("No URL returned.");
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <button
        type="button"
        onClick={download}
        disabled={busy || !props.hasPdfPath}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.12)",
          background: busy || !props.hasPdfPath ? "rgba(0,0,0,0.12)" : "#111",
          color: busy || !props.hasPdfPath ? "rgba(0,0,0,0.5)" : "white",
          fontWeight: 950,
          cursor: busy || !props.hasPdfPath ? "not-allowed" : "pointer",
        }}
        title={!props.hasPdfPath ? "Generate the invoice PDF first." : ""}
      >
        {busy ? "Opening…" : "Download Invoice PDF"}
      </button>

      {err ? <div style={{ color: "crimson", fontWeight: 900, fontSize: 13 }}>{err}</div> : null}

      {!props.hasPdfPath ? (
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          No PDF saved yet. Use <b>Generate / Refresh Invoice PDF</b> first.
        </div>
      ) : null}
    </div>
  );
}
