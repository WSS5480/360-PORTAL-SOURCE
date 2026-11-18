"use client";

import { useRef, useState } from "react";

const ROLES = ["INTERNAL_ADMIN", "IVR_STAFF", "INTERNAL_SALES_REP", "ORDER_CREATOR", "ACCOUNT_ADMIN"] as const;

const ROLE_LABEL: Record<(typeof ROLES)[number], string> = {
  INTERNAL_ADMIN: "Internal Admin",
  IVR_STAFF: "IVR Team staff",
  INTERNAL_SALES_REP: "Internal sales rep",
  ORDER_CREATOR: "Customer",
  ACCOUNT_ADMIN: "Account admin",
};

export default function InviteForm({ accountId }: { accountId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("ORDER_CREATOR");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setStatus(null);
    setInviteUrl(null);
    setBusy(true);

    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/invites`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `Failed (HTTP ${res.status})`);
      }

      setStatus("Invite sent.");
      setInviteUrl(json.inviteUrl || null);
      setEmail("");
    } catch (e: any) {
      setError(e?.message || "Failed to send invite");
    } finally {
      setBusy(false);
      submittingRef.current = false;
    }
  }

  return (
    <form onSubmit={sendInvite} style={{ display: "grid", gap: 14, maxWidth: 640 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
            Email
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="customer@company.com"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 12,
              marginTop: 6,
              fontSize: 14,
              fontWeight: 900,
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 12,
              marginTop: 6,
              fontSize: 14,
              fontWeight: 900,
              background: "white",
            }}
          >
            {ROLES.map((r) => (
              <option value={r} key={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid color-mix(in srgb, var(--brand-600) 40%, #111)",
            background: "var(--brand-600)",
            color: "white",
            fontWeight: 900,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Sending…" : "Send invite"}
        </button>

        <div style={{ fontSize: 12, opacity: 0.75 }}>
          No PHI in emails. Invite links expire automatically.
        </div>
      </div>

      {status ? (
        <div style={{ padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.05)", fontSize: 13 }}>
          {status}
        </div>
      ) : null}

      {error ? (
        <div style={{ padding: 10, borderRadius: 10, background: "rgba(220,0,0,0.08)", color: "crimson", fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      {inviteUrl ? (
        <div style={{ padding: 14, borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", background: "rgba(0,0,0,0.02)" }}>
          <div style={{ fontWeight: 900, fontSize: 13 }}>Invite link (copy/paste if needed)</div>
          <div style={{ marginTop: 8 }}>
            <input
              value={inviteUrl}
              readOnly
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 12,
                fontSize: 13,
              }}
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        </div>
      ) : null}
    </form>
  );
}
