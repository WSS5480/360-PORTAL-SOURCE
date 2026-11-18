"use client";

import { useMemo, useState } from "react";

export default function DiscountEditorClient(props: {
  accountId: string;
  initialDiscountPercent: number;
}) {
  const [raw, setRaw] = useState<string>(String(props.initialDiscountPercent ?? 0));
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const parsed = useMemo(() => {
    const t = raw.trim();
    if (!t) return 0;
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    if (n < 0) return 0;
    if (n > 100) return 100;
    return n;
  }, [raw]);

  async function save() {
    setSaving(true);
    setOk(null);
    setErr(null);

    if (parsed === null) {
      setErr("Discount percent must be a number between 0 and 100.");
      setSaving(false);
      return;
    }

    const res = await fetch(`/api/admin/accounts/${props.accountId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ discount_percent: parsed }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      setErr(json?.error || `Update failed (${res.status})`);
      setSaving(false);
      return;
    }

    setOk("Saved.");
    setSaving(false);
  }

  return (
    <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Account discount %</div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          inputMode="decimal"
          style={{
            padding: "10px 10px",
            borderRadius: 10,
            border: parsed === null ? "1px solid rgba(220,0,0,0.45)" : "1px solid rgba(0,0,0,0.2)",
            fontSize: 14,
            width: 140,
          }}
        />

        <button
          type="button"
          onClick={save}
          disabled={saving || parsed === null}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "#111",
            color: "white",
            fontWeight: 900,
            cursor: saving || parsed === null ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>

        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Effective: <span style={{ fontWeight: 900 }}>{parsed === null ? "—" : `${parsed}%`}</span>
        </div>
      </div>

      {err ? <div style={{ color: "crimson", fontSize: 13, fontWeight: 900 }}>{err}</div> : null}
      {ok ? <div style={{ color: "green", fontSize: 13, fontWeight: 900 }}>{ok}</div> : null}

      <div style={{ fontSize: 12, opacity: 0.7 }}>
        Used for pricing rules on the portal side. Value is clamped to 0–100.
      </div>
    </div>
  );
}
