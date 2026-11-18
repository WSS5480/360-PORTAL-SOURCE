/**
 * Persisted debrief extraction — enables review mode without re-dictation.
 */

import { buildEngagementDebriefHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { TacticalDebriefAnalysis } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefAnalyze";
import type { IntelligencePropagationTarget } from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";
import type { ClassifiedEngagementOutcomeId } from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import { humanEvidenceForFieldUpdate } from "@/lib/surgical-sales/debriefDiscoveryEvidenceRouting";
import { buildFieldSignalsFromLogUpdate } from "@/lib/surgical-sales/propagatedIntelligenceSignal";

export type DebriefVisitOutcomeSnapshot = {
  outcomeId: ClassifiedEngagementOutcomeId;
  label: string;
  rationale: string;
  recordedAt: string;
};

export type DebriefIntelligenceSnapshotV1 = {
  version: 1;
  savedAt: string;
  narrative: string;
  analysis: TacticalDebriefAnalysis | null;
  logUpdate: LogUpdateParseResult | null;
  propagationTargets: IntelligencePropagationTarget[];
  discoveryContext: DebriefIntelligenceExtractionContext | null;
  providerContactSnapshot: Record<string, unknown> | null;
  proposedContacts: DebriefProposedContactItem[];
  /** Visit outcome after full debrief save (supersedes quick Start Mission tap). */
  visitOutcome?: DebriefVisitOutcomeSnapshot;
  /** Follow-up task lines shown in debrief review. */
  followUpTasks?: string[];
  /** Normalized task title → ISO completion timestamp. */
  followUpTaskCompletions?: Record<string, string>;
  /** UF capture id for review reopen hydrate when UF_EXTRACTION_REVIEW_PRIMARY=1. */
  universalFactCaptureId?: string | null;
};

export function sanitizeLogUpdateForDebriefPersist(
  logUpdate: LogUpdateParseResult | null,
): LogUpdateParseResult | null {
  if (!logUpdate?.debriefUniversalFactsRuns?.length) return logUpdate;
  const { debriefUniversalFactsRuns: _runs, ...rest } = logUpdate;
  return rest;
}

function sanitizeAnalysisForDebriefPersist(
  analysis: TacticalDebriefAnalysis | null,
): TacticalDebriefAnalysis | null {
  if (!analysis?.log_update?.debriefUniversalFactsRuns?.length) return analysis;
  return {
    ...analysis,
    log_update: sanitizeLogUpdateForDebriefPersist(analysis.log_update),
  };
}

/** Remove inline UF review runs before persisting debrief snapshots to engagement PATCH. */
export function sanitizeDebriefIntelligenceSnapshotForPersist(
  snapshot: DebriefIntelligenceSnapshotV1,
): DebriefIntelligenceSnapshotV1 {
  return {
    ...snapshot,
    logUpdate: sanitizeLogUpdateForDebriefPersist(snapshot.logUpdate),
    analysis: sanitizeAnalysisForDebriefPersist(snapshot.analysis),
  };
}

/** Sanitize merged visit snapshot records (preserves visitOutcome / followUpTasks extras). */
export function sanitizeDebriefSnapshotRecordForPersist(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...record };
  if (next.logUpdate) {
    next.logUpdate = sanitizeLogUpdateForDebriefPersist(next.logUpdate as LogUpdateParseResult);
  }
  if (next.analysis && typeof next.analysis === "object" && !Array.isArray(next.analysis)) {
    next.analysis = sanitizeAnalysisForDebriefPersist(next.analysis as TacticalDebriefAnalysis);
  }
  return next;
}

export function buildDebriefIntelligenceSnapshot(input: {
  narrative: string;
  analysis: TacticalDebriefAnalysis | null;
  logUpdate: LogUpdateParseResult | null;
  propagationTargets: IntelligencePropagationTarget[];
  discoveryContext: DebriefIntelligenceExtractionContext | null;
  providerContactSnapshot: Record<string, unknown> | null;
  proposedContacts: DebriefProposedContactItem[];
  savedAt?: string;
  universalFactCaptureId?: string | null;
}): DebriefIntelligenceSnapshotV1 {
  return sanitizeDebriefIntelligenceSnapshotForPersist({
    version: 1,
    savedAt: input.savedAt ?? new Date().toISOString(),
    narrative: input.narrative.trim(),
    analysis: input.analysis,
    logUpdate: input.logUpdate,
    propagationTargets: input.propagationTargets,
    discoveryContext: input.discoveryContext,
    providerContactSnapshot: input.providerContactSnapshot,
    proposedContacts: input.proposedContacts,
    universalFactCaptureId: input.universalFactCaptureId ?? null,
  });
}

export function parseDebriefIntelligenceSnapshot(raw: unknown): DebriefIntelligenceSnapshotV1 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (row.version !== 1) return null;
  const savedAt = String(row.savedAt ?? "").trim();
  if (!savedAt) return null;
  return {
    version: 1,
    savedAt,
    narrative: String(row.narrative ?? ""),
    analysis: (row.analysis as TacticalDebriefAnalysis | null) ?? null,
    logUpdate: (row.logUpdate as LogUpdateParseResult | null) ?? null,
    propagationTargets: Array.isArray(row.propagationTargets)
      ? (row.propagationTargets as IntelligencePropagationTarget[])
      : [],
    discoveryContext: (row.discoveryContext as DebriefIntelligenceExtractionContext | null) ?? null,
    providerContactSnapshot:
      row.providerContactSnapshot && typeof row.providerContactSnapshot === "object"
        ? (row.providerContactSnapshot as Record<string, unknown>)
        : null,
    proposedContacts: Array.isArray(row.proposedContacts)
      ? (row.proposedContacts as DebriefProposedContactItem[])
      : [],
    visitOutcome:
      row.visitOutcome && typeof row.visitOutcome === "object" && !Array.isArray(row.visitOutcome)
        ? (row.visitOutcome as DebriefVisitOutcomeSnapshot)
        : undefined,
    followUpTasks: Array.isArray(row.followUpTasks)
      ? row.followUpTasks.map((line) => String(line).trim()).filter(Boolean)
      : undefined,
    followUpTaskCompletions:
      row.followUpTaskCompletions &&
      typeof row.followUpTaskCompletions === "object" &&
      !Array.isArray(row.followUpTaskCompletions)
        ? Object.fromEntries(
            Object.entries(row.followUpTaskCompletions as Record<string, unknown>)
              .map(([key, value]) => [String(key).trim(), String(value ?? "").trim()] as const)
              .filter(([key, value]) => key && value),
          )
        : undefined,
    universalFactCaptureId:
      typeof row.universalFactCaptureId === "string" ? row.universalFactCaptureId : null,
  };
}

export function buildDebriefReviewHref(prepareHref: string, reviewMode: boolean): string {
  const engagementId = prepareHref.match(/\/engagements\/([^/]+)/)?.[1];
  if (!engagementId) {
    if (!reviewMode) return `${prepareHref}?panel=debrief`;
    return `${prepareHref}?panel=debrief&mode=review`;
  }
  return buildEngagementDebriefHref(engagementId, reviewMode);
}

export function buildFieldEvidenceFromLogUpdate(
  logUpdate: LogUpdateParseResult | null,
): Record<string, string> {
  if (!logUpdate?.usesProviderIntelligence) return {};
  const out: Record<string, string> = {};
  for (const field of logUpdate.fieldUpdates) {
    if (!field.accepted || !field.dbKey) continue;
    const quote = humanEvidenceForFieldUpdate(field, logUpdate);
    if (quote) out[field.dbKey] = quote;
  }
  return out;
}

export { buildFieldSignalsFromLogUpdate };

export function acceptedFieldUpdatesFromSnapshot(
  snapshot: DebriefIntelligenceSnapshotV1,
): LogUpdateRoutedFieldUpdate[] {
  const review = snapshot.logUpdate;
  if (!review?.usesProviderIntelligence) return [];
  return review.fieldUpdates.filter((f) => f.accepted);
}
