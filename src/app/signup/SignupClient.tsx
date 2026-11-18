"use client";

import { useMemo } from "react";

const BRAND_BLUE = "#1e88e5";
const TEXT_DARK = "#0f172a";
const TEXT_MUTED = "#64748b";

export default function SignupClient({ nextUrl }: { nextUrl: string }) {
  const logoVideoSrc = "/brand/360-logo-loop.mp4";

  const loginHref = useMemo(() => `/login?next=${encodeURIComponent(nextUrl)}`, [nextUrl]);

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
                Invite-only
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
          <p style={{ color: TEXT_DARK, fontSize: 16, lineHeight: 1.6, margin: 0 }}>
            Accounts are created by invitation only.
          </p>

          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 14,
              background: "#f8fafc",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "#e5e7eb",
              color: TEXT_MUTED,
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            If you believe you should have access, please contact your 360 Medical representative or the person who invited
            you.
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <a
              href={loginHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px 16px",
                borderRadius: 14,
                background: BRAND_BLUE,
                color: "white",
                fontWeight: 950,
                fontSize: 15,
                textDecoration: "none",
                boxShadow: "0 12px 30px rgba(30,136,229,0.35)",
              }}
            >
              Go to sign in
            </a>

            <a
              href="/invite/accept"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px 16px",
                borderRadius: 14,
                background: "white",
                color: TEXT_DARK,
                fontWeight: 950,
                fontSize: 15,
                textDecoration: "none",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "#e5e7eb",
              }}
            >
              Have an invite link?
            </a>
          </div>

          <div style={{ marginTop: 16, fontSize: 13, color: TEXT_MUTED }}>
            Need to reset your password? Use{" "}
            <a href={loginHref} style={{ color: BRAND_BLUE, fontWeight: 900 }}>
              Sign in
            </a>{" "}
            then click <span style={{ fontWeight: 900, color: TEXT_DARK }}>Forgot password</span>.
          </div>
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
