import { voidRecordActivityEventDual } from "@/lib/activity/dualWrite";
import type { ActivityRelatedEntity } from "@/lib/activity/activityEvent";
import { unifiedTypeFromLegacyEngagementActivity } from "@/lib/activity/legacyTypeMap";
import { formatEngagementActivityType } from "@/lib/surgical-sales/engagements/engagementActivityLabels";

/** Dual-write unified event after `logEngagementActivity` succeeds. */
export function dualWriteFromEngagementActivityLog(params: {
  engagementId: string;
  userId: string;
  legacyType: string;
  body: string;
  legacyActivityId?: string;
  metadataJson?: Record<string, unknown>;
  relatedEntities: ActivityRelatedEntity[];
  workflowStage?: string | null;
  tags?: string[];
}): void {
  const key = String(params.legacyType).trim().toLowerCase();
  const unifiedType = unifiedTypeFromLegacyEngagementActivity(key);
  const isPreCall =
    key.startsWith("pre_call_plan_") || params.metadataJson?.activity_category === "pre_call_plan";

  voidRecordActivityEventDual({
    type: unifiedType,
    title: formatEngagementActivityType(key),
    summary: params.body,
    entityType: "engagement",
    entityId: params.engagementId,
    relatedEntities: params.relatedEntities,
    createdBy: { userId: params.userId },
    metadata: params.metadataJson,
    workflowStage: params.workflowStage ?? (isPreCall ? "pre_call_plan" : null),
    tags: params.tags ?? (isPreCall ? ["pre_call_plan", "engagement", "workflow"] : ["engagement"]),
    legacy: {
      source: "surgical_sales_engagement_activities",
      activityId: params.legacyActivityId,
    },
    source: "unified_emit",
  });
}
