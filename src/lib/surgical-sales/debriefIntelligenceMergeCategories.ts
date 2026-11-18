/**
 * Intelligence-type-aware merge — categories only conflict within themselves.
 */

import type { ClinicalIntelligenceSignal } from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import {
  CLINICAL_STORAGE_SEPARATOR,
  clinicalSignalFromLabel,
  mergeProcedureFocusFieldValue,
  normalizeClinicalIntelligenceFromFact,
  parseClinicalStorageValue,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { contactUpdateCorroboratesExisting } from "@/lib/surgical-sales/contactEntityIdentity";
import type { DebriefAtomicFactType } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { DebriefFactClassification } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import type {
  LogUpdateConflictResolution,
  LogUpdateFieldConflict,
} from "@/lib/surgical-sales/logUpdateFieldTypes";

export const DEBRIEF_INTELLIGENCE_MERGE_CATEGORIES = [
  "contacts",
  "observation_access",
  "workflow_intelligence",
  "clinical_procedures",
  "clinical_trends",
  "clinical_pain_points",
  "opportunity_signals",
  "follow_ups",
] as const;

export type DebriefIntelligenceMergeCategory = (typeof DEBRIEF_INTELLIGENCE_MERGE_CATEGORIES)[number];

export const DEBRIEF_INTELLIGENCE_MERGE_CATEGORY_LABELS: Record<DebriefIntelligenceMergeCategory, string> = {
  contacts: "Contacts",
  observation_access: "Observation Access",
  workflow_intelligence: "Workflow Intelligence",
  clinical_procedures: "Clinical Procedures",
  clinical_trends: "Clinical Trends",
  clinical_pain_points: "Clinical Pain Points",
  opportunity_signals: "Commercial Landscape",
  follow_ups: "Follow-Ups",
};

const CLINICAL_TREND_SIGNALS = new Set<ClinicalIntelligenceSignal>([
  "increasing_procedure_volume",
  "increasing_case_volume",
  "new_procedure_adoption",
]);

const CLINICAL_VALUE_DB_KEYS = new Set([
  "provider_procedure_focus",
  "provider_clinical_frustrations",
  "provider_workflow_pain_points",
  "provider_staff_frustrations",
  "provider_dissatisfaction_areas",
  "provider_technique_preferences",
  "provider_future_opportunity_signals",
  "provider_case_volume_estimate",
]);

export const CATEGORY_AWARE_MERGE_DB_KEYS = CLINICAL_VALUE_DB_KEYS;

export function classificationToMergeCategory(
  classification: DebriefFactClassification,
): DebriefIntelligenceMergeCategory | null {
  switch (classification) {
    case "scheduling":
    case "workflow_participant":
      return "contacts";
    case "observation_access":
    case "credentialing":
      return "observation_access";
    case "clinical_focus":
      return "clinical_procedures";
    case "product_fit":
      return "opportunity_signals";
    case "next_step":
      return "follow_ups";
    default:
      return null;
  }
}

export const DB_KEY_DEFAULT_CATEGORY: Record<string, DebriefIntelligenceMergeCategory> = {
  provider_scheduling_contact: "contacts",
  provider_observation_coordinator_contact: "contacts",
  provider_facility_scheduling_contact: "contacts",
  provider_or_team_dynamics: "contacts",
  provider_observation_feasibility: "observation_access",
  provider_observation_access_path: "observation_access",
  provider_observation_credentialing_needed: "observation_access",
  provider_ideal_observation_cases: "observation_access",
  provider_observation_best_days_case_types: "workflow_intelligence",
  provider_observation_scheduling_control: "workflow_intelligence",
  provider_observation_cadence_preference: "workflow_intelligence",
  provider_workflow_pain_points: "clinical_pain_points",
  provider_clinical_frustrations: "clinical_pain_points",
  provider_staff_frustrations: "clinical_pain_points",
  provider_dissatisfaction_areas: "clinical_pain_points",
  provider_technique_preferences: "workflow_intelligence",
  provider_procedure_focus: "clinical_procedures",
  provider_case_volume_estimate: "clinical_trends",
  provider_product_interests: "opportunity_signals",
  provider_future_opportunity_signals: "opportunity_signals",
  provider_evaluation_openness: "opportunity_signals",
  provider_preference_card_signals: "opportunity_signals",
  provider_competitive_products: "opportunity_signals",
  provider_product_gaps: "opportunity_signals",
  provider_credentialing_status: "observation_access",
  provider_credentialing_platform_name: "observation_access",
};

export function mergeCategoryForClinicalSignal(
  signal: ClinicalIntelligenceSignal,
): DebriefIntelligenceMergeCategory {
  if (signal === "clinical_frustration") return "clinical_pain_points";
  if (signal === "product_opportunity") return "opportunity_signals";
  if (signal === "technology_preference") return "workflow_intelligence";
  if (CLINICAL_TREND_SIGNALS.has(signal)) return "clinical_trends";
  return "clinical_procedures";
}

export function dbKeyForClinicalIntelligenceSignal(signal: ClinicalIntelligenceSignal): string {
  switch (signal) {
    case "clinical_frustration":
      return "provider_clinical_frustrations";
    case "product_opportunity":
      return "provider_future_opportunity_signals";
    case "technology_preference":
      return "provider_technique_preferences";
    case "increasing_procedure_volume":
    case "increasing_case_volume":
    case "new_procedure_adoption":
      return "provider_case_volume_estimate";
    default:
      return "provider_procedure_focus";
  }
}

function fieldIsPopulated(value: string): boolean {
  const t = value.trim();
  return t.length > 0 && t.toLowerCase() !== "unknown";
}

/**
 * Placeholder-grade values that should never win a merge decision against a
 * meaningful value: "General", "Unknown", "discussed", "procedure", etc.
 * Generic existing + specific proposed ⇒ auto-replace (no rep decision).
 * Generic proposed + specific existing ⇒ no conflict (and callers skip the write).
 */
const GENERIC_INTELLIGENCE_VALUE_RE =
  /^(?:general(?:\s+surgery)?|generic|unknown|unclear|unspecified|not\s+specified|not\s+sure|none|n\/?a|tbd|to\s+be\s+determined|pending|misc(?:ellaneous)?|various|procedures?|discussed|mentioned|noted|captured|product\s+fit\s+discussed|relationship\s+discussed|scheduling\s+discussed|process)$/i;

export function isGenericIntelligenceValue(value: string): boolean {
  const t = value.trim().replace(/[.!?]+$/, "").trim();
  if (!t) return true;
  // Multi-segment stored values carry at least one real segment — never generic.
  if (/[|\n;]/.test(t)) return false;
  if (GENERIC_INTELLIGENCE_VALUE_RE.test(t)) return true;
  // Clinical storage values ("General · Procedure focus area") are generic when
  // the procedure half is a placeholder.
  const parsed = parseClinicalStorageValue(t);
  if (parsed && GENERIC_INTELLIGENCE_VALUE_RE.test(parsed.procedureFocus.trim())) return true;
  return false;
}

/**
 * A proposed value only deserves a write (or a merge decision) when it adds
 * information: anything beats blank/unknown; specific beats generic; generic
 * never overwrites or appends onto specific.
 */
export function proposedIntelligenceAddsValue(existing: string, proposed: string): boolean {
  if (!proposed.trim()) return false;
  if (!fieldIsPopulated(existing)) return !isGenericIntelligenceValue(proposed);
  if (isGenericIntelligenceValue(proposed) && !isGenericIntelligenceValue(existing)) return false;
  return true;
}

function normalizeCompare(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function plainValuesConflict(existing: string, proposed: string): boolean {
  const a = normalizeCompare(existing);
  const b = normalizeCompare(proposed);
  if (!fieldIsPopulated(existing)) return false;
  if (!b) return false;
  if (a === b) return false;
  if (a.includes(b) || b.includes(a)) return false;
  return true;
}

function inferClinicalCategoryFromSegment(segment: string): DebriefIntelligenceMergeCategory | null {
  const parsed = parseClinicalStorageValue(segment);
  if (parsed) {
    const signal = clinicalSignalFromLabel(parsed.signalLabel) ?? "procedure_focus";
    return mergeCategoryForClinicalSignal(signal);
  }
  const normalized = normalizeClinicalIntelligenceFromFact({ value: segment, evidence: segment });
  if (normalized) return mergeCategoryForClinicalSignal(normalized.signal);
  if (/\b(?:frustrat|pain point|challenge|visualization|fixation|difficult)\b/i.test(segment)) {
    return "clinical_pain_points";
  }
  if (/\b(?:increasing|volume|trend|adoption)\b/i.test(segment)) return "clinical_trends";
  return "clinical_procedures";
}

export function resolveIntelligenceMergeCategory(input: {
  dbKey: string;
  value?: string;
  clinicalSignal?: ClinicalIntelligenceSignal;
  factType?: DebriefAtomicFactType;
  classification?: DebriefFactClassification;
}): DebriefIntelligenceMergeCategory {
  const fromClassification = input.classification
    ? classificationToMergeCategory(input.classification)
    : null;
  if (fromClassification) {
    if (input.classification === "clinical_focus" && input.clinicalSignal) {
      return mergeCategoryForClinicalSignal(input.clinicalSignal);
    }
    return fromClassification;
  }

  if (input.factType === "follow_up") return "follow_ups";
  if (input.factType === "workflow_contact" || input.factType === "scheduling") return "contacts";
  if (input.factType === "observation_access" || input.factType === "credentialing") {
    return "observation_access";
  }
  if (input.clinicalSignal) return mergeCategoryForClinicalSignal(input.clinicalSignal);

  const dbDefault = DB_KEY_DEFAULT_CATEGORY[input.dbKey];
  if (dbDefault && !CLINICAL_VALUE_DB_KEYS.has(input.dbKey)) {
    return dbDefault;
  }

  if (input.value && CLINICAL_VALUE_DB_KEYS.has(input.dbKey)) {
    return inferClinicalCategoryFromSegment(input.value) ?? dbDefault ?? "clinical_procedures";
  }

  return dbDefault ?? "workflow_intelligence";
}

function splitStoredSegments(value: string): string[] {
  return value
    .split(/\||\n|;/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function segmentsForCategory(
  value: string,
  category: DebriefIntelligenceMergeCategory,
  dbKey: string,
): string[] {
  if (!fieldIsPopulated(value)) return [];
  const defaultCategory = DB_KEY_DEFAULT_CATEGORY[dbKey];
  if (!value.includes(CLINICAL_STORAGE_SEPARATOR) && !value.includes("|")) {
    if (defaultCategory === category || inferClinicalCategoryFromSegment(value) === category) {
      return [value.trim()];
    }
    return [];
  }
  return splitStoredSegments(value).filter(
    (segment) => inferClinicalCategoryFromSegment(segment) === category,
  );
}

export function mergeIntelligenceFieldValue(
  category: DebriefIntelligenceMergeCategory,
  existing: string,
  incoming: string,
  dbKey: string,
): string {
  if (!fieldIsPopulated(existing)) return incoming.trim();
  if (!incoming.trim()) return existing.trim();

  if (
    category === "clinical_pain_points" ||
    dbKey === "provider_workflow_pain_points" ||
    dbKey === "provider_clinical_frustrations" ||
    dbKey === "provider_staff_frustrations"
  ) {
    return mergePainPointFieldValue(existing, incoming);
  }

  if (category === "contacts") {
    return incoming.trim() || existing.trim();
  }

  const existingCategory = resolveIntelligenceMergeCategory({ dbKey, value: existing });
  const incomingCategory = resolveIntelligenceMergeCategory({ dbKey, value: incoming });

  if (existingCategory !== incomingCategory) {
    return mergeProcedureFocusFieldValue(existing, incoming);
  }

  if (category === "observation_access" && dbKey === "provider_observation_feasibility") {
    return incoming.trim();
  }

  return mergeProcedureFocusFieldValue(existing, incoming);
}

/** Append distinct workflow/pain labels — do not use procedure-focus cleaner on OR efficiency lines. */
export function mergePainPointFieldValue(existing: string, incoming: string): string {
  const seen = new Set<string>();
  const segments: string[] = [];
  for (const part of `${existing}|${incoming}`.split(/\||\n/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    segments.push(trimmed);
  }
  return segments.join(" | ");
}

function observationApprovalRank(value: string): number {
  const token = value.trim().toLowerCase();
  if (!token) return 0;
  if (/^(approved|yes|easy)$/.test(token)) return 4;
  if (/\bobservation\s+approval:\s*yes\b/i.test(value)) return 4;
  if (/^(interested|mentioned)$/.test(token)) return 3;
  if (/\bobservation\s+interest:\s*yes\b/i.test(value) && /\bobservation\s+approval:\s*no\b/i.test(value)) {
    return 3;
  }
  if (/\b(?:discussed|mentioned|interest|open|not opposed)\b/i.test(value)) return 2;
  if (/^(denied|no|blocked)$/.test(token)) return -1;
  return 1;
}

export function shouldRecommendObservationApprovalReplace(
  existing: string,
  proposed: string,
): boolean {
  const existingRank = observationApprovalRank(existing);
  const proposedRank = observationApprovalRank(proposed);
  return proposedRank > existingRank && existingRank >= 2 && proposedRank >= 3;
}

function observationApprovalConflict(input: {
  dbKey: string;
  existingValue: string;
  proposedValue: string;
}): LogUpdateFieldConflict | null | "no_conflict" {
  const existingRank = observationApprovalRank(input.existingValue);
  const proposedRank = observationApprovalRank(input.proposedValue);

  // "Discussed" → "Interested" → "Approved" is a normal maturity progression,
  // not a rep-facing Replace/Keep-both decision.
  if (input.dbKey === "provider_observation_feasibility" && existingRank >= 2 && proposedRank >= 2) {
    if (proposedRank > existingRank) {
      return {
        dbKey: input.dbKey,
        existingValue: input.existingValue,
        newValue: input.proposedValue,
        resolution: "replace" as LogUpdateConflictResolution,
      };
    }
    return "no_conflict";
  }

  return null;
}

export function intelligenceFieldConflict(input: {
  dbKey: string;
  existingValue: string;
  proposedValue: string;
  clinicalSignal?: ClinicalIntelligenceSignal;
  factType?: DebriefAtomicFactType;
  classification?: DebriefFactClassification;
}): LogUpdateFieldConflict | null {
  const { dbKey, existingValue, proposedValue } = input;
  if (!fieldIsPopulated(existingValue)) return null;
  if (!proposedValue.trim()) return null;

  // Entity identity before merge decisions: the same person re-confirmed in
  // the same contact slot ("Karen still handles scheduling" over a stored
  // Karen) corroborates the record — never a replace/keep-both decision.
  if (contactUpdateCorroboratesExisting({ dbKey, existingValue, proposedValue })) {
    return null;
  }

  if (dbKey === "provider_observation_feasibility") {
    const observationConflict = observationApprovalConflict({ dbKey, existingValue, proposedValue });
    if (observationConflict === "no_conflict") return null;
    if (observationConflict) return observationConflict;
  } else {
    // Low-quality conflict auto-resolution: never ask the rep to choose
    // between a placeholder and real intelligence.
    if (isGenericIntelligenceValue(existingValue) && !isGenericIntelligenceValue(proposedValue)) {
      return {
        dbKey,
        existingValue,
        newValue: proposedValue,
        resolution: "replace" as LogUpdateConflictResolution,
      };
    }
    if (isGenericIntelligenceValue(proposedValue)) {
      return null;
    }
  }

  const category = resolveIntelligenceMergeCategory({
    dbKey,
    value: proposedValue,
    clinicalSignal: input.clinicalSignal,
    factType: input.factType,
    classification: input.classification,
  });
  const existingCategory = resolveIntelligenceMergeCategory({
    dbKey,
    value: existingValue,
    classification: input.classification,
  });

  if (category !== existingCategory) {
    return null;
  }

  const existingSegments = segmentsForCategory(existingValue, category, dbKey);
  const proposedSegments = segmentsForCategory(proposedValue, category, dbKey);

  if (existingSegments.length > 0 && proposedSegments.length > 0) {
    const conflicts = proposedSegments.some((proposedSegment) =>
      existingSegments.some((existingSegment) => plainValuesConflict(existingSegment, proposedSegment)),
    );
    if (!conflicts) return null;
  } else if (!plainValuesConflict(existingValue, proposedValue)) {
    return null;
  }

  return {
    dbKey,
    existingValue,
    newValue: proposedValue,
    resolution: null,
  };
}

export function resolveClinicalDbKeyAndSignal(input: {
  value: string;
  evidence: string;
  attribute?: string;
}): { dbKey: string; clinicalSignal: ClinicalIntelligenceSignal; storageValue: string } | null {
  const normalized = normalizeClinicalIntelligenceFromFact(input);
  if (!normalized) return null;
  return {
    dbKey: dbKeyForClinicalIntelligenceSignal(normalized.signal),
    clinicalSignal: normalized.signal,
    storageValue: normalized.storageValue,
  };
}
