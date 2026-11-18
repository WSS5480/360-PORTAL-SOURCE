/**
 * Mission Board debrief launcher — execution shortcut layer.
 * Reuses provider debrief plan intelligence; does not modify planner or active engagement.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadSurgicalCaseForPortalActor } from "@/lib/surgical-sales/caseAccess";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { beginEngagementCallForActor } from "@/lib/surgical-sales/engagements/beginEngagementCall";
import {
  buildEngagementPrepareForMeetingHref,
} from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import { buildEngagementActiveHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import { engagementHasTacticalDebrief } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import { loadEngagementByCaseId } from "@/lib/surgical-sales/engagements/engagementAccess";
import { insertEngagement } from "@/lib/surgical-sales/engagements/createEngagement";
import {
  buildEngagementPreCallDraftFromDebriefPlan,
  PROVIDER_DEBRIEF_FROM_OBSERVATION_PURPOSE,
} from "@/lib/surgical-sales/engagements/planProviderDebriefFromObservationCase";
import {
  buildProviderDebriefPlanSnapshot,
} from "@/lib/surgical-sales/engagements/buildProviderDebriefPlan";
import { loadProviderDebriefPlanForEngagement } from "@/lib/surgical-sales/engagements/loadProviderDebriefPlanForEngagement";
import {
  isProviderDebriefEngagement,
  PROVIDER_DEBRIEF_ENGAGEMENT_TYPE,
} from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import type { ProviderDebriefPlan } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import type { DebriefPrepareObservationIntelligenceInput } from "@/lib/surgical-sales/engagements/buildDebriefPrepareObservedProgramFacts";
import {
  buildMissionBoardDebriefLauncherView,
  buildMissionBoardDebriefLauncherEngagement,
  type MissionBoardDebriefLauncherView,
} from "@/lib/surgical-sales/missionBoardDebriefLauncherView";
import {
  resolvePrimaryObservationCase,
} from "@/lib/surgical-sales/buildProviderObservationIntelligenceRollup";
import { buildGenericProviderDebriefPlan } from "@/lib/surgical-sales/engagements/buildGenericProviderDebriefPlan";
import { resolveDebriefWorkflowState } from "@/lib/surgical-sales/debriefEngagementLifecycle";
import type { ProviderDebriefEngagementPreview } from "@/lib/surgical-sales/missionBoardDebriefEngagement";
import { loadProviderObservationCasesForIntelligence } from "@/lib/surgical-sales/loadProviderObservationCasesForIntelligence";
import {
  countCompletedObservationCases,
  isObservationCaseComplete,
  resolveProviderCompletedObservationCount,
} from "@/lib/surgical-sales/observationProgramGate";

const ACTIVE_DEBRIEF_STATUSES = new Set(["planned", "in_progress", "active", "scheduled", "confirmed"]);

export async function findLatestProviderDebriefEngagement(
  supabase: SupabaseClient,
  providerId: string,
): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from("surgical_sales_engagements")
    .select("*")
    .eq("provider_id", providerId)
    .eq("engagement_type", PROVIDER_DEBRIEF_ENGAGEMENT_TYPE)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ? (data as Record<string, unknown>) : null;
}

export async function findActiveProviderDebriefEngagement(
  supabase: SupabaseClient,
  providerId: string,
): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from("surgical_sales_engagements")
    .select("*")
    .eq("provider_id", providerId)
    .eq("engagement_type", PROVIDER_DEBRIEF_ENGAGEMENT_TYPE)
    .is("archived_at", null)
    .not("status", "in", '("completed","cancelled")')
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.id) return null;
  const status = String(data.status ?? "").trim().toLowerCase();
  if (!ACTIVE_DEBRIEF_STATUSES.has(status) && status !== "in_progress") {
    return null;
  }
  return data as Record<string, unknown>;
}

async function loadMissionBoardDebriefObservationIntelligence(input: {
  supabase: SupabaseClient;
  providerId: string;
  userId: string;
  provider: Record<string, unknown>;
  plan: ProviderDebriefPlan;
}): Promise<DebriefPrepareObservationIntelligenceInput | null> {
  const salesRepId = String(input.provider.sales_rep_id ?? input.userId).trim();
  const observationCases = await loadProviderObservationCasesForIntelligence(input.supabase, {
    providerId: input.providerId,
    salesRepId,
  }).catch(() => []);

  const primaryFromRollup = resolvePrimaryObservationCase(observationCases);
  const linkedCaseId =
    input.plan.context.caseId && input.plan.context.caseId !== "generic-debrief-plan"
      ? input.plan.context.caseId
      : primaryFromRollup?.id
        ? String(primaryFromRollup.id)
        : null;

  if (!linkedCaseId) return null;

  const caseRow = await loadSurgicalCaseForPortalActor(linkedCaseId, input.userId);
  if (!caseRow) return null;

  const { data: activities } = await input.supabase
    .from("surgical_sales_case_activities")
    .select("id, activity_type, body, created_at, metadata_json")
    .eq("case_id", linkedCaseId)
    .order("created_at", { ascending: true });

  const priorCases = observationCases.filter((row) => String(row.id ?? "") !== linkedCaseId);

  return {
    caseRow: caseRow as Record<string, unknown>,
    activities: (activities ?? []) as DebriefPrepareObservationIntelligenceInput["activities"],
    priorCases,
    providerContact: input.provider,
  };
}

async function loadProviderDebriefPlanForMissionBoard(input: {
  supabase: SupabaseClient;
  providerId: string;
  userId: string;
  provider: Record<string, unknown>;
  organizationName: string | null;
  engagement?: Record<string, unknown> | null;
  engagementId?: string | null;
}): Promise<{
  plan: ProviderDebriefPlan;
  completedObservationCount: number;
}> {
  if (input.engagement && input.engagementId) {
    const planContext = await loadProviderDebriefPlanForEngagement(input.supabase, {
      engagement: input.engagement,
      engagementId: input.engagementId,
      provider: input.provider,
      organization: input.organizationName ? { name: input.organizationName } : null,
    });
    if (planContext.plan) {
      return {
        plan: planContext.plan,
        completedObservationCount: planContext.completed_observation_count,
      };
    }
  }

  const salesRepId = String(input.provider.sales_rep_id ?? input.userId).trim();
  const providerName =
    String(input.provider.display_name ?? input.provider.full_name ?? "").trim() || null;

  let observationCases: Array<Record<string, unknown>> = [];
  observationCases = await loadProviderObservationCasesForIntelligence(input.supabase, {
    providerId: input.providerId,
    salesRepId,
  }).catch(() => []);

  const primaryCase = resolvePrimaryObservationCase(observationCases);
  const completedCases = observationCases.filter((row) => isObservationCaseComplete(row));
  const completedObservationCount = primaryCase
    ? resolveProviderCompletedObservationCount({
        providerContact: input.provider,
        caseRow: primaryCase,
        priorCases: observationCases.filter((row) => String(row.id ?? "") !== String(primaryCase.id ?? "")),
      })
    : completedCases.length > 0
      ? countCompletedObservationCases(completedCases[0]!, completedCases.slice(1))
      : 0;

  if (!primaryCase?.id) {
    return {
      plan: buildGenericProviderDebriefPlan({
        providerId: input.providerId,
        providerName,
        facilityName: input.organizationName,
        completedObservationCount,
      }),
      completedObservationCount,
    };
  }

  const caseRow = await loadSurgicalCaseForPortalActor(String(primaryCase.id), input.userId);
  if (!caseRow) {
    return {
      plan: buildGenericProviderDebriefPlan({
        providerId: input.providerId,
        providerName,
        facilityName: input.organizationName,
        completedObservationCount,
      }),
      completedObservationCount,
    };
  }

  const planContext = await loadProviderDebriefPlanForEngagement(input.supabase, {
    engagement: {
      provider_id: input.providerId,
      sales_rep_id: salesRepId,
      case_id: String(primaryCase.id),
      engagement_type: PROVIDER_DEBRIEF_ENGAGEMENT_TYPE,
    },
    engagementId: input.engagementId ?? "mission-board-preview",
    provider: input.provider,
    organization: input.organizationName ? { name: input.organizationName } : null,
  });

  return {
    plan:
      planContext.plan ??
      buildGenericProviderDebriefPlan({
        providerId: input.providerId,
        providerName,
        facilityName: input.organizationName,
        completedObservationCount,
      }),
    completedObservationCount: planContext.completed_observation_count || completedObservationCount,
  };
}

function buildDebriefEngagementTitle(plan: ProviderDebriefPlan, providerName: string | null): string {
  const procedure = plan.context.procedureLabel?.trim();
  if (procedure) return `Observation Debrief — ${procedure}`;
  if (providerName) return `Observation Debrief — ${providerName}`;
  return "Observation Debrief";
}

function providerDebriefNeedsCompletion(engagement: Record<string, unknown>): boolean {
  return !Boolean(engagement.debrief_completed);
}

/** Reuse active or incomplete debrief engagements — avoids duplicate case_id inserts. */
export async function findExistingProviderDebriefForMissionBoard(
  supabase: SupabaseClient,
  providerId: string,
  caseId: string | null,
): Promise<Record<string, unknown> | null> {
  const active = await findActiveProviderDebriefEngagement(supabase, providerId);
  if (active?.id && providerDebriefNeedsCompletion(active)) {
    return active;
  }

  const { data: incompleteRows } = await supabase
    .from("surgical_sales_engagements")
    .select("*")
    .eq("provider_id", providerId)
    .eq("engagement_type", PROVIDER_DEBRIEF_ENGAGEMENT_TYPE)
    .is("archived_at", null)
    .or("debrief_completed.is.null,debrief_completed.eq.false")
    .order("updated_at", { ascending: false })
    .limit(1);

  const incomplete = incompleteRows?.[0] as Record<string, unknown> | undefined;
  if (incomplete?.id) return incomplete;

  if (caseId) {
    const byCase = await loadEngagementByCaseId(caseId);
    if (
      byCase?.id &&
      String(byCase.provider_id ?? "") === providerId &&
      isProviderDebriefEngagement(String(byCase.engagement_type ?? "")) &&
      providerDebriefNeedsCompletion(byCase)
    ) {
      return byCase;
    }
  }

  return null;
}

async function resolveInsertCaseId(caseId: string | null): Promise<string | null> {
  if (!caseId) return null;
  const occupied = await loadEngagementByCaseId(caseId);
  return occupied?.id ? null : caseId;
}

export async function ensureMissionBoardProviderDebriefEngagement(input: {
  providerId: string;
  userId: string;
  plan: ProviderDebriefPlan;
  provider: Record<string, unknown>;
  organizationId: string | null;
  organizationName: string | null;
}): Promise<
  | { ok: true; engagementId: string; created: boolean; engagement: Record<string, unknown> }
  | { ok: false; message: string; status: number }
> {
  const plannedCaseId =
    input.plan.context.caseId && input.plan.context.caseId !== "generic-debrief-plan"
      ? input.plan.context.caseId
      : null;

  const existing = await findExistingProviderDebriefForMissionBoard(
    supabaseAdmin,
    input.providerId,
    plannedCaseId,
  );
  if (existing?.id) {
    return {
      ok: true,
      engagementId: String(existing.id),
      created: false,
      engagement: existing,
    };
  }

  const providerName =
    String(input.provider.display_name ?? input.provider.full_name ?? "").trim() || null;
  const salesRepId = String(input.provider.sales_rep_id ?? input.userId).trim();
  const caseId = await resolveInsertCaseId(plannedCaseId);

  const preCallDraft = buildEngagementPreCallDraftFromDebriefPlan(input.plan, {
    providerName,
    facilityName: input.organizationName,
  });

  const inserted = await insertEngagement({
    engagement_type: PROVIDER_DEBRIEF_ENGAGEMENT_TYPE,
    provider_id: input.providerId,
    organization_id: input.organizationId,
    case_id: caseId,
    sales_rep_id: salesRepId,
    title: buildDebriefEngagementTitle(input.plan, providerName),
    status: "planned",
    preCallDraft,
    workflowExtras: {
      engagement_purpose: PROVIDER_DEBRIEF_FROM_OBSERVATION_PURPOSE,
    },
  });

  if (!inserted.ok) {
    return { ok: false, message: inserted.message, status: 500 };
  }

  const snapshot = buildProviderDebriefPlanSnapshot({
    plan: input.plan,
    sourceCaseId: plannedCaseId ?? input.plan.context.caseId,
    sourceEngagementId: null,
  });

  const now = new Date().toISOString();
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

  const { data: engagement } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select("*")
    .eq("id", inserted.engagementId)
    .maybeSingle();

  return {
    ok: true,
    engagementId: inserted.engagementId,
    created: true,
    engagement: (engagement as Record<string, unknown>) ?? { id: inserted.engagementId },
  };
}

export async function loadMissionBoardDebriefLauncherView(input: {
  providerId: string;
  userId: string;
}): Promise<
  | { ok: true; view: MissionBoardDebriefLauncherView }
  | { ok: false; message: string; status: number }
> {
  const { data: provider } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", input.providerId)
    .maybeSingle();

  if (!provider) {
    return { ok: false, message: "Provider not found", status: 404 };
  }

  const organizationId = String(
    provider.primary_organization_id ?? provider.organization_id ?? provider.account_id ?? "",
  ).trim();
  let organizationName: string | null = null;
  if (organizationId) {
    const { data: org } = await supabaseAdmin
      .from("surgical_sales_organizations")
      .select("name")
      .eq("id", organizationId)
      .maybeSingle();
    organizationName = String(org?.name ?? "").trim() || null;
  }

  const latestDebrief = await findLatestProviderDebriefEngagement(supabaseAdmin, input.providerId);
  const activeDebrief = await findActiveProviderDebriefEngagement(supabaseAdmin, input.providerId);
  const planSource = activeDebrief ?? latestDebrief;
  const { plan, completedObservationCount } = await loadProviderDebriefPlanForMissionBoard({
    supabase: supabaseAdmin,
    providerId: input.providerId,
    userId: input.userId,
    provider: provider as Record<string, unknown>,
    organizationName,
    engagement: planSource,
    engagementId: planSource?.id ? String(planSource.id) : null,
  });

  const observationIntelligence = await loadMissionBoardDebriefObservationIntelligence({
    supabase: supabaseAdmin,
    providerId: input.providerId,
    userId: input.userId,
    provider: provider as Record<string, unknown>,
    plan,
  });

  const providerName = contactDisplayName(provider as Record<string, unknown>);
  const existingEngagement = latestDebrief?.id
    ? buildMissionBoardDebriefLauncherEngagement({
        debrief: {
          id: String(latestDebrief.id),
          status: String(latestDebrief.status ?? "planned"),
          debrief_completed: Boolean(latestDebrief.debrief_completed),
        },
        debriefCompletedOverride: Boolean(latestDebrief.debrief_completed),
      })
    : null;

  return {
    ok: true,
    view: buildMissionBoardDebriefLauncherView({
      providerName,
      organizationName,
      plan,
      completedObservationCount,
      existingEngagement,
      observationIntelligence,
    }),
  };
}

export async function resolveOrCreateMissionBoardDebriefEngagement(input: {
  providerId: string;
  userId: string;
}): Promise<
  | { ok: true; engagementId: string; created: boolean; engagement: Record<string, unknown> }
  | { ok: false; message: string; status: number }
> {
  const loaded = await loadMissionBoardDebriefLauncherView({
    providerId: input.providerId,
    userId: input.userId,
  });
  if (!loaded.ok) return loaded;

  const { data: provider } = await supabaseAdmin
    .from("surgical_sales_contacts")
    .select("*")
    .eq("id", input.providerId)
    .maybeSingle();
  if (!provider) {
    return { ok: false, message: "Provider not found", status: 404 };
  }

  const organizationId =
    String(
      provider.primary_organization_id ?? provider.organization_id ?? provider.account_id ?? "",
    ).trim() || null;
  const organizationName = loaded.view.organizationName;

  const latestDebrief = await findLatestProviderDebriefEngagement(supabaseAdmin, input.providerId);
  const activeDebrief = await findActiveProviderDebriefEngagement(supabaseAdmin, input.providerId);
  const planSource = activeDebrief ?? latestDebrief;
  const { plan } = await loadProviderDebriefPlanForMissionBoard({
    supabase: supabaseAdmin,
    providerId: input.providerId,
    userId: input.userId,
    provider: provider as Record<string, unknown>,
    organizationName,
    engagement: planSource,
    engagementId: planSource?.id ? String(planSource.id) : null,
  });

  const plannedCaseId =
    plan.context.caseId && plan.context.caseId !== "generic-debrief-plan"
      ? plan.context.caseId
      : null;
  const existing = await findExistingProviderDebriefForMissionBoard(
    supabaseAdmin,
    input.providerId,
    plannedCaseId,
  );

  const ensured = await ensureMissionBoardProviderDebriefEngagement({
    providerId: input.providerId,
    userId: input.userId,
    plan,
    provider: provider as Record<string, unknown>,
    organizationId,
    organizationName,
  });
  if (!ensured.ok) return ensured;

  return {
    ok: true,
    engagementId: ensured.engagementId,
    created: ensured.created,
    engagement: ensured.engagement,
  };
}

export async function runMissionBoardDebriefLauncherAction(input: {
  providerId: string;
  userId: string;
  action: "start" | "prepare";
}): Promise<
  | { ok: true; engagementId: string; href: string; created: boolean }
  | { ok: false; message: string; status: number }
> {
  const resolved = await resolveOrCreateMissionBoardDebriefEngagement({
    providerId: input.providerId,
    userId: input.userId,
  });
  if (!resolved.ok) return resolved;

  const ensured = {
    ok: true as const,
    engagementId: resolved.engagementId,
    created: resolved.created,
    engagement: resolved.engagement,
  };

  if (input.action === "prepare") {
    return {
      ok: true,
      engagementId: ensured.engagementId,
      href: buildEngagementPrepareForMeetingHref(ensured.engagementId),
      created: ensured.created,
    };
  }

  const engagementRow = ensured.engagement;
  const preview: ProviderDebriefEngagementPreview = {
    id: ensured.engagementId,
    status: String(engagementRow.status ?? "planned"),
    debrief_completed: Boolean(engagementRow.debrief_completed),
    prepared_at: engagementRow.prepared_at ? String(engagementRow.prepared_at) : null,
    planning_status: engagementRow.planning_status ? String(engagementRow.planning_status) : null,
  };
  const workflow = resolveDebriefWorkflowState(preview);

  if (workflow === "planned") {
    return {
      ok: true,
      engagementId: ensured.engagementId,
      href: buildEngagementPrepareForMeetingHref(ensured.engagementId),
      created: ensured.created,
    };
  }

  if (workflow === "in_progress") {
    return {
      ok: true,
      engagementId: ensured.engagementId,
      href: buildEngagementActiveHref(ensured.engagementId),
      created: ensured.created,
    };
  }

  const begin = await beginEngagementCallForActor(ensured.engagementId, input.userId, {
    allowUnpreparedBegin: true,
  });
  if (!begin.ok) {
    return { ok: false, message: begin.error, status: begin.status };
  }

  return {
    ok: true,
    engagementId: ensured.engagementId,
    href: buildEngagementActiveHref(ensured.engagementId),
    created: ensured.created,
  };
}
