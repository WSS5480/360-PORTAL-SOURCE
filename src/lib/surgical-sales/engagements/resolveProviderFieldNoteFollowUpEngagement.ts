import type { SupabaseClient } from "@supabase/supabase-js";
import { insertEngagement } from "@/lib/surgical-sales/engagements/createEngagement";
import { PROVIDER_DEBRIEF_ENGAGEMENT_TYPE } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";

const FIELD_NOTE_FOLLOW_UP_TYPES = [
  "intro_call",
  "follow_up",
  "reactivation",
  "office_visit_360",
  PROVIDER_DEBRIEF_ENGAGEMENT_TYPE,
] as const;

const ACTIVE_DEBRIEF_STATUSES = new Set(["planned", "in_progress", "active", "scheduled", "confirmed"]);

async function loadRepEngagementById(
  supabase: SupabaseClient,
  input: { engagementId: string; providerId: string; actorUserId: string },
): Promise<string | null> {
  const { data } = await supabase
    .from("surgical_sales_engagements")
    .select("id")
    .eq("id", input.engagementId)
    .eq("provider_id", input.providerId)
    .is("archived_at", null)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

async function loadLatestRepEngagement(
  supabase: SupabaseClient,
  input: {
    providerId: string;
    actorUserId: string;
    engagementTypes?: readonly string[];
    excludeCompleted?: boolean;
  },
): Promise<string | null> {
  let query = supabase
    .from("surgical_sales_engagements")
    .select("id, status, engagement_type, updated_at")
    .eq("provider_id", input.providerId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(12);

  if (input.engagementTypes?.length) {
    query = query.in("engagement_type", [...input.engagementTypes]);
  }

  const { data, error } = await query;
  if (error || !data?.length) return null;

  for (const row of data) {
    if (input.excludeCompleted) {
      const status = String(row.status ?? "").trim().toLowerCase();
      if (status === "completed" || status === "cancelled") continue;
    }
    return String(row.id);
  }

  return String(data[0]!.id);
}

/**
 * Best engagement for persisting follow-up tasks from a provider field note.
 */
export async function resolveProviderFieldNoteFollowUpEngagementId(
  supabase: SupabaseClient,
  input: {
    providerId: string;
    actorUserId: string;
    preferredEngagementId?: string | null;
  },
): Promise<string | null> {
  const providerId = String(input.providerId ?? "").trim();
  const actorUserId = String(input.actorUserId ?? "").trim();
  if (!providerId || !actorUserId) return null;

  const preferred = String(input.preferredEngagementId ?? "").trim();
  if (preferred) {
    const resolved = await loadRepEngagementById(supabase, {
      engagementId: preferred,
      providerId,
      actorUserId,
    });
    if (resolved) return resolved;
  }

  const activeDebrief = await loadLatestRepEngagement(supabase, {
    providerId,
    actorUserId,
    engagementTypes: [PROVIDER_DEBRIEF_ENGAGEMENT_TYPE],
    excludeCompleted: true,
  });
  if (activeDebrief) {
    const { data } = await supabase
      .from("surgical_sales_engagements")
      .select("status")
      .eq("id", activeDebrief)
      .maybeSingle();
    const status = String(data?.status ?? "").trim().toLowerCase();
    if (ACTIVE_DEBRIEF_STATUSES.has(status) || status === "in_progress") {
      return activeDebrief;
    }
  }

  const latestDebrief = await loadLatestRepEngagement(supabase, {
    providerId,
    actorUserId,
    engagementTypes: [PROVIDER_DEBRIEF_ENGAGEMENT_TYPE],
  });
  if (latestDebrief) return latestDebrief;

  const touchEngagement = await loadLatestRepEngagement(supabase, {
    providerId,
    actorUserId,
    engagementTypes: FIELD_NOTE_FOLLOW_UP_TYPES,
    excludeCompleted: true,
  });
  if (touchEngagement) return touchEngagement;

  return loadLatestRepEngagement(supabase, {
    providerId,
    actorUserId,
  });
}

/**
 * Creates a lightweight follow-up engagement when the rep has none for this provider.
 */
export async function ensureProviderFieldNoteFollowUpEngagement(
  supabase: SupabaseClient,
  input: {
    providerId: string;
    actorUserId: string;
    organizationId?: string | null;
  },
): Promise<string | null> {
  const providerId = String(input.providerId ?? "").trim();
  const actorUserId = String(input.actorUserId ?? "").trim();
  if (!providerId || !actorUserId) return null;

  const created = await insertEngagement({
    engagement_type: "follow_up",
    status: "planned",
    title: "Field follow-up",
    provider_id: providerId,
    organization_id: input.organizationId ?? null,
    sales_rep_id: actorUserId,
    notes: "Created from provider field note follow-up.",
  });

  return created.ok ? created.engagementId : null;
}
