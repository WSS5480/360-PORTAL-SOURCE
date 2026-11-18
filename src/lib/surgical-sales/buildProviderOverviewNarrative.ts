/**
 * Provider overview narrative — account state, risks, readiness, and next action signals.
 */

import {
  buildEngagementPrepareForMeetingHref,
  canOpenPrepareForMeeting,
  formatEngagementPreparationStatus,
  formatEngagementWhen,
  pickNextUpcomingEngagement,
  providerEngagementOpenHref,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { buildProviderIntelligenceSummaryView } from "@/lib/surgical-sales/buildProviderIntelligenceSummaryView";
import { buildProviderStrategicSummary } from "@/lib/surgical-sales/buildProviderStrategicSummary";
import { buildProviderWhatMattersNow } from "@/lib/surgical-sales/buildProviderWhatMattersNow";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { buildProviderOverviewStrategyGaps } from "@/lib/surgical-sales/buildProviderOverviewStrategyGaps";
import type { ProviderOverviewOperationalGap } from "@/lib/surgical-sales/buildProviderOverviewStrategyGaps";
import {
  buildProviderOverviewWorkDisclosure,
  providerOverviewWorkDisclosureSummary,
  type ProviderOverviewWorkStream,
} from "@/lib/surgical-sales/providerOverviewProgressiveDisclosure";
import {
  buildProviderOverviewVisibilityContext,
  isProviderOverviewSectionVisible,
  PROVIDER_COMMERCIAL_WORKFLOW_STAGE_LABELS,
  PROVIDER_COMMERCIAL_WORKFLOW_STAGE_MISSION,
  resolveProviderCommercialWorkflowStage,
  type ProviderCommercialWorkflowStage,
  type ProviderOverviewSectionId,
  type ProviderOverviewVisibilityContext,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { buildProviderOperationalRisks } from "@/lib/surgical-sales/buildProviderOperationalRisks";
import type { ProviderOperationalRisk } from "@/lib/surgical-sales/buildProviderOperationalRisks";
import { buildProviderOverviewCommandSummary } from "@/lib/surgical-sales/buildProviderOverviewCommandSummary";
import type { ProviderOverviewCommandSummary } from "@/lib/surgical-sales/buildProviderOverviewCommandSummary";
import { buildProviderFieldDeploymentBriefing } from "@/lib/surgical-sales/buildProviderFieldDeploymentBriefing";
import {
  buildProviderOverviewLatestFieldIntelligence,
  type ProviderOverviewFieldIntelligenceItem,
} from "@/lib/surgical-sales/buildProviderOverviewLatestFieldIntelligence";
import { buildProviderCanonicalExecutionBlockers } from "@/lib/surgical-sales/buildProviderCanonicalExecutionBlockers";
import type { CanonicalExecutionBlocker } from "@/lib/surgical-sales/buildProviderCanonicalExecutionBlockers";
import { providerProfileFieldContext } from "@/lib/surgical-sales/backgroundIntelligenceSections";
import {
  buildProviderNextDiscoveryPriorities,
  NEXT_DISCOVERY_PRIORITIES_VISIBLE_DEFAULT,
  type NextDiscoveryPriority,
} from "@/lib/surgical-sales/buildProviderNextDiscoveryPriorities";
import {
  buildProviderOverviewMissionControl,
  type ProviderOverviewMissionControl,
} from "@/lib/surgical-sales/buildProviderOverviewMissionControl";
import {
  buildProviderFieldEfficiencyIntelligence,
  type ProviderFieldEfficiencyIntelligence,
} from "@/lib/surgical-sales/buildProviderFieldEfficiencyIntelligence";
import {
  buildProviderOverviewDiscoveryAreas,
  type ProviderOverviewOperationalAreaDiscovery,
} from "@/lib/surgical-sales/buildProviderOverviewDiscoveryAreas";
import {
  buildProviderAccountMomentumIndicators,
  type ProviderAccountMomentum,
} from "@/lib/surgical-sales/buildProviderAccountMomentumIndicators";
import {
  buildProviderObservationFeasibilitySummary,
  type ProviderObservationFeasibilitySummary,
} from "@/lib/surgical-sales/buildProviderObservationFeasibilitySummary";
import { resolveProviderCommercialMomentum } from "@/lib/surgical-sales/providerCommercialMomentum";
import type { ProviderCommercialMomentum } from "@/lib/surgical-sales/providerCommercialMomentum";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderRepPrimaryAction } from "@/lib/surgical-sales/buildProviderRepPrimaryAction";
import {
  dedupeOperationalRisksForOverview,
  overviewShowsFullDiscoveryMap,
  priorityGapDbKeysForSection,
} from "@/lib/surgical-sales/providerOverviewDedup";

export type ProviderOverviewEngagementBeat = {
  typeLabel: string;
  title: string | null;
  whenLabel: string;
  statusLabel: string;
  prepLabel: string | null;
  openHref: string;
  prepareHref: string | null;
  showPrepare: boolean;
};

export type ProviderOverviewNarrative = {
  commandSummary: ProviderOverviewCommandSummary;
  /** Canonical execution blockers (overview only). */
  executionBlockers: CanonicalExecutionBlocker[];
  discoveryPriorityCount: number;
  accountMomentum: ProviderAccountMomentum;
  momentum: ProviderCommercialMomentum;
  commercialStage: ProviderCommercialWorkflowStage;
  stageLabel: string;
  stageMission: string;
  briefing: {
    lead: string;
    beats: string[];
  };
  /** @deprecated Use executionBlockers — retained for tests and progressive disclosure only. */
  strategyGaps: ProviderOverviewOperationalGap[];
  /** @deprecated Merged into executionBlockers. */
  operationalRisks: ProviderOperationalRisk[];
  fieldEfficiency: ProviderFieldEfficiencyIntelligence;
  discoveryAreas: ProviderOverviewOperationalAreaDiscovery[];
  /** Full known/open lists when no prioritized gaps; compact area pulses otherwise. */
  discoveryMapMode: "full" | "compact";
  observationFeasibility: ProviderObservationFeasibilitySummary;
  missionControl: ProviderOverviewMissionControl;
  nextStep: {
    primaryAction: ProviderRepPrimaryAction;
    engagement: ProviderOverviewEngagementBeat | null;
  };
  visibility: ProviderOverviewVisibilityContext;
  showSection: (id: ProviderOverviewSectionId) => boolean;
  workStreams: ProviderOverviewWorkStream[];
  recordSummary: string | null;
  /** Ranked field moves — overview shows top 2–3 only. */
  discoveryPriorities: NextDiscoveryPriority[];
  /** Live field bullets for overview (3–5 items). */
  latestFieldIntelligence: ProviderOverviewFieldIntelligenceItem[];
};

function briefingLeadFromSummary(narrative: string, nextStepPhrase: string): string {
  const marker = "Recommended field move:";
  const idx = narrative.indexOf(marker);
  if (idx === -1) return narrative.trim();
  return narrative.slice(0, idx).trim().replace(/\.\s*$/, "") + ".";
}

export function buildProviderOverviewNarrative(input: {
  providerId: string;
  contact: Record<string, unknown>;
  relationshipStage: string;
  planning?: ProviderPlanningCompletion | null;
  engagements: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  opportunities?: Array<Record<string, unknown>>;
  activity_timeline?: Array<Record<string, unknown>>;
  newEngagementHref: string;
  newCaseHref: string;
  intelligenceHref: string;
  createOpportunityHref: string;
}): ProviderOverviewNarrative {
  const commercialStage = resolveProviderCommercialWorkflowStage({
    relationshipStage: input.relationshipStage,
    opportunities: input.opportunities,
    cases: input.cases,
    engagements: input.engagements,
  });

  const visibility = buildProviderOverviewVisibilityContext({
    cases: input.cases,
    opportunities: input.opportunities,
    engagements: input.engagements,
    activity_timeline: input.activity_timeline,
  });

  const showSection = (id: ProviderOverviewSectionId) =>
    isProviderOverviewSectionVisible(id, commercialStage, visibility);

  const workStreams = buildProviderOverviewWorkDisclosure({
    commercialStage,
    relationshipStage: input.relationshipStage,
    cases: input.cases,
    opportunities: input.opportunities,
    engagements: input.engagements,
    newCaseHref: input.newCaseHref,
    createOpportunityHref: input.createOpportunityHref,
  });

  const planning = input.planning ?? null;
  const intelForMomentum = planning
    ? buildProviderIntelligenceSummaryView({ contact: input.contact, planning })
    : null;
  const momentum = resolveProviderCommercialMomentum({
    contact: input.contact,
    relationshipStage: input.relationshipStage,
    planning,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
    intelOverall: intelForMomentum?.overallStatus ?? "Limited",
  });

  const strategic = buildProviderStrategicSummary({
    providerId: input.providerId,
    relationshipStage: input.relationshipStage,
    contact: input.contact,
    newEngagementHref: input.newEngagementHref,
    intelligenceHref: input.intelligenceHref,
    createOpportunityHref: input.createOpportunityHref,
    engagements: input.engagements,
    planning: input.planning,
    cases: input.cases,
    opportunities: input.opportunities,
    activity_timeline: input.activity_timeline,
  });

  const wmnBullets = buildProviderWhatMattersNow({
    providerId: input.providerId,
    relationshipStage: input.relationshipStage,
    newEngagementHref: input.newEngagementHref,
    intelligenceHref: input.intelligenceHref,
    createOpportunityHref: input.createOpportunityHref,
    engagements: input.engagements,
    planning: input.planning,
    cases: input.cases,
    opportunities: input.opportunities,
    activity_timeline: input.activity_timeline,
    contact: input.contact,
  }).filter((b) => !b.isNextAction);

  const beats = wmnBullets.slice(0, 2).map((b) => b.text);

  const strategyGaps =
    showSection("intelligence_summary") || showSection("observation_readiness")
      ? buildProviderOverviewStrategyGaps({
          contact: input.contact,
          planning,
          commercialStage,
          maxItems: 3,
        })
      : [];

  const upcoming = pickNextUpcomingEngagement(input.engagements);
  let engagementBeat: ProviderOverviewEngagementBeat | null = null;
  if (upcoming && showSection("upcoming_engagement")) {
    const title = upcoming.title?.trim();
    const showTitle =
      title && title.toLowerCase() !== upcoming.engagement_type_label.toLowerCase();
    engagementBeat = {
      typeLabel: upcoming.engagement_type_label,
      title: showTitle ? title : null,
      whenLabel: formatEngagementWhen(upcoming),
      statusLabel: upcoming.status_label,
      prepLabel: formatEngagementPreparationStatus(upcoming),
      openHref: providerEngagementOpenHref(upcoming),
      prepareHref: buildEngagementPrepareForMeetingHref(upcoming.id),
      showPrepare: canOpenPrepareForMeeting(upcoming),
    };
  }

  const recordParts: string[] = [];
  if (visibility.hasEngagementHistory) recordParts.push("engagements");
  if (visibility.hasActivity) recordParts.push("activity");
  const workSummary = providerOverviewWorkDisclosureSummary(workStreams);
  if (workSummary) recordParts.push(workSummary.replace(/^Includes /, ""));
  const recordSummary =
    recordParts.length > 0 ? `Includes ${recordParts.join(", ")}` : null;

  const commandSummary = buildProviderOverviewCommandSummary({
    contact: input.contact,
    relationshipStage: input.relationshipStage,
    planning,
    commercialStage,
    stageLabel: PROVIDER_COMMERCIAL_WORKFLOW_STAGE_LABELS[commercialStage],
    recommendedNextStep: strategic.primaryAction.reason,
    tone: momentum.tone,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  const accountMomentum = buildProviderAccountMomentumIndicators({
    contact: input.contact,
    relationshipStage: input.relationshipStage,
    commercialStage,
    engagements: input.engagements,
    activity_timeline: input.activity_timeline,
    planning,
  });

  const operationalRisks = dedupeOperationalRisksForOverview(
    buildProviderOperationalRisks({
      contact: input.contact,
      commercialStage,
      engagements: input.engagements,
    }),
    strategyGaps,
  );

  const opportunityStage =
    input.opportunities?.find((o) => {
      const stage = String(o?.stage ?? "").toLowerCase();
      return stage && !["won", "lost", "closed_won", "closed_lost"].includes(stage);
    })?.stage ??
    input.opportunities?.[0]?.stage ??
    null;

  const discoveryAreas = buildProviderOverviewDiscoveryAreas({
    contact: input.contact,
    commercialStage,
  });

  const observationFeasibility = buildProviderObservationFeasibilitySummary({
    contact: input.contact,
    commercialStage,
    suppressValidationDbKeys: priorityGapDbKeysForSection(strategyGaps, "observation_readiness"),
  });

  const fieldEfficiency = buildProviderFieldEfficiencyIntelligence({
    contact: input.contact,
    relationshipStage: input.relationshipStage,
    commercialStage,
    engagements: input.engagements,
    readinessIndicators: commandSummary.readinessIndicators,
  });

  const missionControl = buildProviderOverviewMissionControl({
    contact: input.contact,
    engagements: input.engagements,
    primaryAction: strategic.primaryAction,
    readinessIndicators: commandSummary.readinessIndicators,
    newEngagementHref: input.newEngagementHref,
    opportunityStage: opportunityStage != null ? String(opportunityStage) : null,
  });

  const discoveryPriorities = buildProviderNextDiscoveryPriorities({
    contact: input.contact,
    planning,
    relationshipStage: input.relationshipStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  }).filter((p) => p.priorityScore > 0);

  const executionBlockers = buildProviderCanonicalExecutionBlockers({
    contact: input.contact,
    planning,
    commercialStage,
    engagements: input.engagements,
    relationshipStage: input.relationshipStage,
    fieldContext: providerProfileFieldContext({
      cases: input.cases,
      engagements: input.engagements,
    }),
  });

  const deployment = buildProviderFieldDeploymentBriefing({
    contact: input.contact,
    relationshipStage: input.relationshipStage,
    commercialStage,
    laneLabel: commandSummary.briefing.laneLabel,
    briefing: commandSummary.briefing,
    recommendedNextStep: commandSummary.recommendedNextStep,
    executionBlockers,
    discoveryPriorityCount: Math.min(
      discoveryPriorities.length,
      NEXT_DISCOVERY_PRIORITIES_VISIBLE_DEFAULT,
    ),
    fieldTimeRisk: commandSummary.fieldTimeRisk,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  const commandSummaryWithDeployment: ProviderOverviewCommandSummary = {
    ...commandSummary,
    deployment,
  };

  const latestFieldIntelligence = buildProviderOverviewLatestFieldIntelligence({
    contact: input.contact,
    commercialStage,
    engagements: input.engagements,
  });

  return {
    commandSummary: commandSummaryWithDeployment,
    executionBlockers,
    discoveryPriorityCount: Math.min(
      discoveryPriorities.length,
      NEXT_DISCOVERY_PRIORITIES_VISIBLE_DEFAULT,
    ),
    accountMomentum,
    momentum,
    commercialStage,
    stageLabel: PROVIDER_COMMERCIAL_WORKFLOW_STAGE_LABELS[commercialStage],
    stageMission: PROVIDER_COMMERCIAL_WORKFLOW_STAGE_MISSION[commercialStage],
    briefing: {
      lead: briefingLeadFromSummary(strategic.narrative, strategic.nextStepPhrase),
      beats,
    },
    strategyGaps,
    operationalRisks,
    fieldEfficiency,
    discoveryAreas,
    discoveryMapMode: overviewShowsFullDiscoveryMap(strategyGaps.length) ? "full" : "compact",
    observationFeasibility,
    missionControl,
    nextStep: {
      primaryAction: strategic.primaryAction,
      engagement: engagementBeat,
    },
    visibility,
    showSection,
    workStreams,
    recordSummary,
    discoveryPriorities,
    latestFieldIntelligence,
  };
}
