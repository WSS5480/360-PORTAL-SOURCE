import type { ActivityEvent } from "@/lib/activity/activityEvent";
import { parseActivityEventId } from "@/lib/activity/activityEvent";
import { ACTIVITY_TYPE_LABEL, type ActivityType } from "@/lib/sales/activityTypes";
import { formatSurgicalCaseActivityType } from "@/lib/surgical-sales/caseActivityLabels";
import { operationalNoteTypeLabel } from "@/lib/notes/operationalNote";
import { formatProviderActivityType } from "@/lib/surgical-sales/providerActivityLabels";

export const UNIFIED_ACTIVITY_FEED_FILTERS = [
  { id: "all", label: "All" },
  { id: "notes", label: "Notes" },
  { id: "workflow", label: "Workflow" },
  { id: "products", label: "Products" },
  { id: "documents", label: "Documents" },
  { id: "system", label: "System" },
  { id: "ai", label: "AI" },
] as const;

export type UnifiedActivityFeedFilterId = (typeof UNIFIED_ACTIVITY_FEED_FILTERS)[number]["id"];
export type UnifiedActivityFeedCategory = Exclude<UnifiedActivityFeedFilterId, "all">;

export type UnifiedActivityFeedItem = {
  id: string;
  category: UnifiedActivityFeedCategory;
  title: string;
  summary: string;
  timestamp: string;
  userLabel: string;
  href?: string | null;
  metaChips?: string[];
  metadata?: Record<string, unknown>;
  workflowStage?: string | null;
  aiGenerated?: boolean;
  eventType?: string;
  isLegacyFallback?: boolean;
  pulseId?: string | null;
  deletable?: boolean;
  deleteActivityId?: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function legacyFeedIdToActivityId(feedId: string): string | null {
  const match = String(feedId ?? "")
    .trim()
    .match(/^([a-z_]+)-([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
  return match?.[2] ?? null;
}

function legacyActivityIdFromEvent(event: ActivityEvent): string | null {
  const fromMeta = String(event.metadata?.legacy_activity_id ?? "").trim();
  if (UUID_RE.test(fromMeta)) return fromMeta;
  const parsed = parseActivityEventId(event.id);
  if (parsed?.legacyId && UUID_RE.test(parsed.legacyId)) return parsed.legacyId;
  return legacyFeedIdToActivityId(event.id);
}

function eventIsDeletableNote(event: ActivityEvent): boolean {
  return event.type === "NOTE_ADDED" || event.type === "AI_INTELLIGENCE_CAPTURED";
}

export function activityFeedItemIsDeletable(item: UnifiedActivityFeedItem): boolean {
  if (item.id === "legacy-contact-notes") return false;
  if (item.deletable === false) return false;
  if (item.deletable === true) return true;
  if (item.category === "notes") {
    return Boolean(item.deleteActivityId || UUID_RE.test(item.id) || legacyFeedIdToActivityId(item.id));
  }
  if (item.category === "ai") {
    const eventType = String(item.eventType ?? "").toLowerCase();
    return eventType === "ai_note_capture" || eventType === "ai_intelligence_captured";
  }
  return false;
}

export function activityEventFeedCategory(event: ActivityEvent): UnifiedActivityFeedCategory {
  if (event.aiGenerated || event.type === "AI_INTELLIGENCE_CAPTURED") return "ai";
  if (event.type === "NOTE_ADDED") return "notes";
  if (event.type === "PRODUCT_ADDED") return "products";
  if (event.type === "DOCUMENT_UPLOADED") return "documents";
  if (
    event.type === "WORKFLOW_FIELD_UPDATED" ||
    event.type === "WORKFLOW_STAGE_COMPLETED" ||
    event.type === "OPPORTUNITY_STAGE_CHANGED" ||
    event.type === "EVALUATION_PLANNED" ||
    event.type === "EVALUATION_ACTIVE" ||
    event.type === "PREFERENCE_CARD_PROGRESS_UPDATED" ||
    event.type === "PROVIDER_PLANNING_UPDATED" ||
    event.type === "PLANNING_SECTION_COMPLETED" ||
    event.type === "PROVIDER_INTELLIGENCE_UPDATED" ||
    event.type === "PRE_CALL_PLAN_CREATED" ||
    event.type === "PRE_CALL_PLAN_UPDATED" ||
    event.type === "PRE_CALL_PLAN_COMPLETED" ||
    event.type === "ENGAGEMENT_CREATED" ||
    event.type === "ENGAGEMENT_UPDATED" ||
    event.type === "ENGAGEMENT_COMPLETED" ||
    event.type === "ENGAGEMENT_CONVERTED_TO_CASE" ||
    event.type === "ENGAGEMENT_LINKED" ||
    event.type === "CASE_LINKED" ||
    event.tags.some(
      (t) =>
        t === "discovery" ||
        t === "clinical_discovery" ||
        t === "planning" ||
        t === "pre_call_plan",
    )
  ) {
    return "workflow";
  }
  return "system";
}

function hrefForEvent(event: ActivityEvent): string | null {
  if (event.entityType === "case" && event.entityId) {
    return `/portal/sales/cases/${encodeURIComponent(event.entityId)}`;
  }
  if (event.entityType === "provider" && event.entityId) {
    return `/portal/sales/providers/${encodeURIComponent(event.entityId)}`;
  }
  if (event.entityType === "opportunity" && event.entityId) {
    return `/portal/sales/opportunities/${encodeURIComponent(event.entityId)}`;
  }
  if (event.entityType === "engagement" && event.entityId) {
    return `/portal/sales/engagements/${encodeURIComponent(event.entityId)}`;
  }
  if (event.entityType === "organization" && event.entityId) {
    return `/portal/sales/accounts/${encodeURIComponent(event.entityId)}`;
  }
  const relatedCase = event.relatedEntities.find((r) => r.entityType === "case");
  if (relatedCase) return `/portal/sales/cases/${encodeURIComponent(relatedCase.entityId)}`;
  const relatedOpp = event.relatedEntities.find((r) => r.entityType === "opportunity");
  if (relatedOpp) return `/portal/sales/opportunities/${encodeURIComponent(relatedOpp.entityId)}`;
  return null;
}

function metaChipsFromEvent(event: ActivityEvent): string[] | undefined {
  const chips: string[] = [];
  const noteType = event.metadata?.note_type;
  if (typeof noteType === "string" && noteType.trim()) {
    chips.push(operationalNoteTypeLabel(noteType));
  }
  if (event.workflowStage) chips.push(event.workflowStage.replace(/_/g, " "));
  for (const tag of event.tags) {
    if (tag && !chips.includes(tag)) chips.push(tag);
  }
  const fields = event.metadata.fields;
  if (Array.isArray(fields)) {
    for (const field of fields.slice(0, 3)) {
      if (typeof field === "string" && field.trim()) chips.push(field.replace(/_/g, " "));
    }
  }
  return chips.length > 0 ? chips : undefined;
}

export function activityEventToFeedItem(event: ActivityEvent): UnifiedActivityFeedItem {
  const deleteActivityId = legacyActivityIdFromEvent(event);
  return {
    id: event.id,
    category: activityEventFeedCategory(event),
    title: event.title,
    summary: event.summary,
    timestamp: event.createdAt,
    userLabel: event.createdBy.displayName || event.createdBy.userId || "System",
    href: hrefForEvent(event),
    metaChips: metaChipsFromEvent(event),
    metadata: event.metadata,
    workflowStage: event.workflowStage,
    aiGenerated: event.aiGenerated,
    eventType: event.type,
    pulseId: event.id,
    deletable: eventIsDeletableNote(event),
    deleteActivityId,
  };
}

export function activityEventsToFeedItems(events: ActivityEvent[]): UnifiedActivityFeedItem[] {
  return events
    .map(activityEventToFeedItem)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/** Legacy surgical case activity row → feed item (fallback). */
export function legacyCaseActivityToFeedItem(params: {
  id: string;
  activity_type: string;
  body: string | null;
  created_at: string;
  userLabel: string;
  metadata_json?: unknown;
  category?: UnifiedActivityFeedCategory;
  title?: string;
}): UnifiedActivityFeedItem {
  const rawType = String(params.activity_type || "").toLowerCase();
  let category = params.category ?? "system";
  if (!params.category) {
    if (rawType === "note") category = "notes";
    else if (rawType === "document_uploaded" || rawType === "document_deleted") category = "documents";
    else if (rawType === "product_updated") category = "products";
    else if (rawType === "ai_note_capture") category = "ai";
    else if (
      rawType === "case_updated" ||
      rawType === "pre_call_plan_created" ||
      rawType === "pre_call_plan_updated" ||
      rawType === "pre_call_plan_completed" ||
      rawType === "provider_intelligence_promoted" ||
      rawType === "clinical_discovery_insight_from_case"
    ) {
      category = "workflow";
    }
  }
  const meta =
    params.metadata_json && typeof params.metadata_json === "object"
      ? (params.metadata_json as Record<string, unknown>)
      : undefined;
  const noteTypeChip =
    meta && typeof meta.note_type === "string" ? operationalNoteTypeLabel(meta.note_type) : null;

  return {
    id: params.id,
    category,
    title: params.title || formatSurgicalCaseActivityType(params.activity_type),
    summary: String(params.body || "").trim() || params.title || formatSurgicalCaseActivityType(params.activity_type),
    metaChips: noteTypeChip ? [noteTypeChip] : undefined,
    timestamp: params.created_at,
    userLabel: params.userLabel,
    metadata: meta,
    isLegacyFallback: true,
    pulseId: params.id,
    eventType: rawType,
    deletable: category === "notes" || rawType === "ai_note_capture",
    deleteActivityId: UUID_RE.test(params.id) ? params.id : null,
  };
}

export function legacyProviderTimelineToFeedItem(entry: Record<string, unknown>): UnifiedActivityFeedItem | null {
  const at = String(entry.at || entry.created_at || "").trim();
  if (!at) return null;
  const kind = String(entry.kind || "");
  const rawType = String(entry.activity_type || "").toLowerCase();
  let category: UnifiedActivityFeedCategory = "system";
  if (kind === "contact_note" || rawType === "note") category = "notes";
  else if (kind === "provider_activity" && (entry.category === "discovery" || rawType === "clinical_discovery_updated")) {
    category = "workflow";
  } else if (kind === "case_activity") category = "workflow";
  else if (kind === "opportunity_activity") category = "system";

  return {
    id: `${kind}-${String(entry.id || at)}`,
    category,
    title: String(entry.title || "Activity"),
    summary: String(entry.body || entry.question_label || "").trim() || String(entry.title || "Activity"),
    timestamp: at,
    userLabel: String(entry.actor_display_name || "").trim() || "Rep",
    href: entry.href ? String(entry.href) : null,
    isLegacyFallback: true,
    pulseId: String(entry.id || ""),
    deletable: category === "notes" || rawType === "ai_note_capture",
    deleteActivityId: entry.id && UUID_RE.test(String(entry.id)) ? String(entry.id) : legacyFeedIdToActivityId(`${kind}-${String(entry.id || at)}`),
  };
}

export function legacyOpportunityActivityToFeedItem(params: {
  id: string;
  activity_type: string;
  summary: string;
  activity_at: string;
}): UnifiedActivityFeedItem {
  const typeKey = String(params.activity_type || "note") as ActivityType;
  const label = ACTIVITY_TYPE_LABEL[typeKey] || typeKey;
  return {
    id: params.id,
    category: "notes",
    title: label,
    summary: params.summary,
    timestamp: params.activity_at,
    userLabel: "Rep",
    isLegacyFallback: true,
    pulseId: params.id,
    eventType: params.activity_type,
  };
}

export function filterUnifiedFeedItems(
  items: UnifiedActivityFeedItem[],
  filter: UnifiedActivityFeedFilterId,
): UnifiedActivityFeedItem[] {
  if (filter === "all") return items;
  return items.filter((item) => item.category === filter);
}
