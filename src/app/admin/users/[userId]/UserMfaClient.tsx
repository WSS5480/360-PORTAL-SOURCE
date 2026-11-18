"use client";

import { useCallback, useState } from "react";

type FactorRow = {
  id: string;
  factor_type: string;
  friendly_name?: string | null;
  status: string;
};

const btnDanger: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid rgba(220,38,38,0.4)",
  background: "white",
  color: "#b91c1c",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
};

export default function UserMfaClient(props: { userId: string; factors: FactorRow[] }) {
  const { userId, factors: initialFactors } = props;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [factors, setFactors] = useState<FactorRow[]>(initialFactors);

  const removeFactor = useCallback(
    async (factorId: string) => {
      if (!window.confirm("Remove this MFA factor? The user may be signed out of active sessions.")) return;
      setBusy(true);
      setMsg(null);
      setErr(null);
      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/mfa/${encodeURIComponent(factorId)}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || `Failed (${res.status})`);
        }
        setFactors((prev) => prev.filter((f) => f.id !== factorId));
        setMsg("MFA factor removed.");
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Failed to remove factor");
      } finally {
        setBusy(false);
      }
    },
    [userId]
  );

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p style={{ margin: 0, fontSize: 13, opacity: 0.8, lineHeight: 1.45 }}>
        If the user is locked out of MFA, you can remove a factor so they can sign in again and re-enroll.
      </p>
      {factors.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {factors.map((f) => (
            <div
              key={f.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.08)",
                background: "rgba(0,0,0,0.02)",
              }}
            >
              <div>
                <div style={{ fontWeight: 900, fontSize: 13 }}>
                  {String(f.factor_type || "factor").toUpperCase()}
                  {f.friendly_name ? <span style={{ opacity: 0.75, marginLeft: 8 }}>{f.friendly_name}</span> : null}
                </div>
                <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
                  Status: {f.status} · ID: <code style={{ fontSize: 11 }}>{f.id.slice(0, 8)}…</code>
                </div>
              </div>
              <button type="button" disabled={busy} onClick={() => void removeFactor(f.id)} style={btnDanger}>
                Remove factor
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, opacity: 0.7 }}>No MFA factors enrolled.</div>
      )}
      {msg ? (
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(22,163,74,0.1)", fontSize: 13, fontWeight: 700 }}>{msg}</div>
      ) : null}
      {err ? (
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(220,38,38,0.08)", fontSize: 13, fontWeight: 700, color: "#b91c1c" }}>
          {err}
        </div>
      ) : null}
    </div>
  );
}
