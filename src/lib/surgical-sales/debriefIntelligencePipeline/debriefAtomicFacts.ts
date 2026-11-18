/**
 * Canonical debrief intelligence — atomic structured facts (single source of truth).
 * Transcript → OpenAI facts → normalize → dedupe → classify → cards → persistence.
 */

import { z } from "zod";
import type { AiNoteCaptureContext } from "@/lib/surgical-sales/aiNoteCapture/types";
import { quoteIsAnchoredInDictation } from "@/lib/surgical-sales/debriefDictationEvidence";
import {
  buildProposedContactFromExtraction,
  extractContactNamesFromDebriefText,
  type DebriefProposedContactItem,
} from "@/lib/surgical-sales/debriefDetectedContact";
import { isPlausiblePersonName } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import { contactUpdateCorroboratesExisting } from "@/lib/surgical-sales/contactEntityIdentity";
import { buildPreservedNamedEntity } from "@/lib/surgical-sales/namedEntityPreservation";
import {
  buildSchedulingReplacementProposedValue,
  detectSchedulingContactReplacement,
  isDepartedSchedulingOwner,
} from "@/lib/surgical-sales/schedulingContactOwnership";
import {
  shouldExcludeContactCandidate,
  type ReviewUpdateGuardContext,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateGuards";
import { mergeDuplicateDebriefAtomicFacts } from "@/lib/surgical-sales/sharedIntelligence/dedupeIntelligenceSignals";
import { normalizeSchedulerPersonName } from "@/lib/surgical-sales/sharedIntelligence/schedulerContactExtractionPolicy";
import { debriefExplicitProductFitConnection } from "@/lib/surgical-sales/debriefIntelligenceCategories";
import {
  CLINICAL_SIGNAL_LABEL,
  extractNormalizedClinicalIntelligenceFromSentence,
  formatClinicalStorageValue,
  normalizeClinicalIntelligenceFromFact,
  techniqueModalityFromText,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import {
  CATEGORY_AWARE_MERGE_DB_KEYS,
  intelligenceFieldConflict,
  mergeIntelligenceFieldValue,
  proposedIntelligenceAddsValue,
  resolveClinicalDbKeyAndSignal,
  resolveIntelligenceMergeCategory,
} from "@/lib/surgical-sales/debriefIntelligenceMergeCategories";
import type { DebriefFactClassification } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import { scoreFactKeyConfidence } from "@/lib/surgical-sales/debriefIntelligenceConfidence";
import {
  allExtractedRecords,
  emptyExtractedFacts,
  pushExtractedFact,
  type DebriefExtractedFactRecord,
  type DebriefExtractedFacts,
  type DebriefFactKey,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefFactKeys";
import type { DebriefRawFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import type {
  LogUpdateMappingSource,
  LogUpdateParseResult,
} from "@/lib/surgical-sales/logUpdateParseFreeform";
import {
  applyIntelligenceReversalsToFieldUpdates,
  fieldLabelForDbKey,
  routeLogUpdateToProviderFields,
  type LogUpdateRoutedFieldUpdate,
} from "@/lib/surgical-sales/logUpdateProviderRouting";
import { applyReviewSelectionDefaults } from "@/lib/surgical-sales/logUpdateReviewSelection";
import { workflowFieldUpdateRestatesConfirmedState } from "@/lib/surgical-sales/debriefWorkflowStateAuthority";
import { removeResolvedIntelligenceGaps } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefIntelligenceGapReconciliation";
import { pickDbKeyForScope } from "@/lib/surgical-sales/intelligenceMappingGuardrails";
import { resolveIntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeInference";
import { resolveIntelligenceSaveDestination } from "@/lib/surgical-sales/intelligenceSaveDestination";
import {
  PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS,
} from "@/lib/surgical-sales/intelligenceScopeInference";
import {
  isLowQualityIntelligenceText,
  sanitizeOperationalDisplayText,
} from "@/lib/surgical-sales/operationalIntelligenceDisplay";
import { DOMAIN_DB_KEY_CANDIDATES } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import type { IntelligenceDomain } from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import { runPass2Classification } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass2Classification";
import type { DebriefClassifiedFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import {
  isProductStatusToken,
  isValidProductName,
  evidenceStatesCurrentProductUsage,
  productInterestFactFromCurrentProductFact,
  supplementAtomicFactsWithProductIntelligence,
  textNamesKnownDebriefProduct,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductIntelligenceExtraction";

export const DEBRIEF_ATOMIC_FACT_TYPES = [
  "workflow_contact",
  "observation_access",
  "credentialing",
  "scheduling",
  "clinical_focus",
  "product_fit",
  "current_product",
  "relationship",
  "facility_intelligence",
  "follow_up",
] as const;

export type DebriefAtomicFactType = (typeof DEBRIEF_ATOMIC_FACT_TYPES)[number];

export const DebriefAtomicFactSchema = z.object({
  fact_type: z.enum(DEBRIEF_ATOMIC_FACT_TYPES),
  entity: z.string().max(200).default(""),
  attribute: z.string().min(1).max(120),
  value: z.string().min(1).max(2000),
  confidence: z.enum(["high", "medium", "low"]),
  evidence: z.string().min(8).max(2000),
});

export type DebriefAtomicFact = z.infer<typeof DebriefAtomicFactSchema>;

export const DebriefFactExtractionResultSchema = z.object({
  facts: z.array(DebriefAtomicFactSchema).max(64),
});

export type DebriefFactExtractionResult = z.infer<typeof DebriefFactExtractionResultSchema>;

const CONFIDENCE_TO_DISPLAY: Record<DebriefAtomicFact["confidence"], "High" | "Medium" | "Low"> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/**
 * Relationship trivia ("how responsive they are", "follow-up rhythm", "open
 * to workflow discussion") never surfaces a business outcome in review, so it
 * is excluded from review-worthy field updates. The full note is still saved.
 */
export const LOW_SIGNAL_REVIEW_DB_KEYS = new Set([
  "provider_responsiveness",
  "provider_follow_up_approach",
  "provider_evaluation_openness",
]);

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/[\s-]+/g, "_");
}

function supplementAtomicFactsWithClinicalIntelligence(
  facts: DebriefAtomicFact[],
  dictation: string,
): DebriefAtomicFact[] {
  const text = dictation.trim();
  if (!text) return facts;

  const merged = [...facts];
  const seen = new Set(
    facts
      .filter((fact) => fact.fact_type === "clinical_focus")
      .map((fact) => {
        const normalized = normalizeClinicalIntelligenceFromFact({
          value: fact.value,
          evidence: fact.evidence,
          attribute: fact.attribute,
        });
        return normalized?.dedupeKey ?? `${fact.attribute}|${fact.value}`.toLowerCase();
      }),
  );

  const sentences = text.split(/(?<=[.!?])\s+/).filter((part) => part.trim().length >= 12);
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    for (const normalized of extractNormalizedClinicalIntelligenceFromSentence(trimmed)) {
      if (seen.has(normalized.dedupeKey)) continue;
      if (!quoteIsAnchoredInDictation(trimmed.replace(/^["']|["']$/g, ""), text)) continue;
      seen.add(normalized.dedupeKey);
      merged.push({
        fact_type: "clinical_focus",
        entity: "",
        attribute: normalized.signal,
        value: normalized.storageValue,
        confidence: "medium",
        evidence: trimmed,
      });
    }
  }

  return merged;
}

function supplementAtomicFactsWithWorkflowContacts(
  facts: DebriefAtomicFact[],
  dictation: string,
): DebriefAtomicFact[] {
  const text = dictation.trim();
  if (!text) return facts;

  const sourceFacts = facts.map((fact) => repairWorkflowContactFactEntity(fact, text));
  const merged = [...sourceFacts];
  const seenNames = new Set(
    sourceFacts
      .filter((fact) => fact.fact_type === "workflow_contact" || fact.fact_type === "scheduling")
      .map((fact) => normalizeSchedulerPersonName(fact.entity).toLowerCase())
      .filter((name) => name && isPlausiblePersonName(name))
      .filter(Boolean),
  );

  for (const contact of extractContactNamesFromDebriefText(text)) {
    const name = contact.name.trim();
    const key = name.toLowerCase();
    if (!name || !isPlausiblePersonName(name) || seenNames.has(key)) continue;
    if (contact.mentionLevel === "mentioned_person") continue;

    seenNames.add(key);
    const evidence = contact.quote?.trim() || text.slice(0, Math.min(240, text.length));
    merged.push({
      fact_type: "workflow_contact",
      entity: name,
      attribute: "scheduling_coordinator",
      value: "Scheduling Coordinator",
      confidence: contact.mentionLevel === "confirmed_support_contact" ? "high" : "medium",
      evidence,
    });
  }

  for (const fact of sourceFacts) {
    if (fact.fact_type !== "follow_up") continue;
    const blob = `${fact.value} ${fact.evidence}`;
    const identifyMatch = blob.match(
      /\b(?:identify|get|obtain|find)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:'s)?\s+contact\b/i,
    );
    const name = identifyMatch?.[1]?.trim();
    if (!name || !isPlausiblePersonName(name)) continue;
    const key = name.toLowerCase();
    if (seenNames.has(key)) continue;
    if (!/\bschedul|coordinat|office\b/i.test(blob)) continue;

    seenNames.add(key);
    merged.push({
      fact_type: "workflow_contact",
      entity: name,
      attribute: "scheduling_coordinator",
      value: "Scheduling Coordinator",
      confidence: fact.confidence,
      evidence: fact.evidence.trim() || fact.value.trim(),
    });
  }

  return merged;
}

function repairWorkflowContactFactEntity(fact: DebriefAtomicFact, dictation: string): DebriefAtomicFact {
  if (fact.fact_type !== "workflow_contact" && fact.fact_type !== "scheduling") return fact;
  const normalized = normalizeSchedulerPersonName(fact.entity.trim());
  if (normalized && isPlausiblePersonName(normalized)) return { ...fact, entity: normalized };

  const contactText = `${fact.evidence} ${fact.value} ${dictation}`.trim();
  const replacement = extractContactNamesFromDebriefText(contactText).find(
    (contact) => contact.mentionLevel !== "mentioned_person" && isPlausiblePersonName(contact.name),
  );
  if (!replacement) return fact;
  return {
    ...fact,
    entity: replacement.name,
    evidence: fact.evidence.trim() || replacement.quote,
  };
}

function bareEvidence(evidence: string): string {
  return evidence.trim().replace(/^["']+|["']+$/g, "").trim();
}

function atomicDedupeKey(fact: DebriefAtomicFact): string {
  return [
    fact.fact_type,
    slug(fact.entity),
    slug(fact.attribute),
    slug(fact.value).slice(0, 80),
  ].join("|");
}

export type DebriefAtomicFactRejectionReason =
  | "schema_invalid"
  | "evidence_too_short"
  | "evidence_not_anchored"
  | "invalid_product_entity";

export type DebriefAtomicFactRejection = {
  fact_type: string;
  entity: string;
  attribute: string;
  reason: DebriefAtomicFactRejectionReason;
};

function rejectionFromRow(row: unknown, reason: DebriefAtomicFactRejectionReason): DebriefAtomicFactRejection {
  const obj = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
  return {
    fact_type: String(obj.fact_type ?? ""),
    entity: String(obj.entity ?? ""),
    attribute: String(obj.attribute ?? ""),
    reason,
  };
}

/** Normalize raw model facts — anchor evidence, drop invalid rows, report drops. */
export function normalizeAtomicFactsWithRejections(
  raw: DebriefAtomicFact[],
  dictation: string,
): { facts: DebriefAtomicFact[]; rejected: DebriefAtomicFactRejection[] } {
  const text = dictation.trim();
  const out: DebriefAtomicFact[] = [];
  const rejected: DebriefAtomicFactRejection[] = [];

  for (const row of raw) {
    const parsed = DebriefAtomicFactSchema.safeParse(row);
    if (!parsed.success) {
      rejected.push(rejectionFromRow(row, "schema_invalid"));
      continue;
    }

    const fact = parsed.data;
    const evidence = bareEvidence(fact.evidence);
    if (evidence.length < 8) {
      rejected.push(rejectionFromRow(fact, "evidence_too_short"));
      continue;
    }
    const anchoredText = text.replace(/[\u2018\u2019\u2032]/g, "'").replace(/[\u201C\u201D\u2033]/g, '"');
    const anchoredEvidence = evidence.replace(/[\u2018\u2019\u2032]/g, "'").replace(/[\u201C\u201D\u2033]/g, '"');
    if (anchoredText && !quoteIsAnchoredInDictation(anchoredEvidence, anchoredText)) {
      rejected.push(rejectionFromRow(fact, "evidence_not_anchored"));
      continue;
    }

    out.push({
      ...fact,
      entity: fact.entity.trim(),
      attribute: fact.attribute.trim(),
      value: sanitizeOperationalDisplayText(fact.value.trim()) || fact.value.trim(),
      evidence,
    });
  }

  const facts = out.flatMap((fact): DebriefAtomicFact[] => {
    // Taxonomy correction: "robotic" (and other techniques) is a clinical
    // modality, not a product/competitor. Re-type model facts that put a
    // technique on the product axis.
    if (
      (fact.fact_type === "current_product" || fact.fact_type === "product_fit") &&
      fact.attribute !== "evidence_gap"
    ) {
      const technique = techniqueModalityFromText(`${fact.entity} ${fact.value} ${fact.evidence}`);
      const namesRealProduct = isValidProductName(fact.entity) || /\bACSIS\b/i.test(`${fact.value} ${fact.evidence}`);
      if (technique && !namesRealProduct) {
        return [{
          ...fact,
          fact_type: "clinical_focus" as const,
          entity: "",
          attribute: "technology_preference",
          value: formatClinicalStorageValue(technique, CLINICAL_SIGNAL_LABEL.technology_preference),
        }];
      }
    }
    // Product facts require a real product entity. Status tokens ("unknown",
    // "unclear") or junk entities with no known product in value/evidence are
    // demoted to evidence gaps — never product intelligence cards.
    if (
      (fact.fact_type === "current_product" || fact.fact_type === "product_fit") &&
      fact.attribute !== "evidence_gap" &&
      fact.entity.trim()
    ) {
      const entity = fact.entity.trim();
      const invalidEntity = isProductStatusToken(entity) || !isValidProductName(entity);
      if (invalidEntity && !textNamesKnownDebriefProduct(`${fact.value} ${fact.evidence}`)) {
        rejected.push(rejectionFromRow(fact, "invalid_product_entity"));
        return [{
          ...fact,
          entity: "",
          attribute: "evidence_gap",
        }];
      }
    }
    if (
      fact.fact_type === "current_product" &&
      fact.attribute !== "evidence_gap" &&
      fact.entity.trim() &&
      !evidenceStatesCurrentProductUsage(`${fact.value} ${fact.evidence}`)
    ) {
      return [productInterestFactFromCurrentProductFact(fact)];
    }
    if (fact.fact_type !== "clinical_focus") return [fact];
    const normalized = normalizeClinicalIntelligenceFromFact({
      value: fact.value,
      evidence: fact.evidence,
      attribute: fact.attribute,
    });
    if (!normalized) return [];
    return [{
      ...fact,
      attribute: normalized.signal,
      value: normalized.storageValue,
    }];
  });

  return { facts, rejected };
}

/** Normalize raw model facts — anchor evidence, drop invalid rows. */
export function normalizeAtomicFacts(
  raw: DebriefAtomicFact[],
  dictation: string,
): DebriefAtomicFact[] {
  return normalizeAtomicFactsWithRejections(raw, dictation).facts;
}

/** Merge duplicate atomic facts — keep highest confidence, longest evidence. */
export function dedupeAtomicFacts(facts: DebriefAtomicFact[]): DebriefAtomicFact[] {
  const rank = { high: 3, medium: 2, low: 1 } as const;
  const byKey = new Map<string, DebriefAtomicFact>();

  for (const fact of facts) {
    const key = atomicDedupeKey(fact);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, fact);
      continue;
    }
    const keep =
      rank[fact.confidence] > rank[existing.confidence]
        ? fact
        : rank[fact.confidence] === rank[existing.confidence] &&
            fact.evidence.length > existing.evidence.length
          ? fact
          : existing;
    byKey.set(key, keep);
  }

  return [...byKey.values()];
}

export function normalizeAndDedupeAtomicFactsWithRejections(
  raw: DebriefAtomicFact[],
  dictation: string,
): { facts: DebriefAtomicFact[]; rejected: DebriefAtomicFactRejection[] } {
  const { facts: normalizedFacts, rejected } = normalizeAtomicFactsWithRejections(raw, dictation);
  const normalized = dedupeAtomicFacts(normalizedFacts);
  const facts = mergeDuplicateDebriefAtomicFacts(
    dedupeAtomicFacts(
      supplementAtomicFactsWithClinicalIntelligence(
        supplementAtomicFactsWithWorkflowContacts(
          supplementAtomicFactsWithProductIntelligence(normalized, dictation),
          dictation,
        ),
        dictation,
      ),
    ),
  );
  return { facts, rejected };
}

export function normalizeAndDedupeAtomicFacts(
  raw: DebriefAtomicFact[],
  dictation: string,
): DebriefAtomicFact[] {
  return normalizeAndDedupeAtomicFactsWithRejections(raw, dictation).facts;
}

function resolveFactKey(fact: DebriefAtomicFact): DebriefFactKey | null {
  const attr = slug(fact.attribute);
  const val = fact.value.toLowerCase();
  const entity = fact.entity.trim();

  switch (fact.fact_type) {
    case "workflow_contact": {
      if (entity && /\b(?:@[a-z0-9.-]+\.[a-z]{2,}|\(\d{3}\)|\d{3}[-.\s]\d{3})\b/i.test(fact.evidence)) {
        return "workflow_person_with_contact_info";
      }
      if (/schedul/i.test(`${attr} ${val} ${fact.evidence}`)) {
        return entity ? "scheduling_person_named" : "scheduling_discussed";
      }
      return entity ? "workflow_person_named" : null;
    }
    case "scheduling":
      return entity ? "scheduling_person_named" : "scheduling_discussed";
    case "observation_access": {
      // Negation guard: "not approved", "no observation was approved", "approval
      // pending" must never read as explicit approval — they signal interest /
      // an access pathway under discussion, not a denial either.
      const negatedApproval =
        /\b(?:no|not|nothing|without|pending|awaiting|needs?|wasn'?t|was not|isn'?t|hasn'?t|haven'?t)\b[^.!?;]{0,32}\b(?:approv|grant|clear)/i.test(
          val,
        ) || /\b(?:approval|permission)\s+(?:pending|needed|required|not)\b/i.test(val);
      if (/\bdenied|not allow|won'?t allow|refused|shut (?:that |it )?down\b/i.test(val)) {
        return "observation_denied";
      }
      if (!negatedApproval && /approved|granted|cleared|permission|yes we can observe|can observe/i.test(val)) {
        return "observation_approved_explicit";
      }
      if (
        negatedApproval ||
        /interest|not opposed|open|possible|wasn't denied|no objection|willing to discuss|discussed/i.test(val)
      ) {
        return "observation_interest_without_approval";
      }
      return "observation_mentioned";
    }
    case "credentialing": {
      if (/unknown|unclear|not sure|unsure/i.test(val)) return "credentialing_required_platform_unknown";
      if (/platform|system|vendor/i.test(attr) && entity) {
        if (/unconfirmed|maybe|think|possibly/i.test(fact.evidence)) {
          return "credentialing_platform_mentioned_unconfirmed";
        }
        return "credentialing_platform_confirmed";
      }
      if (/platform|system|vendor/i.test(attr)) return "credentialing_discussed";
      return "credentialing_discussed";
    }
    case "clinical_focus": {
      if (/robotic\s+ventral\s+hernia/i.test(`${val} ${fact.evidence}`)) {
        return /increas|more|growing|uptick/i.test(fact.evidence)
          ? "clinical_robotic_ventral_hernia_increasing"
          : "clinical_robotic_ventral_hernia";
      }
      if (/abdominal\s+wall\s+reconstruction/i.test(`${val} ${fact.evidence}`)) {
        return /increas|more|growing|uptick/i.test(fact.evidence)
          ? "clinical_abdominal_wall_reconstruction_increasing"
          : "clinical_abdominal_wall_reconstruction";
      }
      return "clinical_procedure_discussed";
    }
    case "product_fit":
      return /\bACSIS\b/i.test(`${val} ${fact.evidence}`)
        ? "product_acsis_discussed"
        : debriefExplicitProductFitConnection(`${val} ${fact.evidence}`)
          ? "product_fit_discussed"
          : null;
    case "current_product": {
      if (attr === "evidence_gap" || !entity) return null;
      if (fact.confidence === "high" && attr === "validated") return "current_product_validated";
      return "current_product_needs_confirmation";
    }
    case "relationship":
      return "relationship_mentioned";
    case "follow_up":
      return "follow_up_stated";
    case "facility_intelligence":
      if (/credential/i.test(`${attr} ${val}`)) return "facility_credentialing_partial";
      return "facility_access_partial";
    default:
      return null;
  }
}

function attributesForFact(fact: DebriefAtomicFact, factKey: DebriefFactKey): Record<string, string | string[] | boolean> {
  const attrs: Record<string, string | string[] | boolean> = {
    atomicFactType: fact.fact_type,
    attribute: fact.attribute,
    value: fact.value,
  };
  if (fact.entity.trim()) {
    attrs.personName = fact.entity.trim();
    if (factKey.includes("platform") || fact.fact_type === "credentialing") {
      attrs.platform = fact.entity.trim();
    }
  }
  if (factKey === "current_product_needs_confirmation" || factKey === "current_product_validated") {
    attrs.productName = fact.entity.trim();
    attrs.evidenceStatus = factKey === "current_product_validated" ? "validated" : "needs_confirmation";
    if (fact.value.trim()) attrs.procedureContext = fact.value.trim();
  }
  if (factKey === "credentialing_required_platform_unknown") {
    attrs.platformStatus = "unknown";
  }
  return attrs;
}

function namedPeopleForFact(fact: DebriefAtomicFact, factKey: DebriefFactKey): string[] {
  const entity = fact.entity.trim();
  if (entity && isPlausiblePersonName(entity)) return [entity];
  if (factKey === "scheduling_person_named" && attributesForFact(fact, factKey).personName) {
    return [String(attributesForFact(fact, factKey).personName)];
  }
  return [];
}

/** Map normalized atomic facts → Pass 1 bucket records (no regex re-extraction). */
export function atomicFactsToExtractedFacts(facts: DebriefAtomicFact[]): DebriefExtractedFacts {
  const buckets = emptyExtractedFacts();
  let seq = 0;

  for (const fact of facts) {
    const factKey = resolveFactKey(fact);
    if (!factKey) continue;

    pushExtractedFact(buckets, {
      id: `fact-atomic-${seq++}`,
      factKey,
      attributes: attributesForFact(fact, factKey),
      evidenceQuote: fact.evidence,
      namedPeople: namedPeopleForFact(fact, factKey),
      confidence: CONFIDENCE_TO_DISPLAY[fact.confidence],
    });
  }

  return buckets;
}

export function flattenExtractedFacts(extracted: DebriefExtractedFacts): DebriefRawFact[] {
  return allExtractedRecords(extracted).map((record) => ({
    id: record.id,
    fact_key: record.factKey,
    attributes: record.attributes,
    fact_text: record.factKey,
    evidence_quote: record.evidenceQuote,
    subject: record.namedPeople[0] ?? null,
    named_people: record.namedPeople,
    confidence: record.confidence,
  }));
}

const DOMAIN_BY_FACT_KEY: Partial<Record<DebriefFactKey, IntelligenceDomain>> = {
  observation_approved_explicit: "or_access",
  observation_interest_without_approval: "or_access",
  observation_denied: "or_access",
  observation_mentioned: "or_access",
  facility_access_partial: "or_access",
  credentialing_required_platform_unknown: "credentialing",
  credentialing_platform_mentioned_unconfirmed: "credentialing",
  credentialing_platform_confirmed: "credentialing",
  credentialing_discussed: "credentialing",
  facility_credentialing_partial: "credentialing",
  scheduling_person_named: "scheduling",
  scheduling_discussed: "scheduling",
  workflow_person_named: "stakeholders",
  workflow_person_with_contact_info: "stakeholders",
  clinical_procedure_discussed: "case_mix",
  clinical_robotic_ventral_hernia: "case_mix",
  clinical_robotic_ventral_hernia_increasing: "case_mix",
  clinical_abdominal_wall_reconstruction: "case_mix",
  clinical_abdominal_wall_reconstruction_increasing: "case_mix",
  product_fit_discussed: "product_fit",
  product_acsis_discussed: "product_fit",
  current_product_needs_confirmation: "procurement",
  current_product_validated: "procurement",
  relationship_mentioned: "relationship",
  follow_up_stated: "next_steps",
};

function domainForClassified(fact: DebriefClassifiedFact): IntelligenceDomain {
  const fromKey = DOMAIN_BY_FACT_KEY[fact.fact_key as DebriefFactKey];
  if (fromKey) return fromKey;
  switch (fact.classification) {
    case "observation_access":
      return "or_access";
    case "credentialing":
      return "credentialing";
    case "scheduling":
      return "scheduling";
    case "clinical_focus":
      return "case_mix";
    case "workflow_participant":
      return "stakeholders";
    case "product_fit":
      return "product_fit";
    case "current_product":
      return "procurement";
    case "relationship":
      return "relationship";
    case "next_step":
      return "workflow";
    default:
      return "workflow";
  }
}

function pickDbKeyForClassifiedFact(
  fact: DebriefClassifiedFact,
  writableKeys: Set<string>,
): string | null {
  const domain = domainForClassified(fact);
  const scope = resolveIntelligenceScope({
    domain,
    text: `${fact.fact_key} ${fact.evidence_quote}`,
    logUpdateTarget: "provider",
  }).scope;

  const candidates = DOMAIN_DB_KEY_CANDIDATES[domain] ?? [];
  const scoped = pickDbKeyForScope(candidates, scope, writableKeys);
  if (scoped) return scoped;

  if (fact.fact_key === "scheduling_person_named" && writableKeys.has("provider_scheduling_contact")) {
    return "provider_scheduling_contact";
  }
  if (
    fact.fact_key === "workflow_person_with_contact_info" &&
    /schedul/i.test(`${fact.evidence_quote} ${String(fact.attributes?.value ?? "")}`) &&
    writableKeys.has("provider_scheduling_contact")
  ) {
    return "provider_scheduling_contact";
  }
  if (
    fact.classification === "observation_access" &&
    writableKeys.has("provider_observation_feasibility")
  ) {
    return "provider_observation_feasibility";
  }
  if (fact.classification === "credentialing" && writableKeys.has("provider_credentialing_status")) {
    return "provider_credentialing_status";
  }
  if (fact.classification === "current_product" && writableKeys.has("provider_competitive_products")) {
    return "provider_competitive_products";
  }
  if (
    fact.classification === "current_product" &&
    writableKeys.has("provider_current_vendors") &&
    /\b(hospital|facility|formulary|all surgeons|facility[- ]wide|hospital[- ]wide)\b/i.test(
      `${fact.evidence_quote} ${String(fact.attributes?.value ?? "")}`,
    )
  ) {
    return "provider_current_vendors";
  }
  if (fact.classification === "clinical_focus" && writableKeys.has("provider_procedure_focus")) {
    const atomicValue = typeof fact.attributes?.value === "string" ? fact.attributes.value.trim() : "";
    const evidence = fact.evidence_quote.trim();
    const resolved = resolveClinicalDbKeyAndSignal({
      value: atomicValue || evidence,
      evidence,
      attribute: typeof fact.attributes?.attribute === "string" ? fact.attributes.attribute : undefined,
    });
    if (resolved && writableKeys.has(resolved.dbKey)) {
      return resolved.dbKey;
    }
    return "provider_procedure_focus";
  }

  return null;
}

const CANONICAL_OBSERVATION_FEASIBILITY_TOKEN =
  /^(interested|approved|denied|mentioned|yes|easy|restricted|credentialing_required)$/i;

function isCanonicalObservationFeasibilityValue(value: string): boolean {
  return CANONICAL_OBSERVATION_FEASIBILITY_TOKEN.test(value.trim());
}

function proposedValueForClassifiedFact(fact: DebriefClassifiedFact): string {
  const attrs = fact.attributes ?? {};
  const atomicValue = typeof attrs.value === "string" ? attrs.value.trim() : "";
  const fromEvidence =
    sanitizeOperationalDisplayText(fact.evidence_quote.trim()) || fact.evidence_quote.trim();
  if (atomicValue && atomicValue.length >= 8 && !isLowQualityIntelligenceText(atomicValue)) {
    return atomicValue;
  }
  return fromEvidence;
}

/** Contact fields whose proposed value must carry the person's identity. */
const CONTACT_ENTITY_DB_KEYS = new Set([
  "provider_scheduling_contact",
  "provider_observation_coordinator_contact",
  "provider_facility_scheduling_contact",
]);

/**
 * A contact-field update must preserve WHO the contact is — a bare role label
 * ("Observation Scheduling Coordinator") makes a replace-vs-keep conflict
 * undecidable for the reviewer. Output: name — role. "evidence sentence".
 */
function contactEntityProposedValue(
  fact: DebriefClassifiedFact,
  roleOrValue: string,
  sourceText?: string,
): string {
  const context = sourceText?.trim() || fact.evidence_quote.trim();
  const replacement = detectSchedulingContactReplacement(context);
  if (replacement) {
    const attrs = fact.attributes ?? {};
    const attrName = typeof attrs.personName === "string" ? attrs.personName : "";
    const name = (fact.subject ?? fact.named_people?.[0] ?? attrName).trim();
    if (name && name.toLowerCase() === replacement.successorName.toLowerCase()) {
      const entity = buildPreservedNamedEntity(replacement.successorName, context);
      return buildSchedulingReplacementProposedValue({
        replacement,
        role: roleOrValue.trim() || entity.possibleRole || "Scheduling Coordinator",
      });
    }
  }

  const attrs = fact.attributes ?? {};
  const attrName = typeof attrs.personName === "string" ? attrs.personName : "";
  const name = (fact.subject ?? fact.named_people?.[0] ?? attrName).trim();
  if (name && isDepartedSchedulingOwner(name, context)) {
    return "";
  }
  const role = roleOrValue.trim();
  const evidence =
    sanitizeOperationalDisplayText(fact.evidence_quote.trim()) || fact.evidence_quote.trim();

  let base = role;
  if (name && !role.toLowerCase().includes(name.toLowerCase())) {
    base = role ? `${name} — ${role}` : name;
  }
  if (!base) return evidence;
  if (
    evidence &&
    evidence.toLowerCase() !== base.toLowerCase() &&
    !base.toLowerCase().includes(evidence.toLowerCase())
  ) {
    return `${base}. "${evidence}"`;
  }
  return base;
}

/** Derive CRM field updates from classified facts only (not AI confirmed_updates). */
export function buildFieldUpdatesFromClassifiedFacts(input: {
  classifiedFacts: DebriefClassifiedFact[];
  existingFields: Record<string, string>;
  writableFieldKeys?: readonly string[];
  sourceText?: string;
}): LogUpdateRoutedFieldUpdate[] {
  const sourceText =
    input.sourceText?.trim() ||
    input.classifiedFacts
      .map((fact) => fact.evidence_quote.trim())
      .filter(Boolean)
      .join(" ");
  const writableKeys = new Set(
    input.writableFieldKeys?.length
      ? input.writableFieldKeys
      : [...PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS],
  );
  const seenDbKeys = new Set<string>();
  const rows: LogUpdateRoutedFieldUpdate[] = [];

  for (const [index, fact] of input.classifiedFacts.entries()) {
    const domain = domainForClassified(fact);
    let dbKey = pickDbKeyForClassifiedFact(fact, writableKeys);
    const atomicValue =
      typeof fact.attributes?.value === "string" ? fact.attributes.value.trim().toLowerCase() : "";
    if (
      fact.classification === "observation_access" &&
      writableKeys.has("provider_observation_feasibility") &&
      atomicValue &&
      /^(interested|approved|denied|mentioned|yes|easy|restricted|credentialing_required)$/.test(
        atomicValue,
      )
    ) {
      dbKey = "provider_observation_feasibility";
    }
    if (!dbKey) continue;

    let proposedValue = proposedValueForClassifiedFact(fact);
    if (dbKey === "provider_observation_feasibility" && atomicValue) {
      proposedValue = atomicValue;
    }
    if (CONTACT_ENTITY_DB_KEYS.has(dbKey)) {
      proposedValue = contactEntityProposedValue(fact, proposedValue, sourceText);
      if (!proposedValue.trim()) continue;
    }
    const clinicalResolved =
      fact.classification === "clinical_focus"
        ? resolveClinicalDbKeyAndSignal({
            value: proposedValue,
            evidence: fact.evidence_quote,
            attribute: typeof fact.attributes?.attribute === "string" ? fact.attributes.attribute : undefined,
          })
        : null;
    if (fact.classification === "clinical_focus" && !clinicalResolved) continue;
    if (clinicalResolved) {
      proposedValue = clinicalResolved.storageValue;
      if (clinicalResolved.dbKey !== dbKey && writableKeys.has(clinicalResolved.dbKey)) {
        dbKey = clinicalResolved.dbKey;
      }
    }
    if (!proposedValue) continue;
    if (LOW_SIGNAL_REVIEW_DB_KEYS.has(dbKey)) continue;

    const mergeCategory = resolveIntelligenceMergeCategory({
      dbKey,
      value: proposedValue,
      clinicalSignal: clinicalResolved?.clinicalSignal,
      classification: fact.classification,
    });

    if (seenDbKeys.has(dbKey)) {
      if (!CATEGORY_AWARE_MERGE_DB_KEYS.has(dbKey)) {
        continue;
      }
      const prior = rows.find((r) => r.dbKey === dbKey);
      if (prior) {
        prior.proposedValue = mergeIntelligenceFieldValue(
          mergeCategory,
          prior.proposedValue,
          proposedValue,
          dbKey,
        );
        const existingValue = String(input.existingFields[dbKey] ?? "").trim();
        prior.conflict =
          intelligenceFieldConflict({
            dbKey,
            existingValue,
            proposedValue: prior.proposedValue,
            clinicalSignal: clinicalResolved?.clinicalSignal,
            classification: fact.classification,
          }) ?? prior.conflict;
      }
      continue;
    }

    const allowShortFeasibilityToken =
      dbKey === "provider_observation_feasibility" &&
      isCanonicalObservationFeasibilityValue(proposedValue);
    if (
      !allowShortFeasibilityToken &&
      isLowQualityIntelligenceText(proposedValue) &&
      proposedValue.trim() !== fact.evidence_quote.trim()
    ) {
      continue;
    }

    const scope = resolveIntelligenceScope({
      domain,
      text: proposedValue,
      logUpdateTarget: "provider",
    });
    const destination = resolveIntelligenceSaveDestination({
      scope: scope.scope,
      text: proposedValue,
      domain,
      logUpdateTarget: "provider",
    });

    if (destination.destination === "engagement_note" || scope.scope === "case") {
      continue;
    }

    const existingValue = String(input.existingFields[dbKey] ?? "").trim();

    // Quality gate: generic placeholders ("product fit discussed", "General")
    // never overwrite or sit beside specific intelligence, and add nothing to
    // a blank field. Observation feasibility keeps its canonical short tokens.
    if (
      dbKey !== "provider_observation_feasibility" &&
      !proposedIntelligenceAddsValue(existingValue, proposedValue)
    ) {
      continue;
    }

    // Source-of-truth hierarchy: when the AI signal only restates a workflow
    // state already on file (e.g. observation already approved via the rep's
    // engagement outcome), the update is a no-op — do not resurface it as a
    // change. Contradicting values still flow through the conflict path.
    if (workflowFieldUpdateRestatesConfirmedState({ dbKey, existingValue, proposedValue })) {
      continue;
    }

    // Entity identity check: the same person re-confirmed in the same contact
    // slot (stored Karen + "Karen still handles scheduling") corroborates the
    // record. Evidence history only — no field change, no merge decision.
    if (contactUpdateCorroboratesExisting({ dbKey, existingValue, proposedValue })) {
      continue;
    }

    const conflict = intelligenceFieldConflict({
      dbKey,
      existingValue,
      proposedValue,
      clinicalSignal: clinicalResolved?.clinicalSignal,
      classification: fact.classification,
    });

    seenDbKeys.add(dbKey);
    rows.push({
      id: `fact-field-${index}`,
      label: fieldLabelForDbKey(dbKey),
      dbKey,
      proposedValue,
      accepted: fact.confidence === "High" && (!conflict || conflict.resolution === "replace"),
      conflict,
      proposedScope: scope.scope,
      scopeReason: scope.reason,
      proposedDestination: destination.destination,
      destinationReason: destination.reason,
    });
  }

  return rows;
}

export function buildStillToValidateFromFacts(facts: DebriefAtomicFact[]): string[] {
  const gaps = facts
    .filter((f) => f.fact_type === "current_product" && f.attribute === "evidence_gap")
    .map((f) => f.value.trim())
    .filter(Boolean);

  const followUps = facts
    .filter((f) => f.fact_type === "follow_up" || f.confidence === "low")
    .map((f) => f.value.trim())
    .filter(Boolean);

  return [...new Set([...gaps, ...followUps])].slice(0, 8);
}

export function proposedContactsFromAtomicFacts(input: {
  facts: DebriefAtomicFact[];
  dictation: string;
  sourceReference: string;
  knownNames?: Set<string>;
  guardContext?: ReviewUpdateGuardContext;
}): DebriefProposedContactItem[] {
  const known = input.knownNames ?? new Set<string>();
  const byName = new Map<string, DebriefProposedContactItem>();

  for (const fact of input.facts.map((row) => repairWorkflowContactFactEntity(row, input.dictation))) {
    if (fact.fact_type !== "workflow_contact" && fact.fact_type !== "scheduling") continue;
    const name = normalizeSchedulerPersonName(fact.entity.trim());
    if (!name || !isPlausiblePersonName(name)) continue;
    if (shouldExcludeContactCandidate(name, input.guardContext).exclude) continue;
    const key = name.toLowerCase();
    if (known.has(key)) continue;

    const scheduling = /schedul/i.test(`${fact.attribute} ${fact.value} ${fact.evidence}`);
    const credentialing = /credential/i.test(`${fact.attribute} ${fact.value} ${fact.evidence}`);
    const contactBlob = `${fact.evidence} ${fact.value} ${input.dictation}`;
    const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(contactBlob);
    const hasPhone =
      /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/.test(
        contactBlob,
      );
    const hasContactInfo = hasEmail || hasPhone;
    // Assertion ladder for contacts: confirmed requires full contact details at
    // high confidence; partial contact info stays a potential support contact.
    const mentionLevel =
      hasEmail && hasPhone && fact.confidence === "high"
        ? ("confirmed_support_contact" as const)
        : (scheduling || credentialing) && !hasContactInfo
          ? ("workflow_participant" as const)
          : hasContactInfo
            ? ("potential_support_contact" as const)
            : ("workflow_participant" as const);

    const existing = byName.get(key);
    if (existing) {
      const rank = {
        mentioned_person: 0,
        workflow_participant: 1,
        potential_support_contact: 2,
        confirmed_support_contact: 3,
      } as const;
      if (rank[mentionLevel] > rank[existing.mentionLevel]) {
        byName.set(
          key,
          buildProposedContactFromExtraction({
            name,
            quote: fact.evidence,
            sourceReference: input.sourceReference,
            debriefText: input.dictation,
            index: byName.size,
            mentionLevel,
          }),
        );
      }
      continue;
    }

    byName.set(
      key,
      buildProposedContactFromExtraction({
        name,
        quote: fact.evidence,
        sourceReference: input.sourceReference,
        debriefText: input.dictation,
        index: byName.size,
        mentionLevel,
      }),
    );
  }

  return [...byName.values()];
}

export type DebriefFactsParseResult = LogUpdateParseResult & {
  atomicFacts: DebriefAtomicFact[];
  mappingSource: LogUpdateMappingSource;
};

export function buildParseResultFromDebriefFacts(params: {
  sourceText: string;
  facts: DebriefAtomicFact[];
  context?: AiNoteCaptureContext;
  existingFields?: Record<string, string>;
  mappingSource?: DebriefFactsParseResult["mappingSource"];
}): DebriefFactsParseResult {
  const dictation = params.sourceText.trim();
  const normalized = normalizeAndDedupeAtomicFacts(params.facts, dictation);
  const extracted = atomicFactsToExtractedFacts(normalized);
  const classified = runPass2Classification(flattenExtractedFacts(extracted));

  let fieldUpdates = buildFieldUpdatesFromClassifiedFacts({
    classifiedFacts: classified,
    existingFields: params.existingFields ?? {},
    writableFieldKeys: params.context?.writableFieldKeys,
    sourceText: dictation,
  });

  if (fieldUpdates.length === 0 && params.context?.providerId) {
    const keyword = routeLogUpdateToProviderFields(dictation, params.existingFields ?? {});
    for (const u of keyword) {
      if (LOW_SIGNAL_REVIEW_DB_KEYS.has(u.dbKey)) continue;
      if (isLowQualityIntelligenceText(u.proposedValue)) continue;
      if (
        workflowFieldUpdateRestatesConfirmedState({
          dbKey: u.dbKey,
          existingValue: String(params.existingFields?.[u.dbKey] ?? ""),
          proposedValue: u.proposedValue,
        })
      ) {
        continue;
      }
      if (!fieldUpdates.some((f) => f.dbKey === u.dbKey)) fieldUpdates.push(u);
    }
  }

  fieldUpdates = applyIntelligenceReversalsToFieldUpdates(
    dictation,
    fieldUpdates,
    params.existingFields ?? {},
  );

  const stillMissing = removeResolvedIntelligenceGaps(buildStillToValidateFromFacts(normalized), {
    fieldUpdates: fieldUpdates.map((u) => ({ dbKey: u.dbKey, proposedValue: u.proposedValue })),
    contactLines: normalized
      .filter((f) => f.fact_type === "workflow_contact" || f.fact_type === "scheduling")
      .map((f) => `${f.entity} — ${f.attribute} ${f.value}`),
  });

  return applyReviewSelectionDefaults({
    sourceText: dictation,
    suggestedUpdates: fieldUpdates.map((u) => ({ id: u.id, label: u.label, accepted: u.accepted })),
    fieldUpdates,
    intelligenceReview: {
      summary: null,
      confirmedUpdates: fieldUpdates.filter((f) => f.accepted).map((f) => f.label),
      partiallyConfirmed: fieldUpdates
        .filter((f) => !f.accepted)
        .map((f) => ({ label: f.label, reason: "Needs rep confirmation", domain: "workflow" as const, confidence: "medium" as const, target: "provider" as const })),
      stillWorthConfirming: stillMissing,
      relatedOperationalAreas: [...new Set(classified.map((f) => f.classification.replace(/_/g, " ")))],
      suggestedNextActions: [],
      doNotUpdate: [],
    },
    stillMissing,
    saveAsNoteAccepted: true,
    usesProviderIntelligence: Boolean(params.context?.providerId),
    aiMapping: null,
    mappingSource: params.mappingSource ?? "openai",
    atomicFacts: normalized,
  }) as DebriefFactsParseResult;
}

export function runPass1FromAtomicFacts(atomicFacts: DebriefAtomicFact[], dictation: string): DebriefExtractedFacts {
  const normalized = normalizeAndDedupeAtomicFacts(atomicFacts, dictation);
  return atomicFactsToExtractedFacts(normalized);
}
