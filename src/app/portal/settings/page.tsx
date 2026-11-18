import Link from "next/link";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAccountAdmin, canViewOrders } from "@/lib/portal/portalRoles";
import MfaSettingsClient from "./MfaSettingsClient";
import AccountFeaturesClient from "./AccountFeaturesClient";
import PaymentMethodsClient from "./PaymentMethodsClient";

export const dynamic = "force-dynamic";

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
  heroKicker: { color: "rgba(255,255,255,0.70)", fontWeight: 900, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase" },
  heroTitle: { fontSize: 28, fontWeight: 950, margin: "6px 0 0", letterSpacing: -0.3, color: "white" },
  heroSub: { marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.78)", lineHeight: 1.45 },
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
    textDecoration: "none",
  },
  section: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: 18,
    padding: 18,
    background: "var(--surface)",
    boxShadow: "var(--shadow-1)",
  },
  sectionTitle: { fontSize: 18, fontWeight: 950, margin: "0 0 8px" },
  sectionMeta: { fontSize: 13, color: "var(--muted)", lineHeight: 1.45 },
};

export default async function PortalSettingsPage() {
  const ctx = await requireCurrentAccount();

  if (!ctx.currentAccountId) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>No account selected.</div>
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>Please select an account to continue.</div>
      </div>
    );
  }

  const admin = isAccountAdmin(ctx.currentRole);
  const canManagePayments = admin;
  const showPaymentMethods = canViewOrders(ctx.currentRole);
  let initialBulk = false;
  let initialVw = false;
  if (admin) {
    const { data: pr } = await supabaseAdmin
      .from("account_pricing")
      .select("bulk_enabled, virtual_warehouse_enabled")
      .eq("account_id", ctx.currentAccountId)
      .maybeSingle();
    initialBulk = !!(pr as any)?.bulk_enabled;
    initialVw = !!(pr as any)?.virtual_warehouse_enabled;
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroTop}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.heroKicker}>360 Portal</div>
            <h1 style={styles.heroTitle}>Settings</h1>
            <p style={styles.heroSub}>Manage your account and security preferences.</p>
          </div>
          <Link href="/portal" style={styles.ghostBtn}>
            ← Dashboard
          </Link>
        </div>
      </div>

      {admin ? (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Account features</h2>
          <p style={styles.sectionMeta}>
            Control bulk ordering and virtual warehouse for <b>{ctx.currentAccountName ?? "this account"}</b>.{" "}
            <Link href="/portal/account/users" style={{ fontWeight: 950, color: "var(--brand-700)" }}>
              View account users
            </Link>
          </p>
          <AccountFeaturesClient initialBulk={initialBulk} initialVw={initialVw} />
        </div>
      ) : null}

      {showPaymentMethods ? (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Payment methods</h2>
          <p style={styles.sectionMeta}>
            Save a card on file for faster invoice payments. Cards are stored securely with Stripe.
          </p>
          <PaymentMethodsClient canManage={canManagePayments} />
        </div>
      ) : null}

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Two-factor authentication</h2>
        <p style={styles.sectionMeta}>
          Add an extra layer of security by requiring a code from your authenticator app when signing in.
        </p>
        <MfaSettingsClient />
      </div>
    </div>
  );
}
