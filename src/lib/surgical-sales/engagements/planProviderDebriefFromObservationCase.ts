import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";
import { logSurgicalCaseActivity } from "@/lib/surgical-sales/caseActivityLog";
import { formatSurgicalCaseNumber, isSurgicalObservationCase } from "@/lib/surgical-sales/labels";
import { buildPreCallPlanPatch } from "@/lib/surgical-sales/preCallPlanFields";
import {
  buildProviderDebriefPlan,
  buildProviderDebriefPlanSnapshot,
} from "@/lib/surgical-sales/engagements/buildProviderDebriefPlan";
import { loadProviderObservationCasesForIntelligence } from "@/lib/surgical-sales/loadProviderObservationCasesForIntelligence";
import {
  OBSERVATION_DEBRIEF_UNLOCK_THRESHOLD,
  resolveProviderCompletedObservationCount,
} from "@/lib/surgical-sales/observationProgramGate";
import { loadEngagementByCaseId } from "@/lib/surgical-sales/engagements/engagementAccess";
import { insertEngagement } from "@/lib/surgical-sales/engagements/createEngagement";
import {
  logEngagementCreatedActivity,
  logEngagementUpdatedActivity,
} from "@/lib/surgical-sales/engagements/engagementActivityLog";
import { buildEngagementPrepareForMeetingHref } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import {
  isProviderDebriefEngagement,
  PROVIDER_DEBRIEF_ENGAGEMENT_TYPE,
  providerDebriefFitLevelLabel,
} from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import type {
  ProviderDebriefPlan,
  ProviderDebriefPlanActivityInput,
} from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";

export const PROVIDER_DEBRIEF_FROM_OBSERVATION_PURPOSE =
  "Debrief the surgeon on observation learnings and confirm next steps.";

export function buildEngagementPreCallDraftFromDebriefPlan(
  plan: ProviderDebriefPlan,
  context: { providerName: string | null; facilityName: string | null },
): Record<string, string> {
  const learnedLines = plan.whatWeLearned.slice(0, 6).map((item) => {
    const evidence = item.evidence ? ` — ${item.evidence}` : "";
    return `• ${item.signal}${evidence}`;
  });
  const unknownLines = plan.whatWeStillDontKnow.slice(0, 4).map((item) => `• ${item.question}`);
  const objectives = plan.suggestedObjectives.map((objective) => `• ${objective.text}`).join("\n");
  const questions = plan.suggestedQuestions.slice(0, 6).map((question) => `• ${question.text}`).join("\n");
  const productLines = plan.productOpportunityAssessment
    .filter((assessment) => assessment.fitLevel !== "unlikely" && assessment.fitLevel !== "unknown")
    .map((assessment) => `${assessment.product}: ${providerDebriefFitLevelLabel(assessment.fitLevel)}`);

  const longitudinal = plan.longitudinalIntelligence;
  const longitudinalLines = [
    longitudinal.recurringPainPoints.length
      ? `Recurring pain points:\n${longitudinal.recurringPainPoints
          .slice(0, 3)
          .map((item) => `• ${item.signal}${item.count > 1 ? ` (${item.count} observations)` : ""}`)
          .join("\n")}`
      : null,
    longitudinal.competitiveProductsSeen.length
      ? `Competitive products seen:\n${longitudinal.competitiveProductsSeen
          .slice(0, 3)
          .map((item) => `• ${item.signal}`)
          .join("\n")}`
      : null,
    longitudinal.productFitTrends.length
      ? `Product fit trends:\n${longitudinal.productFitTrends
          .slice(0, 3)
          .map((item) => `• ${item.label}${item.count > 1 ? ` (${item.count} observations)` : ""}`)
          .join("\n")}`
      : null,
  ].filter(Boolean);

  const opening = [
    plan.context.observationMission ? `Observation mission: ${plan.context.observationMission}` : null,
    learnedLines.length ? `What we observed:\n${learnedLines.join("\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const additionalNotes = [
    longitudinalLines.length ? longitudinalLines.join("\n\n") : null,
    unknownLines.length ? `Still need to confirm:\n${unknownLines.join("\n")}` : null,
    productLines.length ? `Product fit:\n${productLines.join("\n")}` : null,
    plan.desiredMeetingOutcome.supporting.length
      ? `Supporting outcomes:\n${plan.desiredMeetingOutcome.supporting.map((item) => `• ${item}`).join("\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    pre_call_hospital_name: context.facilityName ?? "",
    pre_call_surgeon_name: context.providerName ?? "",
    observation_goal: plan.desiredMeetingOutcome.primary,
    pre_observation_impact_opening_statement: opening,
    pre_observation_probes: questions,
    pre_observation_value_hypothesis: objectives,
    pre_observation_planned_close: `${plan.recommendedNextStep.title}\n${plan.recommendedNextStep.body}`.trim(),
    pre_observation_additional_notes: additionalNotes,
  };
}

function buildProviderDebriefEngagementTitle(caseRow: Record<string, unknown>): string {
  const procedure = String(caseRow.procedure_type ?? "").trim();
  const caseNumber = formatSurgicalCaseNumber(String(caseRow.case_number ?? ""));
  if (procedure) return `Observation Debrief — ${procedure}`;
  if (caseNumber) return `Observation Debrief — ${caseNumber}`;
  return "Observation Debrief";
}

export async function planProviderDebriefFromObservationCase(params: {
  caseId: string;
  userId: string;
}): Promise<
  | { ok: true; engagementId: string; prepareHref: string; created: boolean; reused: boolean }
  | { ok: false; message: string; status: number }
> {
  const caseRow = await loadSurgicalCaseForPortalActor(params.caseId, params.userId);
  if (!caseRow) {
    return { ok: false, message: "Not found", status: 404 };
  }

  if (!isSurgicalObservationCase(String(caseRow.case_type ?? ""))) {
    return { ok: false, message: "Only observation cases can plan a provider debrief.", status: 400 };
  }

  const providerId = String(caseRow.surgeon_contact_id ?? "").trim();
  if (!providerId) {
    return { ok: false, message: "Link a provider to this case before planning a provider debrief.", status: 400 };
  }

  let priorObservationCases: Array<Record<string, unknown>> = [];
  try {
    priorObservationCases = await loadProviderObservationCasesForIntelligence(supabaseAdmin, {
      providerId,
      salesRepId: String(caseRow.sales_rep_id ?? params.userId),
      excludeCaseId: params.caseId,
    });
  } catch {
    priorObservationCases = [];
  }

  const [{ data: providerRow }, { data: accountRow }, { data: activities }] = await Promise.all([
    supabaseAdmin.from("surgical_sales_contacts").select("*").eq("id", providerId).maybeSingle(),
    caseRow.account_id
      ? supabaseAdmin
          .from("surgical_sales_organizations")
          .select("id, name")
          .eq("id", String(caseRow.account_id))
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabaseAdmin
      .from("surgical_sales_case_activities")
      .select("id, activity_type, body, created_at, metadata_json")
      .eq("case_id", params.caseId)
      .order("created_at", { ascending: true }),
  ]);

  const completedObservations = resolveProviderCompletedObservationCount({
    providerContact: (providerRow as Record<string, unknown> | null) ?? null,
    caseRow: caseRow as Record<string, unknown>,
    priorCases: priorObservationCases,
  });
  if (completedObservations < OBSERVATION_DEBRIEF_UNLOCK_THRESHOLD) {
    return {
      ok: false,
      message: `Complete ${OBSERVATION_DEBRIEF_UNLOCK_THRESHOLD} observations before generating a provider debrief.`,
      status: 409,
    };
  }

  const providerName =
    String(providerRow?.display_name ?? providerRow?.full_name ?? "").trim() || null;
  const facilityName =
    String(caseRow.pre_call_hospital_name ?? accountRow?.name ?? "").trim() || null;

  const plan = buildProviderDebriefPlan({
    caseRow,
    activities: (activities ?? []) as ProviderDebriefPlanActivityInput[],
    providerContact: (providerRow as Record<string, unknown> | null) ?? null,
    providerName,
    facilityName,
    priorObservationCases,
  });

  const preCallDraft = buildEngagementPreCallDraftFromDebriefPlan(plan, { providerName, facilityName });
  const title = buildProviderDebriefEngagementTitle(caseRow);
  const organizationId = caseRow.account_id ? String(caseRow.account_id) : null;
  const opportunityId = caseRow.related_opportunity_id ? String(caseRow.related_opportunity_id) : null;
  const salesRepId = String(caseRow.sales_rep_id ?? params.userId);
  const now = new Date().toISOString();

  const existingEngagement = await loadEngagementByCaseId(params.caseId);
  const existingEngagementId = existingEngagement?.id ? String(existingEngagement.id) : null;
  const existingIsProviderDebrief = isProviderDebriefEngagement(
    String(existingEngagement?.engagement_type ?? ""),
  );

  let engagementId = existingEngagementId;
  let created = false;
  let reused = false;

  const snapshot = buildProviderDebriefPlanSnapshot({
    plan,
    sourceCaseId: params.caseId,
    sourceEngagementId: existingEngagementId,
  });
  const preCallPatch = buildPreCallPlanPatch(preCallDraft);

  if (existingEngagementId) {
    reused = existingIsProviderDebrief;
    const { error: updateErr } = await supabaseAdmin
      .from("surgical_sales_engagements")
      .update({
        engagement_type: PROVIDER_DEBRIEF_ENGAGEMENT_TYPE,
        provider_id: providerId,
        organization_id: organizationId,
        opportunity_id: opportunityId,
        case_id: params.caseId,
        title,
        engagement_purpose: PROVIDER_DEBRIEF_FROM_OBSERVATION_PURPOSE,
        ...preCallPatch,
        debrief_intelligence_snapshot: snapshot,
        pre_call_plan_updated_at: now,
        updated_at: now,
      })
      .eq("id", existingEngagementId);

    if (updateErr) {
      return { ok: false, message: updateErr.message, status: 500 };
    }

    await supabaseAdmin
      .from("surgical_sales_cases")
      .update({ engagement_id: existingEngagementId, updated_at: now })
      .eq("id", params.caseId);

    if (!existingIsProviderDebrief) {
      const activityLog = await logEngagementUpdatedActivity({
        engagementId: existingEngagementId,
        userId: params.userId,
        context: {
          providerId,
          organizationId,
          opportunityId,
          caseId: params.caseId,
        },
        summary: "Engagement converted to provider debrief from observation case intelligence.",
        metadataJson: {
          engagement_type: PROVIDER_DEBRIEF_ENGAGEMENT_TYPE,
          source_case_id: params.caseId,
        },
      });
      if (!activityLog.ok) {
        return { ok: false, message: activityLog.message, status: 500 };
      }
    }
  } else {
    const inserted = await insertEngagement({
      engagement_type: PROVIDER_DEBRIEF_ENGAGEMENT_TYPE,
      provider_id: providerId,
      organization_id: organizationId,
      opportunity_id: opportunityId,
      case_id: params.caseId,
      sales_rep_id: salesRepId,
      title,
      status: "planned",
      engagement_date: caseRow.case_date ? String(caseRow.case_date).slice(0, 10) : null,
      preCallDraft,
      workflowExtras: {
        engagement_purpose: PROVIDER_DEBRIEF_FROM_OBSERVATION_PURPOSE,
      },
    });

    if (!inserted.ok) {
      return { ok: false, message: inserted.message, status: 500 };
    }

    engagementId = inserted.engagementId;
    created = true;

    const { error: snapshotErr } = await supabaseAdmin
      .from("surgical_sales_engagements")
      .update({
        debrief_intelligence_snapshot: snapshot,
        updated_at: now,
      })
      .eq("id", inserted.engagementId);
    if (snapshotErr) {
      return { ok: false, message: snapshotErr.message, status: 500 };
    }

    const activityLog = await logEngagementCreatedActivity({
      engagementId: inserted.engagementId,
      userId: params.userId,
      engagementType: PROVIDER_DEBRIEF_ENGAGEMENT_TYPE,
      title,
      context: {
        providerId,
        organizationId,
        opportunityId,
        caseId: params.caseId,
      },
    });
    if (!activityLog.ok) {
      return { ok: false, message: activityLog.message, status: 500 };
    }
  }

  if (!engagementId) {
    return { ok: false, message: "Failed to resolve provider debrief engagement.", status: 500 };
  }

  const caseLog = await logSurgicalCaseActivity({
    caseId: params.caseId,
    userId: params.userId,
    activityType: "provider_debrief_planned",
    body: reused
      ? `Provider debrief refreshed from observation intelligence — ${title}.`
      : `Provider debrief planned from observation intelligence — ${title}.`,
    metadataJson: {
      engagement_id: engagementId,
      provider_id: providerId,
      organization_id: organizationId,
      source: "observation_case",
      created,
      reused,
    },
    providerId,
  });
  if (!caseLog.ok) {
    return { ok: false, message: caseLog.message, status: 500 };
  }

  return {
    ok: true,
    engagementId,
    prepareHref: buildEngagementPrepareForMeetingHref(engagementId),
    created,
    reused,
  };
}
