"use client";

import { useMemo, useState } from "react";

export default function TermsEditorClient(props: {
  accountId: string;
  initialTermsDays: number | null;
  initialTermsLabel: string | null;
}) {
  const [daysRaw, setDaysRaw] = useState<string>(String(props.initialTermsDays ?? 30));
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const parsedDays = useMemo(() => {
    const t = daysRaw.trim();
    if (!t) return 30;
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    if (n < 0) return 0;
    if (n > 365) return 365;
    return Math.floor(n);
  }, [daysRaw]);

  const label = useMemo(() => {
    const d = parsedDays === null ? 30 : parsedDays;
    return `Net ${d} (after delivery)`;
  }, [parsedDays]);

  async function save() {
    setSaving(true);
    setOk(null);
    setErr(null);

    if (parsedDays === null) {
      setErr("Terms days must be a number.");
      setSaving(false);
      return;
    }

    const res = await fetch(`/api/admin/accounts/${props.accountId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ payment_terms_days: parsedDays, payment_terms_label: label }),
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
      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Payment terms (days after delivery)</div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={daysRaw}
          onChange={(e) => setDaysRaw(e.target.value)}
          inputMode="numeric"
          style={{
            padding: "10px 10px",
            borderRadius: 10,
            border: parsedDays === null ? "1px solid rgba(220,0,0,0.45)" : "1px solid rgba(0,0,0,0.2)",
            fontSize: 14,
            width: 140,
          }}
        />

        <button
          type="button"
          onClick={save}
          disabled={saving || parsedDays === null}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "#111",
            color: "white",
            fontWeight: 900,
            cursor: saving || parsedDays === null ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>

        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Label: <span style={{ fontWeight: 900 }}>{label}</span>
        </div>
      </div>

      {err ? <div style={{ color: "crimson", fontSize: 13, fontWeight: 900 }}>{err}</div> : null}
      {ok ? <div style={{ color: "green", fontSize: 13, fontWeight: 900 }}>{ok}</div> : null}

      <div style={{ fontSize: 12, opacity: 0.7 }}>
        Used for portal pricing terms. Label is computed automatically.
      </div>
    </div>
  );
}
