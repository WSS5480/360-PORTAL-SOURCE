/**
 * Discovery stage — separates sales advancement from operational readiness.
 * Advancement = provider willingness to progress toward observation.
 * Readiness items support execution but do not gate the stage alone.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { formatIntelligenceCaptureSummaryChip } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  buildProviderDiscoveryIntelligenceGroups,
  flattenDiscoveryIntelligenceSignals,
  DISCOVERY_READINESS_MARKERS,
  mapContactFieldReadinessStatus,
  type DiscoveryIntelligenceGroup,
  type DiscoveryIntelligenceSignal,
  type DiscoveryReadinessRowStatus,
} from "@/lib/surgical-sales/buildProviderDiscoveryIntelligenceGroups";
import { DISCOVERY_ACCESS_PREP_SIGNAL_IDS } from "@/lib/surgical-sales/discoveryAccessSignalIds";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/providerObservationApproval";
import {
  resolveProviderDiscoveryMotionPhase,
  type ProviderDiscoveryMotionPhase,
} from "@/lib/surgical-sales/providerOverviewDiscoveryProgression";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  intelligenceGapAllowedForDiscoveryNextMove,
  resolveDiscoveryPathwayNextMoveLine,
} from "@/lib/surgical-sales/providerOverviewDiscoveryNextMove";
import { buildDiscoveryIntelligenceGroupsView } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import {
  DISCOVERY_FIELD_STATUS,
  resolveObservationApprovalStatus,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { isObservationAccessConditionallyAllowed } from "@/lib/surgical-sales/observationAccessWorkflowState";
import {
  buildDiscoveryAdvancementSignal,
  type DiscoveryAdvancementSignal,
} from "@/lib/surgical-sales/discoveryAdvancementSignal";

const F = DISCOVERY_FIELD_STATUS;

export type { DiscoveryAdvancementSignal } from "@/lib/surgical-sales/discoveryAdvancementSignal";
export { DISCOVERY_READINESS_MARKERS, mapContactFieldReadinessStatus };
export { hasProviderObservationApprovalValidated };
export type { DiscoveryReadinessRowStatus, DiscoveryIntelligenceGroup, DiscoveryIntelligenceSignal };

export type DiscoveryReadinessItem = DiscoveryIntelligenceSignal;

export type ProviderOverviewDiscoveryProgressionModel = {
  phase: ProviderDiscoveryMotionPhase;
  advancementSignal: DiscoveryAdvancementSignal;
  /** Four discovery intelligence groups (replaces redundant top-level access cards). */
  intelligenceGroups: DiscoveryIntelligenceGroup[];
  /** @deprecated Flattened signals — prefer intelligenceGroups */
  observationReadiness: DiscoveryReadinessItem[];
  tacticalGap: string | null;
  tacticalGapDbKey?: string;
  tacticalGapSectionId?: ProviderIntelligenceSectionId;
  nextRecommendedAction: string | null;
  /** Progress bar: weighted advancement + readiness (readiness never blocks alone). */
  progressPercent: number;
  readinessCompleteCount: number;
  readinessTotal: number;
};

const OBSERVATION_FEASIBILITY_POSITIVE = new Set(["easy", "restricted", "approved", "yes"]);
const OBSERVATION_FEASIBILITY_BLOCKED = new Set(["no", "blocked", "denied"]);

type ReadinessSpec = {
  id: string;
  label: string;
  dbKey: string;
  sectionId: ProviderIntelligenceSectionId;
  /** Hide until past relationship-first motion. */
  accessMappingOnly?: boolean;
  /** Show during relationship-first motion. */
  relationshipFirstOnly?: boolean;
};

/** @deprecated Legacy flat specs — use buildProviderDiscoveryIntelligenceGroups */
const OBSERVATION_READINESS_SPECS: ReadinessSpec[] = [];

function observationFeasibilityPositive(contact: Record<string, unknown>): boolean {
  const v = String(contact.provider_observation_feasibility ?? "").trim().toLowerCase();
  return OBSERVATION_FEASIBILITY_POSITIVE.has(v);
}

function observationFeasibilityBlocked(contact: Record<string, unknown>): boolean {
  const v = String(contact.provider_observation_feasibility ?? "").trim().toLowerCase();
  return OBSERVATION_FEASIBILITY_BLOCKED.has(v);
}

function providerOpenToObservation(contact: Record<string, unknown>): boolean {
  return hasProviderObservationApprovalValidated(contact);
}

function readinessContextLine(dbKey: string, contact: Record<string, unknown>): string | null {
  const raw = String(contact[dbKey] ?? "").trim();
  if (!raw) return null;
  const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
  return scanLine(chip || raw, 72);
}

export function resolveDiscoveryAdvancementSignal(input: {
  contact: Record<string, unknown>;
  phase: ProviderDiscoveryMotionPhase;
}): DiscoveryAdvancementSignal {
  void input.phase;
  return buildDiscoveryAdvancementSignal(input.contact);
}

function specsForPhase(phase: ProviderDiscoveryMotionPhase): ReadinessSpec[] {
  return OBSERVATION_READINESS_SPECS.filter((spec) => {
    if (spec.relationshipFirstOnly && phase !== "relationship_first") return false;
    return true;
  });
}

export function buildDiscoveryReadinessItems(input: {
  contact: Record<string, unknown>;
  phase: ProviderDiscoveryMotionPhase;
}): DiscoveryReadinessItem[] {
  return specsForPhase(input.phase).map((spec) => {
    const status = mapContactFieldReadinessStatus(spec.dbKey, input.contact);
    return {
      id: spec.id,
      label: spec.label,
      status,
      marker: DISCOVERY_READINESS_MARKERS[status],
      contextLine: status !== "open" ? readinessContextLine(spec.dbKey, input.contact) : null,
      dbKey: spec.dbKey,
      sectionId: spec.sectionId,
    };
  });
}

const ACCESS_PREP_READINESS_IDS = DISCOVERY_ACCESS_PREP_SIGNAL_IDS;

function resolveDiscoveryIntelligenceProgressPercent(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): number {
  return buildDiscoveryIntelligenceGroupsView(input).confidenceScore;
}

function resolveTacticalGap(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  readiness: DiscoveryReadinessItem[];
  advancementMet: boolean;
}): { phrase: string | null; dbKey?: string; sectionId?: ProviderIntelligenceSectionId } {
  void input.readiness;
  void input.planning;
  void input.contact;
  if (!input.advancementMet) {
    return {
      phrase: "Observation approval pending",
      dbKey: "provider_observation_feasibility",
      sectionId: "observation_readiness",
    };
  }
  return { phrase: null };
}

function resolveNextRecommendedAction(
  advancement: DiscoveryAdvancementSignal,
  tactical: { phrase: string | null },
  phase: ProviderDiscoveryMotionPhase,
  contact: Record<string, unknown>,
): string | null {
  if (phase === "relationship_first" && !advancement.met) {
    return resolveDiscoveryPathwayNextMoveLine(contact);
  }
  const pathwayLine = resolveDiscoveryPathwayNextMoveLine(contact);
  if (pathwayLine) return pathwayLine;
  if (tactical.phrase) return tactical.phrase;
  return null;
}

export const DISCOVERY_STAGE_GOAL = "Secure observation approval.";

export function buildProviderDiscoveryStageProgression(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  engagements?: ProviderEngagementSummary[];
  relationshipStage?: string | null;
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): ProviderOverviewDiscoveryProgressionModel {
  const contact = hydrateDiscoveryContactFromLegacy(input.contact);
  const relationshipStage = String(
    input.relationshipStage ?? contact.provider_relationship_stage ?? "early_discovery",
  ).trim();
  const phase = resolveProviderDiscoveryMotionPhase({
    contact,
    engagements: input.engagements,
  });
  const advancementSignal = resolveDiscoveryAdvancementSignal({ contact, phase });
  const intelligenceGroups = buildProviderDiscoveryIntelligenceGroups({
    contact,
    planning: input.planning,
    advancement: advancementSignal,
  });
  const observationReadiness = flattenDiscoveryIntelligenceSignals(intelligenceGroups);
  const tactical = resolveTacticalGap({
    contact,
    planning: input.planning,
    readiness: observationReadiness,
    advancementMet: advancementSignal.met,
  });

  const readinessCompleteCount = advancementSignal.met ? 1 : 0;

  return {
    phase,
    advancementSignal,
    intelligenceGroups,
    observationReadiness,
    tacticalGap: tactical.phrase,
    tacticalGapDbKey: tactical.dbKey,
    tacticalGapSectionId: tactical.sectionId,
    nextRecommendedAction: resolveNextRecommendedAction(
      advancementSignal,
      tactical,
      phase,
      contact,
    ),
    progressPercent: advancementSignal.met ? 100 : 0,
    readinessCompleteCount,
    readinessTotal: 1,
  };
}
