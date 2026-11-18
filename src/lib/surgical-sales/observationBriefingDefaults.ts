import { formatRepIntelligenceFieldValue } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";

import {

  filterObservationMissionLines,

  buildObservationMissionWatchSignalsFromProvider,

} from "@/lib/surgical-sales/observationBriefingScope";

import {

  observationObjectivesFromCaseRow,

  splitDelimitedObjectiveLines,

} from "@/lib/surgical-sales/observationObjectives";

import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";

import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";



export const OBSERVATION_BRIEFING_DEFAULT_OBJECTIVE_BASE =
  "Assess product fit during this observation.";

export const OBSERVATION_BRIEFING_GENERIC_WATCH_SIGNALS = [
  "Current products used",
  "Competitor products",
  "Workflow bottlenecks",
  "Provider frustrations",
  "Staff frustrations",
] as const;

export const OBSERVATION_BRIEFING_GENERIC_LEARNING_QUESTIONS = [
  "What products are currently being used?",
  "What frustrates the surgeon?",
  "What frustrates staff?",
  "What workflow workarounds exist?",
  "What outcomes matter most?",
] as const;

export const OBSERVATION_BRIEFING_GENERIC_OPPORTUNITY_HYPOTHESES = [
  "Potential fit opportunity exists if workflow friction or clinical pain points are observed.",
] as const;



/** @deprecated Use OBSERVATION_BRIEFING_GENERIC_OPPORTUNITY_HYPOTHESES */

export const OBSERVATION_BRIEFING_GENERIC_OPPORTUNITY_HYPOTHESIS =

  OBSERVATION_BRIEFING_GENERIC_OPPORTUNITY_HYPOTHESES[0]!;



export type ObservationBriefingDefaultSource = "saved" | "prior_intelligence" | "template";



export type ObservationBriefingPillarId =

  | "why_here"

  | "watch_signals"

  | "still_to_learn"

  | "opportunities"

  | "after_observation";



export type ObservationBriefingEffectiveContent = {

  whyHere: string;

  watchSignals: string[];

  learningQuestions: string[];

  opportunityHypotheses: string[];

  sources: Record<ObservationBriefingPillarId, ObservationBriefingDefaultSource>;

  isPersonalized: boolean;

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



function providerFieldText(

  contact: Record<string, unknown> | null | undefined,

  dbKey: string,

): string | null {

  if (!contact) return null;

  return formatRepIntelligenceFieldValue(dbKey, contact[dbKey] as string | null | undefined);

}



function resolveProductFocus(input: {

  caseRow: Record<string, unknown>;

  engagement?: Record<string, unknown> | null;

}): string | null {

  const candidates = [

    input.engagement?.product_focus,

    input.caseRow.product_focus,

    input.caseRow.product_line,

    input.caseRow.primary_product_line,

  ];

  for (const candidate of candidates) {

    const text = String(candidate ?? "").trim();

    if (text) return text;

  }

  return null;

}



function resolveWorkflowContext(input: {

  caseRow: Record<string, unknown>;

  providerContact?: Record<string, unknown> | null;

  procedureLabel?: string | null;

}): string | null {

  return (

    providerFieldText(input.providerContact, "provider_procedure_focus") ||

    input.procedureLabel?.trim() ||

    String(input.caseRow.procedure_type ?? "").trim() ||

    null

  );

}



function providerFieldLines(

  contact: Record<string, unknown> | null | undefined,

  dbKey: string,

): string[] {

  if (!contact) return [];

  const raw = contact[dbKey];

  if (raw == null || raw === "") return [];

  return splitDelimitedObjectiveLines(String(raw));

}



function resolvePersonalizationThemes(input: {

  providerContact?: Record<string, unknown> | null;

  providerIntelligence?: ProviderIntelligenceSnapshot | null;

}): string[] {

  const themes: string[] = [];



  for (const dbKey of [

    "provider_workflow_pain_points",

    "provider_clinical_frustrations",

    "provider_preference_card_signals",

    "provider_staff_frustrations",

    "provider_product_gaps",

    "provider_future_opportunity_signals",

  ] as const) {

    themes.push(...providerFieldLines(input.providerContact, dbKey));

  }



  if (input.providerIntelligence?.technique_preferences) {

    themes.push(input.providerIntelligence.technique_preferences);

  }



  return takeUnique(filterObservationMissionLines(themes), 4);

}



function formatEspeciallyAround(themes: string[]): string | null {

  if (themes.length === 0) return null;

  if (themes.length === 1) return themes[0]!;

  if (themes.length === 2) return `${themes[0]} and ${themes[1]}`;

  return `${themes.slice(0, -1).join(", ")}, and ${themes[themes.length - 1]}`;

}



export function buildDefaultObservationObjective(input: {
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
  procedureLabel?: string | null;
}): { text: string; source: ObservationBriefingDefaultSource } {
  const productFocus = resolveProductFocus(input);
  const workflowContext = resolveWorkflowContext(input);
  const themes = resolvePersonalizationThemes(input);
  const especially = formatEspeciallyAround(themes);
  const procedure = workflowContext || String(input.caseRow.procedure_type ?? "").trim() || null;

  if (productFocus && procedure) {
    return {
      text: `Assess ${productFocus} fit during ${procedure}.`,
      source: "prior_intelligence",
    };
  }

  if (procedure) {
    return {
      text: `Assess product fit during ${procedure}.`,
      source: especially ? "prior_intelligence" : "template",
    };
  }

  if (productFocus) {
    return {
      text: `Assess ${productFocus} fit during this observation.`,
      source: "prior_intelligence",
    };
  }

  if (especially) {
    return {
      text: `Assess product fit during this observation, especially around ${especially.toLowerCase()}.`,
      source: "prior_intelligence",
    };
  }

  return { text: OBSERVATION_BRIEFING_DEFAULT_OBJECTIVE_BASE, source: "template" };
}



function buildDefaultWatchSignals(input: {

  caseRow: Record<string, unknown>;

  engagement?: Record<string, unknown> | null;

  providerContact?: Record<string, unknown> | null;

  providerIntelligence?: ProviderIntelligenceSnapshot | null;

  productFocus?: string | null;

}): { items: string[]; source: ObservationBriefingDefaultSource } {

  const items: string[] = [];

  let hasIntelligence = false;



  const engagementTools = filterObservationMissionLines(

    splitDelimitedObjectiveLines(String(input.engagement?.pre_observation_tools_resources ?? "")),

  );

  if (engagementTools.length > 0) {

    items.push(...engagementTools);

    hasIntelligence = true;

  }



  const providerSignals = buildObservationMissionWatchSignalsFromProvider(

    input.providerContact,

    input.productFocus,

  );

  if (providerSignals.length > 0) {

    items.push(...providerSignals);

    hasIntelligence = true;

  }



  if (input.providerIntelligence?.competitive_products) {

    items.push(`Competitor products present: ${input.providerIntelligence.competitive_products}`);

    hasIntelligence = true;

  }



  items.push(...OBSERVATION_BRIEFING_GENERIC_WATCH_SIGNALS);



  return {

    items: takeUnique(items, 8),

    source: hasIntelligence ? "prior_intelligence" : "template",

  };

}



function buildDefaultLearningQuestions(input: {

  caseRow: Record<string, unknown>;

  engagement?: Record<string, unknown> | null;

  providerContact?: Record<string, unknown> | null;

  productFocus?: string | null;

}): { items: string[]; source: ObservationBriefingDefaultSource } {

  const items: string[] = [];

  let hasIntelligence = false;



  const engagementProbes = filterObservationMissionLines(

    splitDelimitedObjectiveLines(String(input.engagement?.pre_observation_probes ?? "")),

  );

  if (engagementProbes.length > 0) {

    items.push(...engagementProbes);

    hasIntelligence = true;

  }



  const vendors = providerFieldText(input.providerContact, "provider_current_vendors");

  if (vendors) {

    items.push(`What products from ${vendors} are being used?`);

    hasIntelligence = true;

  }



  if (input.productFocus) {

    items.push(`What problems would ${input.productFocus} need to solve to fit this workflow?`);

    hasIntelligence = true;

  }



  items.push(...OBSERVATION_BRIEFING_GENERIC_LEARNING_QUESTIONS);



  return {

    items: takeUnique(items, 8),

    source: hasIntelligence ? "prior_intelligence" : "template",

  };

}



function buildDefaultOpportunityHypotheses(input: {

  caseRow: Record<string, unknown>;

  engagement?: Record<string, unknown> | null;

  providerContact?: Record<string, unknown> | null;

  providerIntelligence?: ProviderIntelligenceSnapshot | null;

  productFocus?: string | null;

}): { items: string[]; source: ObservationBriefingDefaultSource } {

  const items: string[] = [];

  let hasIntelligence = false;



  const savedHypothesis = filterObservationMissionLines(

    splitDelimitedObjectiveLines(

      String(

        input.engagement?.pre_observation_value_hypothesis ?? input.caseRow.pre_observation_value_hypothesis ?? "",

      ),

    ),

  );

  if (savedHypothesis.length > 0) {

    items.push(...savedHypothesis);

    hasIntelligence = true;

  }



  if (input.providerContact) {

    const gaps = providerFieldText(input.providerContact, "provider_product_gaps");

    if (gaps) {

      items.push(`Product fit opportunity: ${gaps}`);

      hasIntelligence = true;

    }



    const future = providerFieldText(input.providerContact, "provider_future_opportunity_signals");

    if (future) {

      items.push(`Conversion opportunity: ${future}`);

      hasIntelligence = true;

    }



    const pain = providerFieldText(input.providerContact, "provider_workflow_pain_points");

    if (pain) {

      items.push(`Workflow improvement opportunity if ${pain.toLowerCase()} is confirmed in the OR.`);

      hasIntelligence = true;

    }



    const interests = providerFieldText(input.providerContact, "provider_product_interests");

    if (interests) {

      items.push(`Training opportunity if adoption gaps appear around ${interests.toLowerCase()}.`);

      hasIntelligence = true;

    }

  }



  if (input.providerIntelligence?.product_preferences) {

    items.push(`Product fit opportunity: ${input.providerIntelligence.product_preferences}`);

    hasIntelligence = true;

  }



  if (input.productFocus) {

    items.push(`${input.productFocus} product fit opportunity if workflow pain or competitor weakness is observed.`);

    hasIntelligence = true;

  }



  items.push(...OBSERVATION_BRIEFING_GENERIC_OPPORTUNITY_HYPOTHESES);



  return {

    items: takeUnique(items, 6),

    source: hasIntelligence ? "prior_intelligence" : "template",

  };

}



export function hasSavedBriefingContent(

  pillarId: ObservationBriefingPillarId,

  caseRow: Record<string, unknown>,

  engagement?: Record<string, unknown> | null,

): boolean {

  const objectives = observationObjectivesFromCaseRow(caseRow);



  switch (pillarId) {

    case "why_here":

      return Boolean(objectives.observation_goal.trim());

    case "watch_signals":

      return Boolean(objectives.observation_signals_to_validate.trim());

    case "still_to_learn":

      return Boolean(objectives.observation_key_questions.trim());

    case "opportunities":

      return Boolean(String(caseRow.pre_observation_value_hypothesis ?? "").trim());

    case "after_observation":

      return Boolean(

        String(caseRow.pre_observation_planned_close ?? engagement?.pre_observation_planned_close ?? "").trim() ||

          String(caseRow.pre_observation_additional_notes ?? engagement?.pre_observation_additional_notes ?? "").trim(),

      );

    default:

      return false;

  }

}



export function buildObservationBriefingEffectiveContent(input: {

  caseRow: Record<string, unknown>;

  engagement?: Record<string, unknown> | null;

  providerContact?: Record<string, unknown> | null;

  providerIntelligence?: ProviderIntelligenceSnapshot | null;

  planning?: ProviderPlanningCompletion | null;

  procedureLabel?: string | null;

}): ObservationBriefingEffectiveContent {

  const productFocus = resolveProductFocus(input);

  const shared = { ...input, productFocus };



  const savedObjective = observationObjectivesFromCaseRow(input.caseRow).observation_goal.trim();

  const defaultObjective = buildDefaultObservationObjective(input);



  const savedWatch = filterObservationMissionLines(

    splitDelimitedObjectiveLines(

      observationObjectivesFromCaseRow(input.caseRow).observation_signals_to_validate,

    ),

  );

  const defaultWatch = buildDefaultWatchSignals(shared);



  const savedLearning = filterObservationMissionLines(

    splitDelimitedObjectiveLines(

      observationObjectivesFromCaseRow(input.caseRow).observation_key_questions.trim() ||

        String(input.engagement?.pre_observation_probes ?? ""),

    ),

  );

  const defaultLearning = buildDefaultLearningQuestions(shared);



  const savedOpportunities = filterObservationMissionLines(

    splitDelimitedObjectiveLines(

      String(input.caseRow.pre_observation_value_hypothesis ?? input.engagement?.pre_observation_value_hypothesis ?? ""),

    ),

  );

  const defaultOpportunities = buildDefaultOpportunityHypotheses(shared);



  const whyHere = savedObjective || defaultObjective.text;

  const watchSignals =

    savedWatch.length > 0 ? takeUnique(savedWatch, 8) : defaultWatch.items;

  const learningQuestions =

    savedLearning.length > 0 ? takeUnique(savedLearning, 8) : defaultLearning.items;

  const opportunityHypotheses =

    savedOpportunities.length > 0 ? takeUnique(savedOpportunities, 6) : defaultOpportunities.items;



  const sources: Record<ObservationBriefingPillarId, ObservationBriefingDefaultSource> = {

    why_here: savedObjective ? "saved" : defaultObjective.source,

    watch_signals: savedWatch.length > 0 ? "saved" : defaultWatch.source,

    still_to_learn: savedLearning.length > 0 ? "saved" : defaultLearning.source,

    opportunities: savedOpportunities.length > 0 ? "saved" : defaultOpportunities.source,

    after_observation: "template",

  };



  const isPersonalized = Object.values(sources).some((source) => source === "prior_intelligence");



  return {

    whyHere,

    watchSignals,

    learningQuestions,

    opportunityHypotheses,

    sources,

    isPersonalized,

  };

}



export function observationBriefingDraftDefaultValue(

  pillarId: ObservationBriefingPillarId,

  input: {

    caseRow: Record<string, unknown>;

    engagement?: Record<string, unknown> | null;

    providerContact?: Record<string, unknown> | null;

    providerIntelligence?: ProviderIntelligenceSnapshot | null;

    planning?: ProviderPlanningCompletion | null;

    procedureLabel?: string | null;

  },

): string {

  const effective = buildObservationBriefingEffectiveContent(input);



  switch (pillarId) {

    case "why_here":

      return effective.whyHere;

    case "watch_signals":

      return effective.watchSignals.join("\n");

    case "still_to_learn":

      return effective.learningQuestions.join("\n");

    case "opportunities":

      return effective.opportunityHypotheses.join("\n");

    case "after_observation":

      return [

        "Review captured intelligence with the provider.",

        "Schedule the provider debrief conversation.",

        "Confirm follow-up actions and next engagement step.",

      ].join("\n");

    default:

      return "";

  }

}



export function resolveObservationBriefingPillarStatus(params: {

  pillarId: ObservationBriefingPillarId;

  source: ObservationBriefingDefaultSource;

  capturedCount?: number;

  readyForDebrief?: boolean;

  hasCapturedIntelligence?: boolean;

}): "needs_input" | "prefilled" | "review" | "ready" | "in_progress" | "complete" {

  if (params.source === "saved") {

    if (params.pillarId === "opportunities" && (params.capturedCount ?? 0) > 0) return "complete";

    if (params.pillarId === "after_observation" && params.readyForDebrief) return "complete";

    return "ready";

  }



  if (params.source === "prior_intelligence") {

    if (params.pillarId === "opportunities" && (params.capturedCount ?? 0) > 0) return "complete";

    return "review";

  }



  if (params.pillarId === "after_observation") {

    if (params.readyForDebrief) return "complete";

    if (params.hasCapturedIntelligence) return "in_progress";

    return "prefilled";

  }



  if (params.pillarId === "opportunities" && (params.capturedCount ?? 0) > 0) {

    return "complete";

  }



  return "prefilled";

}


