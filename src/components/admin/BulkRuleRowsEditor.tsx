"use client";

import { formatBulkPricePerSqcmLabel } from "@/lib/bulkRules";
import {
  createEmptyBulkRuleDraft,
  parseAllBulkRuleDrafts,
  type BulkRuleDraft,
} from "@/lib/bulkPricingRuleDraft";

export type BulkRuleProductOption = {
  id: string;
  name: string;
  code?: string | null;
};

type Props = {
  rules: BulkRuleDraft[];
  setRules: React.Dispatch<React.SetStateAction<BulkRuleDraft[]>>;
  /** Catalog products for per-product scope; omit/empty = all-products only */
  products?: BulkRuleProductOption[];
  /** Shown when there are no rules */
  emptyHint?: string;
  /** Prefill $/sq cm when adding a rule */
  defaultPricePerSqcm?: string;
};

export default function BulkRuleRowsEditor(props: Props) {
  const { rules, setRules, products = [], emptyHint, defaultPricePerSqcm } = props;
  const parsed = parseAllBulkRuleDrafts(rules);
  const canScopeByProduct = products.length > 0;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {rules.length ? (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.75 }}>
            Each tier sets the <b>base price per sq cm</b> at or above that total sq cm. Choose{" "}
            <b>All products</b> to apply the tier account-wide, or pick a product for a product-specific rate
            (product rules override all-products rules for that SKU family).
          </div>
          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: canScopeByProduct
                  ? "minmax(0, 1.2fr) minmax(0, 0.9fr) minmax(0, 0.9fr) auto"
                  : "minmax(0, 1fr) minmax(0, 1fr) auto",
                padding: 10,
                background: "rgba(0,0,0,0.03)",
                gap: 8,
              }}
            >
              {canScopeByProduct ? <div style={{ fontWeight: 900, fontSize: 12 }}>Applies to</div> : null}
              <div style={{ fontWeight: 900, fontSize: 12 }}>Min total sq cm</div>
              <div style={{ fontWeight: 900, fontSize: 12 }}>Base $ / sq cm</div>
              <div />
            </div>
            {rules.map((r) => {
              const p = parsed.find((x) => x.id === r.id);
              const isInvalid = p ? !p.valid : false;
              const border = isInvalid ? "1px solid rgba(220,0,0,0.45)" : "1px solid rgba(0,0,0,0.16)";

              return (
                <div
                  key={r.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: canScopeByProduct
                      ? "minmax(0, 1.2fr) minmax(0, 0.9fr) minmax(0, 0.9fr) auto"
                      : "minmax(0, 1fr) minmax(0, 1fr) auto",
                    gap: 8,
                    padding: 10,
                    borderTop: "1px solid rgba(0,0,0,0.08)",
                    alignItems: "start",
                  }}
                >
                  {canScopeByProduct ? (
                    <select
                      value={r.productId}
                      onChange={(e) =>
                        setRules((prev) =>
                          prev.map((x) => (x.id === r.id ? { ...x, productId: e.target.value } : x))
                        )
                      }
                      style={{
                        width: "100%",
                        minWidth: 0,
                        boxSizing: "border-box",
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid rgba(0,0,0,0.16)",
                        fontWeight: 800,
                        background: "white",
                      }}
                    >
                      <option value="">All products</option>
                      {products.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name}
                          {prod.code ? ` (${prod.code})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <input
                    value={r.minSqcm}
                    onChange={(e) =>
                      setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, minSqcm: e.target.value } : x)))
                    }
                    inputMode="numeric"
                    placeholder="e.g. 0"
                    style={{
                      width: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                      padding: "8px 10px",
                      borderRadius: 10,
                      border,
                      fontWeight: 900,
                    }}
                  />
                  <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                    <input
                      value={r.pricePerSqcm}
                      onChange={(e) =>
                        setRules((prev) =>
                          prev.map((x) => (x.id === r.id ? { ...x, pricePerSqcm: e.target.value } : x))
                        )
                      }
                      inputMode="decimal"
                      placeholder={defaultPricePerSqcm ? `e.g. ${defaultPricePerSqcm}` : "e.g. 9"}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "8px 10px",
                        borderRadius: 10,
                        border,
                        fontWeight: 900,
                      }}
                    />
                    {p?.valid && p.price_per_sqcm != null ? (
                      <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.65 }}>
                        Stored: <b>${formatBulkPricePerSqcmLabel(p.price_per_sqcm)}</b>/sq cm
                        {p.product_id ? " · product-specific" : " · all products"}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRules((prev) => prev.filter((x) => x.id !== r.id))}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "white",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, opacity: 0.7 }}>{emptyHint ?? "No bulk rules yet."}</div>
      )}
      <button
        type="button"
        onClick={() =>
          setRules((prev) => [
            ...prev,
            createEmptyBulkRuleDraft({
              pricePerSqcm: defaultPricePerSqcm,
            }),
          ])
        }
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.12)",
          background: "white",
          fontWeight: 900,
          cursor: "pointer",
          width: "fit-content",
        }}
      >
        Add rule
      </button>
    </div>
  );
}
