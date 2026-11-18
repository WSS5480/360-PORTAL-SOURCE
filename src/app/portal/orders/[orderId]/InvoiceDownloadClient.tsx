"use client";

import React, { useState } from "react";

type Resp = { ok: true; url: string | null } | { ok: false; error: string };

export default function InvoiceDownloadClient(props: { invoiceId: string; enabled: boolean; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/portal/invoices/${encodeURIComponent(props.invoiceId)}/pdf-url`, {
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

  const compact = !!props.compact;
  return (
    <div style={{ display: "grid", gap: compact ? 4 : 8 }}>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        style={{
          padding: compact ? "6px 10px" : "10px 12px",
          borderRadius: compact ? 8 : 12,
          border: "1px solid var(--border)",
          background: busy ? "color-mix(in srgb, var(--surface) 70%, var(--background))" : "var(--brand-700)",
          color: busy ? "var(--muted)" : "white",
          fontWeight: 950,
          fontSize: compact ? 12 : 14,
          cursor: busy ? "not-allowed" : "pointer",
          width: "fit-content",
        }}
        title={props.enabled === false ? "PDF may need to be generated on first open." : undefined}
      >
        {busy ? "Opening…" : compact ? "Open PDF →" : "Download invoice PDF"}
      </button>

      {err ? <div style={{ color: "crimson", fontWeight: 900, fontSize: 13 }}>{err}</div> : null}
    </div>
  );
}
