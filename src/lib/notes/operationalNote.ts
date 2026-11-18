import { z } from "zod";
import type { ActivityEntityType, ActivityRelatedEntity } from "@/lib/activity/activityEvent";

export const OPERATIONAL_NOTE_TYPES = [
  "general",
  "case_observation",
  "provider_intelligence",
  "opportunity_signal",
  "organization_intelligence",
  "product_usage",
  "follow_up",
  "risk_issue",
] as const;

export type OperationalNoteType = (typeof OPERATIONAL_NOTE_TYPES)[number];

export const OPERATIONAL_NOTE_TYPE_LABELS: Record<OperationalNoteType, string> = {
  general: "General",
  case_observation: "Case Observation",
  provider_intelligence: "Provider Intelligence",
  opportunity_signal: "Product Fit Signal",
  organization_intelligence: "Organization Intelligence",
  product_usage: "Product Usage",
  follow_up: "Follow-up",
  risk_issue: "Risk / Issue",
};

export const OPERATIONAL_NOTE_SOURCES = ["manual", "ai", "imported"] as const;
export type OperationalNoteSource = (typeof OPERATIONAL_NOTE_SOURCES)[number];

export const OPERATIONAL_NOTE_ENTITY_TYPES = [
  "case",
  "provider",
  "opportunity",
  "organization",
  "engagement",
  "task",
] as const;
export type OperationalNoteEntityType = (typeof OPERATIONAL_NOTE_ENTITY_TYPES)[number];

export type OperationalNoteActor = {
  userId: string;
  displayName?: string | null;
};

/** Canonical operational note (app layer). */
export type OperationalNote = {
  id: string;
  body: string;
  entityType: OperationalNoteEntityType;
  entityId: string;
  relatedEntities: ActivityRelatedEntity[];
  noteType: OperationalNoteType;
  tags: string[];
  workflowStage: string | null;
  productIds: string[];
  providerId: string | null;
  organizationId: string | null;
  caseId: string | null;
  opportunityId: string | null;
  taskIds: string[];
  source: OperationalNoteSource;
  createdBy: OperationalNoteActor;
  createdAt: string;
  aiExtraction?: Record<string, unknown> | null;
};

export type OperationalNoteContextDefaults = {
  entityType: OperationalNoteEntityType;
  entityId: string;
  noteType?: OperationalNoteType;
  caseId?: string | null;
  providerId?: string | null;
  organizationId?: string | null;
  opportunityId?: string | null;
  workflowStage?: string | null;
  productIds?: string[];
  taskIds?: string[];
  relatedEntities?: ActivityRelatedEntity[];
  tags?: string[];
  source?: OperationalNoteSource;
};

/** Client → API payload (body required; classification optional). */
export const CreateOperationalNoteClientSchema = z
  .object({
    body: z.string().min(1).max(8000),
    note_type: z.enum(OPERATIONAL_NOTE_TYPES).optional(),
    tags: z.array(z.string().max(64)).max(20).optional(),
    workflow_stage: z.string().max(64).nullable().optional(),
    product_ids: z.array(z.string().uuid()).max(32).optional(),
    provider_id: z.string().uuid().nullable().optional(),
    organization_id: z.string().uuid().nullable().optional(),
    case_id: z.string().uuid().nullable().optional(),
    opportunity_id: z.string().uuid().nullable().optional(),
    task_ids: z.array(z.string().uuid()).max(32).optional(),
    related_entities: z
      .array(
        z.object({
          entityType: z.enum(OPERATIONAL_NOTE_ENTITY_TYPES),
          entityId: z.string().uuid(),
          label: z.string().max(200).nullable().optional(),
          role: z.string().max(64).nullable().optional(),
        }),
      )
      .max(12)
      .optional(),
    source: z.enum(OPERATIONAL_NOTE_SOURCES).optional(),
  })
  .strict();

export type CreateOperationalNoteClientInput = z.infer<typeof CreateOperationalNoteClientSchema>;

export type CreateOperationalNoteParams = CreateOperationalNoteClientInput & {
  userId: string;
  entityType: OperationalNoteEntityType;
  entityId: string;
};

export function defaultNoteTypeForEntity(entityType: OperationalNoteEntityType, isObservationCase?: boolean): OperationalNoteType {
  if (entityType === "case") return isObservationCase ? "case_observation" : "general";
  if (entityType === "provider") return "provider_intelligence";
  if (entityType === "opportunity") return "opportunity_signal";
  return "organization_intelligence";
}

export function operationalNoteTypeLabel(noteType: string | null | undefined): string {
  const key = String(noteType ?? "general") as OperationalNoteType;
  return OPERATIONAL_NOTE_TYPE_LABELS[key] ?? OPERATIONAL_NOTE_TYPE_LABELS.general;
}

export function mapOperationalNoteRow(row: Record<string, unknown>): OperationalNote {
  const relatedRaw = row.related_entities;
  const relatedEntities = Array.isArray(relatedRaw)
    ? (relatedRaw as ActivityRelatedEntity[])
    : [];

  return {
    id: String(row.id),
    body: String(row.body ?? ""),
    entityType: String(row.entity_type) as OperationalNoteEntityType,
    entityId: String(row.entity_id),
    relatedEntities,
    noteType: (String(row.note_type || "general") as OperationalNoteType) || "general",
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    workflowStage: row.workflow_stage ? String(row.workflow_stage) : null,
    productIds: Array.isArray(row.product_ids) ? (row.product_ids as string[]) : [],
    providerId: row.provider_id ? String(row.provider_id) : null,
    organizationId: row.organization_id ? String(row.organization_id) : null,
    caseId: row.case_id ? String(row.case_id) : null,
    opportunityId: row.opportunity_id ? String(row.opportunity_id) : null,
    taskIds: Array.isArray(row.task_ids) ? (row.task_ids as string[]) : [],
    source: (String(row.source || "manual") as OperationalNoteSource) || "manual",
    createdBy: { userId: String(row.created_by_user_id) },
    createdAt: String(row.created_at ?? new Date().toISOString()),
    aiExtraction:
      row.ai_extraction_json && typeof row.ai_extraction_json === "object"
        ? (row.ai_extraction_json as Record<string, unknown>)
        : null,
  };
}

export function buildRelatedEntitiesForNote(params: {
  entityType: OperationalNoteEntityType;
  entityId: string;
  caseId?: string | null;
  providerId?: string | null;
  organizationId?: string | null;
  opportunityId?: string | null;
  extra?: ActivityRelatedEntity[];
}): ActivityRelatedEntity[] {
  const related: ActivityRelatedEntity[] = [];
  const push = (entityType: ActivityEntityType, entityId: string | null | undefined, role?: string) => {
    if (!entityId?.trim()) return;
    if (entityType === params.entityType && entityId === params.entityId) return;
    if (related.some((r) => r.entityType === entityType && r.entityId === entityId)) return;
    related.push({ entityType, entityId, role: role ?? null });
  };

  push("case", params.caseId, "case");
  push("provider", params.providerId, "provider");
  push("organization", params.organizationId, "organization");
  push("opportunity", params.opportunityId, "opportunity");
  if (params.extra?.length) {
    for (const item of params.extra) {
      push(item.entityType, item.entityId, item.role ?? undefined);
    }
  }
  return related;
}

/** Narrow activity related entities to types stored on operational notes. */
export function filterRelatedEntitiesForOperationalNote(related: ActivityRelatedEntity[]): Array<{
  entityType: OperationalNoteEntityType;
  entityId: string;
  label?: string | null;
  role?: string | null;
}> {
  return related
    .filter((r) => (OPERATIONAL_NOTE_ENTITY_TYPES as readonly string[]).includes(r.entityType))
    .map((r) => ({
      entityType: r.entityType as OperationalNoteEntityType,
      entityId: r.entityId,
      label: r.label ?? null,
      role: r.role ?? null,
    }));
}
