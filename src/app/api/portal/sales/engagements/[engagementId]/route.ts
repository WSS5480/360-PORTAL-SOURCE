import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { userIsInternalSalesRep } from "@/lib/sales/requireInternalSalesRep";
import { loadEngagementForPortalActor } from "@/lib/surgical-sales/engagements/engagementAccess";
import {
  applyPreCallPlanToEngagement,
  pickPreCallPlanPatchFromPayload,
} from "@/lib/surgical-sales/engagements/engagementPreCallPlan";
import { pickPreCallPlanAuditDiff } from "@/lib/surgical-sales/preCallPlanActivityLog";
import {
  logEngagementCompletedActivity,
  logEngagementPreCallPlanActivityEvents,
  logEngagementUpdatedActivity,
} from "@/lib/surgical-sales/engagements/engagementActivityLog";
import { assertNoForbiddenPatientPayloadKeys } from "@/lib/surgical-sales/surgicalPayloadGuards";
import { ENGAGEMENT_TYPES, ENGAGEMENT_STATUSES } from "@/lib/surgical-sales/engagements/engagementTypes";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { repCanViewSurgicalAccount } from "@/lib/surgical-sales/repAccountVisibility";
import { assertProviderLinkedToOrganization } from "@/lib/surgical-sales/crmEntityRelationships";
import {
  adoptionInitiativeSnapshotFromRow,
  logAdoptionInitiativeEngagementLinked,
} from "@/lib/activity/adoptionInitiativeActivity";
import { loadOpportunityForViewer } from "@/lib/sales/opportunityAccess";
import { formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  ENGAGEMENT_PLANNING_STATUSES,
  isEngagementPlanningStatus,
  syncEngagementPlanningPatch,
} from "@/lib/surgical-sales/engagements/engagementPlanningModel";
import {
  buildEngagementTacticalDebriefCommitPatch,
  buildStoredTacticalDebriefNotes,
  engagementNotesHaveTacticalDebrief,
} from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import { extractRawDebriefFromStoredNotes } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefRawNotes";
import { syncIntroCallProviderFromVisitOutcome } from "@/lib/surgical-sales/engagements/introCallDebriefFirstCompletion";
import { isIntroCallPathwayMission } from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import { syncPostObservationProviderDebriefPathwayAdvance } from "@/lib/surgical-sales/engagements/syncPostObservationProviderDebriefPathwayAdvance";
import {
  archiveEngagementForPortalActor,
  restoreEngagementForPortalActor,
} from "@/lib/surgical-sales/engagements/archiveEngagement";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PatchEngagementSchema = z
  .object({
    engagement_type: z.enum(ENGAGEMENT_TYPES).optional(),
    status: z.enum(ENGAGEMENT_STATUSES).optional(),
    title: z.string().max(200).optional().nullable(),
    provider_id: z.string().uuid().optional(),
    organization_id: z.string().uuid().optional().nullable(),
    opportunity_id: z.string().uuid().optional().nullable(),
    case_id: z.string().uuid().optional().nullable(),
    scheduled_at: z.string().datetime({ offset: true }).optional().nullable(),
    engagement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    notes: z.string().max(8000).optional().nullable(),
    engagement_workflow_mode: z.enum(["strategic", "lightweight"]).optional().nullable(),
    engagement_purpose: z.string().max(2000).optional().nullable(),
    next_action: z.string().max(2000).optional().nullable(),
    follow_up_tasks: z.string().max(4000).optional().nullable(),
    sim_lab_focus: z.string().max(4000).optional().nullable(),
    products_to_demonstrate: z.string().max(4000).optional().nullable(),
    product_focus: z.string().max(400).optional().nullable(),
    attendees: z.string().max(4000).optional().nullable(),
    hands_on_goals: z.string().max(4000).optional().nullable(),
    adoption_signals_to_watch: z.string().max(4000).optional().nullable(),
    observation_goal: z.string().max(1200).optional().nullable(),
    pre_call_hospital_name: z.string().max(400).optional().nullable(),
    pre_call_surgeon_name: z.string().max(400).optional().nullable(),
    pre_observation_impact_opening_statement: z.string().max(4000).optional().nullable(),
    pre_observation_probes: z.string().max(8000).optional().nullable(),
    pre_observation_tools_resources: z.string().max(8000).optional().nullable(),
    pre_observation_value_hypothesis: z.string().max(8000).optional().nullable(),
    pre_observation_planned_close: z.string().max(8000).optional().nullable(),
    pre_observation_additional_notes: z.string().max(8000).optional().nullable(),
    pre_call_plan_template_id: z.string().uuid().optional().nullable(),
    prepared_at: z.string().datetime({ offset: true }).optional().nullable(),
    prepared_by_user_id: z.string().uuid().optional().nullable(),
    prepare_checklist_json: z.unknown().optional().nullable(),
    debrief_completed: z.boolean().optional(),
    debrief_completed_at: z.string().datetime({ offset: true }).optional().nullable(),
    mark_debrief_completed: z.boolean().optional(),
    debrief_intelligence_snapshot: z.record(z.string(), z.unknown()).optional().nullable(),
    briefing_status: z.enum(ENGAGEMENT_PLANNING_STATUSES).optional(),
    planning_status: z.enum(ENGAGEMENT_PLANNING_STATUSES).optional(),
    start_field_briefing: z.boolean().optional(),
    archive: z.literal(true).optional(),
    restore: z.literal(true).optional(),
  })
  .strict();

export async function GET(_req: Request, ctx: { params: Promise<{ engagementId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { engagementId } = await ctx.params;
  if (!UUID_RE.test(engagementId)) {
    return NextResponse.json({ ok: false, error: "Invalid engagement id" }, { status: 400 });
  }

  const engagement = await loadEngagementForPortalActor(engagementId, uid, { includeArchived: true });
  if (!engagement) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const providerId = String(engagement.provider_id);
  const orgId = engagement.organization_id ? String(engagement.organization_id) : null;
  const caseId = engagement.case_id ? String(engagement.case_id) : null;
  const opportunityId = engagement.opportunity_id ? String(engagement.opportunity_id) : null;

  const [providerRes, providerLinkRes, orgRes, caseRes, oppRes, actsRes] = await Promise.all([
    supabaseAdmin.from("surgical_sales_contacts").select("*").eq("id", providerId).maybeSingle(),
    supabaseAdmin
      .from("surgical_sales_contact_organizations")
      .select("specialty")
      .eq("contact_id", providerId)
      .eq("is_active", true)
      .order("is_primary_org", { ascending: false })
      .limit(1)
      .maybeSingle(),
    orgId ? supabaseAdmin.from(SALES_ORGANIZATIONS_TABLE).select("id, name").eq("id", orgId).maybeSingle() : Promise.resolve({ data: null }),
    caseId
      ? supabaseAdmin.from("surgical_sales_cases").select("id, case_number, status, case_date").eq("id", caseId).maybeSingle()
      : Promise.resolve({ data: null }),
    opportunityId
      ? supabaseAdmin
          .from("sales_opportunities")
          .select("id, account_name, physician_name, stage, product_line")
          .eq("id", opportunityId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabaseAdmin
      .from("surgical_sales_engagement_activities")
      .select("id, user_id, activity_type, body, metadata_json, created_at")
      .eq("engagement_id", engagementId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return NextResponse.json({
    ok: true,
    engagement,
    provider: providerRes.data
      ? {
          ...providerRes.data,
          display_name: contactDisplayName(providerRes.data as Parameters<typeof contactDisplayName>[0]),
          specialty: providerLinkRes.data?.specialty
            ? String(providerLinkRes.data.specialty)
            : null,
        }
      : null,
    organization: orgRes.data,
    case: caseRes.data,
    opportunity: oppRes.data,
    activities: actsRes.data ?? [],
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ engagementId: string }> }) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const uid = auth.user.id;
  if (!(await userIsInternalSalesRep(uid))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { engagementId } = await ctx.params;
  if (!UUID_RE.test(engagementId)) {
    return NextResponse.json({ ok: false, error: "Invalid engagement id" }, { status: 400 });
  }

  const prev = await loadEngagementForPortalActor(engagementId, uid, { includeArchived: true });
  if (!prev) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const keyErr = assertNoForbiddenPatientPayloadKeys(raw);
  if (keyErr) return NextResponse.json({ ok: false, error: keyErr }, { status: 400 });

  const parsed = PatchEngagementSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const p = parsed.data;

  if (p.archive === true && p.restore === true) {
    return NextResponse.json({ ok: false, error: "Choose delete or restore, not both." }, { status: 400 });
  }

  const archiveOnlyKeys = new Set(["archive", "restore"]);
  const otherTouched = (Object.keys(p) as (keyof typeof p)[]).filter(
    (k) => p[k] !== undefined && !archiveOnlyKeys.has(k as string),
  );
  if ((p.archive === true || p.restore === true) && otherTouched.length > 0) {
    return NextResponse.json({ ok: false, error: "Send delete or restore alone (no other fields)." }, { status: 400 });
  }

  if (p.archive === true) {
    const result = await archiveEngagementForPortalActor({
      engagementId,
      userId: uid,
      row: prev,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, engagement: result.engagement });
  }

  if (p.restore === true) {
    const result = await restoreEngagementForPortalActor({
      engagementId,
      userId: uid,
      row: prev,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, engagement: result.engagement });
  }

  const archivedAt = (prev.archived_at as string | null | undefined) ?? null;
  if (archivedAt) {
    return NextResponse.json(
      { ok: false, error: "This engagement is deleted. Restore it before editing details." },
      { status: 409 },
    );
  }

  const nextOrgId = p.organization_id !== undefined ? p.organization_id : (prev.organization_id as string | null);
  const nextProviderId = p.provider_id !== undefined ? p.provider_id : String(prev.provider_id);

  if (nextOrgId) {
    const ok = await repCanViewSurgicalAccount(uid, nextOrgId);
    if (!ok) return NextResponse.json({ ok: false, error: "Organization not available" }, { status: 403 });
    const linkErr = await assertProviderLinkedToOrganization(nextProviderId, nextOrgId);
    if (linkErr) return NextResponse.json({ ok: false, error: linkErr }, { status: 400 });
  }

  const preCallPatch = pickPreCallPlanPatchFromPayload(p as Record<string, unknown>);
  const preCallEngagementPrev = preCallPatch ? { ...prev } : null;
  if (preCallPatch) {
    const applied = await applyPreCallPlanToEngagement({
      engagementId,
      patch: preCallPatch,
      mirrorCaseId: prev.case_id ? String(prev.case_id) : null,
    });
    if (!applied.ok) {
      return NextResponse.json({ ok: false, error: applied.message }, { status: 500 });
    }
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (p.engagement_type !== undefined) patch.engagement_type = p.engagement_type;
  if (p.status !== undefined) patch.status = p.status;
  if (p.title !== undefined) patch.title = p.title?.trim() || null;
  if (p.provider_id !== undefined) patch.provider_id = p.provider_id;
  if (p.organization_id !== undefined) patch.organization_id = p.organization_id;
  if (p.opportunity_id !== undefined) patch.opportunity_id = p.opportunity_id;
  if (p.case_id !== undefined) patch.case_id = p.case_id;
  if (p.scheduled_at !== undefined) patch.scheduled_at = p.scheduled_at;
  if (p.engagement_date !== undefined) patch.engagement_date = p.engagement_date;
  if (p.scheduled_date !== undefined) patch.scheduled_date = p.scheduled_date;
  else if (p.engagement_date !== undefined) patch.scheduled_date = p.engagement_date;
  if (p.notes !== undefined) patch.notes = p.notes?.trim() || null;
  if (p.debrief_completed !== undefined) patch.debrief_completed = p.debrief_completed;
  if (p.debrief_completed_at !== undefined) patch.debrief_completed_at = p.debrief_completed_at;
  if (p.debrief_intelligence_snapshot !== undefined) {
    patch.debrief_intelligence_snapshot = p.debrief_intelligence_snapshot;
  }

  if (p.mark_debrief_completed === true) {
    const narrative =
      p.notes !== undefined
        ? extractRawDebriefFromStoredNotes(p.notes)
        : extractRawDebriefFromStoredNotes(String(prev.notes ?? ""));
    const storedNotes =
      p.notes != null && engagementNotesHaveTacticalDebrief(p.notes)
        ? p.notes.trim()
        : buildStoredTacticalDebriefNotes({ narrative });
    Object.assign(
      patch,
      buildEngagementTacticalDebriefCommitPatch({
        narrative,
        completeEngagement: p.status === undefined ? true : p.status === "completed",
        now: patch.updated_at as string,
      }),
    );
    patch.notes = storedNotes;
    if (p.status === undefined && String(prev.status ?? "").toLowerCase() !== "cancelled") {
      patch.status = "completed";
    }
  } else if (p.debrief_completed === true && p.debrief_completed_at === undefined) {
    patch.debrief_completed_at = patch.updated_at;
  }
  if (p.engagement_workflow_mode !== undefined) patch.engagement_workflow_mode = p.engagement_workflow_mode;
  if (p.engagement_purpose !== undefined) patch.engagement_purpose = p.engagement_purpose?.trim() || null;
  if (p.next_action !== undefined) patch.next_action = p.next_action?.trim() || null;
  if (p.follow_up_tasks !== undefined) patch.follow_up_tasks = p.follow_up_tasks?.trim() || null;
  if (p.sim_lab_focus !== undefined) patch.sim_lab_focus = p.sim_lab_focus?.trim() || null;
  if (p.products_to_demonstrate !== undefined) {
    patch.products_to_demonstrate = p.products_to_demonstrate?.trim() || null;
  }
  if (p.product_focus !== undefined) patch.product_focus = p.product_focus?.trim() || null;
  if (p.attendees !== undefined) patch.attendees = p.attendees?.trim() || null;
  if (p.hands_on_goals !== undefined) patch.hands_on_goals = p.hands_on_goals?.trim() || null;
  if (p.adoption_signals_to_watch !== undefined) {
    patch.adoption_signals_to_watch = p.adoption_signals_to_watch?.trim() || null;
  }
  if (p.observation_goal !== undefined) patch.observation_goal = p.observation_goal?.trim() || null;
  if (p.pre_call_plan_template_id !== undefined) {
    patch.pre_call_plan_template_id = p.pre_call_plan_template_id;
  }
  if (p.prepared_at !== undefined) patch.prepared_at = p.prepared_at;
  if (p.prepared_by_user_id !== undefined) patch.prepared_by_user_id = p.prepared_by_user_id;
  if (p.prepare_checklist_json !== undefined) {
    patch.prepare_checklist_json = p.prepare_checklist_json ?? {};
  }
  if (p.start_field_briefing === true) {
    patch.planning_status = "planning_in_progress";
    patch.planning_mode = "plan_first";
  } else if (p.planning_status !== undefined && isEngagementPlanningStatus(p.planning_status)) {
    patch.planning_status = p.planning_status;
  } else if (p.briefing_status !== undefined && isEngagementPlanningStatus(p.briefing_status)) {
    patch.planning_status = p.briefing_status;
  }

  const shouldSyncPlanningStatus =
    preCallPatch !== null ||
    p.prepared_at !== undefined ||
    p.start_field_briefing === true ||
    p.planning_status !== undefined ||
    p.briefing_status !== undefined;

  const { data: updated, error } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .update(patch)
    .eq("id", engagementId)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json({ ok: false, error: error?.message || "Update failed" }, { status: 500 });
  }

  if (shouldSyncPlanningStatus) {
    const synced = syncEngagementPlanningPatch(updated as Record<string, unknown>, engagementId);
    const currentStatus = String(
      (updated as { planning_status?: string }).planning_status ??
        (updated as { briefing_status?: string }).briefing_status ??
        "",
    );
    const needsUpdate =
      synced.planning_status !== currentStatus ||
      (synced.briefing_id &&
        String((updated as { briefing_id?: string }).briefing_id ?? "") !== synced.briefing_id);
    if (needsUpdate) {
      await supabaseAdmin
        .from("surgical_sales_engagements")
        .update({ ...synced, updated_at: new Date().toISOString() })
        .eq("id", engagementId);
      (updated as Record<string, unknown>).planning_status = synced.planning_status;
      if (synced.briefing_id) {
        (updated as Record<string, unknown>).briefing_id = synced.briefing_id;
      }
    }
  }

  if (p.case_id && p.case_id !== prev.case_id) {
    await supabaseAdmin.from("surgical_sales_cases").update({ engagement_id: engagementId }).eq("id", p.case_id);
  }

  const prevOpportunityId = prev.opportunity_id ? String(prev.opportunity_id) : null;
  const nextOpportunityId = updated.opportunity_id ? String(updated.opportunity_id) : null;
  if (p.opportunity_id !== undefined && nextOpportunityId && nextOpportunityId !== prevOpportunityId) {
    const oppRow = await loadOpportunityForViewer(nextOpportunityId, uid);
    if (oppRow) {
      const engagementLabel =
        String(updated.title || "").trim() || formatEngagementType(String(updated.engagement_type || ""));
      logAdoptionInitiativeEngagementLinked({
        userId: uid,
        snapshot: adoptionInitiativeSnapshotFromRow(oppRow),
        engagementId,
        engagementLabel,
      });
    }
  }

  const activityCtx = {
    providerId: String(updated.provider_id ?? prev.provider_id),
    organizationId: updated.organization_id ? String(updated.organization_id) : null,
    opportunityId: updated.opportunity_id ? String(updated.opportunity_id) : null,
    caseId: updated.case_id ? String(updated.case_id) : null,
  };

  const nonPreCallKeys = Object.keys(patch).filter(
    (k) => k !== "updated_at" && !String(k).startsWith("pre_") && k !== "observation_goal",
  );
  if (nonPreCallKeys.length > 0) {
    if (p.status === "completed" && String(prev.status) !== "completed") {
      const completedLog = await logEngagementCompletedActivity({
        engagementId,
        userId: uid,
        context: activityCtx,
        engagementType: String(updated.engagement_type),
      });
      if (!completedLog.ok) {
        return NextResponse.json({ ok: false, error: completedLog.message }, { status: 500 });
      }
    } else {
      const updatedLog = await logEngagementUpdatedActivity({
        engagementId,
        userId: uid,
        context: activityCtx,
        summary: "Engagement details updated.",
        metadataJson: { fields: nonPreCallKeys },
      });
      if (!updatedLog.ok) {
        return NextResponse.json({ ok: false, error: updatedLog.message }, { status: 500 });
      }
    }
  }

  if (preCallPatch && preCallEngagementPrev) {
    const engAfter = (await loadEngagementForPortalActor(engagementId, uid)) ?? updated;
    const preCallDiff = pickPreCallPlanAuditDiff({
      previous_values: preCallEngagementPrev,
      new_values: engAfter as Record<string, unknown>,
    });
    if (preCallDiff) {
      const caseId = updated.case_id ? String(updated.case_id) : null;
      const caseNumber = caseId
        ? (
            await supabaseAdmin.from("surgical_sales_cases").select("case_number").eq("id", caseId).maybeSingle()
          ).data?.case_number
        : null;
      await logEngagementPreCallPlanActivityEvents({
        engagementId,
        userId: uid,
        accountId: updated.organization_id ? String(updated.organization_id) : null,
        providerId: String(updated.provider_id),
        opportunityId: updated.opportunity_id ? String(updated.opportunity_id) : null,
        caseId,
        caseNumber: caseNumber ? String(caseNumber) : null,
        prevRow: preCallEngagementPrev,
        nextRow: engAfter as Record<string, unknown>,
        previousValues: preCallDiff.previous_values,
        newValues: preCallDiff.new_values,
      });
    }
  }

  if (p.mark_debrief_completed === true && isIntroCallPathwayMission(String(updated.engagement_type ?? ""))) {
    const debriefNarrative =
      p.notes !== undefined
        ? extractRawDebriefFromStoredNotes(p.notes)
        : extractRawDebriefFromStoredNotes(String(updated.notes ?? ""));
    await syncIntroCallProviderFromVisitOutcome({
      engagement: updated as Record<string, unknown>,
      userId: uid,
      narrative: debriefNarrative,
    });
  }

  if (
    p.mark_debrief_completed === true &&
    isProviderDebriefEngagement(String(updated.engagement_type ?? ""))
  ) {
    const debriefNarrative =
      p.notes !== undefined
        ? extractRawDebriefFromStoredNotes(p.notes)
        : extractRawDebriefFromStoredNotes(String(updated.notes ?? ""));
    const providerId = String(updated.provider_id ?? "").trim();
    if (providerId) {
      try {
        await syncPostObservationProviderDebriefPathwayAdvance({
          providerId,
          userId: uid,
          debriefSnapshot: updated.debrief_intelligence_snapshot,
          narrative: debriefNarrative,
        });
      } catch (pathwayErr: unknown) {
        console.error("[engagement PATCH] post-observation debrief pathway advance failed:", pathwayErr);
      }
    }
  }

  return NextResponse.json({ ok: true, engagement: updated });
}
