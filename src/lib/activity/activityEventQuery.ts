import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ActivityEntityType, ActivityEvent, ActivityRelatedEntity } from "@/lib/activity/activityEvent";
import type { ActivityEventType } from "@/lib/activity/activityEventTypes";
import { isActivityEventType } from "@/lib/activity/activityEventTypes";

export type UnifiedActivityEventRow = {
  id: string;
  type: string;
  title: string;
  summary: string;
  entity_type: string;
  entity_id: string;
  related_entities: unknown;
  created_by_user_id: string | null;
  created_at: string;
  metadata: unknown;
  workflow_stage: string | null;
  tags: string[] | null;
  ai_generated: boolean;
  source: string;
  legacy_source: string | null;
  legacy_activity_id: string | null;
};

function parseRelatedEntities(raw: unknown): ActivityRelatedEntity[] {
  if (!Array.isArray(raw)) return [];
  const out: ActivityRelatedEntity[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const entityType = String((item as { entityType?: string }).entityType || "").trim();
    const entityId = String((item as { entityId?: string }).entityId || "").trim();
    if (!entityType || !entityId) continue;
    out.push({
      entityType: entityType as ActivityEntityType,
      entityId,
      label: (item as { label?: string }).label ?? null,
      role: (item as { role?: string }).role ?? null,
    });
  }
  return out;
}

export function rowToActivityEvent(
  row: UnifiedActivityEventRow,
  actorDisplayName?: string | null,
): ActivityEvent {
  const typeRaw = String(row.type || "").trim();
  const type: ActivityEventType = isActivityEventType(typeRaw) ? typeRaw : "NOTE_ADDED";
  return {
    id: String(row.id),
    type,
    title: String(row.title || "").trim() || type,
    summary: String(row.summary || "").trim(),
    entityType: row.entity_type as ActivityEntityType,
    entityId: String(row.entity_id),
    relatedEntities: parseRelatedEntities(row.related_entities),
    createdBy: {
      userId: row.created_by_user_id ? String(row.created_by_user_id) : null,
      displayName: actorDisplayName ?? null,
    },
    createdAt: String(row.created_at),
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    workflowStage: row.workflow_stage ? String(row.workflow_stage) : null,
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean).map(String) : [],
    aiGenerated: Boolean(row.ai_generated),
    source: (row.source as ActivityEvent["source"]) || "unified_emit",
  };
}

function relatedEntitiesContains(
  related: ActivityRelatedEntity[],
  entityType: ActivityEntityType,
  entityId: string,
): boolean {
  return related.some((r) => r.entityType === entityType && r.entityId === entityId);
}

export async function loadProfileNames(userIds: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (!uniq.length) return map;
  const { data } = await supabaseAdmin.from("user_profiles").select("user_id, full_name, email").in("user_id", uniq);
  for (const row of data || []) {
    const id = String((row as { user_id: string }).user_id);
    const name = String((row as { full_name?: string | null }).full_name ?? "").trim();
    const email = String((row as { email?: string | null }).email ?? "").trim();
    map.set(id, name || email || id.slice(0, 8));
  }
  return map;
}

export async function listActivityEventsForEntity(params: {
  entityType: ActivityEntityType;
  entityId: string;
  limit?: number;
}): Promise<{ events: ActivityEvent[]; tableAvailable: boolean }> {
  const limit = params.limit ?? 200;
  const select =
    "id, type, title, summary, entity_type, entity_id, related_entities, created_by_user_id, created_at, metadata, workflow_stage, tags, ai_generated, source, legacy_source, legacy_activity_id";

  const { data: anchored, error: anchoredErr } = await supabaseAdmin
    .from("unified_activity_events")
    .select(select)
    .eq("entity_type", params.entityType)
    .eq("entity_id", params.entityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (anchoredErr) {
    const msg = anchoredErr.message.toLowerCase();
    if (msg.includes("unified_activity_events") && (msg.includes("does not exist") || msg.includes("schema cache"))) {
      return { events: [], tableAvailable: false };
    }
    throw new Error(anchoredErr.message);
  }

  let related: UnifiedActivityEventRow[] = [];
  const { data: relatedRaw, error: relatedErr } = await supabaseAdmin
    .from("unified_activity_events")
    .select(select)
    .neq("entity_id", params.entityId)
    .order("created_at", { ascending: false })
    .limit(limit * 2);

  if (!relatedErr && relatedRaw) {
    related = (relatedRaw as UnifiedActivityEventRow[]).filter((row) =>
      relatedEntitiesContains(parseRelatedEntities(row.related_entities), params.entityType, params.entityId),
    );
  }

  const byId = new Map<string, UnifiedActivityEventRow>();
  for (const row of [...((anchored || []) as UnifiedActivityEventRow[]), ...related]) {
    byId.set(String(row.id), row);
  }
  const merged = [...byId.values()].sort(
    (a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime(),
  );

  const userIds = merged.map((r) => String(r.created_by_user_id || "")).filter(Boolean);
  const profileBy = await loadProfileNames(userIds);

  const events = merged.map((row) => {
    const uid = row.created_by_user_id ? String(row.created_by_user_id) : "";
    return rowToActivityEvent(row, uid ? profileBy.get(uid) : null);
  });

  return { events, tableAvailable: true };
}
