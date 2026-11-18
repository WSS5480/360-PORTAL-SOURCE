"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { formatStatusLabel } from "@/lib/formatStatusLabel";

export type InvoiceRow = {
  id: string;
  invoice_number?: string | null;
  status?: string | null;
  total?: number | null;
  amount_paid?: number | null;
  created_at?: string | null;
  issued_at?: string | null;
  metadata?: Record<string, unknown> | null;
  order_id?: string | null;
  account_id?: string | null;
  payment_terms_days?: number | null;
  payment_terms_label?: string | null;
  /** Server: canonical days for due-date math (order snapshot + account fallback). */
  effective_payment_terms_days?: number | null;
  orders?: {
    order_number?: string | null;
    bulk_mode?: boolean | null;
    payment_terms_days_snapshot?: number | null;
    payment_terms_label_snapshot?: string | null;
  } | null;
  accounts?: { name?: string | null } | null;
};

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function money(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "—";
}

function dateTime(v: any) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function shortId(v: any) {
  const s = safeStr(v);
  if (!s) return "—";
  return s.length > 10 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function pill(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    whiteSpace: "nowrap",
  };
  const s = safeStr(status).toUpperCase();
  if (s === "DRAFT") return { ...base, background: "rgba(0,0,0,0.05)" };
  if (s === "ISSUED") return { ...base, background: "rgba(13,110,253,0.14)" };
  if (s === "SENT") return { ...base, background: "rgba(13,110,253,0.10)" };
  if (s === "PAID") return { ...base, background: "rgba(25,135,84,0.14)" };
  if (s === "PARTIALLY_PAID") return { ...base, background: "rgba(255,193,7,0.18)" };
  if (s === "VOID" || s === "VOIDED") return { ...base, background: "rgba(220,53,69,0.12)" };
  return base;
}

function buttonStyle(disabled?: boolean): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: disabled ? "rgba(0,0,0,0.08)" : "white",
    fontWeight: 900,
    fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function statusChip(status: string, active: boolean): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.12)",
    background: active ? "rgba(0,0,0,0.08)" : "white",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
  };
}

export default function AdminInvoicesTableClient({
  rows,
  initialAccountId,
  initialStatusFilter,
}: {
  rows: InvoiceRow[];
  initialAccountId?: string;
  initialStatusFilter?: string;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || "all");
  const [issuedFrom, setIssuedFrom] = useState("");
  const [issuedTo, setIssuedTo] = useState("");
  const [accountFilter, setAccountFilter] = useState(initialAccountId || "");
  const [sortKey, setSortKey] = useState("issued_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string>("");

  const statusOptions = useMemo(() => {
    const base = ["DRAFT", "ISSUED", "SENT", "PARTIALLY_PAID", "PAID", "VOID", "VOIDED"];
    const set = new Set<string>(base);
    rows.forEach((r) => {
      const s = safeStr(r.status);
      if (s) set.add(s.toUpperCase());
    });
    return ["all", ...Array.from(set)];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (accountFilter && safeStr(row.account_id) !== accountFilter) return false;
      if (statusFilter !== "all" && safeStr(row.status).toUpperCase() !== statusFilter) return false;

      if (issuedFrom) {
        const t = row.issued_at ? new Date(row.issued_at).getTime() : 0;
        const min = new Date(issuedFrom).getTime();
        if (t < min) return false;
      }
      if (issuedTo) {
        const t = row.issued_at ? new Date(row.issued_at).getTime() : 0;
        const max = new Date(issuedTo + "T23:59:59").getTime();
        if (t > max) return false;
      }

      if (!q) return true;
      const haystack = [
        safeStr(row.invoice_number),
        safeStr(row.id),
        safeStr(row.status),
        safeStr(row.orders?.order_number),
        safeStr(row.order_id),
        safeStr(row.accounts?.name),
        safeStr(row.account_id),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query, statusFilter, issuedFrom, issuedTo, accountFilter]);

  const accountOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const r of rows) {
      const id = safeStr(r.account_id);
      if (!id) continue;
      const name = safeStr(r.accounts?.name) || id;
      if (!map.has(id)) map.set(id, { id, name });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const sorted = useMemo(() => {
    const next = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    next.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return next;
  }, [filtered, sortKey, sortDir]);

  const allIds = useMemo(() => sorted.map((r) => r.id), [sorted]);
  const selectedIds = useMemo(() => allIds.filter((id) => selected[id]), [allIds, selected]);
  const allSelected = allIds.length > 0 && selectedIds.length === allIds.length;

  function calcSummary(input: InvoiceRow[]) {
    const now = new Date();
    const acc = {
      totalValue: 0,
      rows: 0,
      issuedCount: 0,
      issuedTotal: 0,
      paidCount: 0,
      paidTotal: 0,
      partialCount: 0,
      partialTotal: 0,
      draftCount: 0,
      draftTotal: 0,
      outstandingTotal: 0,
      overdueTotal: 0,
    };

    for (const r of input) {
      const status = safeStr(r.status).toUpperCase();
      const total = safeNum(r.total);
      const paidRaw = Number(r.amount_paid);
      const paid = Number.isFinite(paidRaw) ? paidRaw : status === "PAID" ? total : 0;
      const isVoided = status === "VOID" || status === "VOIDED";
      const outstanding = isVoided ? 0 : Math.max(0, total - paid);

      const termsDaysRaw = Number(r.effective_payment_terms_days ?? r.payment_terms_days);
      const termsDays = Number.isFinite(termsDaysRaw) ? termsDaysRaw : 30;
      const baseDateRaw = safeStr(r.issued_at || r.created_at);
      const baseDate = baseDateRaw ? new Date(baseDateRaw) : null;
      const dueDate = baseDate && !Number.isNaN(baseDate.getTime()) ? addDays(baseDate, termsDays) : null;
      const isOverdue = !!dueDate && outstanding > 0 && now.getTime() > dueDate.getTime();

      acc.rows += 1;
      acc.totalValue += total;
      acc.outstandingTotal += outstanding;
      acc.overdueTotal += isOverdue ? outstanding : 0;

      if (status === "DRAFT") {
        acc.draftCount += 1;
        acc.draftTotal += total;
      } else if (status === "ISSUED" || status === "SENT") {
        acc.issuedCount += 1;
        acc.issuedTotal += total;
      } else if (status === "PAID") {
        acc.paidCount += 1;
        acc.paidTotal += total;
      } else if (status === "PARTIALLY_PAID") {
        acc.partialCount += 1;
        acc.partialTotal += total;
      }
    }

    return acc;
  }

  const summaryAll = useMemo(() => calcSummary(rows), [rows]);
  const summaryFiltered = useMemo(() => calcSummary(filtered), [filtered]);

  const filteredAccountName = useMemo(() => {
    if (!accountFilter) return "";
    const match = rows.find((r) => safeStr(r.account_id) === accountFilter);
    return safeStr(match?.accounts?.name) || "";
  }, [accountFilter, rows]);

  function getSortValue(row: InvoiceRow, key: string) {
    if (key === "invoice") return safeStr(row.invoice_number) || safeStr(row.id);
    if (key === "status") return safeStr(row.status);
    if (key === "account") return safeStr(row.accounts?.name);
    if (key === "order") return safeStr(row.orders?.order_number) || safeStr(row.order_id);
    if (key === "issued_at") return row.issued_at ? new Date(row.issued_at).getTime() : 0;
    if (key === "total") return Number(row.total) || 0;
    return "";
  }

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function setAll(checked: boolean) {
    const next: Record<string, boolean> = {};
    allIds.forEach((id) => (next[id] = checked));
    setSelected(next);
  }

  async function setStatusForSelected(nextStatus: "DRAFT" | "ISSUED" | "VOID") {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    setBulkMsg("");
    try {
      let okCount = 0;
      for (const id of selectedIds) {
        const fd = new FormData();
        fd.set("status", nextStatus);
        const res = await fetch(`/api/admin/invoices/${encodeURIComponent(id)}/status`, {
          method: "POST",
          body: fd,
          headers: { accept: "application/json" },
        });
        if (res.ok) okCount += 1;
      }
      setBulkMsg(`Updated ${okCount}/${selectedIds.length} invoices to ${nextStatus}.`);
      window.location.reload();
    } catch (e: any) {
      setBulkMsg(e?.message ? String(e.message) : "Bulk update failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          borderRadius: 22,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(900px 240px at 12% 0%, rgba(30, 136, 229, 0.35), transparent 60%)," +
            "linear-gradient(180deg, #0b1425, #0a0f1a)",
          color: "white",
          boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase" }}>
              Admin • Invoices
            </div>
            <div style={{ fontSize: 26, fontWeight: 950, marginTop: 6, letterSpacing: -0.3 }}>Invoices</div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
              Search, filter, and manage invoices across accounts.
            </div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.9, textAlign: "right" }}>
            Total value: <b>{money(summaryAll.totalValue)}</b>
            {accountFilter || query || statusFilter !== "all" || issuedFrom || issuedTo ? (
              <div style={{ marginTop: 4, fontSize: 11, opacity: 0.8 }}>
                Filtered value: <b>{money(summaryFiltered.totalValue)}</b>
              </div>
            ) : null}
          </div>
        </div>
        <div style={{ padding: "0 18px 12px", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={summaryCard(true, "issued")}>
            <div style={summaryLabel(true)}>Issued</div>
            <div style={summaryValue(true)}>{summaryAll.issuedCount}</div>
            <div style={summarySubValue(true)}>{money(summaryAll.issuedTotal)}</div>
          </div>
          <div style={summaryCard(true, "paid")}>
            <div style={summaryLabel(true)}>Paid</div>
            <div style={summaryValue(true)}>{summaryAll.paidCount}</div>
            <div style={summarySubValue(true)}>{money(summaryAll.paidTotal)}</div>
          </div>
          <div style={summaryCard(true, "partial")}>
            <div style={summaryLabel(true)}>Partially paid</div>
            <div style={summaryValue(true)}>{summaryAll.partialCount}</div>
            <div style={summarySubValue(true)}>{money(summaryAll.partialTotal)}</div>
          </div>
          <div style={summaryCard(true, "outstanding")}>
            <div style={summaryLabel(true)}>Outstanding</div>
            <div style={summaryValue(true)}>{money(summaryAll.outstandingTotal)}</div>
            <div style={summarySubValue(true)}>All unpaid balance</div>
          </div>
          <div style={summaryCard(true, "overdue")}>
            <div style={summaryLabel(true)}>Overdue</div>
            <div style={summaryValue(true)}>{money(summaryAll.overdueTotal)}</div>
            <div style={summarySubValue(true)}>Past terms</div>
          </div>
          <div style={summaryCard(true, "draft")}>
            <div style={summaryLabel(true)}>Drafts</div>
            <div style={summaryValue(true)}>{summaryAll.draftCount}</div>
            <div style={summarySubValue(true)}>{money(summaryAll.draftTotal)}</div>
          </div>
          <div style={summaryCard(true, "neutral")}>
            <div style={summaryLabel(true)}>Rows</div>
            <div style={summaryValue(true)}>{summaryAll.rows}</div>
          </div>
        </div>
        {(accountFilter || query || statusFilter !== "all" || issuedFrom || issuedTo) && (
          <>
            <div style={{ padding: "0 18px 4px", fontSize: 11, opacity: 0.8, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase" }}>
              Filtered {accountFilter ? `• ${filteredAccountName || accountFilter}` : ""}
            </div>
            <div style={{ padding: "0 18px 18px", display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={summaryCard(true, "issued")}>
              <div style={summaryLabel(true)}>Issued</div>
              <div style={summaryValue(true)}>{summaryFiltered.issuedCount}</div>
                <div style={summarySubValue(true)}>
                  {money(summaryFiltered.issuedTotal)} · {pct(summaryFiltered.issuedTotal, summaryAll.issuedTotal)}
                </div>
            </div>
              <div style={summaryCard(true, "paid")}>
              <div style={summaryLabel(true)}>Paid</div>
              <div style={summaryValue(true)}>{summaryFiltered.paidCount}</div>
                <div style={summarySubValue(true)}>
                  {money(summaryFiltered.paidTotal)} · {pct(summaryFiltered.paidTotal, summaryAll.paidTotal)}
                </div>
            </div>
              <div style={summaryCard(true, "partial")}>
              <div style={summaryLabel(true)}>Partially paid</div>
              <div style={summaryValue(true)}>{summaryFiltered.partialCount}</div>
                <div style={summarySubValue(true)}>
                  {money(summaryFiltered.partialTotal)} · {pct(summaryFiltered.partialTotal, summaryAll.partialTotal)}
                </div>
            </div>
              <div style={summaryCard(true, "outstanding")}>
              <div style={summaryLabel(true)}>Outstanding</div>
              <div style={summaryValue(true)}>{money(summaryFiltered.outstandingTotal)}</div>
                <div style={summarySubValue(true)}>
                  {pct(summaryFiltered.outstandingTotal, summaryAll.outstandingTotal)} of all outstanding
                </div>
            </div>
              <div style={summaryCard(true, "overdue")}>
              <div style={summaryLabel(true)}>Overdue</div>
              <div style={summaryValue(true)}>{money(summaryFiltered.overdueTotal)}</div>
                <div style={summarySubValue(true)}>
                  {pct(summaryFiltered.overdueTotal, summaryAll.overdueTotal)} of all overdue
                </div>
            </div>
              <div style={summaryCard(true, "draft")}>
              <div style={summaryLabel(true)}>Drafts</div>
              <div style={summaryValue(true)}>{summaryFiltered.draftCount}</div>
                <div style={summarySubValue(true)}>
                  {money(summaryFiltered.draftTotal)} · {pct(summaryFiltered.draftTotal, summaryAll.draftTotal)}
                </div>
            </div>
              <div style={summaryCard(true, "neutral")}>
              <div style={summaryLabel(true)}>Rows</div>
              <div style={summaryValue(true)}>{summaryFiltered.rows}</div>
                <div style={summarySubValue(true)}>{pct(summaryFiltered.rows, summaryAll.rows)} of total</div>
            </div>
            </div>
          </>
        )}
      </div>

      <div
        style={{
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 16,
          background: "white",
          padding: 12,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoice #, order #, account…"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              minWidth: 280,
              fontWeight: 900,
            }}
          />
          <select
            value={accountFilter || "all"}
            onChange={(e) => setAccountFilter(e.target.value === "all" ? "" : e.target.value)}
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", fontWeight: 900 }}
          >
            <option value="all">All accounts</option>
            {accountOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", fontWeight: 900 }}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : formatStatusLabel(s)}
              </option>
            ))}
          </select>
          <input type="date" value={issuedFrom} onChange={(e) => setIssuedFrom(e.target.value)} style={buttonStyle()} />
          <input type="date" value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} style={buttonStyle()} />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12, opacity: 0.75, flexWrap: "wrap" }}>
          Results: <b>{filtered.length}</b>
          {accountFilter ? (
            <span>
              · Account filter <b>{filteredAccountName || accountFilter}</b>{" "}
              <button type="button" style={buttonStyle()} onClick={() => setAccountFilter("")}>
                Clear
              </button>
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {statusOptions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            style={statusChip(s, statusFilter === s)}
          >
            {s === "all" ? "All" : formatStatusLabel(s)}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>
          Selected: <b>{selectedIds.length}</b>
        </span>
        <button type="button" style={buttonStyle(!selectedIds.length)} disabled={!selectedIds.length} onClick={() => setSelected({})}>
          Clear
        </button>
        <button
          type="button"
          style={buttonStyle(!selectedIds.length)}
          disabled={!selectedIds.length}
          onClick={() => selectedIds.forEach((id) => window.open(`/admin/invoices/${encodeURIComponent(id)}`, "_blank"))}
        >
          Open selected
        </button>
        <button type="button" style={buttonStyle(!selectedIds.length)} disabled={!selectedIds.length} onClick={() => setStatusForSelected("ISSUED")}>
          Mark ISSUED
        </button>
        <button type="button" style={buttonStyle(!selectedIds.length)} disabled={!selectedIds.length} onClick={() => setStatusForSelected("DRAFT")}>
          Mark DRAFT
        </button>
        <button type="button" style={buttonStyle(!selectedIds.length)} disabled={!selectedIds.length} onClick={() => setStatusForSelected("VOID")}>
          Mark VOID
        </button>
        <button
          type="button"
          style={buttonStyle(false)}
          onClick={() => {
            const header = ["Invoice ID", "Invoice #", "Status", "Account", "Order", "Issued", "Total"];
            const rowsCsv = filtered.map((r) => [
              r.id,
              safeStr(r.invoice_number),
              safeStr(r.status),
              safeStr(r.accounts?.name),
              safeStr(r.orders?.order_number),
              dateTime(r.issued_at),
              money(r.total),
            ]);
            const csv = [header, ...rowsCsv]
              .map((r) => r.map((v) => `"${String(v || "").replace(/"/g, '""')}"`).join(","))
              .join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "invoices.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export CSV
        </button>
        {bulkBusy ? <span style={{ fontSize: 12, opacity: 0.75 }}>Working…</span> : null}
        {bulkMsg ? <span style={{ fontSize: 12, opacity: 0.75 }}>{bulkMsg}</span> : null}
      </div>

      <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, overflow: "hidden", background: "white" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "rgba(0,0,0,0.03)", position: "sticky", top: 0 }}>
            <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.75 }}>
              <th style={{ padding: 12, width: 40 }}>
                <input type="checkbox" checked={allSelected} onChange={(e) => setAll(e.target.checked)} />
              </th>
              <th style={thSort()} onClick={() => toggleSort("invoice")}>
                Invoice
              </th>
              <th style={thSort()} onClick={() => toggleSort("status")}>
                Status
              </th>
              <th style={thSort()} onClick={() => toggleSort("account")}>
                Account
              </th>
              <th style={thSort()} onClick={() => toggleSort("order")}>
                Order
              </th>
              <th style={thSort()} onClick={() => toggleSort("issued_at")}>
                Issued
              </th>
              <th style={thSort()} onClick={() => toggleSort("total")}>
                Total
              </th>
              <th style={{ padding: 12 }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((inv) => (
              <tr key={inv.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <td style={{ padding: 12 }}>
                  <input
                    type="checkbox"
                    checked={!!selected[inv.id]}
                    onChange={(e) => setSelected((prev) => ({ ...prev, [inv.id]: e.target.checked }))}
                  />
                </td>
                <td style={{ padding: 12, fontWeight: 900 }}>
                  <Link href={`/admin/invoices/${encodeURIComponent(inv.id)}`} style={{ textDecoration: "none", fontWeight: 900 }}>
                    {safeStr(inv.invoice_number) || shortId(inv.id)}
                  </Link>
                </td>
                <td style={{ padding: 12 }}>
                  <span style={pill(String(inv.status || ""))}>{formatStatusLabel(inv.status)}</span>
                </td>
                <td style={{ padding: 12, fontWeight: 900 }}>{safeStr(inv.accounts?.name) || "—"}</td>
                <td style={{ padding: 12 }}>
                  <Link
                    href={`/admin/orders/${encodeURIComponent(String(inv.order_id || ""))}`}
                    style={{ textDecoration: "none", fontWeight: 900 }}
                  >
                    {safeStr(inv.orders?.order_number) || shortId(inv.order_id)}
                  </Link>
                </td>
                <td style={{ padding: 12 }}>{dateTime(inv.issued_at)}</td>
                <td style={{ padding: 12, fontWeight: 900 }}>{money(inv.total)}</td>
                <td style={{ padding: 12 }}>
                  <Link
                    href={`/admin/invoices/${encodeURIComponent(inv.id)}`}
                    style={{ textDecoration: "none", fontWeight: 900 }}
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 18, opacity: 0.75 }} >
                  No invoices found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function thSort(): React.CSSProperties {
  return {
    padding: 12,
    cursor: "pointer",
    userSelect: "none",
  };
}

function summaryCard(onDark?: boolean, tone?: "paid" | "partial" | "overdue" | "outstanding" | "issued" | "draft" | "neutral"): React.CSSProperties {
  const toneStyle: React.CSSProperties = onDark
    ? tone === "paid"
      ? { borderColor: "rgba(34,197,94,0.45)", background: "rgba(34,197,94,0.16)" }
      : tone === "partial"
      ? { borderColor: "rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.12)" }
      : tone === "overdue"
      ? { borderColor: "rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.16)" }
      : tone === "outstanding"
      ? { borderColor: "rgba(255,153,0,0.45)", background: "rgba(255,153,0,0.16)" }
      : tone === "issued"
      ? { borderColor: "rgba(59,130,246,0.45)", background: "rgba(59,130,246,0.14)" }
      : tone === "draft"
      ? { borderColor: "rgba(148,163,184,0.45)", background: "rgba(148,163,184,0.16)" }
      : {}
    : {};

  return {
    border: onDark ? "1px solid rgba(255,255,255,0.24)" : "1px solid rgba(0,0,0,0.08)",
    borderRadius: 14,
    padding: "10px 12px",
    background: onDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.02)",
    backdropFilter: onDark ? "blur(12px)" : undefined,
    WebkitBackdropFilter: onDark ? "blur(12px)" : undefined,
    boxShadow: onDark ? "0 10px 26px rgba(0,0,0,0.22)" : undefined,
    display: "grid",
    gap: 4,
    minWidth: 140,
    ...toneStyle,
  };
}

function summaryLabel(onDark?: boolean): React.CSSProperties {
  return {
    fontSize: 11,
    opacity: onDark ? 0.75 : 0.65,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  };
}

function summaryValue(onDark?: boolean): React.CSSProperties {
  return { fontSize: 16, fontWeight: 950, color: onDark ? "white" : "inherit" };
}

function summarySubValue(onDark?: boolean): React.CSSProperties {
  return { fontSize: 11, fontWeight: 900, opacity: onDark ? 0.75 : 0.7 };
}

function pct(part: number, whole: number) {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return "—";
  return `${((part / whole) * 100).toFixed(1)}%`;
}
