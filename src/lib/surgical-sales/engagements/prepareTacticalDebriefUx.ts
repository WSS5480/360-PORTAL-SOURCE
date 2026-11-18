/** UX copy for tactical debrief (capture → analyze → review → save). */

import { ENGAGEMENT_DEBRIEF_LABEL } from "@/lib/surgical-sales/engagements/engagementUiLabels";

export const TACTICAL_DEBRIEF_KICKER = ENGAGEMENT_DEBRIEF_LABEL;

export const TACTICAL_DEBRIEF_SUBTITLE =
  "Talk naturally about the visit — we'll suggest relationship, access, workflow, and next-step intelligence to review before saving.";
export const TACTICAL_DEBRIEF_SAVE_ANALYZE_LABEL = "Analyze";

export const TACTICAL_DEBRIEF_MAPPING_UNAVAILABLE =
  "AI mapping unavailable. Save as plain debrief only?";

export const TACTICAL_DEBRIEF_FALLBACK_SAVE_NOTE = "Save note only";
export const TACTICAL_DEBRIEF_FALLBACK_TRY_AGAIN = "Try again";
/** @deprecated Review modal uses log-update review actions */
export const TACTICAL_DEBRIEF_ACCEPT_ALL = "Accept all";
/** @deprecated Review modal uses log-update review actions */
export const TACTICAL_DEBRIEF_ACCEPT_SELECTED = "Save selected updates";

export const TACTICAL_DEBRIEF_SAVE_RECOMMENDED = "Save updates";

export {
  FIELD_INTELLIGENCE_PROCESSING_TITLE as TACTICAL_DEBRIEF_PROCESSING_HEADLINE,
  FIELD_INTELLIGENCE_PROCESSING_SUBTITLE as TACTICAL_DEBRIEF_PROCESSING_SUBTITLE,
  FIELD_INTELLIGENCE_PROCESSING_ROTATING_MESSAGES as TACTICAL_DEBRIEF_PROCESSING_MESSAGES,
} from "@/lib/surgical-sales/fieldIntelligenceProcessingUx";

export {
  TACTICAL_DEBRIEF_REVIEW_TITLE,
  TACTICAL_DEBRIEF_REVIEW_SUBTITLE,
} from "@/lib/surgical-sales/debriefApprovalUx";

export const TACTICAL_DEBRIEF_CANCEL_LABEL = "Cancel";

export const TACTICAL_DEBRIEF_SAVED_TOAST = "Outcome saved";
export const TACTICAL_DEBRIEF_SAVE_UPDATES_LABEL = "Save Selected Updates";
/** Primary debrief-review action that saves + finishes in one step. */
export const DEBRIEF_SAVE_LABEL = "Save";
export const TACTICAL_DEBRIEF_EDIT_DEBRIEF_LABEL = "Edit Debrief";

export const TACTICAL_DEBRIEF_DICTATE_LABEL = "Dictate";
export const TACTICAL_DEBRIEF_DICTATE_STOP_LABEL = "Stop";
export const TACTICAL_DEBRIEF_DICTATE_ACTIVE_HINT = "Listening — speak naturally";

export const TACTICAL_DEBRIEF_CAPTURE_PROMPTS: readonly string[] = [
  "Who did you meet?",
  "What mattered to them?",
  "What operational friction came up?",
  "What changed?",
  "What should happen before the next touch?",
];

/** @deprecated Internal section ids — use operational review sections in UI */
export const TACTICAL_DEBRIEF_SECTION_LABELS = {
  detected_signals: "Detected signals",
  operational_risks: "Operational risks",
  stakeholder_insights: "Stakeholder insights",
  workflow_intelligence: "Workflow intelligence",
  recommended_next_actions: "Recommended next actions",
  suggested_system_updates: "Suggested system updates",
} as const;

export type TacticalDebriefReviewSectionId = keyof typeof TACTICAL_DEBRIEF_SECTION_LABELS;

export const TACTICAL_DEBRIEF_SECTION_EMPTY: Partial<Record<TacticalDebriefReviewSectionId, string>> = {
  detected_signals: "No structured signals yet — add friction, workflow, or stakeholder detail.",
  operational_risks: "No deployment or access risks called out.",
  stakeholder_insights: "No new stakeholders mentioned.",
  workflow_intelligence: "No workflow or procedure signals yet.",
  recommended_next_actions: "No dated next step detected — add what should happen before the next touch.",
  suggested_system_updates: "Link a provider to propose profile field updates from this debrief.",
};

export type TacticalDebriefOperationalSectionId =
  | "confirmed"
  | "partial"
  | "worth_confirming"
  | "suggested_next_actions"
  | "where_this_updates";

export const TACTICAL_DEBRIEF_OPERATIONAL_SECTION_LABELS: Record<
  TacticalDebriefOperationalSectionId,
  string
> = {
  confirmed: "Suggested updates",
  partial: "Partially suggested updates",  worth_confirming: "Still worth confirming",
  suggested_next_actions: "Suggested next actions",
  where_this_updates: "This will improve",
};

export const TACTICAL_DEBRIEF_POST_TOUCH_KICKER = "Touch captured";

export const TACTICAL_DEBRIEF_CONFIRM_TITLE = "Outcome logged";
export const TACTICAL_DEBRIEF_CONFIRM_SUBTITLE =
  "The account moved forward — review what changed and pick your next move.";

export const TACTICAL_DEBRIEF_CONFIRM_RETURN_PROVIDER = "Return to provider";

export const TACTICAL_DEBRIEF_CONFIRM_VIEW_INTELLIGENCE = "View updated intelligence";

export const TACTICAL_DEBRIEF_CONFIRM_CONTINUE_DISCOVERY = "Continue discovery";

export const TACTICAL_DEBRIEF_CONFIRM_SCHEDULE_FOLLOW_UP = "Schedule follow-up";

export const TACTICAL_DEBRIEF_CONFIRM_ADD_TASK = "Add next task";

export const TACTICAL_DEBRIEF_CONFIRM_RETURN_ENGAGEMENT = "Engagement workspace";

/** @deprecated Post-touch flow no longer routes back into field briefing */
export const TACTICAL_DEBRIEF_CONFIRM_VIEW_BRIEFING = "Field briefing reference";

export const TACTICAL_DEBRIEF_PROPAGATION_SAVED_HEADING = "Updated successfully";
