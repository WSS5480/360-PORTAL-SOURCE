"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

type VariantRow = {
  id: string;
  sku: string;
  size_label: string | null;
  width_cm: number | null;
  length_cm: number | null;
  total_sqcm: number | null;
  is_active: boolean;
  bulk_enabled: boolean;
  base_unit_price: number;
  updated_at: string;
};

type ProductRow = {
  id: string;
  name: string;
  code: string | null;
  qcode: string | null;
  is_active: boolean;
  bulk_enabled: boolean;
  base_unit_price: number;
  updated_at: string;
  product_variants?: VariantRow[];
};

type SortKey = "name" | "updated" | "variants" | "base_unit" | "status";
type SortDir = "asc" | "desc";

function pill(kind: "active" | "inactive" | "info" | "muted" | "warn"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,0.12)",
    whiteSpace: "nowrap",
  };
  if (kind === "active") return { ...base, background: "rgba(25, 135, 84, 0.14)", borderColor: "rgba(25,135,84,0.28)" };
  if (kind === "inactive") return { ...base, background: "rgba(220, 53, 69, 0.10)", borderColor: "rgba(220,53,69,0.24)" };
  if (kind === "info") return { ...base, background: "rgba(13, 110, 253, 0.10)", borderColor: "rgba(13,110,253,0.24)" };
  if (kind === "warn") return { ...base, background: "rgba(255, 193, 7, 0.18)", borderColor: "rgba(180,140,0,0.28)" };
  return { ...base, background: "rgba(0,0,0,0.04)" };
}

function money(n: unknown) {
  const v = Number(String(n ?? "").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtDim(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return String(n);
}

function fmtDate(v: unknown) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function safeSqcm(v: VariantRow): number | null {
  const direct = Number(v.total_sqcm);
  if (Number.isFinite(direct)) return direct;

  const w = Number(v.width_cm);
  const l = Number(v.length_cm);
  if (Number.isFinite(w) && Number.isFinite(l)) return w * l;

  return null;
}

function safeTime(v: unknown): number {
  const d = new Date(String(v ?? ""));
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

function thButtonStyle(active: boolean): React.CSSProperties {
  return {
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    cursor: "pointer",
    fontWeight: active ? 950 : 800,
    color: "inherit",
    display: "inline-flex",
    gap: 6,
    alignItems: "center",
    fontSize: 12,
  };
}

function sortIndicator(active: boolean, dir: SortDir) {
  if (!active) return <span style={{ opacity: 0.35 }}>↕</span>;
  return <span style={{ opacity: 0.7 }}>{dir === "asc" ? "↑" : "↓"}</span>;
}

function ghostBtn(disabled = false): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)",
    background: disabled ? "rgba(0,0,0,0.04)" : "white",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 12,
    color: "#0f172a",
    whiteSpace: "nowrap",
  };
}

function linkBtn(): React.CSSProperties {
  return {
    textDecoration: "none",
    fontWeight: 900,
    padding: "6px 10px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    color: "#0f172a",
    whiteSpace: "nowrap",
    fontSize: 12,
    display: "inline-block",
  };
}

export default function AdminProductsTableClient({
  rows,
  initialQ = "",
  initialOnly = "",
  initialExpandProductId,
}: {
  rows: ProductRow[];
  initialQ?: string;
  initialOnly?: string;
  initialExpandProductId: string | null;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    initialExpandProductId ? { [initialExpandProductId]: true } : {}
  );

  const [showInactiveVariants, setShowInactiveVariants] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const totals = useMemo(() => {
    const withZeroVariants = rows.filter((p) => (p.product_variants?.length ?? 0) === 0).length;
    const needsBasePrice = rows.filter((p) => Number(p.base_unit_price ?? 0) <= 0).length;
    return { withZeroVariants, needsBasePrice };
  }, [rows]);

  function toggleRow(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function setAll(open: boolean) {
    const next: Record<string, boolean> = {};
    for (const r of rows) next[r.id] = open;
    setExpanded(next);
  }

  function requestSort(nextKey: SortKey) {
    setSortDir((prevDir) => {
      const sameKey = sortKey === nextKey;
      return sameKey ? (prevDir === "asc" ? "desc" : "asc") : "asc";
    });
    setSortKey(nextKey);
  }

  const sortedRows = useMemo(() => {
    const copy = [...rows];

    function compare(a: ProductRow, b: ProductRow) {
      const aVars = a.product_variants ?? [];
      const bVars = b.product_variants ?? [];
      const aActiveVars = aVars.reduce((acc, v) => acc + (v.is_active ? 1 : 0), 0);
      const bActiveVars = bVars.reduce((acc, v) => acc + (v.is_active ? 1 : 0), 0);

      let av: string | number;
      let bv: string | number;

      switch (sortKey) {
        case "name":
          av = String(a.name ?? "").toLowerCase();
          bv = String(b.name ?? "").toLowerCase();
          break;
        case "updated":
          av = safeTime(a.updated_at);
          bv = safeTime(b.updated_at);
          break;
        case "variants":
          av = aVars.length * 1000 + aActiveVars;
          bv = bVars.length * 1000 + bActiveVars;
          break;
        case "base_unit":
          av = Number(a.base_unit_price ?? 0);
          bv = Number(b.base_unit_price ?? 0);
          break;
        case "status":
          av = a.is_active ? 1 : 0;
          bv = b.is_active ? 1 : 0;
          break;
        default:
          av = safeTime(a.updated_at);
          bv = safeTime(b.updated_at);
      }

      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;

      const an = String(a.name ?? "").toLowerCase();
      const bn = String(b.name ?? "").toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    }

    copy.sort(compare);
    return copy;
  }, [rows, sortKey, sortDir]);

  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.10)",
        borderRadius: 16,
        overflow: "hidden",
        background: "white",
        boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          padding: 14,
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          display: "grid",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
            <div style={{ fontWeight: 950, fontSize: 15 }}>Catalog</div>
            <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.4 }}>
              {rows.length} products · {totals.withZeroVariants} with no variants · {totals.needsBasePrice} missing base
              price
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                fontSize: 12,
                fontWeight: 800,
                opacity: 0.85,
                marginRight: 4,
              }}
            >
              <input
                type="checkbox"
                checked={showInactiveVariants}
                onChange={(e) => setShowInactiveVariants(e.currentTarget.checked)}
              />
              Show inactive variants
            </label>
            <button type="button" onClick={() => setAll(true)} style={ghostBtn()}>
              Expand all
            </button>
            <button type="button" onClick={() => setAll(false)} style={ghostBtn()}>
              Collapse all
            </button>
          </div>
        </div>

        <form method="get" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            name="q"
            defaultValue={initialQ}
            placeholder="Search name, qcode…"
            style={{
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.14)",
              minWidth: 240,
              flex: "1 1 240px",
              fontSize: 13,
            }}
          />
          <select
            name="only"
            defaultValue={initialOnly}
            style={{
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.14)",
              background: "white",
              fontSize: 13,
            }}
          >
            <option value="">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
          <button
            type="submit"
            style={{
              ...ghostBtn(),
              background: "#0f172a",
              color: "white",
              borderColor: "#0f172a",
              padding: "9px 14px",
            }}
          >
            Filter
          </button>
          {initialQ || initialOnly ? (
            <Link href="/admin/products" style={{ ...linkBtn(), background: "rgba(0,0,0,0.03)" }}>
              Clear
            </Link>
          ) : null}
        </form>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
          <thead>
            <tr
              style={{
                textAlign: "left",
                fontSize: 11,
                letterSpacing: 0.3,
                textTransform: "uppercase",
                color: "rgba(15,23,42,0.55)",
                background: "rgba(15,23,42,0.02)",
              }}
            >
              <th style={{ padding: "10px 12px", width: 44 }} />
              <th style={{ padding: "10px 12px" }}>
                <button type="button" onClick={() => requestSort("name")} style={thButtonStyle(sortKey === "name")}>
                  Product {sortIndicator(sortKey === "name", sortDir)}
                </button>
              </th>
              <th style={{ padding: "10px 12px" }}>
                <button
                  type="button"
                  onClick={() => requestSort("base_unit")}
                  style={thButtonStyle(sortKey === "base_unit")}
                >
                  Base unit {sortIndicator(sortKey === "base_unit", sortDir)}
                </button>
              </th>
              <th style={{ padding: "10px 12px" }}>
                <button type="button" onClick={() => requestSort("status")} style={thButtonStyle(sortKey === "status")}>
                  Status {sortIndicator(sortKey === "status", sortDir)}
                </button>
              </th>
              <th style={{ padding: "10px 12px" }}>Bulk</th>
              <th style={{ padding: "10px 12px" }}>
                <button
                  type="button"
                  onClick={() => requestSort("variants")}
                  style={thButtonStyle(sortKey === "variants")}
                >
                  Variants {sortIndicator(sortKey === "variants", sortDir)}
                </button>
              </th>
              <th style={{ padding: "10px 12px" }}>
                <button
                  type="button"
                  onClick={() => requestSort("updated")}
                  style={thButtonStyle(sortKey === "updated")}
                >
                  Updated {sortIndicator(sortKey === "updated", sortDir)}
                </button>
              </th>
              <th style={{ padding: "10px 12px", width: 1 }} />
            </tr>
          </thead>

          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 28, textAlign: "center", opacity: 0.7, fontSize: 13 }}>
                  No products match this filter.
                </td>
              </tr>
            ) : null}

            {sortedRows.map((p) => {
              const varsAll = p.product_variants ?? [];
              const vars = showInactiveVariants ? varsAll : varsAll.filter((v) => v.is_active);
              const isOpen = !!expanded[p.id];
              const activeVariantCountAll = varsAll.reduce((acc, v) => acc + (v.is_active ? 1 : 0), 0);
              const needsBasePrice = Number(p.base_unit_price ?? 0) <= 0;
              const metaBits = [p.qcode ? `Q ${p.qcode}` : null].filter(Boolean);

              return (
                <Fragment key={p.id}>
                  <tr
                    style={{
                      borderTop: "1px solid rgba(0,0,0,0.06)",
                      background: isOpen ? "rgba(30,136,229,0.03)" : "white",
                    }}
                  >
                    <td style={{ padding: "12px 12px", verticalAlign: "middle" }}>
                      <button
                        type="button"
                        onClick={() => toggleRow(p.id)}
                        aria-label={isOpen ? "Collapse variants" : "Expand variants"}
                        aria-expanded={isOpen}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          border: "1px solid rgba(0,0,0,0.12)",
                          background: isOpen ? "rgba(30,136,229,0.10)" : "rgba(0,0,0,0.02)",
                          cursor: "pointer",
                          fontWeight: 950,
                          color: "#0f172a",
                        }}
                      >
                        {isOpen ? "▾" : "▸"}
                      </button>
                    </td>

                    <td style={{ padding: "12px 12px", verticalAlign: "middle" }}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={{ fontWeight: 950, letterSpacing: -0.1, color: "#0f172a" }}>{p.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.65, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {metaBits.length > 0 ? metaBits.join(" · ") : "No qcode"}
                          {needsBasePrice ? <span style={pill("warn")}>Needs base price</span> : null}
                          {varsAll.length === 0 ? <span style={pill("warn")}>No variants</span> : null}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "12px 12px", verticalAlign: "middle", fontWeight: 900, whiteSpace: "nowrap" }}>
                      {money(p.base_unit_price)}
                    </td>

                    <td style={{ padding: "12px 12px", verticalAlign: "middle" }}>
                      <div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
                        <span style={pill(p.is_active ? "active" : "inactive")}>
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                        <form action={`/api/admin/products/${encodeURIComponent(p.id)}`} method="post">
                          <input type="hidden" name="name" value={p.name} />
                          <input type="hidden" name="code" value={p.code ?? ""} />
                          <input type="hidden" name="qcode" value={p.qcode ?? ""} />
                          <input type="hidden" name="base_unit_price" value={String(p.base_unit_price ?? 0)} />
                          <input type="hidden" name="is_active" value={p.is_active ? "" : "on"} />
                          <button
                            type="submit"
                            style={{
                              border: "none",
                              background: "transparent",
                              padding: 0,
                              fontSize: 11,
                              fontWeight: 800,
                              color: "rgba(15,23,42,0.55)",
                              cursor: "pointer",
                              textDecoration: "underline",
                              textUnderlineOffset: 2,
                            }}
                          >
                            {p.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                      </div>
                    </td>

                    <td style={{ padding: "12px 12px", verticalAlign: "middle" }}>
                      <div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
                        <span style={pill(p.bulk_enabled ? "info" : "muted")}>{p.bulk_enabled ? "On" : "Off"}</span>
                        <form action={`/api/admin/products/${encodeURIComponent(p.id)}/bulk`} method="post">
                          <input type="hidden" name="bulk_enabled" value={p.bulk_enabled ? "off" : "on"} />
                          <button
                            type="submit"
                            style={{
                              border: "none",
                              background: "transparent",
                              padding: 0,
                              fontSize: 11,
                              fontWeight: 800,
                              color: "rgba(15,23,42,0.55)",
                              cursor: "pointer",
                              textDecoration: "underline",
                              textUnderlineOffset: 2,
                            }}
                          >
                            {p.bulk_enabled ? "Disable" : "Enable"}
                          </button>
                        </form>
                      </div>
                    </td>

                    <td style={{ padding: "12px 12px", verticalAlign: "middle" }}>
                      <div style={{ fontWeight: 900, fontSize: 13 }}>
                        {activeVariantCountAll}
                        <span style={{ opacity: 0.5, fontWeight: 700 }}> / {varsAll.length}</span>
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>active / total</div>
                    </td>

                    <td style={{ padding: "12px 12px", verticalAlign: "middle", opacity: 0.75, fontSize: 13, whiteSpace: "nowrap" }}>
                      {fmtDate(p.updated_at)}
                    </td>

                    <td style={{ padding: "12px 12px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <Link href={`/admin/products/${encodeURIComponent(p.id)}`} style={linkBtn()}>
                          Open
                        </Link>
                        <Link
                          href={`/admin/products/${encodeURIComponent(p.id)}#create-variant`}
                          style={{ ...linkBtn(), background: "rgba(0,0,0,0.03)" }}
                        >
                          + Variant
                        </Link>
                      </div>
                    </td>
                  </tr>

                  {isOpen ? (
                    <tr style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                      <td colSpan={8} style={{ padding: 0 }}>
                        <div
                          style={{
                            padding: "12px 14px 16px",
                            background: "rgba(15,23,42,0.025)",
                            borderBottom: "1px solid rgba(0,0,0,0.06)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              alignItems: "baseline",
                              marginBottom: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ fontWeight: 900, fontSize: 13 }}>Variants</div>
                            <div style={{ fontSize: 12, opacity: 0.65 }}>
                              Showing {vars.length} of {varsAll.length}
                            </div>
                          </div>

                          {vars.length === 0 ? (
                            <div
                              style={{
                                padding: 14,
                                borderRadius: 12,
                                border: "1px dashed rgba(0,0,0,0.14)",
                                background: "white",
                                opacity: 0.8,
                                fontSize: 13,
                              }}
                            >
                              {varsAll.length === 0
                                ? "No variants yet — use + Variant to create one."
                                : "No variants match your current view (inactive hidden)."}
                            </div>
                          ) : (
                            <div
                              style={{
                                border: "1px solid rgba(0,0,0,0.10)",
                                borderRadius: 12,
                                overflow: "hidden",
                                background: "white",
                              }}
                            >
                              <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                                  <thead>
                                    <tr
                                      style={{
                                        textAlign: "left",
                                        fontSize: 11,
                                        letterSpacing: 0.3,
                                        textTransform: "uppercase",
                                        color: "rgba(15,23,42,0.5)",
                                        background: "rgba(15,23,42,0.02)",
                                      }}
                                    >
                                      <th style={{ padding: "8px 10px" }}>SKU</th>
                                      <th style={{ padding: "8px 10px" }}>Size</th>
                                      <th style={{ padding: "8px 10px" }}>W × L</th>
                                      <th style={{ padding: "8px 10px" }}>Sqcm</th>
                                      <th style={{ padding: "8px 10px" }}>Price</th>
                                      <th style={{ padding: "8px 10px" }}>Status</th>
                                      <th style={{ padding: "8px 10px" }}>Bulk</th>
                                      <th style={{ padding: "8px 10px", width: 1 }} />
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[...vars]
                                      .sort((a, b) => String(a.sku).localeCompare(String(b.sku)))
                                      .map((v) => {
                                        const sqcm = safeSqcm(v);
                                        const dims =
                                          Number.isFinite(Number(v.width_cm)) || Number.isFinite(Number(v.length_cm))
                                            ? `${fmtDim(v.width_cm)} × ${fmtDim(v.length_cm)}`
                                            : "—";

                                        return (
                                          <tr key={v.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                                            <td style={{ padding: "9px 10px", fontWeight: 900 }}>{v.sku}</td>
                                            <td style={{ padding: "9px 10px", opacity: 0.8, fontSize: 13 }}>
                                              {v.size_label ?? "—"}
                                            </td>
                                            <td style={{ padding: "9px 10px", opacity: 0.8, fontSize: 13, whiteSpace: "nowrap" }}>
                                              {dims}
                                            </td>
                                            <td style={{ padding: "9px 10px", fontWeight: 800 }}>{sqcm ?? "—"}</td>
                                            <td style={{ padding: "9px 10px", fontWeight: 900, whiteSpace: "nowrap" }}>
                                              {money(v.base_unit_price)}
                                            </td>
                                            <td style={{ padding: "9px 10px" }}>
                                              <div style={{ display: "grid", gap: 4, justifyItems: "start" }}>
                                                <span style={pill(v.is_active ? "active" : "inactive")}>
                                                  {v.is_active ? "Active" : "Inactive"}
                                                </span>
                                                <form
                                                  action={`/api/admin/variants/${encodeURIComponent(v.id)}`}
                                                  method="post"
                                                >
                                                  <input type="hidden" name="sku" value={v.sku} />
                                                  <input type="hidden" name="size_label" value={v.size_label ?? ""} />
                                                  <input type="hidden" name="width_cm" value={v.width_cm ?? ""} />
                                                  <input type="hidden" name="length_cm" value={v.length_cm ?? ""} />
                                                  <input type="hidden" name="total_sqcm" value={v.total_sqcm ?? ""} />
                                                  <input type="hidden" name="is_active" value={v.is_active ? "" : "on"} />
                                                  <button
                                                    type="submit"
                                                    style={{
                                                      border: "none",
                                                      background: "transparent",
                                                      padding: 0,
                                                      fontSize: 11,
                                                      fontWeight: 800,
                                                      color: "rgba(15,23,42,0.55)",
                                                      cursor: "pointer",
                                                      textDecoration: "underline",
                                                      textUnderlineOffset: 2,
                                                    }}
                                                  >
                                                    {v.is_active ? "Deactivate" : "Activate"}
                                                  </button>
                                                </form>
                                              </div>
                                            </td>
                                            <td style={{ padding: "9px 10px" }}>
                                              {v.bulk_enabled ? (
                                                <form
                                                  action={`/api/admin/variants/${encodeURIComponent(v.id)}/bulk`}
                                                  method="post"
                                                >
                                                  <input type="hidden" name="bulk_enabled" value="off" />
                                                  <button
                                                    type="submit"
                                                    disabled={!p.bulk_enabled}
                                                    title={
                                                      p.bulk_enabled
                                                        ? "Remove from bulk catalog"
                                                        : "Turn on bulk for the product first"
                                                    }
                                                    style={ghostBtn(!p.bulk_enabled)}
                                                  >
                                                    Remove
                                                  </button>
                                                </form>
                                              ) : (
                                                <form
                                                  action={`/api/admin/variants/${encodeURIComponent(v.id)}/bulk`}
                                                  method="post"
                                                >
                                                  <input type="hidden" name="bulk_enabled" value="on" />
                                                  <button
                                                    type="submit"
                                                    disabled={!p.bulk_enabled}
                                                    title={
                                                      p.bulk_enabled
                                                        ? "Include in bulk catalog"
                                                        : "Turn on bulk for the product first"
                                                    }
                                                    style={{
                                                      ...ghostBtn(!p.bulk_enabled),
                                                      background: p.bulk_enabled
                                                        ? "rgba(13, 110, 253, 0.10)"
                                                        : "rgba(0,0,0,0.04)",
                                                    }}
                                                  >
                                                    Include
                                                  </button>
                                                </form>
                                              )}
                                            </td>
                                            <td style={{ padding: "9px 10px" }}>
                                              <Link
                                                href={`/admin/variants/${encodeURIComponent(v.id)}`}
                                                style={linkBtn()}
                                              >
                                                Open
                                              </Link>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(0,0,0,0.08)", fontSize: 12, opacity: 0.7, lineHeight: 1.45 }}>
        Tip: enable bulk on a product to include all variants by default, then remove any you need to exclude. Variant price
        = product base unit price × total sq cm.
      </div>
    </div>
  );
}
