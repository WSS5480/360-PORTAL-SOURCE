"use client";

import Link from "next/link";
import { formatOrderStatusLabel } from "@/lib/formatStatusLabel";
import { useSearchParams } from "next/navigation";
import React, { useMemo, useState } from "react";

type OrderRow = {
  id: string;
  order_number: string | null;
  status: string | null;
  subtotal: number | null;
  shipping_total: number | null;
  total: number | null;
  total_sqcm?: number | null;
  bulk_contract_sqcm?: number | null;
  ship_now_sqcm?: number | null;
  open_fulfillment_count?: number;
  total_fulfillment_count?: number;
  created_at: string | null;
  placed_at: string | null;
  locked_at: string | null;
  accounts?: { id: string; name: string | null } | null;
  placed_by?: { user_id: string; full_name: string | null; email: string } | null;
  placed_by_contact?: { id: string; full_name: string | null; email: string } | null;
};

function safeUpper(v: any) {
  return String(v ?? "").toUpperCase();
}

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtSqcm(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function dateTime(v: any) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function displayPlacedEmail(p?: { full_name: string | null; email: string } | null) {
  if (!p) return "—";
  return String(p.email ?? "").trim() || "—";
}

/** Orders where we expect warehouse/fulfillment work once past draft/cancelled/completed. */
function needsFulfillmentAttention(o: OrderRow): boolean {
  const open = o.open_fulfillment_count ?? 0;
  if (open > 0) return true;
  const total = o.total_fulfillment_count ?? 0;
  if (total > 0) return false;
  const s = safeUpper(o.status);
  return (
    s === "CONFIRMED" ||
    s === "LOCKED" ||
    s === "FULFILLING" ||
    s === "NEEDS_INVOICE" ||
    s === "INVOICED" ||
    s === "PENDING_WIRE" ||
    s === "PAID" ||
    s === "PARTIALLY_PAID"
  );
}

function fulfillmentPill(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 950,
    border: "1px solid rgba(217,119,6,0.45)",
    background: "rgba(255,153,0,0.16)",
    color: "rgba(120,53,15,1)",
    whiteSpace: "nowrap",
  };
}

function pill(status: string | null): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    whiteSpace: "nowrap",
  };

  const s = safeUpper(status);
  if (s === "DRAFT") return { ...base, background: "rgba(0,0,0,0.04)" };
  if (s === "CONFIRMED") return { ...base, background: "rgba(13,110,253,0.14)" };
  if (s === "LOCKED") return { ...base, background: "rgba(0,0,0,0.08)" };
  if (s === "FULFILLING") return { ...base, background: "rgba(255,153,0,0.16)" };
  if (s === "INVOICED") return { ...base, background: "rgba(13,110,253,0.12)" };
  if (s === "PENDING_WIRE")
    return {
      ...base,
      background: "rgba(245, 158, 11, 0.16)",
      border: "1px solid rgba(245, 158, 11, 0.35)",
    };
  if (s === "PARTIALLY_PAID") return { ...base, background: "rgba(255,193,7,0.18)" };
  if (s === "PAID") return { ...base, background: "rgba(25,135,84,0.14)" };
  if (s === "COMPLETED") return { ...base, background: "rgba(13,110,253,0.12)" };
  if (s === "CANCELLED") return { ...base, background: "rgba(220,53,69,0.12)" };
  return base;
}

function bulkButton(disabled?: boolean): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)",
    background: disabled ? "rgba(0,0,0,0.08)" : "white",
    fontWeight: 900,
    fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

export default function AdminOrdersTableClient({ rows }: { rows: OrderRow[] }) {
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "created_at";
  const currentDir = searchParams.get("dir") === "asc" ? "asc" : "desc";

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionMsg, setActionMsg] = useState<string>("");

  const allIds = useMemo(() => rows.map((r) => String(r.id)), [rows]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.count += 1;
        acc.totalValue += Number(row.total ?? 0) || 0;
        const bulk = safeNum(row.bulk_contract_sqcm);
        const ship = safeNum(row.ship_now_sqcm);
        if (bulk > 0) {
          acc.bulkSqcm += bulk;
          acc.shipNowSqcm += ship;
        } else {
          acc.plainSqcm += Number(row.total_sqcm ?? 0) || 0;
        }
        return acc;
      },
      { count: 0, totalValue: 0, bulkSqcm: 0, shipNowSqcm: 0, plainSqcm: 0 }
    );
  }, [rows]);

  const selectedTotals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        if (!selected.has(String(row.id))) return acc;
        acc.count += 1;
        acc.totalValue += Number(row.total ?? 0) || 0;
        const bulk = safeNum(row.bulk_contract_sqcm);
        const ship = safeNum(row.ship_now_sqcm);
        if (bulk > 0) {
          acc.bulkSqcm += bulk;
          acc.shipNowSqcm += ship;
        } else {
          acc.plainSqcm += Number(row.total_sqcm ?? 0) || 0;
        }
        return acc;
      },
      { count: 0, totalValue: 0, bulkSqcm: 0, shipNowSqcm: 0, plainSqcm: 0 }
    );
  }, [rows, selected]);

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setMsg(msg: string) {
    setActionMsg(msg);
    window.setTimeout(() => setActionMsg(""), 1800);
  }

  async function copyText(text: string, label: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setMsg(`${label} copied`);
    } catch {
      setMsg("Copy failed");
    }
  }

  function openSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    ids.slice(0, 10).forEach((id) => {
      window.open(`/admin/orders/${encodeURIComponent(id)}`, "_blank");
    });
    if (ids.length > 10) setMsg("Opened first 10 orders");
  }

  function buildSortHref(key: string) {
    const next = new URLSearchParams(searchParams.toString());
    const nextDir = currentSort === key && currentDir === "asc" ? "desc" : "asc";
    next.set("sort", key);
    next.set("dir", nextDir);
    return `?${next.toString()}`;
  }

  function sortLabel(key: string) {
    if (currentSort !== key) return "↕";
    return currentDir === "asc" ? "↑" : "↓";
  }

  const selectedOrderNumbers = rows
    .filter((r) => selected.has(String(r.id)))
    .map((r) => r.order_number)
    .filter(Boolean)
    .join("\n");

  const selectedIds = Array.from(selected).join("\n");

  return (
    <>
      <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.7 }}>
          Selected: <b>{selectedTotals.count}</b>
        </span>
        <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.7 }}>
          Value: <b>{money(selectedTotals.totalValue)}</b>
        </span>
        <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.7 }} title="Line sq cm on orders; bulk purchase in parentheses for warehouse bulk orders.">
          Sq cm:{" "}
          <b>
            {selectedTotals.bulkSqcm > 0 ? (
              <>
                {fmtSqcm(selectedTotals.shipNowSqcm + selectedTotals.plainSqcm)}{" "}
                <span style={{ fontWeight: 850, opacity: 0.88 }}>({fmtSqcm(selectedTotals.bulkSqcm)} bulk)</span>
              </>
            ) : (
              fmtSqcm(selectedTotals.plainSqcm)
            )}
          </b>
        </span>
        <button type="button" style={bulkButton(selectedTotals.count === 0)} disabled={selectedTotals.count === 0} onClick={() => copyText(selectedOrderNumbers, "Order numbers")}>
          Copy order #
        </button>
        <button type="button" style={bulkButton(selectedTotals.count === 0)} disabled={selectedTotals.count === 0} onClick={() => copyText(selectedIds, "IDs")}>
          Copy IDs
        </button>
        <button type="button" style={bulkButton(selectedTotals.count === 0)} disabled={selectedTotals.count === 0} onClick={openSelected}>
          Open selected
        </button>
        <button type="button" style={bulkButton(selectedTotals.count === 0)} disabled={selectedTotals.count === 0} onClick={() => setSelected(new Set())}>
          Clear
        </button>
        {actionMsg ? <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.7 }}>{actionMsg}</span> : null}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="admin-orders-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.7 }}>
              <th style={{ padding: 12, width: 1 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th style={{ padding: 12 }}>
                <Link href={buildSortHref("order_number")} style={{ textDecoration: "none", color: "inherit", fontWeight: 900 }}>
                  Order {sortLabel("order_number")}
                </Link>
              </th>
              <th style={{ padding: 12 }}>
                <Link href={buildSortHref("status")} style={{ textDecoration: "none", color: "inherit", fontWeight: 900 }}>
                  Status {sortLabel("status")}
                </Link>
              </th>
              <th style={{ padding: 12 }}>Account</th>
              <th style={{ padding: 12 }}>Placed by (email)</th>
              <th style={{ padding: 12 }}>
                <Link href={buildSortHref("placed_at")} style={{ textDecoration: "none", color: "inherit", fontWeight: 900 }}>
                  Placed {sortLabel("placed_at")}
                </Link>
              </th>
              <th style={{ padding: 12 }}>
                <Link href={buildSortHref("total")} style={{ textDecoration: "none", color: "inherit", fontWeight: 900 }}>
                  Total {sortLabel("total")}
                </Link>
              </th>
              <th style={{ padding: 12 }}>Sq cm (bulk / ship)</th>
              <th style={{ padding: 12, width: 1 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <td style={{ padding: 12 }}>
                  <input type="checkbox" checked={selected.has(String(o.id))} onChange={() => toggleOne(String(o.id))} />
                </td>
                <td style={{ padding: 12, fontWeight: 950 }}>{o.order_number ?? "—"}</td>
                <td style={{ padding: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span style={pill(o.status)}>{formatOrderStatusLabel(o.status)}</span>
                    {needsFulfillmentAttention(o) ? (
                      <span
                        style={fulfillmentPill()}
                        title={
                          (o.open_fulfillment_count ?? 0) > 0
                            ? "At least one fulfillment is still OPEN (pick/pack/ship)."
                            : "No fulfillment records yet — create or progress fulfillment for this order."
                        }
                      >
                        Needs fulfillment
                      </span>
                    ) : null}
                  </div>
                </td>
                <td style={{ padding: 12, fontWeight: 950 }}>
                  {o.accounts?.id ? (
                    <Link
                      href={`/admin/orders?account_id=${encodeURIComponent(String(o.accounts.id))}`}
                      style={{ textDecoration: "none", fontWeight: 950, color: "inherit" }}
                    >
                      {o.accounts?.name ?? "—"}
                    </Link>
                  ) : (
                    o.accounts?.name ?? "—"
                  )}
                </td>
                <td style={{ padding: 12, fontWeight: 900, opacity: 0.9 }}>
                  {displayPlacedEmail(o.placed_by_contact ?? o.placed_by)}
                </td>
                <td style={{ padding: 12, opacity: 0.85 }}>{dateTime(o.placed_at)}</td>
                <td style={{ padding: 12, fontWeight: 950 }}>{money(o.total)}</td>
                <td style={{ padding: 12, fontWeight: 950 }} title={safeNum(o.bulk_contract_sqcm) > 0 ? "Line sq cm (bulk contract in parentheses)" : undefined}>
                  {safeNum(o.bulk_contract_sqcm) > 0 ? (
                    <>
                      {fmtSqcm(o.ship_now_sqcm)}
                      <span style={{ fontWeight: 850, opacity: 0.82 }}> ({fmtSqcm(o.bulk_contract_sqcm)} bulk)</span>
                    </>
                  ) : (
                    fmtSqcm(o.total_sqcm)
                  )}
                </td>
                <td style={{ padding: 12 }}>
                  <Link
                    href={`/admin/orders/${encodeURIComponent(String(o.id))}`}
                    style={{
                      textDecoration: "none",
                      fontWeight: 950,
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "rgba(0,0,0,0.02)",
                      whiteSpace: "nowrap",
                      display: "inline-block",
                      color: "inherit",
                    }}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 18, opacity: 0.75 }}>
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.02)" }}>
              <td colSpan={6} style={{ padding: 12, fontWeight: 900 }}>
                Summary
              </td>
              <td style={{ padding: 12, fontWeight: 950 }}>{money(totals.totalValue)}</td>
              <td style={{ padding: 12, fontWeight: 950, lineHeight: 1.35 }} title="Totals mirror the column: line sq cm first, bulk contract in parentheses when applicable.">
                {totals.bulkSqcm > 0 ? (
                  <>
                    <b>{fmtSqcm(totals.shipNowSqcm + totals.plainSqcm)}</b>
                    <span style={{ fontWeight: 850, opacity: 0.82 }}> ({fmtSqcm(totals.bulkSqcm)} bulk)</span>
                  </>
                ) : (
                  fmtSqcm(totals.plainSqcm)
                )}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
