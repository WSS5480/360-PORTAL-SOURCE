"use client";

import { useMemo, useState } from "react";

type ProductRow = { id: string; name: string; code: string | null; qcode: string | null; base_unit_price: number | null };
type VariantRow = { id: string; product_id: string; sku: string; size_label: string | null; base_unit_price: number | null };
type InventoryRow = { variant_id: string; qty_on_hand: number; updated_at: string | null };
type BrochureMeta = { file_id: string; original_filename: string | null } | null;

type ShippingPriority = "GROUND" | "THREE_DAY" | "TWO_DAY" | "OVERNIGHT" | "OVERNIGHT_AM";

function safeQty(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function pill(text: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 9px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(0,0,0,0.04)",
    opacity: 0.9,
    whiteSpace: "nowrap",
    lineHeight: 1,
  };
}

export default function ProductPickerEditClient(props: {
  products: ProductRow[];
  variants: VariantRow[];
  inventoryRows: InventoryRow[];
  brochuresByProduct: Record<string, BrochureMeta>;
  initialQtyByVariant: Record<string, number>;
  initialShippingAmount: number;
  initialShippingPriority: ShippingPriority | string;
}) {
  const [q, setQ] = useState("");
  const [onlyInStock, setOnlyInStock] = useState(true);

  const [qtyByVariant, setQtyByVariant] = useState<Record<string, number>>({ ...(props.initialQtyByVariant ?? {}) });

  const [shippingAmount, setShippingAmount] = useState<string>(
    props.initialShippingAmount ? String(props.initialShippingAmount.toFixed(2)) : ""
  );

  const [shippingPriority, setShippingPriority] = useState<ShippingPriority>(
    (String(props.initialShippingPriority ?? "GROUND").toUpperCase() as ShippingPriority) || "GROUND"
  );

  const invByVariant = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of props.inventoryRows ?? []) m.set(String(r.variant_id), Number(r.qty_on_hand ?? 0) || 0);
    return m;
  }, [props.inventoryRows]);

  const variantsByProduct = useMemo(() => {
    const m = new Map<string, VariantRow[]>();
    for (const v of props.variants ?? []) {
      const pid = String(v.product_id);
      if (!m.has(pid)) m.set(pid, []);
      m.get(pid)!.push(v);
    }
    for (const [pid, arr] of m.entries()) {
      arr.sort((a, b) => String(a.sku).localeCompare(String(b.sku)));
      m.set(pid, arr);
    }
    return m;
  }, [props.variants]);

  const normQ = q.trim().toLowerCase();

  const filteredProducts = useMemo(() => {
    const out: Array<{ product: ProductRow; variants: Array<{ v: VariantRow; onHand: number; out: boolean }> }> = [];

    for (const p of props.products ?? []) {
      const pid = String(p.id);
      const list = variantsByProduct.get(pid) ?? [];

      const vRowsAll = list.map((v) => {
        const onHand = invByVariant.get(String(v.id)) ?? 0;
        const outOfStock = onHand <= 0;
        return { v, onHand, out: outOfStock };
      });

      const vRows = onlyInStock ? vRowsAll.filter((r) => !r.out) : vRowsAll;

      if (normQ) {
        const productText = [String(p.name ?? ""), String(p.code ?? ""), String(p.qcode ?? "")].join(" ").toLowerCase();
        const productMatched = productText.includes(normQ);
        const variantMatched = vRows.some((r) => String(r.v.sku ?? "").toLowerCase().includes(normQ) || String(r.v.size_label ?? "").toLowerCase().includes(normQ));
        if (!productMatched && !variantMatched) continue;
      }

      if (vRows.length === 0) continue;
      out.push({ product: p, variants: vRows });
    }

    return out;
  }, [props.products, variantsByProduct, invByVariant, onlyInStock, normQ]);

  function setQty(variantId: string, qty: number) {
    const vId = String(variantId);
    setQtyByVariant((prev) => {
      const next = { ...prev };
      if (!qty || qty <= 0) delete next[vId];
      else next[vId] = qty;
      return next;
    });
  }

  const itemCount = useMemo(() => Object.values(qtyByVariant).reduce((s, n) => s + (safeQty(n) || 0), 0), [qtyByVariant]);
  const canSubmit = itemCount > 0;

  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.10)", borderRadius: 16, overflow: "hidden", background: "white" }}>
      <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: 950 }}>Edit items</div>

      <div style={{ padding: 12, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products / SKUs / sizes..."
              style={{ width: 360, maxWidth: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.18)", fontWeight: 900 }}
            />
            <label style={{ display: "inline-flex", gap: 10, alignItems: "center", fontWeight: 900, fontSize: 13 }}>
              <input type="checkbox" checked={onlyInStock} onChange={(e) => setOnlyInStock(e.target.checked)} />
              Only in-stock
            </label>
            <span style={pill(`${filteredProducts.length} products`)} />
            <span style={pill(`${itemCount} items selected`)} />
          </div>
        </div>

        {/* shipping fields */}
        <div style={{ display: "grid", gap: 10, border: "1px solid rgba(0,0,0,0.10)", borderRadius: 14, padding: 12, background: "rgba(0,0,0,0.015)" }}>
          <div style={{ fontWeight: 950 }}>Shipping</div>

          <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
            <label style={{ fontWeight: 900 }}>Shipping Priority</label>
            <select
              name="shipping_priority"
              value={shippingPriority}
              onChange={(e) => setShippingPriority(e.target.value as ShippingPriority)}
              style={{ padding: "10px 10px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.18)", fontWeight: 900, background: "white" }}
            >
              <option value="GROUND">Ground (3–5 business days)</option>
              <option value="THREE_DAY">3-Day</option>
              <option value="TWO_DAY">2-Day</option>
              <option value="OVERNIGHT">Overnight</option>
              <option value="OVERNIGHT_AM">Overnight (AM)</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontWeight: 900 }}>Shipping Amount (optional)</label>
            <input
              name="shipping_amount"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={shippingAmount}
              onChange={(e) => setShippingAmount(e.target.value)}
              style={{ maxWidth: 240, padding: "10px 10px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.18)", fontWeight: 900 }}
            />
          </div>
        </div>

        {/* product list */}
        {filteredProducts.length === 0 ? (
          <div style={{ padding: 14, opacity: 0.75 }}>No products match your filters.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredProducts.map(({ product, variants }) => {
              const pid = String(product.id);
              return (
                <div key={pid} style={{ border: "1px solid rgba(0,0,0,0.10)", borderRadius: 16, overflow: "hidden", background: "white" }}>
                  <div style={{ padding: 12, fontWeight: 950 }}>{product.name}</div>

                  <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", padding: 10, overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ textAlign: "left", fontSize: 11, opacity: 0.7 }}>
                          <th style={{ padding: "8px 8px" }}>SKU</th>
                          <th style={{ padding: "8px 8px" }}>Size</th>
                          <th style={{ padding: "8px 8px", width: 110 }}>On hand</th>
                          <th style={{ padding: "8px 8px", width: 140 }}>Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map(({ v, onHand, out }) => {
                          const vId = String(v.id);
                          const currentQty = qtyByVariant[vId] ?? 0;

                          return (
                            <tr key={vId} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                              <td style={{ padding: "8px 8px", fontWeight: 900, whiteSpace: "nowrap" }}>{v.sku}</td>
                              <td style={{ padding: "8px 8px", opacity: 0.85 }}>{v.size_label ?? "—"}</td>
                              <td style={{ padding: "8px 8px", fontWeight: 900 }}>{out ? "OUT" : String(onHand)}</td>
                              <td style={{ padding: "8px 8px" }}>
                                <input
                                  name={`qty__${vId}`}
                                  type="number"
                                  min={0}
                                  step="1"
                                  placeholder="0"
                                  disabled={out}
                                  value={currentQty ? String(currentQty) : ""}
                                  onChange={(e) => setQty(vId, safeQty(e.target.value))}
                                  style={{ width: "100%", padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.18)", fontWeight: 900, fontSize: 13, opacity: out ? 0.55 : 1 }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!canSubmit ? (
          <div style={{ fontSize: 12, color: "crimson", fontWeight: 900 }}>
            Select at least one item quantity before saving changes.
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            marginTop: 2,
            padding: "12px 14px",
            borderRadius: 14,
            border: "none",
            background: "#111",
            color: "white",
            fontWeight: 950,
            cursor: canSubmit ? "pointer" : "not-allowed",
            width: "fit-content",
            opacity: canSubmit ? 1 : 0.55,
          }}
        >
          Save changes
        </button>

        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Saving changes replaces the current draft’s product lines with the selected quantities.
        </div>
      </div>
    </div>
  );
}
