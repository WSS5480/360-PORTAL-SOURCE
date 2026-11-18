import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  activityEventIdFromLegacy,
  buildActivityEvent,
  type ActivityEvent,
  type ActivityEventSource,
  type BuildActivityEventInput,
} from "@/lib/activity/activityEvent";

export type PersistActivityEventInput = BuildActivityEventInput & {
  legacy?: {
    source: ActivityEventSource;
    activityId?: string;
  };
};

export type PersistActivityEventResult =
  | { ok: true; event: ActivityEvent }
  | { ok: false; message: string; event: ActivityEvent };

function isMissingUnifiedActivityTable(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("unified_activity_events") && (m.includes("does not exist") || m.includes("schema cache"));
}

/**
 * Persists a canonical ActivityEvent to `unified_activity_events`.
 * Does not write legacy tables — use dual-write helpers at call sites.
 */
export async function persistActivityEvent(input: PersistActivityEventInput): Promise<PersistActivityEventResult> {
  const event = buildActivityEvent({
    ...input,
    id:
      input.id ??
      (input.legacy?.activityId
        ? activityEventIdFromLegacy(input.legacy.source, input.legacy.activityId)
        : undefined),
    source: input.source ?? "unified_emit",
  });

  const legacyId = input.legacy?.activityId;
  const row = {
    type: event.type,
    title: event.title,
    summary: event.summary,
    entity_type: event.entityType,
    entity_id: event.entityId,
    related_entities: event.relatedEntities,
    created_by_user_id: event.createdBy.userId,
    created_at: event.createdAt,
    metadata: {
      ...event.metadata,
      ...(input.legacy?.source
        ? { legacy_source: input.legacy.source, legacy_activity_id: legacyId ?? null }
        : {}),
    },
    workflow_stage: event.workflowStage,
    tags: event.tags,
    ai_generated: event.aiGenerated,
    source: event.source,
    legacy_source: input.legacy?.source ?? null,
    legacy_activity_id: legacyId ? parseLegacyUuid(legacyId) : null,
  };

  const { data, error } = await supabaseAdmin
    .from("unified_activity_events")
    .insert(row)
    .select("id, created_at")
    .single();

  if (error) {
    if (isMissingUnifiedActivityTable(error.message)) {
      console.warn("[activity] unified_activity_events table not available:", error.message);
      return { ok: true, event };
    }
    return { ok: false, message: error.message, event };
  }

  const persisted: ActivityEvent = {
    ...event,
    id: data?.id ? String(data.id) : event.id,
    createdAt: data?.created_at ? String(data.created_at) : event.createdAt,
  };

  return { ok: true, event: persisted };
}

function parseLegacyUuid(raw: string): string | null {
  const id = String(raw).trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null;
}
