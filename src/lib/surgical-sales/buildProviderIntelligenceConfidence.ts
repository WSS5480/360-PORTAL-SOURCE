/**
 * Intelligence confidence — how much supporting field context is on file.
 * Independent from mission progress; never blocks commercial advancement.
 */

import { buildIntelligenceGapEngine } from "@/lib/surgical-sales/buildIntelligenceGapEngine";
import { MISSION_INTELLIGENCE_CONFIDENCE_LABELS } from "@/lib/surgical-sales/providerMissionExecutionLanguage";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export type IntelligenceConfidenceLevel = "low" | "medium" | "high";

export type ProviderIntelligenceConfidenceView = {
  level: IntelligenceConfidenceLevel;
  label: string;
  tone: "low" | "moderate" | "high";
  openGapCount: number;
  domainSummary: string;
};

export const INTELLIGENCE_CONFIDENCE_LABELS: Record<IntelligenceConfidenceLevel, string> = {
  low: MISSION_INTELLIGENCE_CONFIDENCE_LABELS.low,
  medium: MISSION_INTELLIGENCE_CONFIDENCE_LABELS.medium,
  high: MISSION_INTELLIGENCE_CONFIDENCE_LABELS.high,
};

function aggregateDomainScore(
  domains: ReturnType<typeof buildIntelligenceGapEngine>["domains"],
): number {
  if (domains.length === 0) return 0;
  let score = 0;
  for (const domain of domains) {
    if (domain.completeness === "known") score += 2;
    else if (domain.completeness === "partial") score += 1;
  }
  return score / (domains.length * 2);
}

export function buildProviderIntelligenceConfidence(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
}): ProviderIntelligenceConfidenceView {
  const engine = buildIntelligenceGapEngine({
    contact: input.contact,
    planning: input.planning,
    maxGaps: 24,
  });

  const ratio = aggregateDomainScore(engine.domains);
  let level: IntelligenceConfidenceLevel = "low";
  if (ratio >= 0.67) level = "high";
  else if (ratio >= 0.34) level = "medium";

  const knownDomains = engine.domains.filter((d) => d.completeness === "known").length;
  const domainSummary =
    knownDomains === engine.domains.length
      ? "Strong supporting context across access, workflow, and clinical."
      : knownDomains === 0
        ? "Limited field context available — recommended actions sharpen as you learn."
        : "Developing field context — open questions below improve execution, not advancement.";

  return {
    level,
    label: INTELLIGENCE_CONFIDENCE_LABELS[level],
    tone: level === "high" ? "high" : level === "medium" ? "moderate" : "low",
    openGapCount: engine.gaps.length,
    domainSummary,
  };
}
