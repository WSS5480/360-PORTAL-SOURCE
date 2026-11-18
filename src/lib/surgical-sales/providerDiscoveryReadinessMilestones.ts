/**
 * Discovery readiness — single required gate: Observation Approved.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  SALES_PATHWAY_DISCOVERY_MILESTONE_LABELS,
  type SalesPathwayDiscoveryMilestoneId,
} from "@/lib/surgical-sales/salesPathwayCanonical";

type DiscoveryMilestoneEngagementRef = Pick<ProviderEngagementSummary, "id" | "engagement_type" | "status"> & {
  debrief_completed?: boolean | null;
};

const MILESTONE_DB_KEYS: Record<SalesPathwayDiscoveryMilestoneId, string> = {
  observation_approved: "provider_observation_feasibility",
};

const MILESTONE_SECTION_IDS: Record<SalesPathwayDiscoveryMilestoneId, ProviderIntelligenceSectionId> = {
  observation_approved: "observation_readiness",
};

export function resolveDiscoveryMilestoneMet(
  milestoneId: SalesPathwayDiscoveryMilestoneId,
  input: {
    contact: Record<string, unknown>;
    engagements?: DiscoveryMilestoneEngagementRef[];
  },
): boolean {
  void input.engagements;
  if (milestoneId !== "observation_approved") return false;
  return hasProviderObservationApprovalValidated(input.contact);
}

export type DiscoveryMilestoneRequirement = {
  label: string;
  met: boolean;
  dbKey: string;
  sectionId: ProviderIntelligenceSectionId;
};

export function buildDiscoveryMilestoneRequirements(input: {
  contact: Record<string, unknown>;
  engagements?: DiscoveryMilestoneEngagementRef[];
}): DiscoveryMilestoneRequirement[] {
  return (Object.keys(SALES_PATHWAY_DISCOVERY_MILESTONE_LABELS) as SalesPathwayDiscoveryMilestoneId[]).map(
    (id) => ({
      label: SALES_PATHWAY_DISCOVERY_MILESTONE_LABELS[id],
      met: resolveDiscoveryMilestoneMet(id, input),
      dbKey: MILESTONE_DB_KEYS[id],
      sectionId: MILESTONE_SECTION_IDS[id],
    }),
  );
}

export function discoveryMilestonesComplete(input: {
  contact: Record<string, unknown>;
  engagements?: DiscoveryMilestoneEngagementRef[];
}): boolean {
  return hasProviderObservationApprovalValidated(input.contact);
}
