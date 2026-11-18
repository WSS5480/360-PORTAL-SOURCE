/**
 * Discovery Mapping question cards — applied intelligence read model.
 */

import type { DiscoveryMappingQuestionView } from "@/lib/surgical-sales/buildDiscoveryMappingQuestionView";
import type { StageMappingQuestion } from "@/lib/surgical-sales/buildStageMappingSession";
import { formatStageMappingCompactSummary } from "@/lib/surgical-sales/formatStageMappingCompactSummary";
import {
  buildProviderOperationalState,
  operationalEvidenceForDbKey,
  sanitizeOperationalUserText,
} from "@/lib/surgical-sales/operationalIntelligenceEngine";
import type { StageMappingValidationStatus } from "@/lib/surgical-sales/stageMappingAnswerTypes";
import { stageMappingRegistryDbKeys } from "@/lib/surgical-sales/stageMappingQuestionRegistry";
import type { StageMappingSignalId } from "@/lib/surgical-sales/stageMappingQuestions";
import {
  formatDiscoveryMappingAttributionLine,
  formatDiscoveryMappingSourceReviewedLine,
  inferStageMappingValidationStatus,
  isDebriefExtractionSource,
  isManualMappingSource,
  resolveStageMappingSignalAttribution,
} from "@/lib/surgical-sales/stageMappingSourceAttribution";
import {
  isOperationalMappingSignal,
  isSalesMappingSignal,
} from "@/lib/surgical-sales/discoveryMappingIntelligenceCategory";
import {
  schedulingControlPathFromContact,
  type SchedulingControlPathId,
} from "@/lib/surgical-sales/schedulingOwnershipFields";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import {
  formatPropagatedSignalSummary,
  isGenericIntelligenceSummary,
  resolvePropagatedSignalForStageMapping,
  stillNeedFromPropagatedSignal,
} from "@/lib/surgical-sales/propagatedIntelligenceSignal";
import type { DiscoveryMappingIntelligenceConfidenceLevel } from "@/lib/surgical-sales/discoveryMappingIntelligenceConfidence";
import {
  discoveryMappingScanFromEvidenceConfidence,
  DISCOVERY_MAPPING_EVIDENCE_CONFIDENCE_LABEL,
  inferDiscoveryMappingEvidenceConfidence,
  legacyIntelligenceConfidenceFromEvidenceConfidence,
  type DiscoveryMappingEvidenceConfidence,
} from "@/lib/surgical-sales/discoveryMappingEvidenceConfidence";
import {
  assessDiscoveryMappingEvidence,
  DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY,
  inferDiscoveryMappingValidationStatus,
  isDiscoveryMappingValidatedOnFile,
  isPlaceholderDiscoveryMappingAnswer,
  type DiscoveryMappingEvidenceStrength,
  type DiscoveryMappingScanStatusSlug,
} from "@/lib/surgical-sales/discoveryMappingEvidenceQuality";
import { isHumanReadableDiscoveryEvidence } from "@/lib/surgical-sales/discoveryIntelligenceEvidence";
import { formatDiscoveryMappingIntelligenceDisplaySummary } from "@/lib/surgical-sales/discoveryMappingDisplayFormat";
import { partialLeadBelongsToSignal, stripPartialLeadPrefix } from "@/lib/surgical-sales/namedEntityIntelligenceGuardrails";
import {
  buildInterpretationForSignal,
  looksLikeRawEvidenceQuote,
  resolveDiscoveryMappingIntelligenceItem,
  scanStatusToIntelligenceStatus,
} from "@/lib/surgical-sales/discoveryMappingIntelligenceItem";

export type DiscoveryMappingSuggestedContactLead = {
  name: string;
  hint: string;
  dbKey: string;
};

export type DiscoveryMappingCurrentIntelligenceBlock = {
  /** Interpretation layer — synthesized insight, not raw evidence or the question. */
  summary: string;
  mappedCategory: string | null;
  rawEvidence: string | null;
  sourceLine: string;
  statusLabel: string;
  validationStatus: StageMappingValidationStatus;
  evidenceConfidence: DiscoveryMappingEvidenceConfidence;
  evidenceConfidenceLabel: string;
  confidenceLevel: DiscoveryMappingIntelligenceConfidenceLevel;
  confidenceLabel: string;
  suggestedNextAction: string | null;
};

export type DiscoveryMappingCardIntelligence = {
  hasAppliedIntelligence: boolean;
  evidenceStrength: DiscoveryMappingEvidenceStrength;
  scanStatus: { label: string; slug: DiscoveryMappingScanStatusSlug };
  currentIntelligence: DiscoveryMappingCurrentIntelligenceBlock | null;
  stillNeedToConfirm: string[];
  suggestedContactLead: DiscoveryMappingSuggestedContactLead | null;
  understandingSummary: string | null;
};

const PARTIAL_LEAD_RE = /\[Partial lead\]\s*([A-Z][a-z]+)/;

const SIGNAL_STILL_NEED_BUILDERS: Partial<
  Record<StageMappingSignalId, (ctx: StillNeedContext) => string[]>
> = {
  scheduling_owner: (ctx) => {
    const items: string[] = [];
    const name = ctx.contactLeadName;
    if (name) {
      items.push(`Is ${name} the scheduling owner or only helping?`);
      if (!ctx.schedulingControlConfirmed) {
        items.push(
          "Is scheduling controlled by provider office, facility, or shared workflow?",
        );
      }
      items.push(`What is ${name}'s contact information?`);
    } else if (!ctx.schedulingControlConfirmed) {
      items.push(
        "Is scheduling controlled by provider office, facility, or shared workflow?",
      );
      items.push("Who owns observation scheduling?");
    }
    return items;
  },
  observation_approval: () => [
    "Who must approve observation access?",
    "Are there conditions before observation can be scheduled?",
  ],
  facility_vendor_pathway: () => [
    "Which credentialing platform or steps apply?",
    "Who approves vendor access at this facility?",
  ],
  observation_logistics: () => ["What are the best days or case types for observation?"],
  workflow_visibility: () => [
    "What procedure workflow details are still unclear?",
    "What should be validated on the next touch?",
  ],
  product_alignment: () => [
    "What product fit signals still need confirmation?",
    "Which competitive context should be validated?",
  ],
  case_opportunity: () => [
    "What volume or timing assumptions need confirmation?",
    "Which procedure types drive the opportunity?",
  ],
  clinical_champion: (ctx) => {
    const name = ctx.contactLeadName;
    if (name) {
      return [
        `Is ${name} the clinical champion or only a workflow contact?`,
        `What is ${name}'s contact information?`,
      ];
    }
    return ["Who is the clinical champion for this provider?"];
  },
  opportunity_clinical_frustrations: () => [
    "Which clinical frustrations are highest priority?",
    "What evidence supports each frustration?",
  ],
  opportunity_workflow_inefficiencies: () => [
    "Which workflow steps cause the most delay?",
    "Who else experiences this friction?",
  ],
  opportunity_products_in_use: () => [
    "Which products are confirmed in active use?",
    "Are preference cards or contracts locking incumbents in?",
    "Which competitor products were directly observed?",
  ],
  opportunity_product_gaps: () => [
    "What capability gaps were explicitly mentioned?",
    "Would a new product solve a documented workaround?",
  ],
  opportunity_outcome_priorities: () => [
    "Which outcomes matter most clinically vs operationally?",
    "How does the provider measure success today?",
  ],
  opportunity_staff_frustrations: () => [
    "Which staff roles raised concerns?",
    "Do staff frustrations block product adoption?",
  ],
  opportunity_future_signals: () => [
    "What expansion or evaluation windows were hinted at?",
    "Who owns the next step toward a pilot or trial?",
  ],
};

type StillNeedContext = {
  contactLeadName: string | null;
  schedulingControlConfirmed: boolean;
  validationStatus: StageMappingValidationStatus;
};

function extractPartialContactLead(
  contact: Record<string, unknown>,
  dbKeys: string[],
  signalId: StageMappingSignalId,
): DiscoveryMappingSuggestedContactLead | null {
  const meta = parseProviderIntelligenceFieldMetadata(
    contact.provider_intelligence_field_metadata,
  );

  for (const dbKey of dbKeys) {
    const raw = String(contact[dbKey] ?? "").trim();
    if (!raw) continue;

    const match = raw.match(PARTIAL_LEAD_RE);
    if (!match?.[1]) continue;

    const evidenceText = meta[dbKey]?.evidence_text ?? null;
    if (
      !partialLeadBelongsToSignal({
        signalId,
        fieldText: raw,
        evidenceText,
      })
    ) {
      continue;
    }

    const name = match[1].trim();
    const hint = inferContactLeadHint(raw, dbKey);
    return { name, hint, dbKey };
  }
  return null;
}

function inferContactLeadHint(raw: string, dbKey: string): string {
  const lower = raw.toLowerCase();
  if (/\bschedul|timing\b/.test(lower) || dbKey.includes("scheduling")) {
    return "Mentioned as helping with timing";
  }
  if (/\bchampion\b/.test(lower) || dbKey.includes("champion")) {
    return "Mentioned as a possible clinical champion";
  }
  if (/\bcredential|vendor|access\b/.test(lower)) {
    return "Mentioned in access or credentialing context";
  }
  if (/\bcoordinat\b/.test(lower)) {
    return "Mentioned as a coordination contact";
  }
  return "Mentioned during debrief";
}

function schedulingControlIsConfirmed(contact: Record<string, unknown>): boolean {
  const path = schedulingControlPathFromContact(contact);
  if (!path || path === "unknown") return false;
  return isIntelligenceFieldValidatedOnFile(
    "provider_observation_scheduling_control",
    contact,
  );
}

function cleanInterpretationBody(input: {
  signalId: StageMappingSignalId;
  interpretation: string | null;
  evidenceText: string | null;
  fieldValue: string | null;
  questionText: string;
}): string | null {
  const synthesized =
    buildInterpretationForSignal(input.signalId, input.evidenceText, input.fieldValue) ?? null;
  const raw = input.interpretation?.trim() || synthesized || "";
  if (raw && /^\[Partial lead\]/i.test(raw)) {
    return (
      buildInterpretationForSignal(input.signalId, input.evidenceText, input.fieldValue) ??
      stripPartialLeadPrefix(raw)
    );
  }

  const stripped = stripPartialLeadPrefix(raw)?.trim() ?? "";
  if (
    stripped &&
    !isPlaceholderDiscoveryMappingAnswer(stripped, input.questionText) &&
    !looksLikeRawEvidenceQuote(stripped)
  ) {
    return stripped.endsWith(".") ? stripped : `${stripped}.`;
  }

  return synthesized;
}

function intelligenceStatusLabel(scanLabel: string): string {
  return scanLabel;
}

function collectFieldValues(contact: Record<string, unknown>, dbKeys: string[]): string[] {
  return dbKeys
    .map((dbKey) => String(contact[dbKey] ?? "").trim())
    .filter(Boolean);
}

function resolveInterpretationFallback(input: {
  signalId: StageMappingSignalId;
  questionText: string;
  propagatedSummary: string | null;
  operationalSummary: string | null;
  compactSummary: string | null;
  evidenceText: string | null;
  fieldValues: string[];
}): string | null {
  const candidates = [
    input.propagatedSummary,
    input.operationalSummary,
    input.compactSummary,
    ...input.fieldValues.map((value) => stripPartialLeadPrefix(value)),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (isPlaceholderDiscoveryMappingAnswer(candidate, input.questionText)) continue;
    if (isGenericIntelligenceSummary(candidate)) continue;
    if (looksLikeRawEvidenceQuote(candidate)) continue;
    return candidate.endsWith(".") ? candidate : `${candidate}.`;
  }

  const fieldValue = input.fieldValues.find(Boolean) ?? null;
  return buildInterpretationForSignal(
    input.signalId,
    input.evidenceText,
    fieldValue,
  );
}

function suggestedNextActionForOpenSignal(signalId: StageMappingSignalId): string {
  if (isOperationalMappingSignal(signalId)) {
    switch (signalId) {
      case "scheduling_owner":
        return "Ask during your next call who controls observation scheduling.";
      case "observation_approval":
        return "Ask during your next call who must approve observation access.";
      case "facility_vendor_pathway":
        return "Ask during your next call what vendor credentialing is required.";
      case "observation_logistics":
        return "Ask during your next call about the best observation timing.";
      default:
        return "Ask during your next call to fill this access gap.";
    }
  }

  if (isSalesMappingSignal(signalId)) {
    switch (signalId) {
      case "workflow_visibility":
        return "Observe a relevant case or log field intel on your next touch.";
      case "product_alignment":
        return "Observe a case or log field intel to assess product alignment.";
      case "case_opportunity":
        return "Log field intel on case volume or observe cases to size the opportunity.";
      case "clinical_champion":
        return "Ask during your next call who influences clinical decisions.";
      default:
        return "Log field intel or validate on your next touch.";
    }
  }

  return "Log field intel on your next touch.";
}

function suggestedNextActionForSignal(
  signalId: StageMappingSignalId,
  validationStatus: StageMappingValidationStatus,
  stillNeed: string[],
): string | null {
  if (validationStatus === "confirmed") return null;
  if (stillNeed[0]) return stillNeed[0];

  switch (signalId) {
    case "scheduling_owner":
      return "Confirm scheduling owner and capture contact details.";
    case "observation_approval":
      return "Confirm observation access on your next touch.";
    case "facility_vendor_pathway":
      return "Confirm credentialing requirements and vendor approval path.";
    case "clinical_champion":
      return "Identify and link the clinical champion.";
    default:
      return "Capture more detail on your next touch.";
  }
}

function buildSchedulingIntelligenceSummary(input: {
  contact: Record<string, unknown>;
  contactLeadName: string | null;
  validationStatus: StageMappingValidationStatus;
  operationalSummary: string | null;
  propagatedSummary: string | null;
}): string {
  if (input.propagatedSummary && !isGenericIntelligenceSummary(input.propagatedSummary)) {
    return input.propagatedSummary;
  }

  const name = input.contactLeadName;
  const control = schedulingControlPathFromContact(input.contact);
  const controlValidated = schedulingControlIsConfirmed(input.contact);

  if (name) {
    if (!controlValidated && control && control !== "unknown") {
      return `${name} may be involved in scheduling, but ownership is not confirmed.`;
    }
    if (input.validationStatus === "needs_validation" || input.validationStatus === "likely") {
      if (input.operationalSummary && !isGenericIntelligenceSummary(input.operationalSummary)) {
        return input.operationalSummary;
      }
      return `${name} was mentioned as the scheduling coordinator.`;
    }
    return `${name} is linked to scheduling coordination.`;
  }

  if (input.operationalSummary && !isGenericIntelligenceSummary(input.operationalSummary)) {
    return input.operationalSummary;
  }

  if (control && control !== "unknown") {
    const pathPhrase: Record<SchedulingControlPathId, string> = {
      provider_office: "Provider office may control observation scheduling.",
      facility: "Facility may control observation scheduling.",
      shared_workflow: "A shared office and facility workflow may control scheduling.",
      unknown: "Scheduling control is still unknown.",
    };
    return pathPhrase[control];
  }

  return input.propagatedSummary ?? "Scheduling ownership still needs confirmation.";
}

function buildObservationApprovalSummary(input: {
  mappingDetail: DiscoveryMappingQuestionView | null;
  operationalSummary: string | null;
}): string | null {
  if (input.operationalSummary) return input.operationalSummary;
  const conditional = input.mappingDetail?.conditionalWorkflow;
  if (conditional?.answer) return sanitizeOperationalUserText(conditional.answer);
  const summary = input.mappingDetail?.currentState.summary?.trim();
  if (summary && !/^no validated answer yet/i.test(summary)) {
    return sanitizeOperationalUserText(summary);
  }
  return null;
}

function buildSignalIntelligenceSummary(input: {
  signalId: StageMappingSignalId;
  contact: Record<string, unknown>;
  mappingDetail: DiscoveryMappingQuestionView | null;
  contactLeadName: string | null;
  validationStatus: StageMappingValidationStatus;
  operationalSummary: string | null;
  compactSummary: string | null;
  propagatedSummary: string | null;
}): string | null {
  if (input.propagatedSummary && !isGenericIntelligenceSummary(input.propagatedSummary)) {
    return input.propagatedSummary;
  }

  switch (input.signalId) {
    case "scheduling_owner":
      return buildSchedulingIntelligenceSummary({
        contact: input.contact,
        contactLeadName: input.contactLeadName,
        validationStatus: input.validationStatus,
        operationalSummary: input.operationalSummary,
        propagatedSummary: input.propagatedSummary,
      });
    case "observation_approval":
      return buildObservationApprovalSummary({
        mappingDetail: input.mappingDetail,
        operationalSummary: input.operationalSummary,
      });
    default:
      break;
  }

  if (input.compactSummary) return input.compactSummary;
  if (input.operationalSummary) return input.operationalSummary;

  const rawSummary = input.mappingDetail?.currentState.summary?.trim();
  if (rawSummary && !/^no validated answer yet/i.test(rawSummary)) {
    return sanitizeOperationalUserText(rawSummary);
  }

  return null;
}

export function buildDiscoveryMappingCardIntelligence(input: {
  question: StageMappingQuestion;
  contact: Record<string, unknown>;
  providerId?: string;
  mappingDetail?: DiscoveryMappingQuestionView | null;
  selectedChoice?: string | null;
  metadata?: Record<string, string>;
}): DiscoveryMappingCardIntelligence {
  const signalId = input.question.signalId as StageMappingSignalId;
  const dbKeys = stageMappingRegistryDbKeys(signalId);
  const mappingDetail =
    input.mappingDetail ??
    null;

  const fieldAttribution = resolveStageMappingSignalAttribution(signalId, input.contact);
  const questionText = input.question.question;
  const fieldMeta = parseProviderIntelligenceFieldMetadata(
    input.contact.provider_intelligence_field_metadata,
  );
  const fieldValues = collectFieldValues(input.contact, dbKeys);
  const suggestedContactLead = extractPartialContactLead(input.contact, dbKeys, signalId);
  const hasPartialLead = Boolean(suggestedContactLead);

  const providerId =
    input.providerId ??
    (String(input.contact.id ?? input.contact.provider_id ?? "").trim() || undefined);

  let operationalSummary: string | null = null;
  if (providerId) {
    const state = buildProviderOperationalState({ providerId, contact: input.contact });
    const canonical = operationalEvidenceForDbKey(state, input.question.dbKey);
    if (canonical?.summary) {
      operationalSummary = sanitizeOperationalUserText(canonical.summary);
    }
  }

  const contactLeadName = suggestedContactLead?.name ?? null;

  const propagatedSignal = resolvePropagatedSignalForStageMapping({
    signalId,
    contact: input.contact,
  });
  const propagatedSummary = propagatedSignal
    ? formatPropagatedSignalSummary(propagatedSignal, signalId)
    : null;

  const compactSummary = formatStageMappingCompactSummary({
    question: input.question,
    contact: input.contact,
    selectedChoice: input.selectedChoice,
    metadata: input.metadata,
    mappingDetail,
  });

  const rawSummary = buildSignalIntelligenceSummary({
    signalId,
    contact: input.contact,
    mappingDetail,
    contactLeadName,
    validationStatus: "unknown",
    operationalSummary,
    compactSummary,
    propagatedSummary,
  });

  const evidenceText =
    fieldAttribution?.evidence_text?.trim() ||
    dbKeys.map((key) => fieldMeta[key]?.evidence_text?.trim()).find(Boolean) ||
    null;

  const interpretationFallback = resolveInterpretationFallback({
    signalId,
    questionText,
    propagatedSummary,
    operationalSummary,
    compactSummary,
    evidenceText,
    fieldValues,
  });

  const evidenceStrength = assessDiscoveryMappingEvidence({
    summary: interpretationFallback,
    evidenceText,
    fieldValues,
    questionText,
    hasPartialLead,
  });
  const validatedOnFile = isDiscoveryMappingValidatedOnFile({
    dbKeys,
    contact: input.contact,
  });
  const validationStatus = inferDiscoveryMappingValidationStatus({
    meta: fieldAttribution,
    resolved: input.question.resolved,
    evidenceStrength,
    validatedOnFile,
  });
  const metaDebrief = isDebriefExtractionSource(fieldAttribution);
  const hasAppliedIntelligence = evidenceStrength !== "none";

  const confidenceLevel = legacyIntelligenceConfidenceFromEvidenceConfidence(
    inferDiscoveryMappingEvidenceConfidence({
      validationStatus,
      validatedOnFile,
      evidenceStrength,
    }),
  );

  const evidenceConfidence = inferDiscoveryMappingEvidenceConfidence({
    validationStatus,
    validatedOnFile,
    evidenceStrength,
  });

  const hasStructuredMapping = dbKeys.some((key) => {
    const item = fieldMeta[key]?.discovery_mapping;
    return Boolean(String(item?.interpretation ?? item?.evidence_text ?? "").trim());
  });
  const isOpenCard = evidenceStrength === "none" && !hasStructuredMapping;

  const scanStatus = isOpenCard
    ? { label: "Open", slug: "open" as const }
    : discoveryMappingScanFromEvidenceConfidence(evidenceConfidence);

  const structuredItem = isOpenCard
    ? null
    : resolveDiscoveryMappingIntelligenceItem({
        dbKeys,
        fieldMeta,
        signalId,
        questionText,
        evidenceText,
        fieldValue: fieldValues.find(Boolean) ?? null,
        interpretationFallback,
        confidence: confidenceLevel,
        status: scanStatusToIntelligenceStatus(scanStatus.slug),
        captureContext: fieldAttribution
          ? {
              source_type: fieldAttribution.source_type,
              source_label: fieldAttribution.source_label,
              source_engagement_id: fieldAttribution.source_engagement_id,
              source_case_id: fieldAttribution.source_case_id,
            }
          : null,
      });

  const sourceLine = isOpenCard
    ? formatDiscoveryMappingSourceReviewedLine(fieldAttribution) ?? ""
    : formatDiscoveryMappingAttributionLine({
        meta: fieldAttribution,
        validationStatus,
      }) ?? (metaDebrief ? "Debrief extraction" : null) ?? "";

  const stillNeedBuilder = SIGNAL_STILL_NEED_BUILDERS[signalId];
  const propagatedStillNeed =
    !isOpenCard && propagatedSignal ? stillNeedFromPropagatedSignal(propagatedSignal) : [];
  const defaultStillNeed =
    stillNeedBuilder?.({
      contactLeadName,
      schedulingControlConfirmed: schedulingControlIsConfirmed(input.contact),
      validationStatus,
    }) ?? [];
  const stillNeedToConfirm =
    validationStatus === "confirmed" && !isOpenCard
      ? []
      : propagatedStillNeed.length > 0
        ? propagatedStillNeed
        : defaultStillNeed;

  const interpretationBody = isOpenCard
    ? null
    : cleanInterpretationBody({
        signalId,
        interpretation: structuredItem?.interpretation ?? interpretationFallback,
        evidenceText,
        fieldValue:
          fieldValues.find((value) => /\[Partial lead\]/i.test(value)) ??
          (suggestedContactLead
            ? String(input.contact[suggestedContactLead.dbKey] ?? "").trim() || null
            : null) ??
          fieldValues.find(
            (value) =>
              isHumanReadableDiscoveryEvidence(value) &&
              !isPlaceholderDiscoveryMappingAnswer(value, questionText),
          ) ??
          fieldValues.find(Boolean) ??
          null,
        questionText,
      });

  const displaySummary = formatDiscoveryMappingIntelligenceDisplaySummary({
    scanSlug: scanStatus.slug,
    interpretation: isOpenCard
      ? DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY
      : interpretationBody ?? DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY,
    questionText,
  });

  const openSuggestedNextAction = suggestedNextActionForOpenSignal(signalId);
  const currentIntelligence: DiscoveryMappingCurrentIntelligenceBlock = {
    summary: displaySummary,
    mappedCategory: isOpenCard ? null : structuredItem?.mapped_category ?? null,
    rawEvidence: isOpenCard ? null : structuredItem?.evidence_text ?? evidenceText,
    sourceLine,
    statusLabel: intelligenceStatusLabel(scanStatus.label),
    validationStatus: isOpenCard ? "unknown" : validationStatus,
    evidenceConfidence: isOpenCard ? "mentioned_once" : evidenceConfidence,
    evidenceConfidenceLabel: DISCOVERY_MAPPING_EVIDENCE_CONFIDENCE_LABEL[
      isOpenCard ? "mentioned_once" : evidenceConfidence
    ],
    confidenceLevel: isOpenCard ? "low" : structuredItem?.confidence ?? confidenceLevel,
    confidenceLabel: hasAppliedIntelligence
      ? DISCOVERY_MAPPING_EVIDENCE_CONFIDENCE_LABEL[
          isOpenCard ? "mentioned_once" : evidenceConfidence
        ]
      : DISCOVERY_MAPPING_EVIDENCE_CONFIDENCE_LABEL.mentioned_once,
    suggestedNextAction: isOpenCard
      ? openSuggestedNextAction
      : suggestedNextActionForSignal(signalId, validationStatus, stillNeedToConfirm),
  };

  return {
    hasAppliedIntelligence,
    evidenceStrength,
    scanStatus,
    currentIntelligence,
    stillNeedToConfirm: scanStatus.slug === "confirmed" ? [] : stillNeedToConfirm,
    suggestedContactLead: isOpenCard ? null : suggestedContactLead,
    understandingSummary: displaySummary,
  };
}

export function findContactPoolMatchByName(
  pool: Record<string, unknown>[],
  name: string,
): Record<string, unknown> | null {
  const target = name.trim().toLowerCase();
  if (!target) return null;

  return (
    pool.find((contact) => {
      const first = String(contact.first_name ?? contact.firstName ?? "").trim().toLowerCase();
      const last = String(contact.last_name ?? contact.lastName ?? "").trim().toLowerCase();
      const full = `${first} ${last}`.trim();
      const display = String(contact.name ?? contact.display_name ?? "").trim().toLowerCase();
      return (
        first === target ||
        display === target ||
        display.startsWith(`${target} `) ||
        full === target ||
        full.startsWith(`${target} `)
      );
    }) ?? null
  );
}
