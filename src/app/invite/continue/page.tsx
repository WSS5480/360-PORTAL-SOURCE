"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

const TEXT_DARK = "#0f172a";
const TEXT_MUTED = "#64748b";

function friendlyVerifyError(raw: string) {
  const s = (raw || "").toLowerCase();
  if (s.includes("otp_expired") || s.includes("expired") || s.includes("invalid")) {
    return "This invite link has expired or was already used. Ask your admin to send a fresh invite, then open the newest email and click Continue once.";
  }
  return raw || "Could not verify this invite link.";
}

function InviteContinueInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const token = useMemo(() => sp.get("token") || sp.get("token_hash") || "", [sp]);
  const type = useMemo(() => {
    const t = (sp.get("type") || "invite").toLowerCase();
    return t === "magiclink" ? "magiclink" : "invite";
  }, [sp]);
  const inviteId = useMemo(() => sp.get("invite") || "", [sp]);
  const next = useMemo(() => {
    const n = sp.get("next") || "/portal";
    return n.startsWith("/") ? n : "/portal";
  }, [sp]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setPasswordHref = useMemo(() => {
    const params = new URLSearchParams();
    if (inviteId) params.set("invite", inviteId);
    params.set("next", next);
    return `/set-password?${params.toString()}`;
  }, [inviteId, next]);

  async function onContinue() {
    if (busy) return;
    setError(null);

    if (!token) {
      setError("This invite link is missing its security token. Please use the button in your newest invite email.");
      return;
    }

    setBusy(true);
    try {
      // Only runs on explicit click — GET/prefetch of this page does not consume the OTP.
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as "invite" | "magiclink",
      });

      if (verifyErr) {
        setError(friendlyVerifyError(verifyErr.message));
        return;
      }

      router.replace(setPasswordHref);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong verifying your invite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
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
        style={{
          width: "100%",
          maxWidth: 480,
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
            color: "white",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 900 }}>360 Medical Portal</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Secure invite</div>
        </div>

        <div style={{ padding: 28 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 950, color: TEXT_DARK }}>
            Confirm your invite
          </h1>
          <p style={{ margin: "12px 0 0", color: TEXT_MUTED, fontSize: 15, lineHeight: 1.55 }}>
            For security, invite links don’t activate until you confirm below. This stops email
            scanners from using your link before you do.
          </p>

          {error ? (
            <div
              role="alert"
              style={{
                marginTop: 18,
                padding: 12,
                borderRadius: 14,
                background: "rgba(220, 38, 38, 0.10)",
                border: "1px solid rgba(220, 38, 38, 0.25)",
                color: "rgb(153, 27, 27)",
                fontWeight: 850,
                fontSize: 14,
                lineHeight: 1.45,
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={onContinue}
            disabled={busy || !token}
            style={{
              marginTop: 22,
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: 0,
              background: busy ? "#94a3b8" : "#0ea5a4",
              color: "white",
              fontWeight: 950,
              fontSize: 15,
              cursor: busy || !token ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Confirming…" : "Continue to set password"}
          </button>

          <p style={{ margin: "16px 0 0", fontSize: 12, color: TEXT_MUTED, lineHeight: 1.45 }}>
            Don’t use Forgot password from the sign-in page for a new invite — ask an admin to
            resend if this link fails.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function InviteContinuePage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20 }}>
          <p style={{ color: TEXT_MUTED, fontWeight: 700 }}>Loading invite…</p>
        </main>
      }
    >
      <InviteContinueInner />
    </Suspense>
  );
}
