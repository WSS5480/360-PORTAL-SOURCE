"use client";

import type {
  DebriefReviewCardAction,
  FollowUpTaskReviewCard,
} from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import type { DebriefReviewItemDisposition } from "@/lib/surgical-sales/debriefReviewItemState";
import { pathwayImpactForFollowUpAction } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligencePathwayImpact";
import { DebriefPathwayImpactNote } from "../DebriefPathwayImpactNote";
import {
  DebriefReviewCardActions,
  DebriefReviewCardEvidence,
  DebriefReviewCardFieldRow,
  DebriefReviewCardFields,
  DebriefTypedReviewCardShell,
} from "./DebriefReviewCardParts";

export function FollowUpTaskReviewCardView({
  card,
  disposition,
  readOnly,
  onAction,
}: {
  card: FollowUpTaskReviewCard;
  disposition: DebriefReviewItemDisposition;
  readOnly?: boolean;
  onAction: (action: DebriefReviewCardAction) => void;
}) {
  const pathwayImpactLine =
    disposition === "accepted" ? pathwayImpactForFollowUpAction(card.taskTitle) : null;

  return (
    <DebriefTypedReviewCardShell cardId={card.id} category={card.category}>
      <h4 className="ai-typed-review-card__title">{card.taskTitle}</h4>
      <DebriefPathwayImpactNote line={pathwayImpactLine} />
      <DebriefReviewCardFields>
        {card.followUpReason ? (
          <DebriefReviewCardFieldRow label="Reason" value={card.followUpReason} />
        ) : null}
        {card.suggestedDue ? (
          <DebriefReviewCardFieldRow label="Suggested Due" value={card.suggestedDue} />
        ) : null}
      </DebriefReviewCardFields>
      {card.evidenceQuotes.length > 0 ? <DebriefReviewCardEvidence quotes={card.evidenceQuotes} /> : null}
      <DebriefReviewCardActions
        actions={card.actions}
        disposition={disposition}
        readOnly={readOnly}
        onAction={onAction}
      />
    </DebriefTypedReviewCardShell>
  );
}
