"use client";

import React from "react";

import type {
  DiscoveryMappingCurrentIntelligenceBlock,
  DiscoveryMappingSuggestedContactLead,
} from "@/lib/surgical-sales/buildDiscoveryMappingCardIntelligence";
import { DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY } from "@/lib/surgical-sales/discoveryMappingEvidenceQuality";
import { formatDiscoveryMappingSourceDisplay } from "@/lib/surgical-sales/discoveryMappingDisplayFormat";
import { STAGE_MAPPING_UI } from "@/lib/surgical-sales/stageMappingQuestions";

export function DiscoveryMappingIntelligenceBrief({
  intelligence,
  stillNeedItems,
  suggestedNextAction,
  suggestedContactLead,
  busy,
  onSuggestedLeadSelect,
  onSuggestedLeadAdd,
  onSuggestedLeadDismiss,
  editing = false,
}: {
  intelligence: DiscoveryMappingCurrentIntelligenceBlock | null;
  stillNeedItems: string[];
  suggestedNextAction?: string | null;
  suggestedContactLead?: DiscoveryMappingSuggestedContactLead | null;
  busy?: boolean;
  onSuggestedLeadSelect?: () => void;
  onSuggestedLeadAdd?: () => void;
  onSuggestedLeadDismiss?: () => void;
  editing?: boolean;
}) {
  if (editing) return null;

  const nextAction =
    suggestedNextAction?.trim() || intelligence?.suggestedNextAction?.trim() || null;

  const nextActionDistinct =
    nextAction && stillNeedItems.some((item) => item.trim() === nextAction) ? null : nextAction;

  const isEmptyState = intelligence?.summary === DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY;
  const hasIntelligence = Boolean(intelligence?.summary) && !isEmptyState;
  const sourceDisplay = formatDiscoveryMappingSourceDisplay(intelligence?.sourceLine);

  const summaryText = intelligence?.summary ?? STAGE_MAPPING_UI.nothingCapturedYet;
  const cleanSummary = summaryText.replace(
    /^(?:Open|Potential Lead|Partial|Confirmed|Potential signal found|Partial understanding):\s*/i,
    "",
  );

  return (
    <div className="stage-mapping-intel-brief" aria-label="Intelligence summary">
      <section className="stage-mapping-intel-brief__section stage-mapping-intel-brief__section--know">
        {intelligence?.mappedCategory && hasIntelligence ? (
          <p className="stage-mapping-intel-brief__mapped-category">{intelligence.mappedCategory}</p>
        ) : null}

        {hasIntelligence ? (
          <>
            <div className="stage-mapping-intel-brief__read-block">
              <span className="stage-mapping-intel-brief__read-label">{STAGE_MAPPING_UI.answerLabel}</span>
              <p className="stage-mapping-intel-brief__summary">{cleanSummary}</p>
            </div>

            {intelligence?.rawEvidence ? (
              <div className="stage-mapping-intel-brief__read-block">
                <span className="stage-mapping-intel-brief__read-label">{STAGE_MAPPING_UI.evidenceLabel}</span>
                <p className="stage-mapping-intel-brief__raw-quote">
                  &ldquo;{intelligence.rawEvidence}&rdquo;
                </p>
              </div>
            ) : null}

            <div className="stage-mapping-intel-brief__read-block">
              <span className="stage-mapping-intel-brief__read-label">{STAGE_MAPPING_UI.confidenceLabel}</span>
              <p className="stage-mapping-intel-brief__confidence-read">
                {intelligence?.evidenceConfidenceLabel ?? intelligence?.confidenceLabel}
              </p>
            </div>
          </>
        ) : (
          <p className="stage-mapping-intel-brief__summary stage-mapping-intel-brief__summary--empty">
            {STAGE_MAPPING_UI.nothingCapturedYet}
          </p>
        )}

        <div className="stage-mapping-intel-brief__meta">
          {sourceDisplay ? (
            <p className="stage-mapping-intel-brief__source-line">
              <span className="stage-mapping-intel-brief__field-label">Source:</span> {sourceDisplay}
            </p>
          ) : null}

          {stillNeedItems.length > 0 ? (
            <div className="stage-mapping-intel-brief__field">
              <span className="stage-mapping-intel-brief__field-label">
                {STAGE_MAPPING_UI.whatWeStillNeed}
              </span>
              <ul className="stage-mapping-intel-brief__list stage-mapping-intel-brief__list--inline">
                {stillNeedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {nextActionDistinct ? (
            <p className="stage-mapping-intel-brief__next-action">
              <span className="stage-mapping-intel-brief__field-label">
                {STAGE_MAPPING_UI.suggestedNextAction}:
              </span>{" "}
              {nextActionDistinct}
            </p>
          ) : null}
        </div>
      </section>

      {suggestedContactLead && (onSuggestedLeadSelect || onSuggestedLeadAdd) ? (
        <section
          className="stage-mapping-intel-brief__section stage-mapping-intel-brief__section--next"
          aria-label="Suggested contact lead"
        >
          <div className="stage-mapping-intel-brief__lead">
            <p className="stage-mapping-intel-brief__lead-name">{suggestedContactLead.name}</p>
            <p className="stage-mapping-intel-brief__lead-hint">{suggestedContactLead.hint}</p>
            <div className="stage-mapping-intel-brief__lead-actions">
              {onSuggestedLeadSelect ? (
                <button
                  type="button"
                  className="stage-mapping-intel-brief__lead-btn stage-mapping-intel-brief__lead-btn--primary"
                  disabled={busy}
                  onClick={onSuggestedLeadSelect}
                >
                  Select {suggestedContactLead.name}
                </button>
              ) : null}
              {onSuggestedLeadAdd ? (
                <button
                  type="button"
                  className="stage-mapping-intel-brief__lead-btn"
                  disabled={busy}
                  onClick={onSuggestedLeadAdd}
                >
                  Add as contact
                </button>
              ) : null}
              {onSuggestedLeadDismiss ? (
                <button
                  type="button"
                  className="stage-mapping-intel-brief__lead-btn stage-mapping-intel-brief__lead-btn--ghost"
                  disabled={busy}
                  onClick={onSuggestedLeadDismiss}
                >
                  Not confirmed
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** @deprecated Use DiscoveryMappingIntelligenceBrief */
export function DiscoveryMappingCurrentIntelligence({
  intelligence,
}: {
  intelligence: DiscoveryMappingCurrentIntelligenceBlock;
}) {
  return (
    <DiscoveryMappingIntelligenceBrief
      intelligence={intelligence}
      stillNeedItems={[]}
      suggestedNextAction={intelligence.suggestedNextAction}
    />
  );
}

/** @deprecated Use DiscoveryMappingIntelligenceBrief */
export function DiscoveryMappingStillNeedToConfirm({ items }: { items: string[] }) {
  return <DiscoveryMappingIntelligenceBrief intelligence={null} stillNeedItems={items} />;
}
