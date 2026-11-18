"use client";

import React from "react";
import { formatProductSupportOverviewLineStatus } from "@/lib/surgical-sales/buildProductSupportOverviewBrief";
import type { ProductSupportOverviewProductLine } from "@/lib/surgical-sales/buildProductSupportOverviewBrief";
import { PRODUCT_SUPPORT_DETAIL_SECTION_LABELS } from "@/lib/surgical-sales/productSupportCaseDetailVocabulary";
import { productSupportCaseBriefingCss } from "./productSupportCaseBriefingCss";
import { userFacingError } from "@/lib/errors/userFacingError";

export function ProductSupportCaseProductsTab({
  caseId,
  lines,
  disabled,
  onAddProduct,
  onLineUpdated,
}: {
  caseId: string;
  lines: ProductSupportOverviewProductLine[];
  disabled?: boolean;
  onAddProduct?: () => void;
  onLineUpdated?: () => void | Promise<void>;
}) {
  const [drafts, setDrafts] = React.useState<Record<string, { qty: string; lot: string }>>({});
  const [savingLineId, setSavingLineId] = React.useState<string | null>(null);
  const [removingLineId, setRemovingLineId] = React.useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = React.useState<ProductSupportOverviewProductLine | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const next: Record<string, { qty: string; lot: string }> = {};
    for (const line of lines) {
      next[line.id] = {
        qty: line.actualQuantity != null ? String(line.actualQuantity) : "",
        lot: "",
      };
    }
    setDrafts(next);
  }, [lines]);

  async function saveLine(lineId: string) {
    const draft = drafts[lineId];
    if (!draft || disabled || savingLineId) return;
    setSavingLineId(lineId);
    setError(null);
    try {
      const qtyRaw = draft.qty.trim();
      const actual_quantity = qtyRaw === "" ? null : Number(qtyRaw);
      if (qtyRaw !== "" && !Number.isFinite(actual_quantity)) {
        throw new Error("Enter a valid quantity");
      }
      const res = await fetch(
        `/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/products/${encodeURIComponent(lineId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actual_quantity, notes: draft.lot.trim() || null }),
        },
      );
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "");
      await onLineUpdated?.();
    } catch (caught: unknown) {
      setError(userFacingError(caught, "Could not save product usage"));
    } finally {
      setSavingLineId(null);
    }
  }

  async function removeLine(line: ProductSupportOverviewProductLine) {
    if (disabled || savingLineId || removingLineId) return;
    if (!line.id || line.id === "primary-product") return;
    setRemovingLineId(line.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/products/${encodeURIComponent(line.id)}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "");
      setPendingRemove(null);
      await onLineUpdated?.();
    } catch (caught: unknown) {
      setError(userFacingError(caught, "Could not remove this product"));
    } finally {
      setRemovingLineId(null);
    }
  }

  const planned = lines;
  const used = lines.filter((line) => line.actualQuantity != null);
  const listBusy = Boolean(savingLineId || removingLineId);

  return (
    <div className="case-ps-products-stack">
      <style dangerouslySetInnerHTML={{ __html: productSupportCaseBriefingCss }} />

      <section className="case-ps-briefing-card" aria-labelledby="case-ps-planned-products">
        <div className="case-ps-briefing-card-head">
          <h2 id="case-ps-planned-products" className="case-ps-briefing-card-title">
            {PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.plannedProducts}
          </h2>
          {onAddProduct ? (
            <button type="button" className="case-ps-briefing-link" disabled={disabled || listBusy} onClick={onAddProduct}>
              Add product
            </button>
          ) : null}
        </div>
        {pendingRemove ? (
          <div className="case-ps-planned-confirm">
            <p className="case-ps-briefing-card-lead">
              Remove {pendingRemove.name}
              {pendingRemove.skuCode ? ` · SKU ${pendingRemove.skuCode}` : ""} from this case?
            </p>
            <div className="case-ps-planned-confirm-actions">
              <button
                type="button"
                className="case-ps-briefing-secondary-btn"
                disabled={listBusy}
                onClick={() => setPendingRemove(null)}
              >
                Keep
              </button>
              <button
                type="button"
                className="case-ps-planned-remove-confirm"
                disabled={listBusy}
                onClick={() => void removeLine(pendingRemove)}
              >
                {removingLineId === pendingRemove.id ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        ) : null}
        {planned.length > 0 ? (
          <ul className="case-ps-briefing-list">
            {planned.map((line) => (
              <li key={line.id} className="case-ps-planned-row">
                <span>
                  {line.name}
                  {line.skuCode ? ` · SKU ${line.skuCode}` : ""}
                  {line.expectedQuantity != null ? ` · Expected ${line.expectedQuantity}` : ""}
                </span>
                {line.id !== "primary-product" ? (
                  <button
                    type="button"
                    className="case-ps-planned-remove"
                    disabled={disabled || listBusy}
                    onClick={() => {
                      setError(null);
                      setPendingRemove(line);
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="case-ps-briefing-card-lead">No products planned yet.</p>
        )}
      </section>

      <section className="case-ps-briefing-card" aria-labelledby="case-ps-used-products">
        <h2 id="case-ps-used-products" className="case-ps-briefing-card-title">
          {PRODUCT_SUPPORT_DETAIL_SECTION_LABELS.actualProductsUsed}
        </h2>
        {lines.length > 0 ? (
          <div className="case-ps-products-stack">
            {lines.map((line) => {
              const draft = drafts[line.id] ?? { qty: "", lot: "" };
              return (
                <div key={line.id} className="case-ps-product-line">
                  <p className="case-ps-briefing-card-title" style={{ fontSize: 14 }}>
                    {line.name}
                  </p>
                  <p className="case-ps-briefing-card-lead">{formatProductSupportOverviewLineStatus(line)}</p>
                  <label className="case-ps-briefing-card-lead">
                    Quantity used
                    <input
                      className="case-ps-field-notes-area"
                      style={{ minHeight: 40, marginTop: 4 }}
                      inputMode="decimal"
                      value={draft.qty}
                      disabled={disabled || savingLineId === line.id || Boolean(removingLineId)}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [line.id]: { ...draft, qty: event.target.value },
                        }))
                      }
                      onBlur={() => void saveLine(line.id)}
                    />
                  </label>
                  <label className="case-ps-briefing-card-lead">
                    Lot / notes
                    <input
                      className="case-ps-field-notes-area"
                      style={{ minHeight: 40, marginTop: 4 }}
                      value={draft.lot}
                      placeholder="If known"
                      disabled={disabled || savingLineId === line.id || Boolean(removingLineId)}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [line.id]: { ...draft, lot: event.target.value },
                        }))
                      }
                      onBlur={() => void saveLine(line.id)}
                    />
                  </label>
                  <button
                    type="button"
                    className="case-ps-briefing-secondary-btn"
                    style={{ minHeight: 40 }}
                    disabled={disabled || savingLineId === line.id || Boolean(removingLineId)}
                    onClick={() => void saveLine(line.id)}
                  >
                    Mark product used
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="case-ps-briefing-card-lead">Add a product to track planned vs actual usage.</p>
        )}
        {used.length > 0 ? (
          <p className="case-ps-briefing-card-lead">{used.length} product line{used.length === 1 ? "" : "s"} logged.</p>
        ) : null}
      </section>

      {error ? <p className="case-ps-field-notes-meta" style={{ color: "var(--danger)" }}>{error}</p> : null}
    </div>
  );
}
