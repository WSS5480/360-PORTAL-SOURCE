import { normalizeSalesStage, salesStageLabel, type SalesStage } from "@/lib/sales/stages";
import { buildProviderNextDiscoveryPriorities } from "@/lib/surgical-sales/buildProviderNextDiscoveryPriorities";
import type { EngagementPreparationContextState } from "@/lib/surgical-sales/engagements/engagementPreparationContextState";
import { normalizeEngagementType, type EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { PrepareRisksBarriers } from "@/lib/surgical-sales/engagements/prepareForMeetingRisksBarriers";
import type { PrepareRecommendedNextActions } from "@/lib/surgical-sales/engagements/prepareForMeetingRecommendedNextAction";
import type { PrepareSuggestedGoal } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedGoal";
import {
  deriveIntelligenceSectionConfidence,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import { buildProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import {
  PREPARE_TODAY_LINE_LABELS,
  TACTICAL_PRIORITIES_TITLE,
} from "@/lib/surgical-sales/engagements/prepareFlowTerminology";
import { INTRO_CALL_START_MISSION_OBJECTIVE } from "@/lib/surgical-sales/engagements/startMissionConfig";

export const PREPARE_WHAT_MATTERS_MOST_TITLE = TACTICAL_PRIORITIES_TITLE;

export type PrepareWhatMattersMostLineId =
  | "discovery_goal"
  | "important_unknown"
  | "relationship_risk"
  | "next_step_opportunity";

export type PrepareWhatMattersMostLine = {
  id: PrepareWhatMattersMostLineId;
  label: string;
  value: string;
};

export type PrepareWhatMattersMost = {
  title: string;
  lines: PrepareWhatMattersMostLine[];
};

const LINE_LABELS = PREPARE_TODAY_LINE_LABELS;

const RISK_KEY_PRIORITY: string[] = [
  "do_not_contact",
  "weak_relationship",
  "limited_or_access",
  "follow_up_overdue",
  "evaluation_stalled",
  "skeptical_switching",
  "competitor_loyalty",
  "pricing_concern",
  "workflow_disruption",
];

const STAGE_NEXT_HINT: Partial<Record<SalesStage, string>> = {
  discovery: "Open the observation path while access is fresh",
  clinical_validation: "Earn clinical proof before the committee step",
  evaluation_planned: "Confirm first evaluation case timing",
  evaluation_active: "Address operational risk on the active evaluation",
  outcome_review: "Translate case outcomes into the next adoption step",
  preference_card_progress: "Align preference-card owners and go-live date",
};

function clampLine(text: string, max = 118): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function pickTopRisk(risks: PrepareRisksBarriers): string | null {
  if (!risks.risks.length) return null;
  for (const key of RISK_KEY_PRIORITY) {
    const hit = risks.risks.find((r) => r.key === key);
    if (hit) return hit.label;
  }
  return risks.risks[0]?.label ?? null;
}

function relationshipRiskFallback(provider: Record<string, unknown> | null): string | null {
  const strength = String(provider?.relationship_strength ?? "").trim().toLowerCase();
  if (strength === "weak" || strength === "unknown") {
    return "Early relationship — keep the ask small and earn trust before evaluation";
  }
  const stage = String(provider?.provider_relationship_stage ?? "").trim().toLowerCase();
  if (stage === "prospect") {
    return "Still prospect-stage — confirm champion and access path before advancing";
  }
  return null;
}

function observationUnknownFallback(
  provider: Record<string, unknown> | null,
  prepContextState: EngagementPreparationContextState,
): string | null {
  if (!provider) return null;
  const confidence = deriveIntelligenceSectionConfidence("observation_readiness", provider).confidence;
  if (confidence === "unknown" || confidence === "partial") {
    if (prepContextState === "observation_support" || prepContextState === "evaluation_planning") {
      return "Confirm OR support logistics and who owns observation approval";
    }
    return "Determine whether observation access is realistic at this site";
  }
  return null;
}

function pickImportantUnknown(input: {
  provider: Record<string, unknown> | null;
  providerSpecialty: string | null;
  opportunity: { stage?: string | null } | null;
  talkingPoints: string[];
  prepContextState: EngagementPreparationContextState;
}): string {
  if (input.provider) {
    const snap = buildProviderIntelligenceSnapshot(
      input.provider,
      String(input.provider.id ?? ""),
    );
    const priorities = buildProviderNextDiscoveryPriorities({
      contact: input.provider,
      planning: snap.planning,
      specialty: input.providerSpecialty,
      relationshipStage: String(input.provider.provider_relationship_stage ?? ""),
      opportunities: input.opportunity ? [input.opportunity as Record<string, unknown>] : [],
      maxItems: 1,
    });
    if (priorities[0]?.headline) {
      return clampLine(priorities[0].headline);
    }
  }

  const question = input.talkingPoints.find((p) => p.trim().endsWith("?"));
  if (question) return clampLine(question);

  const obsFallback = observationUnknownFallback(input.provider, input.prepContextState);
  if (obsFallback) return obsFallback;

  if (input.prepContextState === "product_exploration") {
    return "Validate procedural workflow fit before pursuing observation or evaluation";
  }
  if (input.prepContextState === "evaluation_planning") {
    return "Lock evaluation case profile, stakeholders, and OR support";
  }

  return "Map highest-volume procedures and who controls observation access";
}

function pickNextStepOpportunity(input: {
  nextActions: PrepareRecommendedNextActions;
  opportunityStage: SalesStage | null;
  engagementType: EngagementType | null;
  prepContextState: EngagementPreparationContextState;
}): string {
  const action = input.nextActions.actions[0]?.trim();
  const stageHint = input.opportunityStage ? STAGE_NEXT_HINT[input.opportunityStage] : null;

  if (action && stageHint) {
    return clampLine(`${action} — ${stageHint}`);
  }
  if (action) return clampLine(action);

  const cta = input.nextActions.primary_cta.label?.trim();
  if (cta) return clampLine(cta);

  if (input.engagementType === "observation_request" || input.prepContextState === "observation_support") {
    return "Confirm coordinator sign-off and schedule the observation window";
  }
  if (input.prepContextState === "evaluation_planning") {
    return "Document evaluation case criteria and purchasing path after the visit";
  }

  return "Continue mapping and create a dated follow-up task before leaving";
}

function pickDiscoveryGoal(
  suggestedGoal: PrepareSuggestedGoal,
  prepContextState: EngagementPreparationContextState,
  engagementType: EngagementType | null,
): string {
  if (engagementType === "intro_call") {
    return INTRO_CALL_START_MISSION_OBJECTIVE;
  }
  const goal = suggestedGoal.goal?.trim();
  if (goal) return clampLine(goal);

  if (prepContextState === "evaluation_planning") {
    return "Leave with a concrete evaluation pathway, not open-ended discovery";
  }
  if (prepContextState === "observation_support") {
    return "Support the active case path and remove barriers to the next adoption step";
  }
  return "Establish whether this provider merits deeper commercialization investment";
}

export function buildPrepareWhatMattersMost(input: {
  engagementType: string;
  opportunityStage: string | null;
  providerSpecialty: string | null;
  provider: Record<string, unknown> | null;
  opportunity: { stage?: string | null; product_line?: string | null } | null;
  prepContextState: EngagementPreparationContextState;
  suggestedGoal: PrepareSuggestedGoal;
  talkingPoints: string[];
  risks: PrepareRisksBarriers;
  nextActions: PrepareRecommendedNextActions;
}): PrepareWhatMattersMost {
  const engagementType = normalizeEngagementType(input.engagementType) || null;
  const stage = normalizeSalesStage(input.opportunityStage);

  const discoveryGoal = pickDiscoveryGoal(input.suggestedGoal, input.prepContextState, engagementType);
  const importantUnknown = pickImportantUnknown({
    provider: input.provider,
    providerSpecialty: input.providerSpecialty,
    opportunity: input.opportunity,
    talkingPoints: input.talkingPoints,
    prepContextState: input.prepContextState,
  });

  const relationshipRisk =
    pickTopRisk(input.risks) ??
    relationshipRiskFallback(input.provider) ??
    (stage
      ? `Opportunity at ${salesStageLabel(stage)} — confirm operational risk before expanding the ask`
      : "No major flags on file — validate relationship temperature on site");

  const nextStep = pickNextStepOpportunity({
    nextActions: input.nextActions,
    opportunityStage: stage,
    engagementType,
    prepContextState: input.prepContextState,
  });

  const lines: PrepareWhatMattersMostLine[] = [
    { id: "discovery_goal", label: LINE_LABELS.discovery_goal, value: discoveryGoal },
    { id: "important_unknown", label: LINE_LABELS.important_unknown, value: importantUnknown },
    { id: "relationship_risk", label: LINE_LABELS.relationship_risk, value: clampLine(relationshipRisk) },
    { id: "next_step_opportunity", label: LINE_LABELS.next_step_opportunity, value: nextStep },
  ];

  return { title: PREPARE_WHAT_MATTERS_MOST_TITLE, lines };
}
