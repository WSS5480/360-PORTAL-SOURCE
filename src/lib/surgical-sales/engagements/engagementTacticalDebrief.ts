import { formatTacticalDebriefNotes } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefAnalyze";
import type { TacticalDebriefInsight } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefAnalyze";
import { isFormattedDebriefNotes } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefRawNotes";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

export const TACTICAL_DEBRIEF_NOTE_MARKER = "--- tactical debrief ---";

const TACTICAL_DEBRIEF_NOTE_RE = /---\s*tactical\s+debrief\s+---/i;

export function engagementNotesHaveTacticalDebrief(notes: string | null | undefined): boolean {
  const text = String(notes ?? "");
  if (TACTICAL_DEBRIEF_NOTE_RE.test(text)) return true;
  return isFormattedDebriefNotes(text);
}

export function engagementHasTacticalDebrief(
  engagement: Pick<ProviderEngagementSummary, "notes" | "debrief_completed" | "debrief_completed_at">,
): boolean {
  if (engagement.debrief_completed || engagement.debrief_completed_at) return true;
  return engagementNotesHaveTacticalDebrief(engagement.notes);
}

/** Completed touch still missing a saved debrief (in-progress uses Field Briefing, not debrief). */
export function engagementNeedsTacticalDebrief(engagement: ProviderEngagementSummary): boolean {
  if (engagementHasTacticalDebrief(engagement)) return false;
  return String(engagement.status || "").toLowerCase() === "completed";
}

export function buildStoredTacticalDebriefNotes(input: {
  narrative: string;
  insights?: TacticalDebriefInsight[];
}): string {
  const narrative = input.narrative.trim();
  const body = input.insights?.length
    ? formatTacticalDebriefNotes({ narrative, insights: input.insights })
    : narrative
      ? `What happened:\n${narrative}`
      : "";
  if (!body.trim()) return TACTICAL_DEBRIEF_NOTE_MARKER;
  return `${TACTICAL_DEBRIEF_NOTE_MARKER}\n\n${body}`;
}

export function buildEngagementTacticalDebriefCommitPatch(input: {
  narrative: string;
  insights?: TacticalDebriefInsight[];
  completeEngagement?: boolean;
  now?: string;
}): Record<string, unknown> {
  const now = input.now ?? new Date().toISOString();
  const patch: Record<string, unknown> = {
    notes: buildStoredTacticalDebriefNotes(input),
    debrief_completed: true,
    debrief_completed_at: now,
    updated_at: now,
  };
  if (input.completeEngagement !== false) {
    patch.status = "completed";
  }
  return patch;
}
