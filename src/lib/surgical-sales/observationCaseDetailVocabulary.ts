import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";
import type { OperationalVisibilityState } from "@/lib/surgical-sales/operationalVisibilityVocabulary";

export const OBSERVATION_LIVE_NOTES_PHI_REMINDER = "No PHI: do not enter patient identifiers.";

/** Observation cases capture OR notes on Briefing / Field Notes — not header Log update (RIE). */
export const OBSERVATION_CASE_OR_NOTE_CAPTURE_HINT =
  "Dictate field notes on the Briefing or Field Notes tab — not Log update.";

export const OBSERVATION_QUICK_NOTE_AI_HINT =
  "Speak or type freely — AI organizes workflow, product, competitor, and follow-up signals from your notes.";

export const OBSERVATION_EXECUTE_AI_HINT =
  "Speak or type naturally — AI extracts workflow, product, competitor, and clinical signals after each note.";

/** Optional manual tags — not the primary capture path. */
export const OBSERVATION_LIVE_NOTE_QUICK_TAGS = [
  "Workflow",
  "Product",
  "Competitor",
  "Surgeon Comment",
  "Staff Comment",
  "Follow Up",
] as const;

export type ObservationLiveNoteQuickTag = (typeof OBSERVATION_LIVE_NOTE_QUICK_TAGS)[number];

/** @deprecated Use OBSERVATION_LIVE_NOTE_QUICK_TAGS */
export const OBSERVATION_LIVE_NOTE_QUICK_CHIPS = OBSERVATION_LIVE_NOTE_QUICK_TAGS;

export const OBSERVATION_PRE_CASE_BRIEF_TITLE = "Pre-Case Brief";

export const OBSERVATION_MISSION_BRIEFING_TITLE = "Observation Brief";

export const OBSERVATION_MISSION_BRIEFING_LEAD =
  "Field mission briefing — why you are here and what to watch for.";

export const OBSERVATION_MISSION_BRIEFING_LABELS = {
  whyHere: "Assess product fit during this procedure.",
  whyHereEmpty: "Assess product fit during this procedure.",
  watchSignals: "Watch for products, competitors, workflow issues, and frustrations.",
  watchSignalsEmpty: "Watch for products, competitors, workflow issues, and frustrations.",
  stillToLearn: "Capture observation questions this case should answer.",
  stillToLearnEmpty: "Capture observation questions this case should answer.",
  opportunities: "Product fit hypotheses from discovery intelligence.",
  opportunitiesEmpty: "Product fit hypotheses from discovery intelligence.",
  afterObservation: "Plan debrief and follow-up after the observation.",
  afterObservationEmpty: "Plan debrief and follow-up after the observation.",
} as const;

export const OBSERVATION_MISSION_BRIEFING_SECTION_LABELS = {
  whyHere: "Mission",
  watchSignals: "Watch For",
  stillToLearn: "Observation Questions",
  opportunities: "Product Fit Hypotheses",
  afterObservation: "Debrief Planning",
} as const;

export const OBSERVATION_BRIEFING_WORKFLOW_KICKER = "Observe → Capture Notes";

export const OBSERVATION_BRIEFING_DICTATION_LEAD = "Tap Start Dictation — notes save automatically.";

export const OBSERVATION_BRIEFING_DICTATION_HINT = "Saved notes appear in Field Notes and Intelligence.";

export const OBSERVATION_DEBRIEF_PLANNING_EMPTY = "No debrief planned.";

export const OBSERVATION_DEBRIEF_PLANNING_TOPICS_HEADING = "Recommended discussion topics";

export const OBSERVATION_DETAIL_SECTION_LABELS = {
  caseSummary: "Case Summary",
  lookingFor: "What Am I Looking For Today?",
  lookingForToday: "What to watch for today",
  dictation: "Dictation",
  thingsLearned: "Things Learned",
  thingsLearnedSoFar: "Things learned so far",
  thingsLearnedLead: "Key takeaways captured from your notes.",
  thingsLearnedEmpty: "Nothing learned yet — capture a note to start.",
  observationFocus: "What am I looking for today?",
  observationFocusLead: "Suggested focus from provider intelligence, prior observations, and debriefs.",
  todaysFocus: "Today's focus",
  startObservation: "Start Observation",
  continueObservation: "Continue Observation",
  viewFindings: "View Findings",
  viewIntelligence: "View Intelligence",
  completeObservation: "Complete Observation",
  planDebrief: "Plan Debrief",
  observationComplete: "Observation Complete",
  notesCaptured: "Notes captured",
  intelligenceIdentified: "Intelligence identified",
  dictateNotes: "Dictate notes",
  dictateNotesLead: "Speak or type — notes are saved and organized automatically.",
  debriefSummary: "Debrief summary",
  providerIntelligenceSnapshot: "Provider intelligence snapshot",
  noteLog: "Notes",
  fieldNotes: "Dictation",
  mission: "Mission",
  observationMission: "Observation Mission",
  briefing: "Observation Briefing",
  questionsToAnswer: "Questions To Answer",
  captureNotes: "Field Notes",
  signalsCaptured: "Intelligence Captured",
  missionProgress: "Observation Progress Tracker",
  opportunitySignals: "Product Fit Signals",
  debriefPlanner: "Debrief Planning",
  afterObservation: "After the Observation",
  objectives: "Observation Objective",
  learningNeeds: "What We Need to Learn",
  timeline: "Observation Timeline",
  feed: "Signal Log",
  debriefReadiness: "Debrief Readiness",
  intelligenceSnapshot: "Intelligence Snapshot",
  intelligenceSummary: "Intelligence Summary",
  evidenceSources: "Evidence sources",
  accessHistory: "Observation Access History",
  accessSummary: "Access Summary",
  relatedRequest: "Related Observation Request",
} as const;

export const OBSERVATION_ACCESS_HISTORY_LEAD =
  "Scheduling, credentialing, and access pathway details — kept here for reference, not primary case workflow.";

export const OBSERVATION_ACCESS_SUMMARY_LEAD =
  "Observation Request answers whether you can get into the OR. These access details stay available for reference but do not drive the field mission briefing.";

export const OBSERVATION_OBJECTIVE_EMPTY_HINTS = [
  "Understand fixation workflow",
  "Evaluate visualization challenges",
  "Assess product fit",
  "Observe procedural inefficiencies",
  "Identify competitor weaknesses",
] as const;

export const OBSERVATION_LEARNING_EMPTY_HINTS = [
  "What products are currently used?",
  "What frustrations occur during the procedure?",
  "What workarounds are being used?",
  "What outcomes matter most to the provider?",
  "What staff concerns are observed?",
] as const;

export const OBSERVATION_NOT_CAPTURED = "Not yet observed in the field";

export function isObservationOverviewPlaceholderValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed === OBSERVATION_NOT_CAPTURED) return true;
  if (/^not captured/i.test(trimmed)) return true;
  if (trimmed === "Still open for this case") return true;
  return false;
}

export const OBSERVATION_CASE_READINESS_LABELS: Record<OperationalVisibilityState, string> = {
  early: "Needs confirmation",
  developing: "Partial",
  strong: "Known",
  validated: "Ready",
};

export type ObservationWorkflowRepStatus =
  | typeof OBSERVATION_NOT_CAPTURED
  | "Needs confirmation"
  | "Known";

const WORKFLOW_STAGE_REP_STATUS: Record<
  "Not started" | "In progress" | "Completed",
  ObservationWorkflowRepStatus
> = {
  "Not started": OBSERVATION_NOT_CAPTURED,
  "In progress": "Needs confirmation",
  Completed: "Known",
};

export function observationCaseReadinessLabel(state: OperationalVisibilityState): string {
  return OBSERVATION_CASE_READINESS_LABELS[state];
}

export function observationCaseReadinessSummary(state: OperationalVisibilityState): string {
  if (state === "strong" || state === "validated") {
    return "Enough context to walk in — confirm details on arrival.";
  }
  if (state === "developing") {
    return "Some context on file — confirm learning objectives before the case.";
  }
  return "Set observation objectives and learning questions before case day.";
}

export function observationWorkflowRepStatus(
  status: "Not started" | "In progress" | "Completed",
): ObservationWorkflowRepStatus {
  return WORKFLOW_STAGE_REP_STATUS[status];
}

export function formatObservationCaseOperationalContext(
  context: CaseOperationalContextView,
): CaseOperationalContextView {
  const observationDimensionIds = new Set(["facility_logistics", "provider_preferences"]);
  const dimensions = context.dimensions
    .filter((dimension) => observationDimensionIds.has(dimension.id))
    .map((dimension) => ({
      ...dimension,
      statusLabel: observationCaseReadinessLabel(dimension.status),
      line:
        dimension.line === "Still open for this case" ? OBSERVATION_NOT_CAPTURED : dimension.line,
    }));

  const mapItems = (items: CaseOperationalContextView["facility"]["items"]) =>
    items
      .map((item) => ({
        ...item,
        value: item.value === "Still open for this case" ? OBSERVATION_NOT_CAPTURED : item.value,
      }))
      .filter((item) => !isObservationOverviewPlaceholderValue(item.value));

  const readyCount = dimensions.filter(
    (dimension) => dimension.status === "strong" || dimension.status === "validated",
  ).length;

  let readinessState: OperationalVisibilityState = "early";
  if (readyCount >= 2) readinessState = "strong";
  else if (readyCount >= 1) readinessState = "developing";

  return {
    ...context,
    readinessState,
    readinessLabel: observationCaseReadinessLabel(readinessState),
    readinessSummary: observationCaseReadinessSummary(readinessState),
    readyCount,
    dimensionTotal: dimensions.length,
    dimensions,
    facility: {
      ...context.facility,
      items: mapItems(context.facility.items),
    },
    provider: {
      ...context.provider,
      items: mapItems(context.provider.items),
    },
    caseDay: {
      title: context.caseDay.title,
      items: [],
    },
  };
}
