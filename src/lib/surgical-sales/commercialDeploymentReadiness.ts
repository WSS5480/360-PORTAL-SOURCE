/**
 * Commercial deployment confidence — facility vs provider readiness for field commercialization.
 * Not form-completion percentage; derived from operational pillars and motion gates.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderOperationalReadinessFramework,
  type OperationalMotionReadiness,
  type OperationalReadinessPillarAssessment,
  type OperationalReadinessPillarPosture,
} from "@/lib/surgical-sales/buildProviderOperationalReadinessFramework";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { buildDiscoveryLearnedFeedback } from "@/lib/surgical-sales/discoveryOperationalSynthesis";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { GUIDED_INTEL_CAPTURE } from "@/lib/surgical-sales/providerGuidedIntelCapture";
import {
  deploymentTierToVisibilityState,
  operationalVisibilityStateLabel,
  OPERATIONAL_VISIBILITY_GUIDANCE,
} from "@/lib/surgical-sales/operationalVisibilityVocabulary";

export type DeploymentConfidenceTier = "low" | "building" | "high";

export const DEPLOYMENT_CONFIDENCE_TIER_LABELS: Record<DeploymentConfidenceTier, string> = {
  low: operationalVisibilityStateLabel("early"),
  building: operationalVisibilityStateLabel("developing"),
  high: operationalVisibilityStateLabel("strong"),
};

export const DEPLOYMENT_CONFIDENCE_HEADLINES: Record<DeploymentConfidenceTier, string> = {
  low: "Early operational visibility — map access and scheduling before heavy field spend.",
  building: "Developing visibility — close open gaps when you can; moves can still proceed with guardrails.",
  high: "Strong visibility — observation and evaluation paths look supportable.",
};

const FACILITY_PILLAR_IDS = [
  "or_access_maturity",
  "scheduling_clarity",
  "vendor_pathway",
] as const;

const PROVIDER_PILLAR_IDS = [
  "workflow_intelligence",
  "relationship_mapping",
  "procedural_alignment",
  "commercialization_influence",
] as const;

const POSTURE_WEIGHT: Record<OperationalReadinessPillarPosture, number> = {
  blocked: 0,
  thin: 0.5,
  forming: 2,
  validated: 3,
};

const TIER_RANK: Record<DeploymentConfidenceTier, number> = {
  low: 0,
  building: 1,
  high: 2,
};

export const DEPLOYMENT_TIER_RECOMMENDATIONS: Record<DeploymentConfidenceTier, string[]> = {
  low: [
    "Continue operational map discovery",
    "Avoid deploying field resources until access and workflow are clearer",
    "Do not escalate evaluation or preference-card work",
  ],
  building: [
    "Close top access or workflow open items when you can",
    "Continue discovery on scheduler or credentialing additional context",
    "Hold formal evaluation until observation path is validated",
  ],
  high: [
    "Pursue observation on mapped cases",
    "Identify evaluation opportunity with the clinical lead",
    "Involve clinical support where technique fit is confirmed",
  ],
};

export type CommercialDeploymentReadinessView = {
  tier: DeploymentConfidenceTier;
  /** Rep-facing short label (stat pill). */
  tierLabel: string;
  /** One-line deployment confidence read. */
  headline: string;
  recommendations: string[];
  /** Ordinal 0–100 for session deltas only — not shown as form completion. */
  confidenceIndex: number;
  /** Primary operational blockers driving the tier. */
  blockers: string[];
};

export type CommercialDeploymentReadinessSnapshot = {
  facility: CommercialDeploymentReadinessView;
  provider: CommercialDeploymentReadinessView;
  /** Conservative combined tier (lower of facility and provider). */
  combinedTier: DeploymentConfidenceTier;
  combinedRecommendations: string[];
  discoveryCta: string;
  discoverySubtitle: string;
};

function tierFromAverage(avg: number, hasBlocked: boolean): DeploymentConfidenceTier {
  if (hasBlocked || avg < 1.2) return "low";
  if (avg >= 2.4) return "high";
  return "building";
}

function pillarAverage(pillars: OperationalReadinessPillarAssessment[]): number {
  if (pillars.length === 0) return 0;
  return (
    pillars.reduce((sum, p) => sum + POSTURE_WEIGHT[p.posture], 0) / pillars.length
  );
}

function motionCapsTier(
  motions: OperationalMotionReadiness[],
  scope: "facility" | "provider",
): DeploymentConfidenceTier | null {
  const observation = motions.find((m) => m.motion === "observation");
  const evaluation = motions.find((m) => m.motion === "evaluation");

  if (scope === "facility") {
    if (observation?.verdict === "blocked") return "low";
    if (observation?.verdict === "not_ready") return "building";
    return null;
  }

  if (evaluation?.verdict === "blocked") return "low";
  if (observation?.verdict === "blocked") return "low";
  if (evaluation?.verdict === "not_ready" && observation?.verdict === "not_ready") return "low";
  if (evaluation?.verdict === "ready" && observation?.verdict === "ready") return "high";
  if (evaluation?.verdict === "approaching" || observation?.verdict === "approaching") return "building";
  return null;
}

function buildScopeReadiness(input: {
  pillars: OperationalReadinessPillarAssessment[];
  motions: OperationalMotionReadiness[];
  scope: "facility" | "provider";
}): CommercialDeploymentReadinessView {
  const hasBlocked = input.pillars.some((p) => p.posture === "blocked");
  let tier = tierFromAverage(pillarAverage(input.pillars), hasBlocked);
  const motionCap = motionCapsTier(input.motions, input.scope);
  if (motionCap && TIER_RANK[motionCap] < TIER_RANK[tier]) {
    tier = motionCap;
  }

  const blockers = input.pillars
    .flatMap((p) => p.blockers)
    .filter((b) => b.length > 4)
    .slice(0, 3);

  const thinPillars = input.pillars.filter((p) => p.posture === "thin" || p.posture === "blocked");
  const headline =
    tier === "high"
      ? input.scope === "facility"
        ? "Facility access and scheduling support field deployment."
        : "Provider workflow and relationship support commercialization moves."
      : tier === "building"
        ? thinPillars.length > 0
          ? scanLine(
              `${input.scope === "facility" ? "Facility" : "Provider"} picture forming — ${thinPillars[0]!.label.toLowerCase()} still open.`,
              120,
            )
          : DEPLOYMENT_CONFIDENCE_HEADLINES.building
        : blockers[0]
          ? scanLine(
              `${input.scope === "facility" ? "Facility" : "Provider"} deployment limited — ${blockers[0]}.`,
              120,
            )
          : DEPLOYMENT_CONFIDENCE_HEADLINES.low;

  const confidenceIndex =
    tier === "high" ? 85 : tier === "building" ? 55 : hasBlocked ? 22 : 35;

  return {
    tier,
    tierLabel: DEPLOYMENT_CONFIDENCE_TIER_LABELS[tier],
    headline,
    recommendations: [...DEPLOYMENT_TIER_RECOMMENDATIONS[tier]],
    confidenceIndex,
    blockers,
  };
}

export function lowerDeploymentTier(
  a: DeploymentConfidenceTier,
  b: DeploymentConfidenceTier,
): DeploymentConfidenceTier {
  return TIER_RANK[a] <= TIER_RANK[b] ? a : b;
}

export function deploymentDiscoveryCta(
  combinedTier: DeploymentConfidenceTier,
  unresolvedTotal: number,
): string {
  if (unresolvedTotal === 0) return GUIDED_INTEL_CAPTURE.refineVisibility;
  if (combinedTier === "low") return GUIDED_INTEL_CAPTURE.buildAccountIntel;
  return GUIDED_INTEL_CAPTURE.addContext;
}

export function buildCommercialDeploymentReadinessSnapshot(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  unresolvedDiscoveryCount?: number;
}): CommercialDeploymentReadinessSnapshot {
  const framework = buildProviderOperationalReadinessFramework({
    contact: input.contact,
    engagements: input.engagements,
    opportunities: input.opportunities,
  });

  const facilityPillars = framework.pillars.filter((p) =>
    (FACILITY_PILLAR_IDS as readonly string[]).includes(p.id),
  );
  const providerPillars = framework.pillars.filter((p) =>
    (PROVIDER_PILLAR_IDS as readonly string[]).includes(p.id),
  );

  const facility = buildScopeReadiness({
    pillars: facilityPillars,
    motions: framework.motions,
    scope: "facility",
  });
  const provider = buildScopeReadiness({
    pillars: providerPillars,
    motions: framework.motions,
    scope: "provider",
  });

  const combinedTier = lowerDeploymentTier(facility.tier, provider.tier);
  const combinedRecommendations = [
    ...new Set([
      ...DEPLOYMENT_TIER_RECOMMENDATIONS[combinedTier],
      ...(facility.tier === "low" ? facility.recommendations.slice(0, 1) : []),
      ...(provider.tier === "low" ? provider.recommendations.slice(0, 1) : []),
    ]),
  ].slice(0, 4);

  const unresolved = input.unresolvedDiscoveryCount ?? 0;
  const visibilityLabel = operationalVisibilityStateLabel(
    deploymentTierToVisibilityState(combinedTier),
  );
  const discoverySubtitle =
    unresolved > 0
      ? `${visibilityLabel} visibility · ${unresolved} area${unresolved === 1 ? "" : "s"} still learning`
      : `${visibilityLabel} visibility — ${OPERATIONAL_VISIBILITY_GUIDANCE}`;

  return {
    facility,
    provider,
    combinedTier,
    combinedRecommendations,
    discoveryCta: deploymentDiscoveryCta(combinedTier, unresolved),
    discoverySubtitle,
  };
}

/** Normalize discovery impact lines into operational "why" bullets. */
export function normalizeReadinessReasonLine(line: string): string {
  const trimmed = line.replace(/^\+\s*/, "").trim();
  const lower = trimmed.toLowerCase();

  if (/scheduler|coordinator|scheduling owner/i.test(lower)) return "scheduler identified";
  if (/workflow visibility|workflow clarified|workflow friction|or workflow/i.test(lower)) {
    return "workflow partially mapped";
  }
  if (/observation access|or access|credentialing/i.test(lower)) return "access path clarified";
  if (/evaluation readiness|evaluation posture|evaluation openness/i.test(lower)) {
    return "evaluation posture clarified";
  }
  if (/relationship/i.test(lower)) return "relationship signals strengthened";
  if (/open questions reduced/i.test(lower)) return "open operational questions reduced";
  if (/field.*confirmed/i.test(lower)) return "operational signals confirmed";

  return scanLine(trimmed, 72);
}

export function buildDeploymentReadinessImprovementReasons(input: {
  before: CommercialDeploymentReadinessSnapshot;
  after: CommercialDeploymentReadinessSnapshot;
  answerDbKey?: string;
  answerValue?: string;
  impactReasons?: string[];
}): string[] {
  const improved =
    input.after.facility.confidenceIndex > input.before.facility.confidenceIndex ||
    input.after.provider.confidenceIndex > input.before.provider.confidenceIndex ||
    TIER_RANK[input.after.combinedTier] > TIER_RANK[input.before.combinedTier];

  if (!improved) return [];

  const reasons: string[] = [];

  if (TIER_RANK[input.after.facility.tier] > TIER_RANK[input.before.facility.tier]) {
    reasons.push(
      input.after.facility.tier === "high"
        ? "facility access supports field deployment"
        : "facility deployment confidence building",
    );
  }
  if (TIER_RANK[input.after.provider.tier] > TIER_RANK[input.before.provider.tier]) {
    reasons.push(
      input.after.provider.tier === "high"
        ? "provider workflow and relationship support commercialization"
        : "provider deployment confidence building",
    );
  }

  for (const raw of input.impactReasons ?? []) {
    const line = normalizeReadinessReasonLine(raw);
    if (line && !reasons.some((r) => r.toLowerCase() === line.toLowerCase())) {
      reasons.push(line);
    }
  }

  if (input.answerDbKey && input.answerValue && fieldHasIntelligenceSignal(input.answerDbKey, input.answerValue)) {
    const feedback = normalizeReadinessReasonLine(
      buildDiscoveryLearnedFeedback(input.answerDbKey, input.answerValue),
    );
    if (feedback && !reasons.includes(feedback)) reasons.push(feedback);
  }

  return reasons.slice(0, 5);
}

/** @deprecated Prefer buildCommercialDeploymentReadinessSnapshot — kept for cards using area scores. */
export function deploymentConfidenceIndexFromTier(tier: DeploymentConfidenceTier): number {
  if (tier === "high") return 85;
  if (tier === "building") return 55;
  return 28;
}
