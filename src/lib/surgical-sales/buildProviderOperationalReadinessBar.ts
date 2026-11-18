/**
 * One-line operational readiness bar — scannable account posture from status cards + critical gaps.
 */

import { buildProviderOperationalReadinessFramework } from "@/lib/surgical-sales/buildProviderOperationalReadinessFramework";
import {
  buildProviderIntelligenceMaturitySnapshot,
  type ProviderIntelligenceMaturitySnapshot,
} from "@/lib/surgical-sales/providerIntelligenceMaturity";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { IntelligenceStrengthLabel } from "@/lib/surgical-sales/providerIntelligenceDisplayLabels";

export type OperationalReadinessBarTone = "limited" | "building" | "strong";

export type OperationalReadinessBarResult = {
  segments: string[];
  line: string;
  tone: OperationalReadinessBarTone;
  maturity: ProviderIntelligenceMaturitySnapshot;
};

function toneFromVerdict(
  verdictId: string,
  maturity: ProviderIntelligenceMaturitySnapshot,
): OperationalReadinessBarTone {
  if (verdictId === "commercial_expansion_candidate" || verdictId === "evaluation_ready") {
    return "strong";
  }
  if (verdictId === "not_viable_yet") return "limited";
  if (verdictId === "observation_possible_with_risk" && maturity.stage === "early_discovery") {
    return "limited";
  }
  return "building";
}

export function buildOperationalReadinessSummaryBar(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  overallStatus?: IntelligenceStrengthLabel;
}): OperationalReadinessBarResult | null {
  const contact = input.contact;
  if (!contact || Object.keys(contact).length === 0) return null;

  const maturity = buildProviderIntelligenceMaturitySnapshot({
    contact,
    planning: input.planning,
    relationshipStage: input.relationshipStage ?? String(contact.provider_relationship_stage ?? ""),
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  const framework = buildProviderOperationalReadinessFramework({
    contact,
    relationshipStage: input.relationshipStage ?? String(contact.provider_relationship_stage ?? ""),
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  const segments = [
    framework.verdict.label,
    ...framework.verdict.blockers.slice(0, 2),
    ...framework.pillars
      .filter((p) => p.posture === "thin" || p.posture === "blocked")
      .map((p) => p.scanLine)
      .slice(0, 1),
  ].filter(Boolean);

  const line = segments.join(" • ");
  if (!line) return null;

  return {
    segments,
    line,
    tone: toneFromVerdict(framework.verdict.id, maturity),
    maturity,
  };
}
