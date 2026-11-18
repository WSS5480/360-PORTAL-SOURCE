import type { SupabaseClient } from "@supabase/supabase-js";
import {
  observationCaseHasCapturedNotes,
  resolvePrimaryObservationCase,
} from "@/lib/surgical-sales/buildProviderObservationIntelligenceRollup";
import { buildGenericProviderDebriefPlan, resolveProviderDebriefPlanMode } from "@/lib/surgical-sales/engagements/buildGenericProviderDebriefPlan";
import { buildProviderDebriefPlan, parseProviderDebriefPlanSnapshot } from "@/lib/surgical-sales/engagements/buildProviderDebriefPlan";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import type {
  ProviderDebriefPlan,
  ProviderDebriefPlanActivityInput,
} from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import { latestProviderObservationNoteActivityAt } from "@/lib/surgical-sales/engagements/loadProviderObservationNoteCorpus";
import { loadProviderObservationCasesForIntelligence } from "@/lib/surgical-sales/loadProviderObservationCasesForIntelligence";
import {
  countCompletedObservationCases,
  isObservationCaseComplete,
  resolveProviderCompletedObservationCount,
} from "@/lib/surgical-sales/observationProgramGate";

export type ProviderDebriefPlanMode = "generic" | "intelligence";

export type ProviderDebriefPlanContext = {
  plan: ProviderDebriefPlan | null;
  plan_mode: ProviderDebriefPlanMode;
  completed_observation_count: number;
  linkedCaseId: string | null;
  linkedCaseHref: string | null;
  missing_case_message: string | null;
};

async function resolveLinkedObservationCaseId(
  supabase: SupabaseClient,
  engagement: Record<string, unknown>,
  engagementId: string,
): Promise<string | null> {
  const directCaseId = String(engagement.case_id ?? "").trim();
  if (directCaseId) return directCaseId;

  const { data: linkedCase } = await supabase
    .from("surgical_sales_cases")
    .select("id")
    .eq("engagement_id", engagementId)
    .eq("case_type", "observation")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return linkedCase?.id ? String(linkedCase.id) : null;
}

function completedObservationCountForProvider(input: {
  providerContact: Record<string, unknown> | null;
  primaryCase: Record<string, unknown> | null;
  observationCases: Array<Record<string, unknown>>;
}): number {
  if (input.primaryCase) {
    const priorCases = input.observationCases.filter(
      (row) => String(row.id ?? "") !== String(input.primaryCase!.id ?? ""),
    );
    return resolveProviderCompletedObservationCount({
      providerContact: input.providerContact,
      caseRow: input.primaryCase,
      priorCases,
    });
  }

  const completedOnly = input.observationCases.filter((row) => isObservationCaseComplete(row));

  if (completedOnly.length === 0) return 0;

  const anchor = completedOnly[0]!;
  return countCompletedObservationCases(anchor, completedOnly.slice(1));
}

function planFromStoredSnapshot(
  engagement: Record<string, unknown>,
): ProviderDebriefPlan | null {
  return parseProviderDebriefPlanSnapshot(engagement.debrief_intelligence_snapshot);
}

export async function loadProviderDebriefPlanForEngagement(
  supabase: SupabaseClient,
  input: {
    engagement: Record<string, unknown>;
    engagementId: string;
    provider: Record<string, unknown> | null;
    organization: { name?: string } | null;
  },
): Promise<ProviderDebriefPlanContext> {
  const emptyContext = (overrides: Partial<ProviderDebriefPlanContext>): ProviderDebriefPlanContext => ({
    plan: null,
    plan_mode: "generic",
    completed_observation_count: 0,
    linkedCaseId: null,
    linkedCaseHref: null,
    missing_case_message: null,
    ...overrides,
  });

  if (!isProviderDebriefEngagement(String(input.engagement.engagement_type ?? ""))) {
    return emptyContext({});
  }

  const providerId = String(input.provider?.id ?? input.engagement.provider_id ?? "").trim();
  const salesRepId = String(input.engagement.sales_rep_id ?? "").trim();
  const providerName =
    String(input.provider?.display_name ?? input.provider?.full_name ?? "").trim() || null;
  const facilityName = String(input.organization?.name ?? "").trim() || null;

  const storedPlan = planFromStoredSnapshot(input.engagement);
  if (storedPlan) {
    const linkedCaseId = String(storedPlan.context.caseId ?? "").trim() || null;
    const safeCaseId = linkedCaseId && linkedCaseId !== "generic-debrief-plan" ? linkedCaseId : null;

    let snapshotIsFresh = true;
    if (providerId && salesRepId) {
      const latestNoteActivity = await latestProviderObservationNoteActivityAt(supabase, {
        providerId,
        salesRepId,
      });
      if (
        latestNoteActivity &&
        storedPlan.generatedAt &&
        storedPlan.generatedAt < latestNoteActivity
      ) {
        snapshotIsFresh = false;
      }
    }

    if (snapshotIsFresh) {
      return {
        plan: storedPlan,
        plan_mode: resolveProviderDebriefPlanMode(storedPlan),
        completed_observation_count: storedPlan.longitudinalIntelligence.observationCaseCount,
        linkedCaseId: safeCaseId,
        linkedCaseHref: safeCaseId
          ? `/portal/sales/cases/${encodeURIComponent(safeCaseId)}`
          : null,
        missing_case_message: null,
      };
    }
  }

  let observationCases: Array<Record<string, unknown>> = [];
  if (providerId && salesRepId) {
    observationCases = await loadProviderObservationCasesForIntelligence(supabase, {
      providerId,
      salesRepId,
    }).catch(() => []);
  }

  const linkedCaseId = await resolveLinkedObservationCaseId(supabase, input.engagement, input.engagementId);
  const primaryFromProvider = resolvePrimaryObservationCase(observationCases);
  const primaryCaseId =
    linkedCaseId ||
    (primaryFromProvider?.id ? String(primaryFromProvider.id) : null);

  const primaryCaseSummary = primaryCaseId
    ? observationCases.find((row) => String(row.id) === primaryCaseId) ?? primaryFromProvider
    : primaryFromProvider;

  const completedObservationCount = completedObservationCountForProvider({
    providerContact: input.provider,
    primaryCase: primaryCaseSummary as Record<string, unknown> | null,
    observationCases,
  });

  if (!primaryCaseId) {
    const plan = buildGenericProviderDebriefPlan({
      providerId: providerId || null,
      providerName,
      facilityName,
      completedObservationCount,
    });
    return {
      plan,
      plan_mode: "generic",
      completed_observation_count: completedObservationCount,
      linkedCaseId: null,
      linkedCaseHref: null,
      missing_case_message: null,
    };
  }

  const [{ data: caseRow }, { data: activities }] = await Promise.all([
    supabase.from("surgical_sales_cases").select("*").eq("id", primaryCaseId).maybeSingle(),
    supabase
      .from("surgical_sales_case_activities")
      .select("id, activity_type, body, created_at, metadata_json")
      .eq("case_id", primaryCaseId)
      .order("created_at", { ascending: true }),
  ]);

  if (!caseRow) {
    const plan = buildGenericProviderDebriefPlan({
      providerId: providerId || null,
      providerName,
      facilityName,
      completedObservationCount,
    });
    return {
      plan,
      plan_mode: "generic",
      completed_observation_count: completedObservationCount,
      linkedCaseId: primaryCaseId,
      linkedCaseHref: `/portal/sales/cases/${encodeURIComponent(primaryCaseId)}`,
      missing_case_message: "The observation case could not be loaded — using a generic debrief guide.",
    };
  }

  const priorObservationCases =
    providerId && salesRepId
      ? observationCases.filter((row) => String(row.id ?? "") !== primaryCaseId)
      : [];

  const resolvedFacilityName =
    String(caseRow.pre_call_hospital_name ?? facilityName ?? "").trim() || null;

  const intelligencePlan = buildProviderDebriefPlan({
    caseRow: caseRow as Record<string, unknown>,
    activities: (activities ?? []) as ProviderDebriefPlanActivityInput[],
    providerContact: input.provider,
    engagement: input.engagement,
    providerName,
    facilityName: resolvedFacilityName,
    priorObservationCases,
  });

  const planMode = resolveProviderDebriefPlanMode(intelligencePlan);
  const plan =
    planMode === "generic" &&
    !observationCaseHasCapturedNotes(caseRow as Record<string, unknown>) &&
    priorObservationCases.every((row) => !observationCaseHasCapturedNotes(row))
      ? buildGenericProviderDebriefPlan({
          providerId: providerId || null,
          providerName,
          facilityName: resolvedFacilityName,
          completedObservationCount,
        })
      : intelligencePlan;

  return {
    plan,
    plan_mode: planMode === "generic" && plan.context.caseId === "generic-debrief-plan" ? "generic" : planMode,
    completed_observation_count: completedObservationCount,
    linkedCaseId: primaryCaseId,
    linkedCaseHref: `/portal/sales/cases/${encodeURIComponent(primaryCaseId)}`,
    missing_case_message: null,
  };
}
