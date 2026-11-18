"use client";

import type {
  DebriefReviewCardAction,
  ObservationAccessReviewCard,
} from "@/lib/surgical-sales/debriefActionableReviewCardTypes";
import type { DebriefReviewItemDisposition } from "@/lib/surgical-sales/debriefReviewItemState";
import { pathwayImpactForObservationCard } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligencePathwayImpact";
import { DebriefPathwayImpactNote } from "../DebriefPathwayImpactNote";
import {
  DebriefReviewCardActions,
  DebriefReviewCardEvidence,
  DebriefReviewCardFieldRow,
  DebriefReviewCardFields,
  DebriefTypedReviewCardShell,
} from "./DebriefReviewCardParts";

export function ObservationAccessReviewCardView({
  card,
  disposition,
  readOnly,
  onAction,
}: {
  card: ObservationAccessReviewCard;
  disposition: DebriefReviewItemDisposition;
  readOnly?: boolean;
  onAction: (action: DebriefReviewCardAction) => void;
}) {
  const pathwayImpactLine =
    disposition === "accepted"
      ? pathwayImpactForObservationCard({
          observationStatus: card.observationStatus,
          approval: card.approval,
          credentialing: card.credentialing,
        })
      : null;

  return (
    <DebriefTypedReviewCardShell cardId={card.id} category={card.category}>
      <DebriefReviewCardFields>
        <DebriefReviewCardFieldRow label="Observation Status" value={card.observationStatus} />
        <DebriefReviewCardFieldRow label="Approval" value={card.approval} />
        <DebriefReviewCardFieldRow label="Credentialing" value={card.credentialing} />
      </DebriefReviewCardFields>
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
