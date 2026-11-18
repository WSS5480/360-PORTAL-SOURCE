import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatSurgicalCaseNumber } from "@/lib/surgical-sales/labels";
import { logSurgicalCaseActivity } from "@/lib/surgical-sales/caseActivityLog";
import { hasPreCallPlanData } from "@/lib/surgical-sales/preCallPlanFields";
import { logPreCallPlanActivityEvents } from "@/lib/surgical-sales/preCallPlanActivityLog";
import { ensureEngagementForCase } from "@/lib/surgical-sales/engagements/createEngagement";
import {
  applyPreCallPlanToEngagement,
  pickPreCallPlanPatchFromPayload,
} from "@/lib/surgical-sales/engagements/engagementPreCallPlan";
import { linkEngagementToCase } from "@/lib/surgical-sales/engagements/linkEngagementToCase";
import { isMissingObservationObjectiveColumnsError } from "@/lib/surgical-sales/observationObjectives";
import { actualRevenueToPersistOnComplete } from "@/lib/surgical-sales/casePerformedStatus";

function isMissingCaseTypeColumnsError(message: string | null | undefined): boolean {
  const m = String(message || "").toLowerCase();
  return (
    m.includes("surgical_sales_cases") &&
    (m.includes("case_type") ||
      m.includes("observation_goal") ||
      m.includes("follow_up_needed") ||
      m.includes("related_opportunity_id") ||
      m.includes("observation_access_")) &&
    m.includes("schema cache")
  );
}

export type SurgicalCaseLineInsert = {
  product_id: string;
  sku_id: string;
  expected_quantity: number;
};

export type SurgicalCaseInsertPayload = {
  account_id: string;
  surgeon_contact_id: string | null;
  sales_rep_id: string;
  case_date: string;
  case_time: string | null;
  procedure_type: string | null;
  case_type?: "observation" | "product_support";
  observation_goal?: string | null;
  observation_key_questions?: string | null;
  observation_signals_to_validate?: string | null;
  observation_access?: {
    scheduling_owner?: string | null;
    access_pathway?: string | null;
    credentialing_requirement?: "unknown" | "not_required" | "required_not_started" | "in_progress" | "verified";
    vendor_restrictions?: string | null;
    preferred_timing?: string | null;
  } | null;
  observation_validation_targets?: {
    id: string;
    label: string;
    source: "manual" | "provider_signal" | "procedural_context" | "chip";
    status: "planned";
    created_at: string;
  }[] | null;
  pre_call_hospital_name?: string | null;
  pre_call_surgeon_name?: string | null;
  pre_observation_impact_opening_statement?: string | null;
  pre_observation_probes?: string | null;
  pre_observation_tools_resources?: string | null;
  pre_observation_value_hypothesis?: string | null;
  pre_observation_planned_close?: string | null;
  pre_observation_additional_notes?: string | null;
  follow_up_needed?: boolean;
  related_opportunity_id?: string | null;
  /** Primary product on the case row; for product support this should match the first line item. */
  product_id: string | null;
  status: string;
  expected_revenue: number;
  notes: string | null;
  sku_id: string | null;
  expected_quantity: number | null;
  /** When set (non-empty), inserts these lines instead of a single sku_id row. First line must match product_id. */
  line_items?: SurgicalCaseLineInsert[] | null;
  /** Link to an existing engagement; pre-call plan stays on the engagement (not duplicated). */
  engagement_id?: string | null;
  case_support_coverage?: string | null;
  case_product_needs?: string | null;
};

/**
 * Inserts case (case_number may be blank; DB trigger assigns), line item, and case_created activity.
 * Rolls back case + line on activity failure.
 */
export async function insertSurgicalCaseBundle(
  payload: SurgicalCaseInsertPayload,
  activityUserId: string
): Promise<{ ok: true; caseId: string; caseNumber: string } | { ok: false; message: string }> {
  const lines: SurgicalCaseLineInsert[] =
    payload.line_items && payload.line_items.length > 0
      ? payload.line_items
      : payload.product_id && payload.sku_id && payload.expected_quantity != null
        ? [{ product_id: payload.product_id, sku_id: payload.sku_id, expected_quantity: payload.expected_quantity }]
        : [];

  if (lines.length > 0 && payload.product_id && lines[0].product_id !== payload.product_id) {
    return { ok: false, message: "product_id must match the first line item" };
  }

  const now = new Date().toISOString();
  const preCallPayload = payload as Record<string, unknown>;
  const preCallPatch = pickPreCallPlanPatchFromPayload(preCallPayload);
  const caseRow: Record<string, unknown> = {
    case_number: "",
    account_id: payload.account_id,
    surgeon_contact_id: payload.surgeon_contact_id,
    sales_rep_id: payload.sales_rep_id,
    case_date: payload.case_date,
    case_time: payload.case_time,
    procedure_type: payload.procedure_type,
    case_type: payload.case_type ?? "product_support",
    follow_up_needed: payload.follow_up_needed ?? false,
    related_opportunity_id: payload.related_opportunity_id ?? null,
    product_id: payload.product_id,
    status: payload.status,
    expected_revenue: payload.expected_revenue,
    notes: payload.notes,
    updated_at: now,
    case_support_coverage: payload.case_support_coverage?.trim() || null,
    case_product_needs: payload.case_product_needs?.trim() || null,
  };

  const bookedOnCreate = actualRevenueToPersistOnComplete(
    payload.expected_revenue,
    String(payload.status).toLowerCase() === "completed" ? null : undefined,
  );
  if (String(payload.status).toLowerCase() === "completed" && bookedOnCreate != null) {
    caseRow.actual_revenue = bookedOnCreate;
  }

  if (payload.engagement_id) {
    caseRow.engagement_id = payload.engagement_id;
  }

  const resolvedCaseType = payload.case_type ?? "product_support";
  if (resolvedCaseType === "observation") {
    caseRow.observation_goal = payload.observation_goal?.trim() || null;
    caseRow.observation_key_questions = payload.observation_key_questions?.trim() || null;
    caseRow.observation_signals_to_validate = payload.observation_signals_to_validate?.trim() || null;
    const observationAccess = payload.observation_access ?? null;
    caseRow.observation_access_scheduling_owner = observationAccess?.scheduling_owner?.trim() || null;
    caseRow.observation_access_pathway = observationAccess?.access_pathway?.trim() || null;
    caseRow.observation_access_credentialing = observationAccess?.credentialing_requirement || "unknown";
    caseRow.observation_access_vendor_restrictions =
      observationAccess?.vendor_restrictions?.trim() || null;
    caseRow.observation_access_preferred_timing = observationAccess?.preferred_timing?.trim() || null;
    caseRow.observation_access_metadata = observationAccess ?? null;
    caseRow.observation_validation_targets = payload.observation_validation_targets ?? [];
  }

  if (resolvedCaseType === "observation" && String(payload.status).toLowerCase() === "completed") {
    caseRow.observation_completed_at = now;
  }

  let { data: created, error: insErr } = await supabaseAdmin.from("surgical_sales_cases").insert(caseRow).select("id, case_number").single();
  if (insErr && isMissingCaseTypeColumnsError(insErr.message)) {
    const fallbackRow = { ...caseRow };
    delete fallbackRow.case_type;
    delete fallbackRow.observation_goal;
    delete fallbackRow.observation_key_questions;
    delete fallbackRow.observation_signals_to_validate;
    delete fallbackRow.observation_access_scheduling_owner;
    delete fallbackRow.observation_access_pathway;
    delete fallbackRow.observation_access_credentialing;
    delete fallbackRow.observation_access_vendor_restrictions;
    delete fallbackRow.observation_access_preferred_timing;
    delete fallbackRow.observation_access_metadata;
    delete fallbackRow.observation_validation_targets;
    delete fallbackRow.follow_up_needed;
    delete fallbackRow.related_opportunity_id;
    const retry = await supabaseAdmin.from("surgical_sales_cases").insert(fallbackRow).select("id, case_number").single();
    created = retry.data;
    insErr = retry.error;
  }
  if (insErr && isMissingObservationObjectiveColumnsError(insErr.message)) {
    const fallbackRow = { ...caseRow };
    delete fallbackRow.observation_key_questions;
    delete fallbackRow.observation_signals_to_validate;
    const retry = await supabaseAdmin.from("surgical_sales_cases").insert(fallbackRow).select("id, case_number").single();
    created = retry.data;
    insErr = retry.error;
  }
  if (insErr || !created) {
    return { ok: false, message: insErr?.message || "Failed to create case" };
  }

  const caseId = (created as { id: string }).id;
  const caseNumber = formatSurgicalCaseNumber(String((created as { case_number: string }).case_number));

  if (lines.length > 0) {
    const completed = String(payload.status).toLowerCase() === "completed";
    const lineRows = lines.map((l) => ({
      case_id: caseId,
      product_id: l.product_id,
      sku_id: l.sku_id,
      expected_quantity: l.expected_quantity,
      actual_quantity: completed ? l.expected_quantity : null,
      updated_at: now,
    }));

    const { error: lineErr } = await supabaseAdmin.from("surgical_sales_case_products").insert(lineRows);
    if (lineErr) {
      await supabaseAdmin.from("surgical_sales_cases").delete().eq("id", caseId);
      return { ok: false, message: lineErr.message };
    }
  }

  if (!payload.engagement_id && preCallPatch && Object.keys(preCallPatch).length > 0) {
    const ensured = await ensureEngagementForCase({
      caseRow: { ...(caseRow as Record<string, unknown>), id: caseId },
      userId: activityUserId,
    });
    if (ensured.ok) {
      await applyPreCallPlanToEngagement({
        engagementId: ensured.engagementId,
        patch: preCallPatch,
        mirrorCaseId: caseId,
      });
    }
  }

  const log = await logSurgicalCaseActivity({
    caseId,
    userId: activityUserId,
    activityType: "case_created",
    body: `Case ${caseNumber} was created.`,
    providerId: payload.surgeon_contact_id ? String(payload.surgeon_contact_id) : null,
    opportunityId: payload.related_opportunity_id ? String(payload.related_opportunity_id) : null,
    metadataJson: {
      sku_id: lines[0]?.sku_id ?? payload.sku_id ?? null,
      line_count: lines.length,
      line_sku_ids: lines.map((l) => l.sku_id),
      observation_access: payload.observation_access ?? null,
      observation_validation_targets: payload.observation_validation_targets ?? [],
      ...(payload.engagement_id ? { engagement_id: payload.engagement_id, source: "engagement_to_case" } : {}),
    },
    newValues: {
      account_id: payload.account_id,
      surgeon_contact_id: payload.surgeon_contact_id,
      sales_rep_id: payload.sales_rep_id,
      case_date: payload.case_date,
      case_time: payload.case_time,
      procedure_type: payload.procedure_type,
      case_type: payload.case_type ?? "product_support",
      observation_goal: payload.observation_goal ?? null,
      observation_key_questions: payload.observation_key_questions ?? null,
      observation_signals_to_validate: payload.observation_signals_to_validate ?? null,
      observation_access: payload.observation_access ?? null,
      observation_validation_targets: payload.observation_validation_targets ?? [],
      follow_up_needed: payload.follow_up_needed ?? false,
      related_opportunity_id: payload.related_opportunity_id ?? null,
      product_id: payload.product_id,
      status: payload.status,
      expected_revenue: payload.expected_revenue,
      notes: payload.notes,
    },
  });

  if (!log.ok) {
    await supabaseAdmin.from("surgical_sales_case_products").delete().eq("case_id", caseId);
    await supabaseAdmin.from("surgical_sales_cases").delete().eq("id", caseId);
    return { ok: false, message: log.message };
  }

  if (payload.engagement_id) {
    const linked = await linkEngagementToCase({
      engagementId: payload.engagement_id,
      caseId,
      caseNumber,
      userId: activityUserId,
    });
    if (!linked.ok) {
      await supabaseAdmin.from("surgical_sales_case_products").delete().eq("case_id", caseId);
      await supabaseAdmin.from("surgical_sales_cases").delete().eq("id", caseId);
      return { ok: false, message: linked.message };
    }
  }

  if (!payload.engagement_id && preCallPatch && hasPreCallPlanData({ ...preCallPayload, ...preCallPatch })) {
    const previous_values: Record<string, unknown> = {};
    const new_values: Record<string, unknown> = {};
    for (const key of Object.keys(preCallPatch)) {
      previous_values[key] = null;
      new_values[key] = preCallPatch[key] ?? null;
    }
    const preCallLog = await logPreCallPlanActivityEvents({
      caseId,
      userId: activityUserId,
      accountId: payload.account_id,
      providerId: payload.surgeon_contact_id ? String(payload.surgeon_contact_id) : null,
      opportunityId: payload.related_opportunity_id ? String(payload.related_opportunity_id) : null,
      caseNumber,
      prevRow: {},
      nextRow: { ...preCallPayload, ...preCallPatch },
      previousValues: previous_values,
      newValues: new_values,
    });
    if (!preCallLog.ok) {
      await supabaseAdmin.from("surgical_sales_case_products").delete().eq("case_id", caseId);
      await supabaseAdmin.from("surgical_sales_cases").delete().eq("id", caseId);
      return { ok: false, message: preCallLog.message };
    }
  }

  return { ok: true, caseId, caseNumber };
}
