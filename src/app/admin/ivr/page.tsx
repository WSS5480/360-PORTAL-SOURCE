// src/app/admin/ivr/page.tsx
import Link from "next/link";
import { requireIvrTeamOrAdmin } from "@/lib/auth/requireIvrTeamOrAdmin";
import AdminIvrQueueClient from "./ui/AdminIvrQueueClient";

export const dynamic = "force-dynamic";

const baseBorder: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--border)",
};

function rolePill(isAdmin: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 999,
    background: isAdmin ? "rgba(255,255,255,0.10)" : "rgba(30,136,229,0.22)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: isAdmin ? "rgba(255,255,255,0.18)" : "rgba(30,136,229,0.30)",
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
  };
}

function roleDot(_isAdmin: boolean): React.CSSProperties {
  return {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "rgba(255,255,255,0.85)",
  };
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 16, maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 },

  hero: {
    borderRadius: 22,
    overflow: "hidden",
    border: "1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border))",
    background:
      "radial-gradient(900px 240px at 20% 10%, color-mix(in srgb, var(--brand-600) 42%, transparent), transparent 60%)," +
      "linear-gradient(180deg, #061225, #050b16)",
    boxShadow: "var(--shadow-1)",
  },

  heroTop: {
    padding: 18,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },

  heroKicker: {
    color: "rgba(255,255,255,0.70)",
    fontWeight: 900,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: 950,
    margin: "6px 0 0",
    letterSpacing: -0.3,
    color: "white",
  },

  heroSub: {
    marginTop: 8,
    fontSize: 14,
    color: "rgba(255,255,255,0.78)",
    lineHeight: 1.45,
    maxWidth: 900,
  },

  heroRight: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },

  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "var(--brand-600)",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
    textDecoration: "none",
  },

  ghostBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 950,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
    textDecoration: "none",
  },

  bodyCard: {
    ...baseBorder,
    background: "var(--surface)",
    borderRadius: 18,
    boxShadow: "var(--shadow-1)",
    overflow: "hidden",
  },

  bodyTop: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "rgba(0,0,0,0.06)",
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  bodyTitle: { fontSize: 16, fontWeight: 950, margin: 0 },

  bodyHint: { fontSize: 13, color: "var(--muted)", fontWeight: 800 },

  bodyInner: { padding: 12 },
};

export default async function AdminIvrQueuePage() {
  const auth = await requireIvrTeamOrAdmin();

  if (!auth) {
    return (
      <main style={{ padding: 18, maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 950, margin: 0 }}>Access required</h1>
        <p style={{ marginTop: 10, opacity: 0.82, fontSize: 13, lineHeight: 1.45 }}>
          You don’t have permission to view the IVR queue.
        </p>
        <div style={{ marginTop: 12 }}>
          <Link href="/portal" style={{ fontWeight: 900 }}>
            ← Go to Portal
          </Link>
        </div>
      </main>
    );
  }

  const isAdmin = auth.kind === "ADMIN";

  return (
    <main style={styles.page}>
      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroTop}>
          <div style={{ minWidth: 260 }}>
            <div style={styles.heroKicker}>360 Admin</div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <h1 style={styles.heroTitle}>IVR Queue</h1>

              <span style={rolePill(isAdmin)}>
                <span aria-hidden style={roleDot(isAdmin)} />
                {isAdmin ? "Admin" : "IVR Team"}
              </span>
            </div>

            <p style={styles.heroSub}>
              Filter and sort requests to work the queue quickly. If “All” is selected, it will show everything.
            </p>
          </div>

          <div style={styles.heroRight}>
            {isAdmin ? (
              <>
                <Link href="/admin" style={styles.ghostBtn}>
                  ← Dashboard
                </Link>
                <Link href="/admin/ivr/intake" style={styles.primaryBtn}>
                  + New IVR (Admin)
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={styles.bodyCard}>
        <div style={styles.bodyTop}>
          <h2 style={styles.bodyTitle}>Queue</h2>
          <div style={styles.bodyHint}>Tip: tighten filters to avoid “All = everything”.</div>
        </div>

        <div style={styles.bodyInner}>
          <AdminIvrQueueClient />
        </div>
      </div>
    </main>
  );
}
