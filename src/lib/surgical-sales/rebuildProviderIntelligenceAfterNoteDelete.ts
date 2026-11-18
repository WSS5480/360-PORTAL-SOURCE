import {
  observationEntityEvidence,
  observationEntityFinding,
} from "@/lib/surgical-sales/observationEntityAccessors";
import {
  extractFieldObservationNoteEntitiesForRebuild,
} from "@/lib/surgical-sales/fieldObservationIntelligence";
import { PROVIDER_OBSERVATION_INTELLIGENCE_DB_KEYS } from "@/lib/surgical-sales/fieldObservationIntelligence";
import {
  buildOpportunityIntelligencePatchesFromObservationExtraction,
  mergeOpportunityIntelligenceContactPatch,
} from "@/lib/surgical-sales/promoteOpportunityIntelligenceFromObservation";
import { formatPartialIntelligencePersistValue } from "@/lib/surgical-sales/partialIntelligencePersist";

const ENTITY_DB_KEY: Record<string, string> = {
  competitor_signal: "provider_competitive_products",
  product_signal: "provider_current_vendors",
  staff_signal: "provider_staff_frustrations",
  follow_up_signal: "provider_future_opportunity_signals",
  growth_signal: "provider_future_opportunity_signals",
  workflow_signal: "provider_workflow_pain_points",
  workflow_friction_signal: "provider_workflow_pain_points",
  clinical_pain_signal: "provider_clinical_frustrations",
  provider_behavior_signal: "provider_clinical_frustrations",
  procedure_focus: "provider_procedure_focus",
};

function persistedValueForEntity(entity: { type: string; finding?: string; value?: string; evidence?: string }): string {
  return formatPartialIntelligencePersistValue({
    narrative: observationEntityFinding(entity as never),
    sourceQuote: observationEntityEvidence(entity as never),
    stillNeeds: ["Validate in field intelligence"],
  });
}

function fieldMatchesDeletedEntity(current: string, entityValue: string, persisted: string): boolean {
  const normalized = current.trim().toLowerCase();
  const entity = entityValue.trim().toLowerCase();
  if (!normalized || !entity) return false;
  if (normalized === entity) return true;
  if (normalized === persisted.trim().toLowerCase()) return true;
  if (normalized.includes(entity)) return true;
  return false;
}

function clearDeletedEntityFromProviderField(current: unknown, entityValue: string, persisted: string): string | null {
  const raw = String(current ?? "").trim();
  if (!raw) return null;
  if (fieldMatchesDeletedEntity(raw, entityValue, persisted)) return null;

  const blocks = raw.split(/\n\n+/).filter((block) => {
    const lower = block.trim().toLowerCase();
    const entity = entityValue.trim().toLowerCase();
    return !(lower.includes(entity) || lower === persisted.trim().toLowerCase());
  });

  const next = blocks.join("\n\n").trim();
  return next || null;
}

/** Adjust provider fields after a case note delete — clears deleted-note contribution, replays remaining notes. */
export function rebuildProviderIntelligenceAfterNoteDelete(input: {
  providerRow: Record<string, unknown>;
  deletedNoteBody: string;
  remainingNoteBodies: string[];
  /** Stored extraction of the deleted note — v2 notes clear from stored accepted facts (§6b). */
  deletedNoteAiExtraction?: unknown;
  /** When provided, replaces remainingNoteBodies and carries stored extractions (§6b). */
  remainingNotes?: Array<{ body: string; aiExtraction?: unknown }>;
}): Record<string, unknown> {
  const deleted = extractFieldObservationNoteEntitiesForRebuild({
    body: input.deletedNoteBody,
    aiExtraction: input.deletedNoteAiExtraction,
  });
  let simulated = { ...input.providerRow };

  for (const entity of deleted.entities) {
    const dbKey = ENTITY_DB_KEY[entity.type];
    if (!dbKey) continue;
    const persisted = persistedValueForEntity(entity);
    simulated[dbKey] = clearDeletedEntityFromProviderField(
      simulated[dbKey],
      observationEntityFinding(entity as never),
      persisted,
    );
  }

  const remainingNotes =
    input.remainingNotes ?? input.remainingNoteBodies.map((body) => ({ body }));

  for (const note of remainingNotes) {
    const extraction = extractFieldObservationNoteEntitiesForRebuild(note);
    const patches = buildOpportunityIntelligencePatchesFromObservationExtraction(extraction, simulated);
    simulated = mergeOpportunityIntelligenceContactPatch(simulated, patches);
  }

  const patch: Record<string, unknown> = {};
  for (const key of PROVIDER_OBSERVATION_INTELLIGENCE_DB_KEYS) {
    const before = input.providerRow[key];
    const after = simulated[key];
    if (String(before ?? "") !== String(after ?? "")) {
      patch[key] = after ?? null;
    }
  }
  return patch;
}
