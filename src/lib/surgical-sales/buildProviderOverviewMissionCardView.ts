import {
  buildProviderOverviewExecutionCtas,
  type ProviderOverviewExecutionAction,
} from "@/lib/surgical-sales/buildProviderOverviewExecutionCtas";
import { buildProviderOverviewActiveEngagementShortcuts } from "@/lib/surgical-sales/buildProviderOverviewActiveEngagementShortcuts";
import {
  buildIntroCallOverviewExecutionActions,
} from "@/lib/surgical-sales/introCallEngagementLifecycle";
import {
  buildProviderOverviewMissionQuickActions,
  filterProviderOverviewQuickActionsAgainstPrimary,
} from "@/lib/surgical-sales/buildProviderOverviewMissionQuickActions";
import { isProviderSalesCustomer } from "@/lib/surgical-sales/providerRelationshipStage";
import { buildProviderOverviewRecommendedNextMove } from "@/lib/surgical-sales/buildProviderOverviewRecommendedNextMove";
import { MISSION_CONTROL_STAGE_OBJECTIVES } from "@/lib/surgical-sales/buildProviderOverviewMissionControlPanel";
import { DISCOVERY_COMMERCIAL_OBJECTIVE } from "@/lib/surgical-sales/observationPermissionModel";
import { buildProviderDiscoveryState } from "@/lib/surgical-sales/buildProviderDiscoveryState";
import {
  normalizeSalesPathwayStageId,
  SALES_PATHWAY_STAGE_LABELS,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { pickActiveWorkflowEngagement } from "@/lib/surgical-sales/buildProviderEngagementWorkflowAction";
import {
  buildEngagementSurfaceActionsFromSummary,
  resolveEngagementWorkflowStateFromSummary,
} from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import {
  buildProviderObservationCaseRollup,
  buildProviderObservationCaseQueueHref,
  type ProviderObservationCaseRollup,
} from "@/lib/surgical-sales/providerObservationCaseCollection";
import { countObservedProcedures } from "@/lib/surgical-sales/pathwayStageGates";
import {
  buildProviderOverviewObservationMissionView,
  type ProviderOverviewObservationMissionView,
} from "@/lib/surgical-sales/buildProviderOverviewObservationMissionView";
import { buildProviderObservationCaseHref } from "@/lib/surgical-sales/providerDirectoryLinks";

export const PROVIDER_OVERVIEW_MISSION_CARD_TITLES: Record<SalesPathwayStageId, string> = {
  discovery: "Discovery Mission",
  observe: "Observation Mission",
  debrief: "Debrief Mission",
  evaluation: "Evaluation Mission",
  commitment: "Commitment Mission",
  outcomes: "Outcomes Mission",
};

export type ProviderOverviewMissionCardView = {
  missionTitle: string;
  stageLabel: string;
  objective: string;
  observationPermission: string;
  recommendedNextMove: string;
  primary: ProviderOverviewExecutionAction;
  secondary?: ProviderOverviewExecutionAction;
  /** Mission-board-aligned shortcuts inside the in-progress engagement card. */
  activeEngagementShortcuts: ProviderOverviewExecutionAction[];
  quickActions: ProviderOverviewExecutionAction[];
  observationCases?: ProviderObservationCaseRollup | null;
  observationQueueHref?: string | null;
  observationMission?: ProviderOverviewObservationMissionView | null;
};

function resolveActiveEngagementPrimaryAction(
  engagements?: ProviderEngagementSummary[],
): ProviderOverviewExecutionAction | null {
  const engagement = pickActiveWorkflowEngagement(engagements);
  if (!engagement) return null;

  const workflowState = resolveEngagementWorkflowStateFromSummary(engagement);
  if (workflowState === "completed") {
    const surface = buildEngagementSurfaceActionsFromSummary(engagement);
    return {
      id: "schedule_intro_call",
      label: surface.primary.label,
      href: surface.primary.href,
    };
  }

  const introActions = buildIntroCallOverviewExecutionActions(engagement);
  if (introActions) {
    return {
      id: "schedule_intro_call",
      label: introActions.primary.label,
      href: introActions.primary.href,
    };
  }

  const surface = buildEngagementSurfaceActionsFromSummary(engagement);
  const action = surface.primary;
  const id: ProviderOverviewExecutionAction["id"] =
    action.state === "completed" ? "schedule_provider_debrief" : "schedule_intro_call";

  return {
    id,
    label: action.label,
    href: action.href,
  };
}

export function providerOverviewMissionCardTitle(stageId: SalesPathwayStageId): string {
  return PROVIDER_OVERVIEW_MISSION_CARD_TITLES[stageId] ?? "Field Mission";
}

export function buildProviderOverviewMissionCardView(input: {
  contact: Record<string, unknown>;
  providerId: string;
  stageId: SalesPathwayStageId;
  newEngagementHref: string;
  noteHref: string;
  intelligenceHref: string;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
}): ProviderOverviewMissionCardView {
  const stageId = normalizeSalesPathwayStageId(String(input.stageId)) ?? "discovery";
  const discoveryState = buildProviderDiscoveryState({
    contact: input.contact,
    providerId: input.providerId,
    engagements: input.engagements,
    cases: input.cases,
  });
  const observationPermission = discoveryState.permissionStage.overviewLabel;

  const execution = buildProviderOverviewExecutionCtas({
    ...input,
    stageId: input.stageId,
  });
  const workflowPrimary = resolveActiveEngagementPrimaryAction(input.engagements);
  const salesCustomer = isProviderSalesCustomer(input.contact);
  const activeEngagementShortcuts = salesCustomer
    ? []
    : buildProviderOverviewActiveEngagementShortcuts({
        contact: input.contact,
        providerId: input.providerId,
        stageId: input.stageId,
        engagements: input.engagements,
        organizationName:
          String(input.contact.primary_organization_name ?? input.contact.organization_name ?? "").trim() ||
          null,
        organizationId:
          String(input.contact.account_id ?? input.contact.organization_id ?? "").trim() || null,
      });
  const primary =
    workflowPrimary ??
    (salesCustomer ? { id: "log_interaction" as const, label: "" } : execution.primary);
  const secondary = workflowPrimary || salesCustomer ? undefined : execution.secondary;
  const quickActions = salesCustomer
    ? []
    : filterProviderOverviewQuickActionsAgainstPrimary(
        primary,
        buildProviderOverviewMissionQuickActions({
          intelligenceHref: input.intelligenceHref,
          newEngagementHref: input.newEngagementHref,
          providerId: input.providerId,
          accountId: String(input.contact.account_id ?? input.contact.organization_id ?? "").trim() || null,
          contact: input.contact,
          engagements: input.engagements,
          cases: input.cases,
          stageId: input.stageId,
        }),
        secondary,
      );

  const facilityLabel =
    String(input.contact.primary_organization_name ?? input.contact.organization_name ?? "").trim() ||
    "No organization";
  const completedCount = countObservedProcedures({
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
  });
  const observationCases =
    stageId === "observe"
      ? buildProviderObservationCaseRollup({
          cases: input.cases,
          facilityLabel,
          completedCount,
        })
      : null;
  const observationQueueHref =
    observationCases && observationCases.upcomingCount > 0
      ? buildProviderObservationCaseQueueHref(input.providerId)
      : null;

  const observationMission =
    stageId === "observe"
      ? buildProviderOverviewObservationMissionView({
          contact: input.contact,
          providerId: input.providerId,
          cases: input.cases,
          completedCount,
          addObservationHref: buildProviderObservationCaseHref({
            providerId: input.providerId,
            accountId: String(input.contact.account_id ?? input.contact.organization_id ?? "").trim() || null,
          }),
        })
      : null;

  return {
    missionTitle: providerOverviewMissionCardTitle(stageId),
    stageLabel: SALES_PATHWAY_STAGE_LABELS[stageId],
    objective: MISSION_CONTROL_STAGE_OBJECTIVES[stageId] ?? DISCOVERY_COMMERCIAL_OBJECTIVE,
    observationPermission,
    recommendedNextMove: salesCustomer ? "" : buildProviderOverviewRecommendedNextMove(input),
    primary,
    secondary,
    activeEngagementShortcuts,
    quickActions,
    observationCases,
    observationQueueHref,
    observationMission,
  };
}
