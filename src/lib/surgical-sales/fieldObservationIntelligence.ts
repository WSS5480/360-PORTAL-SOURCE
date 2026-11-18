import {
  type ObservationNoteEntityType,
  type ObservationNoteExtraction,
} from "@/lib/surgical-sales/extractObservationNoteEntities";
import { extractObservationFacts } from "@/lib/surgical-sales/observationIntelligence/extractObservationFacts";
import type {
  ObservationFactExtraction,
  StoredObservationNoteIntelligence,
} from "@/lib/surgical-sales/observationIntelligence/observationFactTypes";
import { factsExtractionToLegacyNoteExtraction } from "@/lib/surgical-sales/observationIntelligence/factsToLegacyEntities";
import {
  acceptedFactsFromValidatedIntelligence,
  isValidatedStoredIntelligence,
} from "@/lib/surgical-sales/observationIntelligence/observationFactSupplement";
import {
  isUsableObservationEntity,
  observationEntityFinding,
} from "@/lib/surgical-sales/observationEntityAccessors";

/** Entity types that represent in-case field observation — not discovery/access admin. */
export const FIELD_OBSERVATION_ENTITY_TYPES = new Set<ObservationNoteEntityType>([
  "procedure_focus",
  "product_signal",
  "competitor_signal",
  "staff_signal",
  "follow_up_signal",
  "workflow_signal",
  "clinical_pain_signal",
  "workflow_friction_signal",
  "provider_behavior_signal",
  "growth_signal",
]);

/** Provider-level fields written from observation notes — never discovery/access fields. */
export const PROVIDER_OBSERVATION_INTELLIGENCE_DB_KEYS = [
  "provider_current_vendors",
  "provider_competitive_products",
  "provider_workflow_pain_points",
  "provider_clinical_frustrations",
  "provider_staff_frustrations",
  "provider_future_opportunity_signals",
  "provider_procedure_focus",
  "provider_product_interests",
  "provider_preference_card_signals",
] as const;

/** Discovery/access fields — must not be populated from observation notes. */
export const DISCOVERY_ACCESS_INTELLIGENCE_DB_KEYS = new Set([
  "provider_observation_feasibility",
  "provider_observation_credentialing_needed",
  "provider_observation_access_path",
  "provider_observation_coordinator_contact",
  "provider_observation_cadence_preference",
  "provider_ideal_observation_cases",
  "provider_observation_best_days_case_types",
  "provider_observation_permission",
]);

export function isFieldObservationEntityType(type: ObservationNoteEntityType): boolean {
  return FIELD_OBSERVATION_ENTITY_TYPES.has(type);
}

export function filterFieldObservationExtraction(
  extraction: ObservationNoteExtraction,
): ObservationNoteExtraction {
  const entities = extraction.entities.filter(
    (entity) => isFieldObservationEntityType(entity.type) && isUsableObservationEntity(entity),
  );
  const primaryCategory =
    entities.find((entity) => entity.confidence === "High")?.category ??
    entities.find((entity) => entity.confidence === "Medium")?.category ??
    null;
  return { ...extraction, entities, primaryCategory };
}

export function extractFieldObservationNoteEntities(rawText: string): ObservationNoteExtraction {
  const factExtraction = extractObservationFacts(rawText);
  return observationExtractionFromFactExtraction(factExtraction);
}

/**
 * §6b note-delete rebuild gate: v2 validated notes rebuild from their stored
 * accepted facts — no body re-parse, suppressed facts stay suppressed. Legacy
 * notes rebuild exactly as today (rules re-parse of the body).
 */
export function extractFieldObservationNoteEntitiesForRebuild(note: {
  body: string;
  aiExtraction?: unknown;
}): ObservationNoteExtraction {
  const stored = (note.aiExtraction ?? null) as StoredObservationNoteIntelligence | null;
  if (isValidatedStoredIntelligence(stored)) {
    return observationExtractionFromFactExtraction({
      facts: acceptedFactsFromValidatedIntelligence(stored!),
      extractedAt: String(stored!.extractedAt ?? new Date().toISOString()),
      model: "facts-v2-ai",
    });
  }
  return extractFieldObservationNoteEntities(note.body);
}

/** Build legacy entity extraction from an already-computed fact extraction (hybrid or rules). */
export function observationExtractionFromFactExtraction(
  factExtraction: ObservationFactExtraction,
): ObservationNoteExtraction {
  return filterFieldObservationExtraction(factsExtractionToLegacyNoteExtraction(factExtraction));
}

export function entityToTakeawayText(
  entity: { type: ObservationNoteEntityType; finding?: string; value?: string },
): string | null {
  const finding = observationEntityFinding(entity as never);
  if (!finding || !isUsableObservationEntity(entity as never)) return null;
  return finding.charAt(0).toUpperCase() + finding.slice(1);
}
