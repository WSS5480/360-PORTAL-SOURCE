"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatRoleLabel } from "@/lib/formatStatusLabel";

type InviteRow = {
  id: string;
  email: string | null;
  role: string | null;
  created_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
};

type MemberRow = {
  user_id: string;
  email: string | null;
  role: string;
  created_at: string | null;
};

export type AccountRow = {
  id: string;
  name: string | null;
  discount_percent?: number | null;
  created_at: string | null;
  members?: MemberRow[];
  invites?: InviteRow[];
  orders_count?: number;
  orders_total?: number;
  invoices_count?: number;
  invoices_total?: number;
};

type OnlyFilter = "ALL" | "HAS_USERS" | "HAS_INVITES" | "PENDING_INVITES" | "NO_USERS";

type SortPreset =
  | "created_desc"
  | "created_asc"
  | "name_asc"
  | "name_desc"
  | "users_desc"
  | "users_asc"
  | "pending_desc"
  | "pending_asc";

function inviteStatus(inv: InviteRow) {
  if (inv.revoked_at) return "REVOKED";
  if (inv.accepted_at) return "ACCEPTED";
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) return "EXPIRED";
  return "PENDING";
}

function fmtDate(v: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function fmtPct(v: unknown) {
  const n = typeof v === "number" ? v : 0;
  const safe = Number.isFinite(n) ? n : 0;
  return `${safe}%`;
}

function money(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "—";
}

function badge(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,0.15)",
    whiteSpace: "nowrap",
  };

  switch (status) {
    case "PENDING":
      return { ...base, background: "#fff7e6", borderColor: "#f0d9a8" };
    case "EXPIRED":
      return { ...base, background: "#f3f3f3" };
    case "ACCEPTED":
      return { ...base, background: "#eefaf0", borderColor: "#bfe7c7" };
    case "REVOKED":
      return { ...base, background: "#ffecec", borderColor: "#f0b5b5" };
    default:
      return base;
  }
}

function btn(kind: "primary" | "ghost" = "ghost"): React.CSSProperties {
  if (kind === "primary") {
    return {
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid color-mix(in srgb, var(--brand-600) 40%, #111)",
      background: "var(--brand-600)",
      color: "white",
      fontWeight: 900,
      cursor: "pointer",
      fontSize: 13,
    };
  }
  return {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 13,
  };
}

function safeOnly(v: unknown): OnlyFilter {
  const s = typeof v === "string" ? v : "";
  const allowed: OnlyFilter[] = ["ALL", "HAS_USERS", "HAS_INVITES", "PENDING_INVITES", "NO_USERS"];
  return allowed.includes(s as OnlyFilter) ? (s as OnlyFilter) : "ALL";
}

function safeSort(v: unknown): SortPreset {
  const s = typeof v === "string" ? v : "";
  const allowed: SortPreset[] = [
    "created_desc",
    "created_asc",
    "name_asc",
    "name_desc",
    "users_desc",
    "users_asc",
    "pending_desc",
    "pending_asc",
  ];
  return allowed.includes(s as SortPreset) ? (s as SortPreset) : "created_desc";
}

function accountsParamsFromState(q: string, only: OnlyFilter, sort: SortPreset) {
  const p = new URLSearchParams();
  const tq = q.trim();
  if (tq) p.set("q", tq);
  if (only !== "ALL") p.set("only", only);
  if (sort !== "created_desc") p.set("sort", sort);
  return p;
}

function accountsParamsEqual(a: URLSearchParams, b: URLSearchParams) {
  const keys = new Set<string>([...a.keys(), ...b.keys()]);
  for (const k of keys) {
    if ((a.get(k) ?? "") !== (b.get(k) ?? "")) return false;
  }
  return true;
}

function sortLabel(s: SortPreset) {
  switch (s) {
    case "created_desc":
      return "Created (newest)";
    case "created_asc":
      return "Created (oldest)";
    case "name_asc":
      return "Name (A→Z)";
    case "name_desc":
      return "Name (Z→A)";
    case "users_desc":
      return "Users (high→low)";
    case "users_asc":
      return "Users (low→high)";
    case "pending_desc":
      return "Pending invites (high→low)";
    case "pending_asc":
      return "Pending invites (low→high)";
    default:
      return "Created (newest)";
  }
}

export default function AccountsTableClient(props: {
  rows: AccountRow[];
  initialQ?: string;
  initialOnly?: string;
  initialSort?: string;
}) {
  const { rows } = props;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState<string>(props.initialQ ?? "");
  const [only, setOnly] = useState<OnlyFilter>(safeOnly(props.initialOnly));
  const [sort, setSort] = useState<SortPreset>(safeSort(props.initialSort));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setQ(props.initialQ ?? "");
    setOnly(safeOnly(props.initialOnly));
    setSort(safeSort(props.initialSort));
  }, [props.initialQ, props.initialOnly, props.initialSort]);

  const qRef = useRef(q);
  const onlyRef = useRef(only);
  const sortRef = useRef(sort);
  const spRef = useRef(searchParams);
  const searchDebounceRef = useRef<number | null>(null);

  qRef.current = q;
  onlyRef.current = only;
  sortRef.current = sort;
  spRef.current = searchParams;

  const replaceUrlIfNeeded = useCallback(() => {
    const next = accountsParamsFromState(qRef.current, onlyRef.current, sortRef.current);
    const cur = new URLSearchParams(spRef.current.toString());
    if (accountsParamsEqual(next, cur)) return;
    const s = next.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }, [pathname, router]);

  function scheduleSearchUrlUpdate() {
    if (searchDebounceRef.current !== null) window.clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => {
      searchDebounceRef.current = null;
      replaceUrlIfNeeded();
    }, 350);
  }

  useEffect(
    () => () => {
      if (searchDebounceRef.current !== null) window.clearTimeout(searchDebounceRef.current);
    },
    []
  );

  function countsForAccount(a: AccountRow) {
    const members = Array.isArray(a.members) ? a.members : [];
    const invites = Array.isArray(a.invites) ? a.invites : [];

    const usersCount = members.length;
    const pendingInvites = invites.filter((i) => {
      const s = inviteStatus(i);
      return s === "PENDING" || s === "EXPIRED";
    }).length;

    return { usersCount, pendingInvites, invitesCount: invites.length };
  }

  const filteredSorted = useMemo(() => {
    const query = q.trim().toLowerCase();

    const filtered = (rows ?? []).filter((a) => {
      const name = (a.name || "").toLowerCase();
      const id = (a.id || "").toLowerCase();

      const members = Array.isArray(a.members) ? a.members : [];
      const memberEmails = members.map((m) => (m.email || "").toLowerCase()).join(" ");

      const matchesSearch = !query || name.includes(query) || id.includes(query) || memberEmails.includes(query);
      if (!matchesSearch) return false;

      const c = countsForAccount(a);

      if (only === "ALL") return true;
      if (only === "HAS_USERS") return c.usersCount > 0;
      if (only === "NO_USERS") return c.usersCount === 0;
      if (only === "HAS_INVITES") return c.invitesCount > 0;
      if (only === "PENDING_INVITES") return c.pendingInvites > 0;

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const ca = countsForAccount(a);
      const cb = countsForAccount(b);

      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;

      const an = (a.name || "").toLowerCase();
      const bn = (b.name || "").toLowerCase();

      switch (sort) {
        case "created_desc":
          return bt - at;
        case "created_asc":
          return at - bt;
        case "name_asc":
          return an.localeCompare(bn);
        case "name_desc":
          return bn.localeCompare(an);
        case "users_desc":
          return cb.usersCount - ca.usersCount;
        case "users_asc":
          return ca.usersCount - cb.usersCount;
        case "pending_desc":
          return cb.pendingInvites - ca.pendingInvites;
        case "pending_asc":
          return ca.pendingInvites - cb.pendingInvites;
        default:
          return bt - at;
      }
    });

    return sorted;
  }, [rows, q, only, sort]);

  const shell: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.1)",
    borderRadius: 16,
    overflow: "hidden",
    background: "white",
    boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
  };

  const topbar: React.CSSProperties = {
    padding: "14px 14px 12px",
    display: "grid",
    gap: 12,
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    background: "rgba(0,0,0,0.03)",
  };

  const input: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    minWidth: 260,
    fontSize: 14,
    fontWeight: 900,
  };

  const select: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    fontSize: 14,
    fontWeight: 900,
    background: "white",
  };

  const th: React.CSSProperties = {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    fontSize: 11,
    letterSpacing: 0.35,
    fontWeight: 900,
    textTransform: "uppercase",
    opacity: 0.65,
    whiteSpace: "nowrap",
    background: "rgba(0,0,0,0.02)",
  };

  const td: React.CSSProperties = {
    padding: "12px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    fontSize: 13,
    verticalAlign: "top",
  };

  const linkMoney: React.CSSProperties = {
    fontWeight: 900,
    textDecoration: "none",
    color: "var(--brand-600)",
  };

  return (
    <div style={shell}>
      <div style={topbar}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Account list</div>
          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
            {filteredSorted.length} shown
            {filteredSorted.length !== rows.length ? ` of ${rows.length}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={q}
            onChange={(e) => {
              const v = e.target.value;
              setQ(v);
              qRef.current = v;
              scheduleSearchUrlUpdate();
            }}
            placeholder="Search name, id, or member email…"
            style={input}
          />

          <select
            value={only}
            onChange={(e) => {
              const v = safeOnly(e.target.value);
              setOnly(v);
              onlyRef.current = v;
              replaceUrlIfNeeded();
            }}
            style={select}
          >
            <option value="ALL">All accounts</option>
            <option value="HAS_USERS">Has users</option>
            <option value="NO_USERS">No users</option>
            <option value="HAS_INVITES">Has invites</option>
            <option value="PENDING_INVITES">Pending/Expired invites</option>
          </select>

          <select
            value={sort}
            onChange={(e) => {
              const v = safeSort(e.target.value);
              setSort(v);
              sortRef.current = v;
              replaceUrlIfNeeded();
            }}
            style={select}
          >
            <option value="created_desc">{sortLabel("created_desc")}</option>
            <option value="created_asc">{sortLabel("created_asc")}</option>
            <option value="name_asc">{sortLabel("name_asc")}</option>
            <option value="name_desc">{sortLabel("name_desc")}</option>
            <option value="users_desc">{sortLabel("users_desc")}</option>
            <option value="users_asc">{sortLabel("users_asc")}</option>
            <option value="pending_desc">{sortLabel("pending_desc")}</option>
            <option value="pending_asc">{sortLabel("pending_asc")}</option>
          </select>

          {q || only !== "ALL" || sort !== "created_desc" ? (
            <button
              type="button"
              style={btn()}
              onClick={() => {
                if (searchDebounceRef.current !== null) window.clearTimeout(searchDebounceRef.current);
                searchDebounceRef.current = null;
                setQ("");
                setOnly("ALL");
                setSort("created_desc");
                qRef.current = "";
                onlyRef.current = "ALL";
                sortRef.current = "created_desc";
                router.replace(pathname, { scroll: false });
              }}
              title="Clear search/filters"
            >
              Reset
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="admin-accounts-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Account</th>
              <th style={th}>Orders</th>
              <th style={th}>Invoices</th>
              <th style={th}>Discount</th>
              <th style={th}>Users</th>
              <th style={th}>Pending invites</th>
              <th style={th}>Created</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredSorted.map((a) => {
              const members = Array.isArray(a.members) ? a.members : [];
              const invites = Array.isArray(a.invites) ? a.invites : [];
              const { usersCount, pendingInvites } = countsForAccount(a);

              const isOpen = !!expanded[a.id];

              return (
                <tr key={a.id}>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => setExpanded((p) => ({ ...p, [a.id]: !p[a.id] }))}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 10,
                          border: "1px solid rgba(0,0,0,0.12)",
                          background: "white",
                          cursor: "pointer",
                          fontWeight: 900,
                          flexShrink: 0,
                        }}
                        title={isOpen ? "Collapse" : "Expand"}
                      >
                        {isOpen ? "−" : "+"}
                      </button>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900, fontSize: 14, lineHeight: 1.2 }}>
                          {a.name || <span style={{ opacity: 0.7 }}>Unnamed account</span>}
                        </div>

                        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>
                          {members.length ? `${members.length} member${members.length === 1 ? "" : "s"}` : "No members yet"}
                          {invites.length ? ` · ${invites.length} invite${invites.length === 1 ? "" : "s"}` : ""}
                        </div>

                        {isOpen ? (
                          <div
                            style={{
                              marginTop: 10,
                              padding: 10,
                              borderRadius: 10,
                              border: "1px solid rgba(0,0,0,0.08)",
                              background: "rgba(0,0,0,0.02)",
                            }}
                          >
                            <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.8 }}>Users</div>

                            {members.length ? (
                              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                                {members.map((m) => (
                                  <Link
                                    key={`${a.id}:${m.user_id}`}
                                    href={`/admin/users/${encodeURIComponent(m.user_id)}`}
                                    prefetch={false}
                                    title="Open user detail"
                                    style={{
                                      display: "block",
                                      textDecoration: "none",
                                      color: "inherit",
                                      borderRadius: 10,
                                      cursor: "pointer",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 10,
                                        padding: "8px 10px",
                                        borderRadius: 10,
                                        border: "1px solid rgba(0,0,0,0.08)",
                                        background: "white",
                                      }}
                                    >
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 900, fontSize: 13 }}>
                                          {m.email || <span style={{ opacity: 0.7 }}>—</span>}
                                        </div>
                                        <div style={{ fontSize: 12, opacity: 0.7 }}>Added: {fmtDate(m.created_at)}</div>
                                      </div>
                                      <span style={badge("ACCEPTED")}>{formatRoleLabel(m.role) || "—"}</span>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            ) : (
                              <div style={{ marginTop: 8, opacity: 0.7, fontSize: 13 }}>
                                No users linked to this account.
                              </div>
                            )}

                            <div style={{ marginTop: 12, fontWeight: 900, fontSize: 12, opacity: 0.8 }}>
                              Recent invites
                            </div>

                            {invites.length ? (
                              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                                {invites.slice(0, 6).map((inv) => {
                                  const st = inviteStatus(inv);
                                  return (
                                    <div
                                      key={`${a.id}:invite:${inv.id}`}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 10,
                                        padding: "8px 10px",
                                        borderRadius: 10,
                                        border: "1px solid rgba(0,0,0,0.08)",
                                        background: "white",
                                      }}
                                    >
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 900, fontSize: 13 }}>
                                          {inv.email || <span style={{ opacity: 0.7 }}>—</span>}
                                        </div>
                                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                                          Sent: {fmtDate(inv.created_at)} · Expires: {fmtDate(inv.expires_at)}
                                        </div>
                                      </div>
                                      <span style={badge(st)}>{st}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div style={{ marginTop: 8, opacity: 0.7, fontSize: 13 }}>
                                No invites for this account.
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  <td style={td}>
                    <div style={{ fontWeight: 900 }}>{a.orders_count ?? 0}</div>
                    <div style={{ marginTop: 6 }}>
                      <Link href={`/admin/orders?account_id=${encodeURIComponent(a.id)}`} style={linkMoney}>
                        {money(a.orders_total)}
                      </Link>
                    </div>
                  </td>

                  <td style={td}>
                    <div style={{ fontWeight: 900 }}>{a.invoices_count ?? 0}</div>
                    <div style={{ marginTop: 6 }}>
                      <Link href={`/admin/invoices?account_id=${encodeURIComponent(a.id)}`} style={linkMoney}>
                        {money(a.invoices_total)}
                      </Link>
                    </div>
                  </td>

                  <td style={td}>
                    <span style={{ fontWeight: 900 }}>{fmtPct(a.discount_percent ?? 0)}</span>
                  </td>

                  <td style={td}>
                    <span style={{ fontWeight: 900 }}>{usersCount}</span>
                  </td>

                  <td style={td}>
                    <span style={{ fontWeight: 900 }}>{pendingInvites}</span>
                  </td>

                  <td style={td}>{fmtDate(a.created_at)}</td>

                  <td style={td}>
                    <Link
                      href={`/admin/accounts/${encodeURIComponent(a.id)}`}
                      style={{ textDecoration: "none", display: "inline-block" }}
                    >
                      <button type="button" style={btn("primary")}>
                        Open
                      </button>
                    </Link>
                  </td>
                </tr>
              );
            })}

            {filteredSorted.length === 0 ? (
              <tr>
                <td style={{ ...td, padding: 28, opacity: 0.75, textAlign: "center", fontSize: 14 }} colSpan={8}>
                  No accounts match your search or filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
