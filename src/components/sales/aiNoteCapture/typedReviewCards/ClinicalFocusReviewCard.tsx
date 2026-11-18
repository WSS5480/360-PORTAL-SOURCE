"use client";

import type {
  ClinicalFocusReviewCard,
  DebriefReviewCardAction,
} from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import type { DebriefReviewItemDisposition } from "@/lib/surgical-sales/debriefReviewItemState";
import { pathwayImpactForClinicalInsight } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligencePathwayImpact";
import { DebriefPathwayImpactNote } from "../DebriefPathwayImpactNote";
import {
  DebriefReviewCardActions,
  DebriefReviewCardEvidence,
  DebriefTypedReviewCardShell,
} from "./DebriefReviewCardParts";

export function ClinicalFocusReviewCardView({
  card,
  disposition,
  readOnly,
  onAction,
}: {
  card: ClinicalFocusReviewCard;
  disposition: DebriefReviewItemDisposition;
  readOnly?: boolean;
  onAction: (action: DebriefReviewCardAction) => void;
}) {
  const displayValue = card.clinicalDisplayValue ?? card.insightTitle;
  const pathwayImpactLine =
    disposition === "accepted"
      ? pathwayImpactForClinicalInsight(card.clinicalCategoryLabel)
      : null;

  return (
    <DebriefTypedReviewCardShell cardId={card.id} category={card.category}>
      <h4 className="ai-typed-review-card__title">{displayValue}</h4>
      <DebriefPathwayImpactNote line={pathwayImpactLine} />
      <DebriefReviewCardEvidence quotes={card.evidenceQuotes} />
      <DebriefReviewCardActions
        actions={card.actions}
        disposition={disposition}
        readOnly={readOnly}
        onAction={onAction}
      />
    </DebriefTypedReviewCardShell>
  );
}
