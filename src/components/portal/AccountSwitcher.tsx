"use client";

import { useState, type CSSProperties, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { formatRoleLabel } from "@/lib/formatStatusLabel";

type Item = {
  account_id: string;
  role: string;
  account: { id: string; name: string } | null;
};

export default function AccountSwitcher({
  memberships,
  currentAccountId,
}: {
  memberships: Item[];
  currentAccountId: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: ChangeEvent<HTMLSelectElement>) {
    const accountId = e.target.value;
    setSaving(true);
    setError(null);

    const res = await fetch("/api/portal/select-account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId }),
    });

    const json = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(json?.error || "Failed to switch account");
      return;
    }

    // Sidebar only refetches /api/portal/me on navigation; nudge it after cookie change.
    window.dispatchEvent(new Event("portal-me-refetch"));
    // Soft refresh for Server Components (avoids full document reload / refresh-token races).
    router.refresh();
  }

  if (memberships.length <= 1) return null;

  return (
    <div style={styles.wrap}>
      <label htmlFor="portal-account-switch" style={styles.label}>
        Account
      </label>
      <select
        id="portal-account-switch"
        value={currentAccountId ?? memberships[0].account_id}
        onChange={onChange}
        disabled={saving}
        aria-busy={saving}
        style={styles.select}
      >
        {memberships.map((m) => (
          <option key={m.account_id} value={m.account_id}>
            {(m.account?.name ?? "Unnamed account") + ` — ${formatRoleLabel(m.role)}`}
          </option>
        ))}
      </select>
      {error ? (
        <div role="alert" style={styles.error}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: "color-mix(in srgb, var(--muted) 90%, black)",
    paddingLeft: 2,
  },
  select: {
    width: "100%",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 800,
    color: "var(--foreground)",
    background: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--brand-600) 14%, var(--border))",
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    cursor: "pointer",
    minHeight: 44,
  },
  error: {
    color: "rgb(153, 27, 27)",
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.35,
  },
};
