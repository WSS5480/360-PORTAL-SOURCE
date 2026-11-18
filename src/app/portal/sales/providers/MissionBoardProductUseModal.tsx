"use client";

import React from "react";
import { sc, surgicalCaseModalActionsCss } from "@/components/sales/salesCommandUi";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { providerDisplayName } from "@/lib/surgical-sales/providerDirectoryLinks";
import { logMissionBoardProductUse } from "@/lib/surgical-sales/missionBoardCommitmentOutcomesClient";
import { missionBoardEvaluationPathCss } from "./missionBoardEvaluationPathCss";

const backdropStyle: React.CSSProperties = { ...sc.modalBackdrop, zIndex: 10053 };
const panelStyle: React.CSSProperties = {
  ...sc.modalPanel,
  maxWidth: "min(480px, calc(100vw - 24px))",
};

export function MissionBoardProductUseModal({
  provider,
  busy,
  onClose,
  onSaved,
}: {
  provider: ProviderDirectoryRow;
  busy?: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}) {
  const providerName = providerDisplayName(provider);
  const today = new Date().toISOString().slice(0, 10);
  const [recordedDate, setRecordedDate] = React.useState(today);
  const [productPath, setProductPath] = React.useState("");
  const [caseProcedure, setCaseProcedure] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const disabled = Boolean(busy) || saving;

  async function handleSave() {
    if (disabled) return;
    setSaving(true);
    setError(null);
    try {
      const result = await logMissionBoardProductUse({
        providerId: provider.id,
        recordedDate: recordedDate.trim() || today,
        productPath: productPath.trim() || null,
        caseProcedure: caseProcedure.trim() || null,
        quantity: quantity.trim() || null,
        notes: notes.trim() || null,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `${surgicalCaseModalActionsCss}\n${missionBoardEvaluationPathCss}` }} />
      <div
        style={backdropStyle}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !disabled) onClose();
        }}
      >
        <div
          className="mission-board-evaluation-path-modal"
          style={panelStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mission-board-product-use-title"
          data-testid="mission-board-product-use-modal"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <header className="mb-eval-path__head">
            <p className="mb-eval-path__kicker">{providerName}</p>
            <h2 id="mission-board-product-use-title" className="mb-eval-path__title">
              Log product use
            </h2>
          </header>

          <div className="mb-eval-path__field">
            <label className="mb-eval-path__field-label" htmlFor="mb-product-use-date">Date</label>
            <input
              id="mb-product-use-date"
              type="date"
              className="mb-eval-path__field-input"
              value={recordedDate}
              disabled={disabled}
              onChange={(e) => setRecordedDate(e.target.value)}
            />
          </div>

          <div className="mb-eval-path__field">
            <label className="mb-eval-path__field-label" htmlFor="mb-product-use-path">
              Product / path (optional)
            </label>
            <input
              id="mb-product-use-path"
              className="mb-eval-path__field-input"
              value={productPath}
              disabled={disabled}
              onChange={(e) => setProductPath(e.target.value)}
            />
          </div>

          <div className="mb-eval-path__field">
            <label className="mb-eval-path__field-label" htmlFor="mb-product-use-case">
              Case / procedure (optional)
            </label>
            <input
              id="mb-product-use-case"
              className="mb-eval-path__field-input"
              value={caseProcedure}
              disabled={disabled}
              onChange={(e) => setCaseProcedure(e.target.value)}
            />
          </div>

          <div className="mb-eval-path__field">
            <label className="mb-eval-path__field-label" htmlFor="mb-product-use-qty">
              Quantity (optional)
            </label>
            <input
              id="mb-product-use-qty"
              className="mb-eval-path__field-input"
              value={quantity}
              disabled={disabled}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="mb-eval-path__field">
            <label className="mb-eval-path__field-label" htmlFor="mb-product-use-notes">
              Notes (optional)
            </label>
            <textarea
              id="mb-product-use-notes"
              className="mb-eval-path__field-input"
              rows={3}
              value={notes}
              disabled={disabled}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error ? <p className="mb-eval-path__error">{error}</p> : null}

          <div className="surgical-case-modal-actions">
            <button type="button" className="sc-btn sc-btn--ghost" disabled={disabled} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--primary"
              disabled={disabled}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving…" : "Log use"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
