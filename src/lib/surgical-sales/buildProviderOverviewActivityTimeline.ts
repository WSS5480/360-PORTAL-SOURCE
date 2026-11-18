import {
  buildProviderActivityPreviewRows,
  type ProviderActivityPreviewKind,
  type ProviderActivityPreviewRow,
} from "@/lib/surgical-sales/buildProviderActivityPreviewRows";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

export const OVERVIEW_ACTIVITY_TIMELINE_LIMIT = 12;
/** Compact provider overview preview — last few items only. */
export const OVERVIEW_ACTIVITY_PREVIEW_LIMIT = 3;
export const OVERVIEW_ACTIVITY_TIMELINE_EMPTY = "No field activity logged yet.";

export type ProviderOverviewActivityTimelineEntry = {
  id: string;
  timestamp: string;
  timeLabel: string;
  line: string;
  href: string | null;
  kind: ProviderActivityPreviewKind | "lifecycle";
  dedupeKey?: string;
};

export type ProviderOverviewActivityTimelineGroup = {
  dateLabel: string;
  entries: ProviderOverviewActivityTimelineEntry[];
};

export type ProviderOverviewActivityTimelineView = {
  groups: ProviderOverviewActivityTimelineGroup[];
  /** Flat chronological list (newest first) for command center display. */
  entries: ProviderOverviewActivityTimelineEntry[];
  totalCount: number;
};

function legacyRawType(raw: string | undefined): string {
  return String(raw || "")
    .trim()
    .toLowerCase();
}

function normalizeEventType(raw: string | undefined): string {
  return String(raw || "")
    .trim()
    .replace(/-/g, "_")
    .toUpperCase();
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function isAuditPhrasing(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return (
    /\bengagement created\b/i.test(t) ||
    /\bactivity recorded\b/i.test(t) ||
    /\bmarked completed\b/i.test(t) ||
    /\bintelligence captured\b/i.test(t) ||
    /\bprovider intelligence\b/i.test(t) ||
    /^[a-z][a-z0-9_]*$/.test(t) && t.includes("_")
  );
}

function normalizeLineKey(line: string): string {
  return line.trim().toLowerCase().replace(/\s+/g, " ");
}

function dayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function formatActivityTimelineDateLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const todayStart = dayStart(now);
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const entryStart = dayStart(d);
  if (entryStart >= todayStart) return "Today";
  if (entryStart >= yesterdayStart) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatActivityTimelineTimeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function conciseActivityLineFromPreviewRow(row: ProviderActivityPreviewRow): string | null {
  const badge = row.activityTypeLabel;

  if (row.kind === "engagement") {
    const name = row.title?.trim() && row.title.trim() !== "Engagement" ? row.title.trim() : "Engagement";
    if (badge === "Observation Requested") return "Observation requested";
    if (badge === "Follow-Up Planned") return "Follow-up scheduled";
    if (/scheduled|requested|planned|pre-call planned|product discussed|evaluation started/i.test(badge)) {
      return `${name} scheduled`;
    }
    if (badge === "Engagement Started") return `${name} started`;
    if (/completed|meeting prepared/i.test(badge)) return `${name} completed`;
    if (badge === "Case Opened") return `${name} opened a case`;
    return `${name} updated`;
  }

  if (row.kind === "note") {
    const text = (row.summary || row.title || "").trim();
    if (text && text.length <= 72 && !isAuditPhrasing(text)) return truncate(text, 72);
    return "Field note added";
  }

  if (row.kind === "intelligence") {
    const q = row.title?.trim();
    if (q && q !== "Provider intelligence" && !isAuditPhrasing(q)) {
      return truncate(q, 72);
    }
    const summary = row.summary?.trim();
    if (summary && !isAuditPhrasing(summary) && !/intelligence|captured insight/i.test(summary)) {
      return truncate(summary.replace(/\.$/, ""), 72);
    }
    return null;
  }

  if (row.kind === "case") {
    const caseRef = row.title?.replace(/^Case\s+/i, "").trim();
    if (badge === "Case Opened") return caseRef ? `Case ${caseRef} opened` : "Case opened";
    if (badge === "Case Supported") return caseRef ? `Case ${caseRef} supported` : "Case supported";
    return caseRef ? `Case ${caseRef} updated` : "Case updated";
  }

  if (row.kind === "opportunity") {
    if (/added to opportunities/i.test(badge)) return "Added to evaluation";
    if (/stage changed/i.test(badge)) return "Evaluation stage updated";
    if (/won/i.test(badge)) return "Evaluation won";
    if (/lost/i.test(badge)) return "Evaluation closed";
    if (/evaluation started|evaluation active/i.test(badge)) return "Evaluation started";
    return "Evaluation updated";
  }

  if (row.kind === "product") {
    const product = row.relatedEntity?.split(" · ")[0]?.trim() || row.title?.trim();
    return product ? `${product} added` : "Product added";
  }

  return null;
}

function lifecycleEntriesFromTimeline(params: {
  timeline: Array<Record<string, unknown>>;
  contact?: Record<string, unknown> | null;
  organizationLinks?: Array<Record<string, unknown>>;
}): ProviderOverviewActivityTimelineEntry[] {
  const entries: ProviderOverviewActivityTimelineEntry[] = [];
  let hasProviderCreated = false;
  let hasHospitalAffiliation = false;

  for (const entry of params.timeline) {
    const at = String(entry.at || entry.created_at || "").trim();
    if (!at) continue;
    const rawType = legacyRawType(String(entry.activity_type || ""));
    const unifiedType = normalizeEventType(String(entry.eventType || entry.activity_type || ""));

    if (rawType === "provider_created" || unifiedType === "PROVIDER_CREATED") {
      hasProviderCreated = true;
      entries.push({
        id: `lifecycle-provider-created-${at}`,
        timestamp: at,
        timeLabel: formatActivityTimelineTimeLabel(at),
        line: "Provider created",
        href: null,
        kind: "lifecycle",
        dedupeKey: "lifecycle:provider_created",
      });
    }

    if (
      unifiedType === "ORGANIZATION_LINKED" ||
      rawType === "organization_linked" ||
      /hospital affiliation|organization linked/i.test(String(entry.title || entry.body || ""))
    ) {
      hasHospitalAffiliation = true;
      entries.push({
        id: `lifecycle-hospital-affiliation-${at}`,
        timestamp: at,
        timeLabel: formatActivityTimelineTimeLabel(at),
        line: "Hospital affiliation added",
        href: entry.href ? String(entry.href) : null,
        kind: "lifecycle",
        dedupeKey: "lifecycle:hospital_affiliation",
      });
    }
  }

  if (!hasProviderCreated) {
    const createdAt = String(params.contact?.created_at || "").trim();
    if (createdAt) {
      entries.push({
        id: `lifecycle-provider-created-${createdAt}`,
        timestamp: createdAt,
        timeLabel: formatActivityTimelineTimeLabel(createdAt),
        line: "Provider created",
        href: null,
        kind: "lifecycle",
        dedupeKey: "lifecycle:provider_created",
      });
    }
  }

  if (!hasHospitalAffiliation && params.organizationLinks?.length) {
    const primary =
      params.organizationLinks.find((l) => l.is_primary === true) ?? params.organizationLinks[0];
    const linkedAt = String(primary?.created_at || primary?.linked_at || "").trim();
    const orgId = String(primary?.account_id || primary?.organization_id || "").trim();
    if (linkedAt && orgId) {
      entries.push({
        id: `lifecycle-hospital-affiliation-${linkedAt}`,
        timestamp: linkedAt,
        timeLabel: formatActivityTimelineTimeLabel(linkedAt),
        line: "Hospital affiliation added",
        href: null,
        kind: "lifecycle",
        dedupeKey: "lifecycle:hospital_affiliation",
      });
    }
  }

  return entries;
}

function dedupeTimelineEntries(
  entries: ProviderOverviewActivityTimelineEntry[],
  now: Date,
): ProviderOverviewActivityTimelineEntry[] {
  const seenKeys = new Set<string>();
  const seenDayLine = new Set<string>();
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const out: ProviderOverviewActivityTimelineEntry[] = [];

  for (const entry of sorted) {
    const key = entry.dedupeKey || entry.id;
    if (seenKeys.has(key)) continue;

    const dayLabel = formatActivityTimelineDateLabel(entry.timestamp, now);
    const dayLine = `${dayLabel}::${normalizeLineKey(entry.line)}`;
    if (seenDayLine.has(dayLine)) continue;

    seenKeys.add(key);
    seenDayLine.add(dayLine);
    out.push(entry);
  }

  return out;
}

function groupTimelineEntries(
  entries: ProviderOverviewActivityTimelineEntry[],
  now: Date,
): ProviderOverviewActivityTimelineGroup[] {
  const groups: ProviderOverviewActivityTimelineGroup[] = [];
  const labelIndex = new Map<string, number>();

  for (const entry of entries) {
    const dateLabel = formatActivityTimelineDateLabel(entry.timestamp, now);
    if (!dateLabel) continue;
    const idx = labelIndex.get(dateLabel);
    if (idx === undefined) {
      labelIndex.set(dateLabel, groups.length);
      groups.push({ dateLabel, entries: [entry] });
    } else {
      groups[idx].entries.push(entry);
    }
  }

  return groups;
}

export function buildProviderOverviewActivityTimeline(params: {
  timeline?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
  contact?: Record<string, unknown> | null;
  organizationLinks?: Array<Record<string, unknown>>;
  limit?: number;
  now?: Date;
}): ProviderOverviewActivityTimelineView {
  const now = params.now ?? new Date();
  const limit = params.limit ?? OVERVIEW_ACTIVITY_TIMELINE_LIMIT;
  const timeline = params.timeline ?? [];

  const previewRows = buildProviderActivityPreviewRows({
    feedItems: [],
    timeline,
    engagements: params.engagements,
    limit: Math.max(limit, 20),
  });

  const previewEntries: ProviderOverviewActivityTimelineEntry[] = [];
  for (const row of previewRows) {
    const line = conciseActivityLineFromPreviewRow(row);
    if (!line) continue;
    previewEntries.push({
      id: row.id,
      timestamp: row.timestamp,
      timeLabel: formatActivityTimelineTimeLabel(row.timestamp),
      line,
      href: row.href,
      kind: row.kind,
      dedupeKey: row.dedupeKey,
    });
  }

  const lifecycleEntries = lifecycleEntriesFromTimeline({
    timeline,
    contact: params.contact,
    organizationLinks: params.organizationLinks,
  });

  const merged = dedupeTimelineEntries([...previewEntries, ...lifecycleEntries], now);
  const limited = merged.slice(0, limit);

  return {
    groups: groupTimelineEntries(limited, now),
    entries: limited,
    totalCount: limited.length,
  };
}
