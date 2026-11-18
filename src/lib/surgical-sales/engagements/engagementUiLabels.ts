/** Shared engagement UI copy — no imports from wizard or lifecycle modules. */

export const ENGAGEMENT_EDIT_ENGAGEMENT_LABEL = "Edit Engagement";
export const ENGAGEMENT_CANCEL_ENGAGEMENT_LABEL = "Cancel Engagement";

/** @deprecated Prefer ENGAGEMENT_CONTINUE_DEBRIEF_LABEL for in-flow CTAs */
export const ENGAGEMENT_DEBRIEF_LABEL = "Debrief";

export const ENGAGEMENT_CONTINUE_DEBRIEF_LABEL = "Continue Debrief";
export const ENGAGEMENT_VIEW_DEBRIEF_LABEL = "View Debrief";
export const ENGAGEMENT_SKIP_DEBRIEF_LABEL = "Skip debrief";

/** Rep-facing lifecycle — exactly four states. */
export type EngagementRepLifecyclePhase = "planned" | "active" | "debrief_needed" | "completed";

export const ENGAGEMENT_REP_LIFECYCLE_LABELS: Record<EngagementRepLifecyclePhase, string> = {
  planned: "Planned",
  active: "Active",
  debrief_needed: "Debrief Needed",
  completed: "Completed",
};
