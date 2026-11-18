"use client";

import React from "react";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { PathwayGateInput } from "@/lib/surgical-sales/pathwayStageGates";
import {
  buildDebriefOperationalReview,
  type DebriefOperationalReviewCard,
} from "@/lib/surgical-sales/buildDebriefOperationalReview";
import {
  acceptIntelligenceReviewItem,
  ignoreIntelligenceReviewItem,
  resolveIntelligenceItemDisposition,
  type DebriefReviewItemDisposition,
} from "@/lib/surgical-sales/debriefReviewItemState";
import { TACTICAL_DEBRIEF_REVIEW_TITLE } from "@/lib/surgical-sales/debriefApprovalUx";
import { buildDebriefReviewContextLine } from "@/lib/surgical-sales/debriefReviewSurface";
import type { ReviewScopeDisplayContext } from "@/lib/surgical-sales/logUpdateReviewPresentation";
import { DebriefReviewTouchSummary } from "./DebriefReviewTouchSummary";
import { OperationalDebriefReviewCardView } from "./OperationalDebriefReviewCardView";

export function OperationalDebriefIntelligenceReview({
  review,
  providerId,
  providerContact,
  gateInput,
  sourceLabel,
  scopeDisplayContext,
  engagementTypeLabel,
  showTouchSummary = true,
  onReviewChange,
  readOnly = false,
}: {
  review: LogUpdateParseResult;
  providerId: string;
  providerContact?: Record<string, unknown> | null;
  gateInput?: PathwayGateInput;
  sourceLabel?: string;
  scopeDisplayContext?: ReviewScopeDisplayContext;
  engagementTypeLabel?: string | null;
  showTouchSummary?: boolean;
  onReviewChange: (
    nextOrUpdater: LogUpdateParseResult | ((prev: LogUpdateParseResult) => LogUpdateParseResult),
  ) => void;
  readOnly?: boolean;
}) {
  const operationalReview = React.useMemo(
    () =>
      buildDebriefOperationalReview({
        providerId,
        narrative: review.sourceText,
        parse: review,
        contact: providerContact ?? {},
        gateInput: gateInput ?? { contact: providerContact ?? {} },
        sourceLabel,
      }),
    [providerId, review, providerContact, gateInput, sourceLabel],
  );

  const [expandedCards, setExpandedCards] = React.useState<Set<string>>(() => new Set());
  const [ignoredIds, setIgnoredIds] = React.useState<Set<string>>(() => new Set());

  const contextLine = buildDebriefReviewContextLine({
    providerLabel: scopeDisplayContext?.providerLabel,
    organizationLabel: scopeDisplayContext?.organizationLabel,
    engagementTypeLabel,
  });

  function dispositionForCard(card: DebriefOperationalReviewCard): DebriefReviewItemDisposition {
    const fieldIds = card.fieldUpdateIds;
    if (fieldIds.length === 0) return "accepted";

    const fields = fieldIds
      .map((id) => review.fieldUpdates.find((f) => f.id === id))
      .filter(Boolean);
    if (fields.length === 0) return "accepted";

    if (fields.every((f) => ignoredIds.has(f!.id))) return "ignored";
    if (fields.every((f) => f!.accepted)) return "accepted";

    return resolveIntelligenceItemDisposition({
      itemId: fieldIds[0]!,
      accepted: fields.some((f) => f!.accepted),
      ignoredIds,
      editedIds: new Set(),
    });
  }

  function patchReview(updater: (current: LogUpdateParseResult) => LogUpdateParseResult) {
    onReviewChange(updater);
  }

  function applyToFieldIds(
    fieldIds: string[],
    action: "accept" | "ignore",
    updater: (current: LogUpdateParseResult, id: string) => LogUpdateParseResult,
  ) {
    setIgnoredIds((prev) => {
      const next = new Set(prev);
      for (const id of fieldIds) {
        if (action === "ignore") next.add(id);
        else next.delete(id);
      }
      return next;
    });
    patchReview((current) => fieldIds.reduce((acc, id) => updater(acc, id), current));
  }

  return (
    <div className="ai-debrief-review ai-debrief-review--operational" aria-label={TACTICAL_DEBRIEF_REVIEW_TITLE}>
      <header className="ai-debrief-review-header">
        {showTouchSummary ? (
          <DebriefReviewTouchSummary summary={operationalReview.touchCapturedSummary} />
        ) : null}
        {contextLine ? <p className="ai-debrief-review-context">{contextLine}</p> : null}
      </header>

      <div className="ai-debrief-operational-sections" data-testid="ai-debrief-operational-sections">
        {operationalReview.sections.map((section) => (
          <section
            key={section.topicId}
            className="ai-debrief-operational-section"
            data-testid={`ai-debrief-topic-${section.topicId}`}
          >
            <div className="ai-debrief-operational-section__cards">
              {section.cards.map((card) => (
                <OperationalDebriefReviewCardView
                  key={card.signalId}
                  card={card}
                  disposition={dispositionForCard(card)}
                  readOnly={readOnly}
                  evidenceExpanded={expandedCards.has(card.signalId)}
                  onToggleEvidence={() =>
                    setExpandedCards((prev) => {
                      const next = new Set(prev);
                      if (next.has(card.signalId)) next.delete(card.signalId);
                      else next.add(card.signalId);
                      return next;
                    })
                  }
                  onConfirm={() =>
                    applyToFieldIds(card.fieldUpdateIds, "accept", (current, id) =>
                      acceptIntelligenceReviewItem(current, id),
                    )
                  }
                  onIgnore={() =>
                    applyToFieldIds(card.fieldUpdateIds, "ignore", (current, id) =>
                      ignoreIntelligenceReviewItem(current, id),
                    )
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
