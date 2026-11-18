/**
 * Provider overview — mission-board-aligned shortcuts for the in-progress engagement card.
 */

import { pickActiveWorkflowEngagement } from "@/lib/surgical-sales/buildProviderEngagementWorkflowAction";
import type { ProviderOverviewExecutionAction } from "@/lib/surgical-sales/buildProviderOverviewExecutionCtas";
import {
  deriveMissionBoardSecondaryActions,
  type MissionBoardCardActionId,
  type MissionBoardCardSecondaryAction,
} from "@/lib/surgical-sales/deriveMissionBoardCardActions";
import { resolveEngagementWorkflowStateFromSummary } from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { buildProviderOverviewPathwayDebriefProviderRow } from "@/lib/surgical-sales/providerOverviewPathwayDebriefProvider";
import {
  normalizeSalesPathwayStageId,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";

export function buildProviderOverviewMissionBoardProviderRow(input: {
  providerId: string;
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  organizationName?: string | null;
  organizationId?: string | null;
  linkedOpportunitiesCount?: number;
}): ProviderDirectoryRow {
  const base = buildProviderOverviewPathwayDebriefProviderRow(input);
  const active = pickActiveWorkflowEngagement(input.engagements);
  if (!active) return base;

  return {
    ...base,
    linked_opportunities_count: input.linkedOpportunitiesCount ?? base.linked_opportunities_count,
    upcoming_engagement: {
      id: active.id,
      href: `/portal/sales/engagements/${active.id}`,
      status: active.status,
      engagement_type: active.engagement_type,
      type_label: active.engagement_type_label ?? "",
      datetime_label: active.engagement_date ?? "",
      location_label: active.organization_name ?? "",
      primary_goal: active.title ?? "",
      open_items: [],
      prepared_at: active.prepared_at ?? null,
      planning_status: active.planning_status ?? null,
      debrief_completed: active.debrief_completed,
    },
  };
}

export function mapMissionBoardSecondaryToOverviewAction(
  action: MissionBoardCardSecondaryAction,
): ProviderOverviewExecutionAction {
  const shortcut: ProviderOverviewExecutionAction = {
    id: "log_interaction",
    label: action.label,
    href: action.href,
    engagementId: action.engagementId,
    engagementStatus: action.engagementStatus,
    engagementType: action.engagementType,
    missionBoardShortcutId: action.id,
  };

  switch (action.id) {
    case "dictate":
      return { ...shortcut, id: "add_intelligence", label: action.label };
    case "observation_status":
      return {
        ...shortcut,
        id: "update_permission_status",
        customAction: "openObservationApproval",
      };
    case "debrief_status":
      return {
        ...shortcut,
        id: "schedule_provider_debrief",
        customAction: "openDebriefStatus",
      };
    case "intro_dictate_complete":
      return { ...shortcut, id: "intro_dictate_complete" };
    case "intro_just_complete":
      return { ...shortcut, id: "intro_dictate_complete" };
    case "intro_prepare":
      return { ...shortcut, id: "schedule_intro_call" };
    case "debrief_prepare":
      return { ...shortcut, id: "continue_debrief" };
    case "evaluation_prepare":
      return { ...shortcut, id: "prepare_evaluation" };
    case "choose_evaluation_path":
      return { ...shortcut, id: "choose_evaluation_path", customAction: "openEvaluationPath" };
    case "mark_evaluation_successful":
      return { ...shortcut, id: "choose_evaluation_path" };
    case "confirm_product_commitment":
      return { ...shortcut, id: "confirm_commitment", customAction: "openCommitment" };
    case "log_product_use":
      return { ...shortcut, id: "log_product_use", customAction: "openProductUse" };
    case "log_outcome_update":
      return { ...shortcut, id: "log_outcome_update", customAction: "openOutcomeUpdate" };
    case "add_observation":
      return { ...shortcut, id: "add_observation_case" };
    default:
      return shortcut;
  }
}

export function buildProviderOverviewActiveEngagementShortcuts(input: {
  contact: Record<string, unknown>;
  providerId: string;
  stageId: SalesPathwayStageId;
  engagements?: ProviderEngagementSummary[];
  organizationName?: string | null;
  organizationId?: string | null;
  linkedOpportunitiesCount?: number;
}): ProviderOverviewExecutionAction[] {
  const engagement = pickActiveWorkflowEngagement(input.engagements);
  if (!engagement) return [];

  const workflowState = resolveEngagementWorkflowStateFromSummary(engagement);
  if (workflowState === "completed" || workflowState === "closed") return [];

  const stageId = normalizeSalesPathwayStageId(String(input.stageId)) ?? "discovery";
  const providerRow = buildProviderOverviewMissionBoardProviderRow(input);
  const secondaries = deriveMissionBoardSecondaryActions(providerRow, stageId);

  return secondaries.map(mapMissionBoardSecondaryToOverviewAction);
}

export type { MissionBoardCardActionId };
