"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type VariantRow = {
  id: string;
  sku: string;
  size_label: string | null;
  width_cm: number | null;
  length_cm: number | null;
  total_sqcm: number | null;
  is_active: boolean;
  bulk_enabled: boolean;
  base_unit_price: number | null;
  updated_at: string | null;
};

type InventoryRow = {
  variant_id: string;
  qty_on_hand: number;
  updated_at: string | null;
};

function pillActive(active: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: "1px solid rgba(0,0,0,0.12)",
    whiteSpace: "nowrap",
  };
  return active
    ? { ...base, background: "rgba(25, 135, 84, 0.14)" }
    : { ...base, background: "rgba(220, 53, 69, 0.12)" };
}

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function dateTime(v: any) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function VariantsManagerClient({
  productId,
  productBulkEnabled,
  variants,
  inventoryRows,
}: {
  productId: string;
  productBulkEnabled: boolean;
  variants: VariantRow[];
  inventoryRows: InventoryRow[];
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const invByVariant = useMemo(() => {
    const m: Record<string, InventoryRow> = {};
    for (const r of inventoryRows || []) m[String(r.variant_id)] = r;
    return m;
  }, [inventoryRows]);

  async function recalcPrices() {
    setMsg("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}/variants/recalculate`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg((data && data.error) || `Recalculate failed (${res.status}).`);
        return;
      }
      setMsg(`Recalculated: ${data?.updated ?? 0} updated.`);
      window.location.reload();
    } catch (e: any) {
      setMsg(e?.message ? String(e.message) : "Recalculate failed.");
    } finally {
      setBusy(false);
    }
  }

  async function setInventory(variantId: string, sku: string) {
    setMsg("");
    const current = invByVariant[String(variantId)]?.qty_on_hand;
    const next = window.prompt(`Set qty_on_hand for ${sku}:`, current == null ? "0" : String(current));
    if (next === null) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/variants/${encodeURIComponent(String(variantId))}/inventory`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ qty_on_hand: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg((data && data.error) || `Inventory update failed (${res.status}).`);
        return;
      }
      setMsg("Inventory updated.");
      window.location.reload();
    } catch (e: any) {
      setMsg(e?.message ? String(e.message) : "Inventory update failed.");
    } finally {
      setBusy(false);
    }
  }

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
          padding: 12,
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 950 }}>Variants</div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={recalcPrices}
            disabled={busy}
            style={{
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.14)",
              background: busy ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.04)",
              fontWeight: 950,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Working..." : "Recalculate Prices"}
          </button>

          <div style={{ fontSize: 12, opacity: 0.7 }}>base price × total sqcm</div>
        </div>
      </div>

      {msg ? (
        <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.08)", fontSize: 13, fontWeight: 900 }}>
          {msg}
        </div>
      ) : null}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.7 }}>
              <th style={{ padding: 12 }}>SKU</th>
              <th style={{ padding: 12 }}>Size</th>
              <th style={{ padding: 12 }}>Dims (cm)</th>
              <th style={{ padding: 12 }}>Total sqcm</th>
              <th style={{ padding: 12 }}>Price</th>
              <th style={{ padding: 12 }}>Inventory</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12 }}>Bulk</th>
              <th style={{ padding: 12, width: 1 }} />
            </tr>
          </thead>

          <tbody>
            {(variants ?? []).map((v) => {
              const inv = invByVariant[String(v.id)];
              const qty = inv?.qty_on_hand ?? null;

              return (
                <tr key={v.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: 12, fontWeight: 950 }}>{v.sku}</td>
                  <td style={{ padding: 12, opacity: 0.85 }}>{v.size_label ?? "—"}</td>
                  <td style={{ padding: 12, opacity: 0.85 }}>
                    {v.width_cm ?? "—"} × {v.length_cm ?? "—"}
                  </td>
                  <td style={{ padding: 12, fontWeight: 900 }}>{v.total_sqcm ?? "—"}</td>
                  <td style={{ padding: 12, fontWeight: 950 }}>{money(v.base_unit_price)}</td>

                  <td style={{ padding: 12 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 950 }}>{qty == null ? "—" : String(qty)}</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setInventory(v.id, v.sku)}
                        style={{
                          padding: "6px 8px",
                          borderRadius: 10,
                          border: "1px solid rgba(0,0,0,0.14)",
                          background: busy ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.03)",
                          fontWeight: 950,
                          cursor: busy ? "not-allowed" : "pointer",
                          fontSize: 12,
                        }}
                      >
                        Set
                      </button>
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>
                      {inv?.updated_at ? `Updated: ${dateTime(inv.updated_at)}` : "Not set"}
                    </div>
                  </td>

                  <td style={{ padding: 12 }}>
                    <span style={pillActive(!!v.is_active)}>{v.is_active ? "ACTIVE" : "INACTIVE"}</span>
                  </td>

                  <td style={{ padding: 12 }}>
                    {v.bulk_enabled ? (
                      <form
                        action={`/api/admin/variants/${encodeURIComponent(String(v.id))}/bulk`}
                        method="post"
                        style={{ display: "inline" }}
                      >
                        <input type="hidden" name="bulk_enabled" value="off" />
                        <button
                          type="submit"
                          disabled={!productBulkEnabled}
                          title={
                            productBulkEnabled
                              ? "Remove from bulk catalog"
                              : "Enable bulk on the product first"
                          }
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: "1px solid rgba(0,0,0,0.14)",
                            background: productBulkEnabled ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.06)",
                            fontWeight: 950,
                            cursor: productBulkEnabled ? "pointer" : "not-allowed",
                            fontSize: 12,
                          }}
                        >
                          Remove
                        </button>
                      </form>
                    ) : (
                      <form
                        action={`/api/admin/variants/${encodeURIComponent(String(v.id))}/bulk`}
                        method="post"
                        style={{ display: "inline" }}
                      >
                        <input type="hidden" name="bulk_enabled" value="on" />
                        <button
                          type="submit"
                          disabled={!productBulkEnabled}
                          title={
                            productBulkEnabled
                              ? "Include in bulk catalog"
                              : "Enable bulk on the product first"
                          }
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: "1px solid rgba(0,0,0,0.14)",
                            background: productBulkEnabled ? "rgba(13, 110, 253, 0.12)" : "rgba(0,0,0,0.06)",
                            fontWeight: 950,
                            cursor: productBulkEnabled ? "pointer" : "not-allowed",
                            fontSize: 12,
                          }}
                        >
                          Include
                        </button>
                      </form>
                    )}
                  </td>

                  <td style={{ padding: 12 }}>
                    <Link
                      href={`/admin/variants/${encodeURIComponent(String(v.id))}`}
                      style={{
                        textDecoration: "none",
                        fontWeight: 950,
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.12)",
                        background: "rgba(0,0,0,0.02)",
                        whiteSpace: "nowrap",
                        display: "inline-block",
                      }}
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              );
            })}

            {(variants ?? []).length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 18, opacity: 0.75 }}>
                  No variants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
