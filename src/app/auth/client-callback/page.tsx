"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

const BRAND_BLUE = "#1e88e5";
const TEXT_DARK = "#0f172a";
const TEXT_MUTED = "#64748b";

function parseHashTokens(hash: string): { access_token?: string; refresh_token?: string } {
  const h = (hash || "").startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(h);
  const access_token = params.get("access_token") || undefined;
  const refresh_token = params.get("refresh_token") || undefined;
  return { access_token, refresh_token };
}

function friendlyAuthMessage(raw: string) {
  const s = (raw || "").toLowerCase();

  if (s.includes("otp_expired") || s.includes("expired")) {
    return "This link has expired or was already used. Open the newest invite email and click Continue once — don’t use Forgot password for a new invite.";
  }
  if (s.includes("access_denied")) {
    return "Sign-in was denied. Open the newest invite email and click Continue once, or sign in normally if you already set a password.";
  }
  if (s.includes("invalid") && s.includes("link")) {
    return "This link is invalid or has expired. Ask your admin for a fresh invite, then click Continue on the confirmation page.";
  }

  return raw;
}

function AuthClientCallbackInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [msg, setMsg] = useState("Completing sign-in…");
  const [detail, setDetail] = useState<string | null>(null);

  const logoVideoSrc = "/brand/360-logo-loop.mp4";

  const next = useMemo(() => {
    const n = sp.get("next") || "/portal";
    // Safety: only allow relative internal redirects
    return n.startsWith("/") ? n : "/portal";
  }, [sp]);

  const inviteId = useMemo(() => {
    const direct = sp.get("invite");
    if (direct) return direct;
    const n = sp.get("next") || "";
    if (!n.startsWith("/set-password")) return "";
    try {
      const u = new URL(n, "http://x");
      return u.searchParams.get("invite") || "";
    } catch {
      return "";
    }
  }, [sp]);

  const backUrl = useMemo(() => {
    return inviteId
      ? `/set-password?invite=${encodeURIComponent(inviteId)}&next=${encodeURIComponent(next)}`
      : next;
  }, [inviteId, next]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const supabase = supabaseBrowser();

        // 0) Provider may return errors in query or hash
        const qpError = sp.get("error") || "";
        const qpDesc = sp.get("error_description") || "";
        const qpCode = sp.get("error_code") || "";

        if (qpError || qpDesc || qpCode) {
          const combined = [qpError, qpCode, qpDesc].filter(Boolean).join(" • ");
          setMsg("We couldn’t complete sign-in.");
          setDetail(friendlyAuthMessage(combined));
          return;
        }

        // 1) PKCE flow: /auth/client-callback?code=XXXX
        const code = sp.get("code");
        if (code) {
          setMsg("Finishing secure sign-in…");

          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;

          if (error) {
            setMsg("We couldn’t complete sign-in.");
            setDetail(friendlyAuthMessage(error.message));
            return;
          }

          setMsg("Signed in. Redirecting…");
          router.replace(next);
          return;
        }

        // 2) Hash token flow: /auth/client-callback#access_token=...&refresh_token=...
        if (typeof window !== "undefined" && window.location.hash) {
          const { access_token, refresh_token } = parseHashTokens(window.location.hash);

          if (access_token && refresh_token) {
            setMsg("Finalizing sign-in…");

            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (cancelled) return;

            if (error) {
              setMsg("We couldn’t complete sign-in.");
              setDetail(friendlyAuthMessage(error.message));
              return;
            }

            // Clean the hash so it doesn't linger in the URL
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

            setMsg("Signed in. Redirecting…");
            router.replace(next);
            return;
          }
        }

        // 3) Fallback: already signed in?
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;

        if (data?.session) {
          setMsg("Signed in. Redirecting…");
          router.replace(next);
          return;
        }

        // 4) No session found -> help the user
        setMsg("No active session found.");
        if (inviteId) {
          setDetail(
            "If you opened this from an invite email, the link may have been used already (some email apps prefetch links). Try the most recent invite link in your email, or use a different browser. You can also sign in normally if you already have a password."
          );
        } else {
          setDetail("Please sign in again.");
        }
      } catch (e: unknown) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setMsg("Auth callback failed.");
        setDetail(message);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, sp, next, inviteId]);

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
        {/* HEADER */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
            <div
              style={{
                width: 180,
                height: 92,
                borderRadius: 20,
                overflow: "hidden",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
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
                  width: "100%",
                  height: "100%",
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
                Completing sign-in
              </h1>

              <div style={{ marginTop: 10, width: 72, height: 3, borderRadius: 999, background: BRAND_BLUE }} />
            </div>
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
            Streamlining insurance verification
            <br />
            and order management
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: 28 }}>
          <p style={{ color: TEXT_DARK, fontSize: 16, lineHeight: 1.6, margin: 0, fontWeight: 800 }}>{msg}</p>

          {detail ? (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 14,
                background: "rgba(2,6,23,0.03)",
                border: "1px solid rgba(2,6,23,0.10)",
                color: TEXT_MUTED,
                fontSize: 14,
                lineHeight: 1.55,
                fontWeight: 700,
              }}
            >
              {detail}
            </div>
          ) : (
            <div
              style={{
                marginTop: 14,
                height: 10,
                borderRadius: 999,
                background: "rgba(2,6,23,0.10)",
                overflow: "hidden",
              }}
              aria-hidden
            >
              <div
                style={{
                  height: "100%",
                  width: "45%",
                  background: BRAND_BLUE,
                  borderRadius: 999,
                  animation: "progress 1.1s ease-in-out infinite",
                }}
              />
            </div>
          )}

          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href={`/login?next=${encodeURIComponent(backUrl)}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(30,136,229,0.45)",
                background: BRAND_BLUE,
                color: "white",
                fontWeight: 950,
                textDecoration: "none",
                boxShadow: "0 12px 30px rgba(30,136,229,0.25)",
              }}
            >
              Go to login
            </a>

            {inviteId ? (
              <a
                href={backUrl}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(2,6,23,0.18)",
                  background: "white",
                  color: TEXT_DARK,
                  fontWeight: 950,
                  textDecoration: "none",
                }}
              >
                Back to set password
              </a>
            ) : null}
          </div>

          <style>{`
            @keyframes progress {
              0% { transform: translateX(-20%); }
              50% { transform: translateX(60%); }
              100% { transform: translateX(140%); }
            }
          `}</style>
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: "14px 24px",
            background: "#f8fafc",
            borderTop: "1px solid #e5e7eb",
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

export default function AuthClientCallbackPage() {
  // Suspense wrapper prevents build-time/prerender failures around useSearchParams().
  return (
    <Suspense
      fallback={
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
              padding: 28,
            }}
          >
            <div style={{ color: TEXT_DARK, fontSize: 16, lineHeight: 1.6, margin: 0, fontWeight: 800 }}>
              Completing sign-in…
            </div>
          </div>
        </main>
      }
    >
      <AuthClientCallbackInner />
    </Suspense>
  );
}
