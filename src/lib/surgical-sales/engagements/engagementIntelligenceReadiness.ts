import type { EngagementPreparationStatus } from "@/lib/surgical-sales/engagements/engagementPreparationStatus";
import {
  normalizeEngagementType,
  type EngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import type { EngagementPlanProgress } from "@/lib/surgical-sales/engagements/engagementOperationalBanner";
import { intelligenceContextualCaptureCta } from "@/lib/surgical-sales/providerIntelligenceContextualCtas";
import { intelligenceFieldDisplayName } from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import {
  buildIntelligenceLearningGaps,
  type IntelligenceLearningGap,
} from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  isIntelligenceSectionVisibleForCommercialStage,
  resolveProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  isObservationAccessConditionallyAllowed,
  observationFeasibilityToken,
} from "@/lib/surgical-sales/observationAccessWorkflowState";

/** Engagement types where open intelligence is expected to grow during the touch. */
export const EARLY_DISCOVERY_ENGAGEMENT_TYPES: ReadonlySet<EngagementType> = new Set([
  "intro_call",
  "follow_up",
  "office_visit_360",
  "reactivation",
]);

/** Field execution — OR access, credentialing, and scheduling gates can block readiness. */
export const FIELD_EXECUTION_ENGAGEMENT_TYPES: ReadonlySet<EngagementType> = new Set([
  "observation_request",
  "or_visit",
  "product_demo",
  "in_service_training",
  "post_case_follow_up",
]);

/** Must be confirmed before OR / observation touches — never "CRM homework." */
export const PRE_VISIT_CRITICAL_DB_KEYS: ReadonlySet<string> = new Set([
  "provider_observation_feasibility",
  "provider_observation_credentialing_needed",
  "provider_observation_access_path",
  "provider_observation_coordinator_contact",
  "provider_credentialing_status",
  "provider_ideal_observation_cases",
  "provider_observation_best_days_case_types",
  "provider_observation_cadence_preference",
]);

/** Intended to learn during the touch — do not reduce readiness. */
export const DISCOVERY_OBJECTIVE_DB_KEYS: ReadonlySet<string> = new Set([
  "provider_procedure_focus",
  "provider_technique_preferences",
  "provider_technique_detail",
  "provider_workflow_pain_points",
  "provider_case_volume_estimate",
  "provider_or_team_dynamics",
  "provider_current_vendors",
  "provider_support_expectations",
  "provider_communication_style",
  "provider_responsiveness",
  "influence_level",
  "provider_decision_maker_status",
  "provider_champion_potential",
  "provider_follow_up_approach",
  "provider_evaluation_openness",
  "provider_competitive_products",
  "provider_dissatisfaction_areas",
  "provider_preference_card_signals",
  "provider_first_observation_questions",
]);

export type EngagementPreVisitBlocker = {
  dbKey: string;
  label: string;
  actionLabel: string;
  href: string | null;
};

export type EngagementDiscoveryObjective = {
  dbKey: string;
  label: string;
  summary: string;
};

export type EngagementIntelligenceReadiness = {
  preVisitBlockers: EngagementPreVisitBlocker[];
  discoveryObjectives: EngagementDiscoveryObjective[];
  preVisitBlockerCount: number;
  discoveryObjectiveCount: number;
};

export function isEarlyDiscoveryEngagementType(engagementType: string): boolean {
  const t = normalizeEngagementType(engagementType);
  return Boolean(t && EARLY_DISCOVERY_ENGAGEMENT_TYPES.has(t));
}

export function isFieldExecutionEngagementType(engagementType: string): boolean {
  const t = normalizeEngagementType(engagementType);
  return Boolean(t && FIELD_EXECUTION_ENGAGEMENT_TYPES.has(t));
}

export function isPreVisitCriticalDbKey(dbKey: string, engagementType: string): boolean {
  if (isEarlyDiscoveryEngagementType(engagementType)) return false;
  if (!isFieldExecutionEngagementType(engagementType)) {
    return PRE_VISIT_CRITICAL_DB_KEYS.has(dbKey);
  }
  return PRE_VISIT_CRITICAL_DB_KEYS.has(dbKey);
}

export function isDiscoveryObjectiveDbKey(dbKey: string): boolean {
  return DISCOVERY_OBJECTIVE_DB_KEYS.has(dbKey);
}

export function classifyIntelligenceGap(
  gap: IntelligenceLearningGap,
  engagementType: string,
): "pre_visit_blocker" | "discovery_objective" | "other" {
  if (isPreVisitCriticalDbKey(gap.dbKey, engagementType)) return "pre_visit_blocker";
  if (isDiscoveryObjectiveDbKey(gap.dbKey) || isEarlyDiscoveryEngagementType(engagementType)) {
    return "discovery_objective";
  }
  return "discovery_objective";
}

function blockerDisplayLabel(dbKey: string): string {
  const name = intelligenceFieldDisplayName(dbKey);
  const short: Record<string, string> = {
    provider_observation_access_path: "OR access path",
    provider_observation_coordinator_contact: "Scheduling owner",
    provider_credentialing_status: "Credentialing requirements",
    provider_observation_feasibility: "Observation feasibility",
    provider_observation_credentialing_needed: "Observation credentialing rules",
    provider_ideal_observation_cases: "Observable procedures",
    provider_observation_best_days_case_types: "Bookable case days",
    provider_observation_cadence_preference: "OR posting rhythm",
  };
  return short[dbKey] ?? name;
}

function blockerActionLabel(dbKey: string): string {
  const cta = intelligenceContextualCaptureCta(dbKey);
  if (dbKey === "provider_observation_coordinator_contact") return "Add contact";
  if (/confirm/i.test(cta)) return "Resolve";
  return cta.length > 28 ? "Resolve" : cta;
}

export function buildProviderIntelligenceCaptureHref(
  providerId: string,
  dbKey?: string,
): string {
  const base = `/portal/sales/providers/${encodeURIComponent(providerId)}?tab=intelligence`;
  return dbKey ? `${base}&focus=${encodeURIComponent(dbKey)}` : base;
}

export function listEngagementIntelligenceGaps(
  provider: Record<string, unknown> | null | undefined,
): IntelligenceLearningGap[] {
  if (!provider) return [];
  const commercialStage = resolveProviderCommercialWorkflowStage({
    relationshipStage: provider.relationship_stage as string | null | undefined,
  });
  const gaps = buildIntelligenceLearningGaps(provider, null, 24);
  return gaps.filter((g) =>
    isIntelligenceSectionVisibleForCommercialStage(g.sectionId, commercialStage),
  );
}

const PARTIAL_ACCESS_GATE_DB_KEYS = [
  "provider_observation_feasibility",
  "provider_observation_access_path",
  "provider_observation_coordinator_contact",
  "provider_observation_credentialing_needed",
  "provider_credentialing_status",
] as const;

function providerHasPartialObservationAccessIntel(contact: Record<string, unknown>): boolean {
  if (hasProviderObservationApprovalValidated(contact)) return false;
  const token = observationFeasibilityToken(contact);
  if (token === "interested" || token === "mentioned") return true;
  return isObservationAccessConditionallyAllowed(contact);
}

function appendUnapprovedObservationGateBlockers(input: {
  contact: Record<string, unknown>;
  engagementType: string;
  preVisitBlockers: EngagementPreVisitBlocker[];
  maxBlockers: number;
  providerId: string | null;
}): void {
  if (hasProviderObservationApprovalValidated(input.contact)) return;

  const type = normalizeEngagementType(input.engagementType);
  const augmentEarlyDiscovery =
    type === "follow_up" || type === "office_visit_360";
  const augmentFieldExecution = isFieldExecutionEngagementType(input.engagementType);

  if (!augmentEarlyDiscovery && !augmentFieldExecution) return;
  if (augmentEarlyDiscovery && !providerHasPartialObservationAccessIntel(input.contact)) return;

  const push = (dbKey: string) => {
    if (input.preVisitBlockers.length >= input.maxBlockers) return;
    if (input.preVisitBlockers.some((b) => b.dbKey === dbKey)) return;
    if (
      augmentEarlyDiscovery &&
      fieldHasIntelligenceSignal(dbKey, input.contact[dbKey] as string | null | undefined)
    ) {
      return;
    }
    input.preVisitBlockers.push({
      dbKey,
      label: blockerDisplayLabel(dbKey),
      actionLabel: blockerActionLabel(dbKey),
      href: input.providerId ? buildProviderIntelligenceCaptureHref(input.providerId, dbKey) : null,
    });
  };

  if (augmentFieldExecution) {
    push("provider_observation_feasibility");
  }

  for (const dbKey of PARTIAL_ACCESS_GATE_DB_KEYS) {
    if (dbKey === "provider_observation_feasibility" && !augmentFieldExecution) continue;
    if (
      !fieldHasIntelligenceSignal(dbKey, input.contact[dbKey] as string | null | undefined)
    ) {
      push(dbKey);
    }
  }
}

export function buildEngagementIntelligenceReadiness(params: {
  provider: Record<string, unknown> | null | undefined;
  engagementType: string;
  providerId?: string | null;
  maxBlockers?: number;
  maxObjectives?: number;
}): EngagementIntelligenceReadiness {
  const gaps = listEngagementIntelligenceGaps(params.provider);
  const providerId = params.providerId ?? (params.provider?.id ? String(params.provider.id) : null);
  const maxBlockers = params.maxBlockers ?? 4;
  const maxObjectives = params.maxObjectives ?? 5;

  const preVisitBlockers: EngagementPreVisitBlocker[] = [];
  const discoveryObjectives: EngagementDiscoveryObjective[] = [];

  for (const gap of gaps) {
    const kind = classifyIntelligenceGap(gap, params.engagementType);
    if (kind === "pre_visit_blocker" && preVisitBlockers.length < maxBlockers) {
      preVisitBlockers.push({
        dbKey: gap.dbKey,
        label: blockerDisplayLabel(gap.dbKey),
        actionLabel: blockerActionLabel(gap.dbKey),
        href: providerId ? buildProviderIntelligenceCaptureHref(providerId, gap.dbKey) : null,
      });
    } else if (kind === "discovery_objective" && discoveryObjectives.length < maxObjectives) {
      discoveryObjectives.push({
        dbKey: gap.dbKey,
        label: intelligenceFieldDisplayName(gap.dbKey),
        summary: gap.phrase,
      });
    }
  }

  if (params.provider) {
    appendUnapprovedObservationGateBlockers({
      contact: params.provider,
      engagementType: params.engagementType,
      preVisitBlockers,
      maxBlockers,
      providerId,
    });
  }

  return {
    preVisitBlockers,
    discoveryObjectives,
    preVisitBlockerCount: preVisitBlockers.length,
    discoveryObjectiveCount: discoveryObjectives.length,
  };
}

/** @deprecated Use preVisitBlockerCount — only critical gaps block readiness */
export function countEngagementPreVisitBlockers(
  provider: Record<string, unknown> | null | undefined,
  engagementType: string,
): number {
  return buildEngagementIntelligenceReadiness({ provider, engagementType }).preVisitBlockerCount;
}
