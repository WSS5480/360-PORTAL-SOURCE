/**
 * Assembles Observation Debrief strategy-builder inputs from existing plan + CRM context.
 * Does not alter extraction, scoring, or pathway stage logic.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { buildDebriefCommercialSynthesis } from "@/lib/surgical-sales/engagements/buildDebriefCommercialSynthesis";
import { deriveSalesPathwayState } from "@/lib/surgical-sales/deriveSalesPathwayState";
import {
  buildDebriefStrategyProductContextFromPlan,
  listDebriefProductKnowledge,
  type DebriefProductKnowledge,
} from "@/lib/surgical-sales/engagements/debriefProductKnowledge";
import {
  loadProviderObservationNoteCorpus,
  observationNoteBodiesFromCorpus,
  type ProviderObservationNoteEntry,
} from "@/lib/surgical-sales/engagements/loadProviderObservationNoteCorpus";
import { loadProviderDebriefPlanForEngagement } from "@/lib/surgical-sales/engagements/loadProviderDebriefPlanForEngagement";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import {
  buildProviderIntelligenceContext,
  loadIntroCallIntelligenceSummary,
  type ProviderIntelligenceContext,
} from "@/lib/surgical-sales/engagements/providerIntelligenceContext";
import type {
  ProviderDebriefPlan,
  ProviderDebriefPlanActivityInput,
} from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import type { DebriefPrepareObservationIntelligenceInput } from "@/lib/surgical-sales/engagements/buildDebriefPrepareObservedProgramFacts";
import { loadProviderObservationCasesForIntelligence } from "@/lib/surgical-sales/loadProviderObservationCasesForIntelligence";
import type { DebriefCommercialSynthesis } from "@/lib/surgical-sales/engagements/buildDebriefCommercialSynthesis";
import { loadUniversalFactsReadModelForProvider } from "@/lib/surgical-sales/universalExtractor/loadUniversalFactsReadModel";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";
import {
  buildStrategyIntelligenceConsumptionAudit,
  loadProviderIntelligenceAggregator,
  type ProviderIntelligenceAggregatorResult,
  type ProviderIntelligenceAuditReport,
} from "@/lib/surgical-sales/intelligence";

export type AiDebriefStrategyBuilderContext = {
  engagementId: string;
  providerName: string | null;
  organizationName: string | null;
  completedObservationCount: number;
  planMode: "generic" | "intelligence";
  pathwayStageId: string;
  pathwayStageLabel: string;
  procedureLabel: string | null;
  observationMission: string | null;
  observationNotes: string[];
  observationCorpus: ProviderObservationNoteEntry[];
  providerIntelligence: ProviderIntelligenceContext;
  /** @deprecated Label rollup — use commercialSynthesis instead. */
  extractedFindings: string[];
  /** @deprecated Label rollup — use commercialSynthesis instead. */
  whatWeKnow: string[];
  /** @deprecated Label rollup — use commercialSynthesis instead. */
  stillNeedToLearn: string[];
  commercialSynthesis: DebriefCommercialSynthesis;
  productKnowledge: DebriefProductKnowledge[];
  plan: ProviderDebriefPlan;
  intelligenceAggregator: ProviderIntelligenceAggregatorResult;
  intelligenceAudit: ProviderIntelligenceAuditReport;
  observationIntelligence: DebriefPrepareObservationIntelligenceInput | null;
  universalFactsReadModel: UniversalFactsReadModelPayload | null;
};

function noteBodiesFromActivities(
  activities: ProviderDebriefPlanActivityInput[] | null | undefined,
): string[] {
  if (!activities?.length) return [];
  return activities
    .filter((activity) => {
      const type = String(activity.activity_type ?? "").trim().toLowerCase();
      return type === "note" || type === "dictation" || type === "observation_note";
    })
    .map((activity) => String(activity.body ?? "").trim())
    .filter((body) => body.length >= 8);
}

export async function loadAiDebriefStrategyBuilderContext(input: {
  supabase?: SupabaseClient;
  engagement: Record<string, unknown>;
  engagementId: string;
  userId: string;
}): Promise<
  | { ok: true; context: AiDebriefStrategyBuilderContext }
  | { ok: false; message: string; status: 400 | 404 }
> {
  const engagementType = String(input.engagement.engagement_type ?? "");
  if (!isProviderDebriefEngagement(engagementType)) {
    return { ok: false, message: "This engagement is not an Observation Debrief.", status: 400 };
  }

  const supabase = input.supabase ?? supabaseAdmin;
  const providerId = String(input.engagement.provider_id ?? "").trim();
  const orgId = input.engagement.organization_id ? String(input.engagement.organization_id) : null;
  const salesRepId = String(input.engagement.sales_rep_id ?? input.userId).trim();

  const [providerRes, orgRes] = await Promise.all([
    providerId
      ? supabase.from("surgical_sales_contacts").select("*").eq("id", providerId).maybeSingle()
      : Promise.resolve({ data: null }),
    orgId
      ? supabase.from(SALES_ORGANIZATIONS_TABLE).select("id, name").eq("id", orgId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const providerRow = providerRes.data as Record<string, unknown> | null;
  const organization = orgRes.data as { name?: string } | null;
  const providerName = providerRow ? contactDisplayName(providerRow) : null;
  const organizationName = organization?.name ? String(organization.name).trim() : null;

  const debriefPlanContext = await loadProviderDebriefPlanForEngagement(supabase, {
    engagement: input.engagement,
    engagementId: input.engagementId,
    provider: providerRow,
    organization,
  });
  const planLinkedCaseId = debriefPlanContext.linkedCaseId;

  const plan = debriefPlanContext.plan;
  if (!plan) {
    return { ok: false, message: "Debrief plan is not available for this engagement.", status: 404 };
  }

  let observationCorpus: ProviderObservationNoteEntry[] = [];
  if (providerId && salesRepId) {
    observationCorpus = await loadProviderObservationNoteCorpus(supabase, {
      providerId,
      salesRepId,
    });
  }

  let observationNotes = observationNoteBodiesFromCorpus(observationCorpus);

  if (observationNotes.length === 0 && planLinkedCaseId) {
    const { data: activities } = await supabase
      .from("surgical_sales_case_activities")
      .select("id, activity_type, body, created_at, metadata_json")
      .eq("case_id", planLinkedCaseId)
      .order("created_at", { ascending: true });

    const activityInputs = (activities ?? []) as ProviderDebriefPlanActivityInput[];
    observationNotes = noteBodiesFromActivities(activityInputs);
  }

  const introCallSummary =
    providerId && salesRepId
      ? await loadIntroCallIntelligenceSummary(supabase, { providerId, salesRepId })
      : null;
  const providerIntelligence = buildProviderIntelligenceContext({
    engagement: input.engagement,
    introCallSummary,
  });

  const observationCases =
    providerId && salesRepId
      ? await loadProviderObservationCasesForIntelligence(supabase, {
          providerId,
          salesRepId,
          limit: 24,
        })
      : [];

  const pathwayState = providerRow
    ? deriveSalesPathwayState({
        providerId,
        contact: providerRow,
        cases: observationCases,
      })
    : null;

  const productContext = buildDebriefStrategyProductContextFromPlan(plan);
  const productKnowledge =
    productContext.candidates.length > 0 ? productContext.candidates : listDebriefProductKnowledge();

  const pathwayStageLabel = pathwayState?.currentStageLabel ?? "Debrief";

  const commercialSynthesis = buildDebriefCommercialSynthesis({
    plan,
    providerName,
    organizationName,
    completedObservationCount: debriefPlanContext.completed_observation_count,
    pathwayStageLabel,
    observationNotes,
    productKnowledge,
  });

  const intelligenceAggregator = await loadProviderIntelligenceAggregator(supabase, {
    providerId,
    salesRepId,
    organizationId: orgId,
    contact: providerRow,
  });

  let observationIntelligence: DebriefPrepareObservationIntelligenceInput | null = null;
  const universalFactsReadModel =
    providerId ? await loadUniversalFactsReadModelForProvider(providerId) : null;

  if (observationCases.length > 0) {
    const primaryCase =
      observationCases.find((row) => String(row.id ?? "") === planLinkedCaseId) ??
      observationCases[0];
    if (primaryCase) {
      const priorCases = observationCases.filter(
        (row) => String(row.id ?? "") !== String(primaryCase.id ?? ""),
      );
      const { data: activities } = await supabase
        .from("surgical_sales_case_activities")
        .select("id, activity_type, body, created_at, metadata_json")
        .eq("case_id", String(primaryCase.id ?? ""))
        .order("created_at", { ascending: true });
      observationIntelligence = {
        caseRow: primaryCase,
        activities: (activities ?? []) as ProviderDebriefPlanActivityInput[],
        priorCases,
        providerContact: providerRow,
      };
    }
  }

  const baseContext = {
    engagementId: input.engagementId,
    providerName,
    organizationName,
    completedObservationCount: debriefPlanContext.completed_observation_count,
    planMode: debriefPlanContext.plan_mode,
    pathwayStageId: pathwayState?.currentStage ?? "debrief",
    pathwayStageLabel,
    procedureLabel: plan.context.procedureLabel,
    observationMission: plan.context.observationMission,
    observationNotes,
    observationCorpus,
    providerIntelligence,
    extractedFindings: [] as string[],
    whatWeKnow: [] as string[],
    stillNeedToLearn: commercialSynthesis.validationNeeds.map((item) => item.question),
    commercialSynthesis,
    productKnowledge,
    plan,
    intelligenceAggregator,
    observationIntelligence,
    universalFactsReadModel,
  };

  const intelligenceAudit = buildStrategyIntelligenceConsumptionAudit({
    aggregator: intelligenceAggregator,
    context: baseContext,
    engagementId: input.engagementId,
  });

  return {
    ok: true,
    context: {
      ...baseContext,
      intelligenceAudit,
    },
  };
}
