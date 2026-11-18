"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AccountFeaturesClient({
  initialBulk,
  initialVw,
}: {
  initialBulk: boolean;
  initialVw: boolean;
}) {
  const router = useRouter();
  const [bulk, setBulk] = useState(initialBulk);
  const [vw, setVw] = useState(initialVw);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function save(next: { bulk_enabled?: boolean; virtual_warehouse_enabled?: boolean }) {
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      const res = await fetch("/api/portal/account-pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof j?.error === "string" ? j.error : "Save failed.");
        return;
      }
      setOk("Saved.");
      if (next.bulk_enabled !== undefined) setBulk(!!next.bulk_enabled);
      if (next.virtual_warehouse_enabled !== undefined) setVw(!!next.virtual_warehouse_enabled);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45, margin: 0 }}>
        Only account administrators can enable these features for your organization. Other users follow the settings below
        when placing orders.
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

      <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={bulk}
          disabled={saving}
          onChange={(e) => {
            const v = e.target.checked;
            setBulk(v);
            void save({ bulk_enabled: v });
          }}
        />
        <span style={{ fontSize: 14, fontWeight: 850, lineHeight: 1.4 }}>
          Bulk orders
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginTop: 4 }}>
            Enables bulk pricing and sq cm workflows on new orders when your catalog supports it.
          </span>
        </span>
      </label>

      <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={vw}
          disabled={saving}
          onChange={(e) => {
            const v = e.target.checked;
            setVw(v);
            void save({ virtual_warehouse_enabled: v });
          }}
        />
        <span style={{ fontSize: 14, fontWeight: 850, lineHeight: 1.4 }}>
          Virtual warehouse
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginTop: 4 }}>
            Enables virtual warehouse shipment requests and related tools for this account.
          </span>
        </span>
      </label>

      {saving ? <div style={{ fontSize: 12, color: "var(--muted)" }}>Saving…</div> : null}
    </div>
  );
}
