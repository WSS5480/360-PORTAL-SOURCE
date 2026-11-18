import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import {
  countPreCallPlanFilled,
  type PreCallPlanContext,
} from "@/lib/surgical-sales/preCallPlanFields";
import {
  formatEngagementType,
  type EngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";

export type EngagementCasePrefill = {
  engagement_id: string;
  engagement_type: EngagementType;
  engagement_type_label: string;
  title: string | null;
  provider_id: string;
  provider_name: string;
  organization_id: string | null;
  organization_name: string | null;
  opportunity_id: string | null;
  suggested_case_type: "observation" | "product_support";
  suggested_case_date: string | null;
  suggested_notes: string | null;
  pre_call: { filled: number; total: number; complete: boolean };
  has_linked_case: boolean;
  linked_case_id: string | null;
  linked_case_number: string | null;
};

export function suggestedCaseTypeFromEngagement(engagementType: string): "observation" | "product_support" {
  const t = String(engagementType || "").trim();
  if (t === "product_demo" || t === "evaluation_planning") {
    return "product_support";
  }
  return "observation";
}

export function buildSuggestedCaseNotesFromEngagement(row: Record<string, unknown>): string | null {
  const parts: string[] = [];
  const typeLabel = formatEngagementType(String(row.engagement_type ?? ""));
  const title = String(row.title ?? "").trim();
  if (title) parts.push(`Engagement: ${title}`);
  else parts.push(`Engagement: ${typeLabel}`);
  const objective = String(row.notes ?? "").trim();
  if (objective) parts.push(`Objective: ${objective}`);
  const goal = String(row.observation_goal ?? "").trim();
  if (goal) parts.push(`SMART objective: ${goal}`);
  return parts.length > 0 ? parts.join("\n") : null;
}

export async function loadEngagementCasePrefill(
  engagementId: string,
  userId: string,
): Promise<{ ok: true; prefill: EngagementCasePrefill } | { ok: false; message: string; status?: number }> {
  const engagement = await loadEngagementForPortalActor(engagementId, userId);
  if (!engagement) {
    return { ok: false, message: "Engagement not found", status: 404 };
  }

  const providerId = String(engagement.provider_id ?? "");
  const orgId = engagement.organization_id ? String(engagement.organization_id) : null;
  const caseId = engagement.case_id ? String(engagement.case_id) : null;

  const [providerRes, orgRes, caseRes] = await Promise.all([
    supabaseAdmin.from("surgical_sales_contacts").select("id, first_name, last_name, email").eq("id", providerId).maybeSingle(),
    orgId ? supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select("id, name").eq("id", orgId).maybeSingle() : Promise.resolve({ data: null }),
    caseId
      ? supabaseAdmin.from("surgical_sales_cases").select("id, case_number").eq("id", caseId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const providerName = providerRes.data
    ? contactDisplayName(providerRes.data as Parameters<typeof contactDisplayName>[0])
    : "Provider";
  const orgName = orgRes.data ? String((orgRes.data as { name?: string }).name ?? "") : null;

  const ctx: PreCallPlanContext = {
    hospitalDefault: orgName,
    surgeonDefault: providerName,
  };
  const preCallProgress = countPreCallPlanFilled(engagement, ctx);

  const engagementType = String(engagement.engagement_type ?? "intro_call") as EngagementType;

  return {
    ok: true,
    prefill: {
      engagement_id: engagementId,
      engagement_type: engagementType,
      engagement_type_label: formatEngagementType(engagementType),
      title: engagement.title ? String(engagement.title) : null,
      provider_id: providerId,
      provider_name: providerName,
      organization_id: orgId,
      organization_name: orgName,
      opportunity_id: engagement.opportunity_id ? String(engagement.opportunity_id) : null,
      suggested_case_type: suggestedCaseTypeFromEngagement(engagementType),
      suggested_case_date: engagement.engagement_date ? String(engagement.engagement_date) : null,
      suggested_notes: buildSuggestedCaseNotesFromEngagement(engagement),
      pre_call: {
        filled: preCallProgress.filled,
        total: preCallProgress.total,
        complete: preCallProgress.filled >= preCallProgress.total && preCallProgress.total > 0,
      },
      has_linked_case: Boolean(caseId),
      linked_case_id: caseId,
      linked_case_number: caseRes.data
        ? String((caseRes.data as { case_number?: string }).case_number ?? "")
        : null,
    },
  };
}
