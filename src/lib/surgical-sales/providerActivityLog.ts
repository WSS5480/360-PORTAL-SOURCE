import { dualWriteFromProviderActivityLog } from "@/lib/activity/providerActivityDualWrite";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const PROVIDER_ACTIVITY_TYPE_CLINICAL_DISCOVERY_UPDATED = "clinical_discovery_updated";

/** Must stay in sync with surgical_sales_provider_activities_type_check (migration 20260630). */
export const SURGICAL_PROVIDER_ACTIVITY_TYPES = [
  PROVIDER_ACTIVITY_TYPE_CLINICAL_DISCOVERY_UPDATED,
  "provider_updated",
  "provider_created",
  "provider_intelligence_promoted",
  "planning_section_completed",
  "pre_call_plan_created",
  "pre_call_plan_updated",
  "pre_call_plan_completed",
  "engagement_created",
  "engagement_updated",
  "engagement_completed",
  "engagement_converted_to_case",
  "engagement_prepared",
  "case_created_from_engagement",
  "ai_note_capture",
  "note_added",
  "outcome_update",
  "product_use_log",
] as const;

export type SurgicalProviderActivityType = (typeof SURGICAL_PROVIDER_ACTIVITY_TYPES)[number];

const SURGICAL_PROVIDER_ACTIVITY_TYPE_SET = new Set<string>(SURGICAL_PROVIDER_ACTIVITY_TYPES);

export function normalizeSurgicalProviderActivityType(raw: string): SurgicalProviderActivityType {
  const key = String(raw ?? "").trim().toLowerCase();
  if (SURGICAL_PROVIDER_ACTIVITY_TYPE_SET.has(key)) {
    return key as SurgicalProviderActivityType;
  }
  return "provider_updated";
}

export const PROVIDER_ACTIVITY_CATEGORY_DISCOVERY = "discovery" as const;

export type ProviderActivityCategory = typeof PROVIDER_ACTIVITY_CATEGORY_DISCOVERY | "general";

export async function logSurgicalProviderActivity(params: {
  providerId: string;
  userId: string;
  activityType: string;
  body: string;
  metadataJson?: Record<string, unknown>;
  sourceCaseId?: string | null;
}): Promise<{ ok: true; activityId?: string } | { ok: false; message: string }> {
  const meta: Record<string, unknown> = { ...(params.metadataJson ?? {}) };
  const activityType = normalizeSurgicalProviderActivityType(params.activityType);

  const { data, error } = await supabaseAdmin
    .from("surgical_sales_provider_activities")
    .insert({
      provider_id: params.providerId,
      user_id: params.userId,
      activity_type: activityType,
      body: params.body,
      metadata_json: meta,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  const activityId = data?.id ? String(data.id) : undefined;

  dualWriteFromProviderActivityLog({
    providerId: params.providerId,
    userId: params.userId,
    legacyType: activityType,
    body: params.body,
    legacyActivityId: activityId,
    metadataJson: meta,
    sourceCaseId: params.sourceCaseId,
  });

  return { ok: true, activityId };
}
