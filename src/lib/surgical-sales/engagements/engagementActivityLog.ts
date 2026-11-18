import { dualWriteOpportunityEvent } from "@/lib/activity/dualWrite";
import { dualWriteFromEngagementActivityLog } from "@/lib/activity/engagementActivityDualWrite";
import type { ActivityRelatedEntity } from "@/lib/activity/activityEvent";
import type { ActivityEventType } from "@/lib/activity/activityEventTypes";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logSurgicalCaseActivity } from "@/lib/surgical-sales/caseActivityLog";
import { logSurgicalProviderActivity } from "@/lib/surgical-sales/providerActivityLog";
import {
  logPreCallPlanActivityEvents,
  type PreCallPlanLegacyActivityType,
} from "@/lib/surgical-sales/preCallPlanActivityLog";
import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";

export type EngagementActivityContext = {
  providerId?: string | null;
  organizationId?: string | null;
  opportunityId?: string | null;
  caseId?: string | null;
};

export function buildEngagementActivityRelatedEntities(
  engagementId: string,
  context: EngagementActivityContext,
): ActivityRelatedEntity[] {
  const related: ActivityRelatedEntity[] = [{ entityType: "engagement", entityId: engagementId }];
  if (context.providerId) {
    related.push({ entityType: "provider", entityId: context.providerId, role: "surgeon" });
  }
  if (context.organizationId) {
    related.push({ entityType: "organization", entityId: context.organizationId });
  }
  if (context.opportunityId) {
    related.push({ entityType: "opportunity", entityId: context.opportunityId, role: "linked_opportunity" });
  }
  if (context.caseId) {
    related.push({ entityType: "case", entityId: context.caseId, role: "linked_case" });
  }
  return related;
}

export async function logEngagementActivity(params: {
  engagementId: string;
  userId: string;
  activityType: string;
  body: string;
  metadataJson?: Record<string, unknown>;
}): Promise<{ ok: true; activityId?: string } | { ok: false; message: string }> {
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_engagement_activities")
    .insert({
      engagement_id: params.engagementId,
      user_id: params.userId,
      activity_type: params.activityType,
      body: params.body,
      metadata_json: params.metadataJson ?? {},
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  return { ok: true, activityId: data?.id ? String(data.id) : undefined };
}

export async function recordEngagementActivityEvent(params: {
  engagementId: string;
  userId: string;
  unifiedType: ActivityEventType;
  legacyType: string;
  body: string;
  context: EngagementActivityContext;
  metadataJson?: Record<string, unknown>;
  title?: string;
  tags?: string[];
  workflowStage?: string | null;
  /** Mirror to provider/case legacy activity tables for timeline fallback feeds. */
  mirrorToRelatedLegacy?: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const meta: Record<string, unknown> = {
    ...(params.metadataJson ?? {}),
    engagement_id: params.engagementId,
    provider_id: params.context.providerId ?? null,
    organization_id: params.context.organizationId ?? null,
    opportunity_id: params.context.opportunityId ?? null,
    case_id: params.context.caseId ?? null,
    unified_activity_type: params.unifiedType,
  };

  const log = await logEngagementActivity({
    engagementId: params.engagementId,
    userId: params.userId,
    activityType: params.legacyType,
    body: params.body,
    metadataJson: meta,
  });
  if (!log.ok) return log;

  const related = buildEngagementActivityRelatedEntities(params.engagementId, params.context);

  dualWriteFromEngagementActivityLog({
    engagementId: params.engagementId,
    userId: params.userId,
    legacyType: params.legacyType,
    body: params.body,
    legacyActivityId: log.activityId,
    metadataJson: meta,
    relatedEntities: related,
    workflowStage: params.workflowStage,
    tags: params.tags,
  });

  if (params.context.opportunityId) {
    dualWriteOpportunityEvent({
      opportunityId: params.context.opportunityId,
      userId: params.userId,
      type: params.unifiedType,
      summary: params.body,
      title: params.title,
      metadata: meta,
      relatedEntities: related,
      legacy: log.activityId
        ? { source: "surgical_sales_engagement_activities", activityId: log.activityId }
        : undefined,
    });
  }

  const mirror = params.mirrorToRelatedLegacy !== false;
  if (mirror && params.context.providerId) {
    const prov = await logSurgicalProviderActivity({
      providerId: params.context.providerId,
      userId: params.userId,
      activityType: params.legacyType,
      body: params.body,
      sourceCaseId: params.context.caseId ?? null,
      metadataJson: { ...meta, activity_category: "engagement" },
    });
    if (!prov.ok) return prov;
  }

  if (mirror && params.context.caseId) {
    const caseLog = await logSurgicalCaseActivity({
      caseId: params.context.caseId,
      userId: params.userId,
      activityType: params.legacyType,
      body: params.body,
      providerId: params.context.providerId ?? null,
      opportunityId: params.context.opportunityId ?? null,
      metadataJson: meta,
    });
    if (!caseLog.ok) return caseLog;
  }

  return { ok: true };
}

export async function logEngagementCreatedActivity(params: {
  engagementId: string;
  userId: string;
  engagementType: string;
  context: EngagementActivityContext;
  title?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const typeLabel = formatEngagementType(params.engagementType);
  const body = params.title?.trim()
    ? `${typeLabel} engagement created: ${params.title.trim()}`
    : `${typeLabel} engagement created.`;
  return recordEngagementActivityEvent({
    engagementId: params.engagementId,
    userId: params.userId,
    unifiedType: "ENGAGEMENT_CREATED",
    legacyType: "engagement_created",
    body,
    context: params.context,
    metadataJson: { engagement_type: params.engagementType },
    tags: ["engagement"],
  });
}

export async function logEngagementUpdatedActivity(params: {
  engagementId: string;
  userId: string;
  context: EngagementActivityContext;
  summary: string;
  metadataJson?: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  return recordEngagementActivityEvent({
    engagementId: params.engagementId,
    userId: params.userId,
    unifiedType: "ENGAGEMENT_UPDATED",
    legacyType: "engagement_updated",
    body: params.summary,
    context: params.context,
    metadataJson: params.metadataJson,
    tags: ["engagement"],
  });
}

export async function logEngagementCompletedActivity(params: {
  engagementId: string;
  userId: string;
  context: EngagementActivityContext;
  engagementType?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const typeLabel = params.engagementType ? formatEngagementType(params.engagementType) : "Engagement";
  return recordEngagementActivityEvent({
    engagementId: params.engagementId,
    userId: params.userId,
    unifiedType: "ENGAGEMENT_COMPLETED",
    legacyType: "engagement_completed",
    body: `${typeLabel} marked completed.`,
    context: params.context,
    metadataJson: { engagement_type: params.engagementType },
    tags: ["engagement"],
  });
}

export async function logEngagementConvertedToCaseActivity(params: {
  engagementId: string;
  userId: string;
  context: EngagementActivityContext;
  caseNumber: string;
  engagementType?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const typeLabel = params.engagementType ? formatEngagementType(params.engagementType) : "Engagement";
  const body = `Surgical case ${params.caseNumber} created from ${typeLabel.toLowerCase()} engagement.`;
  return recordEngagementActivityEvent({
    engagementId: params.engagementId,
    userId: params.userId,
    unifiedType: "ENGAGEMENT_CONVERTED_TO_CASE",
    legacyType: "engagement_converted_to_case",
    body,
    context: params.context,
    metadataJson: {
      case_number: params.caseNumber,
      engagement_type: params.engagementType,
      source: "engagement_to_case",
    },
    tags: ["engagement", "case_workflow"],
  });
}

export async function logEngagementPreparedActivity(params: {
  engagementId: string;
  userId: string;
  context: EngagementActivityContext;
  engagementType?: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const result = await recordEngagementActivityEvent({
      engagementId: params.engagementId,
      userId: params.userId,
      unifiedType: "PRE_CALL_PLAN_COMPLETED",
      legacyType: "engagement_prepared",
      body: params.body,
      context: params.context,
      metadataJson: {
        engagement_type: params.engagementType,
        activity_category: "prepare_for_meeting",
        source: "prepare_for_meeting",
      },
      workflowStage: "pre_call_plan",
      tags: ["engagement", "pre_call_plan", "prepare_for_meeting"],
      mirrorToRelatedLegacy: false,
    });
    if (!result.ok) {
      console.warn("[engagement] prepared activity log skipped:", result.message);
    }
    return { ok: true };
  } catch (err) {
    console.warn("[engagement] prepared activity log failed:", err);
    return { ok: true };
  }
}

export async function logEngagementPreCallPlanActivityEvents(params: {
  engagementId: string;
  userId: string;
  accountId: string | null;
  providerId: string | null;
  opportunityId: string | null;
  caseId?: string | null;
  caseNumber?: string | null;
  prevRow: Record<string, unknown>;
  nextRow: Record<string, unknown>;
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const meta = {
    engagement_id: params.engagementId,
    case_id: params.caseId,
    activity_category: "pre_call_plan",
  };

  if (params.caseId) {
    return logPreCallPlanActivityEvents({
      caseId: params.caseId,
      userId: params.userId,
      accountId: params.accountId,
      providerId: params.providerId,
      opportunityId: params.opportunityId,
      caseNumber: params.caseNumber,
      prevRow: params.prevRow,
      nextRow: params.nextRow,
      previousValues: params.previousValues,
      newValues: params.newValues,
    });
  }

  const kinds: PreCallPlanLegacyActivityType[] = [];
  const hadBefore = Object.values(params.prevRow).some((v) => String(v ?? "").trim().length > 0);
  const hasAfter = Object.values(params.nextRow).some((v) => String(v ?? "").trim().length > 0);
  if (!hasAfter) return { ok: true };
  if (!hadBefore) kinds.push("pre_call_plan_created");
  else kinds.push("pre_call_plan_updated");

  const context: EngagementActivityContext = {
    providerId: params.providerId,
    organizationId: params.accountId,
    opportunityId: params.opportunityId,
    caseId: params.caseId ?? null,
  };

  for (const legacyType of kinds) {
    const body =
      legacyType === "pre_call_plan_created"
        ? "Pre-Call Plan started for this engagement."
        : "Pre-Call Plan updated for this engagement.";
    const unifiedType =
      legacyType === "pre_call_plan_created"
        ? "PRE_CALL_PLAN_CREATED"
        : legacyType === "pre_call_plan_completed"
          ? "PRE_CALL_PLAN_COMPLETED"
          : "PRE_CALL_PLAN_UPDATED";

    const recorded = await recordEngagementActivityEvent({
      engagementId: params.engagementId,
      userId: params.userId,
      unifiedType,
      legacyType,
      body,
      context,
      metadataJson: {
        ...meta,
        fields: Object.keys(params.previousValues),
        previous_values: params.previousValues,
        new_values: params.newValues,
      },
      workflowStage: "pre_call_plan",
      tags: ["pre_call_plan", "engagement", "workflow"],
    });
    if (!recorded.ok) return recorded;
  }

  return { ok: true };
}
