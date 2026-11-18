"use client";

import React, { useState } from "react";

export default function AccountUserVirtualWarehouseToggle(props: {
  userId: string;
  initialEnabled: boolean;
  accountVirtualWarehouseEnabled: boolean;
}) {
  const { userId, initialEnabled, accountVirtualWarehouseEnabled } = props;
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!accountVirtualWarehouseEnabled) {
    return (
      <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700 }} title="Turn on virtual warehouse for the account in Settings first.">
        —
      </span>
    );
  }

  async function toggle(next: boolean) {
    setErr(null);
    setPending(true);
    const prev = enabled;
    setEnabled(next);
    try {
      const res = await fetch(`/api/portal/account-members/${encodeURIComponent(userId)}/virtual-warehouse-access`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ virtual_warehouse_access: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setEnabled(prev);
        setErr(typeof data?.error === "string" ? data.error : "Could not update.");
      }
    } catch {
      setEnabled(prev);
      setErr("Could not update.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "nowrap" }}>
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          cursor: pending ? "wait" : "pointer",
          fontSize: 13,
          fontWeight: 800,
          color: "var(--foreground)",
          userSelect: "none",
          whiteSpace: "nowrap",
          margin: 0,
        }}
      >
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={(e) => void toggle(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: "var(--brand-600)", flexShrink: 0 }}
        />
        <span>{enabled ? "On" : "Off"}</span>
      </label>
      {err ? (
        <span style={{ fontSize: 11, color: "crimson", fontWeight: 700, whiteSpace: "nowrap" }} title={err}>
          Error
        </span>
      ) : null}
    </div>
  );
}
