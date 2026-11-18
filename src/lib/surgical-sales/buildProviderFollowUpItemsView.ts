/**
 * Provider-level follow-up items aggregated from engagement debrief saves.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { followUpTaskCompletionKey } from "@/lib/surgical-sales/engagements/syncEngagementDebriefFollowUpTasks";
import {
  extractFollowUpLinesFromDebriefNarrative,
  resolveLatestEngagementDebriefNarrative,
  resolveProviderDebriefNarrativeFallback,
} from "@/lib/surgical-sales/engagements/buildDebriefNarrativeIntelligenceHints";
import type { ProviderDebriefNarrativeContext } from "@/lib/surgical-sales/engagements/loadLatestProviderDebriefNarrative";
import { parseDebriefIntelligenceSnapshot } from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";

export type ProviderFollowUpItem = {
  id: string;
  title: string;
  engagementId: string;
  engagementLabel: string;
  completed: boolean;
  completedAt: string | null;
  sourceDate: string | null;
};

function splitFollowUpLines(raw: string | null | undefined): string[] {
  return String(raw ?? "")
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter((line) => line.length >= 4);
}

function engagementLabel(row: ProviderEngagementSummary): string {
  const type = row.engagement_type_label?.trim() || "Engagement";
  const when = row.engagement_date || row.scheduled_at;
  if (!when) return type;
  const date = new Date(when);
  if (Number.isNaN(date.getTime())) return type;
  const formatted = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${type} · ${formatted}`;
}

export function buildProviderFollowUpItemsView(input: {
  engagements?: ProviderEngagementSummary[];
  debriefNarrativeContext?: ProviderDebriefNarrativeContext | null;
}): ProviderFollowUpItem[] {
  const items: ProviderFollowUpItem[] = [];
  const seen = new Set<string>();
  const narrativeFallback = resolveProviderDebriefNarrativeFallback({
    engagements: input.engagements,
    narrativeFallback: input.debriefNarrativeContext?.narrative,
  });

  for (const engagement of input.engagements ?? []) {
    const snapshot = parseDebriefIntelligenceSnapshot(engagement.debrief_intelligence_snapshot);
    const completions =
      snapshot &&
      (snapshot as unknown as { followUpTaskCompletions?: Record<string, string> }).followUpTaskCompletions
        ? (snapshot as unknown as { followUpTaskCompletions: Record<string, string> }).followUpTaskCompletions
        : {};

    const lines = mergeFollowUpSources(
      engagement.follow_up_tasks,
      snapshot?.followUpTasks,
      extractFollowUpLinesFromDebriefNarrative(
        parseDebriefIntelligenceSnapshot(engagement.debrief_intelligence_snapshot)?.narrative ??
          resolveLatestEngagementDebriefNarrative([engagement]) ??
          "",
      ),
    );

    for (const title of lines) {
      const dedupeKey = `${engagement.id}:${title.toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const completionKey = followUpTaskCompletionKey(title);
      const completedAt = completions[completionKey] ?? null;

      items.push({
        id: `${engagement.id}:${completionKey}`,
        title,
        engagementId: engagement.id,
        engagementLabel: engagementLabel(engagement),
        completed: Boolean(completedAt),
        completedAt,
        sourceDate: engagement.debrief_completed_at ?? engagement.updated_at ?? null,
      });
    }
  }

  if (
    narrativeFallback &&
    input.debriefNarrativeContext?.engagementId &&
    !input.engagements?.some((row) => row.id === input.debriefNarrativeContext?.engagementId)
  ) {
    const engagementId = input.debriefNarrativeContext.engagementId;
    for (const title of extractFollowUpLinesFromDebriefNarrative(narrativeFallback)) {
      const dedupeKey = `${engagementId}:${title.toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const completionKey = followUpTaskCompletionKey(title);
      items.push({
        id: `${engagementId}:${completionKey}`,
        title,
        engagementId,
        engagementLabel: "Intro Call",
        completed: false,
        completedAt: null,
        sourceDate: null,
      });
    }
  }

  return items.sort((left, right) => {
    if (left.completed !== right.completed) return left.completed ? 1 : -1;
    const leftTime = left.sourceDate ? new Date(left.sourceDate).getTime() : 0;
    const rightTime = right.sourceDate ? new Date(right.sourceDate).getTime() : 0;
    return rightTime - leftTime;
  });
}

function mergeFollowUpSources(
  columnRaw: string | null | undefined,
  snapshotTasks: string[] | undefined,
  narrativeTasks: string[] = [],
): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const line of [
    ...splitFollowUpLines(columnRaw),
    ...(snapshotTasks ?? []),
    ...narrativeTasks,
  ]) {
    const key = followUpTaskCompletionKey(line);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(line);
  }

  const genericOnly = merged.filter((line) => /^next step recommended$/i.test(line.trim()));
  if (genericOnly.length > 0 && merged.some((line) => !/^next step recommended$/i.test(line.trim()))) {
    return merged.filter((line) => !/^next step recommended$/i.test(line.trim()));
  }

  return merged;
}

export function providerFollowUpProgress(items: ProviderFollowUpItem[]): {
  openCount: number;
  completedCount: number;
} {
  const completedCount = items.filter((item) => item.completed).length;
  return {
    openCount: items.length - completedCount,
    completedCount,
  };
}
