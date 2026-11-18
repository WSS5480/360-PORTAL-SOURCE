import Link from "next/link";
import { formatStatusLabel } from "@/lib/formatStatusLabel";
import { getPortalContext } from "@/lib/portal/getPortalContext";
import { applyPortalIvrScope, applyPortalOrdersScope } from "@/lib/portal/portalRowScope";
import { redirectSalesRepOnlyFromCustomerPortal } from "@/lib/portal/redirectSalesRepOnlyFromCustomerPortal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type IvrRow = {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  status: string | null;
  patient_first_name: string | null;
  patient_last_name: string | null;
  patient_dob: string | null;
  primary_insurance: string | null;
  qcode: string | null;

  additional_info_requested_at: string | null;
  additional_info_message: string | null;
  additional_info_submitted_at: string | null;
  additional_info_response: string | null;
};

type OrderRow = {
  id: string;
  created_at: string | null;
  placed_at: string | null;
  status: string | null;
  order_number: string | null;
  total: number | null;
};

function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleString();
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function shortId(id?: string | null) {
  const s = safeStr(id).trim();
  if (!s) return "—";
  return s.length > 10 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

function fmtMoney(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  return Number(v).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function pillStyle(variant: "open" | "done" | "neutral" | "needs"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    fontWeight: 900,
    padding: "6px 10px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    whiteSpace: "nowrap",
  };

  if (variant === "needs") {
    return {
      ...base,
      borderColor: "color-mix(in srgb, var(--danger) 28%, var(--border))",
      background: "color-mix(in srgb, var(--danger) 14%, white)",
      color: "color-mix(in srgb, var(--danger) 78%, black)",
    };
  }

  if (variant === "open") {
    return {
      ...base,
      borderColor: "color-mix(in srgb, var(--brand-600) 22%, var(--border))",
      background: "var(--brand-050)",
      color: "var(--brand-800)",
    };
  }

  if (variant === "done") {
    return {
      ...base,
      borderColor: "color-mix(in srgb, var(--success) 28%, var(--border))",
      background: "color-mix(in srgb, var(--success) 14%, white)",
      color: "color-mix(in srgb, var(--success) 75%, black)",
    };
  }

  return {
    ...base,
    borderColor: "var(--border)",
    background: "var(--surface)",
    color: "var(--foreground)",
  };
}

function statusVariant(status: string) {
  const s = (status || "").toUpperCase();
  if (["NEW", "IN_REVIEW", "SUBMITTED", "NEEDS_INFO", "PENDING"].includes(s)) return "open" as const;
  if (["COMPLETED", "DONE", "APPROVED", "CLOSED"].includes(s)) return "done" as const;
  return "neutral" as const;
}

function orderStatusVariant(status: string) {
  const s = (status || "").toUpperCase();
  if (["DRAFT", "SENT", "CONFIRMED", "FULFILLING", "LOCKED"].includes(s)) return "open" as const;
  if (["COMPLETED"].includes(s)) return "done" as const;
  if (["CANCELLED"].includes(s)) return "neutral" as const;
  return "neutral" as const;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/g).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return (a + b).toUpperCase() || "—";
}

export default async function PortalHome() {
  const ctx: any = await getPortalContext();
  await redirectSalesRepOnlyFromCustomerPortal(ctx?.user, "/portal");

  // If user has no memberships, show a clean “not linked” message
  if (!ctx?.memberships?.length) {
    return (
      <div style={styles.page}>
        <div style={styles.hero}>
          <div style={styles.heroTop}>
            <div>
              <div style={styles.heroKicker}>360 Portal</div>
              <h1 style={styles.heroTitle}>Portal Access</h1>
              <p style={styles.heroSub}>Your user account is not linked to a customer account yet.</p>
            </div>
          </div>
        </div>

        <div style={styles.notice}>
          <div style={styles.noticeTop}>
            <span style={styles.noticeDot} aria-hidden />
            <div style={styles.noticeTitle}>Action required</div>
          </div>

          <div style={styles.noticeBody}>Ask your 360 Medical contact to send an invite for your organization.</div>

          <div style={styles.noticeHint}>If you believe this is an error, contact your 360 Medical representative.</div>

          <div style={{ marginTop: 14 }}>
            <Link href="/login" style={{ ...styles.primaryBtn, textDecoration: "none" }}>
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentAccountId: string =
    safeStr(ctx.currentAccountId) ||
    safeStr(ctx.current_account_id) ||
    safeStr(ctx.accountId) ||
    safeStr(ctx.current?.account_id) ||
    "";

  let currentAccountName: string = safeStr(ctx.currentAccountName) || safeStr(ctx.current_account_name) || "";

  // Pull dashboard data (scoped: non–account-admins see only their own orders/IVRs)
  const supabase = await createSupabaseServerClient();
  const portalUserId = safeStr((ctx as any)?.user?.id);
  const portalRole = (ctx as any)?.currentRole ?? null;

  if (currentAccountId && !currentAccountName) {
    const acctRes = await supabase.from("accounts").select("id,name").eq("id", currentAccountId).maybeSingle();
    if (!acctRes.error && (acctRes.data as any)?.name) currentAccountName = safeStr((acctRes.data as any).name);
  }

  // Recent IVR requests (includes additional-info columns so we can show alerts)
  let ivrRes: any = { data: [], error: null };
  if (currentAccountId && portalUserId) {
    let ivrQ = supabaseAdmin
      .from("ivr_requests")
      .select(
        [
          "id",
          "created_at",
          "updated_at",
          "status",
          "patient_first_name",
          "patient_last_name",
          "patient_dob",
          "primary_insurance",
          "qcode",
          "additional_info_requested_at",
          "additional_info_message",
          "additional_info_submitted_at",
          "additional_info_response",
        ].join(",")
      )
      .eq("account_id", currentAccountId);
    ivrQ = applyPortalIvrScope(ivrQ, portalUserId, portalRole);
    ivrRes = await ivrQ.order("created_at", { ascending: false }).limit(5);
  }

  const recentIvrs: IvrRow[] = Array.isArray((ivrRes as any).data) ? ((ivrRes as any).data as IvrRow[]) : [];

  // IVR counts
  let ivrCount: number | null = null;
  if (currentAccountId && portalUserId) {
    let ivrCountQ = supabaseAdmin
      .from("ivr_requests")
      .select("id", { count: "exact", head: true })
      .eq("account_id", currentAccountId);
    ivrCountQ = applyPortalIvrScope(ivrCountQ, portalUserId, portalRole);
    const ivrCountRes = await ivrCountQ;
    ivrCount = typeof (ivrCountRes as any)?.count === "number" ? (ivrCountRes as any).count : null;
  }

  // Derived IVR counts
  const openIvrCount = recentIvrs.filter((r) => statusVariant(safeStr(r.status)) === "open").length;
  const needsInfoIvrs = recentIvrs.filter((r) => Boolean(r.additional_info_requested_at) && !r.additional_info_submitted_at);
  const doneIvrCount = recentIvrs.filter((r) => statusVariant(safeStr(r.status)) === "done").length;

  const primaryNeedsInfo =
    needsInfoIvrs
      .slice()
      .sort((a, b) => {
        const at = a.additional_info_requested_at ? new Date(a.additional_info_requested_at).getTime() : 0;
        const bt = b.additional_info_requested_at ? new Date(b.additional_info_requested_at).getTime() : 0;
        return bt - at;
      })[0] || null;

  // Recent Orders
  let ordersRes: any = { data: [], error: null };
  if (currentAccountId && portalUserId) {
    let ordQ = supabaseAdmin
      .from("orders")
      .select("id,created_at,placed_at,status,order_number,total")
      .eq("account_id", currentAccountId);
    const scopedOrders = await applyPortalOrdersScope(supabaseAdmin, ordQ, currentAccountId, portalUserId, portalRole);
    ordersRes = await scopedOrders.query.order("created_at", { ascending: false }).limit(5);
  }

  const recentOrders: OrderRow[] = Array.isArray((ordersRes as any).data) ? ((ordersRes as any).data as OrderRow[]) : [];

  // Order count
  let orderCount: number | null = null;
  if (currentAccountId && portalUserId) {
    let ordCountQ = supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("account_id", currentAccountId);
    const scopedOrdCount = await applyPortalOrdersScope(
      supabaseAdmin,
      ordCountQ,
      currentAccountId,
      portalUserId,
      portalRole
    );
    const orderCountRes = await scopedOrdCount.query;
    orderCount = typeof (orderCountRes as any)?.count === "number" ? (orderCountRes as any).count : null;
  }

  const openOrdersCount = recentOrders.filter((o) => orderStatusVariant(safeStr(o.status)) === "open").length;
  const doneOrdersCount = recentOrders.filter((o) => orderStatusVariant(safeStr(o.status)) === "done").length;

  const acctInitials = initials(currentAccountName || "Account");

  return (
    <div style={styles.page}>
      {/* Hero header */}
      <div style={styles.hero}>
        <div style={styles.heroTop}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.heroKicker}>360 Portal</div>
            <h1 style={styles.heroTitle}>Dashboard</h1>
            <p style={styles.heroSub}>
              Account: <span style={styles.accountName}>{currentAccountName || "—"}</span>
            </p>
          </div>

          <div style={styles.heroRight}>
            <div style={styles.avatar} aria-hidden>
              {acctInitials}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <Link href="/portal/orders/new" style={{ ...styles.ghostBtn, textDecoration: "none" }}>
                + Submit Order
              </Link>
              <Link href="/portal/ivr/new" style={{ ...styles.primaryBtn, textDecoration: "none" }}>
                + New IVR Request
              </Link>
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="portal-hero-stats" style={styles.heroStatsRow}>
          <div style={styles.heroStat}>
            <div style={styles.heroStatLabel}>IVR Open</div>
            <div style={styles.heroStatValue}>{openIvrCount}</div>
          </div>

          <div style={styles.heroStat}>
            <div style={styles.heroStatLabel}>IVR Needs info</div>
            <div style={styles.heroStatValue}>{needsInfoIvrs.length}</div>
          </div>

          <div style={styles.heroStat}>
            <div style={styles.heroStatLabel}>Orders Open</div>
            <div style={styles.heroStatValue}>{openOrdersCount}</div>
          </div>

          <div style={styles.heroStat}>
            <div style={styles.heroStatLabel}>Orders Completed</div>
            <div style={styles.heroStatValue}>{doneOrdersCount}</div>
          </div>
        </div>
      </div>

      {/* Needs info banner (high priority) */}
      {primaryNeedsInfo ? (
        <div style={styles.needsInfoCard}>
          <div style={styles.needsInfoTop}>
            <div style={{ minWidth: 0 }}>
              <div style={styles.needsInfoTitle}>Additional information requested</div>
              <div style={styles.needsInfoMeta}>
                Requested: <b>{fmtDateTime(primaryNeedsInfo.additional_info_requested_at)}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {needsInfoIvrs.length > 1 ? (
                <span style={styles.needsInfoCountPill}>{needsInfoIvrs.length} requests need info</span>
              ) : null}

              <Link
                href={`/portal/ivr/${encodeURIComponent(safeStr(primaryNeedsInfo.id))}`}
                style={{ ...styles.primaryBtn, textDecoration: "none" }}
              >
                Respond now →
              </Link>
            </div>
          </div>

          <div style={styles.needsInfoBody}>
            <div style={styles.needsInfoLabel}>Message</div>
            <div style={styles.needsInfoMessage}>
              {safeStr(primaryNeedsInfo.additional_info_message) ? (
                safeStr(primaryNeedsInfo.additional_info_message)
              ) : (
                <span style={{ opacity: 0.75 }}>—</span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Summary cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Current Account</div>
          <div style={styles.statValue}>{currentAccountName || "—"}</div>
          <div style={styles.statMeta}>Your active customer account for this session</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>IVR Requests</div>
          <div style={styles.statValue}>{ivrCount === null ? "—" : ivrCount.toLocaleString()}</div>
          <div style={styles.statMeta}>
            {recentIvrs.length ? `${openIvrCount} open in your latest ${recentIvrs.length}` : "Recent submissions and updates"}
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Orders</div>
          <div style={styles.statValue}>{orderCount === null ? "—" : orderCount.toLocaleString()}</div>
          <div style={styles.statMeta}>
            {recentOrders.length ? `${openOrdersCount} open in your latest ${recentOrders.length}` : "Place new orders and track status"}
          </div>
        </div>
      </div>

      {/* Recent IVR table */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Recent IVR Requests</h2>
          <Link href="/portal/ivr" style={styles.sectionLink}>
            View all →
          </Link>
        </div>

        <div className="portal-table-wrap" style={styles.tableWrap}>
          {(ivrRes as any).error ? (
            <div style={styles.tableError}>
              <div style={{ fontWeight: 900 }}>Could not load IVR requests</div>
              <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
                {String((ivrRes as any).error?.message || (ivrRes as any).error)}
              </div>
            </div>
          ) : recentIvrs.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontWeight: 900, fontSize: 15 }}>No IVR requests yet</div>
              <div style={{ marginTop: 6, opacity: 0.8 }}>Submit your first request and we’ll track updates here.</div>
              <div style={{ marginTop: 12 }}>
                <Link href="/portal/ivr/new" style={{ ...styles.primaryBtn, textDecoration: "none" }}>
                  + Create IVR Request
                </Link>
              </div>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Patient</th>
                  <th style={styles.th}>Insurance</th>
                  <th style={styles.th}>Q Code</th>
                  <th style={styles.th}>Submitted</th>
                  <th style={styles.thRight}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentIvrs.map((r) => {
                  const id = safeStr(r.id);
                  const status = safeStr(r.status) || "—";
                  const patient = `${safeStr(r.patient_first_name)} ${safeStr(r.patient_last_name)}`.trim() || "—";
                  const insurance = safeStr(r.primary_insurance) || "—";
                  const qcode = safeStr(r.qcode) || "—";
                  const created = fmtDateTime(r.created_at);

                  const rowNeedsInfo = Boolean(r.additional_info_requested_at) && !r.additional_info_submitted_at;

                  return (
                    <tr key={id}>
                      <td style={styles.td}>
                        <span style={pillStyle(rowNeedsInfo ? "needs" : statusVariant(status))}>{status}</span>
                        {rowNeedsInfo ? <div style={styles.rowNeedsInfo}>Needs info</div> : null}
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 900 }}>{patient}</div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>DOB: {r.patient_dob ? safeStr(r.patient_dob) : "—"}</div>
                      </td>
                      <td style={styles.td}>{insurance}</td>
                      <td style={styles.td}>{qcode}</td>
                      <td style={styles.td}>{created}</td>
                      <td style={styles.tdRight}>
                        <Link href={`/portal/ivr/${encodeURIComponent(id)}`} style={styles.rowLink}>
                          Open →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent Orders table */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Recent Orders</h2>
          <Link href="/portal/orders" style={styles.sectionLink}>
            View all →
          </Link>
        </div>

        <div className="portal-table-wrap" style={styles.tableWrap}>
          {(ordersRes as any).error ? (
            <div style={styles.tableError}>
              <div style={{ fontWeight: 900 }}>Could not load orders</div>
              <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
                {String((ordersRes as any).error?.message || (ordersRes as any).error)}
              </div>
            </div>
          ) : recentOrders.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontWeight: 900, fontSize: 15 }}>No orders yet</div>
              <div style={{ marginTop: 6, opacity: 0.8 }}>Submit an order and we’ll show recent activity here.</div>
              <div style={{ marginTop: 12 }}>
                <Link href="/portal/orders/new" style={{ ...styles.primaryBtn, textDecoration: "none" }}>
                  + Submit Order
                </Link>
              </div>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Order #</th>
                  <th style={styles.th}>Total</th>
                  <th style={styles.th}>Submitted</th>
                  <th style={styles.thRight}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => {
                  const id = safeStr(o.id);
                  const status = safeStr(o.status) || "—";
                  const orderNum = safeStr(o.order_number) || "—";
                  const total = fmtMoney(o.total);

                  const submittedAt = o.placed_at ? fmtDateTime(o.placed_at) : fmtDateTime(o.created_at);
                  const href = `/portal/orders/${encodeURIComponent(id)}`;

                  return (
                    <tr key={id}>
                      <td style={styles.td}>
                        <span style={pillStyle(orderStatusVariant(status))}>{formatStatusLabel(status)}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 900 }}>{orderNum}</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>ID: {shortId(id)}</div>
                      </td>
                      <td style={styles.td}>{total}</td>
                      <td style={styles.td}>{submittedAt}</td>
                      <td style={styles.tdRight}>
                        <Link href={href} style={styles.rowLink}>
                          Open →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}

const baseBorder = {
  borderWidth: 1,
  borderStyle: "solid" as const,
  borderColor: "var(--border)",
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 22,
  },

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
  },

  heroRight: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontWeight: 950,
    color: "white",
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.18)",
  },

  heroStatsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
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

  heroStatLabel: {
    color: "rgba(255,255,255,0.72)",
    fontWeight: 900,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  heroStatValue: {
    color: "white",
    fontWeight: 950,
    fontSize: 20,
  },

  accountName: {
    fontWeight: 950,
    color: "white",
  },

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
  },

  notice: {
    ...baseBorder,
    background: "var(--surface)",
    borderRadius: 16,
    padding: 18,
    boxShadow: "var(--shadow-1)",
    maxWidth: 760,
  },

  noticeTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  noticeDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "var(--danger)",
  },

  noticeTitle: {
    fontSize: 14,
    fontWeight: 900,
  },

  noticeBody: {
    fontSize: 14,
    lineHeight: 1.45,
  },

  noticeHint: {
    marginTop: 10,
    fontSize: 13,
    color: "var(--muted)",
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
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },
  needsInfoTitle: {
    fontSize: 16,
    fontWeight: 950,
  },
  needsInfoMeta: {
    marginTop: 6,
    fontSize: 13,
    color: "var(--muted)",
  },
  needsInfoBody: {
    padding: 16,
  },
  needsInfoLabel: {
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.75,
    marginBottom: 6,
  },
  needsInfoMessage: {
    fontSize: 14,
    whiteSpace: "pre-wrap",
    lineHeight: 1.45,
  },
  needsInfoCountPill: {
    fontSize: 12,
    fontWeight: 950,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.86)",
    whiteSpace: "nowrap",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 18,
  },

  statCard: {
    ...baseBorder,
    background: "var(--surface)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "var(--shadow-1)",
  },

  statLabel: {
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "var(--muted)",
  },

  statValue: {
    fontSize: 18,
    fontWeight: 950,
    marginTop: 8,
    color: "var(--foreground)",
  },

  statMeta: {
    marginTop: 6,
    fontSize: 13,
    color: "var(--muted)",
    lineHeight: 1.35,
  },

  section: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  sectionHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 950,
    margin: 0,
  },

  sectionLink: {
    fontSize: 14,
    fontWeight: 950,
    color: "var(--brand-700)",
    textDecoration: "none",
  },

  tableWrap: {
    ...baseBorder,
    borderRadius: 16,
    overflow: "hidden",
    background: "var(--surface)",
    boxShadow: "var(--shadow-1)",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: 12,
    fontSize: 12,
    fontWeight: 950,
    background: "rgba(0,0,0,0.03)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    whiteSpace: "nowrap",
  },

  thRight: {
    textAlign: "right",
    padding: 12,
    fontSize: 12,
    fontWeight: 950,
    background: "rgba(0,0,0,0.03)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    whiteSpace: "nowrap",
  },

  td: {
    padding: 12,
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    fontSize: 13,
    verticalAlign: "top",
  },

  tdRight: {
    padding: 12,
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    fontSize: 13,
    verticalAlign: "top",
    textAlign: "right",
    whiteSpace: "nowrap",
  },

  rowLink: {
    fontWeight: 950,
    textDecoration: "none",
    color: "var(--brand-700)",
  },

  rowNeedsInfo: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: 950,
    color: "crimson",
  },

  tableError: {
    padding: 14,
  },

  emptyState: {
    padding: 18,
  },

  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 18,
  },

  actionCard: {
    ...baseBorder,
    background: "color-mix(in srgb, var(--surface) 86%, var(--background))",
    borderRadius: 18,
    padding: 18,
    textDecoration: "none",
    color: "var(--foreground)",
    boxShadow: "var(--shadow-1)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  actionTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  actionTitle: {
    fontSize: 16,
    fontWeight: 950,
  },

  actionText: {
    fontSize: 14,
    color: "var(--muted)",
    lineHeight: 1.4,
  },

  actionLinkRow: {
    marginTop: "auto",
    display: "flex",
    gap: 8,
    fontSize: 14,
    fontWeight: 950,
    color: "var(--brand-700)",
  },

  actionLink: {
    textDecoration: "none",
  },

  sectionHint: {
    fontSize: 13,
    color: "var(--muted)",
    fontWeight: 700,
  },

  toolkitGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 18,
  },

  toolkitCard: {
    ...baseBorder,
    background: "var(--surface)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "var(--shadow-1)",
    display: "grid",
    gap: 12,
  },

  toolkitTitle: {
    fontSize: 16,
    fontWeight: 950,
  },

  toolkitSub: {
    fontSize: 13,
    color: "var(--muted)",
  },

  toolkitField: {
    display: "grid",
    gap: 6,
  },

  toolkitLabel: {
    fontSize: 12,
    fontWeight: 900,
    color: "var(--foreground)",
  },

  toolkitValue: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    fontSize: 14,
    background: "var(--surface)",
    color: "var(--foreground)",
  },

  toolkitInput: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    fontSize: 14,
    background: "var(--surface)",
  },

  toolkitSelect: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    fontSize: 14,
    background: "var(--surface)",
  },

  toolkitUpload: {
    padding: 12,
    borderRadius: 12,
    border: "1px dashed var(--border)",
    background: "color-mix(in srgb, var(--surface) 92%, var(--background))",
  },

  toolkitUploadTitle: {
    fontWeight: 900,
    fontSize: 13,
  },

  toolkitMuted: {
    fontSize: 12,
    color: "var(--muted)",
  },

  toolkitTimeline: {
    display: "grid",
    gap: 10,
  },

  toolkitItem: {
    display: "grid",
    gridTemplateColumns: "16px 1fr",
    gap: 12,
    alignItems: "start",
  },

  toolkitDot: {
    width: 10,
    height: 10,
    marginTop: 4,
    borderRadius: 999,
    background: "var(--border)",
  },

  toolkitDotActive: {
    background: "var(--brand-600)",
  },

  toolkitItemTitle: {
    fontWeight: 900,
    fontSize: 13,
  },

  pill: {
    fontSize: 12,
    fontWeight: 950,
    padding: "6px 10px",
    borderRadius: 999,
    ...baseBorder,
    background: "var(--surface)",
  },

  pillSoft: {
    fontSize: 12,
    fontWeight: 950,
    padding: "6px 10px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--brand-600) 22%, var(--border))",
    background: "var(--brand-050)",
    color: "var(--brand-700)",
  },
};
