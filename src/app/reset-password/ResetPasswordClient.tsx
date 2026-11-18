"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const BRAND_BLUE = "#1e88e5";
const TEXT_DARK = "#0f172a";
const TEXT_MUTED = "#64748b";

function parseHashTokens(hash: string): {
  access_token?: string;
  refresh_token?: string;
  type?: string;
  error?: string;
  error_description?: string;
} {
  const h = (hash || "").startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(h);
  return {
    access_token: params.get("access_token") || undefined,
    refresh_token: params.get("refresh_token") || undefined,
    type: params.get("type") || undefined,
    error: params.get("error") || undefined,
    error_description: params.get("error_description") || undefined,
  };
}

export default function ResetPasswordClient({ nextUrl }: { nextUrl: string }) {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  /** When true, user has MFA enrolled but session is AAL1 — must complete MFA challenge before updating password */
  const [needsMfaChallenge, setNeedsMfaChallenge] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [mfaCode, setMfaCode] = useState("");
  const [mfaSubmitting, setMfaSubmitting] = useState(false);

  async function onMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    if (mfaSubmitting || !mfaCode.trim()) return;

    setError(null);
    setMfaSubmitting(true);

    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) {
        setError(factors.error.message);
        return;
      }

      const totpFactor = factors.data.totp?.[0];
      if (!totpFactor) {
        setError("No authenticator app configured. Please contact support.");
        return;
      }

      const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challenge.error) {
        setError(challenge.error.message);
        return;
      }

      const verify = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.data.id,
        code: mfaCode.trim(),
      });

      if (verify.error) {
        setError(verify.error.message);
        return;
      }

      setNeedsMfaChallenge(false);
      setMfaCode("");
    } finally {
      setMfaSubmitting(false);
    }
  }

  // Handle Supabase redirect with tokens in hash (from password reset email link)
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (typeof window === "undefined") {
        setReady(true);
        return;
      }

      const hash = window.location.hash;
      if (hash) {
        const parsed = parseHashTokens(hash);

        if (parsed.error || parsed.error_description) {
          setError(parsed.error_description || parsed.error || "This reset link has expired or is invalid.");
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          setReady(true);
          return;
        }

        if (parsed.access_token && parsed.refresh_token) {
          const { error: sessErr } = await supabase.auth.setSession({
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
          });
          if (!mounted) return;

          if (sessErr) {
            setError(sessErr.message);
            setReady(true);
            return;
          }

          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          setHasSession(true);

          // If user has MFA, we need AAL2 to update password. Check if challenge is required.
          const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const hasTotp = (factorsData?.totp?.length ?? 0) > 0;
          const isAal1 = aalData?.currentLevel !== "aal2";
          if (hasTotp && isAal1) {
            setNeedsMfaChallenge(true);
          }

          setReady(true);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session) {
        setHasSession(true);
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const hasTotp = (factorsData?.totp?.length ?? 0) > 0;
        const isAal1 = aalData?.currentLevel !== "aal2";
        if (hasTotp && isAal1) {
          setNeedsMfaChallenge(true);
        }
      }

      setReady(true);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function onUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setStatus(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }

      setStatus("Password updated. Redirecting…");
      window.location.href = nextUrl || "/portal";
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background:
          "radial-gradient(1200px 600px at 20% 0%, rgba(30,136,229,0.25), transparent 60%)," +
          "linear-gradient(180deg, #020617, #020617 40%, #f8fafc 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 680,
          borderRadius: 22,
          overflow: "hidden",
          background: "white",
          boxShadow: "0 30px 90px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            background:
              "radial-gradient(900px 220px at 20% 20%, rgba(30,136,229,0.35), transparent 55%)," +
              "linear-gradient(180deg, #061225, #050b16)",
            padding: "22px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "rgba(255,255,255,0.72)", fontWeight: 850, fontSize: 13, letterSpacing: 0.5 }}>
              360 PORTAL
            </div>
            <h1 style={{ color: "white", fontSize: 30, fontWeight: 950, margin: "6px 0 0", lineHeight: 1.1 }}>
              Set a new password
            </h1>
            <div style={{ marginTop: 10, width: 72, height: 3, borderRadius: 999, background: BRAND_BLUE }} />
          </div>

          <div
            style={{
              textAlign: "right",
              fontSize: 13,
              fontWeight: 750,
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.35,
            }}
          >
            Secure password recovery
            <br />
            for your workspace
          </div>
        </div>

        <div style={{ padding: 28 }}>
          {!ready ? (
            <p style={{ color: TEXT_MUTED, fontWeight: 850, margin: 0 }}>Loading…</p>
          ) : !hasSession ? (
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                background: "rgba(234, 179, 8, 0.10)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "rgba(234, 179, 8, 0.35)",
                color: "#854d0e",
                fontWeight: 850,
              }}
            >
              This reset link is missing or expired. Please go back to the login page and request a new reset email.
              <div style={{ marginTop: 10 }}>
                <a href="/login" style={{ color: BRAND_BLUE, fontWeight: 950 }}>
                  Go to login
                </a>
              </div>
            </div>
          ) : needsMfaChallenge ? (
            <>
              <p style={{ color: TEXT_DARK, fontSize: 16, lineHeight: 1.6, margin: 0, marginBottom: 24 }}>
                Your account uses two-factor authentication. Enter the 6-digit code from your authenticator app to continue.
              </p>


              <form onSubmit={onMfaVerify} style={{ display: "grid", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontWeight: 900, color: TEXT_DARK, marginBottom: 10 }}>
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    style={{
                      width: "100%",
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "#cbd5e1",
                      fontSize: 18,
                      letterSpacing: 4,
                      textAlign: "center",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.boxShadow = `0 0 0 4px rgba(30,136,229,0.18)`;
                      e.currentTarget.style.borderColor = "rgba(30,136,229,0.55)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = "#cbd5e1";
                    }}
                  />
                </div>

                {error ? (
                  <div
                    role="alert"
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      background: "rgba(220, 38, 38, 0.10)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "rgba(220, 38, 38, 0.25)",
                      color: "rgb(153, 27, 27)",
                      fontWeight: 850,
                      fontSize: 14,
                    }}
                  >
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={mfaSubmitting || mfaCode.length !== 6}
                  style={{
                    marginTop: 8,
                    padding: 16,
                    borderRadius: 14,
                    background: mfaSubmitting || mfaCode.length !== 6 ? "rgba(30,136,229,0.50)" : BRAND_BLUE,
                    color: "white",
                    fontWeight: 950,
                    fontSize: 16,
                    border: "none",
                    cursor: mfaSubmitting || mfaCode.length !== 6 ? "not-allowed" : "pointer",
                    boxShadow: mfaSubmitting || mfaCode.length !== 6 ? "none" : "0 12px 30px rgba(30,136,229,0.35)",
                  }}
                >
                  {mfaSubmitting ? "Verifying…" : "Continue"}
                </button>
              </form>
            </>
          ) : (
            <>
              <p style={{ color: TEXT_DARK, fontSize: 16, lineHeight: 1.6, margin: 0, marginBottom: 24 }}>
                Choose a strong password you don't use elsewhere.
              </p>

              <form onSubmit={onUpdatePassword} style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontWeight: 900, color: TEXT_DARK, marginBottom: 8 }}>
                    New password
                  </label>

                  <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      style={{
                        flex: 1,
                        padding: 14,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#cbd5e1",
                        fontSize: 15,
                        outline: "none",
                        boxSizing: "border-box",
                        minWidth: 0,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.boxShadow = `0 0 0 4px rgba(30,136,229,0.18)`;
                        e.currentTarget.style.borderColor = "rgba(30,136,229,0.55)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.borderColor = "#cbd5e1";
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      style={{
                        padding: "0 14px",
                        borderRadius: 12,
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#cbd5e1",
                        background: "white",
                        cursor: "pointer",
                        fontWeight: 950,
                        fontSize: 13,
                        color: TEXT_DARK,
                        whiteSpace: "nowrap",
                        boxSizing: "border-box",
                      }}
                    >
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 900, color: TEXT_DARK, marginBottom: 8 }}>
                    Confirm password
                  </label>
                  <input
                    type={showPw ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    style={{
                      width: "100%",
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "#cbd5e1",
                      fontSize: 15,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.boxShadow = `0 0 0 4px rgba(30,136,229,0.18)`;
                      e.currentTarget.style.borderColor = "rgba(30,136,229,0.55)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = "#cbd5e1";
                    }}
                  />
                </div>

                {error ? (
                  <div
                    role="alert"
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      background: "rgba(220, 38, 38, 0.10)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "rgba(220, 38, 38, 0.25)",
                      color: "rgb(153, 27, 27)",
                      fontWeight: 850,
                      fontSize: 14,
                    }}
                  >
                    {error}
                  </div>
                ) : null}

                {status ? (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      background: "rgba(16, 185, 129, 0.10)",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "rgba(16, 185, 129, 0.25)",
                      color: "rgb(6, 95, 70)",
                      fontWeight: 900,
                      fontSize: 14,
                    }}
                  >
                    {status}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    marginTop: 8,
                    padding: 16,
                    borderRadius: 14,
                    background: submitting ? "rgba(30,136,229,0.50)" : BRAND_BLUE,
                    color: "white",
                    fontWeight: 950,
                    fontSize: 16,
                    border: "none",
                    cursor: submitting ? "not-allowed" : "pointer",
                    boxShadow: submitting ? "none" : "0 12px 30px rgba(30,136,229,0.35)",
                  }}
                >
                  {submitting ? "Updating…" : "Update password"}
                </button>

                <div style={{ fontSize: 13, color: TEXT_MUTED }}>
                  Prefer to sign in instead?{" "}
                  <a href="/login" style={{ color: BRAND_BLUE, fontWeight: 900 }}>
                    Go to login
                  </a>
                </div>
              </form>
            </>
          )}
        </div>

        <div
          style={{
            padding: "14px 24px",
            background: "#f8fafc",
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "#e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            fontSize: 13,
            fontWeight: 800,
            color: TEXT_MUTED,
          }}
        >
          <span>© {new Date().getFullYear()} 360 Medical</span>
          <span>Secure access • Invite-only</span>
        </div>
      </div>
    </main>
  );
}
