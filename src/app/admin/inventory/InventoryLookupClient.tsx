"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { displayLotIdentifier } from "@/lib/inventory/displayLotIdentifier";

type LookupLotRow = {
  id: string;
  variant_id: string;
  lot_number: string | null;
  serial_number: string | null;
  expiration_date: string | null;
  qty: number;
  location: string | null;
  created_at: string;
  raw_scan?: string | null;
  derived_location?: string | null;
};

type LookupResponse =
  | {
      ok: true;
      variant: {
        id: string;
        sku: string;
        size_label: string | null;
        product_name: string | null;
        is_active: boolean;
      };
      qty_on_hand: number;
      locations: string[];
      rows: LookupLotRow[];
    }
  | { ok: false; error: string };

type SummaryRow = {
  variant_id: string;
  product_id: string | null;
  sku: string;
  product_name: string | null;
  size_label: string | null;
  is_active: boolean;
  qty_on_hand: number;
  locations: string[];
  locations_count: number;
};

type SummaryResponse = { ok: true; rows: SummaryRow[] } | { ok: false; error: string };

const C = {
  borderSubtle: "rgba(0,0,0,0.08)",
  borderSoft: "rgba(0,0,0,0.10)",
  borderInput: "rgba(0,0,0,0.18)",
  bgSoft: "rgba(0,0,0,0.02)",
  bgSofter: "rgba(0,0,0,0.03)",
  shadow: "0 10px 26px rgba(0,0,0,0.06)",
};

function pillStyle(tone: "muted" | "ok" | "warn"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(0,0,0,0.12)",
    whiteSpace: "nowrap",
  };
  if (tone === "ok") return { ...base, background: "rgba(25, 135, 84, 0.12)" };
  if (tone === "warn") return { ...base, background: "rgba(220, 53, 69, 0.12)" };
  return { ...base, background: "rgba(0,0,0,0.04)", opacity: 0.92 };
}

function inputStyle(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: C.borderInput,
    fontWeight: 900,
    fontSize: 13,
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
    background: "white",
  };
}

function buttonStyle(kind: "primary" | "muted" | "default"): React.CSSProperties {
  if (kind === "primary") {
    return {
      padding: "10px 12px",
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "#111",
      background: "#111",
      color: "white",
      fontWeight: 950,
    };
  }
  if (kind === "muted") {
    return {
      padding: "10px 12px",
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: "rgba(0,0,0,0.14)",
      background: C.bgSofter,
      fontWeight: 950,
    };
  }
  return {
    padding: "10px 12px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(0,0,0,0.14)",
    background: "white",
    fontWeight: 950,
  };
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString();
}

function lotOrSerialValue(r: LookupLotRow): string {
  return displayLotIdentifier(r);
}

/** Stored on lot row (empty = unassigned / derived-only in scan metadata). */
function rawStoredLocation(r: LookupLotRow): string {
  return String(r.location ?? "").trim();
}

function displayRowLocation(r: LookupLotRow): string {
  const loc = String(r.location ?? "").trim();
  if (loc === "DEFAULT") return "Default (import)";
  if (loc) return loc;
  const dl = String((r as any).derived_location ?? "").trim();
  if (dl) return dl;
  return "Unassigned";
}

function LotLocationEditor({
  lotId,
  row,
  options,
  disabled,
  onSaved,
}: {
  lotId: string;
  row: LookupLotRow;
  options: string[];
  disabled?: boolean;
  onSaved: () => void;
}) {
  const stored = rawStoredLocation(row);
  const [val, setVal] = useState(stored);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVal(stored);
  }, [stored, lotId]);

  const opts = useMemo(() => {
    const s = new Set(options);
    if (stored) s.add(stored);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [options, stored]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/inventory/lots/${encodeURIComponent(lotId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location: val.trim() || null }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error((json as any)?.error || String(res.status));
      onSaved();
    } catch {
      /* parent can show refresh */
    } finally {
      setSaving(false);
    }
  }

  const compactControl: React.CSSProperties = {
    padding: "4px 8px",
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "solid",
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.2,
    minHeight: 28,
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        gap: 6,
        alignItems: "center",
        maxWidth: "100%",
      }}
    >
      <select
        value={val}
        onChange={(e) => setVal(e.target.value)}
        disabled={disabled || saving}
        style={{
          ...compactControl,
          flex: "1 1 auto",
          minWidth: 100,
          maxWidth: 200,
          borderColor: C.borderInput,
          background: "white",
          fontWeight: 800,
          cursor: disabled || saving ? "not-allowed" : "pointer",
        }}
      >
        <option value="">Unassigned</option>
        {opts.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => void save()}
        disabled={disabled || saving || val === stored}
        style={{
          ...buttonStyle("primary"),
          ...compactControl,
          flexShrink: 0,
          padding: "4px 10px",
          fontWeight: 900,
        }}
      >
        {saving ? "…" : "Apply"}
      </button>
    </div>
  );
}

function nqty(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

type ProductGroup = {
  product_id: string;
  product_name: string;
  total_qty: number;
  variants_count: number;
  locations_count: number;
  variants: SummaryRow[];
};

export default function InventoryLookupClient(props: { onReceiveSku?: (sku: string) => void; locationsNonce?: number }) {
  // Filters (affect the inventory browser list)
  const [q, setQ] = useState("");
  const [inStockOnly, setInStockOnly] = useState(true);
  const [onlyActive, setOnlyActive] = useState(true);
  const [limit, setLimit] = useState<number>(800);

  // Browser UI state
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});
  const [selectedVariantSku, setSelectedVariantSku] = useState<string>("");

  // Summary data
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryErr, setSummaryErr] = useState<string | null>(null);
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);

  // Detail drilldown state (lots/locations)
  const [sku, setSku] = useState("");
  const [location, setLocation] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "muted" | "ok" | "warn"; text: string } | null>(null);
  const [data, setData] = useState<LookupResponse | null>(null);

  const skuRef = useRef<HTMLInputElement | null>(null);

  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(() => new Set());

  const [canonicalLocationNames, setCanonicalLocationNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadLocs() {
      try {
        const res = await fetch("/api/admin/inventory/locations", { method: "GET", cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok || cancelled) return;
        const locRows = (json.locations ?? []) as Array<{ name?: string | null }>;
        const names = locRows
          .map((x) => String(x?.name ?? "").trim())
          .filter((s): s is string => s.length > 0);
        setCanonicalLocationNames([...new Set(names)].sort((a, b) => a.localeCompare(b)));
      } catch {
        if (!cancelled) setCanonicalLocationNames([]);
      }
    }
    void loadLocs();
    return () => {
      cancelled = true;
    };
  }, [props.locationsNonce]);

  const qtyLimit = useMemo(() => {
    const n = Number(limit);
    if (!Number.isFinite(n)) return 800;
    return Math.min(1000, Math.max(100, Math.floor(n)));
  }, [limit]);

  async function loadSummary() {
    setSummaryBusy(true);
    setSummaryErr(null);

    try {
      const url = new URL("/api/admin/inventory/summary", window.location.origin);

      // Always send q (even if empty) to avoid any validators elsewhere
      url.searchParams.set("q", String(q ?? "").trim());

      url.searchParams.set("onlyActive", onlyActive ? "1" : "0");
      url.searchParams.set("inStockOnly", inStockOnly ? "1" : "0");
      url.searchParams.set("limit", String(qtyLimit));

      const res = await fetch(url.toString(), { method: "GET" });
      const json: SummaryResponse = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

      if (!res.ok || !json.ok) {
        const err = (json as any)?.error || `Request failed (${res.status})`;
        setSummaryRows([]);
        setSummaryErr(err);
        return;
      }

      setSummaryRows(json.rows ?? []);
    } catch (e: any) {
      setSummaryRows([]);
      setSummaryErr(e?.message ? String(e.message) : "Network error");
    } finally {
      setSummaryBusy(false);
    }
  }

  async function runLookup(nextSku?: string, nextLoc?: string) {
    const skuVal = String(nextSku ?? sku).trim();
    if (!skuVal) {
      setMsg({ tone: "warn", text: "Select a variant to view lots/locations." });
      skuRef.current?.focus();
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const url = new URL("/api/admin/inventory/lookup", window.location.origin);
      url.searchParams.set("sku", skuVal);
      if (String(nextLoc ?? location).trim()) url.searchParams.set("location", String(nextLoc ?? location).trim());
      url.searchParams.set("limit", "800");

      const res = await fetch(url.toString(), { method: "GET" });
      const json: LookupResponse = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

      if (!res.ok || !json.ok) {
        const err = (json as any)?.error || `Request failed (${res.status})`;
        setData(null);
        setMsg({ tone: "warn", text: err });
        return;
      }

      setData(json);

      const locs = (json as any).locations ?? [];
      const cur = String(nextLoc ?? location).trim();
      if (cur && Array.isArray(locs) && !locs.includes(cur)) setLocation("");

      setMsg({ tone: "ok", text: `Loaded ${json.variant.sku}. Showing ${json.rows.length} row(s).` });
    } catch (e: any) {
      setData(null);
      setMsg({ tone: "warn", text: e?.message ? String(e.message) : "Network error" });
    } finally {
      setBusy(false);
    }
  }

  // Summary loads (debounced)
  useEffect(() => {
    const t = window.setTimeout(() => loadSummary(), 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, inStockOnly, onlyActive, qtyLimit]);

  // Detail refetch on location change (debounced)
  useEffect(() => {
    if (!data || !(data as any).ok) return;
    if (!sku.trim()) return;
    const t = window.setTimeout(() => runLookup(undefined, location), 180);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const groups = useMemo((): ProductGroup[] => {
    const byProduct = new Map<string, ProductGroup>();

    for (const r of summaryRows) {
      const pid = r.product_id ? String(r.product_id) : `__missing__:${r.product_name ?? "Unknown Product"}`;
      const pname = String(r.product_name ?? "Unknown Product");

      const existing = byProduct.get(pid);
      if (!existing) {
        byProduct.set(pid, {
          product_id: pid,
          product_name: pname,
          total_qty: nqty(r.qty_on_hand),
          variants_count: 1,
          locations_count: r.locations_count ?? 0,
          variants: [r],
        });
      } else {
        existing.total_qty += nqty(r.qty_on_hand);
        existing.variants_count += 1;
        existing.locations_count = Math.max(existing.locations_count, r.locations_count ?? 0);
        existing.variants.push(r);
      }
    }

    const arr = Array.from(byProduct.values());
    for (const g of arr) g.variants.sort((a, b) => a.sku.localeCompare(b.sku));

    arr.sort((a, b) => {
      const dq = b.total_qty - a.total_qty;
      if (dq !== 0) return dq;
      return a.product_name.localeCompare(b.product_name);
    });

    return arr;
  }, [summaryRows]);

  const summaryStats = useMemo(() => {
    const products = groups.length;
    const variants = summaryRows.length;
    const totalQty = summaryRows.reduce((sum, r) => sum + nqty(r.qty_on_hand), 0);
    return { products, variants, totalQty };
  }, [groups.length, summaryRows]);

  const shown = useMemo(() => {
    if (!data || !(data as any).ok) return null;
    const okData = data as Extract<LookupResponse, { ok: true }>;
    const v = okData.variant;
    return {
      header: `${v.sku}${v.product_name ? ` · ${v.product_name}` : ""}${v.size_label ? ` · ${v.size_label}` : ""}`,
      onHand: okData.qty_on_hand ?? 0,
      locations: okData.locations ?? [],
      rows: okData.rows ?? [],
    };
  }, [data]);

  const mergedLocationOptions = useMemo(() => {
    const s = new Set<string>(canonicalLocationNames);
    for (const loc of shown?.locations ?? []) s.add(loc);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [canonicalLocationNames, shown?.locations]);

  function toggleProduct(pid: string) {
    setExpandedProductIds((prev) => ({ ...prev, [pid]: !prev[pid] }));
  }

  function selectVariant(nextSku: string) {
    setSelectedVariantSku(nextSku);
    setSku(nextSku);
    setLocation("");
    setData(null);
    setMsg({ tone: "muted", text: `Selected ${nextSku}. Loading lots/locations…` });
    runLookup(nextSku, "");
    setTimeout(() => skuRef.current?.focus(), 0);
  }

  /** Open lots/locations and include this variant in the Excel export selection. */
  function selectVariantForViewAndExport(variantId: string, nextSku: string) {
    selectVariant(nextSku);
    setSelectedVariantIds((prev) => {
      const next = new Set(prev);
      next.add(variantId);
      return next;
    });
  }

  function toggleVariantSelected(variantId: string) {
    setSelectedVariantIds((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  }

  function selectAllLoadedVariants() {
    setSelectedVariantIds(new Set(summaryRows.map((r) => r.variant_id)));
  }

  function clearVariantSelection() {
    setSelectedVariantIds(new Set());
  }

  function exportSelectedToExcel() {
    const picked = summaryRows.filter((r) => selectedVariantIds.has(r.variant_id));
    if (!picked.length) return;

    const stamp = new Date();
    const stampStr = `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, "0")}-${String(stamp.getDate()).padStart(2, "0")}-${String(stamp.getHours()).padStart(2, "0")}${String(stamp.getMinutes()).padStart(2, "0")}`;

    const sheetRows = picked.map((r) => ({
      "Product name": r.product_name ?? "",
      SKU: r.sku,
      "Size label": r.size_label ?? "",
      "Qty on hand": r.qty_on_hand ?? 0,
      Locations: (r.locations ?? []).join("; "),
      "Location count": r.locations_count ?? 0,
      Active: r.is_active ? "Yes" : "No",
      "Variant ID": r.variant_id,
      "Product ID": r.product_id ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(sheetRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `inventory-export-${stampStr}.xlsx`);
  }

  const canReceive = !!String(sku ?? "").trim() && typeof props.onReceiveSku === "function";
  const selectedCount = selectedVariantIds.size;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Browser header + filters */}
      <div
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: C.borderSoft,
          borderRadius: 16,
          background: "white",
          boxShadow: C.shadow,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 12,
            borderWidth: 0,
            borderStyle: "solid",
            borderColor: C.borderSubtle,
            borderBottomWidth: 1,
            fontWeight: 950,
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>Inventory Browser</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={pillStyle("muted")}>Products: {summaryStats.products}</span>
            <span style={pillStyle("muted")}>Variants: {summaryStats.variants}</span>
            <span style={pillStyle("muted")}>Total qty: {summaryStats.totalQty}</span>
          </div>
        </div>

        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 180px) minmax(0, 180px) minmax(0, 130px)",
              alignItems: "end",
            }}
          >
            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Search (product or SKU)</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g. Dermacyte, MW"
                style={inputStyle()}
              />
            </label>

            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>In-stock only</div>
              <button
                type="button"
                onClick={() => setInStockOnly((v) => !v)}
                style={{
                  ...buttonStyle(inStockOnly ? "primary" : "default"),
                  cursor: summaryBusy ? "not-allowed" : "pointer",
                  opacity: summaryBusy ? 0.65 : 1,
                }}
                disabled={summaryBusy}
              >
                {inStockOnly ? "Showing in-stock" : "Showing all"}
              </button>
            </label>

            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Active variants</div>
              <button
                type="button"
                onClick={() => setOnlyActive((v) => !v)}
                style={{
                  ...buttonStyle(onlyActive ? "primary" : "default"),
                  cursor: summaryBusy ? "not-allowed" : "pointer",
                  opacity: summaryBusy ? 0.65 : 1,
                }}
                disabled={summaryBusy}
              >
                {onlyActive ? "Only active" : "Include inactive"}
              </button>
            </label>

            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Limit</div>
              <input
                value={String(qtyLimit)}
                onChange={(e) => setLimit(Number(e.target.value))}
                type="number"
                min={100}
                max={1000}
                step={100}
                style={inputStyle()}
              />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
              paddingTop: 4,
              borderTopWidth: 1,
              borderTopStyle: "solid",
              borderTopColor: C.borderSubtle,
            }}
          >
            <span style={pillStyle("muted")}>{selectedCount} selected</span>
            <button
              type="button"
              onClick={selectAllLoadedVariants}
              disabled={summaryBusy || summaryRows.length === 0}
              style={{
                ...buttonStyle("muted"),
                cursor: summaryBusy || summaryRows.length === 0 ? "not-allowed" : "pointer",
                opacity: summaryBusy || summaryRows.length === 0 ? 0.55 : 1,
              }}
            >
              Select all loaded
            </button>
            <button
              type="button"
              onClick={clearVariantSelection}
              disabled={selectedCount === 0}
              style={{
                ...buttonStyle("default"),
                cursor: selectedCount === 0 ? "not-allowed" : "pointer",
                opacity: selectedCount === 0 ? 0.55 : 1,
              }}
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={exportSelectedToExcel}
              disabled={selectedCount === 0}
              style={{
                ...buttonStyle("primary"),
                cursor: selectedCount === 0 ? "not-allowed" : "pointer",
                opacity: selectedCount === 0 ? 0.55 : 1,
                borderColor: "var(--brand-600)",
                background: "var(--brand-600)",
              }}
              title="Download selected variants as an Excel workbook"
            >
              Export Excel ({selectedCount})
            </button>
          </div>

          {summaryErr ? (
            <div style={{ color: "crimson", fontWeight: 900 }}>{summaryErr}</div>
          ) : null}

          {summaryBusy ? <div style={{ fontSize: 12, opacity: 0.75 }}>Loading…</div> : null}

          {/* Product list */}
          <div
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: C.borderSubtle,
              borderRadius: 14,
              overflow: "hidden",
              background: C.bgSoft,
            }}
          >
            {groups.length === 0 && !summaryBusy ? (
              <div style={{ padding: 12, opacity: 0.75 }}>No results.</div>
            ) : null}

            {groups.map((g) => {
              const expanded = !!expandedProductIds[g.product_id];
              return (
                <div key={g.product_id}>
                  <button
                    type="button"
                    onClick={() => toggleProduct(g.product_id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 12,
                      borderWidth: 0,
                      borderStyle: "solid",
                      borderColor: "transparent",
                      background: expanded ? "rgba(0,0,0,0.03)" : "transparent",
                      cursor: "pointer",
                      fontWeight: 950,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 950, letterSpacing: -0.1 }}>{g.product_name}</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {g.variants_count} variant(s) · total qty {g.total_qty}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={pillStyle("muted")}>Qty: {g.total_qty}</span>
                        <span style={pillStyle("muted")}>Variants: {g.variants_count}</span>
                        <span style={pillStyle("muted")}>Loc: {g.locations_count}</span>
                        <span style={pillStyle("muted")}>{expanded ? "Hide" : "Show"}</span>
                      </div>
                    </div>
                  </button>

                  {expanded && (
                    <div
                      style={{
                        padding: 12,
                        borderWidth: 0,
                        borderStyle: "solid",
                        borderColor: C.borderSubtle,
                        borderTopWidth: 1,
                        background: "white",
                        minWidth: 0,
                      }}
                    >
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.7 }}>
                              <th style={{ padding: 10, width: 44 }}>
                                <input
                                  type="checkbox"
                                  aria-label={`Select all variants for ${g.product_name}`}
                                  checked={
                                    g.variants.length > 0 && g.variants.every((v) => selectedVariantIds.has(v.variant_id))
                                  }
                                  ref={(el) => {
                                    if (!el) return;
                                    const some = g.variants.some((v) => selectedVariantIds.has(v.variant_id));
                                    const all =
                                      g.variants.length > 0 && g.variants.every((v) => selectedVariantIds.has(v.variant_id));
                                    el.indeterminate = some && !all;
                                  }}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const on = e.currentTarget.checked;
                                    setSelectedVariantIds((prev) => {
                                      const next = new Set(prev);
                                      for (const v of g.variants) {
                                        if (on) next.add(v.variant_id);
                                        else next.delete(v.variant_id);
                                      }
                                      return next;
                                    });
                                  }}
                                />
                              </th>
                              <th style={{ padding: 10, width: 170 }}>SKU</th>
                              <th style={{ padding: 10 }}>Size</th>
                              <th style={{ padding: 10, width: 120 }}>On-hand</th>
                              <th style={{ padding: 10, width: 120 }}>Locations</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.variants.map((v) => {
                              const isSelected = selectedVariantSku === v.sku;
                              const isChecked = selectedVariantIds.has(v.variant_id);
                              return (
                                <tr
                                  key={v.variant_id}
                                  onClick={() => selectVariantForViewAndExport(v.variant_id, v.sku)}
                                  style={{
                                    cursor: "pointer",
                                    background: isSelected ? "rgba(0,0,0,0.03)" : "transparent",
                                    borderWidth: 0,
                                    borderStyle: "solid",
                                    borderColor: C.borderSubtle,
                                    borderTopWidth: 1,
                                  }}
                                >
                                  <td
                                    style={{ padding: 10, width: 44, verticalAlign: "middle" }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      aria-label={`Select ${v.sku} for export`}
                                      checked={isChecked}
                                      onChange={() => toggleVariantSelected(v.variant_id)}
                                    />
                                  </td>
                                  <td style={{ padding: 10, fontWeight: 950 }}>{v.sku}</td>
                                  <td style={{ padding: 10, opacity: 0.9 }}>{v.size_label ?? "—"}</td>
                                  <td style={{ padding: 10, fontWeight: 950 }}>{v.qty_on_hand ?? 0}</td>
                                  <td style={{ padding: 10, fontWeight: 950 }}>{v.locations_count ?? 0}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ fontSize: 12, opacity: 0.65, marginTop: 8 }}>
                        Click a row to view lots/locations and include that variant in export. The checkbox only toggles
                        export (click it to uncheck without using the row).
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: C.borderSoft,
          borderRadius: 16,
          background: "white",
          boxShadow: C.shadow,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 12,
            borderWidth: 0,
            borderStyle: "solid",
            borderColor: C.borderSubtle,
            borderBottomWidth: 1,
            fontWeight: 950,
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>Lots & Locations</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Variant → filter by location → view identifiers</div>

            <button
              type="button"
              onClick={() => {
                const s = String(sku ?? "").trim();
                if (!s) return;
                props.onReceiveSku?.(s);
              }}
              disabled={!canReceive}
              style={{
                ...buttonStyle("default"),
                cursor: !canReceive ? "not-allowed" : "pointer",
                opacity: !canReceive ? 0.55 : 1,
              }}
              title={!String(sku ?? "").trim() ? "Select a variant first" : "Jump to Receive and prefill this SKU"}
            >
              Receive this SKU →
            </button>
          </div>
        </div>

        <div style={{ padding: 12, display: "grid", gap: 12 }}>
          {msg ? (
            <div style={pillStyle(msg.tone)}>{msg.text}</div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.7 }}>Select a variant above.</div>
          )}

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 260px) auto",
              alignItems: "end",
            }}
          >
            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>SKU</div>
              <input
                ref={skuRef}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Select a variant above"
                style={inputStyle()}
              />
            </label>

            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Location</div>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{ ...inputStyle(), cursor: busy ? "not-allowed" : "pointer" }}
                disabled={busy || !shown}
              >
                <option value="">All locations</option>
                {mergedLocationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => runLookup()}
                disabled={busy}
                style={{
                  ...buttonStyle("primary"),
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.65 : 1,
                }}
              >
                {busy ? "Loading…" : "Load"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSku("");
                  setLocation("");
                  setData(null);
                  setMsg({ tone: "muted", text: "Cleared detail." });
                  setTimeout(() => skuRef.current?.focus(), 0);
                }}
                disabled={busy}
                style={{
                  ...buttonStyle("muted"),
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.65 : 1,
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {shown && (
            <div
              style={{
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: C.borderSubtle,
                borderRadius: 14,
                padding: 12,
                background: C.bgSoft,
                display: "grid",
                gap: 10,
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 950, minWidth: 0 }}>{shown.header}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={pillStyle("muted")}>On-hand: {shown.onHand}</span>
                  <span style={pillStyle("muted")}>Locations: {shown.locations.length}</span>
                  <span style={pillStyle("muted")}>Rows: {shown.rows.length}</span>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", fontSize: 11, opacity: 0.72 }}>
                      <th style={{ padding: "5px 8px", fontWeight: 800 }}>Location</th>
                      <th style={{ padding: "5px 8px", minWidth: 200, width: 1, fontWeight: 800 }}>Set bin</th>
                      <th style={{ padding: "5px 8px", fontWeight: 800 }}>Identifier</th>
                      <th style={{ padding: "5px 8px", width: 72, fontWeight: 800 }}>Qty</th>
                      <th style={{ padding: "5px 8px", width: 120, fontWeight: 800 }}>EXP</th>
                      <th style={{ padding: "5px 8px", width: 200, fontWeight: 800 }}>Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.rows.map((r) => (
                      <tr
                        key={r.id}
                        style={{
                          borderWidth: 0,
                          borderStyle: "solid",
                          borderColor: C.borderSubtle,
                          borderTopWidth: 1,
                        }}
                      >
                        <td style={{ padding: "5px 8px", fontWeight: 850, verticalAlign: "middle" }}>
                          {displayRowLocation(r)}
                        </td>
                        <td style={{ padding: "4px 8px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                          <LotLocationEditor
                            lotId={r.id}
                            row={r}
                            options={mergedLocationOptions}
                            disabled={busy}
                            onSaved={() => void runLookup()}
                          />
                        </td>
                        <td style={{ padding: "5px 8px", fontWeight: 850, verticalAlign: "middle" }}>
                          {lotOrSerialValue(r)}
                        </td>
                        <td style={{ padding: "5px 8px", fontWeight: 850, verticalAlign: "middle" }}>{r.qty ?? 0}</td>
                        <td style={{ padding: "5px 8px", opacity: 0.9, verticalAlign: "middle" }}>
                          {r.expiration_date ?? "—"}
                        </td>
                        <td style={{ padding: "5px 8px", opacity: 0.8, verticalAlign: "middle", fontSize: 12 }}>
                          {fmtDateTime(r.created_at)}
                        </td>
                      </tr>
                    ))}

                    {shown.rows.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: "8px 10px", opacity: 0.75 }}>
                          No rows found for this SKU (or none in this location).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.35 }}>
                We treat your “Lot/Serial Number” as a single identifier per row (matches your import/export reality).
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
