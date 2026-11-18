import { formatSurgicalCaseActivityType } from "@/lib/surgical-sales/caseActivityLabels";

export type TeamActivityFeedKind = "case" | "note" | "document" | "billing" | "other";

export type TeamActivityFeedItem = {
  id: string;
  feed_kind: TeamActivityFeedKind;
  activity_type: string;
  summary: string;
  body: string | null;
  created_at: string;
  actor_user_id: string;
  actor_display_name: string;
  case_id: string | null;
  case_number: string | null;
  organization_id: string | null;
  organization_name: string | null;
  metadata_json: Record<string, unknown> | null;
};

export type TeamActivityRepOption = {
  user_id: string;
  display_name: string;
};

export type TeamActivityDayGroup = {
  key: string;
  label: string;
  items: TeamActivityFeedItem[];
};

type CaseActRow = {
  id: string;
  case_id: string;
  activity_type: string;
  body: string | null;
  metadata_json: unknown;
  created_at: string;
  user_id: string;
};

type CaseContext = {
  case_number: string | null;
  organization_id: string | null;
  organization_name: string | null;
};

type OrgNoteRow = {
  id: string;
  body: string | null;
  created_at: string;
  created_by_user_id: string;
  entity_id: string;
};

const CASE_UPDATE_COLLAPSE_MS = 30 * 60 * 1000;

function feedKindForCaseActivity(type: string): TeamActivityFeedKind {
  const t = String(type || "").toLowerCase();
  if (t === "note") return "note";
  if (t === "document_uploaded" || t === "document_deleted") return "document";
  if (t === "billing_update") return "billing";
  if (t === "case_created" || t === "case_updated" || t === "status_change" || t === "product_updated") return "case";
  return "other";
}

function asMeta(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return null;
}

function startOfLocalDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function teamActivityDayLabel(createdAt: string, now: Date): string {
  const t = new Date(createdAt);
  if (Number.isNaN(t.getTime())) return "Earlier";
  const day = startOfLocalDayMs(t);
  const today = startOfLocalDayMs(now);
  const yesterday = today - 86_400_000;
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  if (now.getTime() - t.getTime() < 7 * 86_400_000 && now.getTime() - t.getTime() >= 0) {
    return t.toLocaleDateString(undefined, { weekday: "long" });
  }
  return t.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function groupTeamActivityByDay(items: TeamActivityFeedItem[], now = new Date()): TeamActivityDayGroup[] {
  const groups: TeamActivityDayGroup[] = [];
  const byKey = new Map<string, TeamActivityDayGroup>();
  for (const item of items) {
    const t = new Date(item.created_at);
    const key = Number.isNaN(t.getTime()) ? "unknown" : localDayKey(t);
    const existing = byKey.get(key);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    const group: TeamActivityDayGroup = {
      key,
      label: key === "unknown" ? "Earlier" : teamActivityDayLabel(item.created_at, now),
      items: [item],
    };
    byKey.set(key, group);
    groups.push(group);
  }
  return groups;
}

function canCollapseCaseUpdate(newer: TeamActivityFeedItem, older: TeamActivityFeedItem): boolean {
  if (newer.activity_type !== "case_updated" || older.activity_type !== "case_updated") return false;
  if (newer.actor_user_id !== older.actor_user_id) return false;
  if (!newer.case_id || newer.case_id !== older.case_id) return false;
  const t0 = new Date(newer.created_at).getTime();
  const t1 = new Date(older.created_at).getTime();
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return false;
  return Math.abs(t0 - t1) <= CASE_UPDATE_COLLAPSE_MS;
}

export function collapseNoisyCaseUpdates(items: TeamActivityFeedItem[]): TeamActivityFeedItem[] {
  const newestFirst = [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const out: TeamActivityFeedItem[] = [];
  for (const item of newestFirst) {
    const last = out[out.length - 1];
    if (last && canCollapseCaseUpdate(last, item)) {
      const n = Number(last.metadata_json?.collapse_count || 1) + 1;
      last.metadata_json = { ...(last.metadata_json || {}), collapse_count: n };
      last.summary = n > 1 ? `Case updated · ${n} times` : last.summary;
      continue;
    }
    out.push({
      ...item,
      metadata_json: item.metadata_json ? { ...item.metadata_json } : null,
    });
  }
  return out;
}

export function buildTeamActivityFeed(params: {
  caseActivities: CaseActRow[];
  caseById: Map<string, CaseContext>;
  organizationNotes: OrgNoteRow[];
  organizationNameById: Map<string, string>;
  profileBy: Map<string, string>;
}): TeamActivityFeedItem[] {
  const items: TeamActivityFeedItem[] = [];

  for (const row of params.caseActivities) {
    const uid = String(row.user_id || "");
    const caseId = String(row.case_id || "");
    const ctx = params.caseById.get(caseId);
    items.push({
      id: `ca-${row.id}`,
      feed_kind: feedKindForCaseActivity(row.activity_type),
      activity_type: row.activity_type,
      summary: formatSurgicalCaseActivityType(row.activity_type),
      body: row.body ? String(row.body) : null,
      created_at: row.created_at,
      actor_user_id: uid,
      actor_display_name: params.profileBy.get(uid) || (uid ? uid.slice(0, 8) : "—"),
      case_id: caseId || null,
      case_number: ctx?.case_number ?? null,
      organization_id: ctx?.organization_id ?? null,
      organization_name: ctx?.organization_name ?? null,
      metadata_json: asMeta(row.metadata_json),
    });
  }

  for (const note of params.organizationNotes) {
    const body = String(note.body || "").trim();
    if (!body) continue;
    const uid = String(note.created_by_user_id || "");
    const orgId = String(note.entity_id || "");
    items.push({
      id: `org-note-${note.id}`,
      feed_kind: "note",
      activity_type: "note",
      summary: "Organization note",
      body,
      created_at: note.created_at,
      actor_user_id: uid,
      actor_display_name: params.profileBy.get(uid) || (uid ? uid.slice(0, 8) : "—"),
      case_id: null,
      case_number: null,
      organization_id: orgId || null,
      organization_name: params.organizationNameById.get(orgId) ?? null,
      metadata_json: { source: "organization", note_id: note.id },
    });
  }

  return collapseNoisyCaseUpdates(items);
}

export type TeamActivityWhenFilter = "" | "today" | "yesterday" | "week";

export type TeamActivityFeedFilters = {
  kind?: TeamActivityFeedKind | "";
  actorUserId?: string;
  organizationId?: string;
  when?: TeamActivityWhenFilter;
  query?: string;
  now?: Date;
};

export const TEAM_ACTIVITY_KINDS = ["case", "note", "document", "billing", "other"] as const;
export const TEAM_ACTIVITY_WHENS = ["today", "yesterday", "week"] as const;

export function parseTeamActivityKindFilter(raw: string | null | undefined): TeamActivityFeedKind | "" {
  const v = String(raw || "").trim().toLowerCase();
  return (TEAM_ACTIVITY_KINDS as readonly string[]).includes(v) ? (v as TeamActivityFeedKind) : "";
}

export function parseTeamActivityWhenFilter(raw: string | null | undefined): TeamActivityWhenFilter {
  const v = String(raw || "").trim().toLowerCase();
  return (TEAM_ACTIVITY_WHENS as readonly string[]).includes(v) ? (v as TeamActivityWhenFilter) : "";
}

function itemMatchesWhen(item: TeamActivityFeedItem, when: TeamActivityWhenFilter, now: Date): boolean {
  if (!when) return true;
  const t = new Date(item.created_at);
  if (Number.isNaN(t.getTime())) return false;
  const day = startOfLocalDayMs(t);
  const today = startOfLocalDayMs(now);
  if (when === "today") return day === today;
  if (when === "yesterday") return day === today - 86_400_000;
  return t.getTime() >= today - 6 * 86_400_000;
}

function itemMatchesQuery(item: TeamActivityFeedItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    item.summary,
    item.body,
    item.actor_display_name,
    item.organization_name,
    item.case_number,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function teamActivityOrganizationOptions(items: TeamActivityFeedItem[]): Array<{ id: string; name: string }> {
  const byId = new Map<string, string>();
  for (const item of items) {
    const id = String(item.organization_id || "").trim();
    if (!id || byId.has(id)) continue;
    byId.set(id, String(item.organization_name || "").trim() || "Organization");
  }
  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function filterTeamActivityFeed(
  items: TeamActivityFeedItem[],
  filters: TeamActivityFeedFilters,
): TeamActivityFeedItem[] {
  const kind = String(filters.kind || "").trim() as TeamActivityFeedKind | "";
  const actor = String(filters.actorUserId || "").trim();
  const org = String(filters.organizationId || "").trim();
  const when = parseTeamActivityWhenFilter(filters.when);
  const query = String(filters.query || "");
  const now = filters.now ?? new Date();
  return items.filter((item) => {
    if (kind && item.feed_kind !== kind) return false;
    if (actor && item.actor_user_id !== actor) return false;
    if (org && item.organization_id !== org) return false;
    if (!itemMatchesWhen(item, when, now)) return false;
    if (!itemMatchesQuery(item, query)) return false;
    return true;
  });
}
