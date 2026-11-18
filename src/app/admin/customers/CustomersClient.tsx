"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatRoleLabel } from "@/lib/formatStatusLabel";

type InviteStatus = "NONE" | "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

type CustomerRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;

  account_id: string;
  account_name: string | null;

  role: string;
  member_created_at: string | null;

  ivr_count: number;

  invite_status: InviteStatus;
  last_invite_created_at: string | null;
};

function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleString();
}

function pill(status: InviteStatus): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,0.12)",
  };

  if (status === "PENDING") return { ...base, background: "rgba(255,165,0,0.12)" };
  if (status === "ACCEPTED") return { ...base, background: "rgba(0,160,0,0.12)" };
  if (status === "REVOKED") return { ...base, background: "rgba(220,0,0,0.10)" };
  if (status === "EXPIRED") return { ...base, background: "rgba(120,120,120,0.12)" };
  return { ...base, background: "rgba(0,0,0,0.06)" };
}

export default function CustomersClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const q = sp.get("q") || "";
  const limit = Math.min(Number(sp.get("limit") || "50"), 200);
  const invite = (sp.get("invite") || "ALL").toUpperCase(); // ALL|NONE|PENDING|ACCEPTED|REVOKED|EXPIRED

  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [invitingKey, setInvitingKey] = useState<string | null>(null);

  const inviteFilter = useMemo(() => {
    const allowed = new Set(["ALL", "NONE", "PENDING", "ACCEPTED", "REVOKED", "EXPIRED"]);
    return allowed.has(invite) ? invite : "ALL";
  }, [invite]);

  async function load() {
    setLoading(true);
    setErr(null);

    const qs = new URLSearchParams();
    if (q.trim()) qs.set("q", q.trim());
    qs.set("limit", String(limit));
    qs.set("invite", inviteFilter);

    const res = await fetch(`/api/admin/customers?${qs.toString()}`, { cache: "no-store" });
    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.ok) {
      setErr(json?.error || `Failed to load (${res.status})`);
      setRows([]);
      setCount(0);
      setLoading(false);
      return;
    }

    setRows(json.data || []);
    setCount(json.count || 0);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteFilter, limit]);

  async function inviteUser(row: CustomerRow) {
    if (!row.email) {
      setErr("This user has no email on file, so they cannot be invited.");
      return;
    }

    const key = `${row.account_id}:${row.user_id}`;
    setInvitingKey(key);
    setErr(null);

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        mode: "existing",
        email: row.email,
        accountId: row.account_id,
      }),
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const json = isJson ? await res.json().catch(() => null) : null;

    if (!isJson || !json) {
      setErr("Session may have expired. Please sign in again.");
      setInvitingKey(null);
      if (!isJson) window.location.href = "/login?next=" + encodeURIComponent("/admin/customers");
      return;
    }

    if (!res.ok || !json?.ok) {
      setErr(json?.error || `Invite failed (${res.status})`);
      setInvitingKey(null);
      return;
    }

    setInvitingKey(null);
    await load();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>Search</span>
          <input
            value={q}
            onChange={(e) => {
              const next = new URLSearchParams(sp.toString());
              const v = e.target.value;
              if (v) next.set("q", v);
              else next.delete("q");
              router.push(`/admin/customers?${next.toString()}`);
            }}
            placeholder="name or email"
            style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 8, minWidth: 260 }}
          />
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>Invite</span>
          <select
            value={inviteFilter}
            onChange={(e) => {
              const next = new URLSearchParams(sp.toString());
              next.set("invite", e.target.value);
              router.push(`/admin/customers?${next.toString()}`);
            }}
            style={{ padding: "6px 10px" }}
          >
            {["ALL", "NONE", "PENDING", "ACCEPTED", "REVOKED", "EXPIRED"].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>

        <div style={{ fontSize: 13, opacity: 0.8 }}>
          Total: <strong>{count}</strong>
        </div>

        <button
          onClick={() => load()}
          style={{ marginLeft: "auto", padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)", fontWeight: 900 }}
        >
          Refresh
        </button>
      </div>

      {loading ? <div style={{ padding: 12 }}>Loading…</div> : null}
      {err ? (
        <div style={{ padding: 12, color: "crimson", border: "1px solid rgba(220,0,0,0.25)", borderRadius: 10, marginBottom: 12 }}>
          {err}
        </div>
      ) : null}

      {!loading && (
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ textAlign: "left", padding: 10, fontSize: 12, borderBottom: "1px solid #eee" }}>Customer</th>
                <th style={{ textAlign: "left", padding: 10, fontSize: 12, borderBottom: "1px solid #eee" }}>Account</th>
                <th style={{ textAlign: "left", padding: 10, fontSize: 12, borderBottom: "1px solid #eee" }}>Role</th>
                <th style={{ textAlign: "left", padding: 10, fontSize: 12, borderBottom: "1px solid #eee" }}>Created</th>
                <th style={{ textAlign: "left", padding: 10, fontSize: 12, borderBottom: "1px solid #eee" }}>IVRs</th>
                <th style={{ textAlign: "left", padding: 10, fontSize: 12, borderBottom: "1px solid #eee" }}>Invite</th>
                <th style={{ textAlign: "left", padding: 10, fontSize: 12, borderBottom: "1px solid #eee" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const displayName = r.full_name?.trim() || (r.email ? r.email.split("@")[0] : "Customer");
                const key = `${r.account_id}:${r.user_id}`;
                const canInvite = !!r.email;

                return (
                  <tr key={key}>
                    <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2", fontSize: 13 }}>
                      <div style={{ fontWeight: 900 }}>{displayName}</div>
                      <div style={{ opacity: 0.8 }}>{r.email || <span style={{ color: "crimson" }}>Missing email</span>}</div>
                      <div style={{ opacity: 0.65, fontSize: 12 }}>User ID: {r.user_id.slice(0, 8)}…</div>
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2", fontSize: 13 }}>
                      <div style={{ fontWeight: 900 }}>{r.account_name || "—"}</div>
                      <div style={{ opacity: 0.65, fontSize: 12 }}>{r.account_id.slice(0, 8)}…</div>
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2", fontSize: 13 }}>
                      <span style={{ fontWeight: 900 }}>{formatRoleLabel(r.role)}</span>
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2", fontSize: 13 }}>
                      {fmtDate(r.member_created_at)}
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2", fontSize: 13 }}>
                      <span style={{ fontWeight: 900 }}>{r.ivr_count}</span>
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2", fontSize: 13 }}>
                      <span style={pill(r.invite_status)}>{r.invite_status}</span>
                      <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>
                        {r.last_invite_created_at ? `Last: ${fmtDate(r.last_invite_created_at)}` : "No invites yet"}
                      </div>
                    </td>

                    <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2", fontSize: 13 }}>
                      <button
                        onClick={() => inviteUser(r)}
                        disabled={!canInvite || invitingKey === key}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid rgba(0,0,0,0.2)",
                          fontWeight: 900,
                          cursor: !canInvite || invitingKey === key ? "not-allowed" : "pointer",
                          background: !canInvite ? "rgba(0,0,0,0.08)" : "#111",
                          color: !canInvite ? "#111" : "white",
                        }}
                      >
                        {invitingKey === key ? "Inviting…" : r.invite_status === "PENDING" ? "Re-send Invite" : "Invite"}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 12, fontSize: 13, opacity: 0.8 }}>
                    No customer users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
