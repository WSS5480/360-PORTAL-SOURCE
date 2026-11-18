"use client";

import React from "react";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateConflictResolution } from "@/lib/surgical-sales/logUpdateProviderRouting";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";
import type { ReviewScopeDisplayContext } from "@/lib/surgical-sales/logUpdateReviewPresentation";
import type { IntelligencePropagationTarget } from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";
import { DebriefRepFriendlyReview } from "./DebriefRepFriendlyReview";

export function AiDebriefIntelligenceReview({
  review,
  providerId = null,
  discoveryContext,
  providerContact,
  proposedContacts,
  organizationId = null,
  sourceReference,
  scopeDisplayContext,
  engagementTypeLabel = null,
  engagementOutcomeId = null,
  propagationTargets = [],
  debriefSavedSubtext,
  showTouchSummary: _showTouchSummary = true,
  suppressExecutiveSummary = false,
  onReviewChange,
  onContactsChange,
  onResolveConflict,
  readOnly = false,
  reviewUpdatesTitle,
}: {
  review: LogUpdateParseResult;
  providerId?: string | null;
  discoveryContext?: DebriefIntelligenceExtractionContext | null;
  providerContact?: Record<string, unknown> | null;
  proposedContacts: DebriefProposedContactItem[];
  organizationId?: string | null;
  sourceReference?: string;
  scopeDisplayContext?: ReviewScopeDisplayContext;
  engagementTypeLabel?: string | null;
  engagementOutcomeId?: string | null;
  propagationTargets?: IntelligencePropagationTarget[];
  debriefSavedSubtext?: string;
  showTouchSummary?: boolean;
  suppressExecutiveSummary?: boolean;
  onEditDebrief?: () => void;
  onReviewChange: (
    nextOrUpdater: LogUpdateParseResult | ((prev: LogUpdateParseResult) => LogUpdateParseResult),
  ) => void;
  onContactsChange: (contacts: DebriefProposedContactItem[]) => void;
  onResolveConflict: (id: string, resolution: LogUpdateConflictResolution) => void;
  readOnly?: boolean;
  reviewUpdatesTitle?: string;
}) {
  return (
    <DebriefRepFriendlyReview
      review={review}
      providerId={providerId}
      discoveryContext={discoveryContext}
      providerContact={providerContact}
      proposedContacts={proposedContacts}
      organizationId={organizationId}
      sourceReference={sourceReference}
      scopeDisplayContext={scopeDisplayContext}
      engagementTypeLabel={engagementTypeLabel}
      engagementOutcomeId={engagementOutcomeId}
      propagationTargets={propagationTargets}
      debriefSavedSubtext={debriefSavedSubtext}
      suppressExecutiveSummary={suppressExecutiveSummary}
      onReviewChange={onReviewChange}
      onContactsChange={onContactsChange}
      onResolveConflict={onResolveConflict}
      readOnly={readOnly}
      reviewUpdatesTitle={reviewUpdatesTitle}
    />
  );
}
