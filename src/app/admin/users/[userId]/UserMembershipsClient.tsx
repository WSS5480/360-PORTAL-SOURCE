"use client";

import { useMemo, useState } from "react";
import { formatRoleLabel } from "@/lib/formatStatusLabel";

type AccountRow = { id: string; name: string | null };
type MembershipRow = { account_id: string; role: string | null; created_at: string | null; account_name?: string | null };

const ROLE_OPTIONS = ["ORDER_CREATOR", "IVR_SUBMITTER", "ACCOUNT_ADMIN"] as const;

function fmt(v?: string | null) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    // Use UTC to avoid server/client locale timezone hydration drift.
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }).format(d);
  } catch {
    return "—";
  }
}

export default function UserMembershipsClient(props: {
  userId: string;
  accounts: AccountRow[];
  memberships: MembershipRow[];
}) {
  const { userId, accounts, memberships } = props;

  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>("ORDER_CREATOR");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const membershipIds = useMemo(() => new Set(memberships.map((m) => m.account_id)), [memberships]);

  async function addMembership(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId) return;
    setBusy(true);
    setMsg(null);
    setErr(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/memberships/add`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId, role }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed (HTTP ${res.status})`);
      setMsg("Membership updated.");
      window.location.reload();
    } catch (e: any) {
      setErr(e?.message || "Failed to update membership");
    } finally {
      setBusy(false);
    }
  }

  async function removeMembership(accountIdToRemove: string) {
    const ok = window.confirm("Remove this user from the selected account? This does not delete their login.");
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    setErr(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/memberships/remove`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId: accountIdToRemove }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed (HTTP ${res.status})`);
      setMsg("Membership removed.");
      window.location.reload();
    } catch (e: any) {
      setErr(e?.message || "Failed to remove membership");
    } finally {
      setBusy(false);
    }
  }

  const button: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.18)",
    background: "white",
    fontWeight: 900,
    cursor: "pointer",
  };

  const dangerButton: React.CSSProperties = {
    ...button,
    border: "1px solid rgba(239,68,68,0.35)",
    color: "crimson",
  };

  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.10)", borderRadius: 18, overflow: "hidden", background: "white" }}>
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 950, fontSize: 15 }}>Account memberships</span>
        <span style={{ fontSize: 12, opacity: 0.65, fontWeight: 700 }}>Portal access by account</span>
      </div>
      <div style={{ padding: 16 }}>
      <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.45, marginBottom: 12 }}>
        Add this user to a customer account to grant portal access.
      </div>

      {msg ? (
        <div style={{ marginTop: 0, marginBottom: 10, padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.05)", fontSize: 13 }}>
          {msg}
        </div>
      ) : null}
      {err ? (
        <div style={{ marginTop: 0, marginBottom: 10, padding: 10, borderRadius: 10, background: "rgba(220,0,0,0.08)", color: "crimson", fontSize: 13 }}>
          {err}
        </div>
      ) : null}

      <form onSubmit={addMembership} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 900 }}>Account</span>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={{ padding: "10px 12px", borderRadius: 10 }}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name || a.id} {membershipIds.has(a.id) ? "• already linked" : ""}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 900 }}>Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as (typeof ROLE_OPTIONS)[number])}
            style={{ padding: "10px 12px", borderRadius: 10 }}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {formatRoleLabel(r)}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={busy} style={{ ...button, background: "#111", color: "white", width: 220 }}>
          {busy ? "Saving…" : "Save Membership"}
        </button>
      </form>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 8 }}>Current memberships</div>
        {memberships.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.8 }}>
                  <th style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Account</th>
                  <th style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Role</th>
                  <th style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Added</th>
                  <th style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((m) => (
                  <tr key={m.account_id}>
                    <td style={{ padding: 10, fontSize: 13, fontWeight: 900 }}>{m.account_name || m.account_id}</td>
                    <td style={{ padding: 10, fontSize: 13 }}>{formatRoleLabel(m.role)}</td>
                    <td style={{ padding: 10, fontSize: 13, opacity: 0.85 }}>{fmt(m.created_at)}</td>
                    <td style={{ padding: 10 }}>
                      <button style={dangerButton} disabled={busy} onClick={() => removeMembership(m.account_id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ opacity: 0.7 }}>No account memberships yet.</div>
        )}
      </div>
      </div>
    </div>
  );
}
