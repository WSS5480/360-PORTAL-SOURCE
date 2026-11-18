"use client";

import type {
  DebriefReviewCardAction,
  OrganizationIntelligenceReviewCard,
} from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import type { DebriefReviewItemDisposition } from "@/lib/surgical-sales/debriefReviewItemState";
import {
  DebriefReviewCardActions,
  DebriefReviewCardEvidence,
  DebriefTypedReviewCardShell,
} from "./DebriefReviewCardParts";

export function OrganizationIntelligenceReviewCardView({
  card,
  disposition,
  readOnly,
  onAction,
}: {
  card: OrganizationIntelligenceReviewCard;
  disposition: DebriefReviewItemDisposition;
  readOnly?: boolean;
  onAction: (action: DebriefReviewCardAction) => void;
}) {
  return (
    <DebriefTypedReviewCardShell cardId={card.id} category={card.category}>
      <h4 className="ai-typed-review-card__title">{card.topicTitle}</h4>
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
