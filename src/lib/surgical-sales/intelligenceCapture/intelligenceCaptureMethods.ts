/**

 * Intelligence capture methods — rep chooses how to enter field intelligence.

 * All methods normalize into category findings behind the scenes.

 */



import { REP_INTELLIGENCE_VOCAB } from "@/lib/surgical-sales/intelligenceCapture/repIntelligenceVocabulary";



export const INTELLIGENCE_CAPTURE_METHOD_IDS = ["guided_entry", "freeform_note"] as const;



/** Legacy ids from the previous 4-option picker — treated as freeform. */

export const LEGACY_INTELLIGENCE_CAPTURE_METHOD_IDS = [

  "quick_finding",

  "paste_notes",

  "dictation",

] as const;



export type IntelligenceCaptureMethodId = (typeof INTELLIGENCE_CAPTURE_METHOD_IDS)[number];



export type LegacyIntelligenceCaptureMethodId =

  (typeof LEGACY_INTELLIGENCE_CAPTURE_METHOD_IDS)[number];



export type IntelligenceCaptureMethodDef = {

  id: IntelligenceCaptureMethodId;

  name: string;

  description: string;

  hint: string;

};



export const INTELLIGENCE_CAPTURE_METHOD_DEFS: IntelligenceCaptureMethodDef[] = [

  {

    id: "guided_entry",

    name: "Guided",

    description: "Answer prompts for this area step by step.",

    hint: "Best when you want help remembering what to capture.",

  },

  {

    id: "freeform_note",

    name: "Note or Dictate",

    description: "Type, paste, or speak what you learned.",

    hint: "Best right after a call, email, or site visit.",

  },

];



/** Capture-first front door — rep writes first, platform proposes the area. */

export const INTELLIGENCE_CAPTURE_FIRST_UI = {

  title: REP_INTELLIGENCE_VOCAB.whatDidYouLearn,

  subtitle: "Type, paste, or dictate — we'll suggest where each finding belongs.",

  placeholder:
    "One line or many. Example: \"Observation approved for July. Karen owns his OR schedule. They're under contract with Arthrex.\"",

  reviewCta: "Review findings",

  reviewTitle: "Confirm where these go",

  reviewSubtitle: "Accept the suggested area, change it, or discard a finding.",

  backToCompose: "Edit notes",

  needsHomeTitle: "Couldn't place these",

  needsHomeHint: "Pick an area for each one you want to keep — nothing saves without one.",

  categorySelectLabel: "Area",

  categorySelectPlaceholder: "Choose an area…",

  discard: "Discard",

  restore: "Keep",

  saveCta: (count: number) => `Save ${count} finding${count === 1 ? "" : "s"}`,

  savingCta: "Saving findings…",

  savedSummary: (count: number, areas: number) =>
    `${count} finding${count === 1 ? "" : "s"} saved across ${areas} area${areas === 1 ? "" : "s"}.`,

  nothingToSave: "Nothing to save — keep at least one finding with an area.",

  emptyError: "Add what you learned before reviewing.",

  approvalDetected: "Reads as observation approval — access will be marked approved.",

  interestDetected: "Reads as observation interest — we'll track follow-up to confirm approval.",

  unplacedBadge: "Needs an area",

  browseAreasTitle: "Or browse by area",

  browseAreasSubtitle: "Open an area for guided prompts, or to review what's already captured.",

  saveFailed: "Could not save this finding — try again.",

} as const;



export const INTELLIGENCE_CAPTURE_FLOW_UI = {

  stepCategoryTitle: "Select category",

  stepCategorySubtitle: "Pick the area you learned something about.",

  stepMethodTitle: "Choose capture method",

  stepMethodSubtitle: "Guided prompts or free-form notes — pick what fits.",

  backToCategories: "All categories",

  backToMethods: "Change method",

  reviewArea: "Review this area",

  savedFindings: "findings saved",

  savingFindings: "Saving findings…",

  saveFindings: "Save findings",

  freeformPlaceholder:

    "Type, paste, or dictate what you learned. One line or many — we'll split it into separate findings.",

  bulkEmptyError: "Add what you learned before saving.",

  bulkSavedConfirmation: (count: number) =>

    `${count} finding${count === 1 ? "" : "s"} saved to this area.`,

} as const;



export function intelligenceCaptureMethodDef(

  methodId: IntelligenceCaptureMethodId,

): IntelligenceCaptureMethodDef {

  const def = INTELLIGENCE_CAPTURE_METHOD_DEFS.find((row) => row.id === methodId);

  if (!def) throw new Error(`Unknown capture method: ${methodId}`);

  return def;

}



export function normalizeIntelligenceCaptureMethodId(

  methodId: IntelligenceCaptureMethodId | LegacyIntelligenceCaptureMethodId | string | null,

): IntelligenceCaptureMethodId | null {

  if (!methodId) return null;

  if (methodId === "guided_entry" || methodId === "freeform_note") return methodId;

  if (

    methodId === "quick_finding" ||

    methodId === "paste_notes" ||

    methodId === "dictation"

  ) {

    return "freeform_note";

  }

  return null;

}


