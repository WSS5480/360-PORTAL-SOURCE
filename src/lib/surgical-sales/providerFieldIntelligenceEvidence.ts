/**
 * Evidence gate — Provider Intelligence must not synthesize conclusions without field activity.
 */

import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { enrichProviderIntelligenceContact } from "@/lib/surgical-sales/enrichProviderIntelligenceContact";
import {
  parseProviderIntelligenceFieldMetadata,
  type IntelligenceCaptureSourceType,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { isPersistentIntelligenceDbKey } from "@/lib/surgical-sales/intelligenceScopeModel";

export type ProviderFieldIntelligenceEvidenceInput = {
  contact?: Record<string, unknown>;
  relatedContacts?: Array<Record<string, unknown>>;
  planDraft?: Record<string, string>;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[];
  activityTimeline?: Array<Record<string, unknown>>;
};

export type ProviderFieldIntelligenceEvidence = {
  hasEvidence: boolean;
  /** Which evidence categories are present (for diagnostics / tests). */
  sources: ProviderFieldIntelligenceEvidenceSource[];
};

export type ProviderFieldIntelligenceEvidenceSource =
  | "engagements"
  | "observations"
  | "debriefs"
  | "field_notes"
  | "product_support_cases";

const FIELD_CAPTURE_SOURCE_TYPES = new Set<IntelligenceCaptureSourceType>([
  "intro_call",
  "observation",
  "case",
  "engagement",
  "ai_capture",
  "promote",
]);

const FIELD_NOTE_ACTIVITY_TYPES = new Set([
  "clinical_discovery_updated",
  "clinical_discovery_insight_from_case",
  "provider_intelligence_updated",
  "provider_intelligence_promoted",
  "log_update",
  "field_note",
  "operational_note",
]);

function normalizeCaseType(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

function hasEngagementEvidence(engagements: ProviderEngagementSummary[] | undefined): boolean {
  return (engagements?.length ?? 0) > 0;
}

function hasObservationCaseEvidence(cases: Array<Record<string, unknown>> | undefined): boolean {
  return (cases ?? []).some((c) => normalizeCaseType(c.case_type) === "observation");
}

function hasProductSupportCaseEvidence(cases: Array<Record<string, unknown>> | undefined): boolean {
  return (cases ?? []).some((c) => normalizeCaseType(c.case_type) === "product_support");
}

function hasDebriefEvidence(input: ProviderFieldIntelligenceEvidenceInput): boolean {
  if ((input.engagements ?? []).some((e) => Boolean(e.debrief_completed))) return true;

  return (input.cases ?? []).some((c) => {
    const findings = String(c.debrief_key_findings ?? "").trim();
    if (findings) return true;
    return Boolean(c.debrief_completed);
  });
}

function hasFieldNotesEvidence(input: ProviderFieldIntelligenceEvidenceInput): boolean {
  const answers =
    input.clinicalDiscoveryAnswers ??
    (Array.isArray(input.contact?.clinical_discovery_answers)
      ? (input.contact!.clinical_discovery_answers as ProviderClinicalDiscoveryAnswer[])
      : []);
  if (answers.length > 0) return true;

  const meta = parseProviderIntelligenceFieldMetadata(
    input.contact?.provider_intelligence_field_metadata,
  );
  for (const entry of Object.values(meta)) {
    if (String(entry.evidence_text ?? "").trim()) return true;
    if (entry.source_engagement_id || entry.source_case_id) return true;
    if (entry.source_type && FIELD_CAPTURE_SOURCE_TYPES.has(entry.source_type)) return true;
    if (entry.validated_at?.trim()) return true;
    if (entry.lifecycle_state === "confirmed" || entry.lifecycle_state === "validated") return true;
  }

  for (const item of input.activityTimeline ?? []) {
    const rawType = String(item.activity_type ?? "").trim().toLowerCase();
    if (FIELD_NOTE_ACTIVITY_TYPES.has(rawType)) return true;
    if (rawType.includes("intelligence") || rawType.includes("discovery")) return true;
    const body = String(item.body ?? item.question_label ?? "").trim();
    if (body && (item.category === "discovery" || item.kind === "provider_activity")) return true;
  }

  return false;
}

/** Profile saves and linked support contacts count as field intelligence — not just debriefs. */
function hasProfileOrPersistedFieldCapture(input: ProviderFieldIntelligenceEvidenceInput): boolean {
  const meta = parseProviderIntelligenceFieldMetadata(
    input.contact?.provider_intelligence_field_metadata,
  );
  for (const entry of Object.values(meta)) {
    if (
      entry.source_type === "profile" &&
      (entry.validated_at?.trim() ||
        entry.lifecycle_state === "validated" ||
        entry.lifecycle_state === "confirmed")
    ) {
      return true;
    }
  }

  const contact = enrichProviderIntelligenceContact({
    contact: input.contact ?? {},
    relatedContacts: input.relatedContacts,
    planDraft: input.planDraft,
  });
  for (const [key, value] of Object.entries(contact)) {
    if (!isPersistentIntelligenceDbKey(key)) continue;
    if (fieldHasIntelligenceSignal(key, value)) return true;
  }
  return false;
}

/** True when at least one supported field-intelligence evidence source exists. */
export function providerHasFieldIntelligenceEvidence(
  input: ProviderFieldIntelligenceEvidenceInput,
): boolean {
  return resolveProviderFieldIntelligenceEvidence(input).hasEvidence;
}

export function resolveProviderFieldIntelligenceEvidence(
  input: ProviderFieldIntelligenceEvidenceInput,
): ProviderFieldIntelligenceEvidence {
  const sources: ProviderFieldIntelligenceEvidenceSource[] = [];

  if (hasEngagementEvidence(input.engagements)) sources.push("engagements");
  if (hasObservationCaseEvidence(input.cases)) sources.push("observations");
  if (hasDebriefEvidence(input)) sources.push("debriefs");
  if (hasFieldNotesEvidence(input) || hasProfileOrPersistedFieldCapture(input)) {
    sources.push("field_notes");
  }
  if (hasProductSupportCaseEvidence(input.cases)) sources.push("product_support_cases");

  return {
    hasEvidence: sources.length > 0,
    sources,
  };
}

export const FIELD_INTELLIGENCE_NOT_STARTED = {
  statusLabel: "Not Started",
  message: "No field intelligence has been captured yet.",
  recommendedActions: {
    startIntroCall: "Start Intro Call",
    createFirstEngagement: "Create First Engagement",
  },
} as const;
