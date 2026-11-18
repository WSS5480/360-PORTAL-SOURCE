"use client";

import { useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { postLoginFlagsFromMe, resolvePostLoginPath } from "@/lib/auth/resolvePostLoginPath";
import { userFacingError } from "@/lib/errors/userFacingError";

const BRAND_BLUE = "#1e88e5";
const TEXT_DARK = "#0f172a";
const TEXT_MUTED = "#64748b";

export default function MfaChallengeClient({
  nextUrl,
  onSuccess,
}: {
  nextUrl: string;
  onSuccess?: () => void;
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lastAutoSubmitted = useRef("");

  async function resolveRedirect(): Promise<string> {
    const fallback = nextUrl || "/portal";
    try {
      const res = await fetch("/api/portal/me", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      return resolvePostLoginPath(postLoginFlagsFromMe(json), fallback);
    } catch {
      return fallback;
    }
  }

  async function verifyTotp(code: string) {
    if (submitting) return;
    const trimmed = code.trim();
    if (trimmed.length !== 6) return;

    setError(null);
    setSubmitting(true);

    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) {
        setError(factors.error.message);
        return;
      }

      const totpFactor =
        (factors.data.totp ?? []).find((f) => f.status === "verified") ?? factors.data.totp?.[0];
      if (!totpFactor) {
        const dest = await resolveRedirect();
        window.location.href = dest;
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
        code: trimmed,
      });

      if (verify.error) {
        setError(
          userFacingError(
            verify.error,
            "That code did not work. Wait for a new one and try again.",
          ),
        );
        return;
      }

      onSuccess?.();
      const dest = await resolveRedirect();
      window.location.href = dest;
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await verifyTotp(verifyCode);
  }

  const logoSrc = "/brand/360-medical-logo.svg";

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
                Two-factor authentication
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

        <div style={{ padding: 28, minHeight: 200 }}>
          <p style={{ color: TEXT_DARK, fontSize: 16, lineHeight: 1.5, margin: "0 0 20px" }}>
            Type the 6-digit code from your phone.
          </p>

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontWeight: 900, color: TEXT_DARK, marginBottom: 10 }}>
                Verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                enterKeyHint="done"
                autoFocus
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                pattern="[0-9]*"
                value={verifyCode}
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setVerifyCode(next);
                  if (next.length === 6 && lastAutoSubmitted.current !== next) {
                    lastAutoSubmitted.current = next;
                    void verifyTotp(next);
                  }
                }}
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
              disabled={submitting || verifyCode.length !== 6}
              style={{
                marginTop: 8,
                padding: 16,
                borderRadius: 14,
                background: submitting || verifyCode.length !== 6 ? "rgba(30,136,229,0.50)" : BRAND_BLUE,
                color: "white",
                fontWeight: 950,
                fontSize: 16,
                border: "none",
                cursor: submitting || verifyCode.length !== 6 ? "not-allowed" : "pointer",
                boxShadow: submitting || verifyCode.length !== 6 ? "none" : "0 12px 30px rgba(30,136,229,0.35)",
              }}
            >
              {submitting ? "Verifying…" : "Verify"}
            </button>
          </form>
        </div>

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
