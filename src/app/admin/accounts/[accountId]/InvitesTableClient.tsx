"use client";

import { useMemo, useState } from "react";
import AdminMessageModal from "@/components/admin/AdminMessageModal";
import { inviteResendConfirmationFromApi } from "@/lib/admin/inviteResendConfirmation";
import { formatRoleLabel } from "@/lib/formatStatusLabel";

type InviteRow = {
  id: string;
  email: string;
  role: string;
  created_at: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
};

type Status = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

function inviteStatus(inv: InviteRow): Status {
  if (inv.revoked_at) return "REVOKED";
  if (inv.accepted_at) return "ACCEPTED";
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) return "EXPIRED";
  return "PENDING";
}

function badgeStyle(status: Status): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,0.15)",
  };

  if (status === "ACCEPTED") return { ...base, background: "rgba(34,197,94,0.12)" };
  if (status === "PENDING") return { ...base, background: "rgba(245,158,11,0.14)" };
  if (status === "EXPIRED") return { ...base, background: "rgba(0,0,0,0.06)" };
  return { ...base, background: "rgba(239,68,68,0.10)" }; // REVOKED
}

function fmt(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return "—";
  }
}

function pill(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 999,
    border: active ? "1px solid color-mix(in srgb, var(--brand-600) 45%, #111)" : "1px solid rgba(0,0,0,0.12)",
    fontSize: 12,
    fontWeight: 900,
    background: active ? "var(--brand-600)" : "white",
    color: active ? "white" : "var(--foreground)",
    cursor: "pointer",
  };
}

export default function InvitesTableClient(props: { accountId: string; invites: InviteRow[] }) {
  const { accountId, invites } = props;

  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | Status>("ALL");
  const [resendModal, setResendModal] = useState<{ title: string; body: string } | null>(null);

  const filtered = useMemo(() => {
    if (filter === "ALL") return invites;
    return invites.filter((i) => inviteStatus(i) === filter);
  }, [invites, filter]);

  async function post(url: string, body?: any) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
    const text = await res.text();
    let json: any = {};
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(
          !res.ok
            ? `Request failed (HTTP ${res.status}). Try signing in again, or check that you are internal admin or staff.`
            : "Server returned an invalid response."
        );
      }
    }
    if (!res.ok) throw new Error(json?.error || `Failed (HTTP ${res.status})`);
    return json;
  }

  async function onResend(inviteId: string) {
    setBusyId(inviteId);
    setMsg(null);
    setErr(null);
    try {
      const json = await post(`/api/admin/accounts/${accountId}/invites/${inviteId}/resend`);
      setResendModal(inviteResendConfirmationFromApi(json as Record<string, unknown>));
    } catch (e: any) {
      setErr(e?.message || "Failed to resend invite");
    } finally {
      setBusyId(null);
    }
  }

  async function onRevoke(inviteId: string) {
    setBusyId(inviteId);
    setMsg(null);
    setErr(null);
    try {
      await post(`/api/admin/accounts/${accountId}/invites/${inviteId}/revoke`);
      setMsg("Invite revoked.");
      window.location.reload();
    } catch (e: any) {
      setErr(e?.message || "Failed to revoke invite");
    } finally {
      setBusyId(null);
    }
  }

  async function onRemoveAccess(inviteId: string, email: string) {
    const ok = window.confirm(
      `Remove access for ${email} from this account?\n\nThis does NOT delete their login. It only removes account access.`
    );
    if (!ok) return;

    setBusyId(inviteId);
    setMsg(null);
    setErr(null);
    try {
      // Your revoke route (per earlier work) should remove membership when accepted
      const json = await post(`/api/admin/accounts/${accountId}/invites/${inviteId}/revoke`);
      setMsg(json?.removedMembership ? "User removed from account." : "No membership found to remove.");
      window.location.reload();
    } catch (e: any) {
      setErr(e?.message || "Failed to remove access");
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
      <AdminMessageModal
        open={!!resendModal}
        title={resendModal?.title ?? ""}
        body={resendModal?.body ?? ""}
        variant="success"
        confirmLabel="Back to list"
        onClose={() => {
          setResendModal(null);
          window.location.reload();
        }}
      />

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

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" onClick={() => setFilter("ALL")} style={pill(filter === "ALL")}>
          All
        </button>
        <button type="button" onClick={() => setFilter("PENDING")} style={pill(filter === "PENDING")}>
          Pending
        </button>
        <button type="button" onClick={() => setFilter("ACCEPTED")} style={pill(filter === "ACCEPTED")}>
          Accepted
        </button>
        <button type="button" onClick={() => setFilter("EXPIRED")} style={pill(filter === "EXPIRED")}>
          Expired
        </button>
        <button type="button" onClick={() => setFilter("REVOKED")} style={pill(filter === "REVOKED")}>
          Revoked
        </button>
      </div>

      {filtered?.length ? (
        <div style={{ overflowX: "auto", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12 }}>
          <table className="admin-data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "rgba(0,0,0,0.02)" }}>
                {(["Email", "Role", "Status", "Sent", "Expires", "Accepted", "Actions"] as const).map((h) => (
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
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const status = inviteStatus(inv);
                const disabled = busyId === inv.id;

                const canRevoke = status === "PENDING" || status === "EXPIRED";
                const canSendNewInvite = status === "PENDING" || status === "EXPIRED" || status === "REVOKED";
                const canRemoveAccess = status === "ACCEPTED";

                return (
                  <tr key={inv.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <td style={{ padding: "12px", fontSize: 13, fontWeight: 900 }}>{inv.email}</td>
                    <td style={{ padding: "12px", fontSize: 13 }}>{formatRoleLabel(inv.role)}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={badgeStyle(status)}>{status}</span>
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, opacity: 0.85 }}>{fmt(inv.created_at)}</td>
                    <td style={{ padding: "12px", fontSize: 13, opacity: 0.85 }}>{fmt(inv.expires_at)}</td>
                    <td style={{ padding: "12px", fontSize: 13, opacity: 0.85 }}>{fmt(inv.accepted_at)}</td>
                    <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                      {canSendNewInvite ? (
                        <button
                          onClick={() => onResend(inv.id)}
                          disabled={disabled}
                          style={btn}
                          title={status === "REVOKED" ? "Reinstate (send a new invite email)" : "Send invite email"}
                        >
                          {disabled ? "Working…" : status === "REVOKED" ? "Reinstate" : "Resend"}
                        </button>
                      ) : (
                        <button disabled style={{ ...btn, opacity: 0.5, cursor: "not-allowed" }}>
                          Resend
                        </button>
                      )}

                      <span style={{ display: "inline-block", width: 8 }} />

                      {canRevoke ? (
                        <button
                          onClick={() => onRevoke(inv.id)}
                          disabled={disabled}
                          style={dangerBtn}
                          title="Revoke this invite"
                        >
                          {disabled ? "Working…" : "Revoke"}
                        </button>
                      ) : (
                        <button disabled style={{ ...dangerBtn, opacity: 0.5, cursor: "not-allowed" }} title="Only pending/expired invites can be revoked">
                          Revoke
                        </button>
                      )}

                      {canRemoveAccess ? (
                        <>
                          <span style={{ display: "inline-block", width: 8 }} />
                          <button
                            onClick={() => onRemoveAccess(inv.id, inv.email)}
                            disabled={disabled}
                            style={dangerBtn}
                            title="Remove this user from the account (does not delete the login)"
                          >
                            {disabled ? "Working…" : "Remove access"}
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ opacity: 0.7, padding: 8 }}>No invites.</div>
      )}
    </div>
  );
}
