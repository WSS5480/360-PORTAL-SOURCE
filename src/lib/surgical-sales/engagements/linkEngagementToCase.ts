import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";
import { logSurgicalCaseActivity } from "@/lib/surgical-sales/caseActivityLog";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import { logEngagementConvertedToCaseActivity } from "@/lib/surgical-sales/engagements/engagementActivityLog";
import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";

export async function linkEngagementToCase(params: {
  engagementId: string;
  caseId: string;
  caseNumber: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const engagement = await loadEngagementForPortalActor(params.engagementId, params.userId);
  if (!engagement) {
    return { ok: false, message: "Engagement not found" };
  }

  const existingCaseId = engagement.case_id ? String(engagement.case_id) : null;
  if (existingCaseId && existingCaseId !== params.caseId) {
    return { ok: false, message: "This engagement is already linked to another case." };
  }

  const { data: caseRow, error: caseErr } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select("id, engagement_id, surgeon_contact_id, account_id, related_opportunity_id")
    .eq("id", params.caseId)
    .maybeSingle();
  if (caseErr || !caseRow) {
    return { ok: false, message: caseErr?.message || "Case not found" };
  }

  const caseEngagementId = (caseRow as { engagement_id?: string | null }).engagement_id;
  if (caseEngagementId && String(caseEngagementId) !== params.engagementId) {
    return { ok: false, message: "This case is already linked to a different engagement." };
  }

  const providerId = String(engagement.provider_id ?? "");
  const organizationId = engagement.organization_id ? String(engagement.organization_id) : null;
  const opportunityId = engagement.opportunity_id
    ? String(engagement.opportunity_id)
    : (caseRow as { related_opportunity_id?: string | null }).related_opportunity_id
      ? String((caseRow as { related_opportunity_id: string }).related_opportunity_id)
      : null;

  const context = {
    providerId: providerId || null,
    organizationId,
    opportunityId,
    caseId: params.caseId,
  };

  const now = new Date().toISOString();
  const engagementStatus = String(engagement.status ?? "planned");
  const nextEngagementStatus =
    engagementStatus === "planned" || engagementStatus === "in_progress" ? "in_progress" : engagementStatus;

  const { error: engUpdErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update({
      case_id: params.caseId,
      status: nextEngagementStatus,
      updated_at: now,
    })
    .eq("id", params.engagementId);
  if (engUpdErr) {
    return { ok: false, message: engUpdErr.message };
  }

  const { error: caseUpdErr } = await supabaseAdmin
    .from("surgical_sales_cases")
    .update({ engagement_id: params.engagementId, updated_at: now })
    .eq("id", params.caseId);
  if (caseUpdErr) {
    await supabaseAdmin
      .from("surgical_sales_engagements")
      .update({ case_id: existingCaseId, updated_at: now })
      .eq("id", params.engagementId);
    return { ok: false, message: caseUpdErr.message };
  }

  const caseNumber = formatSurgicalCaseNumber(params.caseNumber);
  const typeLabel = formatEngagementType(String(engagement.engagement_type));
  const linkMeta = {
    engagement_id: params.engagementId,
    case_id: params.caseId,
    case_number: caseNumber,
    engagement_type: engagement.engagement_type,
    source: "engagement_to_case",
  };

  const caseLinkBody = `Case ${caseNumber} linked to ${typeLabel} engagement. Pre-Call Plan remains on the engagement.`;
  const caseLog = await logSurgicalCaseActivity({
    caseId: params.caseId,
    userId: params.userId,
    activityType: "case_linked_from_engagement",
    body: caseLinkBody,
    providerId: providerId || null,
    opportunityId,
    metadataJson: linkMeta,
    newValues: { engagement_id: params.engagementId },
  });
  if (!caseLog.ok) {
    return { ok: false, message: caseLog.message };
  }

  const converted = await logEngagementConvertedToCaseActivity({
    engagementId: params.engagementId,
    userId: params.userId,
    context,
    caseNumber,
    engagementType: String(engagement.engagement_type),
  });
  if (!converted.ok) {
    return { ok: false, message: converted.message };
  }

  return { ok: true };
}
