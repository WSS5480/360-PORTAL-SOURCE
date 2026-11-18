"use client";

import React from "react";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { buildDebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import { buildDebriefActionableReviewCards } from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import { buildDebriefIntelligenceBrief } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import { briefSectionSummary } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBriefCopy";
import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { ReviewScopeDisplayContext } from "@/lib/surgical-sales/logUpdateReviewPresentation";
import { buildDebriefReviewContextLine } from "@/lib/surgical-sales/debriefReviewSurface";
import {
  AI_DEBRIEF_REVIEW_UPDATES_SUBTITLE,
} from "@/lib/surgical-sales/debriefApprovalUx";

export function DebriefReviewApprovalPanel({
  review,
  discoveryContext = null,
  providerContact,
  sourceLabel,
  scopeDisplayContext,
  engagementTypeLabel,
  proposedContacts = [],
}: {
  review: LogUpdateParseResult;
  providerId?: string | null;
  providerContact?: Record<string, unknown> | null;
  gateInput?: import("@/lib/surgical-sales/pathwayStageGates").PathwayGateInput;
  sourceLabel?: string;
  scopeDisplayContext?: ReviewScopeDisplayContext;
  engagementTypeLabel?: string | null;
  discoveryContext?: DebriefIntelligenceExtractionContext | null;
  proposedContacts?: DebriefProposedContactItem[];
}) {
  const contextLine = buildDebriefReviewContextLine({
    providerLabel: scopeDisplayContext?.providerLabel,
    organizationLabel: scopeDisplayContext?.organizationLabel,
    engagementTypeLabel,
  });

  const approvalHint = React.useMemo(() => {
    const extraction = buildDebriefIntelligenceExtractionReview({
      review,
      discoveryContext,
      providerContact,
      sourceReference: sourceLabel,
      proposedContacts,
    });
    const guardContext = buildDebriefReviewDecisionContext({
      providerContact,
      providerLabel: scopeDisplayContext?.providerLabel,
    });
    const cards = buildDebriefActionableReviewCards({
      extraction,
      proposedContacts,
      dictation: review.sourceText,
      guardContext,
    });
    const brief = buildDebriefIntelligenceBrief({ cards });
    return briefSectionSummary(brief);
  }, [review, discoveryContext, providerContact, sourceLabel, proposedContacts, scopeDisplayContext?.providerLabel]);

  return (
    <div className="ai-debrief-review ai-debrief-review--approval" data-testid="ai-debrief-approval-panel">
      {contextLine ? <p className="ai-debrief-review-context">{contextLine}</p> : null}
      <p className="ai-debrief-review-header__subtitle">{AI_DEBRIEF_REVIEW_UPDATES_SUBTITLE}</p>
      <p className="ai-debrief-approval-count" data-testid="ai-debrief-approval-count">
        {approvalHint}
      </p>
    </div>
  );
}
