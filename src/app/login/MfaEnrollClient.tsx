"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { groupedTotpSecret, totpQrImageSrc } from "@/lib/auth/mfaLoginStep";
import { userFacingError } from "@/lib/errors/userFacingError";

const BRAND_BLUE = "#1e88e5";
const TEXT_DARK = "#0f172a";
const TEXT_MUTED = "#64748b";

export default function MfaEnrollClient({
  onEnrolled,
  onCancelled,
  required = false,
}: {
  onEnrolled: () => void;
  onCancelled: () => void;
  /** When true, hide the Skip button so MFA enrollment is mandatory */
  required?: boolean;
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [otpUri, setOtpUri] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showOtherWay, setShowOtherWay] = useState(false);
  const lastAutoSubmitted = useRef("");

  const startEnrollment = useCallback(async () => {
    // Clear stuck unverified TOTP factors (same friendly name blocks re-enroll).
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const unverified = (existing?.all ?? []).filter(
      (f) => f.factor_type === "totp" && f.status === "unverified",
    );
    for (const f of unverified) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }

    const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "360 Portal",
    });
    if (enrollErr) throw new Error(enrollErr.message);
    if (!data) throw new Error("Failed to start enrollment");
    return data;
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await startEnrollment();
        if (cancelled) return;
        setFactorId(data.id);
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setOtpUri(data.totp.uri || "");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to start enrollment");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [startEnrollment]);

  const onEnable = useCallback(async (code = verifyCode) => {
    const trimmed = code.trim();
    if (!factorId || trimmed.length !== 6) return;

    setError("");
    setSubmitting(true);

    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) {
        setError(challenge.error.message);
        return;
      }

      const verify = await supabase.auth.mfa.verify({
        factorId,
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

      onEnrolled();
    } finally {
      setSubmitting(false);
    }
  }, [factorId, verifyCode, supabase, onEnrolled]);

  if (loading) {
    return (
      <div style={{ padding: 28, textAlign: "center", color: TEXT_MUTED }}>
        Preparing authenticator setup…
      </div>
    );
  }

  if (error && !qrCode) {
    const retry = () => {
      setError("");
      setLoading(true);
      setFactorId("");
      setQrCode("");
      setSecret("");
      setOtpUri("");
      (async () => {
        try {
          const d = await startEnrollment();
          setFactorId(d.id);
          setQrCode(d.totp.qr_code);
          setSecret(d.totp.secret);
          setOtpUri(d.totp.uri || "");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to start enrollment");
        } finally {
          setLoading(false);
        }
      })();
    };

    return (
      <div style={{ padding: 28 }}>
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
            marginBottom: 16,
          }}
        >
          {userFacingError(error, "We could not start authenticator setup.")}
        </div>
        <div
          style={{
            fontSize: 13,
            color: TEXT_MUTED,
            marginBottom: 16,
            lineHeight: 1.5,
          }}
        >
          <p style={{ margin: 0 }}>
            Try again in a moment. If setup keeps failing, contact your 360 Medical administrator so they can reset
            two-factor authentication on your account.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={retry}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: BRAND_BLUE,
              background: BRAND_BLUE,
              color: "white",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 14,
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onCancelled}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "#cbd5e1",
              background: "white",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 14,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 28, display: "grid", gap: 16 }}>
      <p style={{ color: TEXT_DARK, fontSize: 16, lineHeight: 1.45, margin: 0 }}>
        1. Add 360 Portal to your phone, then 2. type the 6-digit code.
      </p>

      {otpUri ? (
        <a
          href={otpUri}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 48,
            padding: "12px 16px",
            borderRadius: 14,
            background: BRAND_BLUE,
            color: "white",
            fontWeight: 950,
            fontSize: 16,
            textDecoration: "none",
          }}
        >
          Add to my phone
        </a>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onEnable(verifyCode);
        }}
        style={{ display: "grid", gap: 12 }}
      >
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontWeight: 900, color: TEXT_DARK }}>6-digit code</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            enterKeyHint="done"
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
                void onEnable(next);
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
              fontSize: 22,
              letterSpacing: 6,
              textAlign: "center",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </label>

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
            padding: 14,
            borderRadius: 12,
            background: verifyCode.length !== 6 || submitting ? "rgba(30,136,229,0.50)" : BRAND_BLUE,
            color: "white",
            fontWeight: 950,
            fontSize: 15,
            border: "none",
            cursor: verifyCode.length !== 6 || submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Checking…" : "Continue"}
        </button>
        {!required ? (
          <button
            type="button"
            onClick={onCancelled}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 14,
              color: TEXT_MUTED,
            }}
          >
            Skip and go to the portal
          </button>
        ) : null}
      </form>

      <button
        type="button"
        onClick={() => setShowOtherWay((v) => !v)}
        style={{
          border: "none",
          background: "none",
          color: TEXT_MUTED,
          fontWeight: 800,
          fontSize: 13,
          cursor: "pointer",
          textAlign: "left",
          padding: 0,
        }}
      >
        {showOtherWay ? "Hide other options" : "Using a computer?"}
      </button>

      {showOtherWay ? (
        <div style={{ display: "grid", gap: 12 }}>
          {qrCode ? (
            <div
              style={{
                padding: 16,
                background: "white",
                borderRadius: 12,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "#e5e7eb",
                justifySelf: "start",
              }}
            >
              <img
                src={totpQrImageSrc(qrCode)}
                alt="QR code"
                style={{ display: "block", width: 180, height: 180 }}
              />
            </div>
          ) : null}
          {secret ? (
            <div>
              <div style={{ fontWeight: 800, color: TEXT_DARK, marginBottom: 6, fontSize: 13 }}>Setup key</div>
              <code
                style={{
                  display: "block",
                  padding: 10,
                  background: "#f8fafc",
                  borderRadius: 8,
                  fontFamily: "monospace",
                  fontSize: 13,
                  wordBreak: "break-all",
                }}
              >
                {groupedTotpSecret(secret)}
              </code>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(secret.replace(/\s+/g, ""));
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1600);
                  } catch {
                    setCopied(false);
                  }
                }}
                style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  borderRadius: 10,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "#cbd5e1",
                  background: "white",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                  color: TEXT_DARK,
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
