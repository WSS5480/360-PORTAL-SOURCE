/**
 * Convert debrief extraction (facts + field patches) → structured commercial intelligence.
 * Category-driven only — no provider-, contact-, procedure-, or product-specific rules.
 */

import {
  normalizeClinicalIntelligenceFromFact,
  parseClinicalStorageValue,
  type ClinicalIntelligenceSignal,
  type NormalizedClinicalIntelligence,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { candidateContactsFromProposedList } from "@/lib/surgical-sales/candidateContactIntelligence";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";
import { isOrganizationContactDbKey } from "@/lib/surgical-sales/filterAcceptedCommercialIntelligenceInput";
import {
  atomicFactsToExtractedFacts,
  flattenExtractedFacts,
  type DebriefAtomicFact,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import { runPass2Classification } from "@/lib/surgical-sales/debriefIntelligencePipeline/pass2Classification";
import type { DebriefClassifiedFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import { CONTACT_INFO_MISSING_RE } from "@/lib/surgical-sales/debriefContactLeadExtraction";
import { DB_KEY_DEFAULT_CATEGORY } from "@/lib/surgical-sales/debriefIntelligenceMergeCategories";
import {
  calculateObservationReadinessFromCommercialIntelligence,
  mapDerivedReadinessToStoredState,
} from "@/lib/surgical-sales/deriveProviderObservationReadiness";
import {
  emptyProviderCommercialIntelligence,
  type ClinicalIntelligenceEntry,
  type IntelligenceTriState,
  type ObservationApprovalStatus,
  type ObservationAccessStatus,
  type ObservationReadinessState,
  type ProviderCommercialIntelligence,
  type SchedulerIdentifiedState,
  type SupportContactIntelligence,
} from "@/lib/surgical-sales/providerCommercialIntelligenceModel";

const APPROVAL_RANK: Record<ObservationApprovalStatus, number> = {
  approved: 5,
  interested: 4,
  discussed: 3,
  not_approved: 2,
  unknown: 1,
};

function mergeObservationApproval(
  current: ObservationApprovalStatus,
  incoming: ObservationApprovalStatus,
): ObservationApprovalStatus {
  return APPROVAL_RANK[incoming] > APPROVAL_RANK[current] ? incoming : current;
}

function setObservationApproval(
  intel: ProviderCommercialIntelligence,
  approval: ObservationApprovalStatus,
): void {
  intel.observation.approval_status = mergeObservationApproval(
    intel.observation.approval_status,
    approval,
  );
  const derivedInterest = interestFromApproval(intel.observation.approval_status);
  if (derivedInterest === "unknown") return;
  if (intel.observation.interest === "yes" && intel.observation.approval_status === "not_approved") {
    return;
  }
  intel.observation.interest = derivedInterest;
}

export type BuildCommercialIntelligenceInput = {
  atomicFacts?: DebriefAtomicFact[];
  classifiedFacts?: DebriefClassifiedFact[];
  fieldPatches?: Array<{ dbKey: string; value: string }>;
  proposedContacts?: DebriefProposedContactItem[];
  /** All review contacts — including skipped — for candidate persistence. */
  candidateContacts?: DebriefProposedContactItem[];
  sourceEngagementId?: string | null;
};

const OBSERVATION_FEASIBILITY_KEYS = new Set(["provider_observation_feasibility"]);
const OBSERVATION_ACCESS_PATH_KEY = "provider_observation_access_path";

const SCHEDULING_CONTACT_KEYS = new Set([
  "provider_scheduling_contact",
  "provider_observation_coordinator_contact",
  "provider_facility_scheduling_contact",
]);

const CREDENTIALING_KEYS = new Set([
  "provider_observation_credentialing_needed",
  "provider_credentialing_status",
  "provider_credentialing_platform_name",
]);

const CLINICAL_PROCEDURE_KEYS = new Set(["provider_procedure_focus", "provider_case_volume_estimate"]);
const CLINICAL_FRUSTRATION_KEYS = new Set([
  "provider_clinical_frustrations",
  "provider_dissatisfaction_areas",
  "provider_staff_frustrations",
]);
const CLINICAL_PREFERENCE_KEYS = new Set([
  "provider_technique_preferences",
  "provider_technique_detail",
]);
const CLINICAL_WORKFLOW_KEYS = new Set([
  "provider_workflow_pain_points",
  "provider_observation_best_days_case_types",
]);

const SCHEDULING_CONTROL_KEY = "provider_observation_scheduling_control";

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/[\s-]+/g, "_");
}

function hasContactInfo(text: string): boolean {
  if (!text.trim() || CONTACT_INFO_MISSING_RE.test(text)) return false;
  return /\b(?:@[a-z0-9.-]+\.[a-z]{2,}|\(\d{3}\)|\d{3}[-.\s]\d{3}[-.\s]?\d{4})\b/i.test(text);
}

function approvalFromFeasibilityToken(token: string): ObservationApprovalStatus {
  const t = token.trim().toLowerCase();
  if (!t) return "unknown";
  if (t === "approved" || t === "yes" || t === "easy") return "approved";
  if (t === "interested" || t === "mentioned") return "interested";
  if (t === "denied" || t === "no" || t === "blocked" || t === "not_allowed") return "not_approved";
  if (t === "restricted" || t === "credentialing_required") return "discussed";
  return "discussed";
}

function interestFromFeasibilityValue(value: string): IntelligenceTriState {
  const blob = value.toLowerCase();
  if (/\bobservation interest:\s*yes\b|\b(?:interested|not opposed|receptive)\b/.test(blob)) {
    return "yes";
  }
  if (/\bobservation interest:\s*no\b|\bnot interested\b/.test(blob)) {
    return "no";
  }
  return "unknown";
}

function approvalFromFeasibilityValue(value: string): ObservationApprovalStatus {
  const blob = value.toLowerCase();
  if (NEGATED_OBSERVATION_ACCESS_BLOB_RE.test(blob)) {
    return "not_approved";
  }
  if (/\bobservation approval:\s*yes\b|\bapproved for observation\b|\bobservation was approved\b/.test(blob)) {
    return "approved";
  }
  if (/\bobservation approval:\s*no\b|\bnot approved\b|\bobservation was not approved\b/.test(blob)) {
    return "not_approved";
  }
  if (/\bobservation interest:\s*yes\b|\b(?:interested|not opposed|receptive)\b/.test(blob)) {
    return "interested";
  }
  return approvalFromFeasibilityToken(value.trim().toLowerCase());
}

function interestFromApproval(approval: ObservationApprovalStatus): IntelligenceTriState {
  if (approval === "approved" || approval === "interested") return "yes";
  if (approval === "not_approved") return "no";
  if (approval === "discussed") return "yes";
  return "unknown";
}

const NEGATED_OBSERVATION_ACCESS_BLOB_RE =
  /\b(?:denied|not allow\w*|won'?t allow|not approved|refused|(?:temporarily )?(?:suspended|paused|halted)|on hold|revoked|rescinded|withdrawn|no longer (?:available|allowed|permitted|approved)|not (?:available|permitted)|can(?:not|'?t) (?:observe|attend))\b/;

function approvalFromObservationFact(fact: DebriefAtomicFact): ObservationApprovalStatus {
  const blob = `${fact.attribute} ${fact.value} ${fact.evidence}`.toLowerCase();
  // Negation first — "previously approved but access is suspended" is NOT approved.
  if (NEGATED_OBSERVATION_ACCESS_BLOB_RE.test(blob)) return "not_approved";
  if (/\b(?:approv|cleared|permission|can observe|allowed)\b/.test(blob)) return "approved";
  if (/\b(?:interest|not opposed|open|possible|receptive)\b/.test(blob)) return "interested";
  return "discussed";
}

function triStateFromRequiredBlob(blob: string): IntelligenceTriState {
  const t = blob.toLowerCase();
  // Negation must be checked first — "no longer required" contains "required".
  if (
    /\b(?:no\s+longer|not|isn'?t|is\s+not|never|won'?t\s+be)\s+(?:be\s+)?(?:required|needed|necessary)\b/.test(t) ||
    /\b(?:not_required|none|waived|no credential)\b/.test(t)
  ) {
    return "no";
  }
  if (/\b(?:required|credential|vendor credential|in_progress|pending)\b/.test(t)) return "yes";
  return "unknown";
}

function platformKnownFromBlob(blob: string): IntelligenceTriState {
  const t = blob.toLowerCase();
  if (
    /\b(?:unknown|unsure|not sure|unclear|tbd|confirm the credentialing|pathway unknown)\b/.test(t)
  ) {
    return "no";
  }
  if (/\b(?:platform|portal|system|vendor)\b/.test(t) && t.length >= 12) return "yes";
  return "unknown";
}

function schedulerStateFromContactValue(value: string): SchedulerIdentifiedState {
  const text = value.trim();
  if (!text) return "unknown";
  if (hasContactInfo(text)) return "yes";
  if (/\b(?:schedul|coordinator|office|handles)\b/i.test(text)) return "partial";
  return "partial";
}

function schedulingWorkflowKnownFromValue(value: string): IntelligenceTriState {
  const t = value.trim().toLowerCase();
  if (!t || t === "unknown") return "unknown";
  if (t === "shared_workflow" || t === "provider_office" || t === "facility") return "yes";
  return "no";
}

function clinicalBucketForSignal(signal: ClinicalIntelligenceSignal): keyof ProviderCommercialIntelligence["clinical"] {
  switch (signal) {
    case "clinical_frustration":
      return "clinical_frustrations";
    case "technology_preference":
      return "clinical_preferences";
    case "procedure_focus":
    case "increasing_procedure_volume":
    case "increasing_case_volume":
    case "new_procedure_adoption":
      return "procedure_focus";
    default:
      return "workflow_observations";
  }
}

function appendClinicalValue(
  clinical: ProviderCommercialIntelligence["clinical"],
  bucket: keyof ProviderCommercialIntelligence["clinical"],
  value: string,
): void {
  if (bucket === "trends" || bucket === "entries") return;
  const trimmed = value.trim();
  if (!trimmed) return;
  if (Array.isArray(clinical[bucket])) {
    (clinical[bucket] as string[]).push(trimmed);
  }
  if (bucket === "procedure_focus") {
    maybeAppendTrend(clinical, trimmed);
  }
}

function appendClinicalEntry(
  clinical: ProviderCommercialIntelligence["clinical"],
  normalized: NormalizedClinicalIntelligence,
): void {
  const key = `${normalized.categoryId}:${normalized.displayValue}`.toLowerCase();
  if (
    clinical.entries.some(
      (entry) => `${entry.category}:${entry.display_label}`.toLowerCase() === key,
    )
  ) {
    return;
  }
  const entry: ClinicalIntelligenceEntry = {
    category: normalized.categoryId,
    display_label: normalized.displayValue,
    source_text: normalized.sourceText,
    signal: normalized.signal,
    procedure_context:
      normalized.signal === "procedure_focus" ||
      normalized.categoryId === "procedure_focus"
        ? normalized.procedureFocus
        : normalized.procedureFocus || null,
  };
  clinical.entries.push(entry);
}

function appendProductInterest(
  clinical: ProviderCommercialIntelligence["clinical"],
  value: string,
): void {
  const trimmed = value.trim();
  if (!trimmed) return;

  appendClinicalValue(clinical, "product_interests", trimmed);
  const key = `product_opportunity:${trimmed}`.toLowerCase();
  if (
    clinical.entries.some(
      (entry) => `${entry.category}:${entry.display_label}`.toLowerCase() === key,
    )
  ) {
    return;
  }
  clinical.entries.push({
    category: "product_opportunity",
    display_label: trimmed,
    source_text: trimmed,
    signal: "product_opportunity",
    procedure_context: null,
  });
}

function applyNormalizedClinicalIntelligence(
  clinical: ProviderCommercialIntelligence["clinical"],
  normalized: NormalizedClinicalIntelligence,
  bucket: keyof ProviderCommercialIntelligence["clinical"],
): void {
  appendClinicalValue(clinical, bucket, normalized.storageValue);
  appendClinicalEntry(clinical, normalized);
}

function clinicalFieldSegments(value: string): string[] {
  const parts = value
    .split(/\||\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [value.trim()].filter(Boolean);
}

function applyClinicalFromDbKey(
  clinical: ProviderCommercialIntelligence["clinical"],
  dbKey: string,
  value: string,
): void {
  const pushSegment = (segment: string, bucket: keyof ProviderCommercialIntelligence["clinical"]) => {
    const normalized = normalizeClinicalIntelligenceFromFact({
      value: segment,
      evidence: segment,
    });
    if (normalized) {
      applyNormalizedClinicalIntelligence(clinical, normalized, bucket);
      return;
    }
    appendClinicalValue(clinical, bucket, segment);
  };

  if (CLINICAL_PROCEDURE_KEYS.has(dbKey)) {
    for (const segment of clinicalFieldSegments(value)) {
      pushSegment(segment, "procedure_focus");
    }
    return;
  }
  if (CLINICAL_FRUSTRATION_KEYS.has(dbKey)) {
    for (const segment of clinicalFieldSegments(value)) {
      pushSegment(segment, "clinical_frustrations");
    }
    return;
  }
  if (CLINICAL_PREFERENCE_KEYS.has(dbKey)) {
    for (const segment of clinicalFieldSegments(value)) {
      pushSegment(segment, "clinical_preferences");
    }
    return;
  }
  if (CLINICAL_WORKFLOW_KEYS.has(dbKey)) {
    for (const segment of clinicalFieldSegments(value)) {
      pushSegment(segment, "workflow_observations");
    }
    return;
  }
  const category = DB_KEY_DEFAULT_CATEGORY[dbKey];
  if (category === "clinical_procedures" || category === "clinical_trends") {
    for (const segment of clinicalFieldSegments(value)) {
      pushSegment(segment, "procedure_focus");
    }
  } else if (category === "clinical_pain_points") {
    for (const segment of clinicalFieldSegments(value)) {
      pushSegment(segment, "clinical_frustrations");
    }
  } else if (category === "workflow_intelligence") {
    for (const segment of clinicalFieldSegments(value)) {
      pushSegment(segment, "workflow_observations");
    }
  }
}

function supportContactFromProposed(contact: DebriefProposedContactItem): SupportContactIntelligence | null {
  const name = contact.displayName.trim();
  if (!name) return null;
  const scope = isOrganizationContactDbKey(contact.intelligenceDbKey)
    ? ("organization" as const)
    : ("provider" as const);
  return {
    contact_name: name,
    contact_role: contact.roleLabel?.trim() || contact.workflowLabel?.trim() || null,
    linked_contact_id: contact.linkedContactId?.trim() || null,
    scope,
  };
}

function maybeAppendTrend(clinical: ProviderCommercialIntelligence["clinical"], value: string): void {
  const parsed = parseClinicalStorageValue(value);
  if (!parsed || !/increasing|volume|trend|adoption/i.test(parsed.signalLabel)) return;
  const trend = `Increasing ${parsed.procedureFocus.charAt(0).toLowerCase()}${parsed.procedureFocus.slice(1)} volume`;
  clinical.trends.push(trend);
}

function applyAtomicFact(
  intel: ProviderCommercialIntelligence,
  fact: DebriefAtomicFact,
): void {
  switch (fact.fact_type) {
    case "observation_access": {
      setObservationApproval(intel, approvalFromObservationFact(fact));
      break;
    }
    case "credentialing": {
      const blob = `${fact.attribute} ${fact.value} ${fact.evidence}`;
      intel.credentialing.credentialing_required = triStateFromRequiredBlob(blob);
      intel.observation.credentialing_required = intel.credentialing.credentialing_required;
      const platformKnown = platformKnownFromBlob(blob);
      if (platformKnown !== "unknown") {
        intel.credentialing.credentialing_platform_known = platformKnown;
      }
      if (fact.value.trim()) {
        intel.credentialing.credentialing_notes.push(fact.value.trim());
      }
      break;
    }
    case "scheduling":
    case "workflow_contact": {
      const schedulingContext = /\bschedul/i.test(
        `${fact.fact_type} ${fact.attribute} ${fact.value} ${fact.evidence}`,
      );
      if (!schedulingContext && fact.fact_type === "workflow_contact") {
        if (fact.entity.trim()) {
        intel.support_contacts.push({
          contact_name: fact.entity.trim(),
          contact_role: slug(fact.attribute).replace(/_/g, " ") || null,
          linked_contact_id: null,
          scope: "provider",
        });
        }
        break;
      }
      const contactBlob = `${fact.evidence} ${fact.value}`;
      const state = schedulerStateFromContactValue(
        fact.entity.trim() ? `${fact.entity.trim()} — ${contactBlob}` : contactBlob,
      );
      intel.scheduling.scheduler_identified = state;
      intel.scheduling.scheduler_contact_linked = hasContactInfo(contactBlob) ? "yes" : "no";
      if (fact.entity.trim()) {
        intel.support_contacts.push({
          contact_name: fact.entity.trim(),
          contact_role: "scheduling",
          linked_contact_id: null,
          scope: "provider",
        });
      }
      break;
    }
    case "clinical_focus": {
      const attr = slug(fact.attribute);
      const normalized = normalizeClinicalIntelligenceFromFact({
        value: fact.value,
        evidence: fact.evidence,
        attribute: fact.attribute,
      });
      if (normalized) {
        const bucket =
          attr.includes("frustration") ||
          attr.includes("pain") ||
          attr.includes("dissatisfaction")
            ? "clinical_frustrations"
            : attr.includes("preference") || attr.includes("modality") || attr.includes("technique")
              ? "clinical_preferences"
              : attr.includes("workflow") || attr.includes("process")
                ? "workflow_observations"
                : clinicalBucketForSignal(normalized.signal);
        applyNormalizedClinicalIntelligence(intel.clinical, normalized, bucket);
      } else {
        if (
          attr.includes("frustration") ||
          attr.includes("pain") ||
          attr.includes("challenge") ||
          attr.includes("dissatisfaction")
        ) {
          appendClinicalValue(intel.clinical, "clinical_frustrations", fact.value);
        } else if (
          attr.includes("preference") ||
          attr.includes("modality") ||
          attr.includes("technique")
        ) {
          appendClinicalValue(intel.clinical, "clinical_preferences", fact.value);
        } else if (attr.includes("workflow") || attr.includes("process")) {
          appendClinicalValue(intel.clinical, "workflow_observations", fact.value);
        } else {
          appendClinicalValue(intel.clinical, "procedure_focus", fact.value);
        }
      }
      break;
    }
    case "product_fit": {
      const value = fact.entity.trim() || fact.value.trim() || fact.evidence.trim();
      appendProductInterest(intel.clinical, value);
      break;
    }
    case "facility_intelligence": {
      if (/\bcredential/i.test(`${fact.attribute} ${fact.value}`)) {
        const blob = `${fact.attribute} ${fact.value} ${fact.evidence}`;
        intel.credentialing.credentialing_required = triStateFromRequiredBlob(blob);
        intel.observation.credentialing_required = intel.credentialing.credentialing_required;
      }
      break;
    }
    default:
      break;
  }
}

function applyClassifiedFact(
  intel: ProviderCommercialIntelligence,
  fact: DebriefClassifiedFact,
): void {
  switch (fact.classification) {
    case "observation_access": {
      const attrs = fact.attributes ?? {};
      const value =
        typeof attrs.value === "string" ? attrs.value : fact.evidence_quote;
      const approval = approvalFromFeasibilityToken(slug(value));
      if (approval !== "unknown") {
        setObservationApproval(intel, approval);
      }
      break;
    }
    case "credentialing":
    case "scheduling":
    case "workflow_participant":
    case "clinical_focus":
      break;
    default:
      break;
  }
}

function applyFieldPatch(
  intel: ProviderCommercialIntelligence,
  dbKey: string,
  value: string,
): void {
  const trimmed = value.trim();
  if (!trimmed) return;

  if (OBSERVATION_FEASIBILITY_KEYS.has(dbKey)) {
    setObservationApproval(intel, approvalFromFeasibilityValue(trimmed));
    const interest = interestFromFeasibilityValue(trimmed);
    if (interest !== "unknown") {
      intel.observation.interest = interest;
    }
    return;
  }

  if (dbKey === OBSERVATION_ACCESS_PATH_KEY) {
    const blob = trimmed.toLowerCase();
    if (/\b(?:partial|blocker|approval pathway|credentialing)\b/.test(blob)) {
      intel.observation.access_status = "partial";
    } else if (/\b(?:open|cleared|approved|yes)\b/.test(blob)) {
      intel.observation.access_status = "open";
    } else if (/\b(?:blocked|denied|not allowed)\b/.test(blob)) {
      intel.observation.access_status = "blocked";
    }
    return;
  }

  if (dbKey === SCHEDULING_CONTROL_KEY) {
    intel.scheduling.scheduling_workflow_known = schedulingWorkflowKnownFromValue(trimmed);
    return;
  }

  if (SCHEDULING_CONTACT_KEYS.has(dbKey)) {
    const state = schedulerStateFromContactValue(trimmed);
    intel.scheduling.scheduler_identified = state;
    intel.scheduling.scheduler_contact_linked = hasContactInfo(trimmed) ? "yes" : "no";
    return;
  }

  if (CREDENTIALING_KEYS.has(dbKey)) {
    if (dbKey === "provider_credentialing_platform_name") {
      intel.credentialing.credentialing_platform_known = platformKnownFromBlob(trimmed);
      intel.credentialing.credentialing_notes.push(trimmed);
    } else {
      const required = triStateFromRequiredBlob(trimmed);
      intel.credentialing.credentialing_required = required;
      intel.observation.credentialing_required = required;
      if (required === "unknown" && /\bcredential/i.test(trimmed)) {
        intel.credentialing.credentialing_required = "yes";
        intel.observation.credentialing_required = "yes";
      }
      if (intel.credentialing.credentialing_platform_known === "unknown") {
        intel.credentialing.credentialing_platform_known = platformKnownFromBlob(trimmed);
      }
    }
    return;
  }

  if (
    dbKey === "provider_ideal_observation_cases" ||
    dbKey === "provider_observation_best_days_case_types"
  ) {
    if (trimmed.length >= 8) {
      intel.observation.readiness = "conditional";
    }
    return;
  }

  if (dbKey === "provider_product_interests") {
    for (const segment of clinicalFieldSegments(trimmed)) {
      appendProductInterest(intel.clinical, segment);
    }
    return;
  }

  applyClinicalFromDbKey(intel.clinical, dbKey, trimmed);
}

function deriveObservationAccessStatus(intel: ProviderCommercialIntelligence): ObservationAccessStatus {
  const { observation } = intel;
  if (observation.access_status !== "unknown") return observation.access_status;
  if (observation.approval_status === "not_approved" || observation.interest === "no") return "blocked";
  if (observation.approval_status === "approved" && observation.readiness === "ready") return "open";
  if (observation.approval_status === "approved") return "partial";
  if (
    observation.interest === "yes" ||
    observation.approval_status === "interested" ||
    observation.approval_status === "discussed"
  ) {
    return "partial";
  }
  return "unknown";
}

function deriveObservationReadiness(intel: ProviderCommercialIntelligence): ObservationReadinessState {
  const derived = calculateObservationReadinessFromCommercialIntelligence(intel);
  return mapDerivedReadinessToStoredState(derived.readiness);
}

function mergeSchedulerPartial(
  current: SchedulerIdentifiedState,
  incoming: SchedulerIdentifiedState,
): SchedulerIdentifiedState {
  if (current === "yes") return "yes";
  if (incoming === "partial" || current === "partial") return "partial";
  return incoming;
}

function observationAccessReversedInFacts(input: BuildCommercialIntelligenceInput): boolean {
  for (const fact of input.atomicFacts ?? []) {
    if (fact.fact_type !== "observation_access") continue;
    const blob = `${fact.attribute} ${fact.value} ${fact.evidence}`.toLowerCase();
    if (NEGATED_OBSERVATION_ACCESS_BLOB_RE.test(blob)) return true;
  }
  for (const fact of input.classifiedFacts ?? []) {
    if (fact.classification !== "observation_access") continue;
    if (NEGATED_OBSERVATION_ACCESS_BLOB_RE.test(fact.evidence_quote.toLowerCase())) return true;
  }
  return false;
}

function resolveClassifiedFacts(input: BuildCommercialIntelligenceInput): DebriefClassifiedFact[] {
  if (input.classifiedFacts?.length) return input.classifiedFacts;
  if (!input.atomicFacts?.length) return [];
  const extracted = atomicFactsToExtractedFacts(input.atomicFacts);
  return runPass2Classification(flattenExtractedFacts(extracted));
}

/** Build structured intelligence from generic debrief extraction output. */
export function buildProviderCommercialIntelligenceFromDebrief(
  input: BuildCommercialIntelligenceInput,
): ProviderCommercialIntelligence {
  const intel = emptyProviderCommercialIntelligence();
  intel.updated_at = new Date().toISOString();
  const classifiedFacts = resolveClassifiedFacts(input);

  for (const fact of classifiedFacts) {
    applyClassifiedFact(intel, fact);
  }

  for (const fact of input.atomicFacts ?? []) {
    applyAtomicFact(intel, fact);
  }

  for (const patch of input.fieldPatches ?? []) {
    applyFieldPatch(intel, patch.dbKey, patch.value);
  }

  // Reversal override: APPROVAL_RANK merges "most advanced wins", which lets a
  // historical "previously approved" outrank a current suspension. An explicit
  // negation ("temporarily suspended", "no longer available", "cannot attend")
  // is the current state and must win regardless of merge order.
  if (observationAccessReversedInFacts(input)) {
    intel.observation.approval_status = "not_approved";
    if (intel.observation.interest === "yes") {
      intel.observation.interest = "unknown";
    }
  }

  for (const contact of input.proposedContacts ?? []) {
    const row = supportContactFromProposed(contact);
    if (row) intel.support_contacts.push(row);
    if (contact.mentionLevel === "confirmed_support_contact") {
      intel.scheduling.scheduler_identified = "yes";
      intel.scheduling.scheduler_contact_linked =
        contact.email.trim() || contact.phone.trim() ? "yes" : "no";
    } else if (
      contact.mentionLevel === "workflow_participant" ||
      contact.mentionLevel === "potential_support_contact"
    ) {
      intel.scheduling.scheduler_identified = mergeSchedulerPartial(
        intel.scheduling.scheduler_identified,
        "partial",
      );
    }
  }

  const candidateSource = input.candidateContacts ?? input.proposedContacts ?? [];
  if (candidateSource.length > 0) {
    intel.candidate_contacts = candidateContactsFromProposedList(candidateSource, {
      sourceEngagementId: input.sourceEngagementId,
    });
  }

  intel.observation.readiness = deriveObservationReadiness(intel);
  intel.observation.access_status = deriveObservationAccessStatus(intel);
  intel.clinical.trends = [...new Set(intel.clinical.trends.map((t) => t.trim()).filter(Boolean))];
  intel.clinical.entries = [...intel.clinical.entries];

  return intel;
}
