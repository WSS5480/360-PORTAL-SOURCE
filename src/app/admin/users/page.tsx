import Link from "next/link";
import type { CSSProperties } from "react";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { formatRoleLabel } from "@/lib/formatStatusLabel";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const emptyId = "00000000-0000-0000-0000-000000000000";

const pageStyle: CSSProperties = {
  width: "100%",
  maxWidth: 1400,
  minWidth: 0,
  margin: "0 auto",
  padding: 0,
  boxSizing: "border-box",
  display: "grid",
  gap: 16,
};

const heroStyle: CSSProperties = {
  borderRadius: 20,
  overflow: "hidden",
  border: "1px solid rgba(30,136,229,0.22)",
  background:
    "radial-gradient(900px 240px at 15% 10%, rgba(30,136,229,0.34), transparent 60%)," +
    "linear-gradient(180deg, #08172f, #060e1b)",
  color: "white",
  boxShadow: "0 16px 36px rgba(15,23,42,0.12)",
};

const cardStyle: CSSProperties = {
  border: "1px solid rgba(15,23,42,0.10)",
  borderRadius: 16,
  background: "white",
  boxShadow: "0 8px 22px rgba(15,23,42,0.05)",
  overflow: "hidden",
};

const fieldStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(15,23,42,0.14)",
  background: "white",
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 850,
  boxSizing: "border-box",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "11px 12px",
  borderBottom: "1px solid rgba(15,23,42,0.08)",
  color: "#475569",
  fontSize: 11,
  fontWeight: 950,
  letterSpacing: 0.35,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid rgba(15,23,42,0.06)",
  verticalAlign: "top",
};

type AuthUserRow = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
};

type MembershipRow = {
  account_id: string;
  user_id: string;
  role: string | null;
  created_at?: string | null;
};

type AccountRow = {
  id: string;
  name: string | null;
};

type InternalUserRow = {
  user_id: string;
  role: string | null;
};

type ProfileRow = {
  user_id: string;
  is_staff: boolean | null;
};

function badge(text: string, tone: "dark" | "blue" | "gray" = "gray") {
  const bg =
    tone === "dark" ? "#0f172a" : tone === "blue" ? "rgba(37, 99, 235, 0.12)" : "rgba(15,23,42,0.06)";
  const color = tone === "dark" ? "white" : tone === "blue" ? "#1d4ed8" : "#334155";
  const border = tone === "dark" ? "1px solid rgba(15,23,42,0.18)" : "1px solid rgba(15,23,42,0.12)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 950,
        background: bg,
        color,
        border,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function statCard(label: string, value: number | string, note?: string) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 14,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 0.35, opacity: 0.72, fontWeight: 950, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 950, marginTop: 7, letterSpacing: -0.3 }}>{value}</div>
      {note ? <div style={{ marginTop: 3, fontSize: 12, opacity: 0.72 }}>{note}</div> : null}
    </div>
  );
}

function safeStr(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function safeUpper(v: unknown) {
  return safeStr(v).toUpperCase();
}

function formatDate(value: unknown) {
  const raw = safeStr(value);
  if (!raw) return "";
  return new Date(raw).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortId(id: unknown) {
  const raw = safeStr(id);
  return raw.length > 12 ? `${raw.slice(0, 8)}...${raw.slice(-4)}` : raw;
}

export default async function AdminUsersPage(props: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    staff?: string;
    account?: string;
    memRole?: string;
    hasMembership?: string;
    sort?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await props.searchParams;
  const rawQ = safeStr(sp.q);
  const q = rawQ.toLowerCase();
  const roleFilter = safeUpper(sp.role) || "ALL";
  const staffFilter = safeUpper(sp.staff) || "ALL";
  const accountFilter = safeStr(sp.account);
  const memRoleFilter = safeUpper(sp.memRole) || "ALL";
  const hasMembershipFilter = safeUpper(sp.hasMembership) || "ALL";
  const sort = safeUpper(sp.sort) || "CREATED_DESC";

  const supabase = createSupabaseAdminClient();

  const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listErr) {
    return (
      <main style={pageStyle}>
        <section style={{ ...cardStyle, padding: 16, borderColor: "rgba(220,38,38,0.25)", background: "rgba(254,242,242,0.95)" }}>
          <h1 style={{ fontSize: 22, fontWeight: 950, margin: 0, color: "#0f172a" }}>Users</h1>
          <pre style={{ marginTop: 12, color: "#b91c1c", fontSize: 12, whiteSpace: "pre-wrap" }}>{listErr.message}</pre>
          <div style={{ marginTop: 12 }}>
            <Link href="/admin" style={{ fontWeight: 900, color: "var(--brand-600)" }}>
              Back to dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const users = ((listData?.users || []) as AuthUserRow[]).slice(0, 200);

  const userIds = users.map((u) => u.id);

  // Memberships (per account)
  const { data: mems } = await supabase
    .from("account_users")
    .select("account_id,user_id,role,created_at")
    .in("user_id", userIds.length ? userIds : [emptyId]);

  const memberships = (mems || []) as MembershipRow[];
  const accountIds = Array.from(new Set(memberships.map((m) => m.account_id)));

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name")
    .in("id", accountIds.length ? accountIds : [emptyId]);

  const accountNameById: Record<string, string> = {};
  ((accounts || []) as AccountRow[]).forEach((a) => (accountNameById[a.id] = a.name || a.id));

  const memsByUser: Record<string, MembershipRow[]> = {};
  for (const m of memberships) {
    (memsByUser[m.user_id] ||= []).push(m);
  }

  // Global roles: Admin + Staff
  // These tables are newly required. If they’re empty, that’s fine.
  const [{ data: admins }, { data: profiles }] = await Promise.all([
    supabase
      .from("internal_users")
      .select("user_id,role")
      .in("user_id", userIds.length ? userIds : [emptyId]),
    supabase
      .from("user_profiles")
      .select("user_id,is_staff")
      .in("user_id", userIds.length ? userIds : [emptyId]),
  ]);

  const adminByUserId: Record<string, InternalUserRow> = {};
  ((admins || []) as InternalUserRow[]).forEach((r) => (adminByUserId[r.user_id] = r));

  const staffByUserId: Record<string, boolean> = {};
  ((profiles || []) as ProfileRow[]).forEach((r) => (staffByUserId[r.user_id] = !!r.is_staff));

  const { data: allAccounts } = await supabase.from("accounts").select("id,name").order("name").limit(500);

  const stats = {
    total: users.length,
    admins: users.filter((u) => !!adminByUserId[u.id]).length,
    staff: users.filter((u) => !!staffByUserId[u.id]).length,
    withMemberships: users.filter((u) => (memsByUser[u.id] || []).length).length,
  };
  const activeFilters = [
    q ? "search" : "",
    roleFilter !== "ALL" ? "role" : "",
    staffFilter !== "ALL" ? "staff" : "",
    hasMembershipFilter !== "ALL" ? "membership" : "",
    memRoleFilter !== "ALL" ? "membership role" : "",
    accountFilter && accountFilter !== "all" ? "account" : "",
    sort !== "CREATED_DESC" ? "sort" : "",
  ].filter(Boolean).length;

  const filtered = users
    .filter((u) => {
      if (roleFilter === "ADMIN" && !adminByUserId[u.id]) return false;
      if (roleFilter === "CUSTOMER" && adminByUserId[u.id]) return false;
      if (staffFilter === "STAFF" && !staffByUserId[u.id]) return false;
      if (staffFilter === "NONSTAFF" && staffByUserId[u.id]) return false;
      const memList = memsByUser[u.id] || [];
      if (hasMembershipFilter === "YES" && !memList.length) return false;
      if (hasMembershipFilter === "NO" && memList.length) return false;
      if (accountFilter && accountFilter !== "all" && !memList.some((m) => String(m.account_id) === accountFilter)) {
        return false;
      }
      if (memRoleFilter !== "ALL" && !memList.some((m) => safeUpper(m.role) === memRoleFilter)) {
        return false;
      }
      if (!q) return true;
      const email = safeStr(u.email).toLowerCase();
      const id = safeStr(u.id).toLowerCase();
      if (email.includes(q) || id.includes(q)) return true;
      return memList.some((m) => safeStr(accountNameById[m.account_id]).toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (sort === "EMAIL_ASC") return safeStr(a.email).localeCompare(safeStr(b.email));
      if (sort === "EMAIL_DESC") return safeStr(b.email).localeCompare(safeStr(a.email));
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (sort === "CREATED_ASC") return ta - tb;
      return tb - ta;
    });

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <div style={{ padding: 16, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, letterSpacing: 0.4, opacity: 0.72, fontWeight: 950, textTransform: "uppercase" }}>
                Admin
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 950, margin: "6px 0 0", letterSpacing: -0.3 }}>Users</h1>
              <p style={{ margin: "8px 0 0", opacity: 0.78, fontSize: 13, maxWidth: 780, lineHeight: 1.45 }}>
                Search auth users, inspect global access, and jump into account memberships for the 200 most recent users.
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13, opacity: 0.92 }}>
                <Link href="/admin" style={{ color: "white", textDecoration: "none", fontWeight: 900 }}>
                  Dashboard
                </Link>
                <Link href="/admin/accounts" style={{ color: "white", textDecoration: "none", fontWeight: 900 }}>
                  Accounts
                </Link>
                <Link href="/admin/people" style={{ color: "white", textDecoration: "none", fontWeight: 900 }}>
                  People
                </Link>
                <Link href="/admin/invites" style={{ color: "white", textDecoration: "none", fontWeight: 900 }}>
                  Invites
                </Link>
                <Link href="/admin/ivr" style={{ color: "white", textDecoration: "none", fontWeight: 900 }}>
                  IVR Queue
                </Link>
              </div>
            </div>
            <Link
              href="/admin/invite"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.12)",
                color: "white",
                fontWeight: 950,
                textDecoration: "none",
                fontSize: 13,
              }}
            >
              Invite user
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {statCard("Loaded users", stats.total, "Recent auth records")}
            {statCard("Internal admins", stats.admins)}
            {statCard("IVR staff", stats.staff)}
            {statCard("With accounts", stats.withMemberships)}
          </div>
        </div>
      </section>

      <form
        method="get"
        action="/admin/users"
        style={{ ...cardStyle, display: "grid", gap: 14, padding: 14, width: "100%", boxSizing: "border-box" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.35, textTransform: "uppercase", color: "#475569" }}>
              Filters
            </div>
            <div style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>
              Showing <b style={{ color: "#0f172a" }}>{filtered.length}</b> of <b style={{ color: "#0f172a" }}>{users.length}</b>{" "}
              users{rawQ ? ` for "${rawQ}"` : ""}
            </div>
          </div>
          {activeFilters ? (
            <Link href="/admin/users" style={{ color: "var(--brand-700)", fontWeight: 950, textDecoration: "none", fontSize: 13 }}>
              Clear {activeFilters} filter{activeFilters === 1 ? "" : "s"}
            </Link>
          ) : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1.5fr) repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <input name="q" defaultValue={rawQ} placeholder="Search email, user ID, or account" style={fieldStyle} />
          <select name="role" defaultValue={roleFilter} style={fieldStyle}>
            <option value="ALL">All global roles</option>
            <option value="ADMIN">Internal admin</option>
            <option value="CUSTOMER">Customer</option>
          </select>
          <select name="staff" defaultValue={staffFilter} style={fieldStyle}>
            <option value="ALL">All staff states</option>
            <option value="STAFF">IVR staff only</option>
            <option value="NONSTAFF">Not IVR staff</option>
          </select>
          <select name="hasMembership" defaultValue={hasMembershipFilter} style={fieldStyle}>
            <option value="ALL">All memberships</option>
            <option value="YES">Has account</option>
            <option value="NO">No account</option>
          </select>
          <select name="memRole" defaultValue={memRoleFilter} style={fieldStyle}>
            <option value="ALL">Any account role</option>
            <option value="ACCOUNT_ADMIN">Account admin</option>
            <option value="ORDER_CREATOR">Customer</option>
            <option value="ORDER_VIEWER">Customer (view)</option>
            <option value="READ_ONLY">Customer (read only)</option>
            <option value="IVR_SUBMITTER">IVR team</option>
          </select>
          <select name="account" defaultValue={accountFilter || "all"} style={fieldStyle}>
            <option value="all">All accounts</option>
            {((allAccounts || []) as AccountRow[]).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name || a.id}
              </option>
            ))}
          </select>
          <select name="sort" defaultValue={sort} style={fieldStyle}>
            <option value="CREATED_DESC">Newest first</option>
            <option value="CREATED_ASC">Oldest first</option>
            <option value="EMAIL_ASC">Email A-Z</option>
            <option value="EMAIL_DESC">Email Z-A</option>
          </select>
          <button
            type="submit"
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(15,23,42,0.16)",
              background: "#0f172a",
              color: "white",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            Apply filters
          </button>
        </div>
      </form>

      <section style={cardStyle}>
        <div
          style={{
            padding: "13px 14px",
            borderBottom: "1px solid rgba(15,23,42,0.08)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 950, color: "#0f172a" }}>User list</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </div>
        </div>

        <div style={{ overflowX: "auto", width: "100%", boxSizing: "border-box" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "auto" }}>
            <thead style={{ background: "rgba(248,250,252,0.95)" }}>
              <tr>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Access</th>
                <th style={thStyle}>User ID</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Last sign-in</th>
                <th style={thStyle}>Accounts</th>
                <th style={thStyle}>Manage</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const memList = memsByUser[u.id] || [];
                const isAdmin = !!adminByUserId[u.id];
                const isStaff = !!staffByUserId[u.id];

                return (
                  <tr key={u.id}>
                    <td style={{ ...tdStyle, minWidth: 220 }}>
                      <div style={{ fontWeight: 950, color: "#0f172a" }}>
                        {u.email || <span style={{ color: "#94a3b8" }}>No email</span>}
                      </div>
                      <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>
                        {memList.length} account{memList.length === 1 ? "" : "s"}
                      </div>
                    </td>

                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {isAdmin ? badge("ADMIN", "dark") : badge("CUSTOMER", "gray")}
                        {isStaff ? badge("IVR TEAM", "blue") : null}
                      </div>
                    </td>

                    <td style={tdStyle}>
                      <code
                        title={u.id}
                        style={{
                          display: "inline-flex",
                          padding: "4px 7px",
                          borderRadius: 8,
                          background: "rgba(15,23,42,0.05)",
                          color: "#334155",
                          fontSize: 11,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {shortId(u.id)}
                      </code>
                    </td>

                    <td style={{ ...tdStyle, whiteSpace: "nowrap", color: "#334155" }}>
                      {formatDate(u.created_at) || <span style={{ color: "#94a3b8" }}>Not available</span>}
                    </td>

                    <td style={{ ...tdStyle, whiteSpace: "nowrap", color: "#334155" }}>
                      {formatDate(u.last_sign_in_at) || <span style={{ color: "#94a3b8" }}>Never</span>}
                    </td>

                    <td style={{ ...tdStyle, minWidth: 260 }}>
                      {memList.length ? (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {memList.map((m) => (
                            <Link
                              key={`${m.account_id}-${m.user_id}`}
                              href={`/admin/accounts/${m.account_id}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 9px",
                                borderRadius: 999,
                                border: "1px solid rgba(30,136,229,0.18)",
                                background: "rgba(30,136,229,0.07)",
                                color: "var(--brand-700)",
                                textDecoration: "none",
                                fontWeight: 850,
                                fontSize: 12,
                              }}
                            >
                              <span>{accountNameById[m.account_id] || m.account_id}</span>
                              <span style={{ color: "#64748b", fontWeight: 800 }}>{formatRoleLabel(m.role)}</span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>No memberships</span>
                      )}
                    </td>

                    <td style={tdStyle}>
                      <Link href={`/admin/users/${u.id}`} style={{ color: "var(--brand-700)", fontWeight: 950, textDecoration: "none" }}>
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!filtered.length ? (
            <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
              <div style={{ fontWeight: 950, color: "#0f172a" }}>No matching users</div>
              <div style={{ marginTop: 6, fontSize: 13 }}>Try a broader search or clear the active filters.</div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
