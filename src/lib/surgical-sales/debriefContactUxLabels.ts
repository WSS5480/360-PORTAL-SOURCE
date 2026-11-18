/**
 * Contact review copy — leaf module (no imports) to avoid circular deps with
 * debriefDetectedContact ↔ debriefApprovalUx ↔ providerFieldIntelligenceModel.
 */

/** Rep-facing contact states — next action, not extraction mechanics. */
export const DEBRIEF_CONTACT_REQUIRES_DECISION = "Contact requires decision";
export const DEBRIEF_CONTACT_NOT_YET_ADDED = "Contact not yet added";
export const DEBRIEF_REVIEW_CONTACT_ACTION = "Review contact action";
export const DEBRIEF_WORKFLOW_PARTICIPANT_STATUS = DEBRIEF_CONTACT_REQUIRES_DECISION;
export const DEBRIEF_CONFIRMED_CONTACT_STATUS = "Confirmed Contact";

export const DEBRIEF_CONTACT_ADD_DETAILS = "Add phone / email";
export const DEBRIEF_CONTACT_LINK_EXISTING = "Link existing contact";
export const DEBRIEF_CONTACT_SKIP = "Skip for now";
export const DEBRIEF_WORKFLOW_PARTICIPANT_CREATE = "Review Contact";
export const DEBRIEF_WORKFLOW_PARTICIPANT_CONFIRM = "Confirm Contact";
export const DEBRIEF_WORKFLOW_PARTICIPANT_LINK = "Link Existing";
export const DEBRIEF_WORKFLOW_PARTICIPANT_IGNORE = "Dismiss";
export const DEBRIEF_SUGGESTED_CONTACT_STATUS = "Suggested Contact";
export const DEBRIEF_SUGGESTED_CONTACT_NEEDS_VERIFICATION = "Needs Verification";
