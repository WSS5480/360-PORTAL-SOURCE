import { supabaseAdmin } from "@/lib/supabase/admin";
import { repCanAccessContact } from "@/lib/surgical-sales/contactManagement";
import { isProviderRole } from "@/lib/surgical-sales/providerRoles";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  buildMissionBoardEvaluationPathViewFromDirectoryRow,
  type MissionBoardEvaluationPathView,
} from "@/lib/surgical-sales/missionBoardEvaluationPathView";
import { observationCountFromProviderContact } from "@/lib/surgical-sales/observationCaseCompletion";

export type { MissionBoardEvaluationPathView };
export { saveMissionBoardEvaluationPath } from "@/lib/surgical-sales/missionBoardEvaluationPathSave";

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

export async function loadMissionBoardEvaluationPathView(input: {
  providerId: string;
  userId: string;
}): Promise<ServiceResult<MissionBoardEvaluationPathView>> {
  const { data: contact, error } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", input.providerId)
    .maybeSingle();

  if (error) return { ok: false, status: 500, message: error.message };
  if (!contact) return { ok: false, status: 404, message: "Not found" };
  if (!isProviderRole(String((contact as { role_type?: string }).role_type ?? ""))) {
    return { ok: false, status: 400, message: "Not a provider record." };
  }
  if (!(await repCanAccessContact(input.userId, contact as never))) {
    return { ok: false, status: 404, message: "Not found" };
  }

  const { data: debriefEngagementRows } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select("id, engagement_type, status, debrief_intelligence_snapshot, next_action, updated_at")
    .eq("provider_id", input.providerId)
    .eq("engagement_type", "provider_debrief")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(20);

  const contactRecord = contact as Record<string, unknown>;
  const organizationName =
    String(contactRecord.primary_organization_name ?? "").trim() ||
    String((contactRecord.organization as { name?: string } | null)?.name ?? "").trim() ||
    null;

  const providerRow: ProviderDirectoryRow = {
    ...(contact as ProviderDirectoryRow),
    id: input.providerId,
    organization_count: Number(contactRecord.organization_count ?? 0) || (organizationName ? 1 : 0),
    specialty: String(contactRecord.specialty ?? (contact as ProviderDirectoryRow).specialty ?? "").trim() || null,
    primary_organization_name: organizationName,
    primary_organization_id:
      String(contactRecord.primary_organization_id ?? "").trim() ||
      String(contactRecord.organization_id ?? contactRecord.account_id ?? "").trim() ||
      null,
    additional_organizations_count: Number(contactRecord.additional_organizations_count ?? 0) || 0,
    territory: String(contactRecord.territory ?? "").trim() || null,
    planning_status: (contact as ProviderDirectoryRow).planning_status ?? "not_started",
    linked_opportunities_count: Number(contactRecord.linked_opportunities_count ?? 0) || 0,
    observation_count: observationCountFromProviderContact(contactRecord),
    recent_case_count: Number(contactRecord.recent_case_count ?? 0) || 0,
    last_activity_at: String(contactRecord.last_activity_at ?? "").trim() || null,
    upcoming_engagement: (contact as ProviderDirectoryRow).upcoming_engagement ?? null,
    provider_evaluation_engagement:
      (contact as ProviderDirectoryRow).provider_evaluation_engagement ?? null,
  };

  const debriefEngagements = (debriefEngagementRows || []) as Array<Record<string, unknown>>;

  return {
    ok: true,
    data: buildMissionBoardEvaluationPathViewFromDirectoryRow(providerRow, {
      debriefEngagements,
    }),
  };
}

