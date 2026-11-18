"use client";

import React from "react";
import {
  addCustomTagToCsv,
  CLINICAL_DISCOVERY_CONFIDENCE_LEVELS,
  CLINICAL_DISCOVERY_SUGGESTED_TAGS,
  clinicalDiscoveryFieldsForSection,
  clinicalDiscoveryMetaKey,
  countClinicalDiscoveryFilled,
  formatClinicalDiscoveryConfidenceLabel,
  formatClinicalDiscoveryUpdatedAt,
  isClinicalDiscoveryRowComplete,
  normalizeConfidence,
  parseTagsCsv,
  PROVIDER_CLINICAL_DISCOVERY_FIELDS,
  removeTagFromCsv,
  tagIsSelected,
  toggleTagInCsv,
  type ClinicalDiscoveryQuestionKey,
  type SurgicalIntelligenceSectionId,
} from "@/lib/surgical-sales/providerClinicalDiscovery";
import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import { SURGICAL_CONTACT_NOTES_PHI_NOTICE } from "@/lib/surgical-sales/labels";
import type { ProviderProfilePayload } from "./providerProfileTypes";
import { userFacingError } from "@/lib/errors/userFacingError";

function useNarrowSheet() {
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return narrow;
}

export function ProviderClinicalDiscoverySection({
  providerId,
  answersByKey,
  draft,
  setDraft,
  disabled,
  onSaved,
  embedded = false,
  sectionId,
}: {
  providerId: string;
  answersByKey: Partial<Record<ClinicalDiscoveryQuestionKey, ProviderClinicalDiscoveryAnswer>>;
  draft: Record<string, string>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  disabled?: boolean;
  onSaved: (payload: ProviderProfilePayload) => void;
  /** Hide duplicate section chrome when nested in planning accordion. */
  embedded?: boolean;
  /** When set, only show the field note for this intelligence category. */
  sectionId?: SurgicalIntelligenceSectionId;
}) {
  const narrow = useNarrowSheet();
  const [openKey, setOpenKey] = React.useState<ClinicalDiscoveryQuestionKey | "">("");
  const [rowBusy, setRowBusy] = React.useState<ClinicalDiscoveryQuestionKey | "">("");
  const [rowMsg, setRowMsg] = React.useState<string | null>(null);

  const visibleFields = sectionId
    ? clinicalDiscoveryFieldsForSection(sectionId)
    : PROVIDER_CLINICAL_DISCOVERY_FIELDS;
  const { filled, total } = sectionId
    ? {
        filled: visibleFields.filter((f) => isClinicalDiscoveryRowComplete(f.questionKey, draft)).length,
        total: visibleFields.length,
      }
    : countClinicalDiscoveryFilled(draft);

  async function saveRow(questionKey: ClinicalDiscoveryQuestionKey) {
    setRowBusy(questionKey);
    setRowMsg(null);
    try {
      const res = await fetch(
        `/api/portal/sales/providers/${encodeURIComponent(providerId)}/clinical-discovery`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionKey, draft }),
        },
      );
      const j = (await res.json()) as ProviderProfilePayload & { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "Save failed");
      onSaved(j);
      setRowMsg("Saved");
      if (narrow) setOpenKey("");
    } catch (e: unknown) {
      setRowMsg(userFacingError(e, "We could not save your changes. Please try again."));
    } finally {
      setRowBusy("");
    }
  }

  function openRow(key: ClinicalDiscoveryQuestionKey) {
    setOpenKey((prev) => (prev === key ? "" : key));
    setRowMsg(null);
  }

  const activeField = openKey
    ? PROVIDER_CLINICAL_DISCOVERY_FIELDS.find((f) => f.questionKey === openKey) ?? null
    : null;

  return (
    <div className={`provider-discovery-section${embedded ? " provider-discovery-section--embedded" : ""}`}>
      {embedded ? (
        <p className="provider-discovery-embedded-count" aria-live="polite">
          {filled > 0 ? "Field notes captured" : "No field notes yet"}
        </p>
      ) : (
        <header className="provider-discovery-section-header">
          <div className="provider-discovery-section-header-top">
            <h3 className="provider-discovery-section-title">Surgical intelligence notes</h3>
            <span className="provider-discovery-section-count">
              {filled} of {total} categories noted
            </span>
          </div>
          <p className="provider-discovery-section-helper">
            Operational notes from cases and visits — not a qualification checklist.
          </p>
        </header>
      )}

      <div className="provider-discovery-list" role="list">
        {visibleFields.map((field, index) => {
          const complete = isClinicalDiscoveryRowComplete(field.questionKey, draft);
          const updatedIso = answersByKey[field.questionKey]?.updatedAt ?? null;
          const updatedLabel = formatClinicalDiscoveryUpdatedAt(updatedIso);
          const confidence = normalizeConfidence(
            draft[clinicalDiscoveryMetaKey(field.questionKey, "confidence")],
          );
          const confidenceLabel = formatClinicalDiscoveryConfidenceLabel(confidence);
          const activeTags = parseTagsCsv(
            draft[clinicalDiscoveryMetaKey(field.questionKey, "tags")] || "",
          );
          const isOpenInline = openKey === field.questionKey && !narrow;

          return (
            <div
              key={field.questionKey}
              role="listitem"
              className={`provider-discovery-row${complete ? " provider-discovery-row--complete" : ""}${isOpenInline ? " provider-discovery-row--open" : ""}`}
            >
              <button
                type="button"
                className="provider-discovery-row-trigger"
                aria-expanded={openKey === field.questionKey}
                onClick={() => openRow(field.questionKey)}
              >
                <span className="provider-discovery-row-index">{index + 1}</span>
                <span className="provider-discovery-row-body">
                  <span className="provider-discovery-row-label">{field.shortLabel}</span>
                  <span className="provider-discovery-row-question">{field.question}</span>
                  <span className="provider-discovery-row-meta">
                    <span
                      className={`provider-discovery-row-state${complete ? " provider-discovery-row-state--done" : ""}`}
                    >
                      {complete ? "Complete" : "Developing"}
                    </span>
                    {updatedLabel ? (
                      <>
                        <span className="provider-discovery-row-meta-dot" aria-hidden>
                          ·
                        </span>
                        <span>Updated {updatedLabel}</span>
                      </>
                    ) : null}
                    {confidenceLabel ? (
                      <>
                        <span className="provider-discovery-row-meta-dot" aria-hidden>
                          ·
                        </span>
                        <span className="provider-discovery-row-confidence">
                          {confidenceLabel}
                        </span>
                      </>
                    ) : null}
                  </span>
                  {activeTags.length > 0 && !isOpenInline ? (
                    <span className="provider-discovery-row-tags" aria-label="Tags">
                      {activeTags.slice(0, 5).map((tag) => (
                        <span key={tag} className="provider-discovery-chip">
                          {tag}
                        </span>
                      ))}
                      {activeTags.length > 5 ? (
                        <span className="provider-discovery-chip provider-discovery-chip--more">
                          +{activeTags.length - 5}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`provider-discovery-row-chevron${openKey === field.questionKey ? " provider-discovery-row-chevron--open" : ""}`}
                  aria-hidden
                >
                  ›
                </span>
              </button>

              {isOpenInline ? (
                <DiscoveryRowEditor
                  field={field}
                  draft={draft}
                  setDraft={setDraft}
                  disabled={disabled || rowBusy === field.questionKey}
                  busy={rowBusy === field.questionKey}
                  rowMsg={openKey === field.questionKey ? rowMsg : null}
                  onSave={() => void saveRow(field.questionKey)}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {narrow && activeField ? (
        <DiscoverySheet
          field={activeField}
          draft={draft}
          setDraft={setDraft}
          disabled={disabled || rowBusy === activeField.questionKey}
          busy={rowBusy === activeField.questionKey}
          rowMsg={rowMsg}
          onClose={() => setOpenKey("")}
          onSave={() => void saveRow(activeField.questionKey)}
        />
      ) : null}
    </div>
  );
}

function DiscoveryRowEditor({
  field,
  draft,
  setDraft,
  disabled,
  busy,
  rowMsg,
  onSave,
  showQuestion = true,
}: {
  field: (typeof PROVIDER_CLINICAL_DISCOVERY_FIELDS)[number];
  draft: Record<string, string>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  disabled?: boolean;
  busy?: boolean;
  rowMsg: string | null;
  onSave: () => void;
  showQuestion?: boolean;
}) {
  const confKey = clinicalDiscoveryMetaKey(field.questionKey, "confidence");
  const sourceKey = clinicalDiscoveryMetaKey(field.questionKey, "sourceNotes");
  const tagsKey = clinicalDiscoveryMetaKey(field.questionKey, "tags");
  const confidence = normalizeConfidence(draft[confKey]);

  const sourceValue = (draft[sourceKey] || "").trim();

  return (
    <div className="provider-discovery-editor">
      {showQuestion ? <p className="provider-discovery-editor-question">{field.question}</p> : null}
      <p className="provider-discovery-phi-notice" role="note">
        {SURGICAL_CONTACT_NOTES_PHI_NOTICE}
      </p>
      <label className="provider-discovery-field">
        <span>Response</span>
        <textarea
          rows={4}
          value={draft[field.questionKey] || ""}
          onChange={(e) => setDraft((prev) => ({ ...prev, [field.questionKey]: e.target.value }))}
          disabled={disabled}
          placeholder="Document what you know or still need to learn…"
        />
      </label>

      <DiscoveryTagsEditor tagsKey={tagsKey} draft={draft} setDraft={setDraft} disabled={disabled} />

      <fieldset className="provider-discovery-confidence" disabled={disabled}>
        <legend>Signal strength on file</legend>
        <div className="provider-discovery-confidence-row">
          {CLINICAL_DISCOVERY_CONFIDENCE_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={`provider-discovery-confidence-btn${confidence === level ? " provider-discovery-confidence-btn--active" : ""}`}
              onClick={() => setDraft((prev) => ({ ...prev, [confKey]: level }))}
            >
              {formatClinicalDiscoveryConfidenceLabel(level)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="provider-discovery-source-block">
        <span className="provider-discovery-source-label">Source</span>
        {sourceValue ? (
          <p className="provider-discovery-source-indicator" title={sourceValue}>
            {sourceValue}
          </p>
        ) : (
          <p className="provider-discovery-source-empty">Not recorded yet</p>
        )}
        <label className="provider-discovery-field provider-discovery-field--source">
          <span>Update source</span>
          <input
            type="text"
            value={draft[sourceKey] || ""}
            onChange={(e) => setDraft((prev) => ({ ...prev, [sourceKey]: e.target.value }))}
            disabled={disabled}
            placeholder="Conversation, case, colleague, literature…"
          />
        </label>
      </div>

      <div className="provider-discovery-editor-actions provider-discovery-editor-actions--sheet">
        <button
          type="button"
          className="provider-profile-action provider-profile-action--primary"
          disabled={disabled || busy}
          onClick={onSave}
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {rowMsg ? (
          <span className={`provider-discovery-save-msg${rowMsg === "Saved" ? " provider-discovery-save-msg--ok" : ""}`}>
            {rowMsg}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function DiscoveryTagsEditor({
  tagsKey,
  draft,
  setDraft,
  disabled,
}: {
  tagsKey: string;
  draft: Record<string, string>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  disabled?: boolean;
}) {
  const [customInput, setCustomInput] = React.useState("");
  const csv = draft[tagsKey] || "";
  const activeTags = parseTagsCsv(csv);

  function setTags(next: string) {
    setDraft((prev) => ({ ...prev, [tagsKey]: next }));
  }

  function commitCustomTag() {
    const next = addCustomTagToCsv(csv, customInput);
    if (next !== csv) setTags(next);
    setCustomInput("");
  }

  return (
    <div className="provider-discovery-tags-block">
      {activeTags.length > 0 ? (
        <div className="provider-discovery-tags-selected">
          <span className="provider-discovery-tags-label">Tags</span>
          <div className="provider-discovery-chips">
            {activeTags.map((tag) => (
              <span key={tag} className="provider-discovery-chip">
                {tag}
                {!disabled ? (
                  <button
                    type="button"
                    className="provider-discovery-chip-remove"
                    aria-label={`Remove ${tag}`}
                    onClick={() => setTags(removeTagFromCsv(csv, tag))}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <span className="provider-discovery-tags-label">Suggested</span>
        <div className="provider-discovery-tags">
          {CLINICAL_DISCOVERY_SUGGESTED_TAGS.map((tag) => {
            const on = tagIsSelected(csv, tag);
            return (
              <button
                key={tag}
                type="button"
                className={`provider-discovery-tag${on ? " provider-discovery-tag--on" : ""}`}
                disabled={disabled}
                aria-pressed={on}
                onClick={() => setTags(toggleTagInCsv(csv, tag))}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="provider-discovery-custom-tag">
        <label className="provider-discovery-tags-label" htmlFor={`${tagsKey}-custom`}>
          Add custom tag
        </label>
        <div className="provider-discovery-custom-tag-row">
          <input
            id={`${tagsKey}-custom`}
            type="text"
            value={customInput}
            disabled={disabled}
            placeholder="Type a tag…"
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitCustomTag();
              }
            }}
          />
          <button
            type="button"
            className="provider-profile-action"
            disabled={disabled || !customInput.trim()}
            onClick={commitCustomTag}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function DiscoverySheet({
  field,
  draft,
  setDraft,
  disabled,
  busy,
  rowMsg,
  onClose,
  onSave,
}: {
  field: (typeof PROVIDER_CLINICAL_DISCOVERY_FIELDS)[number];
  draft: Record<string, string>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  disabled?: boolean;
  busy?: boolean;
  rowMsg: string | null;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="provider-discovery-sheet-root" role="presentation">
      <button type="button" className="provider-discovery-sheet-backdrop" aria-label="Close" onClick={onClose} />
      <div
        className="provider-discovery-sheet"
        role="dialog"
        aria-modal
        aria-labelledby="discovery-sheet-title"
      >
        <div className="provider-discovery-sheet-handle" aria-hidden />
        <div className="provider-discovery-sheet-head">
          <div className="provider-discovery-sheet-head-text">
            <h4 id="discovery-sheet-title">{field.shortLabel}</h4>
            <p className="provider-discovery-sheet-subtitle">{field.question}</p>
          </div>
          <button type="button" className="provider-discovery-sheet-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <DiscoveryRowEditor
          field={field}
          draft={draft}
          setDraft={setDraft}
          disabled={disabled}
          busy={busy}
          rowMsg={rowMsg}
          onSave={onSave}
          showQuestion={false}
        />
      </div>
    </div>
  );
}
