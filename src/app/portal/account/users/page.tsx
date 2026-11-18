import Link from "next/link";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isAccountAdmin } from "@/lib/portal/portalRoles";
import { loadAccountUserActivityCounts } from "@/lib/portal/accountUserActivityCounts";
import AccountUserVirtualWarehouseToggle from "./AccountUserVirtualWarehouseToggle";

export const dynamic = "force-dynamic";

function safeStr(v: unknown) {
  return typeof v === "string" ? v : "";
}

function safeEmail(v: unknown) {
  return safeStr(v).trim().toLowerCase();
}

async function loadAuthEmailsByUserIds(sb: any, userIds: string[]) {
  const emailById = new Map<string, string>();
  const getUserById = sb?.auth?.admin?.getUserById;
  if (typeof getUserById !== "function") return emailById;
  for (const id of userIds) {
    try {
      const res = await sb.auth.admin.getUserById(id);
      const email = safeEmail(res?.data?.user?.email);
      if (email) emailById.set(id, email);
    } catch {
      // skip
    }
  }
  return emailById;
}

function formatRoleLabel(roleRaw: string): string {
  const r = safeStr(roleRaw).trim().toUpperCase();
  const map: Record<string, string> = {
    ACCOUNT_ADMIN: "Account admin",
    ORDER_CREATOR: "Order creator",
    ORDER_VIEWER: "Order viewer",
    READ_ONLY: "Read only",
    IVR_SUBMITTER: "IVR submitter",
  };
  return map[r] || (roleRaw ? roleRaw.replace(/_/g, " ") : "—");
}

function roleBadgeStyle(roleRaw: string): React.CSSProperties {
  const r = safeStr(roleRaw).trim().toUpperCase();
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 11px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: 0.45,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    borderWidth: 1,
    borderStyle: "solid",
    lineHeight: 1.2,
  };

  if (r === "ACCOUNT_ADMIN") {
    return {
      ...base,
      background: "color-mix(in srgb, var(--brand-600) 14%, white)",
      borderColor: "color-mix(in srgb, var(--brand-600) 28%, var(--border))",
      color: "color-mix(in srgb, var(--brand-700) 92%, black)",
    };
  }
  if (r === "ORDER_CREATOR") {
    return {
      ...base,
      background: "rgba(16, 185, 129, 0.12)",
      borderColor: "rgba(16, 185, 129, 0.28)",
      color: "rgb(4, 120, 87)",
    };
  }
  if (r === "ORDER_VIEWER") {
    return {
      ...base,
      background: "rgba(59, 130, 246, 0.10)",
      borderColor: "rgba(59, 130, 246, 0.22)",
      color: "rgb(30, 64, 175)",
    };
  }
  if (r === "READ_ONLY") {
    return {
      ...base,
      background: "rgba(100, 116, 139, 0.10)",
      borderColor: "rgba(100, 116, 139, 0.22)",
      color: "rgb(71, 85, 105)",
    };
  }
  if (r === "IVR_SUBMITTER") {
    return {
      ...base,
      background: "rgba(245, 158, 11, 0.14)",
      borderColor: "rgba(245, 158, 11, 0.30)",
      color: "rgb(146, 64, 14)",
    };
  }
  return {
    ...base,
    background: "rgba(0,0,0,0.04)",
    borderColor: "var(--border)",
    color: "var(--foreground)",
  };
}

function statusBadge(active: boolean): React.ReactNode {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 11px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: 0.45,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    borderWidth: 1,
    borderStyle: "solid",
    lineHeight: 1.2,
  };
  if (active) {
    return (
      <span
        style={{
          ...base,
          background: "rgba(16, 185, 129, 0.10)",
          borderColor: "rgba(16, 185, 129, 0.28)",
          color: "rgb(4, 120, 87)",
        }}
      >
        Active
      </span>
    );
  }
  return (
    <span
      style={{
        ...base,
        background: "rgba(220, 38, 38, 0.08)",
        borderColor: "rgba(220, 38, 38, 0.22)",
        color: "rgb(153, 27, 27)",
      }}
    >
      Disabled
    </span>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function tdRowStyle(rowIndex: number): React.CSSProperties {
  return {
    borderTop:
      rowIndex === 0
        ? "none"
        : "1px solid color-mix(in srgb, var(--border) 85%, transparent)",
  };
}

const pageStyles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: 22, maxWidth: 1100, margin: "0 auto", padding: "16px 16px 48px" },
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
  heroTitle: { fontSize: 28, fontWeight: 950, margin: "6px 0 0", letterSpacing: -0.3, color: "white" },
  heroSub: { marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.78)", lineHeight: 1.45, maxWidth: 560 },
  ghostBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 950,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
  },
  card: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: 18,
    background: "var(--surface)",
    boxShadow: "var(--shadow-1)",
    overflow: "hidden",
  },
  th: {
    textAlign: "left",
    padding: "14px 16px",
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: 0.55,
    textTransform: "uppercase",
    color: "var(--muted)",
    background: "color-mix(in srgb, var(--surface) 86%, var(--background))",
    borderBottom: "1px solid var(--border)",
  },
  tdBase: {
    padding: "12px 14px",
    fontSize: 14,
    verticalAlign: "middle" as const,
    whiteSpace: "nowrap" as const,
  },
  emailCell: {
    maxWidth: 240,
    minWidth: 180,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  email: {
    fontWeight: 850,
    color: "var(--foreground)",
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  name: {
    color: "var(--foreground)",
    opacity: 0.92,
    display: "block",
    maxWidth: 160,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  meta: { fontSize: 12, color: "var(--muted)", fontWeight: 700 },
  countCell: {
    fontSize: 15,
    fontWeight: 950,
    fontVariantNumeric: "tabular-nums" as const,
    color: "var(--foreground)",
    textAlign: "right" as const,
  },
};

export default async function PortalAccountUsersPage() {
  const ctx = await requireCurrentAccount();
  const accountId = ctx.currentAccountId;

  if (!accountId) {
    return (
      <div style={{ ...pageStyles.page, maxWidth: 560 }}>
        <div style={{ padding: 16, borderRadius: 16, border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ color: "crimson", fontWeight: 950 }}>No account selected.</div>
          <p style={{ marginTop: 8, fontSize: 14, color: "var(--muted)" }}>Choose an account from the selector to continue.</p>
        </div>
      </div>
    );
  }

  if (!isAccountAdmin(ctx.currentRole)) {
    return (
      <div style={pageStyles.page}>
        <div style={pageStyles.hero}>
          <div style={pageStyles.heroTop}>
            <div style={{ minWidth: 0 }}>
              <div style={pageStyles.heroKicker}>360 Portal</div>
              <h1 style={pageStyles.heroTitle}>Account users</h1>
              <p style={pageStyles.heroSub}>Only account administrators can view the member list for this organization.</p>
            </div>
            <Link href="/portal" style={pageStyles.ghostBtn}>
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sb: any = createSupabaseAdminClient();

  const { data: pricingRow } = await sb
    .from("account_pricing")
    .select("virtual_warehouse_enabled")
    .eq("account_id", accountId)
    .maybeSingle();
  const accountVirtualWarehouseEnabled = !!(pricingRow as any)?.virtual_warehouse_enabled;

  const { data: members, error: mErr } = await sb
    .from("account_users")
    .select("user_id, role, disabled_at, created_at, virtual_warehouse_access")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (mErr) {
    return (
      <div style={{ ...pageStyles.page, maxWidth: 560 }}>
        <pre style={{ color: "crimson", fontSize: 13, whiteSpace: "pre-wrap" }}>{mErr.message}</pre>
      </div>
    );
  }

  const userIds = (members ?? []).map((r: any) => safeStr(r.user_id)).filter(Boolean);
  const profilesById = new Map<string, { full_name?: string }>();
  if (userIds.length) {
    const a = await sb.from("user_profiles").select("user_id, full_name").in("user_id", userIds);
    if (!a.error && Array.isArray(a.data)) {
      for (const row of a.data) profilesById.set(safeStr(row.user_id), { full_name: safeStr(row.full_name) });
    } else {
      const b = await sb.from("user_profiles").select("id, full_name").in("id", userIds);
      if (!b.error && Array.isArray(b.data)) {
        for (const row of b.data) profilesById.set(safeStr(row.id), { full_name: safeStr(row.full_name) });
      }
    }
  }

  const emailById = await loadAuthEmailsByUserIds(sb, userIds);

  let orderCountByUserId = new Map<string, number>();
  let ivrCountByUserId = new Map<string, number>();
  try {
    const stats = await loadAccountUserActivityCounts(sb, accountId);
    orderCountByUserId = stats.orderCountByUserId;
    ivrCountByUserId = stats.ivrCountByUserId;
  } catch {
    // non-blocking: show 0 if aggregate fails
  }

  const rows = (members ?? []).map((r: any) => {
    const uid = safeStr(r.user_id);
    const email = emailById.get(uid) || "";
    const name =
      safeStr(profilesById.get(uid)?.full_name) ||
      (email ? email.split("@")[0] : uid ? `User ${uid.slice(0, 6)}` : "—");
    return {
      user_id: uid,
      role: safeStr(r.role),
      disabled_at: r.disabled_at ?? null,
      created_at: r.created_at ?? null,
      display_name: name,
      email,
      orders_placed: orderCountByUserId.get(uid) ?? 0,
      ivrs_placed: ivrCountByUserId.get(uid) ?? 0,
      virtual_warehouse_access: (r as any).virtual_warehouse_access !== false,
    };
  });

  return (
    <div style={pageStyles.page}>
      <div style={pageStyles.hero}>
        <div style={pageStyles.heroTop}>
          <div style={{ minWidth: 0 }}>
            <div style={pageStyles.heroKicker}>360 Portal</div>
            <h1 style={pageStyles.heroTitle}>Account users</h1>
            <p style={pageStyles.heroSub}>
              Everyone who can sign in to <span style={{ fontWeight: 950, color: "white" }}>{ctx.currentAccountName ?? "this account"}</span>{" "}
              and their portal role. Invites and role changes are managed by your 360 Medical team unless otherwise agreed.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/portal/settings" style={pageStyles.ghostBtn}>
              ← Settings
            </Link>
            <Link href="/portal" style={{ ...pageStyles.ghostBtn, opacity: 0.95 }}>
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div style={pageStyles.card}>
        <div className="portal-table-wrap" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "24%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={pageStyles.th}>Email</th>
                <th style={pageStyles.th}>Name</th>
                <th style={pageStyles.th}>Role</th>
                <th style={{ ...pageStyles.th, textAlign: "right" }}>Orders</th>
                <th style={{ ...pageStyles.th, textAlign: "right" }}>IVRs</th>
                <th style={pageStyles.th}>Virtual warehouse</th>
                <th style={pageStyles.th}>Status</th>
                <th style={{ ...pageStyles.th, whiteSpace: "nowrap" }}>Added</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: (typeof rows)[number], idx: number) => (
                <tr key={r.user_id}>
                  <td style={{ ...pageStyles.tdBase, ...pageStyles.emailCell, ...tdRowStyle(idx) }}>
                    <span style={pageStyles.email} title={r.email || undefined}>
                      {r.email || "—"}
                    </span>
                  </td>
                  <td style={{ ...pageStyles.tdBase, ...tdRowStyle(idx) }}>
                    <span style={pageStyles.name} title={r.display_name}>
                      {r.display_name}
                    </span>
                  </td>
                  <td style={{ ...pageStyles.tdBase, ...tdRowStyle(idx) }}>
                    <span style={roleBadgeStyle(r.role)}>{formatRoleLabel(r.role)}</span>
                  </td>
                  <td style={{ ...pageStyles.tdBase, ...tdRowStyle(idx), ...pageStyles.countCell }}>
                    {r.orders_placed}
                  </td>
                  <td style={{ ...pageStyles.tdBase, ...tdRowStyle(idx), ...pageStyles.countCell }}>
                    {r.ivrs_placed}
                  </td>
                  <td style={{ ...pageStyles.tdBase, ...tdRowStyle(idx) }}>
                    <AccountUserVirtualWarehouseToggle
                      userId={r.user_id}
                      initialEnabled={r.virtual_warehouse_access}
                      accountVirtualWarehouseEnabled={accountVirtualWarehouseEnabled}
                    />
                  </td>
                  <td style={{ ...pageStyles.tdBase, ...tdRowStyle(idx) }}>{statusBadge(!r.disabled_at)}</td>
                  <td
                    style={{
                      ...pageStyles.tdBase,
                      ...tdRowStyle(idx),
                      ...pageStyles.meta,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtDate(r.created_at)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...pageStyles.tdBase, padding: "28px 16px", textAlign: "center" }}>
                    <div style={{ fontWeight: 950, marginBottom: 6 }}>No portal users yet</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>
                      When teammates accept invites for this account, they will appear here.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
