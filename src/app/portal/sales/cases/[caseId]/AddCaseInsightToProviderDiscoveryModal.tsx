"use client";

import React, { useEffect, useState, type CSSProperties } from "react";
import { providerProfileCss } from "@/app/portal/sales/providers/[providerId]/providerProfileCss";
import {
  ADD_CASE_INSIGHT_MODAL_TITLE,
  ADD_CASE_INSIGHT_TO_PROVIDER_DISCOVERY_LABEL,
  CLINICAL_DISCOVERY_CATEGORY_OPTIONS,
  type ClinicalDiscoveryInsightMergeMode,
} from "@/lib/surgical-sales/providerClinicalDiscoveryCaseInsight";
import { ClinicalDiscoveryTagsField } from "@/components/sales/ClinicalDiscoveryTagsField";
import { sc } from "@/components/sales/salesCommandUi";
import {
  CLINICAL_DISCOVERY_CONFIDENCE_LEVELS,
  formatClinicalDiscoveryConfidenceLabel,
  isMeaningfulClinicalDiscoveryResponse,
  parseTagsCsv,
  type ClinicalDiscoveryConfidence,
  type ClinicalDiscoveryQuestionKey,
} from "@/lib/surgical-sales/providerClinicalDiscovery";
import { userFacingError } from "@/lib/errors/userFacingError";

function useNarrowSheet() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return narrow;
}

export type CaseInsightSaveResult = {
  message: string;
  prepareHref: string | null;
};

export function AddCaseInsightActionButton({
  onClick,
  disabled,
  style,
  primary,
}: {
  onClick: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      data-surgical-press
      style={{
        ...(primary ? sc.btnPrimary : sc.btnSecondary),
        justifyContent: "center",
        fontSize: 12,
        minHeight: 38,
        ...style,
      }}
      disabled={disabled}
      onClick={onClick}
    >
      {ADD_CASE_INSIGHT_TO_PROVIDER_DISCOVERY_LABEL}
    </button>
  );
}

export function AddCaseInsightToProviderDiscoveryModal({
  open,
  caseId,
  providerId,
  providerName,
  engagementId,
  onClose,
  onSaved,
}: {
  open: boolean;
  caseId: string;
  providerId: string;
  providerName: string;
  engagementId: string | null;
  onClose: () => void;
  onSaved: (result: CaseInsightSaveResult) => void;
}) {
  const narrow = useNarrowSheet();
  const [questionKey, setQuestionKey] = useState<ClinicalDiscoveryQuestionKey>(
    CLINICAL_DISCOVERY_CATEGORY_OPTIONS[0]?.questionKey ?? "clinical_workflow",
  );
  const [insightText, setInsightText] = useState("");
  const [tagsCsv, setTagsCsv] = useState("");
  const [confidence, setConfidence] = useState<ClinicalDiscoveryConfidence | "">("");
  const [mergeMode, setMergeMode] = useState<ClinicalDiscoveryInsightMergeMode | "">("");
  const [existingProbes, setExistingProbes] = useState("");
  const [loadingProbes, setLoadingProbes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setMergeMode("");
    if (!engagementId) {
      setExistingProbes("");
      return;
    }
    setLoadingProbes(true);
    void fetch(`/api/portal/sales/engagements/${encodeURIComponent(engagementId)}`, { cache: "no-store" })
      .then(async (res) => {
        const j = (await res.json()) as {
          ok?: boolean;
          engagement?: { pre_observation_probes?: string | null };
          error?: string;
        };
        if (!res.ok || !j.ok) throw new Error(typeof j.error === "string" ? j.error : "Could not load engagement prep");
        setExistingProbes(String(j.engagement?.pre_observation_probes ?? "").trim());
      })
      .catch((e: unknown) => {
        setError(userFacingError(e, "Could not load engagement preparation"));
        setExistingProbes("");
      })
      .finally(() => setLoadingProbes(false));
  }, [open, engagementId]);

  useEffect(() => {
    if (!open) return;
    setMergeMode("");
  }, [open, questionKey]);

  const hasExisting = isMeaningfulClinicalDiscoveryResponse(existingProbes);
  const needsMergeChoice = hasExisting && !mergeMode;

  const panel = (
    <>
      {!engagementId ? (
        <p role="status" style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
          Link this case to an engagement first. Visit discovery and probes belong on Prepare for Meeting, not
          persistent provider intelligence.
        </p>
      ) : null}

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 800 }}>Discovery category</span>
        <select
          value={questionKey}
          disabled={busy || loadingProbes || !engagementId}
          onChange={(e) => setQuestionKey(e.target.value as ClinicalDiscoveryQuestionKey)}
          style={sc.input}
        >
          {CLINICAL_DISCOVERY_CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.questionKey} value={opt.questionKey}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {hasExisting ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid color-mix(in srgb, #f59e0b 28%, var(--border))",
            background: "color-mix(in srgb, #f59e0b 6%, var(--surface))",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--muted)" }}>
            Existing engagement prep notes
          </div>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{existingProbes}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              style={{
                ...sc.btnSecondary,
                ...(mergeMode === "append"
                  ? { borderColor: "color-mix(in srgb, var(--brand-600) 35%, var(--border))" }
                  : {}),
              }}
              disabled={busy}
              onClick={() => setMergeMode("append")}
            >
              Append
            </button>
            <button
              type="button"
              style={{
                ...sc.btnSecondary,
                ...(mergeMode === "replace"
                  ? { borderColor: "color-mix(in srgb, var(--brand-600) 35%, var(--border))" }
                  : {}),
              }}
              disabled={busy}
              onClick={() => setMergeMode("replace")}
            >
              Replace
            </button>
            <button type="button" style={sc.btnSecondary} disabled={busy} onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 800 }}>Insight text</span>
        <textarea
          value={insightText}
          onChange={(e) => setInsightText(e.target.value)}
          rows={5}
          disabled={busy || !engagementId}
          placeholder="What did you learn on this case?"
          style={{ ...sc.input, resize: "vertical", fontSize: 13 }}
        />
      </label>

      <ClinicalDiscoveryTagsField
        tagsCsv={tagsCsv}
        onTagsCsvChange={setTagsCsv}
        disabled={busy || !engagementId}
        inputIdPrefix={`case-insight-${caseId}`}
      />

      <fieldset style={{ border: "none", margin: 0, padding: 0 }} disabled={busy || !engagementId}>
        <legend style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Confidence</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CLINICAL_DISCOVERY_CONFIDENCE_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              style={{
                ...sc.btnSecondary,
                ...(confidence === level
                  ? {
                      borderColor: "color-mix(in srgb, var(--brand-600) 35%, var(--border))",
                      background: "color-mix(in srgb, var(--brand-600) 8%, var(--surface))",
                    }
                  : {}),
              }}
              onClick={() => setConfidence(level)}
            >
              {formatClinicalDiscoveryConfidenceLabel(level)}
            </button>
          ))}
        </div>
      </fieldset>

      <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>
        Saved to the linked engagement&apos;s Pre-Call Plan (observation probes) for {providerName}. Source case is
        recorded in the note block.
      </p>

      {error ? (
        <p role="alert" style={{ ...sc.alertError, margin: 0 }}>
          {error}
        </p>
      ) : null}
    </>
  );

  async function save() {
    if (!engagementId) {
      setError("Link this case to an engagement before saving visit discovery.");
      return;
    }
    const text = insightText.trim();
    if (!text) {
      setError("Insight text is required.");
      return;
    }
    if (needsMergeChoice) {
      setError("Choose append or replace for existing engagement prep notes, or cancel.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const tags = parseTagsCsv(tagsCsv);
      const res = await fetch(
        `/api/portal/sales/surgical-cases/${encodeURIComponent(caseId)}/clinical-discovery-insight`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionKey,
            insightText: text,
            tags,
            confidence: confidence || null,
            mergeMode: hasExisting ? mergeMode : undefined,
          }),
        },
      );
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string | { formErrors?: string[] };
        message?: string;
        prepare_href?: string;
        code?: string;
        existing?: { value?: string };
      };
      if (res.status === 409 && j.code === "merge_required" && j.existing?.value) {
        setExistingProbes(String(j.existing.value).trim());
        setError("Existing discovery notes require append or replace confirmation.");
        return;
      }
      if (!res.ok || !j.ok) {
        const errMsg =
          typeof j.error === "string"
            ? j.error
            : Array.isArray((j.error as { formErrors?: string[] })?.formErrors)
              ? (j.error as { formErrors: string[] }).formErrors.join("; ")
              : "Save failed";
        throw new Error(errMsg);
      }
      onSaved({
        message: j.message || "Saved to engagement preparation.",
        prepareHref: j.prepare_href ?? null,
      });
      onClose();
      setInsightText("");
      setTagsCsv("");
      setConfidence("");
      setMergeMode("");
    } catch (e: unknown) {
      setError(userFacingError(e, "We could not save your changes. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const footer = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
      <button type="button" style={sc.btnSecondary} onClick={onClose} disabled={busy}>
        Close
      </button>
      <button
        type="button"
        style={sc.btnPrimary}
        disabled={busy || loadingProbes || needsMergeChoice || !insightText.trim() || !engagementId}
        onClick={() => void save()}
      >
        {busy ? "Saving…" : "Save to engagement prep"}
      </button>
    </div>
  );

  if (narrow) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: providerProfileCss }} />
        <div className="case-modal-shell-overlay provider-discovery-sheet-root" role="presentation" style={overlayStyle}>
          <button type="button" className="provider-discovery-sheet-backdrop" aria-label="Close" onClick={onClose} />
          <div
            className="provider-discovery-sheet case-modal-shell-panel"
            role="dialog"
            aria-modal
            aria-labelledby="add-case-insight-title"
          >
            <div className="provider-discovery-sheet-handle" aria-hidden />
            <div className="provider-discovery-sheet-head">
              <h2 id="add-case-insight-title" style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                {ADD_CASE_INSIGHT_MODAL_TITLE}
              </h2>
              <button type="button" className="provider-discovery-sheet-close" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
              Temporary visit notes for {providerName} — stored on the linked engagement, not provider intelligence.
            </p>
            <div style={{ display: "grid", gap: 12 }}>{panel}</div>
            {footer}
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="add-case-insight-title"
      className="case-modal-shell-overlay"
      style={overlayStyle}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="case-modal-shell-panel"
        style={{
          background: "var(--surface)",
          borderRadius: 14,
          padding: 20,
          border: "1px solid var(--border)",
          maxHeight: "min(92vh, calc(100dvh - 32px))",
          overflow: "auto",
          width: "min(560px, 100%)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <div>
            <h2 id="add-case-insight-title" style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
              {ADD_CASE_INSIGHT_MODAL_TITLE}
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
              Temporary visit notes for {providerName} — engagement Pre-Call Plan, not persistent provider intelligence.
            </p>
          </div>
          <button type="button" style={sc.btnSecondary} onClick={onClose} disabled={busy} aria-label="Close">
            ✕
          </button>
        </div>
        <div style={{ display: "grid", gap: 12 }}>{panel}</div>
        {footer}
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "color-mix(in srgb, var(--foreground) 35%, transparent)",
  display: "grid",
  placeItems: "center",
  zIndex: 60,
  padding: 16,
};
