import type {
  ProviderPlanningCompletion,
  ProviderPlanningSectionCompletion,
} from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  buildIntelligenceLearningGaps,
  formatLearningGapsSummary,
} from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { formatSectionOperationalLabel } from "@/lib/surgical-sales/providerIntelligenceOperationalConfidence";
import {
  formatIntelligenceConfidenceDisplayLabel,
  formatIntelligenceSectionConfidenceHint,
  formatSectionSignalsCapturedDetail,
  INTELLIGENCE_CONFIDENCE_DISPLAY_LABELS,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";

import type { ProviderPlanningStatus } from "@/lib/surgical-sales/providerPlanning";
import { INTELLIGENCE_DISCOVERY_LABELS } from "@/lib/surgical-sales/providerIntelligenceDiscoveryLabels";
import {
  PROVIDER_INTEL_AREA_STATUS,
  PROVIDER_INTEL_BRIEF,
  PROVIDER_INTEL_REP,
  PROVIDER_INTEL_TRACK,
} from "@/lib/surgical-sales/providerIntelligenceRepVocabulary";
import {
  formatFieldSalesMissingArea,
  formatFieldSalesStillNeedSummary,
} from "@/lib/surgical-sales/providerFieldSalesCopy";

export type IntelligenceStrengthLabel = "Limited" | "Building" | "Strong";

export type IntelligenceTrackId = "clinical" | "relationship" | "product_competitor";

export const PROVIDER_INTELLIGENCE_UI = {
  sectionTitle: PROVIDER_INTEL_REP.pageAria,
  expandCta: PROVIDER_INTEL_REP.expandFullBrief,
  readinessAria: PROVIDER_INTEL_BRIEF.fieldReadiness,
  signalsAria: "Confirmed by area",
  nextMoveLabel: PROVIDER_INTEL_BRIEF.nextBestStep,
} as const;



export const INTELLIGENCE_TRACK_LABEL: Record<IntelligenceTrackId, string> = {
  clinical: PROVIDER_INTEL_TRACK.clinical,
  relationship: PROVIDER_INTEL_TRACK.relationship,
  product_competitor: PROVIDER_INTEL_TRACK.commercial,
};



/** User-facing strength labels (internal logic still uses Limited | Building | Strong). */

export function formatIntelligenceStrengthDisplay(

  status: IntelligenceStrengthLabel,

  context: "overall" | "chip" | "track" = "overall",

): string {

  if (status === "Strong") {
    if (context === "chip") return PROVIDER_INTEL_TRACK.strengthStrong;
    if (context === "track") return PROVIDER_INTEL_TRACK.strengthStrong;
    return PROVIDER_INTEL_TRACK.strengthStrong;
  }

  if (status === "Building") {
    if (context === "chip") return PROVIDER_INTEL_TRACK.strengthBuilding;
    return PROVIDER_INTEL_TRACK.strengthBuilding;
  }

  if (context === "track") return PROVIDER_INTEL_TRACK.strengthLimited;
  if (context === "chip") return PROVIDER_INTEL_TRACK.strengthLimited;
  if (context === "overall") return PROVIDER_INTEL_TRACK.strengthLimited;
  return PROVIDER_INTEL_TRACK.strengthLimited;

}



export function formatIntelligenceTrackDetail(

  trackId: IntelligenceTrackId,

  status: IntelligenceStrengthLabel,

  _filled: number,

  _total: number,

): string {

  if (status === "Strong") {

    if (trackId === "clinical") return "Solid workflow and OR picture for the field";

    if (trackId === "relationship") return "Relationship and influence context is in good shape";

    return "Commercial and observation prep is clear";

  }

  if (status === "Building") {
    if (trackId === "clinical") {
      return "Workflow and OR signals are partial — deepen on the next case day.";
    }
    if (trackId === "relationship") {
      return "Relationship picture is forming — capture influence and engagement style.";
    }
    return "Commercial and observation notes are partial — confirm on the next visit.";
  }

  if (trackId === "clinical") {
    return "Limited workflow and OR context captured";
  }

  if (trackId === "relationship") {
    return "Early relationship picture — learn how they engage";
  }

  return "Discovery needed on product and competitive angle";

}



export function formatMissingAreaDisplay(raw: string): string {
  return formatFieldSalesMissingArea(raw);
}

export function formatMissingAreasSummary(areas: string[], max = 3): string {
  if (areas.length === 0) return "";
  const labels = areas.slice(0, max).map(formatMissingAreaDisplay);
  return formatFieldSalesStillNeedSummary(labels);
}



export const PROVIDER_PLANNING_STATUS_DISPLAY: Record<ProviderPlanningStatus, string> = {
  not_started: PROVIDER_INTEL_AREA_STATUS.not_started,
  in_progress: PROVIDER_INTEL_AREA_STATUS.in_progress,
  complete: PROVIDER_INTEL_AREA_STATUS.complete,
  needs_update: PROVIDER_INTEL_AREA_STATUS.needs_update,
};



export const PROVIDER_PLANNING_SECTION_STATUS_DISPLAY = {

  not_started: INTELLIGENCE_DISCOVERY_LABELS.notCapturedYet,

  in_progress: INTELLIGENCE_DISCOVERY_LABELS.emergingSignal,

  complete: INTELLIGENCE_DISCOVERY_LABELS.validated,

} as const;

export const PROVIDER_PLANNING_SECTION_CONFIDENCE_DISPLAY = INTELLIGENCE_CONFIDENCE_DISPLAY_LABELS;

export function formatPlanningSectionProgressDisplay(
  section: ProviderPlanningSectionCompletion,
  contact?: Record<string, unknown>,
): string {
  if (contact) {
    return formatSectionOperationalLabel(
      section.id as ProviderIntelligenceSectionId,
      contact,
      section.confidence,
    );
  }
  return formatIntelligenceConfidenceDisplayLabel(section.confidence);
}

export function formatPlanningSectionConfidenceHint(section: ProviderPlanningSectionCompletion): string {
  return formatIntelligenceSectionConfidenceHint(section.confidence, section);
}

export function formatPlanningSectionCompletionDetail(section: ProviderPlanningSectionCompletion): string {
  return formatSectionSignalsCapturedDetail(section.filled, section.total, {
    confidence: section.confidence,
    unresolvedCount: Math.max(0, section.total - section.filled),
  });
}



export function formatPlanningStripMeta(
  planning: {
    status: ProviderPlanningStatus;
    sections_complete: number;
    sections_total: number;
  },
  contact?: Record<string, unknown>,
): string {
  const statusLabel = PROVIDER_PLANNING_STATUS_DISPLAY[planning.status];
  if (contact) {
    const gaps = buildIntelligenceLearningGaps(contact, planning as ProviderPlanningCompletion, 2);
    if (gaps.length > 0) {
      return `${statusLabel} · ${formatLearningGapsSummary(gaps, 2)}`;
    }
    return `${statusLabel} · context holds up across areas`;
  }
  const validated = planning.sections_complete;
  const total = planning.sections_total;
  if (validated === total && total > 0) return `${statusLabel} · context holds up across areas`;
  if (validated === 0) return `${statusLabel} · limited field context available`;
  return `${statusLabel} · more context available on next touch`;
}



export const RELATIONSHIP_EMPTY_HINT = "Validate on next field touch.";



export function relationshipEmptyHint(fieldId: string): string {

  const map: Record<string, string> = {

    stage: "Validate relationship stage on next touch",

    influence: "Map who influences product decisions in the OR",

    decision_maker: "Confirm who approves evaluations",

    communication: "Validate preferred engagement rhythm",

    follow_up: "Align follow-up rhythm on next touch",

    strategy_notes: "Build field strategy after first operational read",

    strength: "Validate relationship strength live",

  };

  return map[fieldId] ?? RELATIONSHIP_EMPTY_HINT;

}



export function relationshipEmptyTitle(label: string): string {

  return `${label} — deployment gap open`;

}


