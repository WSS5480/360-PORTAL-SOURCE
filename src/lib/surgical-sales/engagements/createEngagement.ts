import { supabaseAdmin } from "@/lib/supabase/admin";

import { loadEngagementByCaseId } from "@/lib/surgical-sales/engagements/engagementAccess";

import {

  briefingIdForPlannedEngagement,

  engagementCategoryForEngagementType,

  resolvePlanningModeOnCreate,

  resolvePlanningStatusOnCreate,

  type EngagementPlanningMode,

  type EngagementPlanningStatus,

} from "@/lib/surgical-sales/engagements/engagementPlanningModel";

import type { EngagementStatus, EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";

import { buildPreCallPlanPatch } from "@/lib/surgical-sales/preCallPlanFields";

import { logEngagementCreatedActivity } from "@/lib/surgical-sales/engagements/engagementActivityLog";



export type EngagementInsertPayload = {

  engagement_type: EngagementType;

  status?: EngagementStatus;

  title?: string | null;

  provider_id: string;

  organization_id?: string | null;

  opportunity_id?: string | null;

  case_id?: string | null;

  sales_rep_id: string;

  scheduled_at?: string | null;

  engagement_date?: string | null;

  scheduled_date?: string | null;

  notes?: string | null;

  product_focus?: string | null;

  engagement_category?: string | null;

  planning_mode?: EngagementPlanningMode;

  planning_status?: EngagementPlanningStatus;

  briefing_id?: string | null;

  source_observation_id?: string | null;

  preCallDraft?: Record<string, string>;

  preCallPlanTemplateId?: string | null;

  workflowExtras?: Record<string, string | null>;

  /** @deprecated Use planning_status */

  briefingStatus?: EngagementPlanningStatus;

};



export async function insertEngagement(

  payload: EngagementInsertPayload,

): Promise<{ ok: true; engagementId: string } | { ok: false; message: string }> {

  const now = new Date().toISOString();

  const preCallPatch = payload.preCallDraft ? buildPreCallPlanPatch(payload.preCallDraft) : {};
  const hasPreCallContent = Object.values(preCallPatch).some(
    (value) => String(value ?? "").trim().length > 0,
  );

  const prepRow = {
    ...preCallPatch,
    pre_call_plan_template_id: payload.preCallPlanTemplateId ?? null,
    pre_call_plan_updated_at: hasPreCallContent ? now : null,
    prepared_at: null,
  };



  const planningMode =

    payload.planning_mode ??

    resolvePlanningModeOnCreate({ engagementRow: prepRow });

  const planningStatus =

    payload.planning_status ??

    payload.briefingStatus ??

    resolvePlanningStatusOnCreate({ planningMode, engagementRow: prepRow });



  const scheduledDate =

    payload.scheduled_date?.trim() ||

    payload.engagement_date?.trim() ||

    null;



  const row: Record<string, unknown> = {

    engagement_type: payload.engagement_type,

    engagement_category:

      payload.engagement_category ??

      engagementCategoryForEngagementType(payload.engagement_type),

    planning_mode: planningMode,

    planning_status: planningStatus,

    briefing_id: payload.briefing_id ?? null,

    source_observation_id: payload.source_observation_id ?? null,

    status: payload.status ?? "planned",

    title: payload.title?.trim() || null,

    provider_id: payload.provider_id,

    organization_id: payload.organization_id ?? null,

    opportunity_id: payload.opportunity_id ?? null,

    case_id: payload.case_id ?? null,

    sales_rep_id: payload.sales_rep_id,

    scheduled_at: payload.scheduled_at ?? null,

    engagement_date: payload.engagement_date ?? scheduledDate,

    scheduled_date: scheduledDate,

    product_focus: payload.product_focus?.trim() || null,

    notes: payload.notes?.trim() || null,

    ...preCallPatch,

    ...(payload.workflowExtras ?? {}),

    pre_call_plan_template_id: payload.preCallPlanTemplateId ?? null,

    pre_call_plan_updated_at: Object.keys(preCallPatch).length > 0 ? now : null,

    updated_at: now,

  };



  const { data, error } = await supabaseAdmin.from("surgical_sales_engagements").insert(row).select("id").single();



  if (error || !data) {

    return { ok: false, message: error?.message || "Failed to create engagement" };

  }



  const engagementId = String((data as { id: string }).id);



  const briefingId = briefingIdForPlannedEngagement(engagementId, planningStatus);

  if (briefingId && !payload.briefing_id) {

    await supabaseAdmin

      .from("surgical_sales_engagements")

      .update({ briefing_id: briefingId, updated_at: now })

      .eq("id", engagementId);

  }



  if (payload.case_id) {

    await supabaseAdmin

      .from("surgical_sales_cases")

      .update({ engagement_id: engagementId, updated_at: now })

      .eq("id", payload.case_id);

  }



  return { ok: true, engagementId };

}



/** Ensure an engagement exists for a case (used when legacy case PATCH updates pre-call fields). */

export async function ensureEngagementForCase(params: {

  caseRow: Record<string, unknown>;

  userId: string;

  engagementType?: EngagementType;

}): Promise<{ ok: true; engagementId: string; created: boolean } | { ok: false; message: string }> {

  const caseId = String(params.caseRow.id ?? "");

  let existingRow = await loadEngagementByCaseId(caseId);

  if (!existingRow && params.caseRow.engagement_id) {

    const { data } = await supabaseAdmin

      .from("surgical_sales_engagements")

      .select("id")

      .eq("id", String(params.caseRow.engagement_id))

      .maybeSingle();

    existingRow = data as Record<string, unknown> | null;

  }



  if (existingRow?.id) {

    const engagementId = String((existingRow as { id: string }).id);

    if (!params.caseRow.engagement_id) {

      await supabaseAdmin.from("surgical_sales_cases").update({ engagement_id: engagementId }).eq("id", caseId);

    }

    return { ok: true, engagementId, created: false };

  }



  const providerId = params.caseRow.surgeon_contact_id ? String(params.caseRow.surgeon_contact_id) : "";

  if (!providerId) {

    return { ok: false, message: "Link a provider before saving a Pre-Call Plan." };

  }



  const created = await insertEngagement({

    engagement_type: params.engagementType ?? "observation_request",

    provider_id: providerId,

    organization_id: params.caseRow.account_id ? String(params.caseRow.account_id) : null,

    opportunity_id: params.caseRow.related_opportunity_id ? String(params.caseRow.related_opportunity_id) : null,

    case_id: caseId,

    sales_rep_id: String(params.caseRow.sales_rep_id ?? params.userId),

    engagement_date: params.caseRow.case_date ? String(params.caseRow.case_date).slice(0, 10) : null,

    scheduled_date: params.caseRow.case_date ? String(params.caseRow.case_date).slice(0, 10) : null,

    status: "planned",

    planning_mode: "plan_first",

    planning_status: "planning_in_progress",

  });



  if (!created.ok) return created;



  const activityLog = await logEngagementCreatedActivity({

    engagementId: created.engagementId,

    userId: params.userId,

    engagementType: params.engagementType ?? "observation_request",

    context: {

      providerId,

      organizationId: params.caseRow.account_id ? String(params.caseRow.account_id) : null,

      opportunityId: params.caseRow.related_opportunity_id ? String(params.caseRow.related_opportunity_id) : null,

      caseId,

    },

  });

  if (!activityLog.ok) {

    return { ok: false, message: activityLog.message };

  }



  return { ok: true, engagementId: created.engagementId, created: true };

}


