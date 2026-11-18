"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { friendlyNetworkError } from "@/lib/utils/networkErrorMessage";
import { mfaStepAfterPassword } from "@/lib/auth/mfaLoginStep";
import { postLoginFlagsFromMe, resolvePostLoginPath } from "@/lib/auth/resolvePostLoginPath";
import MfaChallengeClient from "./MfaChallengeClient";
import MfaEnrollClient from "./MfaEnrollClient";

function parseHashTokens(hash: string): {
  access_token?: string;
  refresh_token?: string;
  type?: string;
  error?: string;
  error_code?: string;
  error_description?: string;
} {
  const h = (hash || "").startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(h);
  return {
    access_token: params.get("access_token") || undefined,
    refresh_token: params.get("refresh_token") || undefined,
    type: params.get("type") || undefined,
    error: params.get("error") || undefined,
    error_code: params.get("error_code") || undefined,
    error_description: params.get("error_description") || undefined,
  };
}

function friendlyAuthError(desc: string): string {
  const s = (desc || "").toLowerCase();
  if (s.includes("expired") || s.includes("otp_expired") || s.includes("invalid")) {
    return "This invite link has expired or was already used. Some email apps prefetch links and consume them. Ask your admin to send a fresh invite, then click the new link right away (avoid opening the email in multiple tabs).";
  }
  return desc;
}

const BRAND_BLUE = "#1e88e5";
const TEXT_DARK = "#0f172a";
const TEXT_MUTED = "#64748b";

type Mode = "login" | "reset";

export default function LoginClient({ nextUrl }: { nextUrl: string }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [mode, setMode] = useState<Mode>("login");
  const [showMfaChallenge, setShowMfaChallenge] = useState(false);
  const [showMfaEnroll, setShowMfaEnroll] = useState(false);

  const inviteContext = useMemo(() => {
    const n = (nextUrl || "").toLowerCase();
    return n.includes("/set-password") || n.includes("invite=");
  }, [nextUrl]);
  const [inviteLinkError, setInviteLinkError] = useState(false);
  const blockPasswordReset = inviteContext || inviteLinkError;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const logoSrc = "/brand/360-medical-logo.svg";

  // Handle Supabase redirect to /login with tokens or errors in hash
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;

    const parsed = parseHashTokens(hash);

    // Error from Supabase (expired link, etc.)
    if (parsed.error || parsed.error_code || parsed.error_description) {
      const msg = friendlyAuthError(parsed.error_description || parsed.error || "Sign-in failed.");
      setError(msg);
      setInviteLinkError(true);
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      return;
    }

    const { access_token, refresh_token, type } = parsed;
    if (!access_token || !refresh_token) return;

    let cancelled = false;

    (async () => {
      setStatus("Completing sign-in…");
      const { error: sessErr } = await supabase.auth.setSession({ access_token, refresh_token });
      if (cancelled) return;

      if (sessErr) {
        setError(sessErr.message);
        setStatus(null);
        return;
      }

      // Clear hash from URL
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

      if (type === "invite") {
        const res = await fetch("/api/invite/lookup", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; inviteId?: string } | null;
        if (cancelled) return;

        if (json?.ok && json.inviteId) {
          const dest = `/set-password?invite=${encodeURIComponent(json.inviteId)}&next=${encodeURIComponent("/portal")}`;
          window.location.href = dest;
          return;
        }
      }

      setStatus("Signed in. Redirecting…");
      const dest = await resolvePostLoginRedirect();
      window.location.href = dest;
    })();

    return () => {
      cancelled = true;
    };
  }, [nextUrl]);

  async function resolvePostLoginRedirect(): Promise<string> {
    const fallback = nextUrl || "/portal";
    try {
      const res = await fetch("/api/portal/me", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      return resolvePostLoginPath(postLoginFlagsFromMe(json), fallback);
    } catch {
      return fallback;
    }
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setStatus(null);
    setSubmitting(true);

    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        setError(signInErr.message);
        return;
      }

      const { data: aalData, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalErr) {
        setError(aalErr.message);
        return;
      }

      const mfaStep = mfaStepAfterPassword(aalData);
      if (mfaStep === "challenge") {
        setShowMfaChallenge(true);
        return;
      }

      setStatus("Signed in. Redirecting…");
      const dest = await resolvePostLoginRedirect();
      window.location.href = dest;
    } catch (err) {
      setError(friendlyNetworkError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSendReset(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setStatus(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), next: nextUrl || "/portal" }),
      });

      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }

      // Non-enumerating language: don't confirm whether the email exists.
      setStatus(
        "If an account exists for this email, you’ll receive a password reset link shortly. " +
          "If you were invited recently, please use the invite link from your email to set your password."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = mode === "login";

  if (showMfaChallenge) {
    return <MfaChallengeClient nextUrl={nextUrl} />;
  }

  if (showMfaEnroll) {
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
        <style dangerouslySetInnerHTML={{ __html: `
          @media (max-width: 560px) {
            .login-header { flex-direction: column; align-items: flex-start; }
            .login-header-tagline { text-align: left !important; margin-top: 4px; }
            .login-header-logo { width: 120px !important; height: 62px !important; }
          .login-header h1 { font-size: 22px !important; }
          }
        `}} />
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            borderRadius: 22,
            overflow: "hidden",
            background: "white",
            boxShadow: "0 30px 90px rgba(0,0,0,0.35)",
          }}
        >
          {/* HEADER - matches login page */}
          <div
            className="login-header"
            style={{
              background:
                "radial-gradient(900px 220px at 20% 20%, rgba(30,136,229,0.35), transparent 55%)," +
                "linear-gradient(180deg, #061225, #050b16)",
              padding: "22px 24px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0, flex: "1 1 auto" }}>
              <div
                className="login-header-logo"
                style={{
                  width: 180,
                  height: 92,
                  borderRadius: 20,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "rgba(255,255,255,0.12)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.35), 0 0 0 4px rgba(30,136,229,0.10)",
                  backdropFilter: "blur(8px)",
                  flex: "0 0 auto",
                  display: "grid",
                  placeItems: "center",
                }}
                aria-hidden
              >
                <img
                  src={logoSrc}
                  alt=""
                  style={{
                    width: "88%",
                    height: "88%",
                    display: "block",
                    objectFit: "contain",
                  }}
                />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ color: "rgba(255,255,255,0.72)", fontWeight: 850, fontSize: 13, letterSpacing: 0.5 }}>
                  360 PORTAL
                </div>
                <h1 style={{ color: "white", fontSize: 26, fontWeight: 950, margin: "8px 0 0", lineHeight: 1.2 }}>
                  Set up two-factor authentication
                </h1>
                <div style={{ marginTop: 10, width: 72, height: 3, borderRadius: 999, background: BRAND_BLUE }} />
              </div>
            </div>

            <div
              className="login-header-tagline"
              style={{
                textAlign: "right",
                fontSize: 13,
                fontWeight: 750,
                color: "rgba(255,255,255,0.78)",
                lineHeight: 1.35,
                flexShrink: 0,
              }}
            >
              Streamlining insurance verification
              <br />
              and order management
            </div>
          </div>
          <MfaEnrollClient
            onEnrolled={async () => {
              const dest = await resolvePostLoginRedirect();
              window.location.href = dest;
            }}
            onCancelled={async () => {
              const dest = await resolvePostLoginRedirect();
              window.location.href = dest;
            }}
          />
          <div
            style={{
              padding: "14px 24px",
              background: "#f8fafc",
              borderTopWidth: 1,
              borderTopStyle: "solid",
              borderTopColor: "#e5e7eb",
              fontSize: 13,
              fontWeight: 800,
              color: TEXT_MUTED,
            }}
          >
            © {new Date().getFullYear()} 360 Medical
          </div>
        </div>
      </main>
    );
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
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 560px) {
          .login-header { flex-direction: column; align-items: flex-start; }
          .login-header-tagline { text-align: left !important; margin-top: 4px; }
          .login-header-logo { width: 120px !important; height: 62px !important; }
        .login-header h1 { font-size: 22px !important; }
        }
      `}} />
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
        {/* HEADER */}
        <div
          className="login-header"
          style={{
            background:
              "radial-gradient(900px 220px at 20% 20%, rgba(30,136,229,0.35), transparent 55%)," +
              "linear-gradient(180deg, #061225, #050b16)",
            padding: "22px 24px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0, flex: "1 1 auto" }}>
            <div
              className="login-header-logo"
              style={{
                width: 180,
                height: 92,
                borderRadius: 20,
                overflow: "hidden",
                background: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "rgba(255,255,255,0.12)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.35), 0 0 0 4px rgba(30,136,229,0.10)",
                backdropFilter: "blur(8px)",
                flex: "0 0 auto",
                display: "grid",
                placeItems: "center",
              }}
              aria-hidden
            >
              <img
                src={logoSrc}
                alt=""
                style={{
                  width: "88%",
                  height: "88%",
                  display: "block",
                  objectFit: "contain",
                }}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ color: "rgba(255,255,255,0.72)", fontWeight: 850, fontSize: 13, letterSpacing: 0.5 }}>
                360 PORTAL
              </div>

              <h1 style={{ color: "white", fontSize: 30, fontWeight: 950, margin: "6px 0 0", lineHeight: 1.1 }}>
                {isLogin ? "Sign in" : "Reset password"}
              </h1>

              <div style={{ marginTop: 10, width: 72, height: 3, borderRadius: 999, background: BRAND_BLUE }} />
            </div>
          </div>

          <div
            className="login-header-tagline"
            style={{
              textAlign: "right",
              fontSize: 13,
              fontWeight: 750,
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.35,
              flexShrink: 0,
              minWidth: 0,
            }}
          >
            Streamlining insurance verification
            <br />
            and order management
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: 28 }}>
          <p style={{ color: TEXT_DARK, fontSize: 16, lineHeight: 1.6, margin: 0 }}>
            {isLogin ? "Sign in to access your 360 Portal workspace." : "Enter your email and we’ll send a reset link."}
          </p>

          {isLogin && blockPasswordReset ? (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                background: "rgba(30,136,229,0.08)",
                border: "1px solid rgba(30,136,229,0.2)",
                color: TEXT_DARK,
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              <strong>Setting a password from an invite?</strong> Don’t use Forgot password here.
              Open the newest invite email and click <strong>Continue to set password</strong>. Signing
              in on this page won’t work until that step is finished.
            </div>
          ) : null}

          <form onSubmit={isLogin ? onLogin : onSendReset} style={{ marginTop: 20, display: "grid", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontWeight: 900, color: TEXT_DARK, marginBottom: 8 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@company.com"
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

            {isLogin ? (
              <div>
                <label style={{ display: "block", fontWeight: 900, color: TEXT_DARK, marginBottom: 8 }}>Password</label>

                <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Your password"
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

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                  {blockPasswordReset ? (
                    <span style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: 800 }}>
                      Use your invite email — password reset won’t unlock a new invite.
                    </span>
                  ) : (
                    <span style={{ fontSize: 13, color: TEXT_MUTED }}>
                      Trouble signing in?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("reset");
                          setError(null);
                          setStatus(null);
                        }}
                        style={{
                          appearance: "none",
                          border: 0,
                          padding: 0,
                          background: "transparent",
                          color: BRAND_BLUE,
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Forgot password
                      </button>
                    </span>
                  )}

                  <span style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: 800 }}>Invite-only</span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 2,
                  padding: 14,
                  borderRadius: 14,
                  background: "#f8fafc",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "#e5e7eb",
                  color: TEXT_MUTED,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                We’ll email you a secure link to set a new password. If you don’t see it, check spam/junk.
              </div>
            )}

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
              {submitting ? (isLogin ? "Signing in…" : "Sending…") : isLogin ? "Sign in" : "Send reset link"}
            </button>

            {!isLogin ? (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                    setStatus(null);
                  }}
                  style={{
                    appearance: "none",
                    border: 0,
                    padding: 0,
                    background: "transparent",
                    color: BRAND_BLUE,
                    fontWeight: 900,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  ← Back to sign in
                </button>

                <span style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: 800 }}>Invite-only</span>
              </div>
            ) : null}
          </form>
        </div>

        {/* FOOTER */}
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
