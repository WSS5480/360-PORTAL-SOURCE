import { buildActivityEvent, type ActivityEvent, type BuildActivityEventInput } from "@/lib/activity/activityEvent";
import { persistActivityEvent } from "@/lib/activity/activityEventStore";
import type { ActivityEventType } from "@/lib/activity/activityEventTypes";
import {
  legacyCaseActivityTypeForUnified,
  legacyProviderActivityTypeForUnified,
} from "@/lib/activity/legacyTypeMap";
import { createOperationalNote, operationalNoteContextFromCaseRow } from "@/lib/notes/createOperationalNote";
import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";
import { logSurgicalCaseActivity } from "@/lib/surgical-sales/caseActivityLog";
import { logSurgicalProviderActivity } from "@/lib/surgical-sales/providerActivityLog";

export type EmitActivityEventInput = BuildActivityEventInput & {
  /** When true (default), also write to legacy activity tables where supported. */
  persistLegacy?: boolean;
};

export type EmitActivityEventResult =
  | { ok: true; event: ActivityEvent; legacyActivityId?: string }
  | { ok: false; message: string; event: ActivityEvent };

/**
 * Builds a unified ActivityEvent and optionally persists via existing case/provider loggers.
 * Does not replace legacy tables — writes alongside them until a unified store exists.
 */
export async function emitActivityEvent(input: EmitActivityEventInput): Promise<EmitActivityEventResult> {
  const persistLegacy = input.persistLegacy !== false;

  if (!persistLegacy) {
    const stored = await persistActivityEvent({ ...input, source: input.source ?? "unified_emit" });
    return stored.ok
      ? { ok: true, event: stored.event }
      : { ok: false, message: stored.message, event: stored.event };
  }

  const legacy = await persistActivityEventToLegacy(input);
  if (!legacy.ok) {
    const event = buildActivityEvent({ ...input, source: input.source ?? "unified_emit" });
    return { ok: false, message: legacy.message, event };
  }

  const event = buildActivityEvent({
    ...input,
    source: input.source ?? "unified_emit",
    id:
      legacy.legacyActivityId && legacy.source
        ? `${legacy.source}:${legacy.legacyActivityId}`
        : undefined,
  });

  return {
    ok: true,
    event,
    legacyActivityId: legacy.legacyActivityId,
  };
}

async function persistActivityEventToLegacy(
  input: EmitActivityEventInput,
): Promise<
  | { ok: true; legacyActivityId?: string; source?: ActivityEvent["source"] }
  | { ok: false; message: string }
> {
  const userId = input.createdBy?.userId;
  if (!userId) {
    return { ok: true };
  }

  const meta: Record<string, unknown> = {
    ...(input.metadata ?? {}),
    unified_activity_type: input.type,
    workflow_stage: input.workflowStage,
    tags: input.tags,
    ai_generated: input.aiGenerated,
    related_entities: input.relatedEntities,
  };

  if (shouldPersistToCaseActivity(input.type, input.entityType)) {
    const caseId = resolveCaseIdFromInput(input);
    if (!caseId) return { ok: true };
    const log = await logSurgicalCaseActivity({
      caseId,
      userId,
      activityType: legacyCaseActivityTypeForUnified(input.type),
      body: input.summary,
      metadataJson: meta,
      providerId: input.relatedEntities?.find((r) => r.entityType === "provider")?.entityId ?? null,
      opportunityId: input.relatedEntities?.find((r) => r.entityType === "opportunity")?.entityId ?? null,
    });
    if (!log.ok) return { ok: false, message: log.message };
    return {
      ok: true,
      legacyActivityId: log.activityId,
      source: "surgical_sales_case_activities",
    };
  }

  if (shouldPersistToProviderActivity(input.type, input.entityType)) {
    const providerId = resolveProviderIdFromInput(input);
    if (!providerId) return { ok: true };
    const log = await logSurgicalProviderActivity({
      providerId,
      userId,
      activityType: legacyProviderActivityTypeForUnified(input.type),
      body: input.summary,
      metadataJson: meta,
      sourceCaseId: input.relatedEntities?.find((r) => r.entityType === "case")?.entityId ?? null,
    });
    if (!log.ok) return { ok: false, message: log.message };
    return {
      ok: true,
      legacyActivityId: log.activityId,
      source: "surgical_sales_provider_activities",
    };
  }

  return { ok: true };
}

function shouldPersistToCaseActivity(type: ActivityEventType, entityType: string): boolean {
  if (entityType === "case") return true;
  const caseTypes: ActivityEventType[] = [
    "NOTE_ADDED",
    "WORKFLOW_FIELD_UPDATED",
    "WORKFLOW_STAGE_COMPLETED",
    "CASE_CREATED",
    "CASE_STATUS_CHANGED",
    "PRODUCT_ADDED",
    "DOCUMENT_UPLOADED",
    "AI_INTELLIGENCE_CAPTURED",
    "PROVIDER_PLANNING_UPDATED",
    "PRE_CALL_PLAN_CREATED",
    "PRE_CALL_PLAN_UPDATED",
    "PRE_CALL_PLAN_COMPLETED",
  ];
  return caseTypes.includes(type);
}

const PROVIDER_ENTITY_ACTIVITY_TYPES: ActivityEventType[] = [
  "PROVIDER_CREATED",
  "PROVIDER_UPDATED",
  "PROVIDER_PLANNING_UPDATED",
  "PROVIDER_INTELLIGENCE_UPDATED",
  "PLANNING_SECTION_COMPLETED",
  "PRE_CALL_PLAN_CREATED",
  "PRE_CALL_PLAN_UPDATED",
  "PRE_CALL_PLAN_COMPLETED",
  "ENGAGEMENT_CREATED",
  "ENGAGEMENT_UPDATED",
  "ENGAGEMENT_COMPLETED",
  "ENGAGEMENT_CONVERTED_TO_CASE",
  "AI_INTELLIGENCE_CAPTURED",
  "NOTE_ADDED",
];

function shouldPersistToProviderActivity(type: ActivityEventType, entityType: string): boolean {
  if (entityType !== "provider") {
    return (
      type === "PROVIDER_UPDATED" ||
      type === "PROVIDER_PLANNING_UPDATED" ||
      type === "NOTE_ADDED" ||
      type === "PROVIDER_INTELLIGENCE_UPDATED" ||
      type === "PRE_CALL_PLAN_CREATED" ||
      type === "PRE_CALL_PLAN_UPDATED" ||
      type === "PRE_CALL_PLAN_COMPLETED"
    );
  }
  return PROVIDER_ENTITY_ACTIVITY_TYPES.includes(type);
}

function resolveCaseIdFromInput(input: EmitActivityEventInput): string | null {
  if (input.entityType === "case") return input.entityId;
  const fromRelated = input.relatedEntities?.find((r) => r.entityType === "case");
  if (fromRelated) return fromRelated.entityId;
  const fromMeta = String(input.metadata?.case_id || input.metadata?.caseId || "").trim();
  return fromMeta || null;
}

function resolveProviderIdFromInput(input: EmitActivityEventInput): string | null {
  if (input.entityType === "provider") return input.entityId;
  const fromRelated = input.relatedEntities?.find((r) => r.entityType === "provider");
  if (fromRelated) return fromRelated.entityId;
  const fromMeta = String(input.metadata?.provider_id || input.metadata?.providerId || "").trim();
  return fromMeta || null;
}

/** Convenience: emit a case note (persists structured note + activity). */
export async function emitCaseNoteActivity(params: {
  caseId: string;
  userId: string;
  summary: string;
  metadata?: Record<string, unknown>;
  aiGenerated?: boolean;
}): Promise<EmitActivityEventResult> {
  const row = await loadSurgicalCaseForPortalActor(params.caseId, params.userId, { includeArchived: true });
  const context = row
    ? operationalNoteContextFromCaseRow(params.caseId, row)
    : { entityType: "case" as const, entityId: params.caseId, caseId: params.caseId };
  const created = await createOperationalNote({
    body: params.summary,
    userId: params.userId,
    entityType: "case",
    entityId: params.caseId,
    source: params.aiGenerated ? "ai" : "manual",
    tags: params.aiGenerated ? ["ai"] : [],
    workflow_stage:
      typeof params.metadata?.workflow_stage === "string" ? params.metadata.workflow_stage : context.workflowStage,
    note_type: typeof params.metadata?.note_type === "string" ? (params.metadata.note_type as never) : context.noteType,
    provider_id: context.providerId,
    organization_id: context.organizationId,
    opportunity_id: context.opportunityId,
  });
  if (!created.ok) {
    return { ok: false, message: created.message, event: buildActivityEvent({ type: "NOTE_ADDED", summary: params.summary, entityType: "case", entityId: params.caseId }) };
  }
  return {
    ok: true,
    event: buildActivityEvent({
      type: "NOTE_ADDED",
      summary: params.summary,
      entityType: "case",
      entityId: params.caseId,
      id: created.legacyActivityId ? `surgical_sales_case_activities:${created.legacyActivityId}` : undefined,
      metadata: { note_id: created.note.id, ...(params.metadata ?? {}) },
      aiGenerated: params.aiGenerated,
    }),
    legacyActivityId: created.legacyActivityId,
  };
}
