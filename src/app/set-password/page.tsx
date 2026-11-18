"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import MfaEnrollClient from "@/app/login/MfaEnrollClient";

const BRAND_BLUE = "#1e88e5";
const TEXT_DARK = "#0f172a";
const TEXT_MUTED = "#64748b";

const AUTH_MOBILE_STYLES = `
  @media (max-width: 560px) {
    .auth-shell {
      padding: 12px !important;
      align-items: flex-start !important;
      padding-top: max(12px, env(safe-area-inset-top)) !important;
      padding-bottom: max(12px, env(safe-area-inset-bottom)) !important;
    }
    .auth-card {
      border-radius: 16px !important;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.22) !important;
    }
    .login-header {
      flex-direction: column !important;
      align-items: flex-start !important;
      padding: 18px 16px !important;
      gap: 14px !important;
    }
    .login-header-brand {
      gap: 14px !important;
      width: 100%;
    }
    .login-header-logo {
      width: 108px !important;
      height: 56px !important;
      border-radius: 14px !important;
    }
    .login-header h1 {
      font-size: 24px !important;
      line-height: 1.15 !important;
    }
    .login-header-tagline {
      text-align: left !important;
      width: 100%;
      font-size: 12px !important;
    }
    .auth-body {
      padding: 20px 16px !important;
    }
    .pw-field-row {
      flex-direction: column !important;
      align-items: stretch !important;
    }
    .pw-toggle-btn {
      width: 100% !important;
      padding: 12px 14px !important;
    }
    .strength-row {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 8px !important;
    }
    .strength-label {
      min-width: 0 !important;
      text-align: left !important;
    }
    .auth-footer {
      flex-direction: column !important;
      align-items: flex-start !important;
      padding: 14px 16px !important;
      gap: 6px !important;
    }
    .auth-body input {
      font-size: 16px !important;
    }
    .mfa-panel {
      padding: 16px !important;
    }
  }
`;

function AuthMobileStyles() {
  return <style dangerouslySetInnerHTML={{ __html: AUTH_MOBILE_STYLES }} />;
}

function strengthInfo(pw: string) {
  const len12 = pw.length >= 12;
  const mixed = /[a-z]/.test(pw) && /[A-Z]/.test(pw);
  const num = /\d/.test(pw);
  const sym = /[^a-zA-Z0-9]/.test(pw);

  const score = [len12, mixed, num, sym].filter(Boolean).length; // 0..4
  if (pw.length < 8) return { label: "Too short", score: 0 };
  if (score <= 1) return { label: "Weak", score: 1 };
  if (score === 2) return { label: "Good", score: 2 };
  if (score === 3) return { label: "Strong", score: 3 };
  return { label: "Very strong", score: 4 };
}

function SetPasswordInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = useMemo(() => {
    const n = sp.get("next") || "/portal";
    // safety: only allow internal relative redirects
    return n.startsWith("/") ? n : "/portal";
  }, [sp]);

  const inviteId = useMemo(() => sp.get("invite") || "", [sp]);

  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionMissing, setSessionMissing] = useState(false);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [showMfaEnroll, setShowMfaEnroll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSession(retries = 0) {
      const { data, error: sessErr } = await supabase.auth.getSession();
      if (cancelled) return;

      if (sessErr || !data.session) {
        // When coming from invite link via auth callback, session can take a moment to propagate.
        const maxRetries = 8;
        if (retries < maxRetries) {
          await new Promise((r) => setTimeout(r, 250 + retries * 150));
          if (cancelled) return;
          return checkSession(retries + 1);
        }
        // Do NOT bounce invitees to /login (Forgot password is a common wrong turn).
        setSessionMissing(true);
        setLoading(false);
        return;
      }

      setSessionMissing(false);
      setLoading(false);
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function retrySessionCheck() {
    setLoading(true);
    setError(null);
    setSessionMissing(false);
    const { data, error: sessErr } = await supabase.auth.getSession();
    if (sessErr || !data.session) {
      setSessionMissing(true);
      setLoading(false);
      return;
    }
    setLoading(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setOk(null);

    if (pw1.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (pw1 !== pw2) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const { error: updErr } = await supabase.auth.updateUser({ password: pw1 });
      if (updErr) {
        setError(updErr.message);
        return;
      }

      if (inviteId) {
        const res = await fetch("/api/invite/accept", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ inviteId }),
        });

        const json: unknown = await res.json().catch(() => null);
        const okJson =
          typeof json === "object" &&
          json !== null &&
          "ok" in json &&
          (json as { ok?: unknown }).ok === true;

        const errMsg =
          typeof json === "object" && json !== null && "error" in json
            ? (json as { error?: unknown }).error
            : null;

        if (!res.ok || !okJson) {
          setError((typeof errMsg === "string" && errMsg) || `Invite acceptance failed (${res.status})`);
          return;
        }

        setOk("Password set. Invite accepted.");
      } else {
        setOk("Password set.");
      }

      setShowMfaEnroll(true);
    } finally {
      setSubmitting(false);
    }
  }

  const strength = strengthInfo(pw1);
  const logoVideoSrc = "/brand/360-logo-loop.mp4";

  return (
    <>
      <AuthMobileStyles />
      <main
        className="auth-shell"
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: 20,
          background:
            "radial-gradient(1200px 600px at 20% 0%, rgba(30,136,229,0.25), transparent 60%)," +
            "linear-gradient(180deg, #020617, #020617 40%, #f8fafc 100%)",
        }}
      >
        <div
          className="auth-card"
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
            <div className="login-header-brand" style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0, flex: "1 1 auto" }}>
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
                <video
                  src={logoVideoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  style={{
                    width: "150%",
                    height: "150%",
                    display: "block",
                    objectFit: "cover",
                    filter: "saturate(1.1) contrast(1.05)",
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ color: "rgba(255,255,255,0.72)", fontWeight: 850, fontSize: 13, letterSpacing: 0.5 }}>
                  360 PORTAL
                </div>

                <h1 style={{ color: "white", fontSize: 30, fontWeight: 950, margin: "6px 0 0", lineHeight: 1.1 }}>
                  Set your password
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
          <div className="auth-body" style={{ padding: 28 }}>
          <p style={{ color: TEXT_DARK, fontSize: 16, lineHeight: 1.6, margin: 0 }}>
            You’ve been invited to the 360 Portal. Create a password now so you can sign in anytime.
          </p>

          {loading ? (
            <p style={{ color: TEXT_MUTED, marginTop: 12 }}>Checking your session…</p>
          ) : sessionMissing ? (
            <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
              <div
                role="alert"
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: "rgba(220, 38, 38, 0.08)",
                  border: "1px solid rgba(220, 38, 38, 0.22)",
                  color: "rgb(153, 27, 27)",
                  fontWeight: 850,
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                We couldn’t open a secure invite session on this page. Don’t use Forgot password —
                open the newest invite email and click <strong>Continue to set password</strong> once.
              </div>
              <button
                type="button"
                onClick={() => void retrySessionCheck()}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: 0,
                  background: BRAND_BLUE,
                  color: "white",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              <a
                href="/invite/continue"
                style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: 700 }}
              >
                Or start again from your invite email link
              </a>
            </div>
          ) : showMfaEnroll ? (
            <>
              {ok ? (
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
                    marginBottom: 20,
                  }}
                >
                  {ok}
                </div>
              ) : null}
              <div
                className="mfa-panel"
                style={{
                  padding: 20,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "rgba(30,136,229,0.25)",
                  background: "rgba(30,136,229,0.04)",
                }}
              >
                <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 950, color: TEXT_DARK }}>
                  Add a login code (optional)
                </h2>
                <p style={{ margin: "0 0 16px", fontSize: 14, color: TEXT_MUTED }}>
                  You can do this now or skip and go to the portal.
                </p>
                <MfaEnrollClient
                  onEnrolled={() => router.replace(next)}
                  onCancelled={() => router.replace(next)}
                />
              </div>
            </>
          ) : (
            <form onSubmit={onSubmit} style={{ marginTop: 20, display: "grid", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontWeight: 900, color: TEXT_DARK, marginBottom: 8 }}>
                  New password
                </label>

                <div className="pw-field-row" style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    value={pw1}
                    onChange={(e) => setPw1(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Enter a secure password"
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "#cbd5e1",
                      fontSize: 16,
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
                    className="pw-toggle-btn"
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

                <div className="strength-row" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, height: 9, borderRadius: 999, background: "rgba(2,6,23,0.10)" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.max(8, (strength.score / 4) * 100)}%`,
                        borderRadius: 999,
                        background:
                          strength.score === 0
                            ? "rgba(220, 38, 38, 0.92)"
                            : strength.score === 1
                              ? "rgba(234, 179, 8, 0.95)"
                              : BRAND_BLUE,
                        transition: "width 160ms ease",
                      }}
                    />
                  </div>

                  <div className="strength-label" style={{ minWidth: 110, textAlign: "right", fontWeight: 950, color: TEXT_DARK }}>
                    {strength.label}
                  </div>
                </div>

                <div style={{ marginTop: 10, fontSize: 13, color: TEXT_MUTED, lineHeight: 1.45 }}>
                  <div style={{ fontWeight: 900, color: TEXT_DARK }}>Minimum 8 characters</div>
                  <div>Recommended: 12+ characters, mix of upper/lowercase, a number, and a symbol</div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 900, color: TEXT_DARK, marginBottom: 8 }}>
                  Confirm password
                </label>

                <input
                  type={showPw ? "text" : "password"}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  style={{
                    width: "100%",
                    padding: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "#cbd5e1",
                    fontSize: 16,
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

              {ok ? (
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
                  {ok}
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
                {submitting ? "Saving…" : "Save password"}
              </button>

              <div style={{ fontSize: 13, color: TEXT_MUTED }}>
                After setting your password, you can always sign in again at{" "}
                <code style={{ color: TEXT_DARK, fontWeight: 850 }}>/login</code>.
              </div>
            </form>
          )}
        </div>

          <div
            className="auth-footer"
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
    </>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <>
          <AuthMobileStyles />
          <main
            className="auth-shell"
            style={{
              minHeight: "100dvh",
              display: "grid",
              placeItems: "center",
              padding: 20,
              background:
                "radial-gradient(1200px 600px at 20% 0%, rgba(30,136,229,0.25), transparent 60%)," +
                "linear-gradient(180deg, #020617, #020617 40%, #f8fafc 100%)",
            }}
          >
            <div
              className="auth-card"
              style={{
                width: "100%",
                maxWidth: 680,
                borderRadius: 22,
                overflow: "hidden",
                background: "white",
                boxShadow: "0 30px 90px rgba(0,0,0,0.35)",
                padding: 28,
              }}
            >
              <div style={{ color: TEXT_DARK, fontSize: 16, lineHeight: 1.6, margin: 0 }}>
                Preparing invite…
              </div>
            </div>
          </main>
        </>
      }
    >
      <SetPasswordInner />
    </Suspense>
  );
}
