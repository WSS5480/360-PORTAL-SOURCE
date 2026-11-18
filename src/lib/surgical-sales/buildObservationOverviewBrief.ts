import type { CaseOperationalContextView } from "@/lib/surgical-sales/buildCaseOperationalContextView";

import {

  formatRepFacingDisplayText,

  isMachineGeneratedIntelligenceLabel,

} from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";

import {

  observationObjectivesFromCaseRow,

  splitDelimitedObjectiveLines,

} from "@/lib/surgical-sales/observationObjectives";

import {

  formatObservationWatchItemLabel,

  observationWatchItemsFromCaseRow,

} from "@/lib/surgical-sales/observationWatchItems";

import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

import {

  dedupeObservationIntelligenceBullets,

  isGenericObservationIntelligenceLabel,

} from "@/lib/surgical-sales/observationCaseIntelligenceDedup";



export const OBSERVATION_OVERVIEW_OBJECTIVES_MAX = 5;

export const OBSERVATION_OVERVIEW_LEARNING_MAX = 5;



export type ObservationOverviewBrief = {

  mission: string | null;

  objectives: string[];

  learningNeeds: string[];

};



function firstLine(raw: unknown): string {

  return (

    String(raw ?? "")

      .split(/\n/)

      .map((line) => line.trim())

      .find(Boolean) ?? ""

  );

}



function pushUniqueLine(target: string[], seen: Set<string>, value: string): void {

  const trimmed = value.trim();

  if (!trimmed) return;

  const key = trimmed.toLowerCase();

  if (seen.has(key)) return;

  seen.add(key);

  target.push(trimmed);

}



function formatBriefLine(text: string): string | null {

  const formatted = formatRepFacingDisplayText(text) ?? text.trim();

  if (!formatted || isMachineGeneratedIntelligenceLabel(formatted)) return null;

  if (isGenericObservationIntelligenceLabel(formatted)) return null;

  return formatted;

}



function appendDelimitedField(

  raw: string,

  target: string[],

  seen: Set<string>,

  max: number,

): void {

  for (const line of splitDelimitedObjectiveLines(raw)) {

    if (target.length >= max) break;

    const display = formatBriefLine(line);

    if (display) pushUniqueLine(target, seen, display);

  }

}



function readBool(caseRow: Record<string, unknown>, key: string): boolean {

  const value = caseRow[key];

  if (value === true || value === 1) return true;

  if (typeof value === "string") {

    const normalized = value.trim().toLowerCase();

    return normalized === "true" || normalized === "1" || normalized === "yes";

  }

  return false;

}



export function observationCaseHasProductInterest(caseRow: Record<string, unknown>): boolean {

  const quick = String(caseRow.observation_quick_finding_product_interest ?? "").trim();

  if (quick === "Mentioned" || quick === "Strong") return true;

  if (readBool(caseRow, "debrief_product_opportunity_identified")) return true;

  const liveFit = String(caseRow.live_observation_product_fit ?? "").trim();

  return liveFit === "Possible" || liveFit === "Strong";

}



export function buildObservationOverviewMission(

  caseRow: Record<string, unknown>,

  engagement?: Record<string, unknown> | null,

): string | null {

  const caseGoal = firstLine(caseRow.observation_goal);

  if (caseGoal) return caseGoal;



  const engagementGoal = firstLine(engagement?.observation_goal);

  if (engagementGoal) return engagementGoal;



  const hypothesis = firstLine(engagement?.pre_observation_value_hypothesis);

  if (hypothesis) return hypothesis;



  return null;

}



function buildObservationOverviewObjectives(

  caseRow: Record<string, unknown>,

  engagement?: Record<string, unknown> | null,

): string[] {

  const objectives: string[] = [];

  const seen = new Set<string>();

  const fromCase = observationObjectivesFromCaseRow(caseRow);



  appendDelimitedField(fromCase.observation_goal, objectives, seen, OBSERVATION_OVERVIEW_OBJECTIVES_MAX);



  if (objectives.length < OBSERVATION_OVERVIEW_OBJECTIVES_MAX) {

    appendDelimitedField(

      fromCase.observation_signals_to_validate,

      objectives,

      seen,

      OBSERVATION_OVERVIEW_OBJECTIVES_MAX,

    );

  }



  if (engagement) {

    if (objectives.length < OBSERVATION_OVERVIEW_OBJECTIVES_MAX) {

      appendDelimitedField(String(engagement.observation_goal ?? ""), objectives, seen, OBSERVATION_OVERVIEW_OBJECTIVES_MAX);

    }

    if (objectives.length < OBSERVATION_OVERVIEW_OBJECTIVES_MAX) {

      appendDelimitedField(

        String(engagement.pre_observation_value_hypothesis ?? ""),

        objectives,

        seen,

        OBSERVATION_OVERVIEW_OBJECTIVES_MAX,

      );

    }

  }



  for (const item of observationWatchItemsFromCaseRow(caseRow)) {

    if (objectives.length >= OBSERVATION_OVERVIEW_OBJECTIVES_MAX) break;

    if (item.status !== "planned") continue;

    const label = formatObservationWatchItemLabel(item.label);

    pushUniqueLine(objectives, seen, `Validate: ${label}`);

  }



  return dedupeObservationIntelligenceBullets(objectives, OBSERVATION_OVERVIEW_OBJECTIVES_MAX);

}



function buildObservationOverviewLearningNeeds(

  caseRow: Record<string, unknown>,

  engagement?: Record<string, unknown> | null,

): string[] {

  const learningNeeds: string[] = [];

  const seen = new Set<string>();

  const fromCase = observationObjectivesFromCaseRow(caseRow);



  appendDelimitedField(

    fromCase.observation_key_questions,

    learningNeeds,

    seen,

    OBSERVATION_OVERVIEW_LEARNING_MAX,

  );



  if (engagement) {

    appendDelimitedField(

      String(engagement.pre_observation_probes ?? ""),

      learningNeeds,

      seen,

      OBSERVATION_OVERVIEW_LEARNING_MAX,

    );

  }



  return dedupeObservationIntelligenceBullets(learningNeeds, OBSERVATION_OVERVIEW_LEARNING_MAX);

}



export function buildObservationOverviewBrief(input: {

  caseRow: Record<string, unknown>;

  engagement?: Record<string, unknown> | null;

  operationalContext?: CaseOperationalContextView | null;

  providerContact?: Record<string, unknown> | null;

  planning?: ProviderPlanningCompletion | null;

}): ObservationOverviewBrief {

  return {

    mission: buildObservationOverviewMission(input.caseRow, input.engagement),

    objectives: buildObservationOverviewObjectives(input.caseRow, input.engagement),

    learningNeeds: buildObservationOverviewLearningNeeds(input.caseRow, input.engagement),

  };

}

