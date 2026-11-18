"use client";

import React from "react";
import { salesDictationOptions, useSpeechDictation } from "@/hooks/useSpeechDictation";
import { SURGICAL_PHI_UI_NOTICE } from "@/lib/surgical-sales/labels";
import {
  buildProductSupportOutcomePatch,
  parseProductSupportCaseOutcome,
  PRODUCT_SUPPORT_CASE_OUTCOME_LABELS,
  PRODUCT_SUPPORT_CASE_OUTCOMES,
  type ProductSupportCaseOutcomeId,
} from "@/lib/surgical-sales/productSupportCaseOutcome";
import { productSupportCaseExecuteCss } from "./productSupportCaseExecuteCss";
import { userFacingError } from "@/lib/errors/userFacingError";

export type ProductSupportExecuteLine = {
  id: string;
  name: string;
  skuCode?: string | null;
  expectedQuantity?: number | null;
  actualQuantity?: number | null;
  lotOrNotes?: string | null;
};

type DocumentUploadKind = "purchase_order" | "invoice" | "product_photo" | "tray_photo" | "case_document";

const DOCUMENT_UPLOAD_OPTIONS: Array<{ id: DocumentUploadKind; label: string; uploadedKey?: string }> = [
  { id: "purchase_order", label: "Upload PO", uploadedKey: "purchase_order" },
  { id: "invoice", label: "Upload invoice", uploadedKey: "invoice" },
  { id: "product_photo", label: "Product photo", uploadedKey: "product_photo" },
  { id: "tray_photo", label: "Tray photo", uploadedKey: "tray_photo" },
  { id: "case_document", label: "Case document", uploadedKey: "case_document" },
];

function dictationButtonLabel(state: string, transcribing: boolean, listening: boolean): string {
  if (transcribing) return "Transcribing…";
  if (listening) return "Listening… Tap to save";
  if (state === "paused") return "Paused — Tap to save";
  if (state === "error") return "Retry dictation";
  return "Dictate case recap";
}

function SectionCard({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="case-ps-detail-card case-ps-execute-section" aria-labelledby={id}>
      <h2 id={id} className="case-ps-detail-card-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ProductSupportCaseExecute({
  caseId,
  caseRow,
  lines,
  uploadedDocumentTypes,
  disabled,
  onAddProduct,
  onLineUpdated,
  onPatchCase,
  onUploadDocument,
  onCompleteCase,
}: {
  caseId: string;
  caseRow: Record<string, unknown>;
  lines: ProductSupportExecuteLine[];
  uploadedDocumentTypes?: string[];
  disabled?: boolean;
  onAddProduct?: () => void;
  onLineUpdated?: () => void | Promise<void>;
  onPatchCase: (body: Record<string, unknown>) => Promise<boolean>;
  onUploadDocument: (kind: DocumentUploadKind) => void;
  onCompleteCase?: () => void;
}) {
  const selectedOutcome = parseProductSupportCaseOutcome(caseRow.case_support_outcome as string | null | undefined);
  const [lineDrafts, setLineDrafts] = React.useState<Record<string, { qty: string; lot: string }>>({});
  const [savingLineId, setSavingLineId] = React.useState<string | null>(null);
  const [savingOutcome, setSavingOutcome] = React.useState(false);
  const [dictationDraft, setDictationDraft] = React.useState("");
  const [savingRecap, setSavingRecap] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const next: Record<string, { qty: string; lot: string }> = {};
    for (const line of lines) {
      next[line.id] = {
        qty: line.actualQuantity != null ? String(line.actualQuantity) : "",
        lot: line.lotOrNotes?.trim() ?? "",
      };
    }
    setLineDrafts(next);
  }, [lines]);

  const {
    dictationUiState,
    dictating,
    transcribing,
    dictationError,
    browserSupported,
    startDictation,
    stopDictationAsync,
    teardownDictation,
  } = useSpeechDictation(setDictationDraft, salesDictationOptions());

  React.useEffect(
    () => () => {
      teardownDictation();
    },
    [teardownDictation],
  );

  const voiceAvailable =
    browserSupported ||
    (typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia));
  const listening = dictating || transcribing;
  const uploaded = new Set((uploadedDocumentTypes ?? []).map((value) => value.toLowerCase()));

  async function saveLine(lineId: string) {
    const draft = lineDrafts[lineId];
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
          body: JSON.stringify({
            actual_quantity,
            notes: draft.lot.trim() || null,
          }),
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

  async function selectOutcome(outcome: ProductSupportCaseOutcomeId) {
    if (disabled || savingOutcome || listening) return;
    setSavingOutcome(true);
    setError(null);
    try {
      const ok = await onPatchCase(buildProductSupportOutcomePatch(outcome));
      if (!ok) throw new Error("Could not save case outcome");
    } catch (caught: unknown) {
      setError(userFacingError(caught, "Could not save case outcome"));
    } finally {
      setSavingOutcome(false);
    }
  }

  async function saveRecap(body: string) {
    const trimmed = body.trim();
    if (!trimmed || disabled || savingRecap) return false;
    setSavingRecap(true);
    setError(null);
    try {
      const existing = String(caseRow.debrief_key_findings ?? "").trim();
      const merged = existing ? `${existing}\n\n${trimmed}` : trimmed;
      const ok = await onPatchCase({ debrief_key_findings: merged });
      if (!ok) throw new Error("Could not save case recap");
      return true;
    } catch (caught: unknown) {
      setError(userFacingError(caught, "Could not save case recap"));
      return false;
    } finally {
      setSavingRecap(false);
    }
  }

  async function handleDictationTap() {
    if (disabled || savingRecap || !voiceAvailable) return;
    if (listening) {
      await stopDictationAsync();
      const saved = await saveRecap(dictationDraft);
      if (saved) setDictationDraft("");
      return;
    }
    setDictationDraft("");
    startDictation("");
  }

  function documentUploaded(kind: DocumentUploadKind): boolean {
    if (kind === "purchase_order") return uploaded.has("purchase_order");
    if (kind === "invoice") return uploaded.has("invoice");
    if (kind === "product_photo") return uploaded.has("product_photo") || uploaded.has("other");
    if (kind === "tray_photo") return uploaded.has("tray_photo");
    return uploaded.has("case_document") || uploaded.has("other");
  }

  return (
    <div className="case-ps-execute">
      <style dangerouslySetInnerHTML={{ __html: productSupportCaseExecuteCss }} />

      <SectionCard id="case-ps-execute-usage" title="Products Used">
        <p className="case-ps-execute-intro">Log what was used after the case — no need to update live in surgery.</p>
        {lines.length > 0 ? (
          <div>
            {lines.map((line) => {
              const draft = lineDrafts[line.id] ?? { qty: "", lot: "" };
              const skuLabel = line.skuCode?.trim() ? `SKU ${line.skuCode.trim()}` : "SKU not set";
              return (
                <div key={line.id} className="case-ps-execute-product-row">
                  <p className="case-ps-execute-product-name">{line.name}</p>
                  <p className="case-ps-execute-product-meta">{skuLabel}</p>
                  <div className="case-ps-execute-field-grid">
                    <label className="case-ps-execute-field">
                      <span className="case-ps-execute-field-label">Quantity used</span>
                      <input
                        className="case-ps-execute-field-input"
                        inputMode="decimal"
                        value={draft.qty}
                        disabled={disabled || savingLineId === line.id}
                        onChange={(event) =>
                          setLineDrafts((prev) => ({
                            ...prev,
                            [line.id]: { ...draft, qty: event.target.value },
                          }))
                        }
                        onBlur={() => void saveLine(line.id)}
                      />
                    </label>
                    <label className="case-ps-execute-field">
                      <span className="case-ps-execute-field-label">Lot / notes</span>
                      <input
                        className="case-ps-execute-field-input"
                        value={draft.lot}
                        placeholder="If known"
                        disabled={disabled || savingLineId === line.id}
                        onChange={(event) =>
                          setLineDrafts((prev) => ({
                            ...prev,
                            [line.id]: { ...draft, lot: event.target.value },
                          }))
                        }
                        onBlur={() => void saveLine(line.id)}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="case-ps-detail-card-empty">No products attached yet.</p>
        )}
        {onAddProduct ? (
          <button
            type="button"
            className="case-ps-detail-link-btn"
            disabled={disabled || Boolean(savingLineId)}
            onClick={onAddProduct}
          >
            Add product usage
          </button>
        ) : null}
      </SectionCard>

      <SectionCard id="case-ps-execute-outcome" title="Case Outcome">
        <div className="case-ps-execute-outcome-grid">
          {PRODUCT_SUPPORT_CASE_OUTCOMES.map((outcome) => (
            <button
              key={outcome}
              type="button"
              className="case-ps-execute-outcome-btn"
              aria-pressed={selectedOutcome === outcome}
              disabled={disabled || savingOutcome || listening}
              onClick={() => void selectOutcome(outcome)}
            >
              {PRODUCT_SUPPORT_CASE_OUTCOME_LABELS[outcome]}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard id="case-ps-execute-recap" title="Quick Debrief">
        {voiceAvailable ? (
          <button
            type="button"
            className={`case-ps-execute-dictate-btn${listening ? " case-ps-execute-dictate-btn--active" : ""}`}
            disabled={disabled || savingRecap}
            onClick={() => void handleDictationTap()}
            aria-pressed={listening}
          >
            {dictationButtonLabel(dictationUiState, transcribing, listening)}
          </button>
        ) : (
          <p className="case-ps-detail-card-empty">Voice capture is not available on this device.</p>
        )}
        {listening && dictationDraft.trim() ? (
          <div className="case-ps-execute-live" aria-live="polite">
            <p className="case-ps-execute-live-text">{dictationDraft}</p>
          </div>
        ) : null}
        <p className="case-ps-execute-hint">{SURGICAL_PHI_UI_NOTICE}</p>
      </SectionCard>

      <SectionCard id="case-ps-execute-docs" title="Attachments">
        <div className="case-ps-execute-doc-grid">
          {DOCUMENT_UPLOAD_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="case-ps-execute-doc-btn"
              data-uploaded={documentUploaded(option.id) ? "true" : "false"}
              disabled={disabled || listening}
              onClick={() => onUploadDocument(option.id)}
            >
              {option.label}
              {documentUploaded(option.id) ? " · on file" : ""}
            </button>
          ))}
        </div>
      </SectionCard>

      {onCompleteCase ? (
        <section className="case-ps-execute-section" aria-label="Complete case">
          <button
            type="button"
            className="case-ps-execute-complete-btn"
            disabled={disabled || savingRecap || savingOutcome || Boolean(savingLineId) || listening}
            onClick={onCompleteCase}
          >
            Complete case and start debrief
          </button>
        </section>
      ) : null}

      {dictationError ? <p className="case-ps-execute-error">{dictationError}</p> : null}
      {error ? <p className="case-ps-execute-error">{error}</p> : null}
    </div>
  );
}
