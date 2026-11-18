"use client";

import { useState } from "react";
import { formatRoleLabel } from "@/lib/formatStatusLabel";

type MemberRow = {
  user_id: string;
  role: string | null;
  created_at: string | null;
  email: string | null;
};

function fmt(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return "—";
  }
}

export default function MembersTableClient(props: {
  accountId: string;
  members: MemberRow[];
}) {
  const { accountId, members } = props;

  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function removeMember(userId: string, email?: string | null) {
    const label = email || userId;
    const ok = window.confirm(`Remove access for ${label} from this account?\n\nThis does NOT delete their login.`);
    if (!ok) return;

    setBusyId(userId);
    setMsg(null);
    setErr(null);

    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/members/remove`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed (HTTP ${res.status})`);

      setMsg("User removed from account.");
      window.location.reload();
    } catch (e: any) {
      setErr(e?.message || "Failed to remove user");
    } finally {
      setBusyId(null);
    }
  }

  const btn: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 12,
  };

  const dangerBtn: React.CSSProperties = {
    ...btn,
    border: "1px solid rgba(239,68,68,0.35)",
  };

  return (
    <div style={{ padding: "14px 16px" }}>
      {msg ? (
        <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.05)", fontSize: 13 }}>
          {msg}
        </div>
      ) : null}
      {err ? (
        <div style={{ marginBottom: 10, padding: 10, borderRadius: 10, background: "rgba(220,0,0,0.08)", color: "crimson", fontSize: 13 }}>
          {err}
        </div>
      ) : null}

      {members.length ? (
        <div style={{ overflowX: "auto", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12 }}>
          <table className="admin-data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "rgba(0,0,0,0.02)" }}>
                {(["Email", "Role", "Added", "Actions"] as const).map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid rgba(0,0,0,0.08)",
                      fontSize: 11,
                      letterSpacing: 0.35,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      opacity: 0.65,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.user_id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 900 }}>
                    {m.email || <span style={{ opacity: 0.7 }}>—</span>}
                  </td>
                  <td style={{ padding: "12px", fontSize: 13 }}>
                    {formatRoleLabel(m.role)}
                  </td>
                  <td style={{ padding: "12px", fontSize: 13, opacity: 0.85 }}>{fmt(m.created_at)}</td>
                  <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => removeMember(m.user_id, m.email)}
                      disabled={busyId === m.user_id}
                      style={dangerBtn}
                      title="Remove this user from the account (does not delete the login)"
                    >
                      {busyId === m.user_id ? "Removing…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ opacity: 0.7, fontSize: 14, padding: "4px 0" }}>No users linked to this account yet.</div>
      )}
    </div>
  );
}
