/**
 * Mission Board card actions — stage-specific execution surfaces.
 */


import {
  deriveProviderEvaluationPath,
  hasProviderSelectedEvaluationPath,
  isEvaluationStatusComplete,
  MISSION_BOARD_CHOOSE_EVALUATION_PATH_LABEL,
  providerEvaluationPathFromDirectoryRow,
  resolveEvaluationNextActionLabel,
} from "@/lib/surgical-sales/buildProviderEvaluationPathView";
import {
  deriveEvaluationLifecyclePrimaryAction,
  EVALUATION_PREPARE_LABEL,
  evaluationLifecycleShowsPrepareSecondary,
  resolveEvaluationLifecyclePhase,
} from "@/lib/surgical-sales/evaluationEngagementLifecycle";
import {
  EVALUATION_PATH_ENGAGEMENT_TYPE,
  buildEvaluationPathScheduleHref,
  isCaseBasedEvaluationPath,
  resolveProviderEvaluationEngagementPreview,
} from "@/lib/surgical-sales/missionBoardEvaluationEngagement";
import {
  hasEvaluationMarkedSuccessful,
  hasStructuredCommitmentSaved,
  isEvaluationReadyForCommitment,
} from "@/lib/surgical-sales/providerCommitmentOutcomes";
import {
  MISSION_BOARD_CONFIRM_PRODUCT_COMMITMENT_CARD_LABEL,
  MISSION_BOARD_CONFIRM_PRODUCT_COMMITMENT_LABEL,
  MISSION_BOARD_CONFIRM_STRUCTURED_USE_CARD_LABEL,
  MISSION_BOARD_LOG_OUTCOME_UPDATE_LABEL,
  MISSION_BOARD_LOG_PRODUCT_USE_LABEL,
  MISSION_BOARD_MARK_EVALUATION_SUCCESSFUL_CARD_LABEL,
  MISSION_BOARD_MARK_EVALUATION_SUCCESSFUL_LABEL,
  MISSION_BOARD_MOVE_TO_OUTCOMES_LABEL,
} from "@/lib/surgical-sales/missionBoardCommitmentOutcomesService";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  buildProviderObservationCaseHref,
  buildProviderObservationCaseWorkflowHref,
  providerDirectoryLinks,
} from "@/lib/surgical-sales/providerDirectoryLinks";
import { buildProviderEngagementTypeHref } from "@/lib/surgical-sales/providerOverviewDiscoveryProgression";
import { buildEngagementPrepareForMeetingHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import {
  deriveIntroCallLifecyclePrimaryAction,
  INTRO_DICTATE_COMPLETE_LABEL,
  INTRO_JUST_COMPLETE_LABEL,
  INTRO_PREPARE_LABEL,
  INTRO_SCHEDULE_LABEL,
  introCallLifecycleShowsDictateCompleteSecondary,
  introCallLifecycleShowsPrepareSecondary,
  resolveIntroCallLifecyclePhase,
} from "@/lib/surgical-sales/introCallEngagementLifecycle";
import { resolveProviderIntroCallEngagementPreview } from "@/lib/surgical-sales/missionBoardIntroCallEngagement";
import {
  resolveProviderObservationRollupFromDirectoryRow,
} from "@/lib/surgical-sales/providerObservationCaseCollection";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import type { ProviderObservationCasePreview } from "@/lib/surgical-sales/providerObservationCaseCollection";
import {
  DEBRIEF_DICTATE_COMPLETE_LABEL,
  DEBRIEF_JUST_COMPLETE_LABEL,
  DEBRIEF_PREPARE_LABEL,
  debriefLifecycleShowsPrepareSecondary,
  debriefLifecycleShowsQuickCompleteSecondary,
  resolveDebriefLifecyclePhase,
} from "@/lib/surgical-sales/debriefEngagementLifecycle";
import { resolveProviderDebriefEngagementPreview } from "@/lib/surgical-sales/missionBoardDebriefEngagement";
import {
  providerDebriefNotesComplete,
  resolveMissionBoardDebriefCardContext,
} from "@/lib/surgical-sales/missionBoardDebriefCardStatus";
import { hasProductFitValidated } from "@/lib/surgical-sales/pathwayStageGates";

export type MissionBoardCardActionId =
  | "dictate"
  | "observation_status"
  | "debrief_status"
  | "intro_prepare"
  | "intro_dictate_complete"
  | "intro_just_complete"
  | "debrief_dictate_complete"
  | "debrief_just_complete"
  | "debrief_prepare"
  | "evaluation_prepare"
  | "open"
  | "mark_complete"
  | "reschedule"
  | "dictate_complete"
  | "add_observation"
  | "mark_evaluation_successful"
  | "confirm_product_commitment"
  | "choose_evaluation_path"
  | "log_product_use"
  | "log_outcome_update";

export type MissionBoardPrimaryActionKind =
  | "link"
  | "fast_intro_call"
  | "fast_observation"
  | "open_next_observation"
  | "view_observation_queue"
  | "debrief_launcher"
  | "fast_debrief"
  | "debrief_start"
  | "intro_start"
  | "evaluation_start"
  | "debrief_status"
  | "debrief_advance_pathway"
  | "evaluation_path_modal"
  | "commitment_modal"
  | "move_to_outcomes"
  | "outcome_update_modal"
  | "product_use_modal";

export type MissionBoardCardSecondaryAction = {
  id: MissionBoardCardActionId;
  label: string;
  title: string;
  kind: "capture" | "modal" | "link" | "action";
  href?: string;
  caseId?: string;
  engagementId?: string;
  engagementStatus?: string;
  engagementType?: string;
};

export type MissionBoardStagePrimaryAction = {
  label: string;
  href: string;
  kind: MissionBoardPrimaryActionKind;
  caseId?: string;
  debriefLauncherPanel?: "default" | "dictate";
};

const EVALUATION_ENGAGEMENT_TYPE = EVALUATION_PATH_ENGAGEMENT_TYPE;

function providerAccountId(provider: ProviderDirectoryRow): string | null {
  return (
    provider.primary_organization_id || provider.organization_id || provider.account_id || null
  );
}

function newEngagementBase(provider: ProviderDirectoryRow): string {
  const params = new URLSearchParams({ provider_id: provider.id });
  const organizationId = String(
    provider.primary_organization_id || provider.organization_id || provider.account_id || "",
  ).trim();
  if (organizationId) params.set("organization_id", organizationId);
  return `/portal/sales/engagements/new?${params.toString()}`;
}

function observationRollup(provider: ProviderDirectoryRow) {
  return resolveProviderObservationRollupFromDirectoryRow({ provider });
}

function buildNextCaseScopedActions(
  observationCase: ProviderObservationCasePreview,
): MissionBoardCardSecondaryAction[] {
  const caseId = observationCase.caseId;
  const procedure = observationCase.procedureLabel || "observation case";

  return [
    {
      id: "open",
      label: "Open",
      title: `Open ${procedure}`,
      kind: "link",
      href: buildProviderObservationCaseWorkflowHref(caseId),
      caseId,
    },
    {
      id: "mark_complete",
      label: "Mark Complete",
      title: `Mark complete: ${procedure}`,
      kind: "action",
      caseId,
    },
    {
      id: "dictate_complete",
      label: "Dictate & Complete",
      title: `Dictate and complete: ${procedure}`,
      kind: "action",
      caseId,
    },
    {
      id: "reschedule",
      label: "Reschedule",
      title: `Reschedule: ${procedure}`,
      kind: "action",
      caseId,
    },
  ];
}

export function deriveMissionBoardNextCaseActions(
  provider: ProviderDirectoryRow,
): MissionBoardCardSecondaryAction[] {
  const nextCase = observationRollup(provider).nextScheduled;
  if (!nextCase?.caseId) return [];
  return buildNextCaseScopedActions(nextCase);
}

export function deriveMissionBoardObservationCaseActions(
  observationCase: ProviderObservationCasePreview,
): MissionBoardCardSecondaryAction[] {
  if (!observationCase.caseId) return [];
  return buildNextCaseScopedActions(observationCase);
}

export function deriveMissionBoardObservationViewAllLabel(
  provider: ProviderDirectoryRow,
): string | null {
  const count = observationRollup(provider).upcomingCount;
  if (count <= 0) return null;
  return `View all scheduled observations (${count})`;
}

export function deriveMissionBoardStagePrimaryAction(
  provider: ProviderDirectoryRow,
  stageId: SalesPathwayStageId,
): MissionBoardStagePrimaryAction {
  const links = providerDirectoryLinks(provider);
  const engagementBase = newEngagementBase(provider);

  switch (stageId) {
    case "discovery": {
      const intro = resolveProviderIntroCallEngagementPreview(provider);
      if (intro) {
        const primary = deriveIntroCallLifecyclePrimaryAction(intro);
        return {
          label: primary.label,
          href: primary.href,
          kind: primary.kind,
        };
      }
      return {
        label: INTRO_SCHEDULE_LABEL,
        href: buildProviderEngagementTypeHref(links.newEngagementHref, "intro_call"),
        kind: "fast_intro_call",
      };
    }
    case "observe": {
      return {
        label: "Add Observation",
        href: buildProviderObservationCaseHref({
          providerId: provider.id,
          accountId: provider.primary_organization_id || provider.organization_id || provider.account_id,
        }),
        kind: "fast_observation",
      };
    }
    case "debrief": {
      const debriefCtx = resolveMissionBoardDebriefCardContext(provider);
      const contact = provider as Record<string, unknown>;
      if (
        providerDebriefNotesComplete(debriefCtx.debrief) &&
        !hasProductFitValidated({ contact })
      ) {
        return {
          label: "Advance to Evaluation",
          href: "",
          kind: "debrief_advance_pathway",
        };
      }
      const primary = debriefCtx.primaryCta;
      return {
        label: primary.label,
        href:
          primary.href ||
          buildProviderEngagementTypeHref(engagementBase, "provider_debrief"),
        kind: primary.kind,
      };
    }
    case "evaluation": {
      const contact = provider as Record<string, unknown>;
      if (
        isEvaluationReadyForCommitment(contact) ||
        hasEvaluationMarkedSuccessful(contact) ||
        evaluationActivityLooksComplete(provider)
      ) {
        return {
          label: MISSION_BOARD_CONFIRM_PRODUCT_COMMITMENT_CARD_LABEL,
          href: "",
          kind: "commitment_modal",
        };
      }

      if (!hasProviderSelectedEvaluationPath(contact)) {
        return {
          label: MISSION_BOARD_CHOOSE_EVALUATION_PATH_LABEL,
          href: "",
          kind: "evaluation_path_modal",
        };
      }

      const path = deriveProviderEvaluationPath({
        upcomingEngagement: provider.upcoming_engagement,
        linkedOpportunitiesCount: provider.linked_opportunities_count,
        observationCount: provider.observation_count,
        contact,
      });

      if (isCaseBasedEvaluationPath(path)) {
        const label = resolveEvaluationNextActionLabel({
          pathLabel: path,
          upcomingEngagement: provider.upcoming_engagement,
        });
        return {
          label,
          href: buildEvaluationPathScheduleHref({
            path,
            providerId: provider.id,
            accountId: providerAccountId(provider),
            newEngagementHref: engagementBase,
          }),
          kind: path === "Additional Observation" ? "fast_observation" : "link",
        };
      }

      // Lifecycle-aware: Start / Resume / Review when an evaluation engagement exists.
      const evaluationPreview = resolveProviderEvaluationEngagementPreview(provider);
      const lifecycle = deriveEvaluationLifecyclePrimaryAction(evaluationPreview);
      if (lifecycle) {
        return {
          label: lifecycle.label,
          href: lifecycle.href,
          kind: lifecycle.kind,
        };
      }

      const label = resolveEvaluationNextActionLabel({
        pathLabel: path,
        upcomingEngagement: provider.upcoming_engagement,
      });

      const engagementType = EVALUATION_ENGAGEMENT_TYPE[path];
      return {
        label,
        href: engagementType
          ? buildProviderEngagementTypeHref(engagementBase, engagementType)
          : engagementBase,
        kind: "link",
      };
    }
    case "commitment": {
      const contact = provider as Record<string, unknown>;
      if (!hasStructuredCommitmentSaved(contact)) {
        return {
          label: MISSION_BOARD_CONFIRM_STRUCTURED_USE_CARD_LABEL,
          href: "",
          kind: "commitment_modal",
        };
      }
      return {
        label: MISSION_BOARD_MOVE_TO_OUTCOMES_LABEL,
        href: "",
        kind: "move_to_outcomes",
      };
    }
    case "outcomes":
      return {
        label: MISSION_BOARD_LOG_OUTCOME_UPDATE_LABEL,
        href: "",
        kind: "outcome_update_modal",
      };
    default:
      return {
        label: "Open Profile",
        href: links.detailHref,
        kind: "link",
      };
  }
}

export function deriveMissionBoardSecondaryActions(
  provider: ProviderDirectoryRow,
  stageId: SalesPathwayStageId,
): MissionBoardCardSecondaryAction[] {
  if (stageId === "observe") {
    const nextCaseId = observationRollup(provider).nextScheduled?.caseId;
    if (nextCaseId) {
      return [];
    }

    return [
      {
        id: "dictate",
        label: "Field Note",
        title: "Capture field note",
        kind: "capture",
      },
    ];
  }

  const actions: MissionBoardCardSecondaryAction[] = [
    {
      id: "dictate",
      label: "Field Note",
      title: "Capture field note",
      kind: "capture",
    },
  ];

  if (stageId === "discovery") {
    const intro = resolveProviderIntroCallEngagementPreview(provider);
    const introPhase = intro ? resolveIntroCallLifecyclePhase(intro) : null;
    if (intro && introPhase && introCallLifecycleShowsPrepareSecondary(introPhase)) {
      actions.push({
        id: "intro_prepare",
        label: INTRO_PREPARE_LABEL,
        title: "Review intro call briefing",
        kind: "link",
        href: buildEngagementPrepareForMeetingHref(intro.id),
      });
    }
    if (intro && introPhase && introCallLifecycleShowsDictateCompleteSecondary(introPhase)) {
      actions.push({
        id: "intro_dictate_complete",
        label: INTRO_DICTATE_COMPLETE_LABEL,
        title: "Mark intro call complete and capture debrief notes",
        kind: "action",
        engagementId: intro.id,
        engagementStatus: intro.status,
        engagementType: provider.upcoming_engagement?.engagement_type ?? "intro_call",
      });
      actions.push({
        id: "intro_just_complete",
        label: INTRO_JUST_COMPLETE_LABEL,
        title: "Mark intro call complete without dictation",
        kind: "action",
        engagementId: intro.id,
        engagementStatus: intro.status,
        engagementType: provider.upcoming_engagement?.engagement_type ?? "intro_call",
      });
    }
    actions.push({
      id: "observation_status",
      label: "📋 Status",
      title: "Update observation status",
      kind: "modal",
    });
  }

  if (stageId === "debrief") {
    const debrief = resolveProviderDebriefEngagementPreview(provider);
    const debriefPhase = debrief ? resolveDebriefLifecyclePhase(debrief) : null;
    if (debrief && debriefPhase && debriefLifecycleShowsPrepareSecondary(debriefPhase)) {
      actions.push({
        id: "debrief_prepare",
        label: DEBRIEF_PREPARE_LABEL,
        title: "Review debrief briefing",
        kind: "link",
        href: buildEngagementPrepareForMeetingHref(debrief.id),
      });
    }
    if (
      debrief &&
      debriefPhase &&
      !debrief.debrief_completed &&
      debriefLifecycleShowsQuickCompleteSecondary(debriefPhase)
    ) {
      actions.push({
        id: "debrief_dictate_complete",
        label: DEBRIEF_DICTATE_COMPLETE_LABEL,
        title: "Dictate debrief notes, log outcome, and mark debrief complete",
        kind: "action",
        engagementId: debrief.id,
        engagementStatus: debrief.status,
        engagementType: "provider_debrief",
      });
      actions.push({
        id: "debrief_just_complete",
        label: DEBRIEF_JUST_COMPLETE_LABEL,
        title: "Log debrief outcome and mark complete without dictation",
        kind: "action",
        engagementId: debrief.id,
        engagementStatus: debrief.status,
        engagementType: "provider_debrief",
      });
    }
    // More Validation Needed (Pathway C) — debrief done, product fit unconfirmed.
    if (
      debrief?.debrief_completed &&
      !(provider as Record<string, unknown>).provider_product_fit_validated
    ) {
      actions.push({
        id: "add_observation",
        label: "Add Observation",
        title: "Schedule another observation to validate the opportunity",
        kind: "link",
        href: buildProviderObservationCaseHref({
          providerId: provider.id,
          accountId:
            provider.primary_organization_id || provider.organization_id || provider.account_id,
        }),
      });
    }
    actions.push({
      id: "debrief_status",
      label: "📋 Status",
      title: "Update debrief status",
      kind: "modal",
    });
  }

  if (stageId === "evaluation") {
    const contact = provider as Record<string, unknown>;
    const evaluationPreview = resolveProviderEvaluationEngagementPreview(provider);
    const evaluationPhase = resolveEvaluationLifecyclePhase(evaluationPreview);
    if (
      evaluationPreview &&
      evaluationLifecycleShowsPrepareSecondary(evaluationPhase)
    ) {
      actions.push({
        id: "evaluation_prepare",
        label: EVALUATION_PREPARE_LABEL,
        title: "Review evaluation briefing",
        kind: "link",
        href: buildEngagementPrepareForMeetingHref(evaluationPreview.id),
      });
    }
    if (hasProviderSelectedEvaluationPath(contact)) {
      actions.push({
        id: "choose_evaluation_path",
        label: "Change type",
        title: "Change evaluation type",
        kind: "modal",
      });
    }
    if (!hasEvaluationMarkedSuccessful(contact)) {
      actions.push({
        id: "mark_evaluation_successful",
        label: MISSION_BOARD_MARK_EVALUATION_SUCCESSFUL_CARD_LABEL,
        title: MISSION_BOARD_MARK_EVALUATION_SUCCESSFUL_LABEL,
        kind: "modal",
      });
    }
    if (
      hasProviderSelectedEvaluationPath(contact) &&
      !isEvaluationReadyForCommitment(contact) &&
      !hasEvaluationMarkedSuccessful(contact)
    ) {
      actions.push({
        id: "confirm_product_commitment",
        label: MISSION_BOARD_CONFIRM_PRODUCT_COMMITMENT_CARD_LABEL,
        title: MISSION_BOARD_CONFIRM_PRODUCT_COMMITMENT_LABEL,
        kind: "modal",
      });
    }
    return actions;
  }

  if (stageId === "outcomes") {
    actions.push({
      id: "log_product_use",
      label: MISSION_BOARD_LOG_PRODUCT_USE_LABEL,
      title: MISSION_BOARD_LOG_PRODUCT_USE_LABEL,
      kind: "modal",
    });
    return actions;
  }

  return actions;
}

export function evaluationActivityLooksComplete(provider: ProviderDirectoryRow): boolean {
  const view = providerEvaluationPathFromDirectoryRow(provider);
  return isEvaluationStatusComplete(view.statusLabel);
}
