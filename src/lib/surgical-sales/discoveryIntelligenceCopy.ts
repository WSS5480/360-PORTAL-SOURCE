/**
 * Provider Intelligence — uncertainty-first microcopy (not CRM field language).
 */

import { REP_INTELLIGENCE_VOCAB } from "@/lib/surgical-sales/intelligenceCapture/repIntelligenceVocabulary";
import type { WorkflowRowAction } from "@/lib/surgical-sales/buildProviderOverviewStageRequirementsView";
import {
  discoverySignalFieldFocusLine,
  discoverySignalOperationalNarrative,
} from "@/lib/surgical-sales/discoveryIntelligenceNarrative";

export { discoveryReadinessBlockerLine } from "@/lib/surgical-sales/discoveryIntelligenceNarrative";
import {
  DISCOVERY_FIELD_STATUS,
  type DiscoveryFieldStatusLabel,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";

const F = DISCOVERY_FIELD_STATUS;

export const DISCOVERY_INTELLIGENCE_UI = {
  pageAria: "Provider intelligence",
  knowledgeWorkspaceTitle: "Provider Dossier",
  knowledgeWorkspaceSubtitle: "Accumulated field intelligence — review what the team has learned.",
  knowledgeWorkspacePrimary: REP_INTELLIGENCE_VOCAB.whatWeKnow,
  knowledgeWorkspaceSecondary: REP_INTELLIGENCE_VOCAB.stillExploring,
  knowledgeWorkspaceEmpty: "No field intelligence captured yet. Log notes or capture findings as you learn.",
  evidenceTrailTitle: "Evidence trail",
  evidenceTrailMeta: "Source-linked activity",
  intelligenceStatusLabel: REP_INTELLIGENCE_VOCAB.progress,
  notStartedMessage: "No field intelligence has been captured yet.",
  notStartedAria: "Intelligence not started",
  recommendedNextAction: "Recommended Next Action",
  startIntroCall: "Start Intro Call",
  createFirstEngagement: "Create First Engagement",
  certaintyAria: "Certainty picture",
  nextUncertaintiesTitle: "Next uncertainties",
  briefingSummaryTitle: "Intelligence summary",
  briefingSummaryAria: "Operational intelligence summary",
  briefingDomainsTitle: "Intelligence domains",
  briefingReadinessLabel: "Readiness",
  briefingProgressLabel: "Progress",
  /** @deprecated Use briefingProgressLabel */
  briefingMappingLabel: "Progress",
  briefingBlockersLabel: REP_INTELLIGENCE_VOCAB.stillExploring,
  briefingExpandSignals: "View findings",
  briefingCollapseSignals: "Hide findings",
  briefingEmptySignals: "Nothing captured in this area yet.",
  briefingValidationTitle: "Capture context",
  briefingValidationHistory: "Update history",
  briefingOperationalNotes: "Operational notes",
  briefingSignalsTitle: "Findings",
  briefingExpandSection: "Expand section",
  briefingCollapseSection: "Collapse section",
  briefingMoreActions: "More",
  briefingMoreActionsAria: "More actions for this finding",
  domainPrimaryCta: {
    opportunity_intelligence: "Capture product opportunities",
    access_readiness: "Resolve access pathway",
    clinical_fit: "Clarify clinical fit",
    champion_landscape: "Map champion landscape",
  } as const,
  emptyGroup: "Nothing captured in this area yet.",
  emptyDetail: "Nothing documented in the field yet",
  progressClearSuffix: "captured",
  recentActivityTitle: "Recent intelligence activity",
  missionControlAria: "Intelligence mission control",
  missionObjective: "Mission objective",
  topRisks: "Top risks",
  bestNextQuestion: "Best next question",
  upcoming: "Upcoming",
  secondaryActions: "Secondary actions",
  staleIntel: "Freshness",
  fieldSituation: "Field situation",
  primaryGap: "Focus area",
  viewDetails: "View details",
  hideDetails: "Hide details",
  domainPriority: {
    critical: "Critical",
    important: "Important",
    monitoring: "Monitoring",
  } as const,
  accessConstraint: "access not available",
  errorUpdate: "Could not save that update.",
  table: {
    topic: "Topic",
    status: "Status",
    detail: "Detail",
    lastTouch: "Last touch",
    actionsAria: "Resolve",
  },
  framing: {
    whatWeKnow: "What we know",
    whatIsUncertain: REP_INTELLIGENCE_VOCAB.stillExploring,
    resolvingAction: "What resolves it",
  },
  groupFallback: {
    know: "Nothing confirmed yet.",
    uncertain: "Everything here is still open.",
    resolve: "Capture what you learn in the field.",
    clear: "This area is clear — focus on the next uncertainty.",
  },
  overviewReadiness: {
    blockers: REP_INTELLIGENCE_VOCAB.stillExploring,
    secondaryActions: "Secondary",
    details: "Details",
    detailsWithActions: "More actions",
    hideDetails: "Hide",
    fullIntelligence: "Full intelligence",
    mapped: "Captured",
    open: "Open",
  },
} as const;

export const DISCOVERY_INTELLIGENCE_CONFIDENCE_TIER = {
  mostlyClear: "Mostly clear",
  takingShape: "Taking shape",
  partlyOpen: "Partly open",
  stillOpen: "Still open",
} as const;

export function discoveryIntelligenceCertaintyTierLabel(progressPercent: number): string {
  if (progressPercent >= 85) return DISCOVERY_INTELLIGENCE_CONFIDENCE_TIER.mostlyClear;
  if (progressPercent >= 55) return DISCOVERY_INTELLIGENCE_CONFIDENCE_TIER.takingShape;
  if (progressPercent >= 25) return DISCOVERY_INTELLIGENCE_CONFIDENCE_TIER.partlyOpen;
  return DISCOVERY_INTELLIGENCE_CONFIDENCE_TIER.stillOpen;
}

export function discoveryIntelligenceGroupProgressLabel(percent: number): string {
  return `${percent}% ${DISCOVERY_INTELLIGENCE_UI.progressClearSuffix}`;
}

/** Secondary mapping line under operational readiness tier. */
export function discoveryIntelligenceMappedSubLabel(percent: number): string {
  return discoveryIntelligenceGroupProgressLabel(percent);
}

export type DiscoveryIntelligenceGroupFraming = {
  whatWeKnow: string;
  whatIsUncertain: string;
  resolvingAction: string;
};

export function discoveryPriorityUnknownSummary(
  signalId: DiscoveryStructuredSignalId,
  status: DiscoveryFieldStatusLabel,
): string | null {
  if (status === F.validated || status === F.notApplicable) return null;
  return discoverySignalFieldFocusLine(signalId, status);
}

export function buildDiscoveryIntelligenceGroupFraming(
  rows: Array<{
    label: string;
    signalId?: DiscoveryStructuredSignalId;
    statusLabel: DiscoveryFieldStatusLabel;
    priority: number;
    primaryActions: WorkflowRowAction[];
  }>,
): DiscoveryIntelligenceGroupFraming {
  const knowParts: string[] = [];
  const uncertainParts: string[] = [];

  for (const row of rows) {
    if (!row.signalId) continue;
    const narrative = discoverySignalOperationalNarrative(row.signalId, row.statusLabel);
    switch (row.statusLabel) {
      case F.validated:
      case F.notApplicable:
        knowParts.push(narrative);
        break;
      default:
        uncertainParts.push(narrative);
        break;
    }
  }

  const unresolved = rows
    .filter((row) => row.statusLabel !== F.validated && row.statusLabel !== F.notApplicable)
    .sort((a, b) => a.priority - b.priority);

  const resolvingAction =
    unresolved[0]?.primaryActions[0]?.label ??
    (uncertainParts.length === 0
      ? DISCOVERY_INTELLIGENCE_UI.groupFallback.clear
      : DISCOVERY_INTELLIGENCE_UI.groupFallback.resolve);

  return {
    whatWeKnow: knowParts.length ? knowParts.join(" · ") : DISCOVERY_INTELLIGENCE_UI.groupFallback.know,
    whatIsUncertain: uncertainParts.length
      ? uncertainParts.join(" · ")
      : DISCOVERY_INTELLIGENCE_UI.groupFallback.uncertain,
    resolvingAction,
  };
}

/** Overview readiness card — statement-style uncertainty lines. */
export function discoveryReadinessNarrativeLine(
  signalId: DiscoveryStructuredSignalId,
  status: DiscoveryFieldStatusLabel,
): string | null {
  if (status === F.validated || status === F.notApplicable) return null;
  return discoverySignalFieldFocusLine(signalId, status);
}

/** Top unresolved signal — blocker headline for overview cards. */
export function discoveryReadinessPrimaryBlocker(
  signalId: DiscoveryStructuredSignalId,
  status: DiscoveryFieldStatusLabel,
): string {
  return (
    discoverySignalFieldFocusLine(signalId, status) ??
    discoverySignalOperationalNarrative(signalId, status)
  );
}

const OVERVIEW_CHIP_LABELS: Record<string, string> = {
  "Confirm approval": "Confirm approval",
  "Note interest": "Note interest",
  "Note declined": "Note declined",
  "Name owner": "Add scheduler",
  "Add owner": "Add scheduler",
  "Capture partial path": "Map pathway",
  "Confirm pathway": "Add vendor detail",
  "Add detail": "Add detail",
  "Set timing": "Set timing",
  "Record observation": "Log observation",
  "Note partial workflow": "Partial workflow",
  "Confirm workflow": "Confirm workflow",
  "Assess product fit": "Assess fit",
  "Size opportunity": "Size opportunity",
  "Add champion": "Add champion",
  "Note champion lead": "Note champion",
  "Confirm champion": "Confirm champion",
  "Add influencer": "Add influencer",
  "Map influence": "Map influence",
};

export function overviewReadinessChipLabel(action: WorkflowRowAction): string {
  return OVERVIEW_CHIP_LABELS[action.label] ?? action.label;
}

export function overviewReadinessPrimaryLabel(action: WorkflowRowAction): string {
  const chip = overviewReadinessChipLabel(action);
  return chip.charAt(0).toUpperCase() + chip.slice(1);
}
