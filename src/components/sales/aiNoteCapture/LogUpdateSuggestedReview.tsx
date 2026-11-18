"use client";

import React from "react";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateConflictResolution } from "@/lib/surgical-sales/logUpdateProviderRouting";
import type { IntelligencePropagationTarget } from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";
import {
  normalizeLogUpdateProviderIntelligenceFlag,
  shouldUseAiDebriefIntelligenceReview,
  type ReviewScopeDisplayContext,
} from "@/lib/surgical-sales/logUpdateReviewPresentation";
import { originalDebriefSavedSubtext } from "@/lib/surgical-sales/debriefApprovalUx";
import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { DebriefCompletionCommercialReview } from "@/lib/surgical-sales/engagements/debriefCompletionValidationTypes";
import { AiDebriefIntelligenceReview } from "./AiDebriefIntelligenceReview";
import { DebriefApprovalReview } from "./DebriefApprovalReview";
import { DebriefCompletionCommercialReviewPanel } from "./DebriefCompletionCommercialReviewPanel";
import { DebriefReviewApprovalPanel } from "./DebriefReviewApprovalPanel";
import { LogUpdateRawDebriefNote } from "./LogUpdateRawDebriefNote";

export type DebriefReviewSurface = "approval" | "updates";

export function LogUpdateSuggestedReview({
  review,
  propagationTargets = [],
  engagementId = null,
  providerId = null,
  scopeDisplayContext,
  discoveryContext = null,
  providerContact = null,
  proposedContacts = [],
  organizationId = null,
  sourceReference,
  engagementTypeLabel = null,
  engagementOutcomeId = null,
  reviewSurface = "updates",
  readOnly = false,
  reviewUpdatesTitle,
  commercialReview = null,
  onEditDebrief,
  onReviewChange,
  onContactsChange,
  onToggleUpdate,
  onResolveConflict,
}: {
  review: LogUpdateParseResult;
  propagationTargets?: IntelligencePropagationTarget[];
  engagementId?: string | null;
  providerId?: string | null;
  scopeDisplayContext?: ReviewScopeDisplayContext;
  discoveryContext?: DebriefIntelligenceExtractionContext | null;
  providerContact?: Record<string, unknown> | null;
  proposedContacts?: DebriefProposedContactItem[];
  organizationId?: string | null;
  sourceReference?: string;
  engagementTypeLabel?: string | null;
  /** Outcome selected by the rep at engagement completion (workflow authority). */
  engagementOutcomeId?: string | null;
  reviewSurface?: DebriefReviewSurface;
  readOnly?: boolean;
  reviewUpdatesTitle?: string;
  commercialReview?: DebriefCompletionCommercialReview | null;
  onEditDebrief?: () => void;
  onReviewChange?: (
    nextOrUpdater:
      | LogUpdateParseResult
      | ((prev: LogUpdateParseResult) => LogUpdateParseResult),
  ) => void;
  onContactsChange?: (contacts: DebriefProposedContactItem[]) => void;
  onToggleUpdate: (id: string, accepted: boolean) => void;
  onToggleSaveAsNote?: (accepted: boolean) => void;
  onResolveConflict: (id: string, resolution: LogUpdateConflictResolution) => void;
}) {
  const normalizedReview = normalizeLogUpdateProviderIntelligenceFlag(review);
  const useAiReview = Boolean(
    shouldUseAiDebriefIntelligenceReview(normalizedReview) && onReviewChange && onContactsChange,
  );

  const savedSubtext = originalDebriefSavedSubtext({ engagementId, providerId });

  if (reviewSurface === "approval" && useAiReview) {
    return (
      <DebriefReviewApprovalPanel
        review={normalizedReview}
        providerId={providerId}
        discoveryContext={discoveryContext}
        providerContact={providerContact}
        proposedContacts={proposedContacts}
        sourceLabel={sourceReference}
        scopeDisplayContext={scopeDisplayContext}
        engagementTypeLabel={engagementTypeLabel}
      />
    );
  }

  if (useAiReview) {
    return (
      <>
        {commercialReview ? <DebriefCompletionCommercialReviewPanel review={commercialReview} /> : null}
        {commercialReview ? (
          <LogUpdateRawDebriefNote sourceText={normalizedReview.sourceText} savedSubtext={savedSubtext} />
        ) : (
          <AiDebriefIntelligenceReview
            review={normalizedReview}
            providerId={providerId}
            discoveryContext={discoveryContext}
            providerContact={providerContact}
            proposedContacts={proposedContacts}
            organizationId={organizationId}
            sourceReference={sourceReference}
            scopeDisplayContext={scopeDisplayContext}
            engagementTypeLabel={engagementTypeLabel}
            engagementOutcomeId={engagementOutcomeId}
            propagationTargets={reviewSurface === "updates" ? propagationTargets : []}
            debriefSavedSubtext={savedSubtext}
            showTouchSummary={false}
            suppressExecutiveSummary={false}
            readOnly={readOnly}
            reviewUpdatesTitle={reviewUpdatesTitle}
            onEditDebrief={onEditDebrief}
            onReviewChange={onReviewChange!}
            onContactsChange={onContactsChange!}
            onResolveConflict={onResolveConflict}
          />
        )}
      </>
    );
  }

  return (
    <>
      <DebriefApprovalReview
        review={normalizedReview}
        scopeDisplayContext={scopeDisplayContext}
        onToggleUpdate={onToggleUpdate}
        onResolveConflict={onResolveConflict}
      />
      {reviewSurface === "updates" ? (
        <LogUpdateRawDebriefNote sourceText={normalizedReview.sourceText} savedSubtext={savedSubtext} />
      ) : null}
    </>
  );
}

export { logUpdateRawDebriefHint, logUpdateReviewScopeContext } from "@/lib/surgical-sales/logUpdateReviewExports";
