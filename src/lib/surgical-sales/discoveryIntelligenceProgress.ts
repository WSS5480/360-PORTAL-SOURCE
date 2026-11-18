/**
 * Discovery Intelligence — weighted group progress from shared field statuses.
 */

import {
  discoveryIntelligenceCertaintyTierLabel,
} from "@/lib/surgical-sales/discoveryIntelligenceCopy";
import {
  formatEvidenceCaptureSummary,
  resolveEvidenceCaptureCounts,
  type EvidenceCaptureCounts,
} from "@/lib/surgical-sales/fieldIntelligenceMetricPolicy";
import {
  DISCOVERY_FIELD_STATUS,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";

const F = DISCOVERY_FIELD_STATUS;

export type DiscoveryIntelligenceGroupId =
  | "opportunity_intelligence"
  | "access_readiness"
  | "clinical_fit"
  | "champion_landscape";

/** Partial credit for captured / in-progress signals (not validated on file). */
export const DISCOVERY_PARTIAL_PROGRESS_CREDIT = 0.5;

export type DiscoverySignalProgressCredit = {
  credit: number;
  constrained: boolean;
};

export type DiscoveryIntelligenceGroupProgress = {
  /** 0–100 weighted score for the group. @deprecated Prefer evidenceCounts for display. */
  percent: number;
  earnedWeight: number;
  totalWeight: number;
  constrained: boolean;
  /** Evidence-based capture summary — e.g. "2 confirmed · 1 open". */
  label: string;
  evidenceCounts: EvidenceCaptureCounts;
};

export const DISCOVERY_SIGNAL_GROUP_WEIGHTS: Record<
  DiscoveryIntelligenceGroupId,
  Partial<Record<DiscoveryStructuredSignalId, number>>
> = {
  opportunity_intelligence: {
    opportunity_clinical_frustrations: 15,
    opportunity_workflow_inefficiencies: 12,
    opportunity_products_in_use: 12,
    opportunity_product_gaps: 14,
    opportunity_outcome_priorities: 12,
    opportunity_staff_frustrations: 11,
    opportunity_future_signals: 12,
  },
  access_readiness: {
    observation_approval: 100,
    scheduling_owner: 0,
    facility_vendor_pathway: 0,
    observation_logistics: 0,
  },
  clinical_fit: {
    workflow_visibility: 40,
    product_alignment: 35,
    case_opportunity: 25,
  },
  champion_landscape: {
    clinical_champion: 100,
  },
};

export function resolveDiscoverySignalProgressCredit(
  statusLabel: string,
): DiscoverySignalProgressCredit {
  switch (statusLabel) {
    case F.validated:
    case F.notApplicable:
      return { credit: 1, constrained: false };
    case F.captured:
      return { credit: DISCOVERY_PARTIAL_PROGRESS_CREDIT, constrained: false };
    case F.blocked:
      return { credit: 0, constrained: true };
    case F.unknown:
    default:
      return { credit: 0, constrained: false };
  }
}

export function computeDiscoveryGroupProgress(input: {
  groupId: DiscoveryIntelligenceGroupId;
  signals: Array<{ signalId: DiscoveryStructuredSignalId; statusLabel: string }>;
}): DiscoveryIntelligenceGroupProgress {
  const weights = DISCOVERY_SIGNAL_GROUP_WEIGHTS[input.groupId];
  let earned = 0;
  let total = 0;
  let constrained = false;

  for (const { signalId, statusLabel } of input.signals) {
    const weight = weights[signalId] ?? 0;
    if (weight <= 0) continue;

    total += weight;
    const { credit, constrained: isConstrained } =
      resolveDiscoverySignalProgressCredit(statusLabel);
    if (isConstrained) constrained = true;
    earned += weight * credit;
  }

  const percent = total > 0 ? Math.round((earned / total) * 100) : 0;
  const evidenceCounts = resolveEvidenceCaptureCounts(input.signals);

  return {
    percent,
    earnedWeight: Math.round(earned * 10) / 10,
    totalWeight: total,
    constrained,
    evidenceCounts,
    label:
      formatEvidenceCaptureSummary(evidenceCounts, true) ??
      discoveryIntelligenceCertaintyTierLabel(percent),
  };
}

/** Overall Intelligence tab score — equal weight per group. */
export function computeDiscoveryIntelligenceOverallProgress(
  groups: Pick<DiscoveryIntelligenceGroupProgress, "percent">[],
): number {
  if (groups.length === 0) return 0;
  const sum = groups.reduce((acc, group) => acc + group.percent, 0);
  return Math.round(sum / groups.length);
}

export function discoveryIntelligenceConfidenceLabel(progressPercent: number): string {
  return discoveryIntelligenceCertaintyTierLabel(progressPercent);
}
