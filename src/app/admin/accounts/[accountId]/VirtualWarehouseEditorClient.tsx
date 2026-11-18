"use client";

import { useState } from "react";

export default function VirtualWarehouseEditorClient(props: { accountId: string; initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(!!props.initialEnabled);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save(next?: boolean) {
    setSaving(true);
    setOk(null);
    setErr(null);
    const v = typeof next === "boolean" ? next : enabled;
    const res = await fetch(`/api/admin/accounts/${props.accountId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ virtual_warehouse_enabled: v }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      setErr(json?.error || `Update failed (${res.status})`);
      setSaving(false);
      return;
    }
    setEnabled(v);
    setOk("Saved.");
    setSaving(false);
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Virtual warehouse</div>
      <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.45 }}>
        When enabled, customers on bulk orders can allocate paid units to a virtual balance and request shipment later
        without a new product invoice.
      </div>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 900 }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            const v = e.target.checked;
            setEnabled(v);
            void save(v);
          }}
          disabled={saving}
        />
        Enable virtual warehouse
      </label>
      {saving ? <div style={{ fontSize: 12, opacity: 0.7 }}>Saving…</div> : null}
      {ok ? <div style={{ fontSize: 12, fontWeight: 900, color: "green" }}>{ok}</div> : null}
      {err ? <div style={{ fontSize: 12, fontWeight: 900, color: "crimson" }}>{err}</div> : null}
    </div>
  );
}
