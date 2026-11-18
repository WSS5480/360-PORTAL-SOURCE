"use client";

import React from "react";
import type { DebriefOperationalReviewCard } from "@/lib/surgical-sales/buildDebriefOperationalReview";
import type { DebriefReviewItemDisposition } from "@/lib/surgical-sales/debriefReviewItemState";
import { DebriefReviewEvidencePanel } from "./DebriefReviewEvidencePanel";
import { DebriefReviewKnownNeed } from "./DebriefReviewKnownNeed";

export function OperationalDebriefReviewCardView({
  card,
  disposition,
  readOnly,
  evidenceExpanded,
  onToggleEvidence,
  onConfirm,
  onIgnore,
}: {
  card: DebriefOperationalReviewCard;
  disposition: DebriefReviewItemDisposition;
  readOnly: boolean;
  evidenceExpanded: boolean;
  onToggleEvidence: () => void;
  onConfirm: () => void;
  onIgnore: () => void;
}) {
  return (
    <div className="ai-debrief-operational-card" data-testid={`ai-debrief-operational-${card.topicId}`}>
      <h5 className="ai-debrief-operational-card__label">{card.label}</h5>
      <DebriefReviewKnownNeed known={card.summary} needs={card.stillNeededItems} />

      <DebriefReviewEvidencePanel
        evidence={card.evidence}
        expanded={evidenceExpanded}
        onToggle={onToggleEvidence}
      />

      {card.fieldUpdateIds.length > 0 && disposition === "needs_review" ? (
        <div className="ai-debrief-card__actions">
          <button
            type="button"
            className="ai-debrief-card__btn ai-debrief-card__btn--primary"
            disabled={readOnly}
            onClick={onConfirm}
          >
            Include
          </button>
          <button type="button" className="ai-debrief-card__btn" disabled={readOnly} onClick={onIgnore}>
            Skip
          </button>
        </div>
      ) : null}

      {disposition === "accepted" || disposition === "edited" ? (
        <p className="ai-debrief-insight-item__hint">Included</p>
      ) : null}
      {disposition === "ignored" ? <p className="ai-debrief-insight-item__hint">Skipped</p> : null}
    </div>
  );
}
