import type { ActivityEventType } from "@/lib/activity/activityEventTypes";
import { dualWriteAfterCaseLegacyLog, inferWorkflowStageFromChangedFields } from "@/lib/activity/dualWrite";

const LEGACY_CASE_TYPE_TO_UNIFIED: Record<string, ActivityEventType> = {
  case_created: "CASE_CREATED",
  status_change: "CASE_STATUS_CHANGED",
  case_updated: "WORKFLOW_FIELD_UPDATED",
  note: "NOTE_ADDED",
  product_updated: "PRODUCT_ADDED",
  document_uploaded: "DOCUMENT_UPLOADED",
  provider_intelligence_promoted: "PROVIDER_INTELLIGENCE_UPDATED",
  provider_intelligence_updated: "PROVIDER_INTELLIGENCE_UPDATED",
  clinical_discovery_insight_from_case: "PROVIDER_PLANNING_UPDATED",
  ai_note_capture: "AI_INTELLIGENCE_CAPTURED",
  billing_update: "CASE_STATUS_CHANGED",
  case_archived: "CASE_STATUS_CHANGED",
  case_restored: "CASE_STATUS_CHANGED",
  document_deleted: "DOCUMENT_UPLOADED",
  pre_call_plan_created: "PRE_CALL_PLAN_CREATED",
  pre_call_plan_updated: "PRE_CALL_PLAN_UPDATED",
  pre_call_plan_completed: "PRE_CALL_PLAN_COMPLETED",
  case_linked_from_engagement: "CASE_LINKED",
  engagement_converted_to_case: "ENGAGEMENT_CONVERTED_TO_CASE",
  case_created_from_engagement: "ENGAGEMENT_CONVERTED_TO_CASE",
  engagement_created: "ENGAGEMENT_CREATED",
  engagement_updated: "ENGAGEMENT_UPDATED",
  engagement_completed: "ENGAGEMENT_COMPLETED",
};

function isPreCallPlanLegacyActivityType(legacyType: string): boolean {
  const key = String(legacyType).toLowerCase();
  return (
    key === "pre_call_plan_created" ||
    key === "pre_call_plan_updated" ||
    key === "pre_call_plan_completed"
  );
}

export function unifiedTypeForLegacyCaseActivity(legacyType: string): ActivityEventType {
  return LEGACY_CASE_TYPE_TO_UNIFIED[String(legacyType).toLowerCase()] ?? "WORKFLOW_FIELD_UPDATED";
}

/** Dual-write unified event after `logSurgicalCaseActivity` succeeds. */
export function dualWriteFromCaseActivityLog(params: {
  caseId: string;
  userId: string;
  legacyType: string;
  body: string;
  legacyActivityId?: string;
  metadataJson?: Record<string, unknown>;
  providerId?: string | null;
  opportunityId?: string | null;
  workflowStageCompleted?: string | null;
}): void {
  const fields = Object.keys(params.metadataJson?.fields as Record<string, unknown> ?? {});
  const changedFieldKeys = fields.length
    ? fields
    : Object.keys((params.metadataJson?.new_values as Record<string, unknown>) ?? {});

  const unifiedType = unifiedTypeForLegacyCaseActivity(params.legacyType);
  let workflowStage =
    (params.metadataJson?.workflow_stage as string | undefined) ??
    (params.metadataJson?.workflowStage as string | undefined) ??
    inferWorkflowStageFromChangedFields(changedFieldKeys);

  if (params.workflowStageCompleted && !isPreCallPlanLegacyActivityType(params.legacyType)) {
    dualWriteAfterCaseLegacyLog({
      caseId: params.caseId,
      userId: params.userId,
      type: "WORKFLOW_STAGE_COMPLETED",
      summary: `Completed ${params.workflowStageCompleted.replace(/_/g, " ")} stage`,
      legacy: {
        source: "surgical_sales_case_activities",
        activityId: params.legacyActivityId,
      },
      metadata: {
        ...params.metadataJson,
        workflow_stage: params.workflowStageCompleted,
      },
      workflowStage: params.workflowStageCompleted,
      providerId: params.providerId,
      opportunityId: params.opportunityId,
    });
  }

  dualWriteAfterCaseLegacyLog({
    caseId: params.caseId,
    userId: params.userId,
    type: unifiedType,
    summary: params.body,
    legacy: {
      source: "surgical_sales_case_activities",
      activityId: params.legacyActivityId,
    },
    metadata: params.metadataJson,
    workflowStage: workflowStage ?? null,
    tags:
      params.legacyType === "ai_note_capture"
        ? ["ai"]
        : isPreCallPlanLegacyActivityType(params.legacyType)
          ? ["pre_call_plan", "workflow"]
          : params.legacyType === "provider_intelligence_promoted"
            ? ["intelligence", "promote_from_case"]
            : undefined,
    aiGenerated: Boolean(params.metadataJson?.ai_generated ?? params.metadataJson?.ai_note_capture),
    providerId: params.providerId,
    opportunityId: params.opportunityId,
  });
}
