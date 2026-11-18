/**
 * Unified operational readiness engine — seven inputs, one field-realistic verdict.
 */

import { normalizeSalesStage, type SalesStage } from "@/lib/sales/stages";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderObservationFeasibilitySummary } from "@/lib/surgical-sales/buildProviderObservationFeasibilitySummary";
import type { ProtectFieldTimeAssessment } from "@/lib/surgical-sales/buildProtectFieldTimeAssessment";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import {
  OPERATIONAL_READINESS_ENGINE_KICKER,
  OPERATIONAL_READINESS_ENGINE_TITLE,
  OPERATIONAL_READINESS_INPUT_LABELS,
  OPERATIONAL_READINESS_VERDICT_LABELS,
  OPERATIONAL_READINESS_VERDICT_SCANS,
  type OperationalReadinessInputId,
  type OperationalReadinessVerdictId,
} from "@/lib/surgical-sales/providerOperationalReadinessVocabulary";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import type {
  OperationalReadinessPillarAssessment,
  OperationalReadinessPillarPosture,
} from "@/lib/surgical-sales/buildProviderOperationalReadinessFramework";

export type OperationalReadinessVerdictTone =
  | "blocked"
  | "warn"
  | "caution"
  | "success"
  | "neutral";

export type OperationalReadinessVerdict = {
  id: OperationalReadinessVerdictId;
  label: string;
  scan: string;
  tone: OperationalReadinessVerdictTone;
  /** Primary gaps holding the account at this verdict (not a score). */
  blockers: string[];
  /** What must improve to reach the next verdict. */
  nextVerdictLabel: string | null;
};

export type ProviderOperationalReadinessEngineResult = {
  title: string;
  kicker: string;
  verdict: OperationalReadinessVerdict;
  inputs: OperationalReadinessPillarAssessment[];
};

const POSTURE_RANK: Record<OperationalReadinessPillarPosture, number> = {
  blocked: 0,
  thin: 1,
  forming: 2,
  validated: 3,
};

const VERDICT_RANK: Record<OperationalReadinessVerdictId, number> = {
  not_viable_yet: 0,
  observation_possible_with_risk: 1,
  operationally_qualified: 2,
  evaluation_ready: 3,
  commercial_expansion_candidate: 4,
};

const NEXT_VERDICT: Partial<Record<OperationalReadinessVerdictId, OperationalReadinessVerdictId>> = {
  not_viable_yet: "observation_possible_with_risk",
  observation_possible_with_risk: "operationally_qualified",
  operationally_qualified: "evaluation_ready",
  evaluation_ready: "commercial_expansion_candidate",
};

const EVALUATION_OPPORTUNITY_STAGES = new Set<SalesStage>([
  "clinical_validation",
  "evaluation_planned",
  "evaluation_active",
  "outcome_review",
]);

const ADOPTION_OPPORTUNITY_STAGES = new Set<SalesStage>([
  "preference_card_progress",
  "adoption_expanding",
  "won",
]);

function pillar(
  inputs: OperationalReadinessPillarAssessment[],
  id: OperationalReadinessInputId,
): OperationalReadinessPillarAssessment {
  return inputs.find((p) => p.id === id)!;
}

function opportunitiesInStages(
  opportunities: Array<Record<string, unknown>> | undefined,
  stages: Set<SalesStage>,
): boolean {
  return (opportunities ?? []).some((o) => {
    const stage = normalizeSalesStage(String(o.stage || ""));
    return stage != null && stages.has(stage);
  });
}

function toneForVerdict(id: OperationalReadinessVerdictId): OperationalReadinessVerdictTone {
  if (id === "not_viable_yet") return "blocked";
  if (id === "observation_possible_with_risk") return "warn";
  if (id === "operationally_qualified") return "caution";
  if (id === "evaluation_ready") return "success";
  return "success";
}

function collectBlockers(inputs: OperationalReadinessPillarAssessment[], max = 4): string[] {
  const lines: string[] = [];
  for (const p of inputs) {
    if (p.posture === "blocked" || p.posture === "thin") {
      for (const b of p.blockers) {
        if (b && !lines.includes(b)) lines.push(b);
      }
      if (lines.length >= max) break;
      if (p.posture === "thin" && lines.length < max) {
        lines.push(p.scanLine);
      }
    }
  }
  return lines.slice(0, max);
}

function countByPosture(
  inputs: OperationalReadinessPillarAssessment[],
  minimumRank: number,
): number {
  return inputs.filter((p) => POSTURE_RANK[p.posture] >= minimumRank).length;
}

function meetsOperationallyQualified(inputs: OperationalReadinessPillarAssessment[]): boolean {
  const or = pillar(inputs, "or_access_maturity");
  const workflow = pillar(inputs, "workflow_intelligence");
  const relationship = pillar(inputs, "relationship_mapping");
  const scheduling = pillar(inputs, "scheduling_clarity");
  const procedural = pillar(inputs, "procedural_alignment");
  const vendor = pillar(inputs, "vendor_pathway");

  if (or.posture === "blocked" || vendor.posture === "blocked" || relationship.posture === "blocked") {
    return false;
  }
  if (or.posture === "thin" && workflow.posture === "thin") return false;

  const coreMapped =
    POSTURE_RANK[or.posture] >= POSTURE_RANK.forming &&
    POSTURE_RANK[workflow.posture] >= POSTURE_RANK.forming &&
    POSTURE_RANK[relationship.posture] >= POSTURE_RANK.forming &&
    POSTURE_RANK[scheduling.posture] >= POSTURE_RANK.forming &&
    POSTURE_RANK[procedural.posture] >= POSTURE_RANK.forming;

  return coreMapped;
}

function meetsEvaluationReady(
  inputs: OperationalReadinessPillarAssessment[],
  commercialStage: ProviderCommercialWorkflowStage,
  opportunities?: Array<Record<string, unknown>>,
): boolean {
  if (!meetsOperationallyQualified(inputs)) return false;

  const or = pillar(inputs, "or_access_maturity");
  const workflow = pillar(inputs, "workflow_intelligence");
  const procedural = pillar(inputs, "procedural_alignment");
  const commercial = pillar(inputs, "commercialization_influence");
  const vendor = pillar(inputs, "vendor_pathway");

  const clinicalReady =
    POSTURE_RANK[workflow.posture] >= POSTURE_RANK.forming &&
    POSTURE_RANK[procedural.posture] >= POSTURE_RANK.forming;
  const accessReady = POSTURE_RANK[or.posture] >= POSTURE_RANK.forming;
  const commercialReady = POSTURE_RANK[commercial.posture] >= POSTURE_RANK.forming;
  const vendorClear = vendor.posture !== "blocked";

  const stageAllows =
    commercialStage === "evaluation" ||
    commercialStage === "adoption" ||
    opportunitiesInStages(opportunities, EVALUATION_OPPORTUNITY_STAGES);

  return clinicalReady && accessReady && commercialReady && vendorClear && stageAllows;
}

function meetsCommercialExpansion(
  inputs: OperationalReadinessPillarAssessment[],
  commercialStage: ProviderCommercialWorkflowStage,
  opportunities?: Array<Record<string, unknown>>,
): boolean {
  if (!meetsEvaluationReady(inputs, commercialStage, opportunities)) return false;

  const commercial = pillar(inputs, "commercialization_influence");
  const relationship = pillar(inputs, "relationship_mapping");

  const adoptionMotion =
    commercialStage === "adoption" ||
    opportunitiesInStages(opportunities, ADOPTION_OPPORTUNITY_STAGES);

  return (
    adoptionMotion &&
    POSTURE_RANK[commercial.posture] >= POSTURE_RANK.validated &&
    POSTURE_RANK[relationship.posture] >= POSTURE_RANK.forming
  );
}

export function resolveOperationalReadinessVerdict(input: {
  inputs: OperationalReadinessPillarAssessment[];
  observationSummary: ProviderObservationFeasibilitySummary;
  commercialStage: ProviderCommercialWorkflowStage;
  protectFieldTime: ProtectFieldTimeAssessment;
  opportunities?: Array<Record<string, unknown>>;
}): OperationalReadinessVerdict {
  const { inputs, observationSummary, commercialStage, protectFieldTime, opportunities } = input;
  const or = pillar(inputs, "or_access_maturity");
  const vendor = pillar(inputs, "vendor_pathway");
  const relationship = pillar(inputs, "relationship_mapping");

  let id: OperationalReadinessVerdictId;

  if (meetsCommercialExpansion(inputs, commercialStage, opportunities)) {
    id = "commercial_expansion_candidate";
  } else if (meetsEvaluationReady(inputs, commercialStage, opportunities)) {
    id = "evaluation_ready";
  } else if (meetsOperationallyQualified(inputs)) {
    const highFieldRisk =
      protectFieldTime.posture === "protect_field_time" ||
      protectFieldTime.posture === "hold_field_time" ||
      protectFieldTime.overallLevel === "critical";
    const restrictedObs =
      observationSummary.verdictId === "feasible_with_restrictions" ||
      observationSummary.verdictId === "blockers_identified";
    const thinCount = inputs.filter((p) => p.posture === "thin").length;

    if (highFieldRisk || (restrictedObs && or.posture !== "validated") || thinCount >= 3) {
      id = "observation_possible_with_risk";
    } else {
      id = "operationally_qualified";
    }
  } else if (
    or.posture === "blocked" ||
    vendor.posture === "blocked" ||
    relationship.posture === "blocked" ||
    observationSummary.verdictId === "blockers_identified" ||
    countByPosture(inputs, POSTURE_RANK.forming) < 3
  ) {
    if (
      or.posture !== "blocked" &&
      observationSummary.verdictId !== "blockers_identified" &&
      countByPosture(inputs, POSTURE_RANK.thin) < 5 &&
      (or.posture === "forming" ||
        POSTURE_RANK[pillar(inputs, "workflow_intelligence").posture] >= POSTURE_RANK.thin)
    ) {
      id = "observation_possible_with_risk";
    } else {
      id = "not_viable_yet";
    }
  } else {
    id = "observation_possible_with_risk";
  }

  const nextId = NEXT_VERDICT[id];
  const blockers = collectBlockers(inputs);
  if (protectFieldTime.topThreat && id !== "commercial_expansion_candidate") {
    blockers.unshift(`${protectFieldTime.topThreat.label}: ${scanLine(protectFieldTime.topThreat.scan, 56)}`);
  }

  return {
    id,
    label: OPERATIONAL_READINESS_VERDICT_LABELS[id],
    scan: scanLine(OPERATIONAL_READINESS_VERDICT_SCANS[id], 120),
    tone: toneForVerdict(id),
    blockers: blockers.slice(0, 4),
    nextVerdictLabel: nextId ? OPERATIONAL_READINESS_VERDICT_LABELS[nextId] : null,
  };
}

export function buildProviderOperationalReadinessEngine(input: {
  inputs: OperationalReadinessPillarAssessment[];
  observationSummary: ProviderObservationFeasibilitySummary;
  commercialStage: ProviderCommercialWorkflowStage;
  protectFieldTime: ProtectFieldTimeAssessment;
  opportunities?: Array<Record<string, unknown>>;
}): ProviderOperationalReadinessEngineResult {
  const verdict = resolveOperationalReadinessVerdict(input);

  return {
    title: OPERATIONAL_READINESS_ENGINE_TITLE,
    kicker: OPERATIONAL_READINESS_ENGINE_KICKER,
    verdict,
    inputs: input.inputs.map((p) => ({
      ...p,
      label: OPERATIONAL_READINESS_INPUT_LABELS[p.id as OperationalReadinessInputId] ?? p.label,
    })),
  };
}

export function verdictRank(id: OperationalReadinessVerdictId): number {
  return VERDICT_RANK[id];
}
