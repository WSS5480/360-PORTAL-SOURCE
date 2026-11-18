import type { AiNoteCaptureCommitItem, AiNoteCaptureContext } from "@/lib/surgical-sales/aiNoteCapture/types";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import {
  LOG_UPDATE_ERR_SELECT_ONE,
  LOG_UPDATE_ERR_UNRESOLVED_CONFLICT,
} from "@/lib/surgical-sales/logUpdateUx";
import {
  logUpdateAcceptedFieldPatches,
  logUpdateHasUnresolvedConflicts,
} from "@/lib/surgical-sales/logUpdateProviderRouting";
import {
  buildFieldEvidenceFromLogUpdate,
  sanitizeLogUpdateForDebriefPersist,
} from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import { extractFollowUpTaskLinesFromDebriefReview } from "@/lib/surgical-sales/engagements/engagementDebriefVisitRecord";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";

export type LogUpdateProviderCommitPayload = {
  sourceText: string;
  saveAsNote: boolean;
  fieldPatches: Array<{ dbKey: string; value: string; mergeStrategy: "replace" | "append" }>;
  fieldEvidence: Record<string, string>;
};

/** True when at least one approved contact suggestion is queued for save. */
export function hasAcceptedProposedContacts(
  contacts: readonly { disposition: string }[] | undefined,
): boolean {
  return Boolean(contacts?.some((c) => c.disposition === "accepted"));
}

/** Whether Save Selected Updates should be enabled on the review screen. */
export function reviewHasSavableSelection(input: {
  review: LogUpdateParseResult;
  proposedContacts?: readonly { disposition: string }[];
}): boolean {
  if (input.review.saveAsNoteAccepted) return true;
  if (hasAcceptedProposedContacts(input.proposedContacts)) return true;
  if (input.review.usesProviderIntelligence) {
    return input.review.fieldUpdates.some((u) => u.accepted);
  }
  return input.review.suggestedUpdates.some((u) => u.accepted);
}

/** Structured debrief review — allow save when narrative is present and conflicts are resolved. */
export function reviewCanSaveStructuredIntelligence(input: {
  review: LogUpdateParseResult;
}): boolean {
  if (!input.review.usesProviderIntelligence) return false;
  if (input.review.sourceText.trim().length < 8) return false;
  if (logUpdateHasUnresolvedConflicts(input.review.fieldUpdates)) return false;
  return true;
}

export function buildLogUpdateProviderCommitPayload(
  review: LogUpdateParseResult,
  options?: { hasAcceptedContacts?: boolean },
): LogUpdateProviderCommitPayload | { error: string } {
  if (logUpdateHasUnresolvedConflicts(review.fieldUpdates)) {
    return { error: LOG_UPDATE_ERR_UNRESOLVED_CONFLICT };
  }

  const selectedFields = review.fieldUpdates.filter((u) => u.accepted).length;
  const hasAcceptedContacts = options?.hasAcceptedContacts === true;
  if (selectedFields === 0 && !review.saveAsNoteAccepted && !hasAcceptedContacts) {
    return { error: LOG_UPDATE_ERR_SELECT_ONE };
  }

  return {
    sourceText: review.sourceText,
    saveAsNote: review.saveAsNoteAccepted,
    fieldPatches: logUpdateAcceptedFieldPatches(review.fieldUpdates),
    fieldEvidence: buildFieldEvidenceFromLogUpdate(review),
  };
}

export function buildProviderFieldNoteFollowUpSyncPayload(input: {
  review: LogUpdateParseResult;
  engagementId?: string | null;
  proposedContacts?: DebriefProposedContactItem[];
}): {
  engagement_id?: string;
  follow_up_tasks: string[];
  log_update: LogUpdateParseResult;
} | null {
  if (!input.review.usesProviderIntelligence) return null;

  const followUpTasks = extractFollowUpTaskLinesFromDebriefReview({
    dictation: input.review.sourceText,
    logUpdate: input.review,
    proposedContacts: input.proposedContacts ?? [],
  });
  if (followUpTasks.length === 0) return null;

  const engagementId = String(input.engagementId ?? "").trim();
  const logUpdate = sanitizeLogUpdateForDebriefPersist(input.review) ?? input.review;
  return {
    ...(engagementId ? { engagement_id: engagementId } : {}),
    follow_up_tasks: followUpTasks,
    log_update: logUpdate,
  };
}

export function buildEngagementDebriefSyncPayload(input: {
  review: LogUpdateParseResult;
  engagementId: string;
  proposedContacts?: DebriefProposedContactItem[];
}): {
  engagement_id: string;
  follow_up_tasks: string[];
  log_update: LogUpdateParseResult;
} | null {
  const engagementId = String(input.engagementId ?? "").trim();
  if (!engagementId) return null;

  const payload = buildProviderFieldNoteFollowUpSyncPayload({
    review: input.review,
    engagementId,
    proposedContacts: input.proposedContacts,
  });
  if (!payload) return null;

  return {
    engagement_id: engagementId,
    follow_up_tasks: payload.follow_up_tasks,
    log_update: sanitizeLogUpdateForDebriefPersist(payload.log_update) ?? payload.log_update,
  };
}

/** Legacy non-provider commit (case/org/opportunity). */
export function buildLegacyCommitItemsFromLogUpdateReview(
  review: LogUpdateParseResult,
  context: AiNoteCaptureContext,
): AiNoteCaptureCommitItem[] {
  const items: AiNoteCaptureCommitItem[] = [];
  const providerId = context.providerId ?? "";
  const body = review.sourceText.trim();
  if (!body) return items;

  if (review.saveAsNoteAccepted) {
    if (context.caseId) {
      items.push({
        id: `lu-${Date.now()}`,
        category: "case_observation",
        destination: "case",
        targetId: context.caseId,
        body,
      });
    } else if (context.organizationId) {
      items.push({
        id: `lu-${Date.now()}`,
        category: "organization_intelligence",
        destination: "organization",
        targetId: context.organizationId,
        body,
      });
    }
  }

  return items;
}
