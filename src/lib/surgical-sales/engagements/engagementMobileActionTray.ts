import {
  buildEngagementDetailHubActions,
  resolveEngagementDetailHubPhase,
} from "@/lib/surgical-sales/engagements/buildEngagementDetailHub";
import { resolveEngagementWorkflowState } from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import { resolveEngagementDetailPhase, type EngagementDetailPhase } from "@/lib/surgical-sales/engagements/buildEngagementDetailRecord";
import { engagementHasTacticalDebrief } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";

export type EngagementMobileActionPhase = "pre_visit" | "post_visit" | "visit_closed";

export type EngagementMobileTrayAction = {
  id: string;
  label: string;
  href?: string;
  /** Opens sheet / capture — no navigation */
  action?: "log_update" | "start_engagement";
};

export type EngagementMobileActionTrayModel = {
  phase: EngagementMobileActionPhase;
  primary: EngagementMobileTrayAction;
  secondaries: EngagementMobileTrayAction[];
  overflow: EngagementMobileTrayAction[];
};

export function resolveEngagementMobileActionPhase(
  status: string,
): EngagementMobileActionPhase {
  const detailPhase = resolveEngagementDetailPhase(status);
  if (detailPhase === "closed") return "visit_closed";
  if (detailPhase === "pre_visit") return "pre_visit";
  return "post_visit";
}

function mapDetailPhaseToMobile(detailPhase: EngagementDetailPhase): EngagementMobileActionPhase {
  if (detailPhase === "closed") return "visit_closed";
  if (detailPhase === "pre_visit") return "pre_visit";
  return "post_visit";
}

export function buildEngagementMobileActionTray(params: {
  engagementId: string;
  status: string;
  linkedCaseId: string | null;
  hasProvider: boolean;
  engagement?: Record<string, unknown>;
}): EngagementMobileActionTrayModel {
  const workflowState = resolveEngagementWorkflowState({
    status: params.status,
    isMeetingPrepared: Boolean(params.engagement?.is_meeting_prepared),
    preparedAt: params.engagement?.prepared_at ? String(params.engagement.prepared_at) : null,
    planningStatus: params.engagement?.planning_status
      ? String(params.engagement.planning_status)
      : null,
    briefingStatus: params.engagement?.briefing_status
      ? String(params.engagement.briefing_status)
      : null,
    hasDebrief:
      params.engagement &&
      engagementHasTacticalDebrief({
        notes: params.engagement.notes ? String(params.engagement.notes) : null,
        debrief_completed: Boolean(params.engagement.debrief_completed),
        debrief_completed_at: params.engagement.debrief_completed_at
          ? String(params.engagement.debrief_completed_at)
          : null,
      }),
    engagement: params.engagement,
  });
  const detailPhase = resolveEngagementDetailHubPhase(workflowState);
  const phase = mapDetailPhaseToMobile(resolveEngagementDetailPhase(params.status));
  const hubActions = buildEngagementDetailHubActions({
    engagementId: params.engagementId,
    phase: detailPhase,
    workflowState,
  });
  const primaryHubAction = hubActions.find(
    (a) => (a.kind === "link" || a.kind === "start") && a.variant === "primary",
  );

  const primary: EngagementMobileTrayAction = primaryHubAction
    ? primaryHubAction.kind === "start"
      ? {
          id: "primary",
          label: primaryHubAction.label,
          action: "start_engagement",
        }
      : primaryHubAction.kind === "link"
        ? {
            id: "primary",
            label: primaryHubAction.label,
            href: primaryHubAction.href,
          }
        : {
            id: "primary",
            label: primaryHubAction.label,
            href: `/portal/sales/engagements/${encodeURIComponent(params.engagementId)}`,
          }
    : {
        id: "primary",
        label: "Open",
        href: `/portal/sales/engagements/${encodeURIComponent(params.engagementId)}`,
      };

  const caseSecondary: EngagementMobileTrayAction = params.linkedCaseId
    ? {
        id: "case",
        label: "Case",
        href: `/portal/sales/cases/${encodeURIComponent(params.linkedCaseId)}`,
      }
    : {
        id: "case",
        label: "Case",
        href: `/portal/sales/cases/new?engagement_id=${encodeURIComponent(params.engagementId)}`,
      };

  const secondaries: EngagementMobileTrayAction[] = [caseSecondary];
  if (params.hasProvider && LOG_UPDATE_UI_ENABLED) {
    secondaries.push({ id: "follow_up", label: "Follow-up", action: "log_update" });
  }

  const overflow: EngagementMobileTrayAction[] = [];

  return { phase, primary, secondaries, overflow };
}
