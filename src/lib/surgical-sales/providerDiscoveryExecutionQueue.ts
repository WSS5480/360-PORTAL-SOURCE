/**
 * Deployment-oriented execution queue — tactical fields for ranked intelligence captures.
 */

import {
  intelligenceGapBestInteraction,
  intelligenceGapBestSource,
  intelligenceGapIdealTiming,
} from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";
import type {
  DiscoveryPriorityDriver,
  NextDiscoveryPriority,
} from "@/lib/surgical-sales/buildProviderNextDiscoveryPriorities";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

export type DiscoveryPriorityCore = Omit<
  NextDiscoveryPriority,
  | "leverageScore"
  | "leverageTier"
  | "interactionTiming"
  | "bestInteraction"
  | "captureSource"
  | "operationalUnlock"
  | "confidenceGainEstimate"
>;
import type { DiscoveryPriorityUrgency } from "@/lib/surgical-sales/providerDiscoveryPriorityMission";

export {
  EXECUTION_QUEUE_COLUMN_LABELS,
  INTELLIGENCE_COLLECTION_QUEUE_KICKER,
  INTELLIGENCE_COLLECTION_QUEUE_TITLE,
} from "@/lib/surgical-sales/providerIntelligenceRepVocabulary";

const URGENCY_LEVERAGE_BASE: Record<DiscoveryPriorityUrgency, number> = {
  critical: 92,
  high: 78,
  medium: 62,
  supporting: 44,
};

export function discoveryPriorityInteractionTiming(
  dbKey: string,
  drivers: DiscoveryPriorityDriver[],
  upcomingEngagements: number,
  sectionId?: ProviderIntelligenceSectionId,
): string {
  if (drivers.includes("revalidation")) {
    return upcomingEngagements > 0
      ? "Before upcoming engagement — revalidate"
      : "Next touch — revalidate on file";
  }
  if (drivers.includes("engagement_stage") && upcomingEngagements > 0) {
    return `Before upcoming engagement — ${intelligenceGapIdealTiming(dbKey, sectionId).toLowerCase()}`;
  }
  return intelligenceGapIdealTiming(dbKey, sectionId);
}

export function discoveryPriorityBestInteraction(
  dbKey: string,
  sectionId?: ProviderIntelligenceSectionId,
): string {
  return intelligenceGapBestInteraction(dbKey, sectionId);
}

export function discoveryPriorityBestSource(
  dbKey: string,
  sectionId?: ProviderIntelligenceSectionId,
): string {
  return intelligenceGapBestSource(dbKey, sectionId);
}

export function computeDiscoveryLeverageScore(input: {
  priorityScore: number;
  urgency: DiscoveryPriorityUrgency;
  rank: number;
}): { leverageScore: number; leverageTier: string } {
  const scoreBoost = Math.min(14, Math.floor(input.priorityScore / 120));
  const rankPenalty = input.rank * 4;
  const leverageScore = Math.min(
    99,
    Math.max(24, URGENCY_LEVERAGE_BASE[input.urgency] + scoreBoost - rankPenalty),
  );
  const leverageTier =
    leverageScore >= 88
      ? "Deploy now"
      : leverageScore >= 72
        ? "High leverage"
        : leverageScore >= 56
          ? "Queue next"
          : "Backlog";
  return { leverageScore, leverageTier };
}

export function enrichDiscoveryPriorityForExecutionQueue(
  priority: DiscoveryPriorityCore,
  rank: number,
  upcomingEngagements: number,
): NextDiscoveryPriority {
  const { leverageScore, leverageTier } = computeDiscoveryLeverageScore({
    priorityScore: priority.priorityScore,
    urgency: priority.urgency,
    rank,
  });
  return {
    ...priority,
    leverageScore,
    leverageTier,
    interactionTiming: discoveryPriorityInteractionTiming(
      priority.dbKey,
      priority.drivers,
      upcomingEngagements,
    ),
    captureSource: priority.captureMethod,
    bestInteraction: discoveryPriorityBestInteraction(priority.dbKey, priority.sectionId),
    operationalUnlock: priority.unlockValue,
    confidenceGainEstimate: priority.confidenceGain,
  };
}
