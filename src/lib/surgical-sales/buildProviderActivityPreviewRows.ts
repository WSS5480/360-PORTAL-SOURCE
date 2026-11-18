import type { UnifiedActivityFeedItem } from "@/lib/activity/activityFeedPresentation";
import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  isUpcomingEngagementStatus,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderActivityTimelinePresentation,
  type ProviderActivityPreviewKind,
} from "@/lib/surgical-sales/providerActivityTimelinePresentation";

export type { ProviderActivityPreviewKind };

export type ProviderActivityPreviewRow = {
  id: string;
  kind: ProviderActivityPreviewKind;
  /** Operational event badge (Engagement Scheduled, Intelligence Captured, …). */
  activityTypeLabel: string;
  /** Human-readable headline for the touchpoint. */
  title: string;
  /** Short operational summary. */
  summary: string | null;
  /** Organization · product when not already in the summary. */
  relatedEntity: string | null;
  /** Optional rep-facing next step. */
  nextStep: string | null;
  timestamp: string;
  href: string | null;
  dedupeKey?: string;
};

const PREVIEW_LIMIT = 6;

const AUDIT_UNIFIED_TYPES = new Set([
  "WORKFLOW_FIELD_UPDATED",
  "WORKFLOW_STAGE_COMPLETED",
  "PROVIDER_UPDATED",
  "PROVIDER_CREATED",
  "PROVIDER_PLANNING_UPDATED",
  "PLANNING_SECTION_COMPLETED",
  "DOCUMENT_UPLOADED",
  "TASK_CREATED",
  "TASK_COMPLETED",
  "ORGANIZATION_LINKED",
  "PROVIDER_LINKED",
  "PREFERENCE_CARD_PROGRESS_UPDATED",
]);

const AUDIT_LEGACY_TYPES = new Set([
  "case_updated",
  "status_change",
  "product_updated",
  "document_uploaded",
  "document_deleted",
  "billing_update",
  "provider_updated",
]);

const FALLBACK_KIND_LABELS: Record<ProviderActivityPreviewKind, string> = {
  note: "Note Added",
  engagement: "Engagement Scheduled",
  case: "Case Activity",
  opportunity: "Opportunity Activity",
  intelligence: "Intelligence Captured",
  product: "Product Discussed",
};

const ENGAGEMENT_CREATED_RE = /^(.+?)\s+engagement\s+created\.?$/i;
const ENGAGEMENT_CREATED_NAMED_RE = /^(.+?)\s+engagement\s+created:\s*(.+)$/i;
const ENGAGEMENT_COMPLETED_RE = /^(.+?)\s+marked\s+completed\.?$/i;

export function providerActivityPreviewKindLabel(kind: ProviderActivityPreviewKind): string {
  return FALLBACK_KIND_LABELS[kind];
}

function productLineFromMeta(meta?: Record<string, unknown>): string | null {
  for (const key of ["product_line", "product_display", "product_name"]) {
    const v = String(meta?.[key] ?? "").trim();
    if (v) return v;
  }
  return null;
}

function rowFromPresentation(
  base: Omit<ProviderActivityPreviewRow, "activityTypeLabel" | "title" | "summary" | "relatedEntity" | "nextStep">,
  ctx: Parameters<typeof buildProviderActivityTimelinePresentation>[0],
): ProviderActivityPreviewRow {
  const p = buildProviderActivityTimelinePresentation(ctx);
  return {
    ...base,
    activityTypeLabel: p.eventBadge,
    title: p.title,
    summary: p.summary,
    relatedEntity: p.relatedEntity,
    nextStep: p.nextStep,
  };
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function normalizeEventType(raw: string | undefined): string {
  return String(raw || "")
    .trim()
    .replace(/-/g, "_")
    .toUpperCase();
}

function legacyRawType(raw: string | undefined): string {
  return String(raw || "").trim().toLowerCase();
}

function isSnakeAuditTitle(title: string): boolean {
  const t = title.trim();
  return /^[a-z][a-z0-9_]*$/.test(t) && t.includes("_");
}

function isAuditPhrasing(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (isSnakeAuditTitle(t)) return true;
  return (
    /\bengagement created\b/i.test(t) ||
    /\bactivity recorded\b/i.test(t) ||
    /\bworkflow updated\b/i.test(t) ||
    /\bmarked completed\b/i.test(t) ||
    /^[A-Z_]+_/.test(t)
  );
}

function engagementIdFromHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const m = href.match(/\/engagements\/([^/?#]+)/);
  return m?.[1] ?? null;
}

function engagementMap(
  engagements?: ProviderEngagementSummary[],
): Map<string, ProviderEngagementSummary> {
  const map = new Map<string, ProviderEngagementSummary>();
  for (const e of engagements || []) map.set(e.id, e);
  return map;
}

function parseEngagementTypeFromAuditText(text: string): string | null {
  const t = text.trim();
  const named = ENGAGEMENT_CREATED_NAMED_RE.exec(t);
  if (named?.[1]) return named[1].trim();
  const created = ENGAGEMENT_CREATED_RE.exec(t);
  if (created?.[1]) return created[1].trim();
  const completed = ENGAGEMENT_COMPLETED_RE.exec(t);
  if (completed?.[1]) return completed[1].trim();
  return null;
}

function orgFromMeta(item: UnifiedActivityFeedItem): string | null {
  const meta = item.metadata || {};
  for (const key of ["organization_name", "account_name", "organization_label"]) {
    const v = String(meta[key] ?? "").trim();
    if (v) return v;
  }
  for (const chip of item.metaChips || []) {
    const c = chip.trim();
    if (!c || /^case /i.test(c) || /^engagement/i.test(c)) continue;
    if (c.length >= 3 && c.length <= 80) return c;
  }
  return null;
}

type EngagementContext = {
  id: string | null;
  typeLabel: string;
  title: string | null;
  org: string | null;
  status: string | null;
};

function resolveEngagementContext(
  item: UnifiedActivityFeedItem,
  engById: Map<string, ProviderEngagementSummary>,
): EngagementContext {
  const id =
    engagementIdFromHref(item.href) ||
    String(item.metadata?.engagement_id ?? "").trim() ||
    null;
  const eng = id ? engById.get(id) : undefined;
  const parsedType = parseEngagementTypeFromAuditText(item.summary) || parseEngagementTypeFromAuditText(item.title);
  const metaType = item.metadata?.engagement_type
    ? formatEngagementType(String(item.metadata.engagement_type))
    : null;
  const typeLabel = eng?.engagement_type_label || parsedType || metaType || "Engagement";
  const title =
    eng?.title?.trim() ||
    (ENGAGEMENT_CREATED_NAMED_RE.exec(item.summary)?.[2]?.trim() ?? null) ||
    (item.title && !isAuditPhrasing(item.title) ? item.title.trim() : null);
  const org = eng?.organization_name?.trim() || orgFromMeta(item) || null;
  const status = eng?.status?.toLowerCase() || String(item.metadata?.status ?? "").toLowerCase() || null;
  return { id, typeLabel, title, org, status };
}

function presentationContextFromEngagement(
  item: UnifiedActivityFeedItem,
  engById: Map<string, ProviderEngagementSummary>,
  eventType?: string,
): Parameters<typeof buildProviderActivityTimelinePresentation>[0] {
  const ctx = resolveEngagementContext(item, engById);
  const eng = ctx.id ? engById.get(ctx.id) : undefined;
  return {
    eventType: eventType ?? item.eventType ?? "ENGAGEMENT_UPDATED",
    kind: "engagement",
    engagementType: eng?.engagement_type ?? String(item.metadata?.engagement_type ?? ""),
    engagementStatus: ctx.status,
    engagementTitle: ctx.title,
    typeLabel: ctx.typeLabel,
    organization: ctx.org,
    productLine: productLineFromMeta(item.metadata) ?? eng?.opportunity_label ?? null,
    caseNumber: String(item.metadata?.case_number ?? "").trim() || eng?.case_number || null,
    rawSummary: item.summary,
    engagement: eng ?? null,
  };
}

function unifiedTypeToKind(item: UnifiedActivityFeedItem): ProviderActivityPreviewKind | null {
  const t = normalizeEventType(item.eventType);
  if (t === "PRODUCT_ADDED") return "product";
  if (t === "EVALUATION_PLANNED" || t === "EVALUATION_ACTIVE") return "opportunity";
  if (AUDIT_UNIFIED_TYPES.has(t)) {
    if (t === "PROVIDER_PLANNING_UPDATED") {
      const tags = item.metaChips || [];
      if (item.metadata?.question_label || tags.some((x) => /discovery|clinical/i.test(x))) {
        return "intelligence";
      }
    }
    return null;
  }
  if (t === "NOTE_ADDED" || item.category === "notes") return "note";
  if (
    t.startsWith("ENGAGEMENT_") ||
    t.startsWith("PRE_CALL_PLAN_") ||
    t === "ENGAGEMENT_LINKED" ||
    t === "ENGAGEMENT_CONVERTED_TO_CASE"
  ) {
    return "engagement";
  }
  if (t.startsWith("CASE_")) return "case";
  if (t.startsWith("OPPORTUNITY_")) return "opportunity";
  if (t === "PROVIDER_INTELLIGENCE_UPDATED" || t === "AI_INTELLIGENCE_CAPTURED") return "intelligence";
  if (item.category === "ai") return "intelligence";

  if (item.category === "workflow") {
    if (legacyRawType(item.eventType) === "clinical_discovery_insight_from_case") return "intelligence";
    if (
      legacyRawType(item.eventType).startsWith("pre_call_plan") ||
      legacyRawType(item.eventType).includes("engagement")
    ) {
      return "engagement";
    }
    if (legacyRawType(item.eventType) === "case_created") return "case";
    return null;
  }

  if (item.category === "system") return null;
  return null;
}

function buildNoteRow(item: UnifiedActivityFeedItem): ProviderActivityPreviewRow {
  return rowFromPresentation(
    {
      id: item.id,
      kind: "note",
      timestamp: item.timestamp,
      href: item.href ?? null,
      dedupeKey: `note:${item.id}`,
    },
    {
      eventType: item.eventType ?? "NOTE_ADDED",
      kind: "note",
      organization: orgFromMeta(item),
      productLine: productLineFromMeta(item.metadata),
      rawSummary: item.summary,
    },
  );
}

function buildIntelligenceRow(item: UnifiedActivityFeedItem): ProviderActivityPreviewRow {
  const q = item.metadata?.question_label;
  const question = typeof q === "string" && q.trim() ? q.trim() : null;
  return rowFromPresentation(
    {
      id: item.id,
      kind: "intelligence",
      timestamp: item.timestamp,
      href: item.href ?? null,
    },
    {
      eventType: item.eventType ?? "PROVIDER_INTELLIGENCE_UPDATED",
      kind: "intelligence",
      questionLabel: question,
      organization: orgFromMeta(item),
      productLine: productLineFromMeta(item.metadata),
      rawSummary: item.summary,
    },
  );
}

function buildCaseRow(item: UnifiedActivityFeedItem): ProviderActivityPreviewRow {
  const caseLabel =
    String(item.metadata?.case_number ?? "").trim() ||
    item.metaChips?.find((c) => /^case /i.test(c))?.replace(/^case\s*/i, "") ||
    null;
  return rowFromPresentation(
    {
      id: item.id,
      kind: "case",
      timestamp: item.timestamp,
      href: item.href ?? null,
      dedupeKey: caseLabel ? `case:${caseLabel}` : undefined,
    },
    {
      eventType: item.eventType ?? "CASE_CREATED",
      kind: "case",
      caseNumber: caseLabel,
      caseType: String(item.metadata?.case_type ?? "").trim() || null,
      organization: String(item.metadata?.account_name ?? "").trim() || orgFromMeta(item),
      productLine: productLineFromMeta(item.metadata),
      rawSummary: item.summary,
    },
  );
}

function buildOpportunityRow(item: UnifiedActivityFeedItem): ProviderActivityPreviewRow {
  const name =
    String(item.metadata?.opportunity_name ?? item.metadata?.account_name ?? "").trim() ||
    item.metaChips?.[0]?.trim() ||
    "Evaluation";
  return rowFromPresentation(
    {
      id: item.id,
      kind: "opportunity",
      timestamp: item.timestamp,
      href: item.href ?? null,
    },
    {
      eventType: item.eventType ?? "OPPORTUNITY_CREATED",
      kind: "opportunity",
      initiativeName: name,
      organization: orgFromMeta(item),
      productLine: productLineFromMeta(item.metadata),
      rawSummary: item.summary,
    },
  );
}

function buildProductRow(item: UnifiedActivityFeedItem): ProviderActivityPreviewRow {
  return rowFromPresentation(
    {
      id: item.id,
      kind: "product",
      timestamp: item.timestamp,
      href: item.href ?? null,
    },
    {
      eventType: "PRODUCT_ADDED",
      kind: "product",
      organization: orgFromMeta(item),
      productLine: productLineFromMeta(item.metadata) ?? (item.summary?.trim() || null),
      rawSummary: item.summary,
    },
  );
}

function unifiedItemToRow(
  item: UnifiedActivityFeedItem,
  engById: Map<string, ProviderEngagementSummary>,
): ProviderActivityPreviewRow | null {
  const kind = unifiedTypeToKind(item);
  if (!kind) return null;

  let row: ProviderActivityPreviewRow;
  if (kind === "note") {
    row = buildNoteRow(item);
  } else if (kind === "intelligence") {
    row = buildIntelligenceRow(item);
  } else if (kind === "product") {
    row = buildProductRow(item);
  } else if (kind === "engagement") {
    row = rowFromPresentation(
      {
        id: item.id,
        kind: "engagement",
        timestamp: item.timestamp,
        href: item.href ?? null,
      },
      presentationContextFromEngagement(item, engById),
    );
  } else if (kind === "case") {
    row = buildCaseRow(item);
  } else {
    row = buildOpportunityRow(item);
  }

  const engId = engagementIdFromHref(row.href);
  if (engId) row.dedupeKey = `engagement:${engId}`;

  if (!row.summary && !row.title) return null;
  return row;
}

function legacyTimelineToRow(
  entry: Record<string, unknown>,
  engById: Map<string, ProviderEngagementSummary>,
): ProviderActivityPreviewRow | null {
  const at = String(entry.at || entry.created_at || "").trim();
  if (!at) return null;

  const kind = String(entry.kind || "");
  const rawType = legacyRawType(String(entry.activity_type || ""));
  if (AUDIT_LEGACY_TYPES.has(rawType)) return null;

  let previewKind: ProviderActivityPreviewKind | null = null;
  if (kind === "opportunity_activity") {
    previewKind = "opportunity";
  } else if (rawType === "note" || kind === "contact_note") {
    previewKind = "note";
  } else if (
    rawType === "clinical_discovery_updated" ||
    rawType === "clinical_discovery_insight_from_case" ||
    rawType === "provider_intelligence_promoted" ||
    entry.category === "discovery"
  ) {
    previewKind = "intelligence";
  } else if (
    rawType.startsWith("pre_call_plan") ||
    rawType === "engagement_created" ||
    rawType === "engagement_updated" ||
    rawType === "engagement_completed"
  ) {
    previewKind = "engagement";
  } else if (kind === "case_activity") {
    previewKind = rawType === "note" ? "note" : "case";
  }

  if (!previewKind) return null;

  const body = String(entry.body || entry.question_label || "").trim();
  const titleRaw = String(entry.title || "").trim();
  const meta = entry.meta ? String(entry.meta) : null;
  const href = entry.href ? String(entry.href) : null;

  const rowId = `${kind}-${String(entry.id || at)}`;

  if (previewKind === "note") {
    return rowFromPresentation(
      {
        id: rowId,
        kind: "note",
        timestamp: at,
        href,
      },
      { eventType: "NOTE_ADDED", kind: "note", rawSummary: body || titleRaw },
    );
  }

  if (previewKind === "intelligence") {
    const q = String(entry.question_label || "").trim();
    return rowFromPresentation(
      {
        id: rowId,
        kind: "intelligence",
        timestamp: at,
        href,
      },
      {
        eventType: "PROVIDER_INTELLIGENCE_UPDATED",
        kind: "intelligence",
        questionLabel: q || null,
        rawSummary: body || titleRaw,
      },
    );
  }

  if (previewKind === "engagement") {
    const engId = engagementIdFromHref(href);
    const eng = engId ? engById.get(engId) : undefined;
    const fakeItem: UnifiedActivityFeedItem = {
      id: String(entry.id || at),
      category: "workflow",
      title: titleRaw,
      summary: body,
      timestamp: at,
      userLabel: "",
      href,
      eventType: rawType === "engagement_created" ? "ENGAGEMENT_CREATED" : rawType.toUpperCase(),
      metadata: {
        engagement_id: engId,
        engagement_type: eng?.engagement_type,
        organization_name: eng?.organization_name,
      },
    };
    return rowFromPresentation(
      {
        id: rowId,
        kind: "engagement",
        timestamp: at,
        href,
        dedupeKey: engId ? `engagement:${engId}` : undefined,
      },
      presentationContextFromEngagement(fakeItem, engById),
    );
  }

  if (previewKind === "opportunity") {
    return rowFromPresentation(
      {
        id: rowId,
        kind: "opportunity",
        timestamp: at,
        href,
      },
      {
        eventType: "OPPORTUNITY_STAGE_CHANGED",
        kind: "opportunity",
        initiativeName: meta || "Evaluation",
        rawSummary: body || titleRaw,
      },
    );
  }

  const caseNum = meta?.replace(/^case\s*/i, "") || null;
  return rowFromPresentation(
    {
      id: rowId,
      kind: "case",
      timestamp: at,
      href,
      dedupeKey: meta ? `case:${meta}` : undefined,
    },
    {
      eventType: rawType === "case_created" ? "CASE_CREATED" : "CASE_STATUS_CHANGED",
      kind: "case",
      caseNumber: caseNum,
      rawSummary: body || titleRaw,
    },
  );
}

function engagementMilestoneRow(e: ProviderEngagementSummary): ProviderActivityPreviewRow | null {
  const at = String(e.updated_at || e.scheduled_at || e.engagement_date || "").trim();
  if (!at) return null;

  const status = e.status.toLowerCase();
  const eventType =
    status === "completed"
      ? "ENGAGEMENT_COMPLETED"
      : isUpcomingEngagementStatus(e.status)
        ? "ENGAGEMENT_CREATED"
        : "ENGAGEMENT_UPDATED";

  const ts =
    e.scheduled_at ||
    (e.engagement_date ? `${e.engagement_date}T12:00:00` : null) ||
    e.updated_at ||
    at;

  const href =
    e.is_legacy_draft && e.legacy_new_engagement_href
      ? e.legacy_new_engagement_href
      : `/portal/sales/engagements/${encodeURIComponent(e.id)}`;

  const fakeItem: UnifiedActivityFeedItem = {
    id: e.id,
    category: "workflow",
    title: e.title || "",
    summary: "",
    timestamp: String(ts),
    userLabel: "",
    href,
    eventType,
    metadata: {
      engagement_id: e.id,
      engagement_type: e.engagement_type,
      organization_name: e.organization_name,
      status: e.status,
    },
  };

  return rowFromPresentation(
    {
      id: `eng-milestone-${e.id}`,
      kind: "engagement",
      timestamp: String(ts),
      href,
      dedupeKey: `engagement:${e.id}`,
    },
    {
      ...presentationContextFromEngagement(fakeItem, new Map([[e.id, e]]), eventType),
      productLine: e.opportunity_label?.trim() || null,
      caseNumber: e.case_number || null,
    },
  );
}

function sortByTime(rows: ProviderActivityPreviewRow[]): ProviderActivityPreviewRow[] {
  return [...rows].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

function dedupeRows(rows: ProviderActivityPreviewRow[]): ProviderActivityPreviewRow[] {
  const seen = new Set<string>();
  const out: ProviderActivityPreviewRow[] = [];
  for (const row of sortByTime(rows)) {
    const key = row.dedupeKey || row.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function buildProviderActivityPreviewRows(params: {
  feedItems: UnifiedActivityFeedItem[];
  timeline: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
  limit?: number;
}): ProviderActivityPreviewRow[] {
  const limit = params.limit ?? PREVIEW_LIMIT;
  const engById = engagementMap(params.engagements);
  const rows: ProviderActivityPreviewRow[] = [];

  for (const item of params.feedItems) {
    const row = unifiedItemToRow(item, engById);
    if (row) rows.push(row);
  }

  if (rows.length === 0) {
    for (const entry of params.timeline) {
      const row = legacyTimelineToRow(entry, engById);
      if (row) rows.push(row);
    }
  }

  for (const eng of params.engagements || []) {
    const row = engagementMilestoneRow(eng);
    if (row) rows.push(row);
  }

  return dedupeRows(rows).slice(0, limit);
}

export { OVERVIEW_ACTIVITY_PREVIEW_EMPTY as PROVIDER_ACTIVITY_PREVIEW_EMPTY_COPY } from "@/lib/surgical-sales/providerOverviewEarlyDiscoveryVocabulary";
