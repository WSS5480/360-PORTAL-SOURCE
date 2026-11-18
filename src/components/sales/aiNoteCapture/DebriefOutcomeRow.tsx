"use client";

import React from "react";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { LogUpdateConflictResolution, LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import {
  LOG_UPDATE_CONFLICT_EXISTING,
  LOG_UPDATE_CONFLICT_GROUP_LABEL,
  LOG_UPDATE_CONFLICT_KEEP_BOTH,
  LOG_UPDATE_CONFLICT_NEW,
  LOG_UPDATE_CONFLICT_REPLACE,
} from "@/lib/surgical-sales/logUpdateUx";
import {
  INTELLIGENCE_BRIEF_HIDE_DETAILS,
  INTELLIGENCE_BRIEF_OBSERVATION_LABEL,
  INTELLIGENCE_BRIEF_SHOW_DETAILS,
  displayProductEvidenceStatus,
  displayProductNextValidationStep,
  productStatusLinesEquivalent,
  type FollowUpPriority,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import type { IntelligenceBriefOutcome } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import { isNormalizedAccessPathwayOutcome } from "@/lib/surgical-sales/debriefIntelligencePipeline/normalizeIntelligenceBriefForReview";
import { DebriefContactCaptureForm } from "./DebriefContactCaptureForm";
import { DebriefOutcomeDetails } from "./DebriefOutcomeDetails";
import { DebriefPathwayImpactNote } from "./DebriefPathwayImpactNote";

function chipTone(value: string): "positive" | "caution" | "neutral" {
  const text = value.toLowerCase();
  if (/not yet|required|pending|unknown/i.test(text)) return "caution";
  if (/interested|approved|complete|confirmed/i.test(text)) return "positive";
  return "neutral";
}

function BriefChip({
  label,
  value,
  tone,
  priority,
}: {
  label?: string;
  value: string;
  tone?: "positive" | "caution" | "neutral";
  priority?: FollowUpPriority;
}) {
  const resolvedTone = priority ? `priority-${priority}` : tone ?? chipTone(value);
  return (
    <span
      className={`ai-brief-chip ai-brief-chip--${resolvedTone}`}
      data-testid={label ? `ai-brief-chip-${label.toLowerCase()}` : undefined}
    >
      {label ? <span className="ai-brief-chip__label">{label}</span> : null}
      <span className="ai-brief-chip__value">{value}</span>
    </span>
  );
}

export function DebriefOutcomeRow({
  outcome,
  selected,
  readOnly,
  contact,
  organizationId,
  proposedContacts,
  onContactsChange,
  onSelectedChange,
  linkedFieldUpdates = [],
  onResolveConflict,
}: {
  outcome: IntelligenceBriefOutcome;
  selected: boolean;
  readOnly?: boolean;
  contact: DebriefProposedContactItem | null;
  organizationId: string | null;
  proposedContacts: DebriefProposedContactItem[];
  onContactsChange?: (contacts: DebriefProposedContactItem[]) => void;
  onSelectedChange: (selected: boolean) => void;
  linkedFieldUpdates?: LogUpdateRoutedFieldUpdate[];
  onResolveConflict?: (id: string, resolution: LogUpdateConflictResolution) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);

  function patchContact(next: DebriefProposedContactItem) {
    onContactsChange?.(proposedContacts.map((row) => (row.id === next.id ? next : row)));
  }

  // Contact decisions live on the contact row itself (no separate decision
  // card) — show the capture/disposition form inline whenever a decision or
  // detail entry is still open for this person.
  const hasContactCapture =
    outcome.kind === "contact" &&
    selected &&
    Boolean(contact) &&
    Boolean(onContactsChange) &&
    contact?.disposition !== "skipped" &&
    contact?.disposition !== "accepted";
  const hasEvidence = outcome.evidenceQuotes.length > 0;
  const unresolvedConflicts = linkedFieldUpdates.filter(
    (field) => selected && field.conflict && !field.conflict.resolution,
  );
  const productStatus = displayProductEvidenceStatus(outcome.productEvidenceStatus);
  const productNextStep = displayProductNextValidationStep(outcome.productNextValidationStep);
  const normalizedAccessPathway = isNormalizedAccessPathwayOutcome(outcome);
  const observationFields = outcome.observationFields;
  const showGenericStatusLine =
    Boolean(outcome.statusLine) &&
    !(
      outcome.kind === "product_intelligence" &&
      productStatusLinesEquivalent(outcome.statusLine, outcome.productEvidenceStatus)
    );
  const showObservationFieldChips =
    outcome.kind === "observation_access" &&
    Boolean(observationFields) &&
    !normalizedAccessPathway;
  const hasDetails =
    hasEvidence ||
    outcome.kind === "workflow_insight" ||
    outcome.kind === "contact" ||
    outcome.kind === "follow_up" ||
    outcome.kind === "observation_access" ||
    outcome.kind === "clinical_insight" ||
    outcome.kind === "product_intelligence" ||
    unresolvedConflicts.length > 0;

  return (
    <li
      className={`ai-intelligence-brief__item ai-intelligence-brief__item--${outcome.kind}${
        selected ? "" : " ai-intelligence-brief__item--unchecked"
      }`}
      data-testid={`ai-intelligence-brief-outcome-${outcome.id}`}
    >
      <label className="ai-intelligence-brief__select">
        <input
          type="checkbox"
          className="ai-intelligence-brief__checkbox"
          checked={selected}
          disabled={readOnly}
          onChange={(event) => onSelectedChange(event.target.checked)}
          aria-label={`Save ${outcome.summaryLine}`}
        />
      </label>
      <div className="ai-intelligence-brief__item-main">
        <div className="ai-intelligence-brief__row-head">
          <div className="ai-intelligence-brief__row-copy">
            <p className="ai-intelligence-brief__primary">
              {outcome.kind === "clinical_insight" && outcome.primaryLine
                ? outcome.primaryLine
                : outcome.summaryLine}
            </p>
            {selected ? <DebriefPathwayImpactNote line={outcome.pathwayImpactLine} /> : null}
            <div className="ai-intelligence-brief__meta">
              {showGenericStatusLine && outcome.statusLine ? (
                <BriefChip
                  label={normalizedAccessPathway ? "Status" : undefined}
                  value={outcome.statusLine}
                  tone={
                    /confirmed/i.test(outcome.statusLine)
                      ? "positive"
                      : "caution"
                  }
                />
              ) : null}
              {showObservationFieldChips && observationFields && !expanded ? (
                <>
                  <BriefChip
                    label={INTELLIGENCE_BRIEF_OBSERVATION_LABEL.status}
                    value={observationFields.status}
                    tone={chipTone(observationFields.status)}
                  />
                  {observationFields.approval ? (
                    <BriefChip
                      label={INTELLIGENCE_BRIEF_OBSERVATION_LABEL.approval}
                      value={observationFields.approval}
                      tone={chipTone(observationFields.approval)}
                    />
                  ) : null}
                  <BriefChip
                    label={INTELLIGENCE_BRIEF_OBSERVATION_LABEL.requirements}
                    value={observationFields.requirements}
                    tone={chipTone(observationFields.requirements)}
                  />
                </>
              ) : null}
              {outcome.kind === "product_intelligence" && !expanded ? (
                <>
                  {productStatus ? (
                    <BriefChip
                      label="Status"
                      value={productStatus}
                      tone={/needs?\s+confirmation/i.test(productStatus) ? "caution" : "positive"}
                    />
                  ) : null}
                  {productNextStep ? (
                    <BriefChip label="Next step" value={productNextStep} tone="neutral" />
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
          {hasDetails ? (
            <button
              type="button"
              className="ai-intelligence-brief__expand"
              disabled={readOnly}
              aria-expanded={expanded}
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ? INTELLIGENCE_BRIEF_HIDE_DETAILS : INTELLIGENCE_BRIEF_SHOW_DETAILS}
            </button>
          ) : null}
        </div>

        {hasContactCapture && contact ? (
          <DebriefContactCaptureForm
            contact={contact}
            organizationId={organizationId}
            disabled={readOnly}
            onChange={patchContact}
          />
        ) : null}

        {expanded ? (
          <DebriefOutcomeDetails outcome={outcome} evidenceQuotes={outcome.evidenceQuotes}>
            {outcome.kind === "product_intelligence" && outcome.productImpactLine ? (
              <p className="ai-intelligence-brief__impact">{outcome.productImpactLine}</p>
            ) : null}
            {unresolvedConflicts.map((field) =>
              field.conflict && onResolveConflict ? (
                <div
                  key={field.id}
                  className="ai-debrief-conflict"
                  role="group"
                  aria-label={LOG_UPDATE_CONFLICT_GROUP_LABEL}
                >
                  <p className="ai-debrief-conflict-title">{field.label}</p>
                  <p className="ai-debrief-card__conflict-line">
                    <span>{LOG_UPDATE_CONFLICT_EXISTING}</span> {field.conflict.existingValue}
                  </p>
                  <p className="ai-debrief-card__conflict-line">
                    <span>{LOG_UPDATE_CONFLICT_NEW}</span> {field.conflict.newValue}
                  </p>
                  <div className="ai-debrief-conflict-actions">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => onResolveConflict(field.id, "replace")}
                    >
                      {LOG_UPDATE_CONFLICT_REPLACE}
                    </button>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => onResolveConflict(field.id, "append")}
                    >
                      {LOG_UPDATE_CONFLICT_KEEP_BOTH}
                    </button>
                  </div>
                </div>
              ) : null,
            )}
          </DebriefOutcomeDetails>
        ) : null}
        {!expanded && unresolvedConflicts.length > 0 ? (
          <p className="ai-intelligence-brief__conflict-hint" role="status">
            Expand details to choose Replace or Keep both for conflicting profile info.
          </p>
        ) : null}
      </div>
    </li>
  );
}
