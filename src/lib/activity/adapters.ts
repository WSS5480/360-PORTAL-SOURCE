import {
  activityEventIdFromLegacy,
  buildActivityEvent,
  type ActivityEvent,
  type ActivityRelatedEntity,
} from "@/lib/activity/activityEvent";
import {
  unifiedTypeFromLegacyCaseActivity,
  unifiedTypeFromLegacyEngagementActivity,
  unifiedTypeFromLegacyProviderActivity,
  unifiedTypeFromLegacySalesActivity,
} from "@/lib/activity/legacyTypeMap";
import { formatEngagementActivityType } from "@/lib/surgical-sales/engagements/engagementActivityLabels";
import { formatSurgicalCaseActivityType } from "@/lib/surgical-sales/caseActivityLabels";
import { formatProviderActivityType } from "@/lib/surgical-sales/providerActivityLabels";
import { ACTIVITY_TYPE_LABEL, type ActivityType } from "@/lib/sales/activityTypes";

export type SurgicalCaseActivityRow = {
  id: string;
  case_id: string;
  activity_type: string;
  body: string | null;
  user_id?: string | null;
  metadata_json?: unknown;
  created_at: string;
};

export type SurgicalProviderActivityRow = {
  id: string;
  provider_id?: string;
  activity_type: string;
  body: string | null;
  user_id?: string | null;
  metadata_json?: unknown;
  created_at: string;
};

export type SalesOpportunityActivityRow = {
  id: string;
  opportunity_id: string;
  activity_type: string;
  summary: string | null;
  activity_at?: string | null;
  created_at?: string | null;
};

export type ProviderTimelineEntry = {
  kind?: string;
  id?: string;
  activity_type?: string;
  at?: string;
  created_at?: string;
  user_id?: string;
  title?: string;
  body?: string;
  href?: string | null;
  meta?: string | null;
  category?: string;
  question_label?: string | null;
};

function metaObject(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function tagsFromMeta(meta: Record<string, unknown>): string[] {
  const tags: string[] = [];
  const category = String(meta.activity_category || meta.category || "").trim();
  if (category) tags.push(category);
  const questionKey = String(meta.question_key || "").trim();
  if (questionKey) tags.push(`question:${questionKey}`);
  return tags;
}

function workflowStageFromMeta(meta: Record<string, unknown>): string | null {
  const stage = meta.workflow_stage ?? meta.workflowStage ?? meta.stage;
  return stage == null ? null : String(stage).trim() || null;
}

function relatedFromMeta(
  meta: Record<string, unknown>,
  defaults: ActivityRelatedEntity[],
): ActivityRelatedEntity[] {
  const related = [...defaults];
  const providerId = String(meta.provider_id || "").trim();
  if (providerId) {
    related.push({ entityType: "provider", entityId: providerId, role: "provider" });
  }
  const opportunityId = String(meta.opportunity_id || meta.related_opportunity_id || "").trim();
  if (opportunityId) {
    related.push({ entityType: "opportunity", entityId: opportunityId, role: "linked_opportunity" });
  }
  const sourceCaseId = String(meta.source_case_id || meta.case_id || "").trim();
  if (sourceCaseId) {
    related.push({ entityType: "case", entityId: sourceCaseId, role: "source_case" });
  }
  const engagementId = String(meta.engagement_id || "").trim();
  if (engagementId) {
    related.push({ entityType: "engagement", entityId: engagementId, role: "engagement" });
  }
  const organizationId = String(meta.organization_id || meta.account_id || "").trim();
  if (organizationId) {
    related.push({ entityType: "organization", entityId: organizationId });
  }
  return related;
}

export function activityEventFromSurgicalCaseActivity(
  row: SurgicalCaseActivityRow,
  context?: {
    actorDisplayName?: string | null;
    caseNumber?: string | null;
    providerId?: string | null;
    opportunityId?: string | null;
  },
): ActivityEvent {
  const meta = metaObject(row.metadata_json);
  const legacyType = String(row.activity_type || "").trim().toLowerCase();
  const unifiedType = unifiedTypeFromLegacyCaseActivity(legacyType);
  const body = String(row.body || "").trim();
  const title = formatSurgicalCaseActivityType(legacyType);
  const caseId = String(row.case_id);

  const related: ActivityRelatedEntity[] = [{ entityType: "case", entityId: caseId, label: context?.caseNumber }];
  if (context?.providerId) {
    related.push({ entityType: "provider", entityId: context.providerId, role: "surgeon" });
  }
  if (context?.opportunityId) {
    related.push({ entityType: "opportunity", entityId: context.opportunityId, role: "linked_opportunity" });
  }

  return buildActivityEvent({
    id: activityEventIdFromLegacy("surgical_sales_case_activities", row.id),
    type: unifiedType,
    title,
    summary: body || title,
    entityType: "case",
    entityId: caseId,
    relatedEntities: relatedFromMeta(meta, related),
    createdBy: {
      userId: row.user_id ? String(row.user_id) : null,
      displayName: context?.actorDisplayName ?? null,
    },
    createdAt: row.created_at,
    metadata: { ...meta, legacy_activity_type: legacyType },
    workflowStage: workflowStageFromMeta(meta),
    tags: tagsFromMeta(meta),
    aiGenerated: Boolean(meta.ai_generated ?? meta.aiGenerated),
    source: "surgical_sales_case_activities",
  });
}

export type SurgicalEngagementActivityRow = {
  id: string;
  engagement_id: string;
  activity_type: string;
  body: string | null;
  user_id?: string | null;
  metadata_json?: unknown;
  created_at: string;
};

export function activityEventFromEngagementActivity(
  row: SurgicalEngagementActivityRow,
  context?: {
    actorDisplayName?: string | null;
    providerId?: string | null;
    organizationId?: string | null;
    opportunityId?: string | null;
    caseId?: string | null;
  },
): ActivityEvent {
  const meta = metaObject(row.metadata_json);
  const legacyType = String(row.activity_type || "").trim().toLowerCase();
  const unifiedType = unifiedTypeFromLegacyEngagementActivity(legacyType);
  const title = formatEngagementActivityType(legacyType);
  const engagementId = String(row.engagement_id);
  const summary = String(row.body || "").trim() || title;

  const related: ActivityRelatedEntity[] = [{ entityType: "engagement", entityId: engagementId }];
  if (context?.providerId) {
    related.push({ entityType: "provider", entityId: context.providerId, role: "surgeon" });
  }
  if (context?.organizationId) {
    related.push({ entityType: "organization", entityId: context.organizationId });
  }
  if (context?.opportunityId) {
    related.push({ entityType: "opportunity", entityId: context.opportunityId, role: "linked_opportunity" });
  }
  if (context?.caseId) {
    related.push({ entityType: "case", entityId: context.caseId, role: "linked_case" });
  }

  return buildActivityEvent({
    id: activityEventIdFromLegacy("surgical_sales_engagement_activities", row.id),
    type: unifiedType,
    title,
    summary,
    entityType: "engagement",
    entityId: engagementId,
    relatedEntities: relatedFromMeta(meta, related),
    createdBy: {
      userId: row.user_id ? String(row.user_id) : null,
      displayName: context?.actorDisplayName ?? null,
    },
    createdAt: row.created_at,
    metadata: { ...meta, legacy_activity_type: legacyType },
    workflowStage: workflowStageFromMeta(meta) ?? (meta.activity_category === "pre_call_plan" ? "pre_call_plan" : null),
    tags: tagsFromMeta(meta),
    aiGenerated: Boolean(meta.ai_generated ?? meta.aiGenerated),
    source: "surgical_sales_engagement_activities",
  });
}

export function activityEventFromSurgicalProviderActivity(
  row: SurgicalProviderActivityRow,
  providerId: string,
  context?: { actorDisplayName?: string | null },
): ActivityEvent {
  const meta = metaObject(row.metadata_json);
  const legacyType = String(row.activity_type || "").trim().toLowerCase();
  const unifiedType = unifiedTypeFromLegacyProviderActivity(legacyType);
  const title = formatProviderActivityType(legacyType);
  const summary = String(meta.question_label || row.body || title).trim();

  return buildActivityEvent({
    id: activityEventIdFromLegacy("surgical_sales_provider_activities", row.id),
    type: unifiedType,
    title,
    summary,
    entityType: "provider",
    entityId: providerId,
    relatedEntities: relatedFromMeta(meta, [{ entityType: "provider", entityId: providerId }]),
    createdBy: {
      userId: row.user_id ? String(row.user_id) : null,
      displayName: context?.actorDisplayName ?? null,
    },
    createdAt: row.created_at,
    metadata: { ...meta, legacy_activity_type: legacyType },
    workflowStage: workflowStageFromMeta(meta),
    tags: tagsFromMeta(meta),
    aiGenerated: Boolean(meta.ai_generated ?? meta.aiGenerated),
    source: "surgical_sales_provider_activities",
  });
}

export function activityEventFromSalesOpportunityActivity(
  row: SalesOpportunityActivityRow,
  context?: { actorDisplayName?: string | null; accountName?: string | null },
): ActivityEvent {
  const legacyType = String(row.activity_type || "note").trim().toLowerCase();
  const unifiedType = unifiedTypeFromLegacySalesActivity(legacyType);
  const typeKey = legacyType as ActivityType;
  const title = ACTIVITY_TYPE_LABEL[typeKey] || legacyType.replace(/_/g, " ");
  const opportunityId = String(row.opportunity_id);
  const summary = String(row.summary || "").trim() || title;
  const createdAt = String(row.activity_at || row.created_at || new Date().toISOString());

  return buildActivityEvent({
    id: activityEventIdFromLegacy("sales_activities", row.id),
    type: unifiedType,
    title,
    summary,
    entityType: "opportunity",
    entityId: opportunityId,
    relatedEntities: [{ entityType: "opportunity", entityId: opportunityId, label: context?.accountName }],
    createdBy: { userId: null, displayName: context?.actorDisplayName ?? null },
    createdAt,
    metadata: { legacy_activity_type: legacyType },
    workflowStage: null,
    tags: [],
    aiGenerated: false,
    source: "sales_activities",
  });
}

/** Adapts merged provider profile timeline rows (kind + loose shape). */
export function activityEventFromProviderTimelineEntry(entry: ProviderTimelineEntry): ActivityEvent | null {
  const kind = String(entry.kind || "").trim();
  const id = String(entry.id || newSyntheticTimelineId()).trim();
  const at = String(entry.at || entry.created_at || new Date().toISOString());
  const body = String(entry.body || entry.question_label || "").trim();
  const title = String(entry.title || "Activity").trim();

  if (kind === "case_activity") {
    const activityType = String(entry.activity_type || "").trim().toLowerCase();
    return buildActivityEvent({
      id: activityEventIdFromLegacy("provider_timeline", `case-${id}`),
      type: unifiedTypeFromLegacyCaseActivity(activityType),
      title,
      summary: body || title,
      entityType: "case",
      entityId: extractEntityIdFromHref(entry.href, "cases") ?? id,
      relatedEntities: [],
      createdBy: { userId: entry.user_id ? String(entry.user_id) : null },
      createdAt: at,
      metadata: { legacy_kind: kind, legacy_activity_type: activityType },
      workflowStage: null,
      tags: entry.category ? [String(entry.category)] : [],
      aiGenerated: false,
      source: "provider_timeline",
    });
  }

  if (kind === "provider_activity") {
    const activityType = String(entry.activity_type || "").trim().toLowerCase();
    return buildActivityEvent({
      id: activityEventIdFromLegacy("provider_timeline", `provider-${id}`),
      type: unifiedTypeFromLegacyProviderActivity(activityType),
      title,
      summary: body || title,
      entityType: "provider",
      entityId: id,
      relatedEntities: [],
      createdBy: { userId: entry.user_id ? String(entry.user_id) : null },
      createdAt: at,
      metadata: { legacy_kind: kind, legacy_activity_type: activityType },
      workflowStage: null,
      tags: entry.category ? [String(entry.category)] : [],
      aiGenerated: false,
      source: "provider_timeline",
    });
  }

  if (kind === "opportunity_activity") {
    return buildActivityEvent({
      id: activityEventIdFromLegacy("provider_timeline", `opp-${id}`),
      type: "NOTE_ADDED",
      title,
      summary: body || title,
      entityType: "opportunity",
      entityId: extractEntityIdFromHref(entry.href, "opportunities") ?? id,
      relatedEntities: [],
      createdBy: { userId: null },
      createdAt: at,
      metadata: { legacy_kind: kind },
      workflowStage: null,
      tags: ["opportunity"],
      aiGenerated: false,
      source: "provider_timeline",
    });
  }

  return null;
}

function extractEntityIdFromHref(href: string | null | undefined, segment: string): string | null {
  if (!href) return null;
  const parts = href.split("/").filter(Boolean);
  const idx = parts.indexOf(segment);
  if (idx < 0 || idx >= parts.length - 1) return null;
  return parts[idx + 1] || null;
}

function newSyntheticTimelineId(): string {
  return `tl-${Date.now()}`;
}

export function activityEventsFromSurgicalCaseActivities(
  rows: SurgicalCaseActivityRow[],
  contextByCaseId?: Map<string, { caseNumber?: string; providerId?: string; opportunityId?: string }>,
): ActivityEvent[] {
  return rows.map((row) => {
    const ctx = contextByCaseId?.get(String(row.case_id));
    return activityEventFromSurgicalCaseActivity(row, ctx);
  });
}

export function activityEventsFromProviderTimeline(
  entries: ProviderTimelineEntry[],
): ActivityEvent[] {
  return entries
    .map((e) => activityEventFromProviderTimelineEntry(e))
    .filter((e): e is ActivityEvent => e != null);
}
