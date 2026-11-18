// src/app/portal/ivr/page.tsx
import Link from "next/link";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { supabaseAdmin } from "@/lib/supabase/admin";
import PortalIvrListClient from "./ui/PortalIvrListClient";
import { canViewIvr, canSubmitIvr } from "@/lib/portal/portalRoles";
import { applyPortalIvrScope } from "@/lib/portal/portalRowScope";

export const dynamic = "force-dynamic";

export type IVRRow = {
  id: string;
  status: string | null;

  // ✅ new identifier (e.g. first 3 of last + first 3 of first + DOB)
  ivr_identifier?: string | null;

  patient_last_name: string | null;
  patient_first_name: string | null;

  dos: string | null;
  created_at: string;

  provider_name?: string | null;
  provider_npi?: string | null;

  primary_insurance?: string | null;
  product?: string | null;
  place_of_service?: string | null;

  additional_info_requested_at?: string | null;
  additional_info_submitted_at?: string | null;

  submitted_by_user_id?: string | null;
  created_by_user_id?: string | null;

  // ✅ intake “submitted for”
  contact_id?: string | null;

  // derived display
  submitted_by_email?: string | null;
  submitted_by_name?: string | null;
};

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function statusKey(status: string | null | undefined): string {
  return safeStr(status).toUpperCase();
}

const baseBorder: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--border)",
};

async function enrichSubmitters(rows: IVRRow[]): Promise<IVRRow[]> {
  const userIds = new Set<string>();
  const contactIds = new Set<string>();

  for (const r of rows) {
    const cid = safeStr(r.contact_id);
    if (cid) contactIds.add(cid);

    const uid = safeStr(r.submitted_by_user_id) || safeStr(r.created_by_user_id);
    if (uid) userIds.add(uid);
  }

  // Load account_contacts
  const contactById = new Map<string, { name: string | null; email: string | null }>();
  if (contactIds.size) {
    const { data } = await supabaseAdmin.from("account_contacts").select("id, full_name, email").in("id", Array.from(contactIds));

    for (const c of data || []) {
      const id = safeStr((c as any).id);
      if (!id) continue;
      contactById.set(id, {
        name: safeStr((c as any).full_name) || null,
        email: safeStr((c as any).email) || null,
      });
    }
  }

  // Load auth users (email + metadata name)
  const idToUser = new Map<string, { email: string | null; name: string | null }>();
  const allUserIds = Array.from(userIds);
  const MAX_CONCURRENCY = 8;

  async function fetchOne(userId: string) {
    try {
      const res = await supabaseAdmin.auth.admin.getUserById(userId);
      const u: any = (res as any)?.data?.user || null;
      const email: string | null = safeStr(u?.email) || null;

      const meta = (u?.user_metadata || {}) as Record<string, unknown>;
      const name =
        safeStr((meta as any).full_name) ||
        safeStr((meta as any).name) ||
        safeStr((meta as any).display_name) ||
        null;

      idToUser.set(userId, { email, name });
    } catch {
      idToUser.set(userId, { email: null, name: null });
    }
  }

  let i = 0;
  while (i < allUserIds.length) {
    const batch = allUserIds.slice(i, i + MAX_CONCURRENCY);
    await Promise.all(batch.map(fetchOne));
    i += MAX_CONCURRENCY;
  }

  return rows.map((r) => {
    // ✅ Prefer contact_id (intake “saved recipient”)
    const cid = safeStr(r.contact_id);
    if (cid) {
      const c = contactById.get(cid);
      if (c) {
        return { ...r, submitted_by_name: c.name, submitted_by_email: c.email };
      }
    }

    // else prefer submitted_by_user_id (portal login)
    const uid = safeStr(r.submitted_by_user_id) || safeStr(r.created_by_user_id);
    if (!uid) return r;

    const u = idToUser.get(uid);
    if (!u) return r;

    return { ...r, submitted_by_email: u.email, submitted_by_name: u.name };
  });
}

export default async function PortalIVRPage() {
  const ctx = await requireCurrentAccount();

  if (!ctx.currentAccountId) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>No account selected.</div>
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>Please select an account to continue.</div>
      </div>
    );
  }

  // ✅ Portal permissions (customer roles)
  if (!canViewIvr(ctx.currentRole)) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>Forbidden</div>
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
          Your role does not have permission to view IVR requests for this account.
        </div>
      </div>
    );
  }

  const canSubmit = canSubmitIvr(ctx.currentRole);
  const portalUserId = String((ctx.user as any)?.id ?? "");

  let ivrQuery = supabaseAdmin
    .from("ivr_requests")
    .select(
      [
        "id",
        "ivr_identifier", // ✅ ADDED
        "status",
        "patient_last_name",
        "patient_first_name",
        "dos",
        "created_at",
        "provider_name",
        "provider_npi",
        "primary_insurance",
        "product",
        "place_of_service",
        "additional_info_requested_at",
        "additional_info_submitted_at",
        "submitted_by_user_id",
        "created_by_user_id",
        "contact_id",
      ].join(",")
    )
    .eq("account_id", ctx.currentAccountId);
  ivrQuery = applyPortalIvrScope(ivrQuery, portalUserId, ctx.currentRole);

  const { data, error } = await ivrQuery.order("created_at", { ascending: false }).limit(200);

  if (error) return <pre style={{ color: "crimson" }}>{error.message}</pre>;

  const rawRows: unknown = Array.isArray(data) ? data : [];
  const ivrsBase = rawRows as unknown as IVRRow[];

  const ivrs = await enrichSubmitters(ivrsBase);

  const needsInfo = ivrs.filter((r) => Boolean(r.additional_info_requested_at) && !r.additional_info_submitted_at);

  const counts = {
    total: ivrs.length,
    needsAction: needsInfo.length,
    new: ivrs.filter((r) => statusKey(r.status) === "NEW").length,
    inReview: ivrs.filter((r) => statusKey(r.status) === "IN_REVIEW").length,
    completed: ivrs.filter((r) => statusKey(r.status) === "COMPLETED").length,
  };

  const primaryNeedsInfo = needsInfo[0] || null;

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroTop}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.heroKicker}>360 Portal</div>
            <h1 style={styles.heroTitle}>IVR Requests</h1>
            <p style={styles.heroSub}>
              Track submissions, respond to requests for more info, and view updates for{" "}
              <span style={styles.heroAccountName}>{ctx.currentAccountName ?? "your account"}</span>.
            </p>
          </div>

          <div style={styles.heroRight}>
            <Link href="/portal/provider-profiles" style={{ ...styles.ghostBtn, textDecoration: "none" }}>
              Provider Profiles
            </Link>

            {canSubmit ? (
              <Link href="/portal/ivr/new" style={{ ...styles.primaryBtn, textDecoration: "none" }}>
                + Submit IVR
              </Link>
            ) : (
              <span style={{ ...styles.ghostBtn, cursor: "default", opacity: 0.7 }}>Submit disabled (view-only)</span>
            )}
          </div>
        </div>

        <div className="portal-hero-stats" style={styles.heroStatsRow}>
          <Stat label="Total" value={counts.total} />
          <Stat label="Needs action" value={counts.needsAction} tone="danger" />
          <Stat label="NEW" value={counts.new} />
          <Stat label="In review" value={counts.inReview} />
          <Stat label="Completed" value={counts.completed} />
        </div>
      </div>

      {primaryNeedsInfo ? (
        <div style={styles.needsInfoCard}>
          <div style={styles.needsInfoTop}>
            <div style={{ minWidth: 0 }}>
              <div style={styles.needsInfoTitle}>Action required</div>
              <div style={styles.needsInfoBodyText}>
                You have <b>{needsInfo.length}</b> request(s) that need additional information.
              </div>
              <div style={styles.needsInfoHint}>
                Open a request below and submit your response so our IVR team can continue processing.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {needsInfo.length > 1 ? <span style={styles.needsInfoCountPill}>{needsInfo.length} need info</span> : null}

              <Link
                href={`/portal/ivr/${encodeURIComponent(safeStr(primaryNeedsInfo.id))}`}
                style={{ ...styles.primaryBtn, textDecoration: "none" }}
              >
                Respond now →
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>All requests</h2>
          <div style={styles.sectionMeta}>
            Showing up to <b>200</b> most recent submissions.
          </div>
        </div>

        <PortalIvrListClient initialRows={ivrs} />
      </div>

      <div style={styles.disclaimer}>
        <b>Note:</b> This portal may display protected health information (PHI). Only submit information you are authorized
        to share. This portal content is informational and does not replace clinical or professional advice.
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  const labelStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.72)",
    fontWeight: 900,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  };

  const valueStyle: React.CSSProperties = {
    color: "white",
    fontWeight: 950,
    fontSize: 20,
  };

  const rightPill =
    tone === "danger"
      ? {
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 950,
          background: "rgba(255,255,255,0.10)",
          borderWidth: 1,
          borderStyle: "solid" as const,
          borderColor: "rgba(255,255,255,0.16)",
          color: "color-mix(in srgb, rgba(255,255,255,0.92) 80%, white)",
          whiteSpace: "nowrap" as const,
        }
      : null;

  return (
    <div style={styles.heroStat}>
      <div style={labelStyle}>{label}</div>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
        <div style={valueStyle}>{value}</div>
        {tone === "danger" ? <span style={rightPill as React.CSSProperties}>Priority</span> : null}
      </div>
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

  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.18)",
    background: "var(--brand-600)",
    color: "white",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
  },

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
  },

  heroStat: {
    padding: "14px 18px",
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
    borderRight: "1px solid rgba(255,255,255,0.10)",
  },

  needsInfoCard: {
    ...baseBorder,
    borderRadius: 18,
    overflow: "hidden",
    background: "color-mix(in srgb, var(--danger) 7%, var(--surface))",
    boxShadow: "var(--shadow-1)",
  },

  needsInfoTop: {
    padding: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  needsInfoTitle: { fontSize: 16, fontWeight: 950 },

  needsInfoBodyText: { marginTop: 6, fontSize: 13, opacity: 0.92, lineHeight: 1.35 },

  needsInfoHint: { marginTop: 8, fontSize: 12, color: "var(--muted)", lineHeight: 1.35 },

  needsInfoCountPill: {
    fontSize: 12,
    fontWeight: 950,
    padding: "6px 10px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.86)",
    whiteSpace: "nowrap",
  },

  section: { display: "flex", flexDirection: "column", gap: 14 },

  sectionHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  sectionTitle: { fontSize: 18, fontWeight: 950, margin: 0 },

  sectionMeta: { fontSize: 13, color: "var(--muted)" },

  disclaimer: { marginTop: 6, fontSize: 12, opacity: 0.75, lineHeight: 1.45 },
};
