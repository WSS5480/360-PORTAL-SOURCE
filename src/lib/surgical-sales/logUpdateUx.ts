import { AI_NOTE_DESTINATION_LABELS } from "@/lib/surgical-sales/aiNoteCapture/labels";

import type {

  AiNoteCaptureContext,

  AiNoteCaptureExtractedSuggestion,

  AiNoteCaptureReviewItem,

} from "@/lib/surgical-sales/aiNoteCapture/types";

import type { AiNoteCaptureMergeStrategy } from "@/lib/surgical-sales/aiNoteCapture/workflowTargets";

import { sectionLabel } from "@/lib/surgical-sales/aiNoteCapture/workflowTargets";



/** Compose step */

export const LOG_UPDATE_COMPOSE_TITLE = "Field note";

export const LOG_UPDATE_COMPOSE_LEAD =
  "Dictate or type what you learned. We'll show suggested updates before saving.";

export const LOG_UPDATE_PHI_BANNER =
  "No PHI: do not capture patient names, DOBs, MRNs, images, labels, charts, or consent forms.";

export const LOG_UPDATE_PHI_ACK =
  "I confirm this update contains no PHI.";

/** @deprecated Use LOG_UPDATE_PHI_ACK */
export const LOG_UPDATE_HIPAA_ACK = LOG_UPDATE_PHI_ACK;

export const LOG_UPDATE_TEXTAREA_PLACEHOLDER =
  "Who you spoke with, what changed, and what to do next.";

export const LOG_UPDATE_MORE_CAPTURE_OPTIONS = "More capture options";

export const LOG_UPDATE_VOICE_START = "Dictate";
export const LOG_UPDATE_VOICE_LISTENING = "Listening";
export const LOG_UPDATE_VOICE_PAUSED = "Paused";
export const LOG_UPDATE_VOICE_PAUSE = "Pause";
export const LOG_UPDATE_VOICE_RESUME = "Resume";
export const LOG_UPDATE_VOICE_CLEAR = "Clear";
export const LOG_UPDATE_VOICE_TRANSCRIBING = "Transcribing";
export const LOG_UPDATE_VOICE_IDLE = "Tap Dictate to capture by voice";
export const LOG_UPDATE_VOICE_UNAVAILABLE =
  "Voice capture is not available in this browser. Type your note instead.";

export const LOG_UPDATE_VOICE_RECORDING =
  "Recording — speak clearly, then tap Stop.";

export const LOG_UPDATE_VOICE_STOP = "Stop";
export const LOG_UPDATE_DICTATION_CAPTURED = "Added to note";

/** @deprecated Use FieldIntelligenceProcessingPanel — kept for legacy imports */
export { FIELD_INTELLIGENCE_PROCESSING_TITLE as LOG_UPDATE_PROCESSING_MESSAGE } from "@/lib/surgical-sales/fieldIntelligenceProcessingUx";



/** Review step */

/** Rep-facing title for structured extraction review (all capture surfaces). */
export const REVIEW_EXTRACTED_INTELLIGENCE_TITLE = "Review Extracted Intelligence";

/** @deprecated Use REVIEW_EXTRACTED_INTELLIGENCE_TITLE */
export const INTELLIGENCE_REVIEW_TITLE = REVIEW_EXTRACTED_INTELLIGENCE_TITLE;

/** @deprecated Use REVIEW_EXTRACTED_INTELLIGENCE_TITLE */
export const LOG_UPDATE_REVIEW_TITLE = REVIEW_EXTRACTED_INTELLIGENCE_TITLE;

export const LOG_UPDATE_REVIEW_SUBTITLE =
  "AI found possible updates from your note. Review what should update the provider record.";

export const LOG_UPDATE_REVIEW_SELECTION_HINT =
  "Checked items will update the provider record. Unchecked items will be ignored.";

export const LOG_UPDATE_QUICK_CAPTURE_ACTION = "Quick Capture";

export const LOG_UPDATE_QUICK_CAPTURE_SUCCESS = "Field note saved";

export function logUpdateQuickCaptureSuccessDetail(suggestionCount: number): string {
  if (suggestionCount <= 0) return "Field note saved. Intelligence is updating in the background.";
  const noun = suggestionCount === 1 ? "intelligence update" : "intelligence updates";
  return `Field note saved. ${suggestionCount} ${noun} applied in the background.`;
}

export const LOG_UPDATE_REVIEW_SECTION_RECOMMENDED = "Save updates";

export const LOG_UPDATE_REVIEW_SECTION_NEEDS_REVIEW = "Needs review";

/** @deprecated Use LOG_UPDATE_REVIEW_SELECTION_HINT — legacy non-structured review only */
export const LOG_UPDATE_REVIEW_LEGACY_SELECTION_HINT =
  "Check what to write to the profile. Signals and status lines are read-only detections from your note.";

export const LOG_UPDATE_REVIEW_SECTION_VALIDATION = "Still to validate";

export const LOG_UPDATE_REVIEW_SECTION_NEXT_MOVES = "Suggested next moves";

export const LOG_UPDATE_REVIEW_SECTION_RAW_DEBRIEF = "Raw debrief";

export const LOG_UPDATE_RAW_DEBRIEF_ENGAGEMENT =
  "Raw debrief will be saved to this engagement.";

export const LOG_UPDATE_RAW_DEBRIEF_PROVIDER =
  "Raw debrief will be saved to this provider record.";

export const LOG_UPDATE_RAW_DEBRIEF_DEFAULT =
  "Raw debrief will be saved with this update.";

export const LOG_UPDATE_SAVE_RECOMMENDED_ACTION = "Save recommended updates";

export const LOG_UPDATE_EDIT_DEBRIEF_ACTION = "Edit note";

export const LOG_UPDATE_REVIEW_SECTION_LEARNED = "What we learned";

export const LOG_UPDATE_REVIEW_SECTION_CHANGES = "What this changes";

export const LOG_UPDATE_REVIEW_SECTION_CONFIRMED = "Suggested updates";

export const LOG_UPDATE_REVIEW_SECTION_PARTIAL = "Partially confirmed";

export const LOG_UPDATE_REVIEW_SECTION_RELATED = "Related operational areas";

export const LOG_UPDATE_REVIEW_SECTION_MISSING = "Still to validate";

export const LOG_UPDATE_REVIEW_SECTION_NEXT_ACTIONS = "Recommended next moves";

export const LOG_UPDATE_REVIEW_SECTION_ANALYSIS_META = "Analysis confidence";

export const LOG_UPDATE_REVIEW_SECTION_DO_NOT_UPDATE = "Not saved (uncertain)";

export const LOG_UPDATE_REVIEW_SECTION_FIELD_EDITS = "Review field updates";

export const LOG_UPDATE_MAPPING_UNAVAILABLE =
  "AI mapping unavailable. Save as plain debrief only?";

export const LOG_UPDATE_FALLBACK_SAVE_NOTE = "Save note only";

export const LOG_UPDATE_FALLBACK_TRY_AGAIN = "Try again";

/** @deprecated Review modal no longer uses accept-all / accept-selected wording */
export const LOG_UPDATE_ACCEPT_ALL = "Accept all";

/** @deprecated Review modal no longer uses accept-all / accept-selected wording */
export const LOG_UPDATE_ACCEPT_SELECTED = "Accept selected";

/** @deprecated Use LOG_UPDATE_REVIEW_SECTION_MISSING */
export const LOG_UPDATE_REVIEW_SECTION_STILL_MISSING = LOG_UPDATE_REVIEW_SECTION_MISSING;

export const LOG_UPDATE_REVIEW_SECTION_NOTE = "Add as note";

import {
  INTELLIGENCE_PROPAGATION_HEADING,
  INTELLIGENCE_PROPAGATION_SUBTITLE,
} from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureUx";

export const LOG_UPDATE_PROPAGATION_HEADING = INTELLIGENCE_PROPAGATION_HEADING;

export const LOG_UPDATE_PROPAGATION_SAVED_HEADING = "Updated successfully";

export const LOG_UPDATE_REVIEW_PHI_HEADING = "Patient info may be in this note.";

export const LOG_UPDATE_REVIEW_PHI_BODY = "Review before saving. Do not store patient identifiers.";



/** Actions */

/** Set to true when log-update capture UI is ready for reps. */
export const LOG_UPDATE_UI_ENABLED = false;

export const LOG_UPDATE_BUTTON_LABEL = "Log update";

export const LOG_UPDATE_REVIEW_ACTION = "Review Updates";

export const LOG_UPDATE_SAVE_ACTION = "Save updates";

export const LOG_UPDATE_EDIT_TEXT_ACTION = "Edit note";

export const LOG_UPDATE_TOAST_SAVED = "Update saved";

export const LOG_UPDATE_DONE_TITLE = "Update saved";



/** Field conflicts (only shown when values differ) */

export const LOG_UPDATE_CONFLICT_GROUP_LABEL = "Already on file";

export const LOG_UPDATE_CONFLICT_EXISTING = "On file:";

export const LOG_UPDATE_CONFLICT_NEW = "From your note:";

export const LOG_UPDATE_CONFLICT_REPLACE = "Replace";

export const LOG_UPDATE_CONFLICT_KEEP_BOTH = "Keep both";



/** Errors & validation */

export const LOG_UPDATE_ERR_EMPTY_NOTE = "Add what you learned before continuing.";

/** Turn log-update API error payloads (string or Zod flatten) into user-facing text. */
export function formatLogUpdateApiError(error: unknown): string {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const formErrors = record.formErrors;
    if (Array.isArray(formErrors) && formErrors.length > 0) {
      return String(formErrors[0]);
    }
    const fieldErrors = record.fieldErrors;
    if (fieldErrors && typeof fieldErrors === "object") {
      for (const [key, messages] of Object.entries(fieldErrors as Record<string, unknown>)) {
        if (Array.isArray(messages) && messages.length > 0) {
          return `${key}: ${String(messages[0])}`;
        }
      }
    }
  }
  return "Save failed";
}

export const LOG_UPDATE_ERR_NOTHING_TO_SAVE = "Nothing to save — go back and add your note.";

export const LOG_UPDATE_ERR_UNRESOLVED_CONFLICT =

  "Choose Replace or Keep both for fields that already have info.";

export const LOG_UPDATE_ERR_SELECT_ONE = "Select at least one update to save, or cancel.";

export const LOG_UPDATE_ERR_NO_TARGET = "Open Log update from a provider, case, or facility to save here.";

export const LOG_UPDATE_ERR_PHI_BEFORE_SAVE = "Review the patient-info warning before saving.";

export const LOG_UPDATE_ERR_HIPAA_ACK = "Confirm the reminder above before continuing.";



export function logUpdateSelectedCountLabel(count: number): string {

  return `${count} update${count === 1 ? "" : "s"} selected`;

}



/** @deprecated Use LOG_UPDATE_REVIEW_SECTION_CHANGES */

export const LOG_UPDATE_REVIEW_SECTION_UPDATES = LOG_UPDATE_REVIEW_SECTION_CHANGES;



export function resolveAutoMergeStrategy(

  s: AiNoteCaptureExtractedSuggestion,

): AiNoteCaptureMergeStrategy {

  const fromTarget = s.workflowTarget?.mergeStrategy;

  if (fromTarget && fromTarget !== "needs_review") return fromTarget;

  const existing = (s.existingFieldValue ?? "").trim();

  if (!existing) return "append";

  return "append";

}



export function hasMergeConflict(item: AiNoteCaptureReviewItem): boolean {

  if (item.mergeStrategy === "needs_review") return true;

  const existing = (item.existingFieldValue ?? "").trim();

  if (!existing) return false;

  return item.mergeStrategy === "replace";

}



export function canAutoAcceptSuggestion(

  s: AiNoteCaptureExtractedSuggestion,

  ctx: AiNoteCaptureContext,

): boolean {

  if (s.needsUserReview || s.category === "unclassified" || s.destination === "unclassified") {

    return false;

  }

  if (s.workflowTarget && ctx.providerId) return true;

  if (s.destination === "provider" && ctx.providerId) return true;

  if ((s.destination === "case" || s.destination === "product") && ctx.caseId) return true;

  if ((s.destination === "opportunity" || s.destination === "task") && ctx.opportunityId) return true;

  if (s.destination === "organization" && ctx.organizationId) return true;

  if (s.destinationRecordId || s.suggestedRecordId) return true;

  return false;

}



export function toLogUpdateReviewItem(

  s: AiNoteCaptureExtractedSuggestion,

  ctx: AiNoteCaptureContext,

): AiNoteCaptureReviewItem {

  const mergeStrategy = resolveAutoMergeStrategy(s);

  return {

    ...s,

    status: canAutoAcceptSuggestion(s, ctx) ? "accepted" : "pending",

    editedText: s.cleanedText,

    mergeStrategy,

  };

}



export function friendlyPlacementLabel(item: AiNoteCaptureReviewItem): string {

  const wt = item.workflowTarget;

  if (wt) {

    return `${sectionLabel(wt.section)} · ${wt.fieldLabel}`;

  }

  const target = item.destinationRecordLabel || item.suggestedRecordLabel;

  if (target) return target;

  return AI_NOTE_DESTINATION_LABELS[item.destination] ?? "Update";

}



export function normalizeItemsBeforeSave(items: AiNoteCaptureReviewItem[]): AiNoteCaptureReviewItem[] {

  return items.map((item) => {

    if (item.mergeStrategy !== "needs_review") return item;

    const existing = (item.existingFieldValue ?? "").trim();

    if (!existing) return { ...item, mergeStrategy: "append" };

    return { ...item, mergeStrategy: "append" };

  });

}


