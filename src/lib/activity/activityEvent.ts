import {
  ACTIVITY_EVENT_TYPE_LABELS,
  type ActivityEventType,
  isActivityEventType,
} from "@/lib/activity/activityEventTypes";

/** Primary CRM entity the event is anchored to. */
export type ActivityEntityType =
  | "case"
  | "engagement"
  | "provider"
  | "opportunity"
  | "organization"
  | "task"
  | "document"
  | "product_line";

/** Where the event was recorded or synthesized from. */
export type ActivityEventSource =
  | "surgical_sales_case_activities"
  | "surgical_sales_provider_activities"
  | "surgical_sales_engagement_activities"
  | "sales_activities"
  | "sales_tasks"
  | "organization_feed"
  | "provider_timeline"
  | "synthetic"
  | "unified_emit";

export type ActivityEventActor = {
  userId: string | null;
  displayName?: string | null;
};

export type ActivityRelatedEntity = {
  entityType: ActivityEntityType;
  entityId: string;
  label?: string | null;
  /** e.g. primary, source_case, linked_opportunity */
  role?: string | null;
};

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  title: string;
  summary: string;
  entityType: ActivityEntityType;
  entityId: string;
  relatedEntities: ActivityRelatedEntity[];
  createdBy: ActivityEventActor;
  createdAt: string;
  metadata: Record<string, unknown>;
  workflowStage: string | null;
  tags: string[];
  aiGenerated: boolean;
  source: ActivityEventSource;
};

export type BuildActivityEventInput = {
  id?: string;
  type: ActivityEventType;
  title?: string;
  summary: string;
  entityType: ActivityEntityType;
  entityId: string;
  relatedEntities?: ActivityRelatedEntity[];
  createdBy?: ActivityEventActor;
  createdAt?: string;
  metadata?: Record<string, unknown>;
  workflowStage?: string | null;
  tags?: string[];
  aiGenerated?: boolean;
  source?: ActivityEventSource;
};

export function defaultTitleForActivityType(type: ActivityEventType): string {
  return ACTIVITY_EVENT_TYPE_LABELS[type];
}

export function buildActivityEvent(input: BuildActivityEventInput): ActivityEvent {
  const type = input.type;
  return {
    id: input.id ?? newSyntheticActivityId(),
    type,
    title: input.title?.trim() || defaultTitleForActivityType(type),
    summary: input.summary.trim(),
    entityType: input.entityType,
    entityId: input.entityId,
    relatedEntities: input.relatedEntities ?? [],
    createdBy: {
      userId: input.createdBy?.userId ?? null,
      displayName: input.createdBy?.displayName ?? null,
    },
    createdAt: input.createdAt ?? new Date().toISOString(),
    metadata: { ...(input.metadata ?? {}) },
    workflowStage: input.workflowStage ?? null,
    tags: [...(input.tags ?? [])],
    aiGenerated: Boolean(input.aiGenerated),
    source: input.source ?? "synthetic",
  };
}

/** Client-side / pre-persist id until a row id is known. */
export function newSyntheticActivityId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `syn-${crypto.randomUUID()}`;
  }
  return `syn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function activityEventIdFromLegacy(source: ActivityEventSource, legacyId: string): string {
  return `${source}:${legacyId}`;
}

export function parseActivityEventId(id: string): { source: string; legacyId: string } | null {
  const idx = id.indexOf(":");
  if (idx <= 0) return null;
  return { source: id.slice(0, idx), legacyId: id.slice(idx + 1) };
}

export function coerceActivityEventType(raw: string): ActivityEventType | null {
  const normalized = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
  if (isActivityEventType(normalized)) return normalized;
  return null;
}

export function compareActivityEventsNewestFirst(a: ActivityEvent, b: ActivityEvent): number {
  const ta = Date.parse(a.createdAt);
  const tb = Date.parse(b.createdAt);
  if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return tb - ta;
  return String(b.id).localeCompare(String(a.id));
}

export function sortActivityEventsNewestFirst(events: ActivityEvent[]): ActivityEvent[] {
  return [...events].sort(compareActivityEventsNewestFirst);
}
