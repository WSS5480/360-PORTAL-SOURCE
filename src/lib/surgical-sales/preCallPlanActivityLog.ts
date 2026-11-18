import type { ActivityRelatedEntity } from "@/lib/activity/activityEvent";
import type { ActivityEventType } from "@/lib/activity/activityEventTypes";
import { ACTIVITY_EVENT_TYPE_LABELS } from "@/lib/activity/activityEventTypes";
import { dualWriteEntityEvent, dualWriteOpportunityEvent } from "@/lib/activity/dualWrite";
import { logSurgicalCaseActivity } from "@/lib/surgical-sales/caseActivityLog";
import {
  countPreCallPlanFilled,
  hasPreCallPlanData,
  PRE_CALL_PLAN_CASE_KEYS,
  type PreCallPlanFieldKey,
} from "@/lib/surgical-sales/preCallPlanFields";
import { logSurgicalProviderActivity } from "@/lib/surgical-sales/providerActivityLog";

export const PRE_CALL_PLAN_LEGACY_ACTIVITY = {
  created: "pre_call_plan_created",
  updated: "pre_call_plan_updated",
  completed: "pre_call_plan_completed",
} as const;

export type PreCallPlanLegacyActivityType =
  (typeof PRE_CALL_PLAN_LEGACY_ACTIVITY)[keyof typeof PRE_CALL_PLAN_LEGACY_ACTIVITY];

const PRE_CALL_KEY_SET = new Set<string>(PRE_CALL_PLAN_CASE_KEYS);

export function isPreCallPlanAuditKey(key: string): key is PreCallPlanFieldKey {
  return PRE_CALL_KEY_SET.has(key);
}

export function pickPreCallPlanAuditDiff(diff: {
  previous_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
}): { previous_values: Record<string, unknown>; new_values: Record<string, unknown> } | null {
  const previous_values: Record<string, unknown> = {};
  const new_values: Record<string, unknown> = {};
  for (const key of Object.keys(diff.previous_values)) {
    if (!isPreCallPlanAuditKey(key)) continue;
    previous_values[key] = diff.previous_values[key];
    new_values[key] = diff.new_values[key];
  }
  if (Object.keys(previous_values).length === 0) return null;
  return { previous_values, new_values };
}

export function omitPreCallPlanFromAuditDiff(diff: {
  previous_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
}): { previous_values: Record<string, unknown>; new_values: Record<string, unknown> } | null {
  const previous_values: Record<string, unknown> = {};
  const new_values: Record<string, unknown> = {};
  for (const key of Object.keys(diff.previous_values)) {
    if (isPreCallPlanAuditKey(key)) continue;
    previous_values[key] = diff.previous_values[key];
    new_values[key] = diff.new_values[key];
  }
  if (Object.keys(previous_values).length === 0) return null;
  return { previous_values, new_values };
}

function unifiedTypeForPreCallLegacy(legacyType: PreCallPlanLegacyActivityType): ActivityEventType {
  if (legacyType === PRE_CALL_PLAN_LEGACY_ACTIVITY.created) return "PRE_CALL_PLAN_CREATED";
  if (legacyType === PRE_CALL_PLAN_LEGACY_ACTIVITY.completed) return "PRE_CALL_PLAN_COMPLETED";
  return "PRE_CALL_PLAN_UPDATED";
}

function bodyForPreCallLegacy(
  legacyType: PreCallPlanLegacyActivityType,
  caseNumber: string | null,
  fieldLabels: string,
): string {
  const caseRef = caseNumber ? `Case ${caseNumber}` : "Case";
  if (legacyType === PRE_CALL_PLAN_LEGACY_ACTIVITY.created) {
    return `${caseRef}: Pre-Call Plan started${fieldLabels ? ` (${fieldLabels})` : ""}.`;
  }
  if (legacyType === PRE_CALL_PLAN_LEGACY_ACTIVITY.completed) {
    return `${caseRef}: Pre-Call Plan completed.`;
  }
  return `${caseRef}: Pre-Call Plan updated${fieldLabels ? ` (${fieldLabels})` : ""}.`;
}

function isPreCallPlanFullyComplete(row: Record<string, unknown>): boolean {
  const { filled, total } = countPreCallPlanFilled(row);
  return total > 0 && filled >= total;
}

export function resolvePreCallPlanActivityKinds(params: {
  prevRow: Record<string, unknown>;
  nextRow: Record<string, unknown>;
}): PreCallPlanLegacyActivityType[] {
  const hadBefore = hasPreCallPlanData(params.prevRow);
  const hasAfter = hasPreCallPlanData(params.nextRow);
  if (!hasAfter) return [];

  const kinds: PreCallPlanLegacyActivityType[] = [];
  if (!hadBefore) {
    kinds.push(PRE_CALL_PLAN_LEGACY_ACTIVITY.created);
  } else {
    kinds.push(PRE_CALL_PLAN_LEGACY_ACTIVITY.updated);
  }

  const wasComplete = isPreCallPlanFullyComplete(params.prevRow);
  const nowComplete = isPreCallPlanFullyComplete(params.nextRow);
  if (!wasComplete && nowComplete) {
    kinds.push(PRE_CALL_PLAN_LEGACY_ACTIVITY.completed);
  }

  return kinds;
}

function dualWritePreCallPlanToRelatedEntities(params: {
  legacyType: PreCallPlanLegacyActivityType;
  userId: string;
  summary: string;
  caseId: string;
  caseNumber?: string | null;
  accountId: string | null;
  providerId: string | null;
  opportunityId: string | null;
  metadata?: Record<string, unknown>;
}): void {
  const unifiedType = unifiedTypeForPreCallLegacy(params.legacyType);
  const title = ACTIVITY_EVENT_TYPE_LABELS[unifiedType];
  const related: ActivityRelatedEntity[] = [
    { entityType: "case", entityId: params.caseId, label: params.caseNumber ?? null, role: "source_case" },
  ];
  if (params.providerId) {
    related.push({ entityType: "provider", entityId: params.providerId, role: "surgeon" });
  }
  if (params.opportunityId) {
    related.push({ entityType: "opportunity", entityId: params.opportunityId, role: "linked_opportunity" });
  }

  if (params.accountId) {
    dualWriteEntityEvent({
      entityType: "organization",
      entityId: params.accountId,
      userId: params.userId,
      type: unifiedType,
      title,
      summary: params.summary,
      metadata: params.metadata,
      relatedEntities: related,
    });
  }

  if (params.opportunityId) {
    dualWriteOpportunityEvent({
      opportunityId: params.opportunityId,
      userId: params.userId,
      type: unifiedType,
      title,
      summary: params.summary,
      metadata: params.metadata,
      relatedEntities: related,
    });
  }
}

async function logOnePreCallPlanActivity(params: {
  legacyType: PreCallPlanLegacyActivityType;
  caseId: string;
  userId: string;
  accountId: string | null;
  providerId: string | null;
  opportunityId: string | null;
  caseNumber?: string | null;
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  metadataJson?: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const fieldKeys = Object.keys(params.previousValues);
  const fieldLabels = fieldKeys.map((k) => k.replace(/_/g, " ")).join(", ");
  const body = bodyForPreCallLegacy(params.legacyType, params.caseNumber ?? null, fieldLabels);

  const meta: Record<string, unknown> = {
    ...(params.metadataJson ?? {}),
    fields: fieldKeys,
    account_id: params.accountId,
    workflow_stage: "pre_call_plan",
    activity_category: "pre_call_plan",
  };

  const caseLog = await logSurgicalCaseActivity({
    caseId: params.caseId,
    userId: params.userId,
    activityType: params.legacyType,
    body,
    metadataJson: meta,
    previousValues: params.previousValues,
    newValues: params.newValues,
    providerId: params.providerId,
    opportunityId: params.opportunityId,
    workflowStageCompleted:
      params.legacyType === PRE_CALL_PLAN_LEGACY_ACTIVITY.completed ? "pre_call_plan" : null,
  });
  if (!caseLog.ok) return caseLog;

  if (params.providerId) {
    const providerLog = await logSurgicalProviderActivity({
      providerId: params.providerId,
      userId: params.userId,
      activityType: params.legacyType,
      body,
      metadataJson: { ...meta, source_case_id: params.caseId },
      sourceCaseId: params.caseId,
    });
    if (!providerLog.ok) return providerLog;
  }

  dualWritePreCallPlanToRelatedEntities({
    legacyType: params.legacyType,
    userId: params.userId,
    summary: body,
    caseId: params.caseId,
    caseNumber: params.caseNumber,
    accountId: params.accountId,
    providerId: params.providerId,
    opportunityId: params.opportunityId,
    metadata: meta,
  });

  return { ok: true };
}

/**
 * Logs Pre-Call Plan activity on the case, linked provider, organization, and opportunity (when set).
 * Does not use PROVIDER_PLANNING_UPDATED or provider planning legacy types.
 */
export async function logPreCallPlanActivityEvents(params: {
  caseId: string;
  userId: string;
  accountId: string | null;
  providerId: string | null;
  opportunityId: string | null;
  caseNumber?: string | null;
  prevRow: Record<string, unknown>;
  nextRow: Record<string, unknown>;
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const kinds = resolvePreCallPlanActivityKinds({
    prevRow: params.prevRow,
    nextRow: params.nextRow,
  });
  if (kinds.length === 0) return { ok: true };

  for (const legacyType of kinds) {
    const result = await logOnePreCallPlanActivity({
      legacyType,
      caseId: params.caseId,
      userId: params.userId,
      accountId: params.accountId,
      providerId: params.providerId,
      opportunityId: params.opportunityId,
      caseNumber: params.caseNumber,
      previousValues: params.previousValues,
      newValues: params.newValues,
    });
    if (!result.ok) return result;
  }

  return { ok: true };
}
