import { engagementHasTacticalDebrief } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

export type PrepareOutcomeCaptureContext = {
  status: string;
  notes: string | null;
  scheduled_at: string | null;
  /** Meeting start (or end-of-day for date-only) is in the past. */
  is_post_meeting: boolean;
  is_completed: boolean;
  /** Debrief saved and marked complete on the engagement. */
  debrief_completed: boolean;
  /** Sticky bar should lead with Record Outcome. */
  emphasize_record_outcome: boolean;
  /** Short hint under footer CTA or in sheet kicker. */
  capture_hint: string | null;
};

export function buildPrepareOutcomeCaptureContext(
  engagement: Record<string, unknown>,
  nowMs: number = Date.now(),
): PrepareOutcomeCaptureContext {
  const status = String(engagement.status ?? "planned").toLowerCase();
  const notes = trimOrNull(engagement.notes);
  const scheduled_at = trimOrNull(engagement.scheduled_at);
  const engagement_date = trimOrNull(engagement.engagement_date);

  let meetingStartMs: number | null = null;
  if (scheduled_at) {
    const d = new Date(scheduled_at);
    if (!Number.isNaN(d.getTime())) meetingStartMs = d.getTime();
  } else if (engagement_date) {
    const d = new Date(`${engagement_date}T12:00:00`);
    if (!Number.isNaN(d.getTime())) meetingStartMs = d.getTime();
  }

  const is_post_meeting = meetingStartMs != null && nowMs >= meetingStartMs;
  const is_completed = status === "completed";
  const is_debrief_window = status === "in_progress";

  const emphasize_record_outcome = is_completed || is_post_meeting || is_debrief_window;

  let capture_hint: string | null = null;
  if (is_completed && notes) {
    capture_hint = "Debrief on file — update if needed";
  } else if (is_post_meeting || is_debrief_window) {
    capture_hint = "Capture while the visit is fresh";
  } else if (emphasize_record_outcome) {
    capture_hint = "Log what happened before you leave";
  }

  const debrief_completed = engagementHasTacticalDebrief({
    notes,
    debrief_completed: Boolean(engagement.debrief_completed),
    debrief_completed_at: trimOrNull(engagement.debrief_completed_at),
  });

  return {
    status,
    notes,
    scheduled_at,
    is_post_meeting,
    is_completed,
    debrief_completed,
    emphasize_record_outcome,
    capture_hint,
  };
}
