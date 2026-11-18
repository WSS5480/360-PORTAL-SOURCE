/**
 * Canonical Review Updates model — single downstream renderer input.
 * All visible review items derive from normalized atomic facts only.
 */

import {
  findProposedContactIdForPersonName,
  type DebriefProposedContactItem,
} from "@/lib/surgical-sales/debriefDetectedContact";
import { isPlausiblePersonName } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import type { DebriefFactConfidence } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import { isRepPlanningEvidence } from "@/lib/surgical-sales/debriefReviewEvidencePipeline";
import {
  pushReviewUpdateDebug,
  type ReviewUpdateDebugTrace,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateDebug";
import { reconcileObservationReviewItem } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewObservationReconcile";
import {
  textNegatesCredentialingRequirement,
  textNegatesObservationAccess,
} from "@/lib/surgical-sales/intelligenceContradictionDetection";
import {
  buildContactInfoFollowUpTitle,
  canonicalContactInfoFollowUpTitle,
  followUpSemanticDedupeKey,
  hasValidClinicalEvidence,
  isObservationReadinessFollowUp,
  normalizeReviewTextApostrophes,
  shouldExcludeContactCandidate,
  shouldExcludeFollowUpTask,
  type ReviewUpdateGuardContext,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewUpdateGuards";
import {
  formatCommercialClinicalReviewLine,
  normalizeClinicalIntelligenceFromFact,
  clinicalReviewSemanticKey,
  type CommercialClinicalCategoryId,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { isBlockedContactFollowUpTitle } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefReviewTextNormalize";
import {
  combineContactRoleValues,
  contactRoleFieldLabel,
} from "@/lib/surgical-sales/debriefContactRoleMerge";
import {
  isProductStatusToken,
  parseDebriefProductIntelligenceFromFact,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductIntelligenceExtraction";

export const MAX_FOLLOW_UP_DECISIONS = 3;

export const REVIEW_UPDATE_ITEM_TYPES = [
  "contact_candidate",
  "observation_access",
  "credentialing",
  "clinical_focus",
  "product_intelligence",
  "organization_intelligence",
  "follow_up_task",
] as const;

export type ReviewUpdateItemType = (typeof REVIEW_UPDATE_ITEM_TYPES)[number];

export type ReviewUpdateItem = {
  id: string;
  type: ReviewUpdateItemType;
  confidence: DebriefFactConfidence;
  evidenceQuotes: string[];
  linkedFactKeys: string[];
  linkedFieldUpdateIds: string[];
  contactId?: string;
  displayName?: string;
  roleLabel?: string;
  roleValue?: string;
  contactDetailsMissing?: boolean;
  observationStatus?: string;
  approval?: string;
  credentialingSummary?: string;
  insightTitle?: string;
  clinicalCategoryLabel?: string;
  clinicalDisplayValue?: string;
  clinicalSourceText?: string;
  clinicalSignalLabel?: string;
  clinicalProcedureFocus?: string;
  topicTitle?: string;
  productName?: string;
  productProcedureContext?: string;
  productEvidenceStatus?: string;
  productImpactLine?: string;
  productNextValidationStep?: string;
  taskTitle?: string;
  followUpReason?: string;
  suggestedDue?: string;
};

const CONFIDENCE_DISPLAY: Record<DebriefAtomicFact["confidence"], DebriefFactConfidence> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function factKeyForReview(fact: DebriefAtomicFact, index: number): string {
  return [
    fact.fact_type,
    fact.entity.trim().toLowerCase(),
    fact.attribute.trim().toLowerCase(),
    fact.value.trim().toLowerCase().slice(0, 40),
    String(index),
  ].join("|");
}

function formatEvidence(evidence: string): string {
  return evidence.trim().replace(/^["']+|["']+$/g, "").trim();
}

function mergeEvidence(existing: string[], next: string): string[] {
  const bare = formatEvidence(next);
  if (!bare) return existing;
  if (existing.some((e) => e === bare)) return existing;
  return [...existing, bare];
}

function hasContactInfoInText(text: string): boolean {
  return /\b(?:@[a-z0-9.-]+\.[a-z]{2,}|\(\d{3}\)|\d{3}[-.\s]\d{3})\b/i.test(text);
}

function contactInfoExplicitlyMissing(dictation: string): boolean {
  return (
    /\b(?:don't|do not|dont)\s+have\b/i.test(dictation) &&
    /\b(?:contact|phone|email|info)\b/i.test(dictation)
  );
}

function schedulingRoleValue(fact: DebriefAtomicFact): string | null {
  if (!/schedul/i.test(`${fact.attribute} ${fact.value} ${fact.evidence}`)) {
    if (fact.fact_type !== "scheduling" && fact.fact_type !== "workflow_contact") return null;
  }
  const value = fact.value.trim();
  if (value.length >= 4 && !/^discussed$/i.test(value)) return value;
  return "Scheduling Coordinator";
}

function normalizeAtomicFactsForReview(facts: DebriefAtomicFact[]): DebriefAtomicFact[] {
  return facts.map((fact) => ({
    ...fact,
    entity: normalizeReviewTextApostrophes(fact.entity),
    attribute: normalizeReviewTextApostrophes(fact.attribute),
    value: normalizeReviewTextApostrophes(fact.value),
    evidence: normalizeReviewTextApostrophes(fact.evidence),
  }));
}

const NEGATED_OBSERVATION_APPROVAL_RE =
  /\b(?:not (?:yet )?approved|no observation was approved|nothing (?:was )?approved|wasn't approved|was not approved|not confirmed|needs approval|approval (?:is )?(?:pending|needed|required)|need to work through|(?:temporarily )?(?:suspended|paused|halted)|on hold|no longer (?:available|allowed|permitted|approved)|not (?:allowed|available|permitted)|can(?:not|'?t) (?:observe|attend)|(?:access|approval) (?:was |has been |is )?(?:revoked|rescinded|withdrawn|reversed|pulled|removed))\b/i;

/**
 * Discussion / openness language — maps to Observation Interest (access
 * pathway), never Approved and never Denied.
 */
const INTERESTED_OBSERVATION_RE =
  /\b(?:not opposed|wasn'?t opposed|open to|usually not a problem|no problem|possible|interested|interest|no objections?|willing to discuss|(?:generally|usually|typically) possible|should be possible|pathway exists|observation (?:was )?discussed)\b/i;

const EXPLICIT_OBSERVATION_APPROVAL_RE =
  /\b(?:approved|granted|gave approval|agreed to observation|cleared me to observe|approved me to observe|cleared to observe|permission granted|yes,? we can observe)\b/i;

function observationStatusFromValue(value: string, evidence = ""): string {
  const blob = `${value} ${evidence}`.trim();
  if (NEGATED_OBSERVATION_APPROVAL_RE.test(blob)) {
    return INTERESTED_OBSERVATION_RE.test(blob) ? "Interested" : "Needs Follow-Up";
  }
  if (/denied|not allow/i.test(value)) return "Denied";
  if (EXPLICIT_OBSERVATION_APPROVAL_RE.test(blob)) return "Approved";
  if (INTERESTED_OBSERVATION_RE.test(blob)) return "Interested";
  return "Needs validation";
}

export { observationStatusFromValue };

function linkFieldUpdates(
  fact: DebriefAtomicFact,
  fieldUpdates: LogUpdateRoutedFieldUpdate[],
): string[] {
  const ids: string[] = [];
  for (const field of fieldUpdates) {
    if (fact.fact_type === "workflow_contact" || fact.fact_type === "scheduling") {
      if (field.dbKey === "provider_scheduling_contact") ids.push(field.id);
      continue;
    }
    if (fact.fact_type === "observation_access" && field.dbKey.includes("observation")) {
      ids.push(field.id);
      continue;
    }
    if (fact.fact_type === "credentialing" && field.dbKey.includes("credential")) {
      ids.push(field.id);
      continue;
    }
    if (fact.fact_type === "clinical_focus" && field.dbKey.includes("procedure")) {
      ids.push(field.id);
    }
    if (fact.fact_type === "current_product" && /competitive|vendor|product/i.test(field.dbKey)) {
      ids.push(field.id);
    }
    if (fact.fact_type === "facility_intelligence" && field.proposedScope === "organization") {
      ids.push(field.id);
    }
  }
  return [...new Set(ids)];
}

function resolveContactId(name: string, contacts: DebriefProposedContactItem[]): string | undefined {
  return findProposedContactIdForPersonName(name, contacts);
}

function observationFactPriority(fact: DebriefAtomicFact): number {
  const blob = `${fact.value} ${fact.evidence}`;
  const negatedApproval = NEGATED_OBSERVATION_APPROVAL_RE.test(blob);
  if (/denied|not allow/i.test(fact.value)) return 500;
  if (EXPLICIT_OBSERVATION_APPROVAL_RE.test(blob) && !negatedApproval) return 400;
  if (INTERESTED_OBSERVATION_RE.test(blob)) return 300;
  if (/mentioned|discussed/i.test(fact.value)) return 200;
  return 100;
}

function primaryObservationFact(facts: DebriefAtomicFact[]): DebriefAtomicFact {
  return facts.reduce((best, fact) => {
    const bestPriority = observationFactPriority(best);
    const factPriority = observationFactPriority(fact);
    if (factPriority > bestPriority) return fact;
    if (factPriority < bestPriority) return best;
    const rank = { high: 3, medium: 2, low: 1 } as const;
    return rank[fact.confidence] > rank[best.confidence] ? fact : best;
  });
}

function observationStatusFromFact(fact: DebriefAtomicFact, dictation: string): string {
  const fromValue = observationStatusFromValue(fact.value, fact.evidence);
  if (fromValue !== "Needs validation") return fromValue;
  const context = `${dictation} ${fact.evidence}`;
  if (INTERESTED_OBSERVATION_RE.test(context)) return "Interested";
  if (NEGATED_OBSERVATION_APPROVAL_RE.test(context)) {
    return INTERESTED_OBSERVATION_RE.test(context) ? "Interested" : "Needs Follow-Up";
  }
  return fromValue;
}

function observationApprovalFromDictation(dictation: string, primary: DebriefAtomicFact): string {
  if (
    /\b(?:no observation was approved|observation was not approved|not approved today|wasn't approved today|was not approved today)\b/i.test(
      dictation,
    )
  ) {
    return "Not Confirmed";
  }
  // Current-state reversal (suspended / paused / no longer available) overrides
  // any historical approval reference in the same dictation.
  if (textNegatesObservationAccess(dictation)) {
    return "Not Confirmed";
  }
  if (
    /\b(?:permission granted|observation (?:access )?(?:was )?granted|yes,? we can observe|scheduled for observation|approved for observation|observation was approved|can observe next)\b/i.test(
      dictation,
    ) &&
    !/\b(?:no observation was approved|not approved today)\b/i.test(dictation)
  ) {
    return "Confirmed";
  }
  if (observationApprovalConfirmed(primary)) return "Confirmed";
  return "Not Confirmed";
}

function observationApprovalConfirmed(fact: DebriefAtomicFact): boolean {
  const blob = `${fact.value} ${fact.evidence}`;
  if (NEGATED_OBSERVATION_APPROVAL_RE.test(blob)) return false;
  return EXPLICIT_OBSERVATION_APPROVAL_RE.test(blob);
}

function credentialingSummaryFromFacts(facts: DebriefAtomicFact[], dictation: string): string {
  const blob = `${dictation} ${facts.map((f) => `${f.value} ${f.evidence}`).join(" ")}`;
  // Negation wins: "no longer required" must never collapse into "Required"
  // just because the word "required" appears in the sentence.
  if (textNegatesCredentialingRequirement(blob)) {
    return "Not required";
  }
  if (facts.length === 0) {
    return /\b(?:credential|vendor approv)/i.test(dictation) ? "Required" : "Not discussed";
  }
  if (/\b(?:required|normally required|need.*credential|vendor credentialing)\b/i.test(blob)) {
    return "Required";
  }
  const unknown = facts.some((f) => /unknown|unclear|unsure/i.test(`${f.value} ${f.evidence}`));
  const platform = facts.find((f) => f.entity.trim())?.entity.trim();
  if (unknown) return "Required";
  if (platform) return `Required (${platform})`;
  return "Required";
}

function credentialingTopicFromFacts(facts: DebriefAtomicFact[]): string {
  const unknown = facts.some((f) => /unknown|unclear|unsure/i.test(`${f.value} ${f.evidence}`));
  if (unknown) return "Credentialing platform unknown";
  const platform = facts.find((f) => f.entity.trim())?.entity.trim();
  return platform ? `Credentialing via ${platform}` : "Credentialing requirement";
}

function credentialingPlatformUnknown(facts: DebriefAtomicFact[]): boolean {
  return facts.some((f) => /unknown|unclear|unsure/i.test(`${f.value} ${f.evidence}`));
}

function clinicalInsightPresentation(fact: DebriefAtomicFact): {
  title: string;
  categoryLabel: string;
  categoryId: CommercialClinicalCategoryId;
  displayValue: string;
  procedureFocus: string;
  sourceText: string;
  signalLabel: string | null;
  semanticKey: string;
} | null {
  const normalized = normalizeClinicalIntelligenceFromFact({
    value: fact.value,
    evidence: fact.evidence,
    attribute: fact.attribute,
  });
  if (normalized) {
    return {
      title: formatCommercialClinicalReviewLine(normalized),
      categoryLabel: normalized.categoryLabel,
      categoryId: normalized.categoryId,
      displayValue: normalized.displayValue,
      procedureFocus: normalized.procedureFocus,
      sourceText: normalized.sourceText,
      signalLabel: normalized.signalLabel,
      semanticKey: clinicalReviewSemanticKey(normalized),
    };
  }
  return null;
}

function clinicalInsightTitle(fact: DebriefAtomicFact): string {
  return (
    clinicalInsightPresentation(fact)?.title ??
    (fact.value.trim().slice(0, 48) || "Clinical procedure focus")
  );
}

function clinicalInsightSignal(fact: DebriefAtomicFact): string | null {
  return clinicalInsightPresentation(fact)?.signalLabel ?? null;
}

function clinicalInsightDedupeKey(fact: DebriefAtomicFact): string {
  return clinicalInsightPresentation(fact)?.semanticKey ?? `procedure_focus:${fact.value.toLowerCase().slice(0, 48)}`;
}

function organizationTopic(fact: DebriefAtomicFact): string {
  if (/access_pathway|access pathway/i.test(`${fact.attribute} ${fact.value}`)) {
    return "Facility observation access pathway";
  }
  if (/credential/i.test(`${fact.attribute} ${fact.value}`)) {
    return "Facility vendor credentialing";
  }
  return "Facility intelligence";
}

function productInterestNameFromFact(fact: DebriefAtomicFact): string {
  const blob = `${fact.entity} ${fact.value} ${fact.evidence}`;
  const acsis = blob.match(/\bACSIS\b/i)?.[0];
  if (acsis) return "ACSIS";
  return fact.entity.trim() || "Product interest";
}

function productInterestSummaryLine(fact: DebriefAtomicFact): string {
  const product = productInterestNameFromFact(fact);
  const evidence = fact.evidence.trim();
  if (/\b(?:asked|whether|works?|learning curve|curved design|interested|curious)\b/i.test(evidence)) {
    return `Product interest: ${product}`;
  }
  return `Product interest: ${product}`;
}

function followUpReasonForTitle(title: string): string {
  const lower = title.toLowerCase();
  if (/phone|email|contact/.test(lower)) return "Contact details needed for workflow.";
  if (/credential|platform/.test(lower)) return "Credentialing required before OR access.";
  if (/schedul/.test(lower)) return "Scheduling ownership affects observation access.";
  return "Follow-up needed from debrief.";
}

function splitFollowUpIntents(title: string): string[] {
  const normalized = title.trim().replace(/\.$/, "");
  if (!normalized) return [];
  if (!/^my next step is to\b/i.test(normalized)) return [normalized];
  const stripped = normalized.replace(/^my next step is to\s+/i, "").trim();
  if (!/,|\band\b/i.test(stripped)) return [stripped];
  return stripped
    .split(/\s*,\s*|\s+and\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isActionableFollowUpFact(fact: DebriefAtomicFact): boolean {
  const value = fact.value.trim();
  if (!value) return false;
  if (/^my next step is to\b/i.test(value)) return true;
  if (isRepPlanningEvidence(value)) return true;
  if (/\b(?:wasn'?t opposed|he said|she said|tom said|when i asked)\b/i.test(value)) {
    return false;
  }
  return /^my next step is to\b/i.test(fact.evidence.trim());
}

function canonicalFollowUpTitle(
  title: string,
  dedupeKey: string,
  contactsByName: Map<string, { fact: DebriefAtomicFact; index: number; evidence: string[] }>,
): string {
  const knownContacts: Array<[string, { entity: string }]> = [];
  for (const [name, row] of contactsByName) {
    knownContacts.push([name, { entity: row.fact.entity.trim() }]);
  }
  return canonicalContactInfoFollowUpTitle(title, dedupeKey, knownContacts);
}

function traceRemoved(
  debugLog: ReviewUpdateDebugTrace[] | undefined,
  trace: Omit<ReviewUpdateDebugTrace, "outcome">,
): void {
  pushReviewUpdateDebug(debugLog, { ...trace, outcome: "removed" });
}

function traceEmitted(
  debugLog: ReviewUpdateDebugTrace[] | undefined,
  trace: Omit<ReviewUpdateDebugTrace, "outcome">,
): void {
  pushReviewUpdateDebug(debugLog, { ...trace, outcome: "emitted" });
}

/** Build canonical review items — one visible item per type per semantic entity. */
export function buildReviewUpdateItemsAudited(input: {
  dictation: string;
  atomicFacts: DebriefAtomicFact[];
  fieldUpdates?: LogUpdateRoutedFieldUpdate[];
  proposedContacts?: DebriefProposedContactItem[];
  guardContext?: ReviewUpdateGuardContext;
  debugLog?: ReviewUpdateDebugTrace[];
}): ReviewUpdateItem[] {
  const dictation = normalizeReviewTextApostrophes(input.dictation.trim());
  const facts = normalizeAtomicFactsForReview(input.atomicFacts);
  const fieldUpdates = input.fieldUpdates ?? [];
  const proposedContacts = input.proposedContacts ?? [];
  const guardContext = input.guardContext;
  const debugLog = input.debugLog;
  const items: ReviewUpdateItem[] = [];

  const contactFacts = facts.filter(
    (f) =>
      (f.fact_type === "workflow_contact" || f.fact_type === "scheduling") &&
      f.entity.trim() &&
      isPlausiblePersonName(f.entity.trim()),
  );
  const contactsByName = new Map<
    string,
    { fact: DebriefAtomicFact; index: number; evidence: string[]; roles: string[] }
  >();

  for (const [index, fact] of contactFacts.entries()) {
    const name = fact.entity.trim();
    const key = name.toLowerCase();
    const sourceFactId = factKeyForReview(fact, index);
    const exclusion = shouldExcludeContactCandidate(name, guardContext);
    if (exclusion.exclude) {
      traceRemoved(debugLog, {
        sourceFactId,
        sourceCollection: "normalized_atomic_facts",
        reviewType: "contact_candidate",
        dedupeKey: `contact:${key}`,
        removalReason: exclusion.reason,
        label: name,
      });
      continue;
    }

    const existing = contactsByName.get(key);
    const evidence = mergeEvidence(existing?.evidence ?? [], fact.evidence);
    // Every role signal for the same person merges into one contact profile.
    const roles = [...(existing?.roles ?? [])];
    const factRole = schedulingRoleValue(fact);
    if (factRole) roles.push(factRole);
    if (!existing) {
      contactsByName.set(key, { fact, index, evidence, roles });
      continue;
    }
    const rank = { high: 3, medium: 2, low: 1 } as const;
    if (rank[fact.confidence] >= rank[existing.fact.confidence]) {
      contactsByName.set(key, { fact, index, evidence, roles });
    } else {
      contactsByName.set(key, { ...existing, evidence, roles });
    }
  }

  for (const [name, row] of contactsByName) {
    const { fact, index, evidence } = row;
    const contactBlob = `${evidence.join(" ")} ${dictation}`;
    const contactDetailsMissing = !hasContactInfoInText(contactBlob);
    const roleValue = combineContactRoleValues(row.roles);
    const confidence = CONFIDENCE_DISPLAY[fact.confidence];
    const itemId = `review-contact-${name.replace(/\s+/g, "-")}`;
    const item: ReviewUpdateItem = {
      id: itemId,
      type: "contact_candidate",
      confidence,
      evidenceQuotes: evidence,
      linkedFactKeys: [factKeyForReview(fact, index)],
      linkedFieldUpdateIds: linkFieldUpdates(fact, fieldUpdates),
      contactId: resolveContactId(fact.entity.trim(), proposedContacts) ?? `contact-${name.replace(/\s+/g, "-")}`,
      displayName: fact.entity.trim(),
      roleLabel: roleValue ? contactRoleFieldLabel(roleValue) : undefined,
      roleValue: roleValue ?? undefined,
      contactDetailsMissing,
    };
    items.push(item);
    traceEmitted(debugLog, {
      sourceFactId: factKeyForReview(fact, index),
      sourceCollection: "normalized_atomic_facts",
      reviewType: "contact_candidate",
      dedupeKey: `contact:${name}`,
      itemId,
      label: item.displayName,
    });
  }

  const emittedContactNames = new Set(
    items
      .filter((item) => item.type === "contact_candidate")
      .map((item) => (item.displayName ?? "").toLowerCase())
      .filter(Boolean),
  );

  for (const contact of proposedContacts) {
    if (contact.disposition === "skipped") continue;
    const name = contact.displayName.trim();
    const key = name.toLowerCase();
    if (!name || !isPlausiblePersonName(name)) continue;
    if (emittedContactNames.has(key)) continue;
    const exclusion = shouldExcludeContactCandidate(name, guardContext);
    if (exclusion.exclude) {
      traceRemoved(debugLog, {
        sourceFactId: `proposed_contact:${contact.id}`,
        sourceCollection: "proposed_contacts",
        reviewType: "contact_candidate",
        dedupeKey: `contact:${key}`,
        removalReason: exclusion.reason,
        label: name,
      });
      continue;
    }

    const evidence = contact.sourceQuote?.trim() ? [contact.sourceQuote.trim()] : [];
    const contactBlob = `${evidence.join(" ")} ${dictation}`;
    const contactDetailsMissing =
      contact.contactDetailsMissing ?? !hasContactInfoInText(contactBlob);
    const roleValue = contact.roleLabel?.trim() || undefined;
    const itemId = `review-contact-proposed-${contact.id}`;
    const item: ReviewUpdateItem = {
      id: itemId,
      type: "contact_candidate",
      confidence: contact.mentionLevel === "confirmed_support_contact" ? "High" : "Medium",
      evidenceQuotes: evidence,
      linkedFactKeys: [],
      linkedFieldUpdateIds: [],
      contactId: contact.id,
      displayName: name,
      roleLabel: roleValue,
      roleValue,
      contactDetailsMissing,
    };
    items.push(item);
    emittedContactNames.add(key);
    traceEmitted(debugLog, {
      sourceFactId: `proposed_contact:${contact.id}`,
      sourceCollection: "proposed_contacts",
      reviewType: "contact_candidate",
      dedupeKey: `contact:${key}`,
      itemId,
      label: name,
    });
  }

  const observationFacts = facts.filter((f) => f.fact_type === "observation_access");
  const hasObservationReadiness = observationFacts.length > 0;
  if (hasObservationReadiness) {
    const primary = primaryObservationFact(observationFacts);
    const evidence = observationFacts.reduce<string[]>(
      (acc, f) => mergeEvidence(acc, f.evidence),
      [],
    );
    const credFacts = facts.filter((f) => f.fact_type === "credentialing");
    const itemId = "review-observation-access";
    const observationItem = reconcileObservationReviewItem(
      {
        id: itemId,
        type: "observation_access",
        confidence: CONFIDENCE_DISPLAY[primary.confidence],
        evidenceQuotes: evidence,
        linkedFactKeys: observationFacts.map((f, i) => factKeyForReview(f, i)),
        linkedFieldUpdateIds: [
          ...observationFacts.flatMap((f) => linkFieldUpdates(f, fieldUpdates)),
          ...credFacts.flatMap((f) => linkFieldUpdates(f, fieldUpdates)),
        ],
        observationStatus: observationStatusFromFact(primary, dictation),
        approval: observationApprovalFromDictation(dictation, primary),
        credentialingSummary: credentialingSummaryFromFacts(credFacts, dictation),
      },
      dictation,
    );
    items.push(observationItem);
    traceEmitted(debugLog, {
      sourceFactId: factKeyForReview(primary, facts.indexOf(primary)),
      sourceCollection: "normalized_atomic_facts",
      reviewType: "observation_access",
      dedupeKey: "observation:readiness",
      itemId,
      label: "Observation Access",
    });
  }

  const credentialingFacts = facts.filter((f) => f.fact_type === "credentialing");
  if (credentialingFacts.length > 0 && !hasObservationReadiness) {
    const primary = credentialingFacts[0]!;
    const evidence = credentialingFacts.reduce<string[]>(
      (acc, f) => mergeEvidence(acc, f.evidence),
      [],
    );
    const itemId = "review-credentialing";
    items.push({
      id: itemId,
      type: "credentialing",
      confidence: CONFIDENCE_DISPLAY[primary.confidence],
      evidenceQuotes: evidence,
      linkedFactKeys: credentialingFacts.map((f, i) => factKeyForReview(f, i)),
      linkedFieldUpdateIds: credentialingFacts.flatMap((f) => linkFieldUpdates(f, fieldUpdates)),
      topicTitle: credentialingTopicFromFacts(credentialingFacts),
    });
    traceEmitted(debugLog, {
      sourceFactId: factKeyForReview(primary, facts.indexOf(primary)),
      sourceCollection: "normalized_atomic_facts",
      reviewType: "credentialing",
      dedupeKey: "credentialing:standalone",
      itemId,
      label: credentialingTopicFromFacts(credentialingFacts),
    });
  } else if (credentialingFacts.length > 0 && hasObservationReadiness) {
    for (const [index, fact] of credentialingFacts.entries()) {
      traceRemoved(debugLog, {
        sourceFactId: factKeyForReview(fact, index),
        sourceCollection: "normalized_atomic_facts",
        reviewType: "credentialing",
        dedupeKey: "credentialing:standalone",
        removalReason: "merged_into_observation_readiness",
        label: credentialingTopicFromFacts([fact]),
      });
    }
  }

  const clinicalFacts = facts.filter((f) => f.fact_type === "clinical_focus");
  const clinicalByKey = new Map<
    string,
    { fact: DebriefAtomicFact; index: number; evidence: string[]; presentation: NonNullable<ReturnType<typeof clinicalInsightPresentation>> }
  >();
  for (const [index, fact] of clinicalFacts.entries()) {
    const sourceFactId = factKeyForReview(fact, index);
    if (!hasValidClinicalEvidence(fact, dictation)) {
      traceRemoved(debugLog, {
        sourceFactId,
        sourceCollection: "normalized_atomic_facts",
        reviewType: "clinical_focus",
        dedupeKey: clinicalInsightDedupeKey(fact),
        removalReason: "missing_or_unanchored_evidence",
        label: clinicalInsightTitle(fact),
      });
      continue;
    }
    const presentation = clinicalInsightPresentation(fact);
    if (!presentation) {
      traceRemoved(debugLog, {
        sourceFactId,
        sourceCollection: "normalized_atomic_facts",
        reviewType: "clinical_focus",
        dedupeKey: clinicalInsightDedupeKey(fact),
        removalReason: "unnormalizable_or_product_usage_clause",
        label: clinicalInsightTitle(fact),
      });
      continue;
    }
    const key = presentation.semanticKey;
    const existing = clinicalByKey.get(key);
    const evidence = mergeEvidence(existing?.evidence ?? [], fact.evidence);
    if (!existing) {
      clinicalByKey.set(key, { fact, index, evidence, presentation });
      continue;
    }
    const rank = { high: 3, medium: 2, low: 1 } as const;
    if (rank[fact.confidence] >= rank[existing.fact.confidence]) {
      clinicalByKey.set(key, { fact, index, evidence, presentation });
    } else {
      clinicalByKey.set(key, { ...existing, evidence });
    }
  }

  let clinicalSeq = 0;
  for (const [key, row] of clinicalByKey) {
    const { fact, index, evidence, presentation } = row;
    const sourceFactId = factKeyForReview(fact, index);
    clinicalSeq += 1;
    const itemId = `review-clinical-${clinicalSeq}`;
    items.push({
      id: itemId,
      type: "clinical_focus",
      confidence: CONFIDENCE_DISPLAY[fact.confidence],
      evidenceQuotes: evidence.map(formatEvidence),
      linkedFactKeys: [sourceFactId],
      linkedFieldUpdateIds: linkFieldUpdates(fact, fieldUpdates),
      insightTitle: presentation.title,
      clinicalCategoryLabel: presentation.categoryLabel,
      clinicalDisplayValue: presentation.displayValue,
      clinicalSourceText: presentation.sourceText,
      clinicalSignalLabel: presentation.signalLabel ?? undefined,
      clinicalProcedureFocus: presentation.procedureFocus,
    });
    traceEmitted(debugLog, {
      sourceFactId,
      sourceCollection: "normalized_atomic_facts",
      reviewType: "clinical_focus",
      dedupeKey: key,
      itemId,
      label: presentation.title,
    });
  }

  // Defense in depth: status-token entities ("unknown", "unclear") must never
  // render a product card even if a fact slips past normalization.
  const productFacts = facts.filter(
    (f) =>
      f.fact_type === "current_product" &&
      f.entity.trim() &&
      !isProductStatusToken(f.entity),
  );
  const productSeen = new Set<string>();
  for (const [index, fact] of productFacts.entries()) {
    const parsed = parseDebriefProductIntelligenceFromFact(fact);
    if (!parsed) continue;
    const key = parsed.productName.toLowerCase();
    const sourceFactId = factKeyForReview(fact, index);
    if (productSeen.has(key)) {
      traceRemoved(debugLog, {
        sourceFactId,
        sourceCollection: "normalized_atomic_facts",
        reviewType: "product_intelligence",
        dedupeKey: key,
        removalReason: "duplicate_product_name",
        label: parsed.summaryLine,
      });
      continue;
    }
    productSeen.add(key);
    const itemId = `review-product-${productSeen.size}`;
    items.push({
      id: itemId,
      type: "product_intelligence",
      confidence: CONFIDENCE_DISPLAY[fact.confidence],
      evidenceQuotes: [formatEvidence(fact.evidence)],
      linkedFactKeys: [sourceFactId],
      linkedFieldUpdateIds: linkFieldUpdates(fact, fieldUpdates),
      productName: parsed.productName,
      productProcedureContext: parsed.procedureContext,
      productEvidenceStatus:
        parsed.evidenceStatus === "validated" ? "Validated" : "Needs confirmation",
      productImpactLine: parsed.impactLine,
      productNextValidationStep: parsed.nextValidationStep,
      topicTitle: parsed.summaryLine,
    });
    traceEmitted(debugLog, {
      sourceFactId,
      sourceCollection: "normalized_atomic_facts",
      reviewType: "product_intelligence",
      dedupeKey: key,
      itemId,
      label: parsed.summaryLine,
    });
  }

  const productFitFacts = facts.filter((f) => f.fact_type === "product_fit");
  for (const [index, fact] of productFitFacts.entries()) {
    const productName = productInterestNameFromFact(fact);
    if (productSeen.has(`interest:${productName.toLowerCase()}`)) {
      continue;
    }
    productSeen.add(`interest:${productName.toLowerCase()}`);
    const sourceFactId = factKeyForReview(fact, index);
    const itemId = `review-product-interest-${productSeen.size}`;
    items.push({
      id: itemId,
      type: "product_intelligence",
      confidence: CONFIDENCE_DISPLAY[fact.confidence],
      evidenceQuotes: [formatEvidence(fact.evidence)],
      linkedFactKeys: [sourceFactId],
      linkedFieldUpdateIds: [],
      productName,
      productEvidenceStatus: "Interest noted",
      productImpactLine: "Product interest helps focus observation planning and follow-up questions.",
      topicTitle: productInterestSummaryLine(fact),
    });
    traceEmitted(debugLog, {
      sourceFactId,
      sourceCollection: "normalized_atomic_facts",
      reviewType: "product_intelligence",
      dedupeKey: `interest:${productName.toLowerCase()}`,
      itemId,
      label: productInterestSummaryLine(fact),
    });
  }

  const facilityFacts = facts.filter((f) => f.fact_type === "facility_intelligence");
  const facilitySeen = new Set<string>();
  for (const [index, fact] of facilityFacts.entries()) {
    const topic = organizationTopic(fact);
    const key = topic.toLowerCase();
    const sourceFactId = factKeyForReview(fact, index);
    if (facilitySeen.has(key)) {
      traceRemoved(debugLog, {
        sourceFactId,
        sourceCollection: "normalized_atomic_facts",
        reviewType: "organization_intelligence",
        dedupeKey: key,
        removalReason: "duplicate_organization_topic",
        label: topic,
      });
      continue;
    }
    facilitySeen.add(key);
    const itemId = `review-org-${facilitySeen.size}`;
    items.push({
      id: itemId,
      type: "organization_intelligence",
      confidence: CONFIDENCE_DISPLAY[fact.confidence],
      evidenceQuotes: [formatEvidence(fact.evidence)],
      linkedFactKeys: [sourceFactId],
      linkedFieldUpdateIds: linkFieldUpdates(fact, fieldUpdates),
      topicTitle: topic,
    });
    traceEmitted(debugLog, {
      sourceFactId,
      sourceCollection: "normalized_atomic_facts",
      reviewType: "organization_intelligence",
      dedupeKey: key,
      itemId,
      label: topic,
    });
  }

  const followUpSeen = new Set<string>();
  let followUpCount = 0;
  const pushFollowUp = (
    title: string,
    confidence: DebriefFactConfidence,
    evidence: string[],
    factKeys: string[],
    sourceCollection: ReviewUpdateDebugTrace["sourceCollection"],
    sourceFactId: string,
  ) => {
    const normalized = normalizeReviewTextApostrophes(title.trim()).replace(/\.$/, "");
    const dedupeKey = followUpSemanticDedupeKey(normalized);
    if (!normalized) return;

    if (hasObservationReadiness && isObservationReadinessFollowUp(normalized)) {
      traceRemoved(debugLog, {
        sourceFactId,
        sourceCollection,
        reviewType: "follow_up_task",
        dedupeKey,
        removalReason: "merged_into_observation_readiness",
        label: normalized,
      });
      return;
    }

    if (followUpSeen.has(dedupeKey)) {
      traceRemoved(debugLog, {
        sourceFactId,
        sourceCollection,
        reviewType: "follow_up_task",
        dedupeKey,
        removalReason: "duplicate_semantic_intent",
        label: normalized,
      });
      return;
    }

    if (followUpCount >= MAX_FOLLOW_UP_DECISIONS) {
      traceRemoved(debugLog, {
        sourceFactId,
        sourceCollection,
        reviewType: "follow_up_task",
        dedupeKey,
        removalReason: "follow_up_cap_exceeded",
        label: normalized,
      });
      return;
    }

    const displayTitle = canonicalFollowUpTitle(normalized, dedupeKey, contactsByName);

    if (isBlockedContactFollowUpTitle(displayTitle)) {
      traceRemoved(debugLog, {
        sourceFactId,
        sourceCollection,
        reviewType: "follow_up_task",
        dedupeKey,
        removalReason: "invalid_possessive_fragment",
        label: displayTitle,
      });
      return;
    }

    const providerTaskExclusion = shouldExcludeFollowUpTask(displayTitle, guardContext);
    if (providerTaskExclusion.exclude) {
      traceRemoved(debugLog, {
        sourceFactId,
        sourceCollection,
        reviewType: "follow_up_task",
        dedupeKey,
        removalReason: providerTaskExclusion.reason ?? "matches_provider",
        label: displayTitle,
      });
      return;
    }

    followUpSeen.add(dedupeKey);
    followUpCount += 1;
    const itemId = `review-follow-up-${followUpSeen.size}`;
    items.push({
      id: itemId,
      type: "follow_up_task",
      confidence,
      evidenceQuotes: evidence,
      linkedFactKeys: factKeys,
      linkedFieldUpdateIds: [],
      taskTitle: displayTitle,
      followUpReason: followUpReasonForTitle(displayTitle),
      suggestedDue: "Next Touch",
    });
    traceEmitted(debugLog, {
      sourceFactId,
      sourceCollection,
      reviewType: "follow_up_task",
      dedupeKey,
      itemId,
      label: displayTitle,
    });
  };

  if (contactInfoExplicitlyMissing(dictation)) {
    for (const [name, row] of contactsByName) {
      const contactBlob = `${row.evidence.join(" ")} ${dictation}`;
      if (hasContactInfoInText(contactBlob)) continue;
      pushFollowUp(
        buildContactInfoFollowUpTitle(row.fact.entity.trim()),
        CONFIDENCE_DISPLAY[row.fact.confidence],
        row.evidence,
        [factKeyForReview(row.fact, row.index)],
        "dictation_inference",
        `dictation:contact-info-missing:${name}`,
      );
    }
  }

  for (const [index, fact] of facts.entries()) {
    if (fact.fact_type !== "follow_up") continue;
    if (!isActionableFollowUpFact(fact)) {
      traceRemoved(debugLog, {
        sourceFactId: factKeyForReview(fact, index),
        sourceCollection: "normalized_atomic_facts",
        reviewType: "follow_up_task",
        dedupeKey: followUpSemanticDedupeKey(fact.value),
        removalReason: "misclassified_provider_statement",
        label: fact.value.trim(),
      });
      continue;
    }
    const title = fact.value.trim();
    if (!title) continue;
    const sourceFactId = factKeyForReview(fact, index);
    for (const part of splitFollowUpIntents(title)) {
      pushFollowUp(
        part,
        CONFIDENCE_DISPLAY[fact.confidence],
        [formatEvidence(fact.evidence)],
        [sourceFactId],
        "normalized_atomic_facts",
        sourceFactId,
      );
    }
  }

  if (
    credentialingFacts.length > 0 &&
    credentialingPlatformUnknown(credentialingFacts) &&
    followUpCount < MAX_FOLLOW_UP_DECISIONS
  ) {
    const credEvidence = credentialingFacts.reduce<string[]>(
      (acc, f) => mergeEvidence(acc, f.evidence),
      [],
    );
    pushFollowUp(
      "Confirm credentialing pathway/platform",
      "Medium",
      credEvidence,
      credentialingFacts.map((f, i) => factKeyForReview(f, i)),
      "dictation_inference",
      "dictation:credentialing-pathway-gap",
    );
  }

  return items;
}

export function buildReviewUpdateItems(
  input: Parameters<typeof buildReviewUpdateItemsAudited>[0],
): ReviewUpdateItem[] {
  return buildReviewUpdateItemsAudited(input);
}
