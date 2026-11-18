"use client";

import React, { useMemo, useState } from "react";

type OrderItemRow = {
  id: string;
  product_variant_id: string | null;
  description: string | null;
  quantity: number | null;
  uom: string | null;
  unit_price: number | null;
  discount_percent: number | null;
  line_total: number | null;
  line_type: "PRODUCT" | "SHIPPING" | string;
  sort_order: number | null;
};

type ProductRow = {
  id: string;
  name: string;
  code: string | null;
  qcode: string | null;
  base_unit_price: number | null;
};

type VariantRow = {
  id: string;
  product_id: string;
  sku: string;
  size_label: string | null;
  base_unit_price: number | null;
  is_active?: boolean | null;
};

function safeStr(v: any): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

function safeInt(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  return Math.floor(n);
}

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function pill(text: string, tone: "muted" | "ok" | "warn"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(0,0,0,0.12)",
    whiteSpace: "nowrap",
    lineHeight: 1,
    background: "white",
  };
  if (tone === "ok") return { ...base, background: "rgba(25, 135, 84, 0.12)" };
  if (tone === "warn") return { ...base, background: "rgba(220, 53, 69, 0.12)" };
  return { ...base, background: "rgba(0,0,0,0.04)", opacity: 0.9 };
}

type LineDraft = {
  variantId: string;
  sku: string;
  label: string;
  qty: number;
  unit: number; // base
};

export default function DraftOrderEditorClient(props: {
  orderId: string;
  discountPercent: number;
  initialItems: OrderItemRow[];

  // For adding new items:
  products: ProductRow[];
  variants: VariantRow[];
}) {
  const discountPct = Math.max(0, Math.min(100, Number(props.discountPercent ?? 0) || 0));

  const variantById = useMemo(() => {
    const m = new Map<string, VariantRow>();
    for (const v of props.variants ?? []) m.set(String(v.id), v);
    return m;
  }, [props.variants]);

  const productById = useMemo(() => {
    const m = new Map<string, ProductRow>();
    for (const p of props.products ?? []) m.set(String(p.id), p);
    return m;
  }, [props.products]);

  // Seed editable product lines from initialItems (PRODUCT lines only)
  const initialProductLines = useMemo(() => {
    const out: LineDraft[] = [];
    for (const it of props.initialItems ?? []) {
      if (String(it.line_type || "").toUpperCase() !== "PRODUCT") continue;
      if (!it.product_variant_id) continue;

      const v = variantById.get(String(it.product_variant_id));
      const sku = safeStr(v?.sku) || "SKU";
      const size = safeStr(v?.size_label);
      const p = v ? productById.get(String(v.product_id)) : null;
      const pName = safeStr(p?.name) || safeStr(it.description) || "Product";
      const label = size ? `${pName} • ${sku} • ${size}` : `${pName} • ${sku}`;

      out.push({
        variantId: String(it.product_variant_id),
        sku,
        label,
        qty: safeInt(it.quantity ?? 0),
        unit: Number(v?.base_unit_price ?? it.unit_price ?? 0) || 0,
      });
    }

    // de-dupe by variantId (keep last)
    const by = new Map<string, LineDraft>();
    for (const l of out) by.set(l.variantId, l);
    return Array.from(by.values()).sort((a, b) => a.sku.localeCompare(b.sku));
  }, [props.initialItems, variantById, productById]);

  const [lines, setLines] = useState<LineDraft[]>(initialProductLines);

  const [addQuery, setAddQuery] = useState("");
  const [addProductId, setAddProductId] = useState<string>("");
  const [addVariantId, setAddVariantId] = useState<string>("");
  const [addQty, setAddQty] = useState<number>(1);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    const all = props.variants ?? [];
    if (!q) return all.slice(0, 80);

    const scored: Array<{ v: VariantRow; score: number }> = [];
    for (const v of all) {
      const sku = safeStr(v.sku).toLowerCase();
      const size = safeStr(v.size_label).toLowerCase();
      const p = productById.get(String(v.product_id));
      const pname = safeStr(p?.name).toLowerCase();

      let score = 0;
      if (sku.includes(q)) score += 5;
      if (pname.includes(q)) score += 3;
      if (size.includes(q)) score += 2;
      if (score > 0) scored.push({ v, score });
    }

    scored.sort((a, b) => b.score - a.score || safeStr(a.v.sku).localeCompare(safeStr(b.v.sku)));
    return scored.slice(0, 80).map((x) => x.v);
  }, [addQuery, props.variants, productById]);

  const variantsForProduct = useMemo(() => {
    if (!addProductId) return candidates;
    return candidates.filter((v) => String(v.product_id) === String(addProductId));
  }, [candidates, addProductId]);

  const totals = useMemo(() => {
    const base = lines.reduce((sum, l) => sum + (Number(l.unit) || 0) * (Number(l.qty) || 0), 0);
    const discountAmount = base * (discountPct / 100);
    const after = base - discountAmount;
    return { base, discountAmount, after };
  }, [lines, discountPct]);

  function upsertLine(variantId: string, qty: number) {
    const v = variantById.get(String(variantId));
    if (!v) return;

    const sku = safeStr(v.sku) || "SKU";
    const size = safeStr(v.size_label);
    const p = productById.get(String(v.product_id));
    const pName = safeStr(p?.name) || "Product";
    const label = size ? `${pName} • ${sku} • ${size}` : `${pName} • ${sku}`;

    setLines((prev) => {
      const next = [...prev];
      const idx = next.findIndex((x) => String(x.variantId) === String(variantId));
      const unit = Number(v.base_unit_price ?? 0) || 0;

      if (qty <= 0) {
        if (idx >= 0) next.splice(idx, 1);
        return next.sort((a, b) => a.sku.localeCompare(b.sku));
      }

      const row: LineDraft = { variantId: String(variantId), sku, label, qty, unit };
      if (idx >= 0) next[idx] = row;
      else next.push(row);

      return next.sort((a, b) => a.sku.localeCompare(b.sku));
    });
  }

  function removeLine(variantId: string) {
    setLines((prev) => prev.filter((x) => String(x.variantId) !== String(variantId)));
  }

  function addSelected() {
    const vid = safeStr(addVariantId);
    if (!vid) return;
    const qn = safeInt(addQty);
    if (qn <= 0) return;

    const existing = lines.find((l) => String(l.variantId) === vid);
    upsertLine(vid, (existing?.qty ?? 0) + qn);

    setAddVariantId("");
    setAddProductId("");
    setAddQty(1);
    setAddQuery("");
  }

  async function saveChanges() {
    setBusy(true);
    setErr(null);
    setOkMsg(null);

    try {
      const payload = {
        // ✅ only PRODUCT lines, no shipping, no discount snapshot fields
        items: lines
          .map((l) => ({ product_variant_id: l.variantId, quantity: safeInt(l.qty) }))
          .filter((x) => !!x.product_variant_id && x.quantity > 0),
      };

      if (payload.items.length < 1) {
        setErr("Please keep at least 1 product item on the draft order.");
        setBusy(false);
        return;
      }

      const res = await fetch(`/api/portal/orders/${encodeURIComponent(props.orderId)}/update-items`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErr(data?.error || `Failed to save (${res.status})`);
        setBusy(false);
        return;
      }

      setOkMsg("Saved. Refreshing…");
      window.location.reload();
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : "Network error");
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {err ? (
        <div
          style={{
            border: "1px solid rgba(220,53,69,0.35)",
            background: "rgba(220,53,69,0.08)",
            color: "crimson",
            borderRadius: 14,
            padding: 12,
            fontWeight: 900,
          }}
        >
          {err}
        </div>
      ) : null}

      {okMsg ? (
        <div
          style={{
            border: "1px solid rgba(25,135,84,0.35)",
            background: "rgba(25,135,84,0.08)",
            borderRadius: 14,
            padding: 12,
            fontWeight: 900,
          }}
        >
          {okMsg}
        </div>
      ) : null}

      {/* Current lines */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.75 }}>
              <th style={{ padding: "10px 0" }}>Item</th>
              <th style={{ padding: "10px 0", width: 140 }}>Qty</th>
              <th style={{ padding: "10px 0", width: 120, textAlign: "right" }}>Unit</th>
              <th style={{ padding: "10px 0", width: 140, textAlign: "right" }}>Line (base)</th>
              <th style={{ padding: "10px 0", width: 70 }} />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const lineBase = (Number(l.unit) || 0) * (Number(l.qty) || 0);
              return (
                <tr key={l.variantId} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: "12px 0", fontWeight: 950, minWidth: 260 }}>{l.label}</td>
                  <td style={{ padding: "12px 0" }}>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={String(l.qty ?? 0)}
                      onChange={(e) => upsertLine(l.variantId, safeInt(e.target.value))}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.18)",
                        fontWeight: 950,
                      }}
                    />
                    <div style={{ marginTop: 6, fontSize: 11, opacity: 0.65 }}>Set to 0 to remove</div>
                  </td>
                  <td style={{ padding: "12px 0", textAlign: "right", fontWeight: 900 }}>{money(l.unit)}</td>
                  <td style={{ padding: "12px 0", textAlign: "right", fontWeight: 950 }}>{money(lineBase)}</td>
                  <td style={{ padding: "12px 0", textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => removeLine(l.variantId)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.14)",
                        background: "white",
                        fontWeight: 950,
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}

            {lines.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "12px 0", opacity: 0.75 }}>
                  No product lines. Add at least one item.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Add products */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.7)",
          borderRadius: 18,
          padding: 14,
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 15 }}>Add products</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px 140px", gap: 10, alignItems: "end" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 900, fontSize: 12, opacity: 0.8 }}>Search</label>
            <input
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
              placeholder="Search product name / SKU / size…"
              style={{
                width: "100%",
                padding: "10px 10px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.18)",
                fontWeight: 950,
              }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 900, fontSize: 12, opacity: 0.8 }}>Product</label>
            <select
              value={addProductId}
              onChange={(e) => {
                setAddProductId(e.target.value);
                setAddVariantId("");
              }}
              style={{
                width: "100%",
                padding: "10px 10px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.18)",
                fontWeight: 950,
                background: "white",
              }}
            >
              <option value="">All products</option>
              {props.products.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontWeight: 900, fontSize: 12, opacity: 0.8 }}>Qty</label>
            <input
              type="number"
              min={1}
              step="1"
              value={String(addQty)}
              onChange={(e) => setAddQty(safeInt(e.target.value) || 1)}
              style={{
                width: "100%",
                padding: "10px 10px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.18)",
                fontWeight: 950,
              }}
            />
          </div>

          <button
            type="button"
            onClick={addSelected}
            disabled={!addVariantId}
            style={{
              padding: "12px 12px",
              borderRadius: 12,
              border: "none",
              background: !addVariantId ? "rgba(0,0,0,0.25)" : "#111",
              color: "white",
              fontWeight: 950,
              cursor: !addVariantId ? "not-allowed" : "pointer",
            }}
          >
            Add
          </button>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontWeight: 900, fontSize: 12, opacity: 0.8 }}>Variant</label>
          <select
            value={addVariantId}
            onChange={(e) => setAddVariantId(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 10px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.18)",
              fontWeight: 950,
              background: "white",
            }}
          >
            <option value="">— Select —</option>
            {variantsForProduct.map((v) => {
              const p = productById.get(String(v.product_id));
              const pName = safeStr(p?.name) || "Product";
              const size = safeStr(v.size_label);
              const label = size ? `${pName} • ${v.sku} • ${size}` : `${pName} • ${v.sku}`;
              const unit = Number(v.base_unit_price ?? 0) || 0;
              return (
                <option key={String(v.id)} value={String(v.id)}>
                  {label} — {money(unit)}
                </option>
              );
            })}
          </select>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Showing up to {variantsForProduct.length} matches.</div>
        </div>
      </div>

      {/* Totals preview (NO SHIPPING) */}
      <div
        style={{
          borderTop: "1px solid rgba(0,0,0,0.08)",
          paddingTop: 12,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={pill(`Base subtotal: ${money(totals.base)}`, "muted")} />
          <span style={pill(`Discount (${discountPct}%): −${money(totals.discountAmount)}`, discountPct > 0 ? "ok" : "muted")} />
          <span style={pill(`Subtotal (after): ${money(totals.after)}`, totals.after > 0 ? "ok" : "muted")} />
          <span style={pill(`Shipping: TBD`, "muted")} />
        </div>

        <button
          type="button"
          onClick={saveChanges}
          disabled={busy}
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            border: "none",
            background: busy ? "rgba(0,0,0,0.35)" : "#111",
            color: "white",
            fontWeight: 950,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>

      <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.45 }}>
        Shipping is entered by 360 Medical after submission. Saving only updates <b>product</b> items while the order is <b>DRAFT</b>.
      </div>
    </div>
  );
}
