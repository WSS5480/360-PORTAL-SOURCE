// src/app/portal/orders/ui/PortalOrdersListClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatOrderStatusLabel } from "@/lib/formatStatusLabel";

export type InvoiceRow = {
  id?: string | null;
  status?: string | null;
  invoice_number?: string | null;
  created_at?: string | null;
};

export type OrderRow = {
  id: string;
  order_number?: string | null;
  status?: string | null;
  subtotal?: number | null;
  shipping_total?: number | null;
  total?: number | null;
  created_at?: string | null;
  placed_at?: string | null;
  placed_by?: { user_id: string; full_name: string | null; email: string | null } | null;
  placed_by_contact?: { id: string; full_name: string | null; email: string | null } | null;
  invoices?: InvoiceRow[] | InvoiceRow | null;
  fulfillments?: Array<{
    id?: string | null;
    status?: string | null;
    fulfillment_source?: string | null;
    created_at?: string | null;
    metadata?: any;
  }> | null;
};

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function money(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function dateTime(v: unknown) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function shortId(id?: string | null) {
  const s = safeStr(id).trim();
  if (!s) return "—";
  return s.length > 10 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

/** Prefer login email for “Placed by” (name is secondary). */
function displayPlacedBy(p?: { full_name: string | null; email: string | null } | null) {
  if (!p) return "—";
  const email = String(p.email ?? "").trim();
  if (email) return email;
  const name = String(p.full_name ?? "").trim();
  if (name) return name;
  return "—";
}

function getPackingSlipFulfillment(row: OrderRow) {
  const list = Array.isArray(row.fulfillments) ? row.fulfillments : [];
  const candidates = list
    .map((f) => {
      const meta = f?.metadata && typeof f.metadata === "object" ? f.metadata : {};
      const slip = meta?.packing_slip && typeof meta.packing_slip === "object" ? meta.packing_slip : null;
      const path = safeStr(slip?.path);
      return {
        id: safeStr(f?.id),
        created_at: safeStr(f?.created_at),
        path,
      };
    })
    .filter((f) => f.id && f.path);

  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
  return candidates[0];
}

function orderPill(status: string): React.CSSProperties {
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

  const s = String(status || "").toUpperCase();
  if (s === "DRAFT") return { ...base, background: "rgba(0,0,0,0.04)" };
  if (s === "CONFIRMED") return { ...base, background: "var(--brand-050)", borderColor: "color-mix(in srgb, var(--brand-600) 22%, var(--border))" };
  if (s === "LOCKED") return { ...base, background: "rgba(0,0,0,0.08)" };
  if (s === "FULFILLING") return { ...base, background: "rgba(245, 158, 11, 0.16)" };
  if (s === "SENT") return { ...base, background: "rgba(13, 110, 253, 0.10)" };
  if (s === "INVOICED") return { ...base, background: "rgba(13, 110, 253, 0.12)" };
  if (s === "PARTIALLY_PAID") return { ...base, background: "rgba(255,193,7,0.18)" };
  if (s === "PAID") return { ...base, background: "rgba(16, 185, 129, 0.16)" };
  if (s === "COMPLETED") return { ...base, background: "rgba(13, 110, 253, 0.12)" };
  if (s === "CANCELLED" || s === "DENIED") return { ...base, background: "rgba(220, 38, 38, 0.12)" };
  return base;
}

function invoicePill(status: string): React.CSSProperties {
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

  const s = String(status || "").toUpperCase();
  if (s === "DRAFT") return { ...base, background: "rgba(0,0,0,0.04)" };
  if (s === "ISSUED") return { ...base, background: "var(--brand-050)", borderColor: "color-mix(in srgb, var(--brand-600) 22%, var(--border))" };
  if (s === "SENT") return { ...base, background: "rgba(13, 110, 253, 0.10)" };
  if (s === "PAID") return { ...base, background: "rgba(16, 185, 129, 0.16)" };
  if (s === "VOID") return { ...base, background: "rgba(220, 38, 38, 0.12)" };
  return base;
}

const statusLabel = (s: string | null | undefined) => formatOrderStatusLabel(s);
const statusKey = (s: string | null | undefined) => safeStr(s).toUpperCase();

const OPEN_STATUSES = ["DRAFT", "SENT", "CONFIRMED", "FULFILLING", "LOCKED"];
const CANCELLED_STATUSES = ["CANCELLED", "DENIED"];

export default function PortalOrdersListClient({
  initialRows,
  canCreate,
}: {
  initialRows: OrderRow[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const syncRef = useRef(false);

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [status, setStatus] = useState(() => searchParams.get("status") ?? "all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<"all" | "open" | "draft" | "completed" | "cancelled">(
    () => (searchParams.get("quick") as "all" | "open" | "draft" | "completed" | "cancelled") ?? "all"
  );
  const [sortKey, setSortKey] = useState(() => searchParams.get("sort") ?? "placed_at");
  const [sortDir, setSortDir] = useState(() => searchParams.get("dir") ?? "desc");
  const [packingSlipBusyId, setPackingSlipBusyId] = useState<string | null>(null);
  const [packingSlipError, setPackingSlipError] = useState<string | null>(null);

  useEffect(() => {
    if (syncRef.current) return;
    const hasParams = searchParams.toString().length > 0;
    if (hasParams) return;

    try {
      const raw = window.localStorage.getItem("portalOrdersFilters");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        q?: string;
        status?: string;
        quick?: string;
        sort?: string;
        dir?: string;
      };
      if (parsed.q) setQuery(parsed.q);
      if (parsed.status) setStatus(parsed.status);
      if (parsed.quick) setQuickFilter(parsed.quick as typeof quickFilter);
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
      if (quickFilter === "open" && !OPEN_STATUSES.includes(rowStatusKey)) return false;
      if (quickFilter === "draft" && rowStatusKey !== "DRAFT") return false;
      if (quickFilter === "completed" && rowStatusKey !== "COMPLETED") return false;
      if (quickFilter === "cancelled" && !CANCELLED_STATUSES.includes(rowStatusKey)) return false;

      const rowStatus = statusLabel(row.status);
      if (status !== "all" && rowStatus !== status) return false;

      if (!q) return true;
      const invoice = Array.isArray(row.invoices) ? row.invoices[0] : row.invoices;

      const haystack = [
        safeStr(row.order_number),
        safeStr(row.status),
        safeStr(row.id),
        safeStr(invoice?.invoice_number),
        safeStr(invoice?.status),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [initialRows, query, status, quickFilter]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;

    const getValue = (row: OrderRow) => {
      if (sortKey === "order_number") return safeStr(row.order_number) || safeStr(row.id);
      if (sortKey === "status") return statusLabel(row.status);
      if (sortKey === "invoice") {
        const invoice = Array.isArray(row.invoices) ? row.invoices[0] : row.invoices;
        return statusLabel(invoice?.status);
      }
      if (sortKey === "created_at") return row.created_at ? new Date(row.created_at).getTime() : 0;
      if (sortKey === "placed_at") {
        const raw = row.placed_at || row.created_at;
        return raw ? new Date(raw).getTime() : 0;
      }
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

  async function openPackingSlip(fulfillmentId: string) {
    if (!fulfillmentId) return;
    setPackingSlipBusyId(fulfillmentId);
    setPackingSlipError(null);
    try {
      const res = await fetch(`/api/portal/fulfillments/${encodeURIComponent(fulfillmentId)}/packing-slip`, {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));
      if (!res.ok || !data?.ok) {
        setPackingSlipError(data?.error || `Request failed (${res.status})`);
        return;
      }
      if (!data?.url) {
        setPackingSlipError("Packing slip URL not available yet.");
        return;
      }
      window.open(String(data.url), "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setPackingSlipError(e?.message ? String(e.message) : "Network error");
    } finally {
      setPackingSlipBusyId(null);
    }
  }

  const counts = useMemo(() => {
    return {
      total: initialRows.length,
      open: initialRows.filter((o) => OPEN_STATUSES.includes(statusKey(o.status))).length,
      draft: initialRows.filter((o) => statusKey(o.status) === "DRAFT").length,
      completed: initialRows.filter((o) => statusKey(o.status) === "COMPLETED").length,
      cancelled: initialRows.filter((o) => CANCELLED_STATUSES.includes(statusKey(o.status))).length,
    };
  }, [initialRows]);

  const summary = useMemo(() => {
    const totalValue = filtered.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
    const average = filtered.length ? totalValue / filtered.length : 0;
    const lastSubmitted = filtered.reduce<string | null>((latest, row) => {
      if (!row.placed_at) return latest;
      if (!latest) return row.placed_at;
      const a = new Date(latest).getTime();
      const b = new Date(row.placed_at).getTime();
      return b > a ? row.placed_at : latest;
    }, null);

    return {
      totalValue,
      average,
      lastSubmitted,
    };
  }, [filtered]);

  function updateQueryParams(next: { q?: string; status?: string; quick?: string; sort?: string; dir?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.q !== undefined) {
      next.q ? params.set("q", next.q) : params.delete("q");
    }
    if (next.status !== undefined) {
      next.status && next.status !== "all" ? params.set("status", next.status) : params.delete("status");
    }
    if (next.quick !== undefined) {
      next.quick && next.quick !== "all" ? params.set("quick", next.quick) : params.delete("quick");
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
        "portalOrdersFilters",
        JSON.stringify({ q: query, status, quick: quickFilter, sort: sortKey, dir: sortDir })
      );
    } catch {
      // ignore
    }
  }, [query, status, quickFilter, sortKey, sortDir]);

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
        <div style={styles.controlsHeader}>
          <div style={{ fontWeight: 950, fontSize: 17, letterSpacing: -0.02 }}>Order history</div>
          <div style={styles.meta}>
            Showing <b>{filtered.length}</b> of <b>{initialRows.length}</b> orders
          </div>
        </div>

        <div style={styles.filterPanel}>
          <div style={styles.filterPanelLabel}>Filters</div>
          <div style={styles.quickFilters}>
            {[
              { key: "all", label: "All", count: counts.total },
              { key: "open", label: "Open", count: counts.open },
              { key: "draft", label: "Drafts", count: counts.draft },
              { key: "completed", label: "Completed", count: counts.completed },
              { key: "cancelled", label: "Cancelled", count: counts.cancelled },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  const next = item.key as typeof quickFilter;
                  setQuickFilter(next);
                  updateQueryParams({ quick: next });
                }}
                style={{
                  ...styles.quickFilterBtn,
                  ...(quickFilter === item.key ? styles.quickFilterBtnActive : null),
                }}
              >
                {item.label} <span style={styles.quickFilterCount}>{item.count}</span>
              </button>
            ))}
          </div>

          <div style={styles.filterDivider} />

          <div className="portal-search-full-mobile" style={styles.searchToolbar}>
            <div style={styles.fieldGroup}>
              <label htmlFor="portal-orders-q" style={styles.fieldLabel}>
                Search
              </label>
              <input
                id="portal-orders-q"
                style={styles.search}
                placeholder="Order #, invoice, status…"
                value={query}
                onChange={(e) => {
                  const next = e.target.value;
                  setQuery(next);
                  updateQueryParams({ q: next });
                }}
                aria-label="Search orders"
              />
            </div>
            <div style={styles.fieldGroup}>
              <label htmlFor="portal-orders-status" style={styles.fieldLabel}>
                Status
              </label>
              <select
                id="portal-orders-status"
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
            </div>
            <button
              type="button"
              style={{ ...styles.resetBtn, alignSelf: "flex-end" }}
              onClick={() => {
                setQuery("");
                setStatus("all");
                setQuickFilter("all");
                setSortKey("placed_at");
                setSortDir("desc");
                updateQueryParams({ q: "", status: "all", quick: "all", sort: "placed_at", dir: "desc" });
              }}
            >
              Reset
            </button>
          </div>
          <div style={styles.filterHint}>Tip: click a column header to change sort.</div>
        </div>
      </div>

      <div style={styles.bulkRow}>
        <div style={styles.bulkLegend}>
          <span style={{ fontSize: 11, fontWeight: 900, color: "var(--muted)", marginRight: 6 }}>Row colors</span>
          <span style={{ ...styles.legendPill, background: "rgba(0,0,0,0.04)" }}>Draft</span>
          <span style={{ ...styles.legendPill, background: "var(--brand-050)" }}>Open</span>
          <span style={{ ...styles.legendPill, background: "rgba(16, 185, 129, 0.16)" }}>Completed</span>
          <span style={{ ...styles.legendPill, background: "rgba(220, 38, 38, 0.12)" }}>Cancelled</span>
        </div>
        <div style={styles.bulkActions}>
          <button
            type="button"
            style={styles.resetBtn}
            onClick={() => {
              const header = ["Order ID", "Order #", "Status", "Invoice Status", "Submitted", "Placed By", "Total"];
              const rows = sorted.map((row) => {
                const invoice = Array.isArray(row.invoices) ? row.invoices[0] : row.invoices;
                return [
                  row.id,
                  safeStr(row.order_number),
                  statusLabel(row.status),
                  statusLabel(invoice?.status),
                  dateTime(row.placed_at),
                    displayPlacedBy(row.placed_by_contact ?? row.placed_by),
                  money(row.total),
                ];
              });
              const csv = [header, ...rows]
                .map((r) => r.map((v) => `"${String(v || "").replace(/"/g, '""')}"`).join(","))
                .join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "orders.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export CSV
          </button>
          <button
            type="button"
            style={styles.resetBtn}
            onClick={() => {
              const invoiceIds = sorted
                .map((row) => (Array.isArray(row.invoices) ? row.invoices[0] : row.invoices))
                .map((inv) => inv?.id)
                .filter(Boolean) as string[];
              if (!invoiceIds.length) return;
              invoiceIds.forEach((id) => {
                window.open(`/portal/invoices/${encodeURIComponent(String(id))}`, "_blank", "noopener,noreferrer");
              });
            }}
          >
            Open Invoices
          </button>
        </div>
      </div>

      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total value</div>
          <div style={styles.summaryValue}>{money(summary.totalValue)}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Average order</div>
          <div style={styles.summaryValue}>{money(summary.average)}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Last submitted</div>
          <div style={styles.summaryValue}>{summary.lastSubmitted ? dateTime(summary.lastSubmitted) : "—"}</div>
        </div>
      </div>

      <div className="portal-table-wrap" style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thSort} onClick={() => toggleSort("order_number")}>
                Order <span style={styles.sortIcon}>{sortIndicator("order_number")}</span>
              </th>
              <th style={styles.thSort} onClick={() => toggleSort("status")}>
                Status <span style={styles.sortIcon}>{sortIndicator("status")}</span>
              </th>
              <th style={styles.th}>Docs</th>
              <th style={styles.thSort} onClick={() => toggleSort("placed_at")}>
                Submitted <span style={styles.sortIcon}>{sortIndicator("placed_at")}</span>
              </th>
              <th style={styles.th}>Placed by</th>
              <th style={{ ...styles.thRight, cursor: "pointer" }} onClick={() => toggleSort("total")}>
                Total <span style={styles.sortIcon}>{sortIndicator("total")}</span>
              </th>
              <th style={styles.thRight} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const invoice = Array.isArray(row.invoices) ? row.invoices[0] : row.invoices;
              const invoiceStatusUpper = safeStr(invoice?.status).toUpperCase();
              const invoiceIssued =
                !!invoice?.id && ["ISSUED", "SENT", "PARTIALLY_PAID", "PAID"].includes(invoiceStatusUpper);
              const packingSlip = getPackingSlipFulfillment(row);
              const orderNum = safeStr(row.order_number) || shortId(row.id);
              return (
                <tr
                  key={row.id}
                  onMouseEnter={() => setHoveredId(row.id)}
                  onMouseLeave={() => setHoveredId((id) => (id === row.id ? null : id))}
                >
                  <td style={styles.td}>
                    <Link
                      href={`/portal/orders/${encodeURIComponent(row.id)}`}
                      style={{
                        fontWeight: 900,
                        textDecoration: "none",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      {orderNum}
                    </Link>
                  </td>
                  <td style={styles.td}>
                    <span style={orderPill(String(row.status || ""))}>{statusLabel(row.status)}</span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {packingSlip?.id ? (
                        <button
                          type="button"
                          onClick={() => openPackingSlip(packingSlip.id)}
                          disabled={packingSlipBusyId === packingSlip.id}
                          style={{
                            ...styles.viewBtn,
                            padding: "6px 10px",
                            fontSize: 12,
                            opacity: packingSlipBusyId === packingSlip.id ? 0.7 : 1,
                          }}
                        >
                          {packingSlipBusyId === packingSlip.id ? "Opening…" : "Packing slip"}
                        </button>
                      ) : (
                        <span style={styles.subtle}>No slip</span>
                      )}

                      {invoiceIssued ? (
                        <Link href={`/portal/invoices/${encodeURIComponent(String(invoice.id))}`} style={styles.viewBtn}>
                          Invoice
                        </Link>
                      ) : (
                        <span style={styles.subtle}>Invoice pending</span>
                      )}
                    </div>
                  </td>
                  <td style={styles.td}>{dateTime(row.placed_at)}</td>
                  <td style={styles.td}>{displayPlacedBy(row.placed_by_contact ?? row.placed_by)}</td>
                  <td style={styles.tdRight}>{money(row.total)}</td>
                  <td style={styles.tdRight}>
                    <div style={styles.rowActions}>
                      <Link href={`/portal/orders/${encodeURIComponent(row.id)}`} style={styles.viewBtn}>
                        Details
                      </Link>
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
                      <div style={{ fontWeight: 900 }}>No orders yet.</div>
                      <div style={{ opacity: 0.75 }}>
                        {canCreate ? "Create your first order to get started." : "You have view-only access."}
                      </div>
                      {canCreate ? (
                        <Link href="/portal/orders/new" style={styles.viewBtn}>
                          + Create Order
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    "No orders match your filters."
                  )}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {packingSlipError ? (
        <div style={{ marginTop: 10, color: "crimson", fontWeight: 900, fontSize: 13 }}>{packingSlipError}</div>
      ) : null}

      <div style={styles.footer}>Tip: Click the order # or Details to view the full order.</div>
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
    padding: 16,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: 14,
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },

  controlsHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },

  meta: {
    fontSize: 13,
    color: "var(--muted)",
  },

  filterPanel: {
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--surface) 92%, var(--background))",
    padding: 14,
    display: "grid",
    gap: 12,
  },

  filterPanelLabel: {
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: 0.06,
    textTransform: "uppercase",
    color: "var(--muted)",
  },

  filterDivider: {
    height: 1,
    background: "rgba(0,0,0,0.06)",
  },

  searchToolbar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "flex-end",
  },

  fieldGroup: {
    display: "grid",
    gap: 6,
    flex: "1 1 200px",
    minWidth: 0,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: 900,
    color: "var(--muted)",
  },

  filterHint: {
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 800,
    opacity: 0.85,
  },

  quickFilters: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  quickFilterBtn: {
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  },

  quickFilterBtnActive: {
    borderColor: "color-mix(in srgb, var(--brand-600) 35%, var(--border))",
    background: "var(--brand-050)",
    color: "var(--brand-800)",
  },

  quickFilterCount: {
    fontSize: 11,
    fontWeight: 900,
    padding: "2px 6px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.08)",
  },

  search: {
    width: "100%",
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    fontSize: 14,
    background: "var(--surface)",
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

  bulkRow: {
    padding: 12,
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  bulkLegend: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  legendPill: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  bulkActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  summaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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

  subtle: {
    fontSize: 12,
    color: "var(--muted)",
  },

  link: {
    textDecoration: "none",
    fontWeight: 900,
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
    cursor: "pointer",
  },

  rowActions: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },

  viewBtnHidden: {
    opacity: 0.0,
    pointerEvents: "none",
  },

  viewBtnVisible: {
    opacity: 1,
    pointerEvents: "auto",
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
