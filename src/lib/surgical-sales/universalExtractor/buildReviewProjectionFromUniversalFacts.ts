/**
 * UF review projection — authoritative clinical/product/procedure field updates
 * and review metadata from Universal Facts capture runs (Wave 1+2).
 */

import type { ClinicalIntelligenceSignal } from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import {
  CATEGORY_AWARE_MERGE_DB_KEYS,
  intelligenceFieldConflict,
  mergeIntelligenceFieldValue,
  resolveIntelligenceMergeCategory,
  resolveClinicalDbKeyAndSignal,
  type DebriefIntelligenceMergeCategory,
} from "@/lib/surgical-sales/debriefIntelligenceMergeCategories";
import { resolveIntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeInference";
import { resolveIntelligenceSaveDestination } from "@/lib/surgical-sales/intelligenceSaveDestination";
import { isLowQualityIntelligenceText } from "@/lib/surgical-sales/operationalIntelligenceDisplay";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import {
  fieldLabelForDbKey,
  type LogUpdateRoutedFieldUpdate,
} from "@/lib/surgical-sales/logUpdateProviderRouting";
import { applyReviewSelectionDefaults } from "@/lib/surgical-sales/logUpdateReviewPresentation";
import { isGarbledProductName } from "@/lib/surgical-sales/sharedIntelligence/extractProductMention";
import { titleCaseProduct } from "@/lib/surgical-sales/sharedIntelligence/extractProductMention";
import { flattenDebriefUniversalFactsForReview } from "@/lib/surgical-sales/universalExtractor/adaptUniversalFactsToDebriefClinicalBrief";
import {
  filterDipFieldUpdatesToWorkflowOnly,
  UF_INTELLIGENCE_FIELD_DB_KEYS,
} from "@/lib/surgical-sales/universalExtractor/filterDipReviewToWorkflowSections";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import type { UniversalSurgicalFactRow } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import {
  resolveIntelligenceCategoryForFact,
  resolveSentimentReviewDbKey,
} from "@/lib/surgical-sales/universalExtractor/resolveIntelligenceCategoryForFact";
import { reviewProposedValueFromFact } from "@/lib/surgical-sales/universalExtractor/reviewProposedValueFromFact";

export type UniversalFactsReviewProjection = {
  logUpdate: LogUpdateParseResult;
  ufFactIdsByFieldUpdateId: Record<string, string[]>;
  intelligenceFieldUpdates: LogUpdateRoutedFieldUpdate[];
  workflowFieldUpdates: LogUpdateRoutedFieldUpdate[];
  authority: "uf";
};

const WORKFLOW_PAIN_CONCEPTS = new Set([
  "visualization_or_access_issue",
  "workflow_or_timing_issue",
  "placement_or_positioning_issue",
  "sizing_or_fit_issue",
  "inventory_availability_issue",
  "product_performance_issue",
  "staff_workflow",
]);

const SENTIMENT_AND_ACCESS_CONCEPTS = new Set(["provider_sentiment", "access_pathway"]);

const NEXT_STEP_CONCEPTS = new Set(["next_action"]);

const PRODUCT_INTELLIGENCE_DB_KEYS = new Set([
  "provider_competitive_products",
  "provider_current_vendors",
  "provider_product_interests",
]);

/** UF emits concise operational labels — do not apply card-quality heuristics here. */
const UF_STRUCTURED_INTELLIGENCE_DB_KEYS = new Set([
  ...PRODUCT_INTELLIGENCE_DB_KEYS,
  "provider_workflow_pain_points",
]);

function productProposedValue(fact: UniversalSurgicalFactRow): string | null {
  const product =
    fact.product_mentioned?.trim() ||
    fact.normalized_label.replace(/^competitor product:\s*/i, "").replace(/^current product:\s*/i, "").trim();
  if (!product || isGarbledProductName(product)) return null;

  const canonical = titleCaseProduct(product);
  const evidence = fact.evidence_text.trim();
  const procedureContextMatch = evidence.match(
    /\b(?:for|in)\s+many\s+of\s+(?:their|his|her)\s+(.{3,80}?)(?:\s+(?:procedures?|cases?))?\b/i,
  );
  if (procedureContextMatch?.[1]) {
    const context = procedureContextMatch[1]
      .trim()
      .replace(/\s+(?:procedures?|cases?)$/i, "")
      .trim();
    if (context) return `${canonical} — ${context}`;
  }
  return canonical;
}

function resolveUfIntelligenceField(
  fact: UniversalSurgicalFactRow,
): {
  dbKey: string;
  proposedValue: string;
  clinicalSignal?: ClinicalIntelligenceSignal;
  mergeCategory: DebriefIntelligenceMergeCategory;
} | null {
  const concept = String(fact.concept);

  if (concept === "current_product" || concept === "competitor_product") {
    const proposedValue = productProposedValue(fact);
    if (!proposedValue) return null;
    return {
      dbKey: "provider_competitive_products",
      proposedValue,
      mergeCategory: "opportunity_signals",
    };
  }

  if (concept === "product_interest") {
    const proposedValue = reviewProposedValueFromFact(fact);
    if (!proposedValue) return null;
    return {
      dbKey: "provider_product_interests",
      proposedValue,
      mergeCategory: "opportunity_signals",
    };
  }

  if (
    concept === "procedure_volume_trend" ||
    concept === "procedure_focus" ||
    concept === "technology_preference"
  ) {
    const attribute =
      concept === "technology_preference" ? "Technique / Modality" : undefined;
    const resolved = resolveClinicalDbKeyAndSignal({
      value: fact.normalized_label.trim() || fact.evidence_text.trim(),
      evidence: fact.evidence_text.trim(),
      attribute,
    });
    if (!resolved) return null;
    const mergeCategory = resolveIntelligenceMergeCategory({
      dbKey: resolved.dbKey,
      value: resolved.storageValue,
      clinicalSignal: resolved.clinicalSignal,
    });
    return {
      dbKey: resolved.dbKey,
      proposedValue: resolved.storageValue,
      clinicalSignal: resolved.clinicalSignal,
      mergeCategory,
    };
  }

  if (WORKFLOW_PAIN_CONCEPTS.has(concept)) {
    if (
      concept === "staff_workflow" &&
      /team influence on case flow|positive staff workflow observed/i.test(fact.normalized_label ?? "")
    ) {
      return null;
    }
    const proposedValue = reviewProposedValueFromFact(fact);
    if (!proposedValue) return null;
    return {
      dbKey: "provider_workflow_pain_points",
      proposedValue,
      mergeCategory: "clinical_pain_points",
    };
  }

  if (concept === "access_pathway") {
    const proposedValue = reviewProposedValueFromFact(fact);
    if (!proposedValue) return null;
    return {
      dbKey: "provider_observation_access_path",
      proposedValue,
      mergeCategory: "observation_access",
    };
  }

  if (concept === "provider_sentiment") {
    // Soft relationship rapport ("positive first meeting", "open to continued discussion")
    // stays in the review surface / UF audit trail — do not write it into CRM profile fields.
    // Commercial disposition (not actively switching, observe-before-eval) still projects.
    const category = resolveIntelligenceCategoryForFact({
      concept: fact.concept,
      normalized_label: fact.normalized_label,
      evidence_text: fact.evidence_text,
    });
    if (category === "relationship_signal") return null;

    const proposedValue = reviewProposedValueFromFact(fact);
    if (!proposedValue) return null;
    const dbKey = resolveSentimentReviewDbKey({
      normalized_label: fact.normalized_label,
      evidence_text: fact.evidence_text,
    });
    return {
      dbKey,
      proposedValue,
      mergeCategory:
        dbKey === "provider_communication_style"
          ? "workflow_intelligence"
          : "opportunity_signals",
    };
  }

  if (concept === "contact_role") {
    const person =
      fact.person_mentioned?.trim() ||
      fact.normalized_label.split("·")[0]?.trim() ||
      fact.normalized_label.trim();
    if (!person) return null;
    const role = fact.normalized_label.includes("·")
      ? fact.normalized_label.split("·").slice(1).join("·").trim()
      : "Scheduling Coordinator";
    return {
      dbKey: "provider_scheduling_contact",
      proposedValue: `${person} · ${role}`,
      mergeCategory: "contacts",
    };
  }

  if (concept === "credentialing_requirement") {
    const proposedValue = fact.normalized_label.trim() || fact.evidence_text.trim();
    if (!proposedValue) return null;
    return {
      dbKey: "provider_observation_credentialing_needed",
      proposedValue,
      mergeCategory: "observation_access",
    };
  }

  if (concept === "next_action") {
    return null;
  }

  return null;
}

/** Project UF facts into provider intelligence field update rows. */
export function buildIntelligenceFieldUpdatesFromUniversalFacts(input: {
  debriefRuns: UniversalFactExtractionRun[];
  existingFields: Record<string, string>;
  sourceText: string;
}): {
  fieldUpdates: LogUpdateRoutedFieldUpdate[];
  ufFactIdsByFieldUpdateId: Record<string, string[]>;
} {
  const facts = flattenDebriefUniversalFactsForReview(input.debriefRuns);
  const rows: LogUpdateRoutedFieldUpdate[] = [];
  const ufFactIdsByFieldUpdateId: Record<string, string[]> = {};
  const seenDbKeys = new Set<string>();

  for (const [index, fact] of facts.entries()) {
    const resolved = resolveUfIntelligenceField(fact);
    if (!resolved || !UF_INTELLIGENCE_FIELD_DB_KEYS.has(resolved.dbKey)) continue;

    const { dbKey, proposedValue, clinicalSignal, mergeCategory } = resolved;
    if (!proposedValue.trim()) continue;
    if (isLowQualityIntelligenceText(proposedValue) && !UF_STRUCTURED_INTELLIGENCE_DB_KEYS.has(dbKey)) continue;

    const existingValue = String(input.existingFields[dbKey] ?? "").trim();

    if (seenDbKeys.has(dbKey)) {
      if (dbKey === "provider_product_interests") {
        const prior = rows.find((row) => row.dbKey === dbKey);
        if (prior && !prior.proposedValue.toLowerCase().includes(proposedValue.toLowerCase())) {
          prior.proposedValue = `${prior.proposedValue} | ${proposedValue}`;
          ufFactIdsByFieldUpdateId[prior.id] = [
            ...(ufFactIdsByFieldUpdateId[prior.id] ?? []),
            fact.id,
          ];
        }
        continue;
      }
      if (!CATEGORY_AWARE_MERGE_DB_KEYS.has(dbKey)) continue;
      const prior = rows.find((row) => row.dbKey === dbKey);
      if (prior) {
        prior.proposedValue = mergeIntelligenceFieldValue(
          mergeCategory,
          prior.proposedValue,
          proposedValue,
          dbKey,
        );
        prior.conflict =
          intelligenceFieldConflict({
            dbKey,
            existingValue,
            proposedValue: prior.proposedValue,
            clinicalSignal,
          }) ?? prior.conflict;
        ufFactIdsByFieldUpdateId[prior.id] = [
          ...(ufFactIdsByFieldUpdateId[prior.id] ?? []),
          fact.id,
        ];
      }
      continue;
    }

    const scope = resolveIntelligenceScope({
      domain: dbKey.includes("competitive") || dbKey.includes("vendor") ? "procurement" : "case_mix",
      text: `${proposedValue} ${fact.evidence_text}`,
      logUpdateTarget: "provider",
    });
    const destination = resolveIntelligenceSaveDestination({
      scope: scope.scope,
      text: proposedValue,
      dbKey,
      logUpdateTarget: "provider",
    });

    if (destination.destination === "engagement_note" || scope.scope === "case") continue;

    const conflict = intelligenceFieldConflict({
      dbKey,
      existingValue,
      proposedValue,
      clinicalSignal,
    });

    const id = `uf-field-${index}-${dbKey}`;
    seenDbKeys.add(dbKey);
    rows.push({
      id,
      label: fieldLabelForDbKey(dbKey),
      dbKey,
      proposedValue,
      accepted: fact.confidence === "high" && (!conflict || conflict.resolution === "replace"),
      conflict,
      proposedScope: scope.scope,
      scopeReason: scope.reason,
      proposedDestination: destination.destination,
      destinationReason: destination.reason,
    });
    ufFactIdsByFieldUpdateId[id] = [fact.id];
  }

  return { fieldUpdates: rows, ufFactIdsByFieldUpdateId };
}

/**
 * Compose authoritative debrief logUpdate for review:
 * UF intelligence fieldUpdates + DWP workflow fieldUpdates from stripped DIP parse.
 */
export function buildReviewProjectionFromUniversalFacts(input: {
  dictation: string;
  debriefRuns: UniversalFactExtractionRun[];
  workflowLogUpdate: LogUpdateParseResult;
  existingFields: Record<string, string>;
}): UniversalFactsReviewProjection {
  const { fieldUpdates: intelligenceFieldUpdates, ufFactIdsByFieldUpdateId } =
    buildIntelligenceFieldUpdatesFromUniversalFacts({
      debriefRuns: input.debriefRuns,
      existingFields: input.existingFields,
      sourceText: input.dictation,
    });

  const workflowFieldUpdates = filterDipFieldUpdatesToWorkflowOnly(
    input.workflowLogUpdate.fieldUpdates,
  );

  const fieldUpdates = [...intelligenceFieldUpdates, ...workflowFieldUpdates];

  const logUpdate = applyReviewSelectionDefaults({
    ...input.workflowLogUpdate,
    sourceText: input.dictation.trim(),
    fieldUpdates,
    suggestedUpdates: fieldUpdates.map((update) => ({
      id: update.id,
      label: update.label,
      accepted: update.accepted,
    })),
    usesProviderIntelligence: true,
    debriefUniversalFactsRuns: input.debriefRuns,
    mappingSource: input.workflowLogUpdate.mappingSource ?? "openai",
  });

  return {
    logUpdate,
    ufFactIdsByFieldUpdateId,
    intelligenceFieldUpdates,
    workflowFieldUpdates,
    authority: "uf",
  };
}

export { stripDipLogUpdateToWorkflowOnly } from "@/lib/surgical-sales/universalExtractor/filterDipReviewToWorkflowSections";
