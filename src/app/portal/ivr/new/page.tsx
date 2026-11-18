import Link from "next/link";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { canSubmitIvr } from "@/lib/portal/portalRoles";
import NewIVRClient from "./NewIVRClient";

export const dynamic = "force-dynamic";

export default async function NewIVRPage() {
  const ctx = await requireCurrentAccount();

  if (!ctx.currentAccountId) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>No account selected.</div>
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>Please select an account to continue.</div>
      </div>
    );
  }

  if (!canSubmitIvr(ctx.currentRole)) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>Forbidden</div>
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
          Your role does not have permission to submit IVR requests for this account.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroTop}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.heroKicker}>360 Portal</div>
            <h1 style={styles.heroTitle}>Submit IVR Request</h1>
            <p style={styles.heroSub}>
              Submit a new insurance verification request for{" "}
              <span style={styles.heroAccountName}>{ctx.currentAccountName ?? "your account"}</span>. Upload a completed PDF or fill out the form.
            </p>
          </div>

          <div style={styles.heroRight}>
            <Link href="/portal/ivr" style={{ ...styles.ghostBtn, textDecoration: "none" }}>
              ← IVR Requests
            </Link>
            <Link href="/portal/provider-profiles" style={{ ...styles.ghostBtn, textDecoration: "none" }}>
              Provider Profiles
            </Link>
          </div>
        </div>
      </div>

      <NewIVRClient />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: 22 },

  hero: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--brand-600) 16%, var(--border))",
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
    maxWidth: 860,
  },

  heroAccountName: { fontWeight: 950, color: "white" },

  heroRight: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  ghostBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 950,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
  },
};
