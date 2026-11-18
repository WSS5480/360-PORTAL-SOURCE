import type { ActivityEventType } from "@/lib/activity/activityEventTypes";
import {
  buildActivityEvent,
  type ActivityEntityType,
  type ActivityEvent,
  type ActivityEventSource,
  type ActivityRelatedEntity,
  type BuildActivityEventInput,
} from "@/lib/activity/activityEvent";
import { persistActivityEvent } from "@/lib/activity/activityEventStore";

export type DualWriteLegacyRef = {
  source: ActivityEventSource;
  activityId?: string;
};

/**
 * Records a unified ActivityEvent after legacy storage already succeeded.
 * Failures are logged and do not throw (legacy write remains source of truth).
 */
export async function recordActivityEventDual(
  input: BuildActivityEventInput & { legacy?: DualWriteLegacyRef },
): Promise<ActivityEvent | null> {
  try {
    const result = await persistActivityEvent(input);
    if (!result.ok) {
      console.error("[activity] dual-write failed:", result.message);
      return result.event;
    }
    return result.event;
  } catch (err) {
    console.error("[activity] dual-write error:", err);
    return buildActivityEvent(input);
  }
}

/** Fire-and-forget dual-write — safe after legacy log in API handlers. */
export function voidRecordActivityEventDual(
  input: BuildActivityEventInput & { legacy?: DualWriteLegacyRef },
): void {
  void recordActivityEventDual(input);
}

const OBSERVATION_WORKFLOW_FIELD_STAGES: Record<string, string> = {
  observation_goal: "pre_call_plan",
  pre_call_hospital_name: "pre_call_plan",
  pre_call_surgeon_name: "pre_call_plan",
  pre_observation_impact_opening_statement: "pre_call_plan",
  pre_observation_probes: "pre_call_plan",
  pre_observation_tools_resources: "pre_call_plan",
  pre_observation_value_hypothesis: "pre_call_plan",
  pre_observation_planned_close: "pre_call_plan",
  pre_observation_additional_notes: "pre_call_plan",
  live_observation_workflow: "live",
  live_observation_clinical_pain_points: "live",
  live_observation_surgeon_reactions: "live",
  live_observation_product_fit: "live",
  live_observation_competitors: "live",
  live_observation_staff_process: "live",
  live_observation_questions: "live",
  live_observation_follow_up_items: "follow_up",
  debrief_key_findings: "debrief",
  debrief_opportunity_score: "debrief",
  debrief_suggested_next_action: "follow_up",
  follow_up_needed: "follow_up",
  related_opportunity_id: "routing",
  debrief_recommended_next_stage: "routing",
  debrief_product_opportunity_identified: "routing",
  debrief_convert_to_product_support_case: "routing",
};

export function inferWorkflowStageFromChangedFields(fields: string[]): string | null {
  const stages = new Set<string>();
  for (const field of fields) {
    const stage = OBSERVATION_WORKFLOW_FIELD_STAGES[field];
    if (stage) stages.add(stage);
  }
  if (stages.size === 1) return [...stages][0] ?? null;
  return null;
}

export function dualWriteAfterCaseLegacyLog(params: {
  caseId: string;
  userId: string;
  type: ActivityEventType;
  summary: string;
  title?: string;
  legacy: DualWriteLegacyRef;
  metadata?: Record<string, unknown>;
  workflowStage?: string | null;
  tags?: string[];
  aiGenerated?: boolean;
  relatedEntities?: ActivityRelatedEntity[];
  providerId?: string | null;
  opportunityId?: string | null;
}): void {
  const related: ActivityRelatedEntity[] = [{ entityType: "case", entityId: params.caseId }];
  if (params.providerId) {
    related.push({ entityType: "provider", entityId: params.providerId, role: "surgeon" });
  }
  if (params.opportunityId) {
    related.push({ entityType: "opportunity", entityId: params.opportunityId, role: "linked_opportunity" });
  }
  if (params.relatedEntities?.length) {
    related.push(...params.relatedEntities);
  }

  voidRecordActivityEventDual({
    type: params.type,
    title: params.title,
    summary: params.summary,
    entityType: "case",
    entityId: params.caseId,
    relatedEntities: related,
    createdBy: { userId: params.userId },
    metadata: params.metadata,
    workflowStage: params.workflowStage ?? null,
    tags: params.tags,
    aiGenerated: params.aiGenerated,
    legacy: params.legacy,
    source: "unified_emit",
  });
}

export function dualWriteAfterProviderLegacyLog(params: {
  providerId: string;
  userId: string;
  type: ActivityEventType;
  summary: string;
  title?: string;
  legacy: DualWriteLegacyRef;
  metadata?: Record<string, unknown>;
  workflowStage?: string | null;
  tags?: string[];
  aiGenerated?: boolean;
  sourceCaseId?: string | null;
}): void {
  const related: ActivityRelatedEntity[] = [{ entityType: "provider", entityId: params.providerId }];
  if (params.sourceCaseId) {
    related.push({ entityType: "case", entityId: params.sourceCaseId, role: "source_case" });
  }

  voidRecordActivityEventDual({
    type: params.type,
    title: params.title,
    summary: params.summary,
    entityType: "provider",
    entityId: params.providerId,
    relatedEntities: related,
    createdBy: { userId: params.userId },
    metadata: params.metadata,
    workflowStage: params.workflowStage ?? null,
    tags: params.tags,
    aiGenerated: params.aiGenerated,
    legacy: params.legacy,
    source: "unified_emit",
  });
}

export function dualWriteOpportunityEvent(params: {
  opportunityId: string;
  userId: string;
  type: ActivityEventType;
  summary: string;
  title?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  relatedEntities?: ActivityRelatedEntity[];
  legacy?: DualWriteLegacyRef;
}): void {
  voidRecordActivityEventDual({
    type: params.type,
    title: params.title,
    summary: params.summary,
    entityType: "opportunity",
    entityId: params.opportunityId,
    relatedEntities: params.relatedEntities ?? [],
    createdBy: { userId: params.userId },
    metadata: params.metadata,
    tags: params.tags,
    legacy: params.legacy,
    source: "unified_emit",
  });
}

export function dualWriteEntityEvent(params: {
  entityType: ActivityEntityType;
  entityId: string;
  userId: string | null;
  type: ActivityEventType;
  summary: string;
  title?: string;
  metadata?: Record<string, unknown>;
  relatedEntities?: ActivityRelatedEntity[];
}): void {
  voidRecordActivityEventDual({
    type: params.type,
    title: params.title,
    summary: params.summary,
    entityType: params.entityType,
    entityId: params.entityId,
    relatedEntities: params.relatedEntities ?? [],
    createdBy: { userId: params.userId },
    metadata: params.metadata,
    source: "unified_emit",
  });
}
