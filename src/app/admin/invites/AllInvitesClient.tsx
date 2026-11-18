"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AdminMessageModal from "@/components/admin/AdminMessageModal";
import { inviteResendConfirmationFromApi } from "@/lib/admin/inviteResendConfirmation";
import { formatRoleLabel } from "@/lib/formatStatusLabel";

export type InviteRow = {
  id: string;
  account_id: string;
  email: string;
  role: string;
  created_at: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  archived_at: string | null;
};

type Status = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
type ArchiveScope = "active" | "archived" | "all";

function inviteStatus(inv: InviteRow): Status {
  if (inv.revoked_at) return "REVOKED";
  if (inv.accepted_at) return "ACCEPTED";
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) return "EXPIRED";
  return "PENDING";
}

const ui = {
  card: {
    borderRadius: 20,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
    overflow: "hidden" as const,
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 10,
    alignItems: "center",
    padding: "14px 16px",
    borderBottom: "1px solid color-mix(in srgb, var(--border) 80%, transparent)",
    background: "color-mix(in srgb, var(--surface) 92%, var(--foreground))",
  },
  segmentGroup: {
    display: "inline-flex",
    padding: 3,
    borderRadius: 12,
    background: "color-mix(in srgb, var(--foreground) 6%, transparent)",
    border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
    gap: 2,
  },
  segmentBtn: (on: boolean): React.CSSProperties => ({
    border: "none",
    borderRadius: 9,
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: 850,
    cursor: "pointer",
    background: on ? "var(--surface)" : "transparent",
    color: on ? "var(--foreground)" : "var(--muted)",
    boxShadow: on ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
  }),
  filterChip: (on: boolean): React.CSSProperties => ({
    border: `1px solid ${on ? "color-mix(in srgb, var(--brand-600) 35%, var(--border))" : "var(--border)"}`,
    borderRadius: 999,
    padding: "5px 11px",
    fontSize: 11,
    fontWeight: 850,
    cursor: "pointer",
    background: on ? "color-mix(in srgb, var(--brand-600) 10%, transparent)" : "var(--surface)",
    color: on ? "var(--brand-800)" : "var(--muted)",
  }),
  th: {
    textAlign: "left" as const,
    padding: "5px 8px",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
    color: "var(--muted)",
    background: "color-mix(in srgb, var(--foreground) 4%, transparent)",
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap" as const,
    lineHeight: 1.15,
  },
  td: {
    padding: "4px 8px",
    fontSize: 11,
    lineHeight: 1.2,
    borderBottom: "1px solid color-mix(in srgb, var(--border) 65%, transparent)",
    verticalAlign: "middle" as const,
  },
  rowHover: (i: number): React.CSSProperties => ({
    background: i % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--foreground) 2.5%, transparent)",
  }),
};

function badgeStyle(status: Status): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 6px",
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: "0.03em",
    border: "1px solid transparent",
    lineHeight: 1.2,
  };

  if (status === "ACCEPTED") {
    return {
      ...base,
      background: "color-mix(in srgb, var(--success) 14%, white)",
      color: "color-mix(in srgb, var(--success) 70%, black)",
      borderColor: "color-mix(in srgb, var(--success) 28%, var(--border))",
    };
  }
  if (status === "PENDING") {
    return {
      ...base,
      background: "color-mix(in srgb, #f59e0b 16%, white)",
      color: "#92400e",
      borderColor: "color-mix(in srgb, #f59e0b 35%, var(--border))",
    };
  }
  if (status === "EXPIRED") {
    return {
      ...base,
      background: "color-mix(in srgb, var(--foreground) 6%, transparent)",
      color: "var(--muted)",
      borderColor: "var(--border)",
    };
  }
  return {
    ...base,
    background: "color-mix(in srgb, #ef4444 12%, white)",
    color: "#991b1b",
    borderColor: "color-mix(in srgb, #ef4444 30%, var(--border))",
  };
}

function fmtCompact(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normEmail(e: string) {
  return e.trim().toLowerCase();
}

function actionBtn(variant: "default" | "brand" | "danger" | "muted", disabled?: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "2px 6px",
    borderRadius: 6,
    fontWeight: 850,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 10,
    lineHeight: 1.2,
    opacity: disabled ? 0.45 : 1,
    borderWidth: 1,
    borderStyle: "solid",
    whiteSpace: "nowrap",
  };

  if (variant === "brand") {
    return {
      ...base,
      borderColor: "color-mix(in srgb, var(--brand-600) 40%, var(--border))",
      background: "color-mix(in srgb, var(--brand-600) 8%, white)",
      color: "var(--brand-800)",
    };
  }
  if (variant === "danger") {
    return {
      ...base,
      borderColor: "color-mix(in srgb, #ef4444 35%, var(--border))",
      background: "color-mix(in srgb, #ef4444 8%, white)",
      color: "#991b1b",
    };
  }
  if (variant === "muted") {
    return {
      ...base,
      borderColor: "var(--border)",
      background: "var(--surface)",
      color: "var(--muted)",
    };
  }
  return {
    ...base,
    borderColor: "var(--border)",
    background: "var(--surface)",
    color: "var(--foreground)",
  };
}

export default function AllInvitesClient(props: {
  invites: InviteRow[];
  accountNameById: Record<string, string>;
  lastSignInByEmail: Record<string, string | null>;
}) {
  const { invites, accountNameById, lastSignInByEmail } = props;

  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | Status>("ALL");
  const [archiveScope, setArchiveScope] = useState<ArchiveScope>("active");
  const [resendModal, setResendModal] = useState<{ title: string; body: string } | null>(null);

  const scopeCounts = useMemo(() => {
    let active = 0;
    let archived = 0;
    for (const i of invites) {
      if (i.archived_at) archived += 1;
      else active += 1;
    }
    return { active, archived, all: invites.length };
  }, [invites]);

  const scoped = useMemo(() => {
    if (archiveScope === "active") return invites.filter((i) => !i.archived_at);
    if (archiveScope === "archived") return invites.filter((i) => i.archived_at);
    return invites;
  }, [invites, archiveScope]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return scoped;
    return scoped.filter((i) => inviteStatus(i) === filter);
  }, [scoped, filter]);

  async function postJson(url: string, body?: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    if (text) {
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        throw new Error(
          !res.ok
            ? `Request failed (HTTP ${res.status}). Try signing in again, or check that you are internal admin or staff.`
            : "Server returned an invalid response."
        );
      }
    }
    if (!res.ok) {
      const errMsg = typeof json.error === "string" ? json.error : `Failed (HTTP ${res.status})`;
      throw new Error(errMsg);
    }
    return json;
  }

  async function onResend(accountId: string, inviteId: string) {
    setBusyId(inviteId);
    setMsg(null);
    setErr(null);
    try {
      const json = await postJson(`/api/admin/accounts/${accountId}/invites/${inviteId}/resend`);
      setResendModal(inviteResendConfirmationFromApi(json));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to resend invite");
    } finally {
      setBusyId(null);
    }
  }

  async function onRevoke(accountId: string, inviteId: string) {
    setBusyId(inviteId);
    setMsg(null);
    setErr(null);
    try {
      await postJson(`/api/admin/accounts/${accountId}/invites/${inviteId}/revoke`);
      setMsg("Updated.");
      window.location.reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to revoke");
    } finally {
      setBusyId(null);
    }
  }

  async function onRemoveAccess(accountId: string, inviteId: string, email: string) {
    const ok = window.confirm(
      `Remove access for ${email} from this account?\n\nThis does NOT delete their login. It only removes account access.`
    );
    if (!ok) return;

    setBusyId(inviteId);
    setMsg(null);
    setErr(null);
    try {
      const json = await postJson(`/api/admin/accounts/${accountId}/invites/${inviteId}/revoke`);
      setMsg(json?.removedMembership ? "User removed from account." : "No membership found to remove.");
      window.location.reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to remove access");
    } finally {
      setBusyId(null);
    }
  }

  async function onSetArchived(inviteId: string, archived: boolean) {
    setBusyId(inviteId);
    setMsg(null);
    setErr(null);
    try {
      await postJson(`/api/admin/invites/${inviteId}/archive`, { archived });
      window.location.reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to update archive");
    } finally {
      setBusyId(null);
    }
  }

  const statusFilters: Array<{ key: "ALL" | Status; label: string }> = [
    { key: "ALL", label: "All statuses" },
    { key: "PENDING", label: "Pending" },
    { key: "ACCEPTED", label: "Accepted" },
    { key: "EXPIRED", label: "Expired" },
    { key: "REVOKED", label: "Revoked" },
  ];

  return (
    <div style={ui.card}>
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

      {(msg || err) && (
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            fontSize: 13,
            background: err ? "color-mix(in srgb, #ef4444 10%, transparent)" : "color-mix(in srgb, var(--success) 10%, transparent)",
            color: err ? "#991b1b" : "inherit",
          }}
        >
          {err ?? msg}
        </div>
      )}

      <div style={ui.toolbar}>
        <div style={ui.segmentGroup}>
          {(
            [
              ["active", "Active", scopeCounts.active],
              ["archived", "Archived", scopeCounts.archived],
              ["all", "Everything", scopeCounts.all],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              style={ui.segmentBtn(archiveScope === key)}
              onClick={() => setArchiveScope(key)}
            >
              {label}
              <span style={{ opacity: 0.65, fontWeight: 700, marginLeft: 6 }}>({count})</span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 8 }} />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {statusFilters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              style={ui.filterChip(filter === key)}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 820, borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                <th style={ui.th}>Email</th>
                <th style={ui.th}>Account</th>
                <th style={ui.th}>Role</th>
                <th style={ui.th}>Status</th>
                <th style={ui.th}>Sent</th>
                <th style={ui.th}>Expires</th>
                <th style={ui.th}>Accepted</th>
                <th style={ui.th}>Last sign-in</th>
                <th style={{ ...ui.th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, idx) => {
                const status = inviteStatus(inv);
                const disabled = busyId === inv.id;
                const acctName = accountNameById[inv.account_id] || "—";
                const emailKey = normEmail(String(inv.email || ""));
                const lastIn =
                  status === "ACCEPTED" && emailKey ? lastSignInByEmail[emailKey] ?? null : null;

                const canRevoke = status === "PENDING" || status === "EXPIRED";
                const canSendNewInvite = status === "PENDING" || status === "EXPIRED" || status === "REVOKED";
                const canRemoveAccess = status === "ACCEPTED";
                const isArchived = !!inv.archived_at;

                return (
                  <tr key={inv.id} style={ui.rowHover(idx)}>
                    <td
                      style={{
                        ...ui.td,
                        fontWeight: 850,
                        wordBreak: "break-word",
                        maxWidth: 200,
                        verticalAlign: "top",
                        lineHeight: 1.25,
                      }}
                    >
                      {inv.email}
                    </td>
                    <td style={ui.td}>
                      <Link
                        href={`/admin/accounts/${encodeURIComponent(inv.account_id)}`}
                        style={{
                          fontWeight: 800,
                          fontSize: 11,
                          color: "var(--brand-700)",
                          textDecoration: "none",
                          lineHeight: 1.2,
                        }}
                      >
                        {acctName}
                      </Link>
                    </td>
                    <td style={{ ...ui.td, color: "var(--muted)", fontSize: 10 }}>{formatRoleLabel(inv.role)}</td>
                    <td style={ui.td}>
                      <span style={badgeStyle(status)}>{status}</span>
                    </td>
                    <td
                      style={{
                        ...ui.td,
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                        fontSize: 10,
                      }}
                    >
                      {fmtCompact(inv.created_at)}
                    </td>
                    <td
                      style={{
                        ...ui.td,
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                        fontSize: 10,
                      }}
                    >
                      {fmtCompact(inv.expires_at)}
                    </td>
                    <td
                      style={{
                        ...ui.td,
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                        fontSize: 10,
                      }}
                    >
                      {fmtCompact(inv.accepted_at)}
                    </td>
                    <td
                      style={{
                        ...ui.td,
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                        fontSize: 10,
                      }}
                    >
                      {status === "ACCEPTED" ? fmtCompact(lastIn) : "—"}
                    </td>
                    <td style={{ ...ui.td, textAlign: "right", verticalAlign: "middle" }}>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 4,
                          justifyContent: "flex-end",
                          rowGap: 3,
                          maxWidth: 252,
                          marginLeft: "auto",
                        }}
                      >
                        {canSendNewInvite ? (
                          <button
                            type="button"
                            onClick={() => onResend(inv.account_id, inv.id)}
                            disabled={disabled}
                            style={actionBtn("brand", disabled)}
                            title={status === "REVOKED" ? "Send a new invite email" : "Resend invite email"}
                          >
                            {disabled ? "…" : status === "REVOKED" ? "Reinstate" : "Resend"}
                          </button>
                        ) : (
                          <button type="button" disabled style={actionBtn("brand", true)}>
                            Resend
                          </button>
                        )}

                        {canRevoke ? (
                          <button
                            type="button"
                            onClick={() => onRevoke(inv.account_id, inv.id)}
                            disabled={disabled}
                            style={actionBtn("danger", disabled)}
                            title="Revoke this invite"
                          >
                            {disabled ? "…" : "Revoke"}
                          </button>
                        ) : (
                          <button type="button" disabled style={actionBtn("danger", true)} title="Not revocable">
                            Revoke
                          </button>
                        )}

                        {canRemoveAccess ? (
                          <button
                            type="button"
                            onClick={() => onRemoveAccess(inv.account_id, inv.id, inv.email)}
                            disabled={disabled}
                            style={actionBtn("danger", disabled)}
                            title="Remove account access (keeps login)"
                          >
                            {disabled ? "…" : "Remove"}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => onSetArchived(inv.id, !isArchived)}
                          disabled={disabled}
                          style={actionBtn("muted", disabled)}
                          title={isArchived ? "Return to active list" : "Hide from active list"}
                        >
                          {disabled ? "…" : isArchived ? "Restore" : "Archive"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: "28px 20px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          No invites match these filters.
        </div>
      )}
    </div>
  );
}
