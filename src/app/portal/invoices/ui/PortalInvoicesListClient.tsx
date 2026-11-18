"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatStatusLabel } from "@/lib/formatStatusLabel";

export type PortalInvoiceRow = {
  id: string;
  invoice_number?: string | null;
  status?: string | null;
  total?: number | null;
  /** Server-computed: max(stored amount_paid, sum of invoice_payments). */
  amount_paid?: number | null;
  /** Server-computed: total - amount_paid (>= 0). */
  remaining?: number | null;
  created_at?: string | null;
  issued_at?: string | null;
  order_id?: string | null;
  orders?: { order_number?: string | null } | null;
};

function safeStr(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function money(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "—";
}

function dateTime(v: unknown) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function shortId(v: unknown) {
  const s = safeStr(v);
  if (!s) return "—";
  return s.length > 10 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

function pill(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    whiteSpace: "nowrap",
  };

  const s = safeStr(status).toUpperCase();
  if (s === "DRAFT") return { ...base, background: "rgba(0,0,0,0.04)" };
  if (s === "ISSUED") return { ...base, background: "var(--brand-050)", borderColor: "color-mix(in srgb, var(--brand-600) 22%, var(--border))" };
  if (s === "SENT") return { ...base, background: "rgba(13, 110, 253, 0.10)" };
  if (s === "PAID") return { ...base, background: "rgba(16, 185, 129, 0.16)" };
  if (s === "VOID" || s === "VOIDED") return { ...base, background: "rgba(220, 38, 38, 0.12)" };
  return base;
}

const statusLabel = (s: string | null | undefined) => formatStatusLabel(s);
const statusKey = (s: string | null | undefined) => safeStr(s).toUpperCase();

export default function PortalInvoicesListClient({
  initialRows,
  accountName,
}: {
  initialRows: PortalInvoiceRow[];
  accountName: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const syncRef = useRef(false);

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [status, setStatus] = useState(() => searchParams.get("status") ?? "all");
  const [sortKey, setSortKey] = useState(() => searchParams.get("sort") ?? "created_at");
  const [sortDir, setSortDir] = useState(() => searchParams.get("dir") ?? "desc");

  useEffect(() => {
    if (syncRef.current) return;
    const hasParams = searchParams.toString().length > 0;
    if (hasParams) return;

    try {
      const raw = window.localStorage.getItem("portalInvoicesFilters");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        q?: string;
        status?: string;
        sort?: string;
        dir?: string;
      };
      if (parsed.q) setQuery(parsed.q);
      if (parsed.status) setStatus(parsed.status);
      if (parsed.sort) setSortKey(parsed.sort);
      if (parsed.dir) setSortDir(parsed.dir);
      updateQueryParams(parsed);
    } catch {
      // ignore
    }
  }, [searchParams]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    initialRows.forEach((row) => {
      const s = statusLabel(row.status);
      if (s !== "—") set.add(s);
    });
    return ["all", ...Array.from(set).sort()];
  }, [initialRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialRows.filter((row) => {
      const rowStatusKey = statusKey(row.status);
      const rowStatus = statusLabel(row.status);
      if (status !== "all" && rowStatus !== status) return false;

      if (!q) return true;
      const haystack = [
        safeStr(row.invoice_number),
        safeStr(row.id),
        safeStr(row.status),
        safeStr(row.orders?.order_number),
        safeStr(row.order_id),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [initialRows, query, status]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;

    const getValue = (row: PortalInvoiceRow) => {
      if (sortKey === "invoice") return safeStr(row.invoice_number) || safeStr(row.id);
      if (sortKey === "status") return statusLabel(row.status);
      if (sortKey === "order") return safeStr(row.orders?.order_number) || safeStr(row.order_id);
      if (sortKey === "created_at") return row.created_at ? new Date(row.created_at).getTime() : 0;
      if (sortKey === "issued_at") return row.issued_at ? new Date(row.issued_at).getTime() : 0;
      if (sortKey === "total") return Number(row.total) || 0;
      return 0;
    };

    rows.sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });

    return rows;
  }, [filtered, sortKey, sortDir]);

  const summary = useMemo(() => {
    const totalValue = filtered.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
    const issued = filtered.filter((row) => statusKey(row.status) === "ISSUED").length;
    const paid = filtered.filter((row) => statusKey(row.status) === "PAID").length;
    const draft = filtered.filter((row) => statusKey(row.status) === "DRAFT").length;
    return { totalValue, issued, paid, draft };
  }, [filtered]);

  function updateQueryParams(next: { q?: string; status?: string; sort?: string; dir?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.q !== undefined) {
      next.q ? params.set("q", next.q) : params.delete("q");
    }
    if (next.status !== undefined) {
      next.status && next.status !== "all" ? params.set("status", next.status) : params.delete("status");
    }
    if (next.sort !== undefined) {
      next.sort ? params.set("sort", next.sort) : params.delete("sort");
    }
    if (next.dir !== undefined) {
      next.dir ? params.set("dir", next.dir) : params.delete("dir");
    }

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "portalInvoicesFilters",
        JSON.stringify({ q: query, status, sort: sortKey, dir: sortDir })
      );
    } catch {
      // ignore
    }
  }, [query, status, sortKey, sortDir]);

  function toggleSort(nextKey: string) {
    if (sortKey === nextKey) {
      const nextDir = sortDir === "asc" ? "desc" : "asc";
      setSortDir(nextDir);
      updateQueryParams({ dir: nextDir });
      return;
    }
    setSortKey(nextKey);
    setSortDir("desc");
    updateQueryParams({ sort: nextKey, dir: "desc" });
  }

  function sortIndicator(key: string) {
    if (sortKey !== key) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  }

  return (
    <div style={styles.card}>
      <div className="portal-controls-stack" style={styles.controls}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 900 }}>Invoice history</div>
          <div style={styles.meta}>
            Showing <b>{filtered.length}</b> of <b>{initialRows.length}</b>
          </div>
        </div>

        <div style={styles.filters}>
          <div className="portal-search-full-mobile" style={styles.searchRow}>
            <input
              style={styles.search}
              placeholder="Search invoice #, order #, or status..."
              value={query}
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                updateQueryParams({ q: next });
              }}
              aria-label="Search invoices"
            />
            <select
              style={styles.select}
              value={status}
              onChange={(e) => {
                const next = e.target.value;
                setStatus(next);
                updateQueryParams({ status: next });
              }}
            >
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "all" ? "All statuses" : opt}
                </option>
              ))}
            </select>
            <button
              type="button"
              style={styles.resetBtn}
              onClick={() => {
                setQuery("");
                setStatus("all");
                setSortKey("created_at");
                setSortDir("desc");
                updateQueryParams({ q: "", status: "all", sort: "created_at", dir: "desc" });
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total value</div>
          <div style={styles.summaryValue}>{money(summary.totalValue)}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Issued</div>
          <div style={styles.summaryValue}>{summary.issued}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Paid</div>
          <div style={styles.summaryValue}>{summary.paid}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Drafts</div>
          <div style={styles.summaryValue}>{summary.draft}</div>
        </div>
      </div>

      <div className="portal-table-wrap" style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thSort} onClick={() => toggleSort("invoice")}>
                Invoice <span style={styles.sortIcon}>{sortIndicator("invoice")}</span>
              </th>
              <th style={styles.thSort} onClick={() => toggleSort("status")}>
                Status <span style={styles.sortIcon}>{sortIndicator("status")}</span>
              </th>
              <th style={styles.thSort} onClick={() => toggleSort("order")}>
                Order <span style={styles.sortIcon}>{sortIndicator("order")}</span>
              </th>
              <th style={styles.thSort} onClick={() => toggleSort("created_at")}>
                Created <span style={styles.sortIcon}>{sortIndicator("created_at")}</span>
              </th>
              <th style={styles.thSort} onClick={() => toggleSort("issued_at")}>
                Issued <span style={styles.sortIcon}>{sortIndicator("issued_at")}</span>
              </th>
              <th style={{ ...styles.thRight, cursor: "pointer" }} onClick={() => toggleSort("total")}>
                Total <span style={styles.sortIcon}>{sortIndicator("total")}</span>
              </th>
              <th style={styles.thRight} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const invoiceNum = safeStr(row.invoice_number) || shortId(row.id);
              const orderNum = safeStr(row.orders?.order_number) || shortId(row.order_id);
              const orderLink = row.order_id ? `/portal/orders/${encodeURIComponent(String(row.order_id))}` : null;
              const st = statusKey(row.status);
              const remaining =
                typeof row.remaining === "number" && Number.isFinite(row.remaining)
                  ? Math.max(0, row.remaining)
                  : Math.max(0, (Number(row.total) || 0) - (Number(row.amount_paid) || 0));
              const totalNum = Number(row.total) || 0;
              const isVoid = st === "VOID" || st === "VOIDED";
              const canPay =
                !isVoid &&
                remaining > 0.005 &&
                ["ISSUED", "SENT", "PARTIALLY_PAID"].includes(st);
              const showPaidBadge =
                !isVoid &&
                remaining <= 0.005 &&
                ["ISSUED", "SENT", "PARTIALLY_PAID", "PAID"].includes(st) &&
                (st === "PAID" || totalNum > 0.005);
              return (
                <tr key={row.id}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 900 }}>{invoiceNum}</div>
                  </td>
                  <td style={styles.td}>
                    <span style={pill(statusLabel(row.status))}>{statusLabel(row.status)}</span>
                  </td>
                  <td style={styles.td}>
                    {orderLink ? (
                      <Link href={orderLink} style={styles.link}>
                        {orderNum}
                      </Link>
                    ) : (
                      orderNum
                    )}
                  </td>
                  <td style={styles.td}>{dateTime(row.created_at)}</td>
                  <td style={styles.td}>{dateTime(row.issued_at)}</td>
                  <td style={styles.tdRight}>{money(row.total)}</td>
                  <td style={styles.tdRight}>
                    <div style={styles.actions}>
                      <Link href={`/portal/invoices/${encodeURIComponent(row.id)}`} style={styles.viewBtn}>
                        View
                      </Link>
                      {canPay ? (
                        <Link
                          href={`/portal/invoices/${encodeURIComponent(row.id)}/pay`}
                          style={styles.payBtn}
                        >
                          Pay
                        </Link>
                      ) : showPaidBadge ? (
                        <span
                          style={{
                            ...styles.viewBtn,
                            border: "1px solid rgba(21,128,61,0.35)",
                            background: "rgba(21,128,61,0.1)",
                            color: "#15803d",
                            cursor: "default",
                          }}
                        >
                          Paid
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.empty}>
                  {initialRows.length === 0 ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontWeight: 900 }}>No invoices yet.</div>
                      <div style={{ opacity: 0.75 }}>
                        When orders are invoiced, they will appear here for {accountName}.
                      </div>
                      <Link href="/portal/orders" style={styles.viewBtn}>
                        Go to Orders
                      </Link>
                    </div>
                  ) : (
                    "No invoices match your filters."
                  )}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div style={styles.footer}>Tip: Click View to open the invoice detail.</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: 18,
    overflow: "hidden",
    background: "var(--surface)",
    boxShadow: "var(--shadow-1)",
  },

  controls: {
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },

  meta: {
    fontSize: 13,
    color: "var(--muted)",
  },

  filters: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },

  searchRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },

  search: {
    minWidth: 220,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    fontSize: 14,
  },

  select: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    fontSize: 14,
    background: "var(--surface)",
  },

  resetBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    fontSize: 13,
    fontWeight: 900,
    cursor: "pointer",
  },

  summaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    padding: 14,
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    background: "rgba(0,0,0,0.02)",
  },

  summaryCard: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    display: "grid",
    gap: 6,
  },

  summaryLabel: {
    fontSize: 12,
    fontWeight: 900,
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  summaryValue: {
    fontSize: 16,
    fontWeight: 950,
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

  thSort: {
    textAlign: "left",
    padding: 12,
    fontSize: 12,
    fontWeight: 950,
    background: "rgba(0,0,0,0.03)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    whiteSpace: "nowrap",
    cursor: "pointer",
    userSelect: "none",
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

  sortIcon: {
    marginLeft: 6,
    fontSize: 11,
    opacity: 0.6,
  },

  link: {
    textDecoration: "none",
    fontWeight: 900,
    color: "var(--brand-700)",
  },

  viewBtn: {
    textDecoration: "none",
    fontWeight: 950,
    padding: "6px 8px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(0,0,0,0.02)",
    whiteSpace: "nowrap",
    display: "inline-block",
    fontSize: 12,
  },

  payBtn: {
    textDecoration: "none",
    fontWeight: 950,
    padding: "6px 8px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.18)",
    background: "#111",
    color: "white",
    whiteSpace: "nowrap",
    display: "inline-block",
    fontSize: 12,
  },

  actions: {
    display: "inline-flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },

  empty: {
    padding: 18,
    opacity: 0.7,
  },

  footer: {
    padding: 12,
    borderTop: "1px solid rgba(0,0,0,0.08)",
    opacity: 0.75,
    fontSize: 12,
  },
};
