/**
 * Mission progress — commercial advancement independent of intelligence completeness.
 * Driven by execution milestones, not field capture requirements.
 */

import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import { hasProviderObservationApprovalOnFile } from "@/lib/surgical-sales/providerObservationApproval";
import {
  countObservedProcedures,
  hasDebriefCompleted,
  hasExplicitProviderCommitment,
  hasObservationApproved,
  hasProductFitSignal,
  isCommitmentStageComplete,
  type PathwayGateInput,
} from "@/lib/surgical-sales/pathwayStageGates";
import {
  SALES_PATHWAY_REQUIRED_STAGE_GATES,
  type PathwayHardGateBlocker,
  pathwayStageHardGateBlockers,
} from "@/lib/surgical-sales/pathway/pathwayProgressionPolicy";
import {
  normalizeSalesPathwayStageId,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { readProviderCommercialIntelligence } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import { resolveSalesPathwayStage } from "@/lib/surgical-sales/pathway/resolveSalesPathwayStage";

export type MissionProgressLevelId =
  | "prospect"
  | "interested"
  | "approved"
  | "observed"
  | "debriefed"
  | "committed";

export type MissionProgressAdvancement = "early" | "advancing" | "advanced";

export const MISSION_PROGRESS_LEVEL_LABELS: Record<MissionProgressLevelId, string> = {
  prospect: "Prospect",
  interested: "Interested",
  approved: "Approved",
  observed: "Observed",
  debriefed: "Debriefed",
  committed: "Committed",
};

export const MISSION_PROGRESS_ADVANCEMENT_LABELS: Record<MissionProgressAdvancement, string> = {
  early: "Early",
  advancing: "Advancing",
  advanced: "Advanced",
};

const LEVEL_RANK: Record<MissionProgressLevelId, number> = {
  prospect: 0,
  interested: 1,
  approved: 2,
  observed: 3,
  debriefed: 4,
  committed: 5,
};

export type ProviderMissionProgressView = {
  levelId: MissionProgressLevelId;
  levelLabel: string;
  advancement: MissionProgressAdvancement;
  advancementLabel: string;
  stageId: SalesPathwayStageId;
  primaryMilestoneId: string;
  primaryMilestoneLabel: string;
  primaryMilestoneMet: boolean;
  nextMilestoneLabel: string | null;
  /** Hard commercial gate only — never intelligence field gaps. */
  stageGateBlockers: PathwayHardGateBlocker[];
};

function hasObservationInterest(contact: Record<string, unknown>): boolean {
  const intel = readProviderCommercialIntelligence(contact);
  if (intel?.observation.interest === "yes") return true;

  const feasibility = String(contact.provider_observation_feasibility ?? "").trim().toLowerCase();
  if (feasibility === "yes" || feasibility === "easy" || feasibility === "approved") return true;
  if (
    fieldHasIntelligenceSignal(
      "provider_evaluation_openness",
      contact.provider_evaluation_openness as string | null | undefined,
    )
  ) {
    return true;
  }
  if (intel?.observation.approval_status === "interested" || intel?.observation.approval_status === "discussed") {
    return true;
  }
  return false;
}

function hasClinicalOpportunityIdentified(input: PathwayGateInput): boolean {
  if (hasDebriefCompleted(input)) return true;
  if (hasProductFitSignal(input)) return true;
  if (
    fieldHasIntelligenceSignal(
      "provider_future_opportunity_signals",
      input.contact.provider_future_opportunity_signals as string | null | undefined,
    )
  ) {
    return true;
  }
  if (
    fieldHasIntelligenceSignal(
      "provider_clinical_frustrations",
      input.contact.provider_clinical_frustrations as string | null | undefined,
    )
  ) {
    return true;
  }
  return false;
}

function resolveMissionProgressLevel(input: PathwayGateInput): MissionProgressLevelId {
  if (hasExplicitProviderCommitment(input) || isCommitmentStageComplete(input)) {
    return "committed";
  }
  if (hasClinicalOpportunityIdentified(input)) {
    return "debriefed";
  }
  if (countObservedProcedures(input) > 0) {
    return "observed";
  }
  if (hasProviderObservationApprovalOnFile(input.contact)) {
    return "approved";
  }
  if (hasObservationInterest(input.contact)) {
    return "interested";
  }
  return "prospect";
}

function advancementForLevel(levelId: MissionProgressLevelId): MissionProgressAdvancement {
  if (levelId === "prospect" || levelId === "interested") return "early";
  if (levelId === "approved" || levelId === "observed") return "advancing";
  return "advanced";
}

function nextMilestoneLabel(stageId: SalesPathwayStageId, primaryMet: boolean): string | null {
  if (!primaryMet) return null;
  const order: SalesPathwayStageId[] = [
    "discovery",
    "observe",
    "debrief",
    "evaluation",
    "commitment",
    "outcomes",
  ];
  const idx = order.indexOf(stageId);
  if (idx < 0 || idx >= order.length - 1) return null;
  return SALES_PATHWAY_REQUIRED_STAGE_GATES[order[idx + 1]!]?.label ?? null;
}

export function buildProviderMissionProgress(input: {
  contact: Record<string, unknown>;
  engagements?: PathwayGateInput["engagements"];
  cases?: PathwayGateInput["cases"];
  stageId?: SalesPathwayStageId | null;
}): ProviderMissionProgressView {
  const contact = hydrateDiscoveryContactFromLegacy(input.contact ?? {});
  const gateInput: PathwayGateInput = {
    contact,
    engagements: input.engagements,
    cases: input.cases,
  };

  const stageId =
    input.stageId ??
    normalizeSalesPathwayStageId(contact.provider_relationship_pathway_stage_id as string) ??
    resolveSalesPathwayStage({
      contact,
      engagements: input.engagements,
      cases: input.cases,
    });

  const levelId = resolveMissionProgressLevel(gateInput);
  const stageGate = SALES_PATHWAY_REQUIRED_STAGE_GATES[stageId];
  const stageGateBlockers = pathwayStageHardGateBlockers(stageId, gateInput);
  const primaryMilestoneMet = stageGateBlockers.length === 0;

  return {
    levelId,
    levelLabel: MISSION_PROGRESS_LEVEL_LABELS[levelId],
    advancement: advancementForLevel(levelId),
    advancementLabel: MISSION_PROGRESS_ADVANCEMENT_LABELS[advancementForLevel(levelId)],
    stageId,
    primaryMilestoneId: stageGate.gateId,
    primaryMilestoneLabel: stageGate.label,
    primaryMilestoneMet,
    nextMilestoneLabel: nextMilestoneLabel(stageId, primaryMilestoneMet),
    stageGateBlockers,
  };
}

export function missionProgressAtLeast(
  current: MissionProgressLevelId,
  minimum: MissionProgressLevelId,
): boolean {
  return LEVEL_RANK[current] >= LEVEL_RANK[minimum];
}
