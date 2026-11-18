/**
 * Canonical rep-facing engagement status labels.
 * Lifecycle: Planned | Active | Debrief Needed | Completed
 * Preparation (planned/active only): Not Started | Ready
 */

import { countPreCallPlanFilled } from "@/lib/surgical-sales/preCallPlanFields";
import { ENGAGEMENT_REP_LIFECYCLE_LABELS } from "@/lib/surgical-sales/engagements/engagementUiLabels";

const TACTICAL_DEBRIEF_NOTE_RE = /---\s*tactical\s+debrief\s+---/i;

function engagementNotesHaveTacticalDebrief(notes: string | null | undefined): boolean {
  return TACTICAL_DEBRIEF_NOTE_RE.test(String(notes ?? ""));
}

function engagementHasTacticalDebrief(row: Record<string, unknown>): boolean {
  if (Boolean(row.debrief_completed) || row.debrief_completed_at) return true;
  return engagementNotesHaveTacticalDebrief(row.notes ? String(row.notes) : null);
}

function isEngagementPreparationReady(row: Record<string, unknown>): boolean {
  if (row.prepared_at) return true;
  const preCall = countPreCallPlanFilled(row);
  return preCall.total > 0 && preCall.filled >= preCall.total;
}

export type EngagementDisplayStatusId = "planned" | "in_progress" | "completed";

export type EngagementPreparationDisplayId = "not_started" | "ready";

export type EngagementDebriefDisplayId = "pending" | "completed";

export const ENGAGEMENT_DISPLAY_STATUS_LABELS: Record<EngagementDisplayStatusId, string> = {
  planned: "Planned",
  in_progress: "Active",
  completed: "Completed",
};

export const ENGAGEMENT_PREPARATION_DISPLAY_LABELS: Record<EngagementPreparationDisplayId, string> = {
  not_started: "Not Started",
  ready: "Ready",
};

export const ENGAGEMENT_DEBRIEF_DISPLAY_LABELS: Record<EngagementDebriefDisplayId, string> = {
  pending: "Pending",
  completed: "Completed",
};

export function normalizeEngagementDisplayStatusId(
  status: string | null | undefined,
): EngagementDisplayStatusId {
  const raw = String(status ?? "planned").trim().toLowerCase();
  if (raw === "in_progress") return "in_progress";
  if (raw === "completed" || raw === "cancelled") return "completed";
  return "planned";
}

export function formatEngagementDisplayStatus(
  status: string | null | undefined,
  options?: { needsDebrief?: boolean },
): string {
  const id = normalizeEngagementDisplayStatusId(status);
  if (id === "completed" && options?.needsDebrief) return "Debrief Needed";
  return ENGAGEMENT_DISPLAY_STATUS_LABELS[id];
}

/** Rep-facing lifecycle status from an engagement row (four states only). */
export function formatEngagementDisplayStatusForRow(row: Record<string, unknown>): string {
  const status = String(row.status ?? "").trim().toLowerCase();
  if (status === "in_progress") return ENGAGEMENT_REP_LIFECYCLE_LABELS.active;
  if (status === "completed" || status === "cancelled") {
    return resolveEngagementDebriefDisplayId(row) === "pending"
      ? ENGAGEMENT_REP_LIFECYCLE_LABELS.debrief_needed
      : ENGAGEMENT_REP_LIFECYCLE_LABELS.completed;
  }
  return ENGAGEMENT_REP_LIFECYCLE_LABELS.planned;
}

/** Preparation applies only while the touch is still planned (not during active execution). */
export function isEngagementPreparationApplicable(row: Record<string, unknown>): boolean {
  const status = String(row.status ?? "planned").trim().toLowerCase();
  return status === "planned";
}

export function resolveEngagementPreparationDisplayId(
  row: Record<string, unknown>,
): EngagementPreparationDisplayId {
  return isEngagementPreparationReady(row) ? "ready" : "not_started";
}

export function formatEngagementPreparationDisplayStatus(
  row: Record<string, unknown>,
): string | null {
  if (!isEngagementPreparationApplicable(row)) return null;
  return ENGAGEMENT_PREPARATION_DISPLAY_LABELS[resolveEngagementPreparationDisplayId(row)];
}

/** Engagement detail hub — hide preparation once the touch is completed. */
export function engagementDetailShowsPreparationStatus(row: Record<string, unknown>): boolean {
  return isEngagementPreparationApplicable(row);
}

export function engagementDetailShowsCompletedSummary(row: Record<string, unknown>): boolean {
  return String(row.status ?? "").trim().toLowerCase() === "completed";
}

/** Debrief applies once the touch is complete or debrief capture has started. */
export function isEngagementDebriefApplicable(row: Record<string, unknown>): boolean {
  const status = String(row.status ?? "").trim().toLowerCase();
  if (status === "completed") return true;
  if (engagementHasTacticalDebrief(row)) return true;
  if (Boolean(row.debrief_completed)) return true;
  return false;
}

export function resolveEngagementDebriefDisplayId(
  row: Record<string, unknown>,
): EngagementDebriefDisplayId | null {
  if (!isEngagementDebriefApplicable(row)) return null;
  return engagementHasTacticalDebrief(row) ? "completed" : "pending";
}

export function formatEngagementDebriefDisplayStatus(row: Record<string, unknown>): string | null {
  const id = resolveEngagementDebriefDisplayId(row);
  if (!id) return null;
  return ENGAGEMENT_DEBRIEF_DISPLAY_LABELS[id];
}
