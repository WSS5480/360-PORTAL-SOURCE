import {

  buildObservationIntelligenceView,

  hasObservationIntelligenceContent,

} from "@/lib/surgical-sales/buildObservationIntelligenceView";

import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";

import {

  observationObjectivesFromCaseRow,

  splitDelimitedObjectiveLines,

} from "@/lib/surgical-sales/observationObjectives";

import {

  buildObservationBriefingEffectiveContent,

  resolveObservationBriefingPillarStatus,

} from "@/lib/surgical-sales/observationBriefingDefaults";

import { filterObservationMissionLines } from "@/lib/surgical-sales/observationBriefingScope";

import {

  OBSERVATION_MISSION_BRIEFING_LABELS,

  OBSERVATION_MISSION_BRIEFING_SECTION_LABELS,

} from "@/lib/surgical-sales/observationCaseDetailVocabulary";

import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";

import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";



export const OBSERVATION_MISSION_BRIEFING_MAX = 5;



export type ObservationMissionBriefingPillarId =

  | "why_here"

  | "watch_signals"

  | "still_to_learn"

  | "opportunities"

  | "after_observation";



export type ObservationMissionBriefingPillarStatus =

  | "needs_input"

  | "prefilled"

  | "review"

  | "ready"

  | "in_progress"

  | "complete";



export type ObservationMissionBriefingPillar = {

  id: ObservationMissionBriefingPillarId;

  question: string;

  items: string[];

  emptyHint: string;

  status: ObservationMissionBriefingPillarStatus;

};



export type ObservationMissionBriefingView = {

  missionLead: string | null;

  pillars: ObservationMissionBriefingPillar[];

  hasCapturedIntelligence: boolean;

  capturedSignalCount: number;

};



function takeUnique(values: string[], max: number): string[] {

  const seen = new Set<string>();

  const result: string[] = [];

  for (const value of values) {

    const trimmed = value.trim();

    if (!trimmed) continue;

    const key = trimmed.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);

    result.push(trimmed);

    if (result.length >= max) break;

  }

  return result;

}



function validationWatchSignals(raw: unknown): string[] {

  if (!Array.isArray(raw)) return [];

  const signals: string[] = [];

  for (const entry of raw) {

    if (!entry || typeof entry !== "object") continue;

    const row = entry as Record<string, unknown>;

    if (String(row.status ?? "planned") !== "planned") continue;

    const label = String(row.label ?? "").trim();

    if (label) signals.push(label);

  }

  return signals;

}



function buildSavedWatchSignals(caseRow: Record<string, unknown>): string[] {

  const objectives = observationObjectivesFromCaseRow(caseRow);

  return takeUnique(

    filterObservationMissionLines([

      ...splitDelimitedObjectiveLines(objectives.observation_signals_to_validate),

      ...validationWatchSignals(caseRow.observation_validation_targets).map((label) => `Watch: ${label}`),

    ]),

    OBSERVATION_MISSION_BRIEFING_MAX,

  );

}



function buildOpportunityCapturedItems(caseRow: Record<string, unknown>): string[] {

  const intelligence = buildObservationIntelligenceView(caseRow);

  const byId = Object.fromEntries(intelligence.categories.map((category) => [category.id, category.items]));

  return takeUnique(

    [...(byId.product_fit_signals ?? []), ...(byId.growth_opportunities ?? [])],

    OBSERVATION_MISSION_BRIEFING_MAX,

  );

}



export function buildObservationMissionBriefing(input: {

  caseRow: Record<string, unknown>;

  identity?: CaseIdentity;

  engagement?: Record<string, unknown> | null;

  activities?: Array<{ activity_type?: string }>;

  providerContact?: Record<string, unknown> | null;

  providerIntelligence?: ProviderIntelligenceSnapshot | null;

  planning?: ProviderPlanningCompletion | null;

  procedureLabel?: string | null;

}): ObservationMissionBriefingView {

  const effective = buildObservationBriefingEffectiveContent({

    caseRow: input.caseRow,

    engagement: input.engagement,

    providerContact: input.providerContact,

    providerIntelligence: input.providerIntelligence,

    planning: input.planning,

    procedureLabel:
      input.procedureLabel ??
      input.identity?.procedureType ??
      (String(input.caseRow.procedure_type ?? "").trim() || null),

  });



  const hasCapturedIntelligence = hasObservationIntelligenceContent(input.caseRow);

  const intelligence = buildObservationIntelligenceView(input.caseRow);

  const capturedSignalCount = intelligence.categories.reduce(

    (sum, category) => sum + category.items.length,

    0,

  );



  const savedWatchSignals = buildSavedWatchSignals(input.caseRow);
  const watchItems = savedWatchSignals.length > 0 ? savedWatchSignals : effective.watchSignals;
  const capturedOpportunities = buildOpportunityCapturedItems(input.caseRow);

  const whyItems = takeUnique([effective.whyHere], OBSERVATION_MISSION_BRIEFING_MAX);
  const learningItems = takeUnique(effective.learningQuestions, OBSERVATION_MISSION_BRIEFING_MAX);



  const pillars: ObservationMissionBriefingPillar[] = [
    {
      id: "why_here",
      question: OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.whyHere,
      items: whyItems,
      emptyHint: OBSERVATION_MISSION_BRIEFING_LABELS.whyHereEmpty,
      status: resolveObservationBriefingPillarStatus({
        pillarId: "why_here",
        source: effective.sources.why_here,
      }),
    },
    {
      id: "watch_signals",
      question: OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.watchSignals,
      items: takeUnique(watchItems, OBSERVATION_MISSION_BRIEFING_MAX),
      emptyHint: OBSERVATION_MISSION_BRIEFING_LABELS.watchSignalsEmpty,
      status: resolveObservationBriefingPillarStatus({
        pillarId: "watch_signals",
        source: effective.sources.watch_signals,
      }),
    },
    {
      id: "still_to_learn",
      question: OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.stillToLearn,
      items: learningItems,
      emptyHint: OBSERVATION_MISSION_BRIEFING_LABELS.stillToLearnEmpty,
      status: resolveObservationBriefingPillarStatus({
        pillarId: "still_to_learn",
        source: effective.sources.still_to_learn,
      }),
    },
    {
      id: "opportunities",
      question: OBSERVATION_MISSION_BRIEFING_SECTION_LABELS.opportunities,
      items: takeUnique(
        effective.opportunityHypotheses,
        OBSERVATION_MISSION_BRIEFING_MAX,
      ),
      emptyHint: OBSERVATION_MISSION_BRIEFING_LABELS.opportunitiesEmpty,
      status: resolveObservationBriefingPillarStatus({
        pillarId: "opportunities",
        source: effective.sources.opportunities,
        capturedCount: capturedOpportunities.length,
      }),
    },
  ];



  return {

    missionLead: effective.whyHere,

    pillars,

    hasCapturedIntelligence,

    capturedSignalCount,

  };

}


