/**
 * Promote observation note AI extraction into provider opportunity intelligence fields.
 */

import type { ObservationNoteExtraction } from "@/lib/surgical-sales/extractObservationNoteEntities";
import {
  isUsableObservationEntity,
  observationEntityEvidence,
  observationEntityFinding,
} from "@/lib/surgical-sales/observationEntityAccessors";
import {
  DISCOVERY_ACCESS_INTELLIGENCE_DB_KEYS,
  isFieldObservationEntityType,
} from "@/lib/surgical-sales/fieldObservationIntelligence";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { formatPartialIntelligencePersistValue } from "@/lib/surgical-sales/partialIntelligencePersist";
import {
  assertionAwareIntelligenceEnabled,
  compareIntelligenceAssertion,
  resolveFieldAssertion,
} from "@/lib/surgical-sales/intelligenceAssertion";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

export type OpportunityIntelligenceFieldPatch = {
  dbKey: string;
  value: string;
  /** Assertion-aware upgrade over a lower-assertion existing value (prior text preserved in value). */
  upgrade?: boolean;
};

export type OpportunityIntelligencePromotionSkip = {
  db_key: string;
  proposed: string;
  existing_preview: string;
  /** Why the promotion skipped (assertion-aware mode). */
  skip_reason?: "equal_or_higher_assertion" | "existing_value";
};

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

export function buildOpportunityIntelligencePatchesFromObservationExtraction(
  extraction: ObservationNoteExtraction,
  existingContact: Record<string, unknown>,
): OpportunityIntelligenceFieldPatch[] {
  return buildOpportunityIntelligencePromotionFromObservationExtraction(extraction, existingContact)
    .patches;
}

/**
 * Promotion from observation extraction into provider opportunity fields.
 *
 * Legacy mode (flag off): first-writer-wins — any existing content blocks the
 * promotion (pilot §5b blocked-promotion logging).
 *
 * Assertion-aware mode (ASSERTION_AWARE_INTELLIGENCE=1): an observation
 * (assertion = observed) promotes over an existing provider-reported value —
 * the prior text is preserved inside the new value. It still skips when the
 * existing value is observed or validated. This fixes the trap where a field
 * note permanently blocked observation findings from promoting.
 */
export function buildOpportunityIntelligencePromotionFromObservationExtraction(
  extraction: ObservationNoteExtraction,
  existingContact: Record<string, unknown>,
): { patches: OpportunityIntelligenceFieldPatch[]; skips: OpportunityIntelligencePromotionSkip[] } {
  const patches: OpportunityIntelligenceFieldPatch[] = [];
  const skips: OpportunityIntelligencePromotionSkip[] = [];
  const assertionAware = assertionAwareIntelligenceEnabled();
  const fieldMetadata = assertionAware
    ? parseProviderIntelligenceFieldMetadata(existingContact.provider_intelligence_field_metadata)
    : {};

  for (const entity of extraction.entities) {
    if (!isFieldObservationEntityType(entity.type) || !isUsableObservationEntity(entity)) continue;
    // §5 staff routing fix: positive staff observations never promote to
    // provider_staff_frustrations. Legacy entities carry no polarity — unchanged.
    if (entity.type === "staff_signal" && entity.polarity === "positive") continue;
    const dbKey = ENTITY_DB_KEY[entity.type];
    if (!dbKey || DISCOVERY_ACCESS_INTELLIGENCE_DB_KEYS.has(dbKey)) continue;

    const finding = observationEntityFinding(entity);
    const evidence = observationEntityEvidence(entity);
    const value = formatPartialIntelligencePersistValue({
      narrative: finding,
      sourceQuote: evidence,
      stillNeeds: ["Validate in field intelligence"],
    });

    const existing = String(existingContact[dbKey] ?? "").trim();
    if (fieldHasIntelligenceSignal(dbKey, existing)) {
      if (assertionAware) {
        const existingAssertion = resolveFieldAssertion(fieldMetadata[dbKey]);
        if (compareIntelligenceAssertion("observed", existingAssertion) > 0) {
          // Observed outranks provider_reported: promote, preserving the prior
          // provider-reported text as context inside the field.
          patches.push({
            dbKey,
            value: `${value}\nPrior (provider-reported): ${existing}`.slice(0, 8000),
            upgrade: true,
          });
          continue;
        }
        skips.push({
          db_key: dbKey,
          proposed: finding.slice(0, 200),
          existing_preview: existing.slice(0, 120),
          skip_reason: "equal_or_higher_assertion",
        });
        continue;
      }
      skips.push({
        db_key: dbKey,
        proposed: finding.slice(0, 200),
        existing_preview: existing.slice(0, 120),
        skip_reason: "existing_value",
      });
      continue;
    }

    patches.push({ dbKey, value });
  }

  return { patches, skips };
}

export function mergeOpportunityIntelligenceContactPatch(
  contact: Record<string, unknown>,
  patches: OpportunityIntelligenceFieldPatch[],
): Record<string, unknown> {
  if (!patches.length) return contact;
  const next = { ...contact };
  for (const patch of patches) {
    if (
      !patch.upgrade &&
      fieldHasIntelligenceSignal(patch.dbKey, next[patch.dbKey] as string | null | undefined)
    ) {
      continue;
    }
    next[patch.dbKey] = patch.value;
  }
  return next;
}
