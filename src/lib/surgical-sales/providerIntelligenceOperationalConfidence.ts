/**
 * Rep-facing operational confidence summaries — account-specific, not abstract tiers.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  buildIntelligenceSectionCaptureSummary,
} from "@/lib/surgical-sales/providerIntelligenceSectionSummary";
import type { IntelligenceLearningGap } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import type { IntelligenceTrackId } from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";
import type { IntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import type {
  IntelligenceStatusCard,
  IntelligenceStatusCardConfidence,
  IntelligenceStatusCardId,
} from "@/lib/surgical-sales/providerIntelligenceStatusCards";
import { buildProviderRelationshipOperationalMaturity } from "@/lib/surgical-sales/buildProviderRelationshipOperationalMaturity";
import { OPERATIONAL_MATURITY_SECTION_LABELS } from "@/lib/surgical-sales/providerOperationalMaturityVocabulary";
import { OPERATIONAL_INTEL_RELATIONSHIP } from "@/lib/surgical-sales/providerIntelligenceOperationalCopy";

/** Gap-specific label when that signal is the main blocker. */
const GAP_OPERATIONAL_LABEL: Partial<Record<string, string>> = {
  provider_observation_coordinator_contact: "No validated OR scheduling owner",
  provider_observation_feasibility: "Observation allowance not confirmed",
  provider_observation_credentialing_needed: "Vendor approval path not confirmed",
  provider_observation_access_path: "OR access path still forming",
  provider_ideal_observation_cases: "Target observation cases not selected",
  provider_credentialing_status: "Vendor clearance not confirmed",
  provider_current_vendors: "Vendors in active cases still unclear",
  provider_evaluation_openness: "Trial willingness not clear",
  provider_competitive_products: "Competitive footprint thin",
  provider_communication_style: OPERATIONAL_INTEL_RELATIONSHIP.engagementUnknown,
  influence_level: "Adoption authority not yet confirmed",
  provider_decision_maker_status: "Signatory role not confirmed",
  provider_procedure_focus: "Procedure mix not confirmed",
  provider_technique_preferences: "Surgical modality not confirmed",
  provider_responsiveness: "Office response pattern not confirmed",
  provider_follow_up_approach: "Between-visit follow-up not agreed",
};

const CARD_OPERATIONAL_DEFAULT: Record<
  IntelligenceStatusCardId,
  Record<IntelligenceStatusCardConfidence, string>
> = {
  observation_pathway: {
    low: "Observation path not established",
    partial: "Access pathway emerging",
    strong: "Observation path taking shape",
    validated: "Observation path validated",
  },
  workflow_understanding: {
    low: "Clinical workflow not established",
    partial: "Workflow partially mapped",
    strong: "Workflow well understood",
    validated: "Workflow validated for the field",
  },
  commercial_influence: {
    low: "Trial and vendor picture not clear",
    partial: "Commercial path emerging",
    strong: "Trial path forming",
    validated: "Commercial path confirmed",
  },
  relationship_confidence: {
    low: OPERATIONAL_INTEL_RELATIONSHIP.environmentEmpty,
    partial: "Relationship signals emerging",
    strong: "Field relationship taking shape",
    validated: "Relationship mature for the field",
  },
};

const SECTION_OPERATIONAL_DEFAULT: Record<
  ProviderIntelligenceSectionId,
  Record<IntelligenceSectionConfidence, string>
> = {
  clinical_workflow: {
    unknown: "Procedure and modality baseline not confirmed",
    partial: "Workflow partially mapped",
    confirmed: "Clinical workflow taking shape",
    validated: "Clinical workflow validated",
  },
  or_environment: {
    unknown: "OR access workflow still thin",
    partial: "Access picture forming — approvals need validation",
    confirmed: "OR access workflow taking shape",
    validated: "OR access picture clear for deployment planning",
  },
  relationship_intelligence: {
    unknown: OPERATIONAL_INTEL_RELATIONSHIP.signalsUncaptured,
    partial: "Access and engagement signals emerging",
    confirmed: "Field relationship taking shape",
    validated: "Relationship mature for the field",
  },
  commercial_signals: {
    unknown: "Trial willingness and vendor landscape not clear",
    partial: "Commercial path emerging",
    confirmed: "Trial path forming",
    validated: "Commercial path confirmed",
  },
  observation_readiness: {
    unknown: "Observation path not established",
    partial: "Access pathway emerging",
    confirmed: "Observation path taking shape",
    validated: "Observation path validated",
  },
};

const TRACK_TO_STATUS_CARD: Record<IntelligenceTrackId, IntelligenceStatusCardId> = {
  clinical: "workflow_understanding",
  relationship: "relationship_confidence",
  product_competitor: "commercial_influence",
};

/** Fallback when section/card context is unavailable. */
export const OPERATIONAL_CONFIDENCE_FALLBACK: Record<IntelligenceSectionConfidence, string> = {
  ...OPERATIONAL_MATURITY_SECTION_LABELS,
};

function observationPathwayLabel(
  contact: Record<string, unknown>,
  confidence: IntelligenceStatusCardConfidence,
  topGap: IntelligenceLearningGap | null,
): string {
  if (topGap?.dbKey && GAP_OPERATIONAL_LABEL[topGap.dbKey]) {
    return GAP_OPERATIONAL_LABEL[topGap.dbKey]!;
  }
  const feasibility = String(contact.provider_observation_feasibility ?? "").trim();
  const hasAllowance = fieldHasIntelligenceSignal("provider_observation_feasibility", feasibility);
  if (confidence === "low" && !hasAllowance) {
    return "Observation path not established";
  }
  if (confidence === "partial" && hasAllowance) {
    return "Access pathway emerging";
  }
  return CARD_OPERATIONAL_DEFAULT.observation_pathway[confidence];
}

function workflowLabel(
  contact: Record<string, unknown>,
  confidence: IntelligenceStatusCardConfidence,
  topGap: IntelligenceLearningGap | null,
): string {
  if (topGap?.dbKey && GAP_OPERATIONAL_LABEL[topGap.dbKey]) {
    return GAP_OPERATIONAL_LABEL[topGap.dbKey]!;
  }
  const chips = buildIntelligenceSectionCaptureSummary("clinical_workflow", contact, 1);
  if (confidence === "partial" && chips.length > 0) {
    return "Workflow partially mapped";
  }
  return CARD_OPERATIONAL_DEFAULT.workflow_understanding[confidence];
}

function commercialLabel(
  contact: Record<string, unknown>,
  confidence: IntelligenceStatusCardConfidence,
  topGap: IntelligenceLearningGap | null,
): string {
  if (topGap?.dbKey && GAP_OPERATIONAL_LABEL[topGap.dbKey]) {
    return GAP_OPERATIONAL_LABEL[topGap.dbKey]!;
  }
  const vendorGap =
    !fieldHasIntelligenceSignal(
      "provider_credentialing_status",
      contact.provider_credentialing_status as string | null | undefined,
    ) ||
    !fieldHasIntelligenceSignal(
      "provider_current_vendors",
      contact.provider_current_vendors as string | null | undefined,
    );
  if ((confidence === "low" || confidence === "partial") && vendorGap) {
    return "Vendor process not confirmed";
  }
  return CARD_OPERATIONAL_DEFAULT.commercial_influence[confidence];
}

function relationshipOperationalLabel(
  contact: Record<string, unknown>,
  confidence: IntelligenceStatusCardConfidence,
  topGap: IntelligenceLearningGap | null,
): string {
  if (topGap?.dbKey && GAP_OPERATIONAL_LABEL[topGap.dbKey]) {
    return GAP_OPERATIONAL_LABEL[topGap.dbKey]!;
  }
  const maturity = buildProviderRelationshipOperationalMaturity(contact);
  if (confidence !== "low" && maturity.documentedCount >= 2) {
    return maturity.headline;
  }
  return CARD_OPERATIONAL_DEFAULT.relationship_confidence[confidence];
}

export function formatStatusCardOperationalLabel(
  cardId: IntelligenceStatusCardId,
  contact: Record<string, unknown>,
  confidence: IntelligenceStatusCardConfidence,
  topGap: IntelligenceLearningGap | null,
): string {
  switch (cardId) {
    case "observation_pathway":
      return observationPathwayLabel(contact, confidence, topGap);
    case "workflow_understanding":
      return workflowLabel(contact, confidence, topGap);
    case "commercial_influence":
      return commercialLabel(contact, confidence, topGap);
    case "relationship_confidence":
      return relationshipOperationalLabel(contact, confidence, topGap);
    default:
      return CARD_OPERATIONAL_DEFAULT[cardId][confidence];
  }
}

export function formatSectionOperationalLabel(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  confidence: IntelligenceSectionConfidence,
  topGapDbKey?: string | null,
): string {
  if (topGapDbKey && GAP_OPERATIONAL_LABEL[topGapDbKey]) {
    return GAP_OPERATIONAL_LABEL[topGapDbKey]!;
  }
  return SECTION_OPERATIONAL_DEFAULT[sectionId][confidence];
}

export function formatOverallOperationalLabel(
  statusCards: IntelligenceStatusCard[],
  weakestTrackId: IntelligenceTrackId,
  overallConfidence: IntelligenceSectionConfidence,
): string {
  const cardId = TRACK_TO_STATUS_CARD[weakestTrackId];
  const card = statusCards.find((c) => c.id === cardId);
  if (card?.confidenceLabel) return card.confidenceLabel;
  return OPERATIONAL_CONFIDENCE_FALLBACK[overallConfidence];
}
