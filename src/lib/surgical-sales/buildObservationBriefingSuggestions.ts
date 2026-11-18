import type { ObservationMissionBriefingPillarId } from "@/lib/surgical-sales/buildObservationMissionBriefing";
import { formatRepIntelligenceFieldValue } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import {
  buildObservationMissionWatchSignalsFromProvider,
  filterObservationMissionLines,
} from "@/lib/surgical-sales/observationBriefingScope";
import {
  OBSERVATION_BRIEFING_GENERIC_LEARNING_QUESTIONS,
  OBSERVATION_BRIEFING_GENERIC_OPPORTUNITY_HYPOTHESES,
  OBSERVATION_BRIEFING_GENERIC_WATCH_SIGNALS,
  buildDefaultObservationObjective,
} from "@/lib/surgical-sales/observationBriefingDefaults";
import { splitDelimitedObjectiveLines } from "@/lib/surgical-sales/observationObjectives";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export type ObservationBriefingSuggestion = {
  id: string;
  text: string;
  source: string;
};

export type ObservationBriefingSuggestionsView = {
  pillarId: ObservationMissionBriefingPillarId;
  items: ObservationBriefingSuggestion[];
  combinedText: string | null;
};

function takeUniqueSuggestions(
  items: ObservationBriefingSuggestion[],
  max: number,
): ObservationBriefingSuggestion[] {
  const seen = new Set<string>();
  const result: ObservationBriefingSuggestion[] = [];
  for (const item of items) {
    const key = item.text.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= max) break;
  }
  return result;
}

function providerFieldSuggestion(
  id: string,
  dbKey: string,
  contact: Record<string, unknown>,
  source: string,
): ObservationBriefingSuggestion | null {
  const text = formatRepIntelligenceFieldValue(dbKey, contact[dbKey] as string | null | undefined);
  if (!text) return null;
  return { id, text, source };
}

function lineSuggestions(
  raw: unknown,
  source: string,
  idPrefix: string,
): ObservationBriefingSuggestion[] {
  return splitDelimitedObjectiveLines(String(raw ?? "")).map((text, index) => ({
    id: `${idPrefix}-${index}`,
    text,
    source,
  }));
}

function buildObjectiveSuggestions(input: {
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
  procedureLabel?: string | null;
}): ObservationBriefingSuggestionsView {
  const objective = buildDefaultObservationObjective(input);
  const items: ObservationBriefingSuggestion[] = [
    {
      id: "default-objective",
      text: objective.text,
      source: objective.source === "template" ? "Mission template" : "Provider intelligence",
    },
  ];

  if (input.providerContact) {
    const focus = providerFieldSuggestion(
      "provider-focus",
      "provider_procedure_focus",
      input.providerContact,
      "Provider intelligence",
    );
    if (focus && focus.text !== objective.text) items.push(focus);

    const pain = providerFieldSuggestion(
      "provider-pain",
      "provider_workflow_pain_points",
      input.providerContact,
      "Discovery intelligence",
    );
    if (pain) items.push(pain);
  }

  const unique = takeUniqueSuggestions(items, 6);
  return {
    pillarId: "why_here",
    items: unique,
    combinedText: objective.text,
  };
}

function buildWatchSuggestions(input: {
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
  planning?: ProviderPlanningCompletion | null;
  productFocus?: string | null;
}): ObservationBriefingSuggestionsView {
  const items: ObservationBriefingSuggestion[] = [];

  items.push(
    ...lineSuggestions(input.engagement?.pre_observation_tools_resources, "Prior debrief", "intro-tools").filter(
      (item) => filterObservationMissionLines([item.text]).length > 0,
    ),
  );

  const productFocus =
    input.productFocus ??
    (String(input.engagement?.product_focus ?? input.caseRow.product_focus ?? "").trim() || null);

  for (const [index, text] of buildObservationMissionWatchSignalsFromProvider(
    input.providerContact,
    productFocus,
  ).entries()) {
    items.push({ id: `provider-watch-${index}`, text, source: "Provider intelligence" });
  }

  if (input.providerIntelligence?.competitive_products) {
    items.push({
      id: "intel-competitive",
      text: `Competitor products present: ${input.providerIntelligence.competitive_products}`,
      source: "Provider intelligence",
    });
  }

  for (const [index, text] of OBSERVATION_BRIEFING_GENERIC_WATCH_SIGNALS.entries()) {
    items.push({ id: `default-watch-${index}`, text, source: "Mission template" });
  }

  const unique = takeUniqueSuggestions(items, 8);
  return { pillarId: "watch_signals", items: unique, combinedText: null };
}

function buildLearningSuggestions(input: {
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  providerContact?: Record<string, unknown> | null;
}): ObservationBriefingSuggestionsView {
  const items: ObservationBriefingSuggestion[] = [];

  items.push(
    ...lineSuggestions(input.engagement?.pre_observation_probes, "Prior debrief", "intro-probe").filter(
      (item) => filterObservationMissionLines([item.text]).length > 0,
    ),
  );

  if (input.providerContact) {
    const vendors = providerFieldSuggestion(
      "provider-vendors",
      "provider_current_vendors",
      input.providerContact,
      "Provider intelligence",
    );
    if (vendors) {
      items.push({
        id: "vendor-question",
        text: `What products from ${vendors.text} are currently being used?`,
        source: "Provider intelligence",
      });
    }
  }

  const priorQuestions = String(input.caseRow.observation_key_questions ?? "").trim();
  if (priorQuestions) {
    items.push(
      ...lineSuggestions(priorQuestions, "Previous observations", "prior-question")
        .filter((item) => filterObservationMissionLines([item.text]).length > 0)
        .slice(0, 3),
    );
  }

  for (const [index, hint] of OBSERVATION_BRIEFING_GENERIC_LEARNING_QUESTIONS.entries()) {
    items.push({ id: `learning-hint-${index}`, text: hint, source: "Mission template" });
  }

  const unique = takeUniqueSuggestions(items, 8);
  return { pillarId: "still_to_learn", items: unique, combinedText: null };
}

function buildOpportunitySuggestions(input: {
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
}): ObservationBriefingSuggestionsView {
  const items: ObservationBriefingSuggestion[] = [];

  items.push(
    ...lineSuggestions(
      input.engagement?.pre_observation_value_hypothesis ?? input.caseRow.pre_observation_value_hypothesis,
      "Prior debrief",
      "intro-hypothesis-line",
    ).filter((item) => filterObservationMissionLines([item.text]).length > 0),
  );

  if (input.providerContact) {
    const future = providerFieldSuggestion(
      "provider-future",
      "provider_future_opportunity_signals",
      input.providerContact,
      "Discovery intelligence",
    );
    if (future) items.push(future);

    const interests = providerFieldSuggestion(
      "provider-interests",
      "provider_product_interests",
      input.providerContact,
      "Provider intelligence",
    );
    if (interests) items.push(interests);

    const gaps = providerFieldSuggestion(
      "provider-product-gaps",
      "provider_product_gaps",
      input.providerContact,
      "Discovery intelligence",
    );
    if (gaps) {
      items.push({
        id: "gap-opportunity",
        text: `Opportunity to address ${gaps.text.toLowerCase()}`,
        source: "Discovery intelligence",
      });
    }
  }

  if (input.providerIntelligence?.product_preferences) {
    items.push({
      id: "intel-product-pref",
      text: `${input.providerIntelligence.product_preferences} fit opportunity`,
      source: "Provider intelligence",
    });
  }

  const productInterest = String(input.caseRow.observation_quick_finding_product_interest ?? "").trim();
  if (productInterest === "Mentioned" || productInterest === "Strong") {
    items.push({
      id: "prior-product-interest",
      text: `Product interest (${productInterest.toLowerCase()}) from prior observation`,
      source: "Previous observations",
    });
  }

  for (const [index, text] of OBSERVATION_BRIEFING_GENERIC_OPPORTUNITY_HYPOTHESES.entries()) {
    items.push({ id: `default-opportunity-${index}`, text, source: "Mission template" });
  }

  const unique = takeUniqueSuggestions(items, 8);
  return { pillarId: "opportunities", items: unique, combinedText: null };
}

function buildDebriefSuggestions(input: {
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
}): ObservationBriefingSuggestionsView {
  const items: ObservationBriefingSuggestion[] = [];

  const plannedClose = String(
    input.engagement?.pre_observation_planned_close ?? input.caseRow.pre_observation_planned_close ?? "",
  ).trim();
  if (plannedClose) {
    items.push({ id: "intro-close", text: plannedClose, source: "Intro call debrief" });
  }

  items.push(
    {
      id: "debrief-review",
      text: "Review captured intelligence with the provider.",
      source: "Mission template",
    },
    {
      id: "debrief-schedule",
      text: "Schedule the provider debrief conversation.",
      source: "Mission template",
    },
    {
      id: "debrief-follow-up",
      text: "Confirm follow-up actions and next engagement step.",
      source: "Mission template",
    },
  );

  const unique = takeUniqueSuggestions(items, 6);
  return { pillarId: "after_observation", items: unique, combinedText: null };
}

export function buildObservationBriefingSuggestions(input: {
  pillarId: ObservationMissionBriefingPillarId;
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
  planning?: ProviderPlanningCompletion | null;
  procedureLabel?: string | null;
}): ObservationBriefingSuggestionsView {
  const shared = {
    caseRow: input.caseRow,
    engagement: input.engagement,
    providerContact: input.providerContact,
    providerIntelligence: input.providerIntelligence,
    planning: input.planning,
    procedureLabel: input.procedureLabel,
  };

  switch (input.pillarId) {
    case "why_here":
      return buildObjectiveSuggestions(shared);
    case "watch_signals":
      return buildWatchSuggestions(shared);
    case "still_to_learn":
      return buildLearningSuggestions(shared);
    case "opportunities":
      return buildOpportunitySuggestions(shared);
    case "after_observation":
      return buildDebriefSuggestions(shared);
    default:
      return { pillarId: input.pillarId, items: [], combinedText: null };
  }
}

export function briefingSuggestionApplyLabel(
  currentDraft: string,
  suggestionText: string,
): "Apply" | "Insert" | "Added" {
  const draft = currentDraft.trim();
  const suggestion = suggestionText.trim();
  if (!suggestion) return "Apply";
  if (!draft) return "Apply";
  if (draft.toLowerCase().includes(suggestion.toLowerCase())) return "Added";
  return "Insert";
}
