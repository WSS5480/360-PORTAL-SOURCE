/**
 * Intelligence Maturity — signal-based account evolution (not field completion %).
 *
 * Distinct from commercial workflow stage (CRM/opportunity floor).
 * Maturity reflects durable intelligence captured on the provider profile.
 * Mission progression uses pathwayStageGates hard gates only — maturity never blocks advancement.
 */

import { normalizeSalesStage } from "@/lib/sales/stages";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { intelligenceSectionIdForDbKey } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  fieldHasIntelligenceSignal,
} from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  deriveIntelligenceSectionConfidence,
  type IntelligenceSectionConfidence,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { resolveProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import {
  isVendorFootprintDiscoveryField,
  isVendorFootprintDiscoveryVisibleForMaturityStage,
  VENDOR_FOOTPRINT_DISCOVERY_FIELD_KEYS,
} from "@/lib/surgical-sales/providerIntelligenceDiscoveryRouting";

export const PROVIDER_INTELLIGENCE_MATURITY_STAGES = [
  "early_discovery",
  "operationally_qualified",
  "observation_ready",
  "evaluation_active",
  "adoption_building",
  "strategic_account",
] as const;

export type ProviderIntelligenceMaturityStage = (typeof PROVIDER_INTELLIGENCE_MATURITY_STAGES)[number];

export const PROVIDER_INTELLIGENCE_MATURITY_LABELS: Record<ProviderIntelligenceMaturityStage, string> = {
  early_discovery: "Early discovery",
  operationally_qualified: "Access mapping",
  observation_ready: "Observation validated",
  evaluation_active: "Evaluation-ready",
  adoption_building: "Adoption building",
  strategic_account: "Operationally ready",
};

export const PROVIDER_INTELLIGENCE_MATURITY_HINTS: Record<ProviderIntelligenceMaturityStage, string> = {
  early_discovery:
    "Mapping how this account operates — procedure mix, influence, and whether observation is deployment-realistic.",
  operationally_qualified:
    "Clinical and relationship baseline is in place — pressure-test observation access next.",
  observation_ready:
    "Observation path mapped — coordinator, credentialing, and target procedures operationally confirmed.",
  evaluation_active:
    "Product fit and commercial path are live — map evaluation operational risk and decision-makers.",
  adoption_building: "Preference-card and champion signals matter — expand supported cases.",
  strategic_account: "Durable intelligence across workflow, access, and commercial motion.",
};

export const PROVIDER_INTELLIGENCE_MATURITY_EVOLUTION: Record<ProviderIntelligenceMaturityStage, string> = {
  early_discovery: "Developing visibility — learn workflow and access on your next touch.",
  operationally_qualified: "Account is operationally mapped — qualify the observation pathway.",
  observation_ready: "Ready to plan observation — scheduling and access signals are in shape.",
  evaluation_active: "In evaluation motion — tighten product fit and conversion path.",
  adoption_building: "Adoption in progress — focus on preference-card and champion proof.",
  strategic_account: "Strategic account — maintain intelligence and expansion signals.",
};

const MATURITY_RANK: Record<ProviderIntelligenceMaturityStage, number> = {
  early_discovery: 0,
  operationally_qualified: 1,
  observation_ready: 2,
  evaluation_active: 3,
  adoption_building: 4,
  strategic_account: 5,
};

export type MaturityCriterionDef = {
  id: string;
  label: string;
  dbKey?: string;
  sectionId?: ProviderIntelligenceSectionId;
};

export type MaturityCriterionStatus = MaturityCriterionDef & {
  met: boolean;
};

export type ProviderIntelligenceMaturitySnapshot = {
  stage: ProviderIntelligenceMaturityStage;
  stageLabel: string;
  stageHint: string;
  evolutionLine: string;
  stageIndex: number;
  /** Criteria for advancing to the next stage (empty when at strategic_account). */
  nextStageCriteria: MaturityCriterionStatus[];
  nextStage: ProviderIntelligenceMaturityStage | null;
  nextStageLabel: string | null;
  /** Share of next-stage criteria already met (0–100). */
  progressToNextPercent: number;
  /** Unmet criteria blocking the next maturity stage (for capture coaching). */
  unmetNextDbKeys: string[];
};

export type ProviderIntelligenceMaturityContext = {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
};

function hasSignal(contact: Record<string, unknown>, dbKey: string): boolean {
  return fieldHasIntelligenceSignal(dbKey, contact[dbKey] as string | null | undefined);
}

function observationAllowed(contact: Record<string, unknown>): boolean {
  const v = String(contact.provider_observation_feasibility ?? "").trim().toLowerCase();
  return v === "easy" || v === "restricted";
}

function sectionConfidence(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
): IntelligenceSectionConfidence {
  const fromPlanning = planning?.sections.find((s) => s.id === sectionId)?.confidence;
  if (fromPlanning) return fromPlanning;
  return deriveIntelligenceSectionConfidence(sectionId, contact).confidence;
}

function confidenceAtLeast(
  tier: IntelligenceSectionConfidence,
  minimum: IntelligenceSectionConfidence,
): boolean {
  const rank: Record<IntelligenceSectionConfidence, number> = {
    unknown: 0,
    partial: 1,
    confirmed: 2,
    validated: 3,
  };
  return rank[tier] >= rank[minimum];
}

function hasEvaluationOpportunity(opportunities?: Array<Record<string, unknown>>): boolean {
  const evalStages = new Set([
    "evaluation_planned",
    "evaluation_active",
    "outcome_review",
    "preference_card_progress",
    "adoption_expanding",
    "won",
  ]);
  return (opportunities ?? []).some((o) => {
    const s = normalizeSalesStage(String(o.stage ?? ""));
    return s != null && evalStages.has(s);
  });
}

function hasAdoptionOpportunity(opportunities?: Array<Record<string, unknown>>): boolean {
  return (opportunities ?? []).some((o) => {
    const s = normalizeSalesStage(String(o.stage ?? ""));
    return s === "preference_card_progress" || s === "adoption_expanding" || s === "won";
  });
}

/** Criteria that must all be met to enter each stage (stage 1 is the default floor). */
const STAGE_ENTRY_CRITERIA: Record<
  Exclude<ProviderIntelligenceMaturityStage, "early_discovery">,
  MaturityCriterionDef[]
> = {
  operationally_qualified: [
    { id: "procedure_focus", label: "Procedure focus mapped", dbKey: "provider_procedure_focus", sectionId: "clinical_workflow" },
    { id: "modality", label: "Modality preferences captured", dbKey: "provider_technique_preferences", sectionId: "clinical_workflow" },
    { id: "influence", label: "Commercial influence mapped", dbKey: "influence_level", sectionId: "relationship_intelligence" },
    {
      id: "engagement_style",
      label: "Engagement style or responsiveness known",
      dbKey: "provider_communication_style",
      sectionId: "relationship_intelligence",
    },
  ],
  observation_ready: [
    { id: "observation_allowed", label: "Observation allowed", dbKey: "provider_observation_feasibility", sectionId: "observation_readiness" },
    {
      id: "credentialing_understood",
      label: "Credentialing path understood",
      dbKey: "provider_observation_credentialing_needed",
      sectionId: "observation_readiness",
    },
    {
      id: "coordinator_identified",
      label: "Coordinator identified",
      dbKey: "provider_observation_coordinator_contact",
      sectionId: "observation_readiness",
    },
    {
      id: "target_procedures",
      label: "Target procedures mapped",
      dbKey: "provider_ideal_observation_cases",
      sectionId: "observation_readiness",
    },
  ],
  evaluation_active: [
    {
      id: "evaluation_openness",
      label: "Trial willingness captured",
      dbKey: "provider_evaluation_openness",
      sectionId: "commercial_signals",
    },
    {
      id: "competitive_landscape",
      label: "Competitive landscape mapped",
      dbKey: "provider_competitive_products",
      sectionId: "commercial_signals",
    },
    {
      id: "decision_path",
      label: "Decision role or champion mapped",
      dbKey: "provider_decision_maker_status",
      sectionId: "relationship_intelligence",
    },
  ],
  adoption_building: [
    {
      id: "preference_card",
      label: "Preference-card path understood",
      dbKey: "provider_preference_card_signals",
      sectionId: "commercial_signals",
    },
    {
      id: "champion",
      label: "Champion potential assessed",
      dbKey: "provider_champion_potential",
      sectionId: "relationship_intelligence",
    },
  ],
  strategic_account: [
    {
      id: "workflow_validated",
      label: "Clinical workflow validated",
      dbKey: "provider_procedure_focus",
      sectionId: "clinical_workflow",
    },
    {
      id: "observation_durable",
      label: "Observation readiness confirmed",
      dbKey: "provider_observation_feasibility",
      sectionId: "observation_readiness",
    },
    {
      id: "commercial_validated",
      label: "Commercial path validated",
      dbKey: "provider_evaluation_openness",
      sectionId: "commercial_signals",
    },
  ],
};

function evaluateCriterion(
  def: MaturityCriterionDef,
  ctx: ProviderIntelligenceMaturityContext,
): boolean {
  const { contact, planning, opportunities } = ctx;

  switch (def.id) {
    case "observation_allowed":
      return observationAllowed(contact);
    case "engagement_style":
      return (
        hasSignal(contact, "provider_communication_style") ||
        hasSignal(contact, "provider_responsiveness")
      );
    case "decision_path":
      return (
        hasSignal(contact, "provider_decision_maker_status") ||
        hasSignal(contact, "provider_champion_potential")
      );
    case "workflow_validated":
      return confidenceAtLeast(
        sectionConfidence("clinical_workflow", contact, planning),
        "confirmed",
      );
    case "observation_durable":
      return (
        observationAllowed(contact) &&
        confidenceAtLeast(sectionConfidence("observation_readiness", contact, planning), "confirmed")
      );
    case "commercial_validated":
      return confidenceAtLeast(
        sectionConfidence("commercial_signals", contact, planning),
        "confirmed",
      );
    default:
      if (def.dbKey) return hasSignal(contact, def.dbKey);
      return false;
  }
}

function evaluateStageEntry(
  stage: Exclude<ProviderIntelligenceMaturityStage, "early_discovery">,
  ctx: ProviderIntelligenceMaturityContext,
): MaturityCriterionStatus[] {
  return STAGE_ENTRY_CRITERIA[stage].map((def) => ({
    ...def,
    met: evaluateCriterion(def, ctx),
  }));
}

function stageFullyMet(
  stage: Exclude<ProviderIntelligenceMaturityStage, "early_discovery">,
  ctx: ProviderIntelligenceMaturityContext,
): boolean {
  return evaluateStageEntry(stage, ctx).every((c) => c.met);
}

function applyCommercialFloors(
  computed: ProviderIntelligenceMaturityStage,
  ctx: ProviderIntelligenceMaturityContext,
): ProviderIntelligenceMaturityStage {
  const relationshipStage = String(
    ctx.relationshipStage ?? ctx.contact.provider_relationship_stage ?? "prospect",
  )
    .trim()
    .toLowerCase();
  const commercial = resolveProviderCommercialWorkflowStage({
    relationshipStage,
    opportunities: ctx.opportunities,
    cases: ctx.cases,
    engagements: ctx.engagements,
  });

  let stage = computed;
  if (commercial === "observation" && MATURITY_RANK[stage] < MATURITY_RANK.observation_ready) {
    stage = "observation_ready";
  }
  if (commercial === "evaluation" && MATURITY_RANK[stage] < MATURITY_RANK.evaluation_active) {
    stage = "evaluation_active";
  }
  if (commercial === "adoption" && MATURITY_RANK[stage] < MATURITY_RANK.adoption_building) {
    stage = "adoption_building";
  }

  if (hasEvaluationOpportunity(ctx.opportunities) && MATURITY_RANK[stage] < MATURITY_RANK.evaluation_active) {
    stage = "evaluation_active";
  }
  if (hasAdoptionOpportunity(ctx.opportunities) && MATURITY_RANK[stage] < MATURITY_RANK.adoption_building) {
    stage = "adoption_building";
  }

  if (relationshipStage === "established_customer" && MATURITY_RANK[stage] < MATURITY_RANK.adoption_building) {
    stage = "adoption_building";
  }

  return stage;
}

export function resolveProviderIntelligenceMaturityStage(
  ctx: ProviderIntelligenceMaturityContext,
): ProviderIntelligenceMaturityStage {
  let stage: ProviderIntelligenceMaturityStage = "early_discovery";

  if (stageFullyMet("operationally_qualified", ctx)) {
    stage = "operationally_qualified";
  }
  if (stageFullyMet("observation_ready", ctx)) {
    stage = "observation_ready";
  }
  if (stageFullyMet("evaluation_active", ctx)) {
    stage = "evaluation_active";
  }
  if (stageFullyMet("adoption_building", ctx)) {
    stage = "adoption_building";
  }
  if (stageFullyMet("strategic_account", ctx)) {
    const clinical = sectionConfidence("clinical_workflow", ctx.contact, ctx.planning);
    const obs = sectionConfidence("observation_readiness", ctx.contact, ctx.planning);
    const commercial = sectionConfidence("commercial_signals", ctx.contact, ctx.planning);
    const hasHistory =
      (ctx.engagements?.length ?? 0) > 0 ||
      (ctx.cases?.length ?? 0) > 0 ||
      (ctx.opportunities?.length ?? 0) > 0;
    if (
      confidenceAtLeast(clinical, "validated") &&
      confidenceAtLeast(obs, "confirmed") &&
      confidenceAtLeast(commercial, "confirmed") &&
      hasHistory
    ) {
      stage = "strategic_account";
    }
  }

  return applyCommercialFloors(stage, ctx);
}

function nextMaturityStage(
  current: ProviderIntelligenceMaturityStage,
): ProviderIntelligenceMaturityStage | null {
  const idx = MATURITY_RANK[current];
  if (idx >= PROVIDER_INTELLIGENCE_MATURITY_STAGES.length - 1) return null;
  return PROVIDER_INTELLIGENCE_MATURITY_STAGES[idx + 1]!;
}

/** Whether all entry criteria for a maturity stage are satisfied. */
export function providerMaturityStageFullyMet(
  stage: Exclude<ProviderIntelligenceMaturityStage, "early_discovery">,
  ctx: ProviderIntelligenceMaturityContext,
): boolean {
  return stageFullyMet(stage, ctx);
}

export function providerMaturityStageCriteria(
  stage: Exclude<ProviderIntelligenceMaturityStage, "early_discovery">,
  ctx: ProviderIntelligenceMaturityContext,
): MaturityCriterionStatus[] {
  return evaluateStageEntry(stage, ctx);
}

/** Clinical workflow confirmed on file — "Workflow Validated" timeline phase. */
export function providerClinicalWorkflowValidated(
  ctx: ProviderIntelligenceMaturityContext,
): boolean {
  return confidenceAtLeast(
    sectionConfidence("clinical_workflow", ctx.contact, ctx.planning),
    "confirmed",
  );
}

export function buildProviderIntelligenceMaturitySnapshot(
  ctx: ProviderIntelligenceMaturityContext,
): ProviderIntelligenceMaturitySnapshot {
  const stage = resolveProviderIntelligenceMaturityStage(ctx);
  const nextStage = nextMaturityStage(stage);

  let nextStageCriteria: MaturityCriterionStatus[] = [];
  if (nextStage && nextStage !== "early_discovery") {
    nextStageCriteria = evaluateStageEntry(
      nextStage as Exclude<ProviderIntelligenceMaturityStage, "early_discovery">,
      ctx,
    );
  }

  const metCount = nextStageCriteria.filter((c) => c.met).length;
  const total = nextStageCriteria.length;
  const progressToNextPercent =
    total === 0 ? 100 : Math.round((metCount / total) * 100);

  const unmetNextDbKeys = nextStageCriteria
    .filter((c) => !c.met && c.dbKey)
    .map((c) => c.dbKey!);

  return {
    stage,
    stageLabel: PROVIDER_INTELLIGENCE_MATURITY_LABELS[stage],
    stageHint: PROVIDER_INTELLIGENCE_MATURITY_HINTS[stage],
    evolutionLine: PROVIDER_INTELLIGENCE_MATURITY_EVOLUTION[stage],
    stageIndex: MATURITY_RANK[stage],
    nextStageCriteria,
    nextStage,
    nextStageLabel: nextStage ? PROVIDER_INTELLIGENCE_MATURITY_LABELS[nextStage] : null,
    progressToNextPercent,
    unmetNextDbKeys,
  };
}

/** Discovery priority tiers keyed by maturity (tier 1 = highest). */
export const MATURITY_DISCOVERY_PRIORITY_TIERS: Record<
  ProviderIntelligenceMaturityStage,
  readonly [readonly string[], readonly string[], readonly string[]]
> = {
  early_discovery: [
    ["provider_communication_style", "influence_level", "provider_responsiveness"],
    ["provider_procedure_focus", "provider_technique_preferences", "provider_workflow_pain_points"],
    ["provider_observation_feasibility", "provider_observation_credentialing_needed"],
  ],
  operationally_qualified: [
    ["provider_observation_feasibility", "provider_credentialing_status", "provider_or_team_dynamics"],
    ["provider_observation_coordinator_contact", "provider_ideal_observation_cases"],
    ["provider_observation_access_path", "provider_case_volume_estimate"],
  ],
  observation_ready: [
    ["provider_observation_access_path", "provider_observation_best_days_case_types"],
    ["provider_observation_cadence_preference", "provider_first_observation_questions"],
    ["provider_workflow_pain_points", "provider_technique_detail"],
  ],
  evaluation_active: [
    ["provider_evaluation_openness", "provider_competitive_products", "provider_technique_detail"],
    ["provider_decision_maker_status", "influence_level", "provider_champion_potential"],
    ["provider_preference_card_signals", "provider_dissatisfaction_areas"],
  ],
  adoption_building: [
    ["provider_preference_card_signals", "provider_current_vendors"],
    ["provider_champion_potential", "provider_support_expectations"],
    ["provider_dissatisfaction_areas", "provider_follow_up_approach"],
  ],
  strategic_account: [
    ["provider_follow_up_approach", "provider_case_volume_estimate"],
    ["provider_dissatisfaction_areas", "provider_observation_cadence_preference"],
    ["provider_first_observation_questions"],
  ],
};

export function maturityPriorityBoostForField(
  dbKey: string,
  maturity: ProviderIntelligenceMaturityStage,
): { boost: number; tier: 1 | 2 | 3 | null } {
  const tiers = MATURITY_DISCOVERY_PRIORITY_TIERS[maturity];
  const TIER_SCORE_BASE = [3200, 2100, 1000] as const;
  for (let t = 0; t < tiers.length; t++) {
    const list = tiers[t]!;
    const idx = list.indexOf(dbKey);
    if (idx >= 0) {
      return { boost: TIER_SCORE_BASE[t]! - idx * 12, tier: (t + 1) as 1 | 2 | 3 };
    }
  }
  if (
    maturity !== "early_discovery" &&
    intelligenceSectionIdForDbKey(dbKey) === "observation_readiness" &&
    maturity === "observation_ready"
  ) {
    return { boost: 400, tier: 3 };
  }
  return { boost: 0, tier: null };
}

/** Prioritize unmet next-stage criteria in capture queues. */
export function maturityCaptureScoreBoost(
  dbKey: string,
  snapshot: ProviderIntelligenceMaturitySnapshot,
): number {
  const idx = snapshot.unmetNextDbKeys.indexOf(dbKey);
  if (idx === 0) return 120;
  if (idx === 1) return 80;
  if (idx >= 2) return 50;
  return 0;
}

/** Competitive / incumbent mapping — evaluation-stage and later only. */
export const COMPETITIVE_INTELLIGENCE_FIELD_KEYS = VENDOR_FOOTPRINT_DISCOVERY_FIELD_KEYS;

export function isCompetitiveIntelligenceFieldVisibleForMaturityStage(
  dbKey: string,
  stage: ProviderIntelligenceMaturityStage,
): boolean {
  if (!isVendorFootprintDiscoveryField(dbKey)) {
    return true;
  }
  return isVendorFootprintDiscoveryVisibleForMaturityStage(dbKey, stage);
}

export function isIntelligenceSectionVisibleForMaturityStage(
  sectionId: ProviderIntelligenceSectionId,
  stage: ProviderIntelligenceMaturityStage,
): boolean {
  switch (stage) {
    case "early_discovery":
      return sectionId === "observation_readiness" || sectionId === "clinical_workflow";
    case "operationally_qualified":
      return (
        sectionId === "clinical_workflow" ||
        sectionId === "or_environment" ||
        sectionId === "observation_readiness"
      );
    case "observation_ready":
      return (
        sectionId === "observation_readiness" ||
        sectionId === "clinical_workflow" ||
        sectionId === "or_environment"
      );
    case "evaluation_active":
      return sectionId === "commercial_signals" || sectionId === "relationship_intelligence";
    case "adoption_building":
      return (
        sectionId === "commercial_signals" ||
        sectionId === "relationship_intelligence" ||
        sectionId === "clinical_workflow"
      );
    case "strategic_account":
      return true;
    default:
      return true;
  }
}

export function maturityEvolutionBrief(snapshot: ProviderIntelligenceMaturitySnapshot): string {
  if (!snapshot.nextStage || snapshot.nextStageCriteria.length === 0) {
    return snapshot.evolutionLine;
  }
  const unmet = snapshot.nextStageCriteria.filter((c) => !c.met);
  if (unmet.length === 0) {
    return `Advancing to ${snapshot.nextStageLabel} — criteria in shape`;
  }
  const first = unmet[0]!.label.toLowerCase();
  return `${snapshot.stageLabel} · next: ${first}`;
}
