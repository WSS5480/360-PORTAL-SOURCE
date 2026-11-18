/** Intelligence review / log-update approval — operational assistant copy. */

import { formatDebriefOperationalSummary } from "@/lib/surgical-sales/debriefReviewDisplayLanguage";
import {
  INTELLIGENCE_REVIEW_TITLE,
  REVIEW_EXTRACTED_INTELLIGENCE_TITLE,
} from "@/lib/surgical-sales/logUpdateUx";
import {
  DEBRIEF_WORKFLOW_PARTICIPANT_CONFIRM,
  DEBRIEF_WORKFLOW_PARTICIPANT_CREATE,
} from "@/lib/surgical-sales/debriefContactUxLabels";

export { INTELLIGENCE_REVIEW_TITLE, REVIEW_EXTRACTED_INTELLIGENCE_TITLE };

export const DEBRIEF_APPROVAL_SECTION = {
  signalsDetected: "Signals detected",
  suggestedUpdates: "Suggested updates",
  stillMissing: "Still to confirm",
  saveUpdates: "Save Selected Updates",
} as const;

export {
  DEBRIEF_CONTACT_ADD_DETAILS,
  DEBRIEF_CONTACT_LINK_EXISTING,
  DEBRIEF_CONTACT_SKIP,
  DEBRIEF_WORKFLOW_PARTICIPANT_CREATE,
  DEBRIEF_WORKFLOW_PARTICIPANT_CONFIRM,
  DEBRIEF_WORKFLOW_PARTICIPANT_LINK,
  DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE,
  DEBRIEF_SUGGESTED_CONTACT_STATUS,
  DEBRIEF_SUGGESTED_CONTACT_NEEDS_VERIFICATION,
  DEBRIEF_CONTACT_REQUIRES_DECISION,
  DEBRIEF_CONTACT_NOT_YET_ADDED,
  DEBRIEF_REVIEW_CONTACT_ACTION,
  DEBRIEF_WORKFLOW_PARTICIPANT_STATUS,
  DEBRIEF_CONFIRMED_CONTACT_STATUS,
} from "@/lib/surgical-sales/debriefContactUxLabels";
export const DEBRIEF_REVIEW_SAVE_ACCESS_INTELLIGENCE = "Save Access Intelligence";
export const DEBRIEF_REVIEW_ADD_CLINICAL_INSIGHT = "Add Clinical Insight";
export const DEBRIEF_REVIEW_CREATE_TASK = "Create Task";
export const DEBRIEF_REVIEW_SAVE_INTELLIGENCE = "Save Intelligence";

export function debriefWorkflowContactActionLabel(input: {
  linkedContactId?: string | null;
  verificationStatus?: string | null;
}): string {
  if (input.linkedContactId?.trim()) {
    return input.verificationStatus === "suggested"
      ? DEBRIEF_WORKFLOW_PARTICIPANT_CONFIRM
      : DEBRIEF_WORKFLOW_PARTICIPANT_CREATE;
  }
  return DEBRIEF_WORKFLOW_PARTICIPANT_CREATE;
}
export const DEBRIEF_CONTACT_FORM_FIRST = "First name";
export const DEBRIEF_CONTACT_FORM_LAST = "Last name";
export const DEBRIEF_CONTACT_FORM_PHONE = "Mobile phone (optional)";
export const DEBRIEF_CONTACT_FORM_EMAIL = "Email (optional)";
export const DEBRIEF_CONTACT_FORM_NOTES = "Notes (optional)";
export const DEBRIEF_CONTACT_LINK_SEARCH = "Search contacts";

export const AI_DEBRIEF_REVIEW_SECTION = {
  intelligenceUpdates: "Updates",
  proposedContacts: "Contacts",
  platformMatches: "Vendor access",
  pathwayImpact: "Pathway impact",
  unresolved: "Still needs follow-up",
} as const;

export const AI_DEBRIEF_REVIEW_FOUND_USABLE = "usable updates";
export const AI_DEBRIEF_REVIEW_FOUND_FOLLOW_UP = "follow-up items";
export const AI_DEBRIEF_REVIEW_WE_FOUND = "We found:";
export const AI_DEBRIEF_REVIEW_AI_FOUND = "AI found:";
export const AI_DEBRIEF_REVIEW_KEY_INSIGHTS = "Key insights";
export const AI_DEBRIEF_REVIEW_CONFIRMED_UPDATES = "confirmed updates";
export const AI_DEBRIEF_REVIEW_PARTIAL_LEADS = "partial leads needing follow-up";
export const AI_DEBRIEF_REVIEW_UNRESOLVED_QUESTIONS = "unresolved questions";
export const AI_DEBRIEF_CONFLICT_MERGE = "Merge";
export const AI_DEBRIEF_CONFLICT_KEEP_EXISTING = "Keep existing";
export const AI_DEBRIEF_VIEW_ORIGINAL = "View original debrief";
export const AI_DEBRIEF_REVIEW_FOLLOW_UP_REQUIRED = "Required";
export const AI_DEBRIEF_REVIEW_FOLLOW_UP_HELPFUL = "Helpful";
export const AI_DEBRIEF_REVIEW_DETAILS_TOGGLE = "Review details";
export const AI_DEBRIEF_REVIEW_DETAILS_HIDE = "Hide details";
/** Primary CTA on Touch Captured approval modal. */
export const AI_DEBRIEF_REVIEW_SAVE_UPDATES = "Save Selected Updates";
/** @deprecated Use AI_DEBRIEF_REVIEW_SAVE_UPDATES */
export const AI_DEBRIEF_REVIEW_APPLY_ALL = AI_DEBRIEF_REVIEW_SAVE_UPDATES;
/** Opens the dedicated per-update review screen. */
export const AI_DEBRIEF_REVIEW_REVIEW_UPDATES = "Review Updates";
export const AI_DEBRIEF_REVIEW_UPDATES_TITLE = "Suggested Updates";
export const AI_DEBRIEF_VALIDATION_REVIEW_TITLE = "Debrief Validation & Next Step";
export const AI_DEBRIEF_VALIDATION_REVIEW_SUBTITLE =
  "Review what you learned, what changed, and the recommended next step.";

export function resolveDebriefReviewUpdatesTitle(isPostObservationProviderDebrief: boolean): string {
  return isPostObservationProviderDebrief
    ? AI_DEBRIEF_VALIDATION_REVIEW_TITLE
    : AI_DEBRIEF_REVIEW_UPDATES_TITLE;
}

export const AI_DEBRIEF_REVIEW_UPDATES_SUBTITLE =
  "Checked items will update the provider record. Unchecked items will be ignored.";
export const DEBRIEF_CRM_REVIEW_COL_INTELLIGENCE_FOUND = "Intelligence found";
export const DEBRIEF_CRM_REVIEW_COL_SAVE_TO = "Save to";
export const DEBRIEF_CRM_REVIEW_COL_EVIDENCE = "Evidence";
export const DEBRIEF_CRM_REVIEW_COL_ACTIONS = "Actions";
export const DEBRIEF_CRM_APPROVE = "Approve";
export const DEBRIEF_CRM_DISMISS = "Dismiss";
/** @deprecated Narrative approval header — use Review Updates + subtitle in structured review. */
export const DEBRIEF_REVIEW_HEADER_TOUCH_CAPTURED = "Touch Captured";
export const DEBRIEF_REVIEW_SECTION_INTELLIGENCE_CAPTURED = "Intelligence Captured";
export const DEBRIEF_REVIEW_SECTION_RECOMMENDED_ACTIONS = "Recommended Actions";
export const DEBRIEF_REVIEW_SECTION_ACTIONABLE = "Updates to save";
export const DEBRIEF_REVIEW_APPROVAL_ITEMS_HINT = (count: number) =>
  `${count} item${count === 1 ? "" : "s"} to confirm`;
/** @deprecated Use DEBRIEF_REVIEW_SAVE_ACCESS_INTELLIGENCE */
export const DEBRIEF_REVIEW_UPDATE_ACCESS_STATUS = DEBRIEF_REVIEW_SAVE_ACCESS_INTELLIGENCE;
/** @deprecated Use DEBRIEF_REVIEW_ADD_CLINICAL_INSIGHT */
export const DEBRIEF_REVIEW_ADD_CLINICAL_FOCUS = DEBRIEF_REVIEW_ADD_CLINICAL_INSIGHT;
/** @deprecated Use DEBRIEF_REVIEW_SAVE_INTELLIGENCE */
export const DEBRIEF_REVIEW_ADD_ORG_INTELLIGENCE = DEBRIEF_REVIEW_SAVE_INTELLIGENCE;
/** @deprecated Use DEBRIEF_REVIEW_CREATE_TASK */
export const DEBRIEF_REVIEW_CREATE_FOLLOW_UP = DEBRIEF_REVIEW_CREATE_TASK;
export const DEBRIEF_WORKFLOW_CONTACT_ACTION_TITLE = "Create workflow contact?";
export const AI_DEBRIEF_REVIEW_BACK_TO_APPROVAL = "Back";
export const AI_DEBRIEF_REVIEW_DISCARD = "Discard";
export const AI_DEBRIEF_REVIEW_SOURCE_QUOTE = "Source quote";
export const AI_DEBRIEF_REVIEW_INCLUDED = "Included";
export const AI_DEBRIEF_REVIEW_CONFIRM = "Confirm";
export const AI_DEBRIEF_REVIEW_IGNORE = "Ignore";
export const AI_DEBRIEF_REVIEW_ACCEPT = "Accept";
export const AI_DEBRIEF_REVIEW_SKIP = "Skip";
export const AI_DEBRIEF_REVIEW_ACCEPTED = "Accepted";
export const AI_DEBRIEF_REVIEW_IGNORED = "Skipped";
export const AI_DEBRIEF_REVIEW_UNDO = "Undo";
export const AI_DEBRIEF_REVIEW_NEEDS_REVIEW = "Needs review";
export const AI_DEBRIEF_REVIEW_EDITED = "Edited";
export const DEBRIEF_UPDATES_SAVED_TOAST = "Debrief saved";
export const AI_DEBRIEF_REVIEW_ADD_CONTACT = "Add contact";
export const AI_DEBRIEF_REVIEW_CREATE_WORKFLOW_CONTACT = "Create workflow contact";
export const AI_DEBRIEF_REVIEW_EDIT = "Edit";

export const DEBRIEF_APPROVAL_SELECTION_HINT =
  "Key updates are already selected — save when ready.";

export const TACTICAL_DEBRIEF_REVIEW_TITLE = "Fast operator review";

/** Shown in sheet chrome; the in-panel header carries context. */
export const TACTICAL_DEBRIEF_REVIEW_SUBTITLE =
  "Choose structured updates to save.";

export const AI_DEBRIEF_ORIGINAL_NOTE_LABEL = "Original debrief note";
export const AI_DEBRIEF_ORIGINAL_NOTE_SAVED_ENGAGEMENT = "Saved to this engagement";
export const AI_DEBRIEF_ORIGINAL_NOTE_SAVED_PROVIDER = "Saved to this provider record";
export const AI_DEBRIEF_ORIGINAL_NOTE_SAVED_DEFAULT = "Saved with this update";
export const AI_DEBRIEF_ORIGINAL_NOTE_SHOW = "Show original note";
export const AI_DEBRIEF_ORIGINAL_NOTE_HIDE = "Hide original note";

export function originalDebriefSavedSubtext(input: {
  engagementId?: string | null;
  providerId?: string | null;
}): string {
  if (input.engagementId) return AI_DEBRIEF_ORIGINAL_NOTE_SAVED_ENGAGEMENT;
  if (input.providerId) return AI_DEBRIEF_ORIGINAL_NOTE_SAVED_PROVIDER;
  return AI_DEBRIEF_ORIGINAL_NOTE_SAVED_DEFAULT;
}

export type DebriefReviewFoundBreakdown = {
  signalsCount: number;
  validationCount: number;
  dependenciesCount: number;
};

export function formatDebriefReviewFoundSummary(
  breakdown: DebriefReviewFoundBreakdown,
): { headline: string; detailLine: string } {
  return formatDebriefOperationalSummary(breakdown);
}

/** @deprecated Use formatDebriefReviewFoundSummary with breakdown counts. */
export function formatDebriefReviewFoundSummaryLegacy(counts: {
  usableUpdates: number;
  followUpItems: number;
}): { usableLine: string; followUpLine: string } {
  const usable = counts.usableUpdates;
  const followUp = counts.followUpItems;
  return {
    usableLine: `We found ${usable} usable update${usable === 1 ? "" : "s"}`,
    followUpLine: `${followUp} follow-up item${followUp === 1 ? "" : "s"}`,
  };
}
