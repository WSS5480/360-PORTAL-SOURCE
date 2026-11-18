"use client";

import { useCallback, useState } from "react";

const btnPrimary: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "white",
  fontWeight: 900,
  fontSize: 13,
  cursor: "pointer",
};

export default function UserPasswordRecoveryClient(props: { userId: string; email: string | null }) {
  const { userId, email } = props;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const sendReset = useCallback(async () => {
    if (!email) {
      setErr("This user has no email address.");
      return;
    }
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/send-password-reset`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ next: "/portal" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Failed (${res.status})`);
      }
      setMsg(`Password reset email sent to ${email}. Same flow as Forgot password on the login page.`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setBusy(false);
    }
  }, [email, userId]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p style={{ margin: 0, fontSize: 13, opacity: 0.8, lineHeight: 1.45 }}>
        Sends the same recovery email as when a user chooses <b>Forgot password</b> on the login page. They set a new password from the
        link (expires in about one hour).
      </p>
      <button type="button" onClick={() => void sendReset()} disabled={busy || !email} style={btnPrimary}>
        {busy ? "Sending…" : "Send password reset email"}
      </button>
      {!email ? (
        <p style={{ margin: 0, fontSize: 12, color: "#b45309" }}>No email on this account — password reset is unavailable.</p>
      ) : null}
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
