/**
 * Persist debrief follow-up tasks onto an engagement after intelligence review save.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import {
  buildDebriefIntelligenceSnapshot,
  parseDebriefIntelligenceSnapshot,
  sanitizeDebriefSnapshotRecordForPersist,
  type DebriefIntelligenceSnapshotV1,
} from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import {
  buildEngagementDebriefVisitPersistFields,
  extractFollowUpTaskLinesFromDebriefReview,
  formatFollowUpTasksForEngagementColumn,
} from "@/lib/surgical-sales/engagements/engagementDebriefVisitRecord";
import {
  extractFollowUpLinesFromDebriefNarrative,
} from "@/lib/surgical-sales/engagements/buildDebriefNarrativeIntelligenceHints";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";

export type EngagementDebriefFollowUpSyncInput = {
  engagementId: string;
  actorUserId: string;
  narrative: string;
  logUpdate?: LogUpdateParseResult | null;
  proposedContacts?: DebriefProposedContactItem[];
  providerContact?: Record<string, unknown> | null;
  providerLabel?: string | null;
  /** Precomputed follow-up lines from review (preferred when logUpdate is omitted). */
  followUpTasks?: string[];
};

function normalizeFollowUpLine(line: string): string {
  return line.replace(/^[-•*]\s*/, "").trim();
}

function mergeFollowUpLines(existing: string[], incoming: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const line of [...existing, ...incoming].map(normalizeFollowUpLine).filter(Boolean)) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(line);
  }
  return merged.slice(0, 12);
}

function splitFollowUpColumn(raw: string | null | undefined): string[] {
  return String(raw ?? "")
    .split(/\n+/)
    .map(normalizeFollowUpLine)
    .filter(Boolean);
}

export async function syncEngagementDebriefFollowUpTasks(
  input: EngagementDebriefFollowUpSyncInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const engagementId = String(input.engagementId ?? "").trim();
  if (!engagementId) return { ok: false, message: "Engagement id required." };

  const { data: engagement, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select(
      "id, sales_rep_id, engagement_type, next_action, follow_up_tasks, debrief_intelligence_snapshot, notes",
    )
    .eq("id", engagementId)
    .maybeSingle();
  if (loadErr || !engagement) {
    return { ok: false, message: loadErr?.message || "Engagement not found." };
  }
  if (String(engagement.sales_rep_id ?? "") !== input.actorUserId) {
    return { ok: false, message: "Engagement not found." };
  }

  const narrative = String(input.narrative ?? "").trim();
  const engagementType = String(engagement.engagement_type ?? "intro_call");
  const existingSnapshot = parseDebriefIntelligenceSnapshot(engagement.debrief_intelligence_snapshot);

  const baseSnapshot: DebriefIntelligenceSnapshotV1 =
    existingSnapshot ??
    buildDebriefIntelligenceSnapshot({
      narrative,
      analysis: null,
      logUpdate: input.logUpdate ?? null,
      propagationTargets: [],
      discoveryContext: null,
      providerContactSnapshot: input.providerContact ?? null,
      proposedContacts: input.proposedContacts ?? [],
    });

  const snapshotWithReview: DebriefIntelligenceSnapshotV1 = {
    ...baseSnapshot,
    narrative: narrative || baseSnapshot.narrative,
    logUpdate: input.logUpdate ?? baseSnapshot.logUpdate,
    proposedContacts:
      input.proposedContacts?.length ? input.proposedContacts : baseSnapshot.proposedContacts,
    providerContactSnapshot:
      input.providerContact ?? baseSnapshot.providerContactSnapshot,
  };

  const visitFields = buildEngagementDebriefVisitPersistFields({
    snapshot: snapshotWithReview,
    narrative: narrative || snapshotWithReview.narrative,
    engagementType,
    existingNextAction: String(engagement.next_action ?? "").trim() || null,
    existingDebriefSnapshot: engagement.debrief_intelligence_snapshot,
    logUpdate: snapshotWithReview.logUpdate,
    proposedContacts: snapshotWithReview.proposedContacts,
    providerContact: input.providerContact,
    providerLabel: input.providerLabel,
  });

  const extractedFollowUps = input.logUpdate?.usesProviderIntelligence
    ? extractFollowUpTaskLinesFromDebriefReview({
        dictation: narrative || snapshotWithReview.narrative,
        logUpdate: input.logUpdate ?? snapshotWithReview.logUpdate,
        proposedContacts: input.proposedContacts ?? snapshotWithReview.proposedContacts,
        providerContact: input.providerContact,
        providerLabel: input.providerLabel,
      })
    : extractFollowUpLinesFromDebriefNarrative(narrative || snapshotWithReview.narrative);
  const explicitFollowUps = (input.followUpTasks ?? []).map(normalizeFollowUpLine).filter(Boolean);
  const followUpLines = mergeFollowUpLines(
    mergeFollowUpLines(splitFollowUpColumn(visitFields.follow_up_tasks), extractedFollowUps),
    explicitFollowUps,
  );
  if (followUpLines.length === 0 && !visitFields.next_action) {
    return { ok: true };
  }

  const mergedSnapshot = sanitizeDebriefSnapshotRecordForPersist({
    ...(visitFields.debrief_intelligence_snapshot as Record<string, unknown>),
    ...(followUpLines.length > 0 ? { followUpTasks: followUpLines } : {}),
    followUpTaskCompletions:
      (visitFields.debrief_intelligence_snapshot as Record<string, unknown>).followUpTaskCompletions ??
      (existingSnapshot as Record<string, unknown> | undefined)?.followUpTaskCompletions,
  });

  const patch: Record<string, unknown> = {
    debrief_intelligence_snapshot: mergedSnapshot,
    updated_at: new Date().toISOString(),
  };
  if (followUpLines.length > 0) {
    patch.follow_up_tasks = formatFollowUpTasksForEngagementColumn(followUpLines);
  }
  if (visitFields.next_action) {
    patch.next_action = visitFields.next_action;
  }

  const { error: upErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update(patch)
    .eq("id", engagementId);
  if (upErr) return { ok: false, message: upErr.message };

  return { ok: true };
}

export function followUpTaskCompletionKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[“”"'.!?()[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function setEngagementFollowUpTaskCompletion(input: {
  engagementId: string;
  actorUserId: string;
  taskTitle: string;
  completed: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const engagementId = String(input.engagementId ?? "").trim();
  const taskTitle = normalizeFollowUpLine(String(input.taskTitle ?? ""));
  if (!engagementId || !taskTitle) {
    return { ok: false, message: "Task title required." };
  }

  const { data: engagement, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select("id, sales_rep_id, debrief_intelligence_snapshot")
    .eq("id", engagementId)
    .maybeSingle();
  if (loadErr || !engagement) {
    return { ok: false, message: loadErr?.message || "Engagement not found." };
  }
  if (String(engagement.sales_rep_id ?? "") !== input.actorUserId) {
    return { ok: false, message: "Engagement not found." };
  }

  const snapshotRecord = (engagement.debrief_intelligence_snapshot ?? {}) as Record<string, unknown>;
  const completions =
    snapshotRecord.followUpTaskCompletions &&
    typeof snapshotRecord.followUpTaskCompletions === "object" &&
    !Array.isArray(snapshotRecord.followUpTaskCompletions)
      ? { ...(snapshotRecord.followUpTaskCompletions as Record<string, string>) }
      : {};

  const key = followUpTaskCompletionKey(taskTitle);
  if (input.completed) {
    completions[key] = new Date().toISOString();
  } else {
    delete completions[key];
  }

  const nextSnapshot = sanitizeDebriefSnapshotRecordForPersist({
    ...snapshotRecord,
    followUpTaskCompletions: completions,
  });

  const { error: upErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({
      debrief_intelligence_snapshot: nextSnapshot,
      updated_at: new Date().toISOString(),
    })
    .eq("id", engagementId);
  if (upErr) return { ok: false, message: upErr.message };

  return { ok: true };
}
