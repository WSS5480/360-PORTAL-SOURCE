/**
 * Sync engagement visit outcome + follow-up tasks when a tactical debrief is saved.
 * Supersedes a quick Start Mission outcome (e.g. No Meaningful Update) after full debrief.
 */

import { buildDebriefActionableReviewCards } from "@/lib/surgical-sales/buildDebriefActionableReviewCards";
import { buildDebriefIntelligenceExtractionReview } from "@/lib/surgical-sales/buildDebriefIntelligenceExtractionReview";
import {
  buildDebriefIntelligenceBrief,
  buildIntelligenceBriefOutcomes,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceBrief";
import { buildDebriefReviewDecisionContext } from "@/lib/surgical-sales/debriefIntelligencePipeline/buildDebriefReviewDecisionContext";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import type { DebriefIntelligenceExtractionContext } from "@/lib/surgical-sales/debriefIntelligenceExtractionContext";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import {
  classifyEngagementOutcomeFromDebrief,
  ENGAGEMENT_OUTCOME_LABELS,
  type ClassifiedEngagementOutcome,
} from "@/lib/surgical-sales/engagements/classifyEngagementOutcomeFromDebrief";
import {
  sanitizeDebriefSnapshotRecordForPersist,
  type DebriefIntelligenceSnapshotV1,
} from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import {
  mergeStartMissionSnapshot,
  readStartMissionSnapshot,
} from "@/lib/surgical-sales/engagements/startMissionSnapshot";
import { applyDebriefCompletionSnapshotExtras } from "@/lib/surgical-sales/engagements/mergeDebriefCompletionSnapshot";
import {
  resolveStartMissionContent,
  type StartMissionOutcomeId,
} from "@/lib/surgical-sales/engagements/startMissionConfig";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import {
  classifyProviderDebriefConversationResult,
  providerDebriefClassifiedToVisitOutcome,
} from "@/lib/surgical-sales/engagements/classifyProviderDebriefConversationResult";
import { extractFollowUpLinesFromDebriefNarrative } from "@/lib/surgical-sales/engagements/buildDebriefNarrativeIntelligenceHints";
import { normalizeNextActionDisplayTitle } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefNextActionDisplay";
import { extractUniversalCategorySignals } from "@/lib/surgical-sales/sharedIntelligence/extractUniversalCategorySignals";

const STALE_QUICK_OUTCOME_IDS = new Set<StartMissionOutcomeId>([
  "no_meaningful_update",
  "touch_no_progress",
]);

function normalizeFollowUpLine(line: string): string {
  return line.replace(/^[-•*]\s*/, "").trim();
}

export function extractFollowUpTaskLinesFromDebriefReview(input: {
  dictation: string;
  logUpdate: LogUpdateParseResult | null;
  proposedContacts: DebriefProposedContactItem[];
  providerContact?: Record<string, unknown> | null;
  providerLabel?: string | null;
}): string[] {
  if (!input.logUpdate?.usesProviderIntelligence) return [];

  const extraction = buildDebriefIntelligenceExtractionReview({
    review: input.logUpdate,
    proposedContacts: input.proposedContacts,
    sourceReference: "debrief-save",
  });

  const guardContext = buildDebriefReviewDecisionContext({
    providerContact: input.providerContact,
    providerLabel: input.providerLabel,
  });

  const cards = buildDebriefActionableReviewCards({
    extraction,
    proposedContacts: input.proposedContacts,
    dictation: input.dictation,
    guardContext,
  });

  const outcomes = buildIntelligenceBriefOutcomes(
    buildDebriefIntelligenceBrief({ cards }),
  );

  const seen = new Set<string>();
  const lines: string[] = [];
  const pushLine = (raw: string | null | undefined) => {
    const line = normalizeFollowUpLine(normalizeNextActionDisplayTitle(String(raw ?? "")));
    if (!line || line.length < 4) return;
    const key = line.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(line);
  };

  for (const outcome of outcomes) {
    if (outcome.kind !== "follow_up") continue;
    pushLine(outcome.primaryLine || outcome.summaryLine);
  }

  for (const signal of extractUniversalCategorySignals(input.dictation, {
    providerName: input.providerLabel ?? undefined,
  })) {
    if (signal.concept !== "next_action") continue;
    pushLine(signal.normalized_label || signal.evidence_text);
  }

  for (const line of extractFollowUpLinesFromDebriefNarrative(input.dictation)) {
    pushLine(line);
  }

  return lines.slice(0, 12);
}

export function resolveVisitOutcomeFromDebriefNarrative(input: {
  narrative: string;
  engagementType: string;
}): ClassifiedEngagementOutcome {
  if (isProviderDebriefEngagement(input.engagementType)) {
    const classified = providerDebriefClassifiedToVisitOutcome(
      classifyProviderDebriefConversationResult(input.narrative),
    );
    return {
      outcomeId: classified.outcomeId as ClassifiedEngagementOutcome["outcomeId"],
      label: classified.label,
      rationale: classified.rationale,
    };
  }

  const classified = classifyEngagementOutcomeFromDebrief(input.narrative);
  if (classified.outcomeId !== "no_meaningful_update") return classified;

  const text = input.narrative.trim();
  if (text.length >= 80) {
    return {
      outcomeId: "follow_up_needed",
      label: ENGAGEMENT_OUTCOME_LABELS.follow_up_needed,
      rationale:
        "Full debrief narrative captured — superseding a quick No Meaningful Update visit tap.",
    };
  }

  return classified;
}

export function mergeDebriefSnapshotWithVisitRecord(input: {
  snapshot: DebriefIntelligenceSnapshotV1;
  narrative: string;
  engagementType: string;
  existingDebriefSnapshot?: unknown;
  followUpTaskLines?: string[];
}): Record<string, unknown> {
  const classified = resolveVisitOutcomeFromDebriefNarrative({
    narrative: input.narrative,
    engagementType: input.engagementType,
  });

  const followUps = (input.followUpTaskLines ?? []).map(normalizeFollowUpLine).filter(Boolean);

  const base: Record<string, unknown> = {
    ...input.snapshot,
    visitOutcome: {
      outcomeId: classified.outcomeId,
      label: classified.label,
      rationale: classified.rationale,
      recordedAt: input.snapshot.savedAt,
    },
    ...(followUps.length > 0 ? { followUpTasks: followUps } : {}),
  };

  const prevMission = readStartMissionSnapshot(input.existingDebriefSnapshot);
  const missionPatch = {
    live_notes: input.narrative,
    outcome_id: classified.outcomeId as StartMissionOutcomeId,
    outcome_label: classified.label,
    outcome_recorded_at: input.snapshot.savedAt,
    ...(prevMission?.opened_at ? { opened_at: prevMission.opened_at } : {}),
  };

  return applyDebriefCompletionSnapshotExtras(
    mergeStartMissionSnapshot(base, missionPatch),
    input.existingDebriefSnapshot,
  );
}

export function engagementNextActionFromDebriefSave(input: {
  narrative: string;
  engagementType: string;
  existingNextAction?: string | null;
  classified?: ClassifiedEngagementOutcome;
}): string {
  const classified =
    input.classified ??
    resolveVisitOutcomeFromDebriefNarrative({
      narrative: input.narrative,
      engagementType: input.engagementType,
    });

  const existing = String(input.existingNextAction ?? "").trim();
  const content = resolveStartMissionContent({ engagementType: input.engagementType });
  const staleLabel = content.outcomes.find((o) =>
    STALE_QUICK_OUTCOME_IDS.has(o.id),
  )?.label;

  if (
    existing &&
    staleLabel &&
    existing.toLowerCase() === staleLabel.toLowerCase() &&
    classified.outcomeId !== "no_meaningful_update"
  ) {
    return classified.label;
  }

  if (!existing && classified.outcomeId !== "no_meaningful_update") {
    return classified.label;
  }

  if (
    classified.outcomeId !== "no_meaningful_update" &&
    existing.toLowerCase() === ENGAGEMENT_OUTCOME_LABELS.no_meaningful_update.toLowerCase()
  ) {
    return classified.label;
  }

  return existing || classified.label;
}

export function formatFollowUpTasksForEngagementColumn(lines: string[]): string | null {
  const cleaned = lines.map(normalizeFollowUpLine).filter(Boolean);
  if (cleaned.length === 0) return null;
  return cleaned.join("\n");
}

export type EngagementDebriefVisitPersistFields = {
  debrief_intelligence_snapshot: Record<string, unknown>;
  next_action: string | null;
  follow_up_tasks: string | null;
};

/** PATCH payload fields so engagement detail supersedes a quick Start Mission outcome. */
export function buildEngagementDebriefVisitPersistFields(input: {
  snapshot: DebriefIntelligenceSnapshotV1;
  narrative: string;
  engagementType: string;
  existingNextAction?: string | null;
  existingDebriefSnapshot?: unknown;
  logUpdate?: LogUpdateParseResult | null;
  proposedContacts?: DebriefProposedContactItem[];
  providerContact?: Record<string, unknown> | null;
  providerLabel?: string | null;
}): EngagementDebriefVisitPersistFields {
  const followUpLines = input.logUpdate?.usesProviderIntelligence
    ? extractFollowUpTaskLinesFromDebriefReview({
        dictation: input.narrative,
        logUpdate: input.logUpdate,
        proposedContacts: input.proposedContacts ?? [],
        providerContact: input.providerContact,
        providerLabel: input.providerLabel,
      })
    : [];

  const classified = resolveVisitOutcomeFromDebriefNarrative({
    narrative: input.narrative,
    engagementType: input.engagementType,
  });

  const debrief_intelligence_snapshot = sanitizeDebriefSnapshotRecordForPersist(
    mergeDebriefSnapshotWithVisitRecord({
      snapshot: input.snapshot,
      narrative: input.narrative,
      engagementType: input.engagementType,
      existingDebriefSnapshot: input.existingDebriefSnapshot,
      followUpTaskLines: followUpLines,
    }),
  );

  const next_action = engagementNextActionFromDebriefSave({
    narrative: input.narrative,
    engagementType: input.engagementType,
    existingNextAction: input.existingNextAction,
    classified,
  });

  return {
    debrief_intelligence_snapshot,
    next_action: next_action.trim() || null,
    follow_up_tasks: formatFollowUpTasksForEngagementColumn(followUpLines),
  };
}
