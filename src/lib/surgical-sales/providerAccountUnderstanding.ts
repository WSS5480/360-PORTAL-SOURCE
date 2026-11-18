/**
 * Account notes — what a rep has learned about this provider (Understanding tab).
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { IntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";

export type AccountUnderstandingAreaId =
  | "operational"
  | "workflow"
  | "relationship"
  | "commercial"
  | "field_readiness";

/** Layout weight — not shown to reps */
export type AccountUnderstandingLaneTone = "active" | "steady" | "thin";

export const ACCOUNT_UNDERSTANDING_AREA_ORDER: AccountUnderstandingAreaId[] = [
  "operational",
  "workflow",
  "relationship",
  "commercial",
  "field_readiness",
];

/** Four grouped cards on Provider Understanding (observation folds into operational). */
export const ACCOUNT_UNDERSTANDING_CONFIRM_AREA_ORDER: AccountUnderstandingAreaId[] = [
  "operational",
  "workflow",
  "relationship",
  "commercial",
];

export const INTELLIGENCE_SECTION_TO_UNDERSTANDING_AREA: Record<
  ProviderIntelligenceSectionId,
  AccountUnderstandingAreaId
> = {
  or_environment: "operational",
  clinical_workflow: "workflow",
  relationship_intelligence: "relationship",
  commercial_signals: "commercial",
  observation_readiness: "field_readiness",
};

export type AccountUnderstandingAreaDef = {
  id: AccountUnderstandingAreaId;
  title: string;
  hint: string;
  sectionId: ProviderIntelligenceSectionId;
};

export const ACCOUNT_UNDERSTANDING_AREAS: Record<
  AccountUnderstandingAreaId,
  AccountUnderstandingAreaDef
> = {
  operational: {
    id: "operational",
    title: "OR access & workflow",
    hint: "How observation access works, what approvals are needed, and who coordinates scheduling.",
    sectionId: "or_environment",
  },
  workflow: {
    id: "workflow",
    title: "Cases & technique",
    hint: "What they do, how they operate, where turnover or setup gets sticky.",
    sectionId: "clinical_workflow",
  },
  relationship: {
    id: "relationship",
    title: "Relationship",
    hint: "How they work with reps, who moves decisions, rhythm between case days.",
    sectionId: "relationship_intelligence",
  },
  commercial: {
    id: "commercial",
    title: "Evaluation & vendors",
    hint: "Openness to a look, who's already in, what would slow a switch.",
    sectionId: "commercial_signals",
  },
  field_readiness: {
    id: "field_readiness",
    title: "Getting in to observe",
    hint: "Whether you can watch a case, clearance steps, who owns the schedule.",
    sectionId: "observation_readiness",
  },
};

/** Open questions — plain rep language */
export const ACCOUNT_UNDERSTANDING_GAP_STATE: Record<AccountUnderstandingAreaId, string> = {
  operational: "OR access path still unclear",
  workflow: "Workflow visibility still limited",
  relationship: "Relationship not operationally mature yet",
  commercial: "Evaluation appetite not validated",
  field_readiness: "Observation path not deployment-ready",
};

/** Where the rep is on this slice of the account */
const ACCOUNT_UNDERSTANDING_OPERATIONAL_STATE: Record<
  AccountUnderstandingAreaId,
  Record<IntelligenceSectionConfidence, string>
> = {
  operational: {
    unknown: "OR access and scheduling still developing",
    partial: "OR access partially mapped — validate before case day",
    confirmed: "OR access path operationally understood",
    validated: "OR access ready for field deployment",
  },
  workflow: {
    unknown: "Workflow visibility still limited",
    partial: "Case workflow partially mapped",
    confirmed: "Procedure mix and room rhythm understood",
    validated: "Clinical workflow ready for observation planning",
  },
  relationship: {
    unknown: "Relationship not operationally mature yet",
    partial: "Engagement style forming — validate influence path",
    confirmed: "Relationship supports field planning",
    validated: "Relationship operationally trusted",
  },
  commercial: {
    unknown: "Evaluation appetite not validated",
    partial: "Commercial posture partially clear",
    confirmed: "Evaluation path directionally understood",
    validated: "Commercialization path field-ready",
  },
  field_readiness: {
    unknown: "Observation path not deployment-ready",
    partial: "Observation access partially clarified",
    confirmed: "Observation path supports scheduling",
    validated: "Observation ready for field execution",
  },
};

export function accountUnderstandingOperationalState(
  areaId: AccountUnderstandingAreaId,
  confidence: IntelligenceSectionConfidence,
  options?: { hasOpenLoops?: boolean },
): string {
  if (options?.hasOpenLoops) {
    return ACCOUNT_UNDERSTANDING_GAP_STATE[areaId];
  }
  return (
    ACCOUNT_UNDERSTANDING_OPERATIONAL_STATE[areaId][confidence] ??
    ACCOUNT_UNDERSTANDING_OPERATIONAL_STATE[areaId].unknown
  );
}

export function accountUnderstandingAreaForSection(
  sectionId: ProviderIntelligenceSectionId,
): AccountUnderstandingAreaId {
  return INTELLIGENCE_SECTION_TO_UNDERSTANDING_AREA[sectionId];
}

export const ACCOUNT_UNDERSTANDING_KNOWN_MAX = 6;

/** Operational intelligence card field labels (Provider Understanding tab) */
export const ACCOUNT_UNDERSTANDING_CARD = {
  known: "Confirmed",
  unknown: "Open questions",
  operationalRisk: "Why it matters",
  tacticalImplication: "Field note",
  bestNextAction: "Next action",
  sourceAttribution: "Source",
  confidence: "Confidence",
  captureIntelligence: "Continue mapping",
  resolveUnknowns: "Resolve unknowns",
  updateOperational: "Update operational intelligence",
  /** @deprecated Use known */
  knownSummary: "Known",
  /** @deprecated Use unknown */
  stillNeed: "Open questions",
  /** @deprecated */
  bestPerson: "Best person to ask",
  /** @deprecated Use captureIntelligence */
  addNote: "Continue mapping",
  primaryUnknown: "Open question",
  whyItMatters: "Operational risk",
  bestSource: "Source",
  nextMove: "Best next action",
  recentNotes: "Recent captures",
  captureInsight: "Continue mapping",
  showOperationalDetail: "Show more detail",
  hideOperationalDetail: "Hide detail",
  noRecentNotes: "Nothing captured for this signal yet.",
} as const;

export const PROVIDER_ACCOUNT_UNDERSTANDING = {
  pageAria: "Operational intelligence — pathway advancement",
  pageLead:
    "Track pathway requirements, discovery targets, and what still needs validation before the next stage.",
  synthesisTitle: "Operational context",
  intelligenceByArea: "Mission readiness by area",
  looksSolid: "Operationally confirmed",
  notMuchHereYet: "Operational visibility limited in this lane.",
  editFields: "Detailed field capture",
  hideFields: "Hide detailed field capture",
  emptyReload: "Operational intelligence didn't load — refresh the page.",
  /** @deprecated Anchor section removed — synthesis strip replaces */
  whatWeKnow: "Account operational picture",
  /** @deprecated */
  worthConfirming: "Operational intelligence by area",
} as const;
