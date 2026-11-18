"use client";

import { useMemo, useState } from "react";

type ImportResult =
  | { ok: true; imported_rows: number; affected_variants: number; missing_skus: string[] }
  | { ok: false; error: string; missing_skus?: string[]; missing_count?: number };

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

function textareaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 200,
    resize: "vertical",
    lineHeight: 1.35,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    fontSize: 12.5,
    fontWeight: 800,
  };
}

function buttonStyle(kind: "primary" | "default" | "muted"): React.CSSProperties {
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

type ParsedRow = {
  ["Lot/Serial Number"]: string;
  Product: string | null;
  ["On Hand Quantity"]: number;
  ["Created on"]?: string | null;
};

function parseMaybeNumber(v: string): number {
  const raw = String(v ?? "").trim();
  if (!raw) return 0;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/;

/** Warehouse export format. Supports:
 * - Location headers: "WH/Stock (3431)"
 * - Format A: timestamp \t lot_serial \t [SKU] product
 * - Format B: [SKU] product \t timestamp \t lot_serial
 * Each data row = qty 1.
 */
function parseWarehouseFormat(text: string): ParsedRow[] {
  const src = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = src.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const out: ParsedRow[] = [];

  for (const line of lines) {
    // Location header: "WH/Stock (3431)" — emit as location row (Product blank) so API sets currentLocation
    if (/^.+?\s*\(\s*\d+\s*\)\s*$/.test(line) && !line.includes("[")) {
      out.push({
        ["Lot/Serial Number"]: line,
        Product: null,
        ["On Hand Quantity"]: 0,
        ["Created on"]: null,
      });
      continue;
    }

    const parts = line.split(/\t+/).map((s) => s.trim()).filter((s) => s.length > 0);
    if (parts.length < 3) continue;

    let product: string;
    let lotSerial: string;
    let createdOn: string;

    if (TIMESTAMP_RE.test(parts[0] ?? "")) {
      // Format A: timestamp, lot_serial, product
      createdOn = parts[0] ?? "";
      lotSerial = parts[1] ?? "";
      product = parts[2] ?? "";
    } else if (/\[[^\]]+\]/.test(parts[0] ?? "")) {
      // Format B: [SKU] product, timestamp, lot_serial
      product = parts[0] ?? "";
      createdOn = parts[1] ?? "";
      lotSerial = parts[2] ?? "";
    } else {
      continue;
    }

    if (!product || !/\[[^\]]+\]/.test(product)) continue;
    if (!lotSerial) continue;

    out.push({
      ["Lot/Serial Number"]: lotSerial,
      Product: product,
      ["On Hand Quantity"]: 1,
      ["Created on"]: createdOn || null,
    });
  }

  return out;
}

// tolerant CSV/TSV parser
function parseDelimited(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const src = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = src.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headerLine = lines[0] ?? "";
  const tabCount = (headerLine.match(/\t/g) ?? []).length;
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  const delim = tabCount > commaCount ? "\t" : ",";

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        const next = line[i + 1];
        if (inQuotes && next === '"') {
          cur += '"';
          i++;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }

      if (!inQuotes && ch === delim) {
        out.push(cur);
        cur = "";
        continue;
      }

      cur += ch;
    }

    out.push(cur);
    return out.map((s) => s.trim());
  };

  const headers = parseLine(lines[0]!).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (const line of lines.slice(1)) {
    const cells = parseLine(line);
    const rec: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) rec[headers[i]!] = cells[i] ?? "";
    rows.push(rec);
  }

  return { headers, rows };
}

function normalizeRows(rawRows: Record<string, string>[]): ParsedRow[] {
  const out: ParsedRow[] = [];

  for (const r of rawRows) {
    const lotSerial =
      (r["Lot/Serial Number"] ?? r["Lot/Serial"] ?? r["LotSerial"] ?? r["lot_serial"] ?? "").trim();

    const productRaw = (r["Product"] ?? r["product"] ?? "").trim();
    const qtyRaw = r["On Hand Quantity"] ?? r["OnHandQuantity"] ?? r["qty"] ?? "";
    const createdRaw = (r["Created on"] ?? r["created_on"] ?? "").trim();

    out.push({
      ["Lot/Serial Number"]: lotSerial,
      Product: productRaw ? productRaw : null,
      ["On Hand Quantity"]: parseMaybeNumber(qtyRaw),
      ["Created on"]: createdRaw || null,
    });
  }

  return out;
}

function extractSkuFromProduct(product: string): string | null {
  const s = String(product ?? "").trim();
  if (!s) return null;
  const m = s.match(/^\s*\[([^\]]+)\]/);
  if (!m) return null;
  const sku = String(m[1] ?? "").trim();
  return sku || null;
}

function uniqueStrings(values: string[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (s) set.add(s);
  }
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
}

function buildMissingSkuSql(missingSkus: string[]): string {
  const list = uniqueStrings(missingSkus);
  if (list.length === 0) return "";

  const values = list.map((s) => `    ('${s.replace(/'/g, "''")}')`).join(",\n");

  return `-- 1) Create/reuse the IMPORTED product (safe)
with existing as (
  select id
  from public.products
  where code = 'IMPORTED'
  order by created_at asc
  limit 1
),
ins as (
  insert into public.products (name, code, is_active, base_unit_price)
  select 'Imported / Needs Mapping', 'IMPORTED', true, 0
  where not exists (select 1 from existing)
  returning id
),
p as (
  select id as product_id from ins
  union all
  select id as product_id from existing
),
skus(sku) as (
values
${values}
),
insv as (
  insert into public.product_variants (product_id, sku, is_active, base_unit_price)
  select p.product_id, skus.sku, true, 0
  from p
  join skus on true
  where not exists (
    select 1 from public.product_variants v where v.sku = skus.sku
  )
  returning sku
)
select
  (select count(*) from skus) as requested,
  (select count(*) from insv) as inserted;`;
}

export default function InventoryImportClient() {
  const [text, setText] = useState("");
  const [reason, setReason] = useState("Initial on-hand import (current warehouse export)");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "muted" | "ok" | "warn"; text: string } | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [missingSkus, setMissingSkus] = useState<string[]>([]);

  const parsed = useMemo(() => {
    const warehouse = parseWarehouseFormat(text);
    if (warehouse.length > 0) return warehouse;
    const { rows } = parseDelimited(text);
    return normalizeRows(rows);
  }, [text]);

  const stats = useMemo(() => {
    // Only count real inventory rows (ones with Product present)
    const invRows = parsed.filter((r) => !!(r.Product && r.Product.trim()));
    const headerRows = parsed.length - invRows.length;

    const extracted = invRows
      .map((r) => extractSkuFromProduct(r.Product!))
      .filter((s): s is string => !!s);

    const distinctSkus = uniqueStrings(extracted);

    const totalQty = invRows.reduce((sum, r) => sum + (Number(r["On Hand Quantity"] ?? 0) || 0), 0);

    return {
      totalRows: parsed.length,
      invRows: invRows.length,
      headerRows,
      distinctSkus: distinctSkus.length,
      totalQty,
    };
  }, [parsed]);

  function buildPreview() {
    const p = parsed.slice(0, 12);
    setPreview(p);
    setMissingSkus([]);
    setMsg({
      tone: "muted",
      text: `Parsed ${parsed.length} row(s). Previewing first ${p.length}.`,
    });
  }

  async function runImport() {
    if (!text.trim()) {
      setMsg({ tone: "warn", text: "Paste your export (CSV or tab-delimited) first." });
      return;
    }

    setBusy(true);
    setMsg(null);
    setMissingSkus([]);

    try {
      const res = await fetch("/api/admin/inventory/import-stock-lot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rows: parsed,
          reason: String(reason || "").trim() || null,
        }),
      });

      const data: ImportResult = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

      if (!res.ok || !data.ok) {
        const err = (data as any)?.error || `Import failed (${res.status})`;
        const missing = ((data as any)?.missing_skus as string[] | undefined) ?? [];
        if (missing.length) {
          const uniq = uniqueStrings(missing);
          setMissingSkus(uniq);
          setMsg({
            tone: "warn",
            text: `${err} Missing SKU examples: ${uniq.slice(0, 12).join(", ")}${uniq.length > 12 ? "…" : ""}`,
          });
        } else {
          setMsg({ tone: "warn", text: err });
        }
        return;
      }

      setMsg({
        tone: "ok",
        text: `Imported ${data.imported_rows} row(s). Updated ${data.affected_variants} variant(s).`,
      });

      // Keep missingSkus cleared on success
      setMissingSkus([]);
    } catch (e: any) {
      setMsg({ tone: "warn", text: e?.message ? String(e.message) : "Network error" });
    } finally {
      setBusy(false);
    }
  }

  const missingSql = useMemo(() => buildMissingSkuSql(missingSkus), [missingSkus]);

  return (
    <div
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: C.borderSoft,
        borderRadius: 18,
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
        <div>Import current on-hand (Excel export)</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Mode: <b>SET on-hand to totals</b>
        </div>
      </div>

      <div style={{ padding: 12, display: "grid", gap: 12 }}>
        {msg ? (
          <div style={pillStyle(msg.tone)}>{msg.text}</div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Paste → Preview → Import. This is intended for baseline initialization only.
          </div>
        )}

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
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 950 }}>Paste format</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Rows: <b>{stats.totalRows}</b> · Inventory rows: <b>{stats.invRows}</b> · Headers: <b>{stats.headerRows}</b>
            </div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>
            <b>Warehouse formats:</b> Tab-separated. Each row = qty 1.
            <br />• <b>[SKU] product</b> tab <b>timestamp</b> tab <b>lot_serial</b> (e.g. [ACM0203] 2x3cm AmchoPlast)
            <br />• Or: <b>timestamp</b> tab <b>lot_serial</b> tab <b>[SKU] product</b>
            <br />• Location headers like <b>WH/Stock (3431)</b> allowed.
            <br />
            <b>Excel:</b> Headers Lot/Serial Number, Product, On Hand Quantity, Created on.
          </div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Distinct SKUs detected (from <b>[SKU]</b>): <b>{stats.distinctSkus}</b> · Total qty: <b>{stats.totalQty}</b>
          </div>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Paste export (CSV or tab-delimited)</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`[ACM0203] 2x3cm AmchoPlast\t2026-01-19 17:32:29\t620021002
[EAP-46] 4x6cm EvoPatch Dual Layer Amnion\t2026-01-19 17:32:29\t24J1207-026
...`}
            style={textareaStyle()}
          />
        </label>

        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 340px)",
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Reason</div>
            <input value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle()} />
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={buildPreview}
              disabled={busy}
              style={{ ...buttonStyle("default"), cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.65 : 1 }}
            >
              Preview parse
            </button>

            <button
              type="button"
              onClick={runImport}
              disabled={busy}
              style={{ ...buttonStyle("primary"), cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.65 : 1 }}
            >
              {busy ? "Importing…" : "Import / Set On-hand"}
            </button>

            <button
              type="button"
              onClick={() => {
                setText("");
                setPreview([]);
                setMissingSkus([]);
                setMsg({ tone: "muted", text: "Cleared import paste." });
              }}
              disabled={busy}
              style={{ ...buttonStyle("muted"), cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.65 : 1 }}
            >
              Clear
            </button>
          </div>
        </div>

        {missingSkus.length > 0 && (
          <div
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "rgba(220, 53, 69, 0.25)",
              borderRadius: 14,
              padding: 12,
              background: "rgba(220, 53, 69, 0.05)",
              display: "grid",
              gap: 10,
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 950 }}>Missing SKUs</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Count: <b>{missingSkus.length}</b>
              </div>
            </div>

            <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.35 }}>
              These SKUs aren’t in <b>product_variants</b>. Copy the SQL below into Supabase SQL editor, run it once,
              then retry Import.
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>SQL to create placeholder variants</div>
              <textarea value={missingSql} readOnly style={{ ...textareaStyle(), minHeight: 220 }} />
            </div>

            <div style={{ fontSize: 12, opacity: 0.8 }}>
              After the import succeeds, you can later reassign those variants to the correct products without losing inventory history.
            </div>
          </div>
        )}

        {preview.length > 0 && (
          <div
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: C.borderSubtle,
              borderRadius: 14,
              padding: 12,
              background: "white",
              display: "grid",
              gap: 10,
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950 }}>Preview (first {preview.length})</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Parsed total: <b>{parsed.length}</b>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.7 }}>
                    <th style={{ padding: 10 }}>Lot/Serial Number</th>
                    <th style={{ padding: 10 }}>Product</th>
                    <th style={{ padding: 10, width: 120 }}>On Hand</th>
                    <th style={{ padding: 10, width: 180 }}>Created on</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderWidth: 0,
                        borderStyle: "solid",
                        borderColor: C.borderSubtle,
                        borderTopWidth: 1,
                      }}
                    >
                      <td style={{ padding: 10, fontWeight: 950 }}>{r["Lot/Serial Number"] || "—"}</td>
                      <td style={{ padding: 10, opacity: 0.9 }}>{r.Product ?? "—"}</td>
                      <td style={{ padding: 10, fontWeight: 950 }}>{r["On Hand Quantity"] ?? 0}</td>
                      <td style={{ padding: 10, opacity: 0.85 }}>{r["Created on"] ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.35 }}>
              Notes:
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                <li>Rows with blank Product are treated as location headers (e.g. <b>ADBI/Stock (8)</b>).</li>
                <li>SKU is extracted from Product like <b>[MW0202]</b>.</li>
                <li>Import sets on-hand totals for each SKU to match the sheet totals.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
