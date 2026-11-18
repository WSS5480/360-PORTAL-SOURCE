import { supabaseAdmin } from "@/lib/supabase/admin";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import type { ActivityEntityType } from "@/lib/activity/activityEvent";
import { parseActivityEventId } from "@/lib/activity/activityEvent";
import { legacyFeedIdToActivityId } from "@/lib/activity/activityFeedPresentation";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DELETABLE_PROVIDER_ACTIVITY_TYPES = new Set(["note_added", "ai_note_capture", "note"]);
const DELETABLE_UNIFIED_TYPES = new Set(["NOTE_ADDED", "AI_INTELLIGENCE_CAPTURED"]);

export type DeleteProviderActivityItemResult =
  | { ok: true }
  | { ok: false; message: string; status?: number };

function relatedEntitiesIncludeProvider(
  related: unknown,
  providerId: string,
): boolean {
  if (!Array.isArray(related)) return false;
  return related.some(
    (item) =>
      item &&
      typeof item === "object" &&
      String((item as { entityType?: string }).entityType ?? "") === "provider" &&
      String((item as { entityId?: string }).entityId ?? "") === providerId,
  );
}

function resolveLegacyActivityId(eventId: string): string | null {
  const trimmed = String(eventId ?? "").trim();
  if (!trimmed) return null;
  if (UUID_RE.test(trimmed)) return trimmed;
  const parsed = parseActivityEventId(trimmed);
  if (parsed?.legacyId && UUID_RE.test(parsed.legacyId)) return parsed.legacyId;
  return legacyFeedIdToActivityId(trimmed);
}

async function assertProviderAccess(providerId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (error || !data || !isProviderRole(String(data.role_type ?? ""))) {
    return { ok: false as const, message: "Not found", status: 404 };
  }
  if (!(await repCanAccessContact(userId, data as never))) {
    return { ok: false as const, message: "Not found", status: 404 };
  }
  return { ok: true as const, contact: data as Record<string, unknown> };
}

async function deleteLegacyProviderActivity(providerId: string, activityId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_provider_activities")
    .select("id, activity_type")
    .eq("id", activityId)
    .eq("provider_id", providerId)
    .maybeSingle();
  if (error || !data) return false;

  const activityType = String(data.activity_type ?? "").trim().toLowerCase();
  if (!DELETABLE_PROVIDER_ACTIVITY_TYPES.has(activityType)) {
    throw new Error("Only notes can be deleted from activity.");
  }

  const { error: deleteErr } = await supabaseAdmin
    .from("surgical_sales_provider_activities")
    .delete()
    .eq("id", activityId)
    .eq("provider_id", providerId);
  if (deleteErr) throw new Error(deleteErr.message);

  await supabaseAdmin
    .from("unified_activity_events")
    .delete()
    .eq("legacy_activity_id", activityId);

  return true;
}

export async function deleteProviderActivityItem(input: {
  providerId: string;
  eventId: string;
  userId: string;
  entityType?: ActivityEntityType;
}): Promise<DeleteProviderActivityItemResult> {
  const providerId = String(input.providerId ?? "").trim();
  const eventId = String(input.eventId ?? "").trim();
  if (!providerId || !eventId) {
    return { ok: false, message: "Activity id required.", status: 400 };
  }

  const access = await assertProviderAccess(providerId, input.userId);
  if (!access.ok) return access;

  const { data: unified, error: unifiedErr } = await supabaseAdmin
    .from("unified_activity_events")
    .select("id, type, entity_type, entity_id, related_entities, legacy_activity_id")
    .eq("id", eventId)
    .maybeSingle();

  if (unifiedErr) {
    return { ok: false, message: unifiedErr.message, status: 500 };
  }

  if (unified) {
    const entityType = String(unified.entity_type ?? "");
    const entityId = String(unified.entity_id ?? "");
    const belongsToProvider =
      (entityType === "provider" && entityId === providerId) ||
      relatedEntitiesIncludeProvider(unified.related_entities, providerId);
    if (!belongsToProvider) {
      return { ok: false, message: "Not found", status: 404 };
    }

    const unifiedType = String(unified.type ?? "").trim();
    if (!DELETABLE_UNIFIED_TYPES.has(unifiedType)) {
      return { ok: false, message: "Only notes can be deleted from activity.", status: 403 };
    }

    const legacyId = unified.legacy_activity_id ? String(unified.legacy_activity_id) : null;
    try {
      if (legacyId) {
        await deleteLegacyProviderActivity(providerId, legacyId);
      }
      await supabaseAdmin.from("unified_activity_events").delete().eq("id", eventId);
      return { ok: true };
    } catch (error: unknown) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Delete failed",
        status: 400,
      };
    }
  }

  const legacyActivityId = resolveLegacyActivityId(eventId);
  if (!legacyActivityId) {
    return { ok: false, message: "Note not found", status: 404 };
  }

  try {
    const deleted = await deleteLegacyProviderActivity(providerId, legacyActivityId);
    if (!deleted) {
      return { ok: false, message: "Note not found", status: 404 };
    }
    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Delete failed",
      status: 400,
    };
  }
}
