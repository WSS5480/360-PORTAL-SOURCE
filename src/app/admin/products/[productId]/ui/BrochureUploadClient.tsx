"use client";

import { useState } from "react";

export default function BrochureUploadClient({
  productId,
  hasBrochure,
}: {
  productId: string;
  hasBrochure: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");

    const form = e.currentTarget;
    const fd = new FormData(form);

    const f = fd.get("file");
    if (!(f instanceof File) || !f.name) {
      setErr("Please choose a PDF file.");
      return;
    }

    const url = `/api/admin/products/${encodeURIComponent(productId)}/brochure`;

    setBusy(true);
    try {
      const res = await fetch(url, { method: "POST", body: fd });
      if (res.ok) {
        await res.json().catch(() => null);
        window.location.reload();
        return;
      }

      let msg = `Upload failed (${res.status}).`;
      try {
        const data = await res.json();
        if (data?.error) msg = String(data.error);
      } catch {}
      setErr(`${msg} (POST ${url})`);
    } catch (ex: any) {
      setErr(`${ex?.message ? String(ex.message) : "Upload failed."} (POST ${url})`);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setErr("");
    const url = `/api/admin/products/${encodeURIComponent(productId)}/brochure`;

    setBusy(true);
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        await res.json().catch(() => null);
        window.location.reload();
        return;
      }

      let msg = `Remove failed (${res.status}).`;
      try {
        const data = await res.json();
        if (data?.error) msg = String(data.error);
      } catch {}
      setErr(`${msg} (DELETE ${url})`);
    } catch (ex: any) {
      setErr(`${ex?.message ? String(ex.message) : "Remove failed."} (DELETE ${url})`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <form onSubmit={upload} style={{ display: "grid", gap: 10 }}>
        <input type="file" name="file" accept="application/pdf" required disabled={busy} />

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.14)",
              background: busy ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.04)",
              fontWeight: 950,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Working..." : hasBrochure ? "Replace Brochure" : "Upload Brochure"}
          </button>

          {hasBrochure ? (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.14)",
                background: "rgba(220, 53, 69, 0.10)",
                fontWeight: 950,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              Remove
            </button>
          ) : null}

          <div style={{ fontSize: 12, opacity: 0.7 }}>PDF only. Stored as NON-PHI.</div>
        </div>
      </form>

      {err ? <div style={{ fontSize: 13, color: "crimson", fontWeight: 900 }}>{err}</div> : null}
    </div>
  );
}
