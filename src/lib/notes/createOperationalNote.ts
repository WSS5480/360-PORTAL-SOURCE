import {
  adoptionInitiativeSnapshotFromRow,
  logAdoptionInitiativeActivity,
} from "@/lib/activity/adoptionInitiativeActivity";
import { dualWriteEntityEvent } from "@/lib/activity/dualWrite";
import { loadOpportunityForViewer } from "@/lib/sales/opportunityAccess";
import { emitActivityEvent } from "@/lib/activity/emit";
import { persistActivityEvent } from "@/lib/activity/activityEventStore";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  buildRelatedEntitiesForNote,
  filterRelatedEntitiesForOperationalNote,
  CreateOperationalNoteClientSchema,
  defaultNoteTypeForEntity,
  mapOperationalNoteRow,
  type CreateOperationalNoteParams,
  type OperationalNote,
  type OperationalNoteContextDefaults,
} from "@/lib/notes/operationalNote";
import { isSurgicalObservationCase } from "@/lib/surgical-sales/labels";

export type CreateOperationalNoteResult =
  | { ok: true; note: OperationalNote; legacyActivityId?: string }
  | { ok: false; message: string };

export function mergeNoteInputWithContext(
  parsed: ReturnType<typeof CreateOperationalNoteClientSchema.parse>,
  context: OperationalNoteContextDefaults,
  opts?: { isObservationCase?: boolean },
): Omit<CreateOperationalNoteParams, "userId"> {
  const noteType =
    parsed.note_type ??
    context.noteType ??
    defaultNoteTypeForEntity(context.entityType, opts?.isObservationCase);

  const caseId = parsed.case_id ?? context.caseId ?? (context.entityType === "case" ? context.entityId : null);
  const providerId =
    parsed.provider_id ?? context.providerId ?? (context.entityType === "provider" ? context.entityId : null);
  const organizationId =
    parsed.organization_id ??
    context.organizationId ??
    (context.entityType === "organization" ? context.entityId : null);
  const opportunityId =
    parsed.opportunity_id ??
    context.opportunityId ??
    (context.entityType === "opportunity" ? context.entityId : null);

  const relatedEntities = filterRelatedEntitiesForOperationalNote(
    buildRelatedEntitiesForNote({
      entityType: context.entityType,
      entityId: context.entityId,
      caseId,
      providerId,
      organizationId,
      opportunityId,
      extra: parsed.related_entities ?? context.relatedEntities,
    }),
  );

  return {
    ...parsed,
    entityType: context.entityType,
    entityId: context.entityId,
    note_type: noteType,
    case_id: caseId,
    provider_id: providerId,
    organization_id: organizationId,
    opportunity_id: opportunityId,
    workflow_stage: parsed.workflow_stage ?? context.workflowStage ?? null,
    product_ids: parsed.product_ids ?? context.productIds ?? [],
    task_ids: parsed.task_ids ?? context.taskIds ?? [],
    tags: parsed.tags ?? context.tags ?? [],
    source: parsed.source ?? context.source ?? "manual",
    related_entities: relatedEntities,
  };
}

export async function createOperationalNote(
  params: CreateOperationalNoteParams & { userId: string },
): Promise<CreateOperationalNoteResult> {
  const body = params.body.trim();
  if (!body) return { ok: false, message: "Note body is required." };

  const noteType =
    params.note_type ?? defaultNoteTypeForEntity(params.entityType);
  const caseId = params.case_id ?? (params.entityType === "case" ? params.entityId : null);
  const providerId = params.provider_id ?? (params.entityType === "provider" ? params.entityId : null);
  const organizationId =
    params.organization_id ?? (params.entityType === "organization" ? params.entityId : null);
  const opportunityId =
    params.opportunity_id ?? (params.entityType === "opportunity" ? params.entityId : null);

  const relatedEntities = buildRelatedEntitiesForNote({
    entityType: params.entityType,
    entityId: params.entityId,
    caseId,
    providerId,
    organizationId,
    opportunityId,
    extra: params.related_entities,
  });

  const tags = [...new Set([...(params.tags ?? []), noteType])];
  const source = params.source ?? "manual";

  const { data: row, error: insertErr } = await supabaseAdmin
    .from("sales_operational_notes")
    .insert({
      body,
      entity_type: params.entityType,
      entity_id: params.entityId,
      related_entities: relatedEntities,
      note_type: noteType,
      tags,
      workflow_stage: params.workflow_stage ?? null,
      product_ids: params.product_ids ?? [],
      provider_id: providerId,
      organization_id: organizationId,
      case_id: caseId,
      opportunity_id: opportunityId,
      task_ids: params.task_ids ?? [],
      source,
      created_by_user_id: params.userId,
    })
    .select("*")
    .single();

  if (insertErr || !row) {
    return { ok: false, message: insertErr?.message ?? "Could not save note." };
  }

  const note = mapOperationalNoteRow(row as Record<string, unknown>);

  const activityMetadata = {
    note_id: note.id,
    note_type: noteType,
    source,
    product_ids: params.product_ids ?? [],
    task_ids: params.task_ids ?? [],
    case_id: caseId,
    provider_id: providerId,
    organization_id: organizationId,
    opportunity_id: opportunityId,
  };

  let legacyActivityId: string | undefined;

  if (params.entityType === "opportunity" && opportunityId) {
    const { data: actRow, error: actErr } = await supabaseAdmin
      .from("sales_activities")
      .insert({
        opportunity_id: opportunityId,
        owner_user_id: params.userId,
        activity_type: "note",
        summary: body,
        activity_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (actErr) return { ok: false, message: actErr.message };
    legacyActivityId = actRow?.id ? String(actRow.id) : undefined;
    const oppRow = await loadOpportunityForViewer(opportunityId, params.userId);
    if (oppRow) {
      logAdoptionInitiativeActivity({
        type: "NOTE_ADDED",
        summary: body,
        userId: params.userId,
        snapshot: adoptionInitiativeSnapshotFromRow(oppRow),
        metadata: { ...activityMetadata, legacy_activity_type: "note", sales_activity_id: legacyActivityId },
        tags,
        caseId: caseId,
        legacy: legacyActivityId
          ? { source: "sales_activities", activityId: legacyActivityId }
          : undefined,
      });
    }
  } else if (params.entityType === "organization") {
    dualWriteEntityEvent({
      entityType: "organization",
      entityId: params.entityId,
      userId: params.userId,
      type: "NOTE_ADDED",
      summary: body,
      metadata: activityMetadata,
      relatedEntities,
    });
    await persistActivityEvent({
      type: "NOTE_ADDED",
      summary: body,
      entityType: "organization",
      entityId: params.entityId,
      relatedEntities,
      workflowStage: params.workflow_stage ?? null,
      tags,
      aiGenerated: source === "ai",
      createdBy: { userId: params.userId },
      metadata: activityMetadata,
      source: "unified_emit",
    });
  } else {
    const emitted = await emitActivityEvent({
      type: "NOTE_ADDED",
      summary: body,
      entityType: params.entityType,
      entityId: params.entityId,
      relatedEntities,
      workflowStage: params.workflow_stage ?? null,
      tags,
      aiGenerated: source === "ai",
      createdBy: { userId: params.userId },
      metadata: activityMetadata,
    });

    if (!emitted.ok) {
      return { ok: false, message: emitted.message };
    }
    legacyActivityId = emitted.legacyActivityId;
  }

  if (legacyActivityId) {
    const legacyPatch: Record<string, string> = {};
    if (params.entityType === "case") {
      legacyPatch.legacy_case_activity_id = legacyActivityId;
    } else if (params.entityType === "provider") {
      legacyPatch.legacy_provider_activity_id = legacyActivityId;
    }
    if (Object.keys(legacyPatch).length > 0) {
      await supabaseAdmin.from("sales_operational_notes").update(legacyPatch).eq("id", note.id);
    }
  }

  return { ok: true, note, legacyActivityId };
}

/** Infer CRM links from a surgical case row when posting a case note. */
export function operationalNoteContextFromCaseRow(
  caseId: string,
  caseRow: Record<string, unknown>,
  workflowStage?: string | null,
): OperationalNoteContextDefaults {
  const caseType = caseRow.case_type as string | null | undefined;
  return {
    entityType: "case",
    entityId: caseId,
    noteType:
      isSurgicalObservationCase(caseType) || String(caseType ?? "").trim().toLowerCase() === "product_support"
        ? "case_observation"
        : "general",
    caseId,
    providerId: String(caseRow.surgeon_contact_id ?? "").trim() || null,
    organizationId: String(caseRow.account_id ?? "").trim() || null,
    opportunityId: String(caseRow.related_opportunity_id ?? "").trim() || null,
    workflowStage: workflowStage ?? null,
  };
}
