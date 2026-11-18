import { extractObservationFacts } from "./extractObservationFacts";
import type { ObservationFact, ObservationFactType, StoredObservationNoteIntelligence } from "./observationFactTypes";

const WORKFLOW_SUPPORTING_TYPES = new Set<ObservationFactType>([
  "workflow_issue",
  "visualization_challenge",
  "fixation_challenge",
  "workflow_delay",
  "room_turnover_issue",
]);

const VISUALIZATION_PRODUCT_FIT_VALUE = "visualization and fixation workflow opportunity";

function factKey(fact: ObservationFact): string {
  return `${fact.type}:${fact.value.toLowerCase()}`;
}

function isValidObservationFact(fact: unknown): fact is ObservationFact {
  if (!fact || typeof fact !== "object") return false;
  const candidate = fact as ObservationFact;
  return (
    typeof candidate.type === "string" &&
    typeof candidate.value === "string" &&
    typeof candidate.evidence === "string" &&
    candidate.value.trim().length > 0
  );
}

function isVisualizationProductFitFact(fact: ObservationFact): boolean {
  if (fact.type !== "product_fit_signal") return false;
  return /visuali[sz]|fixation|workflow/i.test(fact.value);
}

function hasWorkflowSupportingFacts(facts: ObservationFact[]): boolean {
  return facts.some((fact) => WORKFLOW_SUPPORTING_TYPES.has(fact.type));
}

function pushUniqueFact(target: ObservationFact[], seen: Set<string>, fact: ObservationFact): void {
  const key = factKey(fact);
  if (seen.has(key)) return;
  seen.add(key);
  target.push(fact);
}

/** Re-extract facts from evidence sentences attached to stored facts. */
export function supplementFactsFromEvidenceText(facts: ObservationFact[]): ObservationFact[] {
  const supplemented = [...facts];
  const seen = new Set(facts.map(factKey));

  for (const fact of facts) {
    const evidence = String(fact.evidence ?? "").trim();
    if (!evidence) continue;
    for (const extracted of extractObservationFacts(evidence).facts) {
      pushUniqueFact(supplemented, seen, extracted);
    }
  }

  return supplemented;
}

/** When product-fit opportunity exists without workflow facts, restore workflow companion facts. */
export function ensureWorkflowFactsFromProductFitSignals(facts: ObservationFact[]): ObservationFact[] {
  if (hasWorkflowSupportingFacts(facts)) return facts;
  if (!facts.some(isVisualizationProductFitFact)) return facts;

  const supplemented = [...facts];
  const seen = new Set(facts.map(factKey));
  const evidence =
    facts.find(isVisualizationProductFitFact)?.evidence?.trim() ||
    "Visualization and fixation workflow noted";

  pushUniqueFact(supplemented, seen, {
    type: "workflow_issue",
    value: "extra visualization time before fixation",
    evidence,
  });
  pushUniqueFact(supplemented, seen, {
    type: "visualization_challenge",
    value: "extra visualization time before fixation",
    evidence,
  });
  pushUniqueFact(supplemented, seen, {
    type: "fixation_challenge",
    value: "visualization delay before fixation",
    evidence,
  });

  return supplemented;
}

/** True when stored note intelligence came from the v2 validated pipeline (§6 read gate key). */
export function isValidatedStoredIntelligence(
  stored: StoredObservationNoteIntelligence | null | undefined,
): boolean {
  return Boolean(stored && typeof stored === "object" && stored.validation_version);
}

/**
 * Accepted facts from a v2 validated extraction — stored facts are the truth:
 * no entity re-extraction, no body re-parse, suppressed facts excluded.
 */
export function acceptedFactsFromValidatedIntelligence(
  stored: StoredObservationNoteIntelligence,
): ObservationFact[] {
  const facts: ObservationFact[] = [];
  const seen = new Set<string>();
  for (const fact of stored.facts ?? []) {
    if (!isValidObservationFact(fact)) continue;
    if (fact.validation?.status === "suppressed") continue;
    pushUniqueFact(facts, seen, fact);
  }
  return facts;
}

export function factsFromStoredIntelligence(
  stored: StoredObservationNoteIntelligence | null | undefined,
): ObservationFact[] {
  if (!stored) return [];

  const facts: ObservationFact[] = [];
  const seen = new Set<string>();

  for (const fact of stored.facts ?? []) {
    if (!isValidObservationFact(fact)) continue;
    pushUniqueFact(facts, seen, fact);
  }

  for (const entity of stored.entities ?? []) {
    if (!entity || typeof entity !== "object") continue;
    const record = entity as Record<string, unknown>;
    const text = [record.finding, record.evidence, record.label, record.value]
      .map((part) => String(part ?? "").trim())
      .filter(Boolean)
      .join(". ");
    if (!text) continue;
    for (const extracted of extractObservationFacts(text).facts) {
      pushUniqueFact(facts, seen, extracted);
    }
  }

  return facts;
}

export function supplementObservationFacts(facts: ObservationFact[]): ObservationFact[] {
  return ensureWorkflowFactsFromProductFitSignals(supplementFactsFromEvidenceText(facts));
}
