import type { ActivityEventType } from "@/lib/activity/activityEventTypes";
import { dualWriteAfterProviderLegacyLog } from "@/lib/activity/dualWrite";

const LEGACY_PROVIDER_TYPE_TO_UNIFIED: Record<string, ActivityEventType> = {
  note: "NOTE_ADDED",
  note_added: "NOTE_ADDED",
  clinical_discovery_updated: "PROVIDER_PLANNING_UPDATED",
  provider_intelligence_promoted: "PROVIDER_INTELLIGENCE_UPDATED",
  provider_updated: "PROVIDER_UPDATED",
  provider_created: "PROVIDER_CREATED",
  planning_section_completed: "PLANNING_SECTION_COMPLETED",
  pre_call_plan_created: "PRE_CALL_PLAN_CREATED",
  pre_call_plan_updated: "PRE_CALL_PLAN_UPDATED",
  pre_call_plan_completed: "PRE_CALL_PLAN_COMPLETED",
  ai_note_capture: "AI_INTELLIGENCE_CAPTURED",
  case_created_from_engagement: "ENGAGEMENT_CONVERTED_TO_CASE",
  engagement_created: "ENGAGEMENT_CREATED",
  engagement_updated: "ENGAGEMENT_UPDATED",
  engagement_completed: "ENGAGEMENT_COMPLETED",
  engagement_converted_to_case: "ENGAGEMENT_CONVERTED_TO_CASE",
  engagement_prepared: "PRE_CALL_PLAN_COMPLETED",
  outcome_update: "OUTCOME_UPDATE_LOGGED",
  product_use_log: "PRODUCT_USE_LOGGED",
};

export function unifiedTypeForLegacyProviderActivity(legacyType: string): ActivityEventType {
  const key = String(legacyType).toLowerCase();
  return LEGACY_PROVIDER_TYPE_TO_UNIFIED[key] ?? "PROVIDER_UPDATED";
}

export function dualWriteFromProviderActivityLog(params: {
  providerId: string;
  userId: string;
  legacyType: string;
  body: string;
  legacyActivityId?: string;
  metadataJson?: Record<string, unknown>;
  sourceCaseId?: string | null;
}): void {
  const key = String(params.legacyType).toLowerCase();
  const unifiedType = unifiedTypeForLegacyProviderActivity(key);
  const isPreCallPlan =
    key.startsWith("pre_call_plan_") || params.metadataJson?.activity_category === "pre_call_plan";
  const isEngagement =
    key.startsWith("engagement_") ||
    key === "case_created_from_engagement" ||
    params.metadataJson?.activity_category === "engagement";
  const isDiscovery =
    key === "clinical_discovery_updated" || params.metadataJson?.activity_category === "discovery";
  const isIntelligencePromote =
    key === "provider_intelligence_promoted" || params.metadataJson?.activity_category === "intelligence";
  const isOutcome = key === "outcome_update" || key === "product_use_log";

  dualWriteAfterProviderLegacyLog({
    providerId: params.providerId,
    userId: params.userId,
    type: unifiedType,
    summary: params.body,
    legacy: {
      source: "surgical_sales_provider_activities",
      activityId: params.legacyActivityId,
    },
    metadata: params.metadataJson,
    tags: isPreCallPlan
      ? ["pre_call_plan", "workflow"]
      : isEngagement
        ? ["engagement", "workflow"]
        : isDiscovery
          ? ["discovery", "clinical_discovery"]
          : isIntelligencePromote
            ? ["intelligence", "promote_from_case"]
            : isOutcome
              ? ["outcomes"]
              : undefined,
    workflowStage: isPreCallPlan ? "pre_call_plan" : undefined,
    aiGenerated: Boolean(params.metadataJson?.ai_generated ?? params.metadataJson?.ai_note_capture),
    sourceCaseId: params.sourceCaseId,
  });
}
