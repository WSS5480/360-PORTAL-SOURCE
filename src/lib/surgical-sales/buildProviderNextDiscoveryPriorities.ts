/**
 * Next Discovery Priorities — evidence-based coaching prompts ranked by commercial workflow stage.
 *
 * Evidence → Conclusion → Recommendation. Blank fields never generate priorities.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  resolveProviderCommercialWorkflowStage,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import {
  buildProviderIntelligenceMaturitySnapshot,
  type ProviderIntelligenceMaturityStage,
} from "@/lib/surgical-sales/providerIntelligenceMaturity";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { isUpcomingEngagementStatus } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  buildDiscoveryPriorityMissionBrief,
  DISCOVERY_PRIORITY_REFRESH_MISSION,
  type DiscoveryPriorityUrgency,
} from "@/lib/surgical-sales/providerDiscoveryPriorityMission";
import {
  providerOperationalConsequenceForField,
  type IntelligenceGapOperationalConsequence,
} from "@/lib/surgical-sales/providerOperationalImpact";
import { buildProtectFieldTimeAssessment } from "@/lib/surgical-sales/buildProtectFieldTimeAssessment";
import { intelligenceUnlocksNextLine } from "@/lib/surgical-sales/providerIntelligenceUnlocksNext";
import {
  enrichDiscoveryPriorityForExecutionQueue,
  type DiscoveryPriorityCore,
} from "@/lib/surgical-sales/providerDiscoveryExecutionQueue";
import {
  buildProviderEvidenceBasedRecommendations,
  type EvidenceBasedRecommendation,
  type EvidenceBasedRecommendationDriver,
} from "@/lib/surgical-sales/providerEvidenceBasedRecommendations";

/** @deprecated Use INTELLIGENCE_COLLECTION_QUEUE_TITLE */
export const NEXT_DISCOVERY_PRIORITIES_TITLE = "Recommended field discoveries";
/** @deprecated Use INTELLIGENCE_COLLECTION_QUEUE_KICKER */
export const NEXT_DISCOVERY_PRIORITIES_KICKER =
  "Prioritized learning before your next visit";

/** Default visible coaching prompts; remainder collapsed in UI. */
export const NEXT_DISCOVERY_PRIORITIES_VISIBLE_DEFAULT = 3;

export type DiscoveryPriorityDriver =
  | EvidenceBasedRecommendationDriver
  | "protect_field_time"
  | "workflow_stage"
  | "specialty"
  | "product_exploration"
  | "observation_readiness"
  | "maturity_stage";

export type NextDiscoveryPriority = {
  id: string;
  /** Mission verb phrase — primary card title. */
  missionTitle: string;
  headline: string;
  rationale: string;
  whyItMatters: string;
  expectedOutcome: string;
  operationalConsequence: IntelligenceGapOperationalConsequence;
  operationalImpact: string;
  unlockValue: string;
  captureMethod: string;
  urgency: DiscoveryPriorityUrgency;
  urgencyLabel: string;
  confidenceGain: string;
  captureLabel: string;
  sectionId: ProviderIntelligenceSectionId;
  dbKey: string;
  priorityScore: number;
  /** Normalized 0–100 leverage for deployment queue. */
  leverageScore: number;
  leverageTier: string;
  interactionTiming: string;
  bestInteraction: string;
  captureSource: string;
  operationalUnlock: string;
  confidenceGainEstimate: string;
  drivers: DiscoveryPriorityDriver[];
  workflowStage: ProviderCommercialWorkflowStage;
  maturityStage: ProviderIntelligenceMaturityStage;
  stageTier: 1 | 2 | 3 | null;
};

function rationaleForEvidenceChain(chain: EvidenceBasedRecommendation): string {
  return chain.rationale;
}

function evidenceChainToPriority(
  chain: EvidenceBasedRecommendation,
  workflowStage: ProviderCommercialWorkflowStage,
  maturityStage: ProviderIntelligenceMaturityStage,
  upcomingEngagements: number,
): DiscoveryPriorityCore {
  const mission = buildDiscoveryPriorityMissionBrief({
    dbKey: chain.dbKey,
    sectionId: chain.sectionId,
    priorityScore: chain.priorityScore,
    stageTier: chain.priorityScore >= 85 ? 1 : chain.priorityScore >= 70 ? 2 : 3,
    drivers: chain.drivers,
    upcomingEngagements,
    revalidate: chain.drivers.includes("revalidation"),
  });
  const operationalConsequence = providerOperationalConsequenceForField(chain.dbKey);

  return {
    id: chain.id,
    missionTitle: chain.missionTitle,
    headline: chain.headline,
    rationale: rationaleForEvidenceChain(chain),
    whyItMatters: chain.whyItMatters,
    expectedOutcome: chain.expectedOutcome,
    operationalConsequence,
    operationalImpact: chain.whyItMatters,
    unlockValue: intelligenceUnlocksNextLine(chain.dbKey),
    captureMethod: mission.captureMethod,
    urgency: mission.urgency,
    urgencyLabel: mission.urgencyLabel,
    confidenceGain: mission.confidenceGain,
    captureLabel: chain.recommendation,
    sectionId: chain.sectionId,
    dbKey: chain.dbKey,
    priorityScore: chain.priorityScore,
    drivers: [...chain.drivers],
    workflowStage,
    maturityStage,
    stageTier: chain.priorityScore >= 85 ? 1 : chain.priorityScore >= 70 ? 2 : 3,
  };
}

export function buildProviderNextDiscoveryPriorities(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  specialty?: string | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  maxItems?: number;
}): NextDiscoveryPriority[] {
  const contact = input.contact;
  const planning = input.planning;
  const relationshipStage = String(
    input.relationshipStage ?? contact.provider_relationship_stage ?? "prospect",
  )
    .trim()
    .toLowerCase();
  const workflowStage = resolveProviderCommercialWorkflowStage({
    relationshipStage,
    opportunities: input.opportunities,
    cases: input.cases,
    engagements: input.engagements,
  });
  const maturitySnapshot = buildProviderIntelligenceMaturitySnapshot({
    contact,
    planning,
    relationshipStage,
    opportunities: input.opportunities,
    cases: input.cases,
    engagements: input.engagements,
  });
  const maturityStage = maturitySnapshot.stage;
  const upcomingEngagements = (input.engagements ?? []).filter((e) =>
    isUpcomingEngagementStatus(e.status),
  ).length;

  void buildProtectFieldTimeAssessment({
    contact,
    relationshipStage,
    commercialStage: workflowStage,
    engagements: input.engagements,
  });

  const evidenceChains = buildProviderEvidenceBasedRecommendations({
    contact,
    planning,
    engagements: input.engagements,
    cases: input.cases,
    maxItems: input.maxItems ?? 24,
  });

  const priorities: DiscoveryPriorityCore[] = evidenceChains.map((chain) =>
    evidenceChainToPriority(chain, workflowStage, maturityStage, upcomingEngagements),
  );

  if (priorities.length === 0) {
    const refresh = DISCOVERY_PRIORITY_REFRESH_MISSION;
    return [
      enrichDiscoveryPriorityForExecutionQueue(
        {
          id: "refresh",
          missionTitle: "Log account shift",
          headline: "Revisit the profile after your next case day or committee shift",
          rationale: "Core signals are in place — add deltas when the account moves",
          whyItMatters: refresh.operationalImpact,
          expectedOutcome: refresh.unlockValue,
          operationalConsequence: refresh.operationalConsequence,
          operationalImpact: refresh.operationalImpact,
          unlockValue: refresh.unlockValue,
          captureMethod: refresh.captureMethod,
          urgency: refresh.urgency,
          urgencyLabel: refresh.urgencyLabel,
          confidenceGain: refresh.confidenceGain,
          captureLabel: "Log account shift",
          sectionId: "clinical_workflow",
          dbKey: "provider_procedure_focus",
          priorityScore: 0,
          drivers: [],
          workflowStage,
          maturityStage,
          stageTier: null,
        },
        0,
        upcomingEngagements,
      ),
    ];
  }

  const sorted = priorities.sort((a, b) => b.priorityScore - a.priorityScore);
  const limit = input.maxItems ?? sorted.length;
  return sorted
    .slice(0, limit)
    .map((priority, rank) =>
      enrichDiscoveryPriorityForExecutionQueue(priority, rank, upcomingEngagements),
    );
}
