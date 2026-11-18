/**
 * Route debrief phrases to the correct discovery fields and human-readable evidence quotes.
 */

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import type { LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";
import type {
  IntelligenceDomain,
  StructuredIntelligenceAnalysis,
} from "@/lib/surgical-sales/structuredIntelligenceAnalysis";
import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  extractSourceQuoteFromPersistedValue,
  PARTIAL_INTELLIGENCE_LEAD_PREFIX,
} from "@/lib/surgical-sales/partialIntelligencePersist";
import type { SchedulingControlPathId } from "@/lib/surgical-sales/schedulingOwnershipFields";
import { sanitizeDiscoveryEvidenceQuote } from "@/lib/surgical-sales/discoveryIntelligenceEvidence";
import {
  isSchedulingOnlyNamedEntityEvidence,
  namedEntityEvidenceBelongsToSignal,
} from "@/lib/surgical-sales/namedEntityIntelligenceGuardrails";
import {
  assessObservationAccessFromDebrief,
  buildObservationAccessDebriefPersistValue,
} from "@/lib/surgical-sales/observationApprovalDebriefMapping";
import { opportunitySignalIdForDbKey } from "@/lib/surgical-sales/opportunityIntelligenceSignals";
import {
  isStageMappingSignalId,
  type StageMappingSignalId,
} from "@/lib/surgical-sales/stageMappingQuestions";
import { buildSchedulingOwnershipEvidenceSummary } from "@/lib/surgical-sales/namedEntityPreservation";
import { resolveCredentialingPlatformLabel } from "@/lib/surgical-sales/debriefCredentialingPlatformResolution";

export { buildSchedulingOwnershipEvidenceSummary } from "@/lib/surgical-sales/namedEntityPreservation";

function domainForField(
  field: LogUpdateRoutedFieldUpdate,
  review: LogUpdateParseResult,
): IntelligenceDomain | undefined {
  const ai = review.aiMapping;
  if (!ai) return undefined;
  const confirmed = ai.confirmed_updates.find((_, i) => field.id === `ai-confirmed-${i}`);
  if (confirmed) return confirmed.domain;
  const partial = ai.partial_updates.find((_, i) => field.id === `ai-partial-${i}`);
  return partial?.domain;
}

function sourceQuoteForField(
  field: LogUpdateRoutedFieldUpdate,
  review: LogUpdateParseResult,
): string | null {
  const ai = review.aiMapping as StructuredIntelligenceAnalysis | null;
  if (!ai) return null;
  const domain = domainForField(field, review);
  const signals = ai.operational_signals ?? [];
  const match =
    signals.find((s) => domain && s.domain === domain) ??
    signals.find((s) => s.signal.toLowerCase().includes(field.label.toLowerCase().slice(0, 12)));
  const evidence = match?.evidence?.trim();
  if (evidence && evidence.length > 8) return evidence.slice(0, 400);
  return null;
}

const SCHEDULING_DEBRIEF_RE =
  /\b(schedul(?:er|ing)|coordinator|office\s+manager|or\s+scheduling|books?\s+cases|case\s+timing|hospital\s+scheduling|facility\s+scheduling|works?\s+with\s+(?:the\s+)?or\s+(?:scheduling\s+)?team)\b/i;

const SHARED_SCHEDULING_RE =
  /\b(works?\s+with\s+(?:the\s+)?or\s+scheduling|office\s+and\s+or|both\s+office\s+and|or\s+scheduling\s+team)\b/i;

const PRODUCT_FIT_EVIDENCE_RE =
  /\b(acsis|product\s+fit|trial[- ]?ready|competitive|preference\s+card|product\s+interest|curved\s+design|learning\s+curve|suction\s+setup|existing\s+suction)\b/i;
const OBSERVATION_ACCESS_EVIDENCE_RE =
  /\b(observation|observe\s+a?\s*case|didn'?t\s+shut\s+down|not\s+opposed|right\s+people|getting\s+into\s+cases)\b/i;
const WORKFLOW_FRICTION_RE = /\b(visualization|fixation|workflow\s+pain|frustrat)/i;
const CASE_MIX_EVIDENCE_RE = /\b(abdominal\s+wall|robotic\s+hernia|case\s+mix|procedure\s+focus)\b/i;

export type SchedulingDebriefStrength = "clear" | "vague" | "none";

/** Classify how explicitly scheduling ownership was described in a debrief. */
export function classifySchedulingDebriefStrength(note: string): SchedulingDebriefStrength {
  const text = note.trim();
  if (!text) return "none";

  const handlesScheduling = /\bhandles?\s+scheduling\b/i.test(text);
  const worksWithOr = SHARED_SCHEDULING_RE.test(text);
  const explicitSchedulingLanguage = SCHEDULING_DEBRIEF_RE.test(text) || handlesScheduling;

  if (explicitSchedulingLanguage && (worksWithOr || handlesScheduling)) {
    return "clear";
  }

  const vagueTimingHint =
    /\bhelp(s|ed)?\s+with\s+timing\b/i.test(text) ||
    (/\b(came up|mentioned)\b/i.test(text) && /\b(timing|schedule)\b/i.test(text)) ||
    (/\b[A-Z][a-z]+\b/.test(text) &&
      /\b(timing|schedule)\b/i.test(text) &&
      /\b(few times|seems|maybe|probably|help)\b/i.test(text));

  if (vagueTimingHint) return "vague";
  if (explicitSchedulingLanguage) return "vague";
  return "none";
}

export function noteMatchesSchedulingOwnershipDebrief(note: string): boolean {
  return classifySchedulingDebriefStrength(note) !== "none";
}

export function inferSchedulingControlFromDebrief(note: string): SchedulingControlPathId | null {
  const text = note.trim();
  if (!text || classifySchedulingDebriefStrength(text) !== "clear") return null;
  if (SHARED_SCHEDULING_RE.test(text)) return "shared_workflow";
  if (/\b(hospital|facility|central)\s+scheduling\b/i.test(text) && !/\boffice\b/i.test(text)) {
    return "facility";
  }
  if (/\boffice\b/i.test(text) && /\bor\s+scheduling\b/i.test(text)) return "shared_workflow";
  if (
    /\boffice\b/i.test(text) ||
    /\bhandles?\s+most\b/i.test(text) ||
    /\bhandles?\s+scheduling\b/i.test(text)
  ) {
    return "provider_office";
  }
  return null;
}

export function isSchedulingOwnershipPartialLabel(label: string): boolean {
  return /\bscheduling\s+ownership\b/i.test(label);
}

export function humanEvidenceForDomain(
  domain: IntelligenceDomain,
  note: string,
  partialValue?: string,
): string | null {
  const value = partialValue?.trim() ?? "";
  switch (domain) {
    case "or_access": {
      const assessment = assessObservationAccessFromDebrief(note);
      if (assessment.observationInterest || assessment.observationApprovalExplicit) {
        return buildObservationAccessDebriefPersistValue(assessment);
      }
      if (/\bobserve\b/i.test(note) && /\bcase\b/i.test(note)) {
        return "Rep still needs to observe a case before confirming fit and access path.";
      }
      return value || null;
    }
    case "scheduling":
      return buildSchedulingOwnershipEvidenceSummary(note);
    case "credentialing": {
      const platform = resolveCredentialingPlatformLabel(note);
      if (platform.label === "Unknown") {
        return "Vendor credentialing is required; credentialing platform is Unknown on file.";
      }
      if (platform.label) {
        return `Vendor credentialing goes through ${platform.label}.`;
      }
      return value || null;
    }
    case "product_fit":
      if (/\bACSIS\b/i.test(note)) {
        return "ACSIS discussed conceptually; fit not validated through observation or surgeon-reviewed notes.";
      }
      return value || null;
    case "workflow":
      if (WORKFLOW_FRICTION_RE.test(note)) {
        return "Frustrations with visualization and fixation during certain cases were discussed.";
      }
      return value || null;
    case "case_mix":
      if (CASE_MIX_EVIDENCE_RE.test(note)) {
        return value || "More complex abdominal wall and robotic hernia work lately.";
      }
      return value || null;
    case "stakeholders":
      return value || null;
    default:
      return value || null;
  }
}

function narrativeFromPersistedValue(proposedValue: string): string | null {
  const blob = proposedValue.trim();
  if (!blob) return null;
  const fromSource = extractSourceQuoteFromPersistedValue(blob);
  if (fromSource) return fromSource;
  const narrative = blob
    .replace(new RegExp(`^${PARTIAL_INTELLIGENCE_LEAD_PREFIX}[^\\n]*\\n*`, "i"), "")
    .replace(/\n\nStill needed:[\s\S]*$/i, "")
    .replace(/\n\nSource:[\s\S]*$/i, "")
    .trim();
  return narrative.length >= 12 ? narrative : null;
}

const DB_KEY_TO_SIGNAL: Partial<Record<string, StageMappingSignalId>> = {
  provider_observation_feasibility: "observation_approval",
  provider_evaluation_openness: "observation_approval",
  provider_observation_coordinator_contact: "scheduling_owner",
  provider_scheduling_contact: "scheduling_owner",
  provider_facility_scheduling_contact: "scheduling_owner",
  provider_observation_scheduling_control: "scheduling_owner",
  provider_observation_access_path: "facility_vendor_pathway",
  provider_credentialing_platform_name: "facility_vendor_pathway",
  provider_credentialing_status: "facility_vendor_pathway",
  provider_observation_credentialing_needed: "facility_vendor_pathway",
  provider_observation_best_days_case_types: "observation_logistics",
  provider_procedure_focus: "workflow_visibility",
  provider_technique_preferences: "workflow_visibility",
  provider_workflow_pain_points: "workflow_visibility",
  provider_competitive_products: "product_alignment",
  provider_product_interests: "product_alignment",
  provider_preference_card_signals: "product_alignment",
  provider_champion_potential: "clinical_champion",
};

function resolveEvidenceSignalId(
  dbKey: string,
  signalId?: DiscoveryStructuredSignalId | null,
): StageMappingSignalId | null {
  if (signalId && isStageMappingSignalId(signalId)) return signalId;
  return opportunitySignalIdForDbKey(dbKey) ?? DB_KEY_TO_SIGNAL[dbKey] ?? null;
}

export function evidenceSnippetBelongsToDbKey(
  dbKey: string,
  quote: string,
  signalId?: DiscoveryStructuredSignalId | null,
): boolean {
  const text = quote.trim();
  if (!text) return true;

  const resolvedSignalId = resolveEvidenceSignalId(dbKey, signalId);

  if (signalId === "observation_approval" || dbKey === "provider_observation_feasibility") {
    if (PRODUCT_FIT_EVIDENCE_RE.test(text) && !OBSERVATION_ACCESS_EVIDENCE_RE.test(text)) return false;
    if (isSchedulingOnlyNamedEntityEvidence(text)) return false;
    return OBSERVATION_ACCESS_EVIDENCE_RE.test(text) || !PRODUCT_FIT_EVIDENCE_RE.test(text);
  }

  if (
    signalId === "scheduling_owner" ||
    dbKey === "provider_observation_scheduling_control" ||
    dbKey === "provider_scheduling_contact"
  ) {
    return SCHEDULING_DEBRIEF_RE.test(text) || isSchedulingOnlyNamedEntityEvidence(text);
  }

  if (
    signalId === "product_alignment" ||
    dbKey === "provider_preference_card_signals" ||
    dbKey === "provider_product_interests"
  ) {
    if (isSchedulingOnlyNamedEntityEvidence(text)) return false;
    return PRODUCT_FIT_EVIDENCE_RE.test(text) || !OBSERVATION_ACCESS_EVIDENCE_RE.test(text);
  }

  if (
    signalId === "workflow_visibility" ||
    dbKey === "provider_workflow_pain_points" ||
    dbKey === "provider_procedure_focus" ||
    dbKey === "provider_technique_preferences"
  ) {
    if (isSchedulingOnlyNamedEntityEvidence(text)) return false;
    return WORKFLOW_FRICTION_RE.test(text) || CASE_MIX_EVIDENCE_RE.test(text);
  }

  if (dbKey === "provider_evaluation_openness") {
    if (PRODUCT_FIT_EVIDENCE_RE.test(text) && !OBSERVATION_ACCESS_EVIDENCE_RE.test(text)) return false;
    if (isSchedulingOnlyNamedEntityEvidence(text)) return false;
    return OBSERVATION_ACCESS_EVIDENCE_RE.test(text);
  }

  if (resolvedSignalId && !namedEntityEvidenceBelongsToSignal(resolvedSignalId, text)) {
    return false;
  }

  return true;
}

export function humanEvidenceForFieldUpdate(
  field: LogUpdateRoutedFieldUpdate,
  logUpdate: LogUpdateParseResult,
): string | null {
  const fromSignals = sourceQuoteForField(field, logUpdate);
  if (fromSignals) {
    const cleaned = sanitizeDiscoveryEvidenceQuote(fromSignals);
    if (cleaned && evidenceSnippetBelongsToDbKey(field.dbKey, cleaned)) return cleaned;
  }

  const fromPersisted = extractSourceQuoteFromPersistedValue(field.proposedValue);
  if (fromPersisted) {
    const cleaned = sanitizeDiscoveryEvidenceQuote(fromPersisted);
    if (cleaned && evidenceSnippetBelongsToDbKey(field.dbKey, cleaned)) return cleaned;
  }

  const narrative = narrativeFromPersistedValue(field.proposedValue);
  if (narrative) {
    const cleaned = sanitizeDiscoveryEvidenceQuote(narrative);
    if (cleaned && evidenceSnippetBelongsToDbKey(field.dbKey, cleaned)) return cleaned;
  }

  const ai = logUpdate.aiMapping;
  if (ai) {
    const domain =
      ai.confirmed_updates.find((_, i) => field.id === `ai-confirmed-${i}`)?.domain ??
      ai.partial_updates.find((_, i) => field.id === `ai-partial-${i}`)?.domain;
    if (domain) {
      const human = humanEvidenceForDomain(domain, logUpdate.sourceText, field.proposedValue);
      const cleaned = human ? sanitizeDiscoveryEvidenceQuote(human) : null;
      if (cleaned && evidenceSnippetBelongsToDbKey(field.dbKey, cleaned)) return cleaned;
    }
  }

  if (
    field.dbKey === "provider_observation_scheduling_control" ||
    field.dbKey === "provider_scheduling_contact"
  ) {
    const schedulingEvidence = humanEvidenceForDomain("scheduling", logUpdate.sourceText);
    const cleaned = schedulingEvidence
      ? sanitizeDiscoveryEvidenceQuote(schedulingEvidence)
      : null;
    if (cleaned && evidenceSnippetBelongsToDbKey(field.dbKey, cleaned)) return cleaned;
  }

  if (
    field.dbKey === "provider_observation_feasibility" ||
    field.dbKey === "provider_observation_access_path"
  ) {
    const accessEvidence = humanEvidenceForDomain("or_access", logUpdate.sourceText);
    const cleaned = accessEvidence ? sanitizeDiscoveryEvidenceQuote(accessEvidence) : null;
    if (cleaned && evidenceSnippetBelongsToDbKey(field.dbKey, cleaned)) return cleaned;
  }

  const sourceFallback = sanitizeDiscoveryEvidenceQuote(logUpdate.sourceText);
  if (
    sourceFallback &&
    sourceFallback.length <= 500 &&
    evidenceSnippetBelongsToDbKey(field.dbKey, sourceFallback)
  ) {
    return sourceFallback;
  }

  return null;
}
