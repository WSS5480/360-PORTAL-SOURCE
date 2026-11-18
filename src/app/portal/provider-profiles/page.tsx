import Link from "next/link";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { canViewIvr } from "@/lib/portal/portalRoles";
import ProviderProfilesClient, { type Profile } from "./ProviderProfilesClient";

export const dynamic = "force-dynamic";

export default async function ProviderProfilesPage() {
  const ctx = await requireCurrentAccount();

  if (!ctx.currentAccountId) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>No account selected.</div>
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>Please select an account to continue.</div>
      </div>
    );
  }

  if (!canViewIvr(ctx.currentRole)) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>Forbidden</div>
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
          Your role does not have permission to manage provider profiles for this account.
        </div>
      </div>
    );
  }

  const { data, error } = await supabaseAdmin
    .from("account_provider_profiles")
    .select("*")
    .eq("account_id", ctx.currentAccountId)
    .order("created_at", { ascending: false });

  if (error) return <pre style={{ color: "crimson" }}>{error.message}</pre>;

  const profiles: Profile[] = Array.isArray(data) ? (data as Profile[]) : [];
  const defaultCount = profiles.filter((p) => p.is_default).length;

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroTop}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.heroKicker}>360 Portal</div>
            <h1 style={styles.heroTitle}>Provider Profiles</h1>
            <p style={styles.heroSub}>
              Save requesting provider information once and reuse it for IVR submissions for{" "}
              <span style={styles.heroAccountName}>{ctx.currentAccountName ?? "your account"}</span>.
            </p>
          </div>

          <div style={styles.heroRight}>
            <Link href="/portal/ivr" style={{ ...styles.ghostBtn, textDecoration: "none" }}>
              IVR Requests
            </Link>
          </div>
        </div>

        <div className="portal-hero-stats" style={styles.heroStatsRow}>
          <Stat label="Total" value={profiles.length} />
          <Stat label="Default" value={defaultCount} />
        </div>
      </div>

      <ProviderProfilesClient initialProfiles={profiles} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.heroStat}>
      <div style={styles.heroStatLabel}>{label}</div>
      <div style={styles.heroStatValue}>{value}</div>
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

  heroStatsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 0,
    borderTop: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.03)",
    paddingRight: 10,
    boxSizing: "border-box",
  },

  heroStat: {
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
    borderRight: "1px solid rgba(255,255,255,0.10)",
  },

  heroStatLabel: {
    color: "rgba(255,255,255,0.72)",
    fontWeight: 900,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  heroStatValue: { color: "white", fontWeight: 950, fontSize: 20 },
};
