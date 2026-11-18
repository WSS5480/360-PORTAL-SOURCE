/**
 * Discovery Mapping intelligence layers — raw evidence, interpretation, mapped category,
 * status, and confidence stored separately (never promote raw quotes to confirmed answers).
 */

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { humanEvidenceForFieldUpdate } from "@/lib/surgical-sales/debriefDiscoveryEvidenceRouting";
import {
  discoveryMappingIntelligenceCategory,
  DISCOVERY_MAPPING_INTELLIGENCE_CATEGORY_UI,
  type DiscoveryMappingIntelligenceCategory,
} from "@/lib/surgical-sales/discoveryMappingIntelligenceCategory";
import type { DiscoveryMappingIntelligenceConfidenceLevel } from "@/lib/surgical-sales/discoveryMappingIntelligenceConfidence";
import {
  isPlaceholderDiscoveryMappingAnswer,
  type DiscoveryMappingScanStatusSlug,
} from "@/lib/surgical-sales/discoveryMappingEvidenceQuality";
import { isGenericIntelligenceSummary } from "@/lib/surgical-sales/propagatedIntelligenceSignal";
import { opportunitySignalIdForDbKey } from "@/lib/surgical-sales/opportunityIntelligenceSignals";
import type { IntelligenceCaptureContext, IntelligenceCaptureSourceType } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { SCHEDULING_OWNER_FIELD_DB_KEYS } from "@/lib/surgical-sales/schedulingIntelligenceDbKeys";
import { stripPartialLeadPrefix } from "@/lib/surgical-sales/namedEntityIntelligenceGuardrails";
import {
  STAGE_MAPPING_QUESTIONS,
  type StageMappingSignalId,
} from "@/lib/surgical-sales/stageMappingQuestions";
import { isHumanReadableDiscoveryEvidence } from "@/lib/surgical-sales/discoveryIntelligenceEvidence";

export type DiscoveryMappingIntelligenceStatus =
  | "open"
  | "potential_lead"
  | "partial"
  | "confirmed";

export type DiscoveryMappingIntelligenceItem = {
  evidence_text: string;
  interpretation: string;
  mapped_category: string;
  mapped_question: string;
  confidence: DiscoveryMappingIntelligenceConfidenceLevel;
  status: DiscoveryMappingIntelligenceStatus;
  source_type: IntelligenceCaptureSourceType;
  source_id?: string;
};

const MAPPED_INTELLIGENCE_LABELS: Partial<Record<StageMappingSignalId, string>> = {
  observation_approval: "Observation access",
  scheduling_owner: "Scheduling ownership",
  facility_vendor_pathway: "Vendor access pathway",
  observation_logistics: "Observation timing",
  workflow_visibility: "Procedure focus / case mix",
  product_alignment: "Product alignment",
  case_opportunity: "Case opportunity sizing",
  clinical_champion: "Clinical champion",
  opportunity_clinical_frustrations: "Clinical frustrations",
  opportunity_workflow_inefficiencies: "Workflow inefficiencies",
  opportunity_products_in_use: "Products in use",
  opportunity_product_gaps: "Product gaps",
  opportunity_outcome_priorities: "Outcome priorities",
  opportunity_staff_frustrations: "Staff frustrations",
  opportunity_future_signals: "Future opportunity signals",
};

const RAW_EVIDENCE_RE =
  /\b(said|mentioned|stated|noted|told us|according to|described|brought up|came up)\b/i;

const DB_KEY_TO_SIGNAL: Partial<Record<string, StageMappingSignalId>> = {
  provider_observation_feasibility: "observation_approval",
  provider_evaluation_openness: "observation_approval",
  provider_observation_access_path: "facility_vendor_pathway",
  provider_observation_best_days_case_types: "observation_logistics",
  provider_procedure_focus: "workflow_visibility",
  provider_technique_preferences: "workflow_visibility",
  provider_workflow_pain_points: "workflow_visibility",
  provider_preference_card_signals: "product_alignment",
  provider_competitive_products: "product_alignment",
  provider_case_volume_estimate: "case_opportunity",
  provider_champion_potential: "clinical_champion",
};

// Lazy merge — schedulingIntelligenceDbKeys participates in an import cycle
// with this module (via providerIntelligenceValidatedOnFile →
// providerIntelligenceFieldMetadata), so SCHEDULING_OWNER_FIELD_DB_KEYS may
// not be initialized yet at module-evaluation time.
let schedulingOwnerKeysMerged = false;
function dbKeyToSignal(): Partial<Record<string, StageMappingSignalId>> {
  if (!schedulingOwnerKeysMerged) {
    schedulingOwnerKeysMerged = true;
    for (const key of SCHEDULING_OWNER_FIELD_DB_KEYS) {
      DB_KEY_TO_SIGNAL[key] = "scheduling_owner";
    }
  }
  return DB_KEY_TO_SIGNAL;
}

export function resolveStageMappingSignalForDbKey(dbKey: string): StageMappingSignalId | null {
  const fromOpportunity = opportunitySignalIdForDbKey(dbKey);
  if (fromOpportunity) return fromOpportunity;
  return dbKeyToSignal()[dbKey] ?? null;
}

export function mappedIntelligenceLabelForSignal(signalId: StageMappingSignalId): string {
  return MAPPED_INTELLIGENCE_LABELS[signalId] ?? STAGE_MAPPING_QUESTIONS[signalId] ?? signalId;
}

export function mappedCategoryLabelForSignal(signalId: StageMappingSignalId): string {
  const category = discoveryMappingIntelligenceCategory(signalId);
  const ui = DISCOVERY_MAPPING_INTELLIGENCE_CATEGORY_UI[category];
  const mapped = mappedIntelligenceLabelForSignal(signalId);
  return `${ui.title} · ${mapped}`;
}

export function looksLikeRawEvidenceQuote(text: string): boolean {
  const blob = String(text ?? "").trim();
  if (!blob) return false;
  if (blob.includes('"') || blob.includes("Source:")) return true;
  if (/^[A-Z][a-z]+\s+(mentioned|said|told|noted)\b/i.test(blob)) return true;
  return RAW_EVIDENCE_RE.test(blob) && blob.length > 48;
}

export function buildInterpretationForSignal(
  signalId: StageMappingSignalId,
  evidenceText: string | null,
  fieldValue: string | null,
): string | null {
  const narrative = stripPartialLeadPrefix(String(fieldValue ?? "")).trim();
  const candidates = [
    narrative,
    String(evidenceText ?? "").trim(),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (isPlaceholderDiscoveryMappingAnswer(candidate)) continue;
    if (isGenericIntelligenceSummary(candidate)) continue;
    if (looksLikeRawEvidenceQuote(candidate)) continue;
    if (candidate.length >= 12) return candidate.endsWith(".") ? candidate : `${candidate}.`;
  }

  const partialLeadName = String(fieldValue ?? "").includes("[Partial lead]")
    ? narrative.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$/)?.[1]
    : null;
  if (partialLeadName) {
    switch (signalId) {
      case "scheduling_owner":
        return `${partialLeadName} was mentioned as a potential scheduling contact.`;
      case "clinical_champion":
        return `${partialLeadName} was mentioned as a potential clinical champion.`;
      default:
        return `${partialLeadName} was mentioned as a potential contact lead.`;
    }
  }

  const evidence = String(evidenceText ?? "").trim();
  if (!evidence) return null;

  switch (signalId) {
    case "workflow_visibility":
    case "case_opportunity":
      if (/\b(abdominal wall|hernia|robotic|case mix|procedure)\b/i.test(evidence)) {
        return "Procedure mix may be shifting toward more complex cases.";
      }
      if (/\b(visualization|fixation|workflow)\b/i.test(evidence)) {
        return "Workflow friction was discussed and may affect product fit.";
      }
      break;
    case "scheduling_owner":
      if (/\bKaren\b/i.test(evidence) && /\bschedul/i.test(evidence)) {
        return "Karen may coordinate observation scheduling through the provider office.";
      }
      if (/\bschedul/i.test(evidence)) {
        return "Scheduling coordination was discussed; ownership still needs confirmation.";
      }
      break;
    case "observation_approval":
      if (/\b(not opposed|didn'?t shut down|open to observation)\b/i.test(evidence)) {
        return "Observation access appears possible, but approval is not confirmed.";
      }
      break;
    case "product_alignment":
      if (/\b(acsis|product|fit|competitive)\b/i.test(evidence)) {
        return "Early product interest surfaced; fit still needs validation in live cases.";
      }
      break;
    default:
      break;
  }

  return null;
}

export function scanStatusToIntelligenceStatus(
  slug: DiscoveryMappingScanStatusSlug,
): DiscoveryMappingIntelligenceStatus {
  return slug;
}

export function buildDiscoveryMappingIntelligenceItem(input: {
  dbKey: string;
  signalId?: StageMappingSignalId | null;
  evidenceText: string | null;
  fieldValue?: string | null;
  interpretation?: string | null;
  confidence?: DiscoveryMappingIntelligenceConfidenceLevel;
  status?: DiscoveryMappingIntelligenceStatus;
  captureContext: IntelligenceCaptureContext;
  questionText?: string | null;
}): DiscoveryMappingIntelligenceItem | null {
  const signalId =
    input.signalId ?? resolveStageMappingSignalForDbKey(input.dbKey);
  if (!signalId) return null;

  const evidence_text = String(input.evidenceText ?? "").trim();
  if (!evidence_text || !isHumanReadableDiscoveryEvidence(evidence_text)) return null;

  const interpretation =
    String(input.interpretation ?? "").trim() ||
    buildInterpretationForSignal(signalId, evidence_text, input.fieldValue ?? null);
  if (!interpretation || isPlaceholderDiscoveryMappingAnswer(interpretation, input.questionText)) {
    return null;
  }

  const mapped_question =
    String(input.questionText ?? "").trim() || STAGE_MAPPING_QUESTIONS[signalId];

  return {
    evidence_text,
    interpretation,
    mapped_category: mappedCategoryLabelForSignal(signalId),
    mapped_question,
    confidence: input.confidence ?? "medium",
    status: input.status ?? "partial",
    source_type: input.captureContext.source_type,
    source_id:
      input.captureContext.source_engagement_id?.trim() ||
      input.captureContext.source_case_id?.trim() ||
      undefined,
  };
}

export function buildDiscoveryMappingItemsFromLogUpdate(input: {
  logUpdate: LogUpdateParseResult;
  captureContext: IntelligenceCaptureContext;
}): Record<string, DiscoveryMappingIntelligenceItem> {
  const out: Record<string, DiscoveryMappingIntelligenceItem> = {};
  if (!input.logUpdate.usesProviderIntelligence) return out;

  for (const field of input.logUpdate.fieldUpdates) {
    if (!field.accepted || !field.dbKey) continue;

    const signalId = resolveStageMappingSignalForDbKey(field.dbKey);
    if (!signalId) continue;

    const evidenceText = humanEvidenceForFieldUpdate(field, input.logUpdate);
    const ai = input.logUpdate.aiMapping;
    const partial = ai?.partial_updates.find((_, i) => field.id === `ai-partial-${i}`);
    const interpretation =
      partial?.value?.trim() ||
      stripPartialLeadPrefix(field.proposedValue).split("\n\nStill needed:")[0]?.trim() ||
      null;

    const item = buildDiscoveryMappingIntelligenceItem({
      dbKey: field.dbKey,
      signalId,
      evidenceText,
      fieldValue: field.proposedValue,
      interpretation,
      captureContext: input.captureContext,
      questionText: STAGE_MAPPING_QUESTIONS[signalId],
      status: "partial",
      confidence: partial?.confidence === "high" ? "high" : partial?.confidence === "low" ? "low" : "medium",
    });
    if (item) out[field.dbKey] = item;
  }

  return out;
}

export function parseDiscoveryMappingIntelligenceItem(raw: unknown): DiscoveryMappingIntelligenceItem | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const evidence_text = String(row.evidence_text ?? "").trim();
  const interpretation = String(row.interpretation ?? "").trim();
  const mapped_category = String(row.mapped_category ?? "").trim();
  const mapped_question = String(row.mapped_question ?? "").trim();
  const confidence = String(row.confidence ?? "medium").trim() as DiscoveryMappingIntelligenceConfidenceLevel;
  const status = String(row.status ?? "partial").trim() as DiscoveryMappingIntelligenceStatus;
  const source_type = String(row.source_type ?? "profile").trim() as IntelligenceCaptureSourceType;

  if (!evidence_text || !interpretation || !mapped_category || !mapped_question) return null;
  if (!["high", "medium", "low"].includes(confidence)) return null;
  if (!["open", "potential_lead", "partial", "confirmed"].includes(status)) return null;

  return {
    evidence_text,
    interpretation,
    mapped_category,
    mapped_question,
    confidence,
    status,
    source_type,
    source_id: String(row.source_id ?? "").trim() || undefined,
  };
}

export function resolveDiscoveryMappingIntelligenceItem(input: {
  dbKeys: string[];
  fieldMeta: Record<string, { discovery_mapping?: DiscoveryMappingIntelligenceItem } | undefined>;
  signalId: StageMappingSignalId;
  questionText: string;
  evidenceText?: string | null;
  fieldValue?: string | null;
  interpretationFallback?: string | null;
  confidence?: DiscoveryMappingIntelligenceConfidenceLevel;
  status?: DiscoveryMappingIntelligenceStatus;
  captureContext?: IntelligenceCaptureContext | null;
}): DiscoveryMappingIntelligenceItem | null {
  for (const dbKey of input.dbKeys) {
    const stored = input.fieldMeta[dbKey]?.discovery_mapping;
    if (stored?.interpretation) return stored;
  }

  const evidenceText =
    input.evidenceText?.trim() ||
    input.dbKeys
      .map((key) => input.fieldMeta[key]?.discovery_mapping?.evidence_text)
      .find(Boolean) ||
    null;

  if (!evidenceText) return null;

  return buildDiscoveryMappingIntelligenceItem({
    dbKey: input.dbKeys[0] ?? "",
    signalId: input.signalId,
    evidenceText,
    fieldValue: input.fieldValue ?? null,
    interpretation: input.interpretationFallback,
    confidence: input.confidence,
    status: input.status,
    captureContext: input.captureContext ?? { source_type: "profile" },
    questionText: input.questionText,
  });
}
