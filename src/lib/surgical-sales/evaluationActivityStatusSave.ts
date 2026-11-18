import { supabaseAdmin } from "@/lib/supabase/admin";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import {
  EVALUATION_ACTIVITY_STATUS_DB_KEY,
  type EvaluationActivityStatusChoice,
} from "@/lib/surgical-sales/evaluationActivityStatus";
import {
  isEvaluationEngagementType,
  resolveProviderEvaluationEngagementFromSummaries,
} from "@/lib/surgical-sales/missionBoardEvaluationEngagement";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { logSurgicalSalesCrmAudit } from "@/lib/surgical-sales/surgicalSalesCrmAudit";

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

function engagementStatusForActivityStatus(
  status: EvaluationActivityStatusChoice,
): string | null {
  switch (status) {
    case "planned":
      return "planned";
    case "active":
      return "in_progress";
    case "complete":
      return "completed";
    case "not_scheduled":
    default:
      return null;
  }
}

async function loadEvaluationEngagements(input: {
  providerId: string;
  userId: string;
}): Promise<ProviderEngagementSummary[]> {
  const { data, error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select(
      "id, engagement_type, status, title, scheduled_at, updated_at, prepared_at, planning_status",
    )
    .eq("provider_id", input.providerId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) return [];
  return (data ?? []) as ProviderEngagementSummary[];
}

async function syncEvaluationEngagementStatus(input: {
  providerId: string;
  userId: string;
  status: EvaluationActivityStatusChoice;
}): Promise<{ updated: boolean; engagementId?: string }> {
  const nextStatus = engagementStatusForActivityStatus(input.status);
  if (!nextStatus) return { updated: false };

  const engagements = await loadEvaluationEngagements(input);
  const preview = resolveProviderEvaluationEngagementFromSummaries(engagements);
  if (!preview?.id || !isEvaluationEngagementType(preview.engagement_type)) {
    return { updated: false };
  }

  const current = String(preview.status ?? "").trim().toLowerCase();
  if (current === nextStatus) return { updated: false, engagementId: preview.id };

  const { error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", preview.id);

  if (error) return { updated: false };
  return { updated: true, engagementId: preview.id };
}

export async function saveEvaluationActivityStatus(input: {
  providerId: string;
  userId: string;
  status: EvaluationActivityStatusChoice;
}): Promise<ServiceResult<{ status: EvaluationActivityStatusChoice; engagementSynced: boolean }>> {
  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", input.providerId)
    .maybeSingle();

  if (loadErr) return { ok: false, status: 500, message: loadErr.message };
  if (!existing) return { ok: false, status: 404, message: "Not found" };
  if (!isProviderRole(String((existing as { role_type?: string }).role_type ?? ""))) {
    return { ok: false, status: 400, message: "Not a provider record." };
  }
  if (!(await repCanAccessContact(input.userId, existing as never))) {
    return { ok: false, status: 404, message: "Not found" };
  }

  const previous = String(
    (existing as Record<string, unknown>)[EVALUATION_ACTIVITY_STATUS_DB_KEY] ?? "",
  ).trim();

  const { error: updateErr } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .update({
      [EVALUATION_ACTIVITY_STATUS_DB_KEY]: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.providerId);

  if (updateErr) return { ok: false, status: 500, message: updateErr.message };

  const engagementSync = await syncEvaluationEngagementStatus(input);

  await logSurgicalSalesCrmAudit({
    action: "evaluation_activity_status_saved",
    actorUserId: input.userId,
    meta: {
      entity_type: "provider",
      entity_id: input.providerId,
      status: input.status,
      previous_status: previous || null,
      engagement_synced: engagementSync.updated,
      ...(engagementSync.engagementId ? { engagement_id: engagementSync.engagementId } : {}),
    },
  });

  return {
    ok: true,
    data: {
      status: input.status,
      engagementSynced: engagementSync.updated,
    },
  };
}
