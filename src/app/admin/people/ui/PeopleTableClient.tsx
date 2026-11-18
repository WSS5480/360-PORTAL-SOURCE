"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type PeopleRow = {
  id: string;
  account_id: string;
  account_name?: string | null;

  full_name: string | null;
  email: string;

  user_id: string | null;
  created_at: string;

  ivr_count?: number | null;
  last_ivr_at?: string | null;

  order_count?: number | null;
  last_order_at?: string | null;

  last_invite_created_at?: string | null;
  last_invite_accepted_at?: string | null;
  last_invite_revoked_at?: string | null;
  last_invite_expires_at?: string | null;
};

function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleString();
}

function cellStyle(): React.CSSProperties {
  return {
    padding: 10,
    borderBottom: "1px solid #f2f2f2",
    fontSize: 13,
    verticalAlign: "top",
  };
}

function thStyle(): React.CSSProperties {
  return {
    textAlign: "left",
    padding: 10,
    fontSize: 12,
    borderBottom: "1px solid #eee",
    background: "#fafafa",
    whiteSpace: "nowrap",
  };
}

function norm(s: string) {
  return (s || "").trim().toLowerCase();
}

export default function PeopleTableClient(props: { rows: PeopleRow[]; initialQ?: string }) {
  const [q, setQ] = useState<string>(props.initialQ || "");
  const [portalFilter, setPortalFilter] = useState<"all" | "linked" | "not_linked">("all");
  const [inviteFilter, setInviteFilter] = useState<"all" | "pending" | "accepted" | "revoked" | "none">("all");

  const filtered = useMemo(() => {
    const needle = norm(q);
    return props.rows.filter((r: PeopleRow) => {
      if (portalFilter === "linked" && !r.user_id) return false;
      if (portalFilter === "not_linked" && r.user_id) return false;

      const hasInvite = !!r.last_invite_created_at;
      const isAccepted = !!r.last_invite_accepted_at;
      const isRevoked = !!r.last_invite_revoked_at;
      const isPending = !!r.last_invite_created_at && !r.last_invite_accepted_at && !r.last_invite_revoked_at;

      if (inviteFilter === "accepted" && !isAccepted) return false;
      if (inviteFilter === "revoked" && !isRevoked) return false;
      if (inviteFilter === "pending" && !isPending) return false;
      if (inviteFilter === "none" && hasInvite) return false;

      const name = norm(r.full_name || "");
      const email = norm(r.email || "");
      const acct = norm(r.account_name || r.account_id || "");
      if (!needle) return true;
      return name.includes(needle) || email.includes(needle) || acct.includes(needle);
    });
  }, [q, portalFilter, inviteFilter, props.rows]);

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, or account…"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.2)",
              minWidth: 320,
            }}
          />
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            Showing <b>{filtered.length}</b> of <b>{props.rows.length}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Portal:</div>
          {[
            { key: "all", label: "All" },
            { key: "linked", label: "Linked" },
            { key: "not_linked", label: "Not linked" },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setPortalFilter(f.key as any)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.12)",
                background: portalFilter === f.key ? "rgba(30,136,229,0.14)" : "white",
                fontWeight: 900,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
          <div style={{ fontSize: 12, opacity: 0.7 }}>Invite:</div>
          {[
            { key: "all", label: "All" },
            { key: "pending", label: "Pending" },
            { key: "accepted", label: "Accepted" },
            { key: "revoked", label: "Revoked" },
            { key: "none", label: "None" },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setInviteFilter(f.key as any)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.12)",
                background: inviteFilter === f.key ? "rgba(30,136,229,0.14)" : "white",
                fontWeight: 900,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #e5e5e5", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle()}>Person</th>
              <th style={thStyle()}>Account</th>
              <th style={thStyle()}>IVRs</th>
              <th style={thStyle()}>Orders</th>
              <th style={thStyle()}>Created</th>
              <th style={thStyle()}>Portal</th>
              <th style={thStyle()}>Invite</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r: PeopleRow) => {
              const name = (r.full_name || "").trim() || "—";
              const email = (r.email || "").trim() || "—";

              const portalStatus = r.user_id ? "Linked" : "Not linked";

              let inviteStatus = "—";
              if (r.last_invite_accepted_at) inviteStatus = "Accepted";
              else if (r.last_invite_revoked_at) inviteStatus = "Revoked";
              else if (r.last_invite_created_at) inviteStatus = "Pending";

              const inviteHref =
                `/admin/invite?fromPeople=1` +
                `&account_id=${encodeURIComponent(r.account_id)}` +
                `&email=${encodeURIComponent(r.email || "")}` +
                `&full_name=${encodeURIComponent((r.full_name || "").trim())}`;

              const canInvite = Boolean(norm(r.email));

              return (
                <tr key={r.id}>
                  <td style={cellStyle()}>
                    <div style={{ fontWeight: 900 }}>{name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{email}</div>
                  </td>

                  <td style={cellStyle()}>
                    <div style={{ fontWeight: 800 }}>{r.account_name || "—"}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{r.account_id}</div>
                  </td>

                  <td style={cellStyle()}>
                    <div style={{ fontWeight: 900 }}>{r.ivr_count ?? 0}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Last: {fmtDateTime(r.last_ivr_at)}</div>
                  </td>

                  <td style={cellStyle()}>
                    <div style={{ fontWeight: 900 }}>{r.order_count ?? 0}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Last: {fmtDateTime(r.last_order_at)}</div>
                  </td>

                  <td style={cellStyle()}>{fmtDateTime(r.created_at)}</td>

                  <td style={cellStyle()}>
                    <div style={{ fontWeight: 800 }}>{portalStatus}</div>
                    {r.user_id ? (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>user_id: {r.user_id}</div>
                    ) : (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>Invite to create login</div>
                    )}
                  </td>

                  <td style={cellStyle()}>
                    <div style={{ fontWeight: 800 }}>{inviteStatus}</div>

                    <div style={{ marginTop: 6 }}>
                      {canInvite ? (
                        <Link href={inviteHref} style={{ fontWeight: 900 }}>
                          Invite →
                        </Link>
                      ) : (
                        <span style={{ fontWeight: 900, opacity: 0.5 }}>Invite →</span>
                      )}
                    </div>

                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                      Last invite: {fmtDateTime(r.last_invite_created_at)}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 12, fontSize: 13, opacity: 0.8 }}>
                  No people found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
