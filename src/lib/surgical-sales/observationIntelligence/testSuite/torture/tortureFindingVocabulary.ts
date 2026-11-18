import type { ObservationFact, ObservationFactType } from "../../observationFactTypes";
import type { ObservationIntelligencePipelineResult } from "../../observationIntelligencePipeline";
import type { EvidenceConfidenceLevel } from "@/lib/surgical-sales/observationFindingEvidenceConfidence";

/** Validation tokens used in torture test expectedFindings / forbiddenFindings. */
export const TORTURE_FINDING_TOKENS = [
  "current_product",
  "competitor_product",
  "provider_pain",
  "staff_pain",
  "staff_efficiency",
  "workflow_issue",
  "visualization",
  "fixation",
  "product_fit",
  "room_turnover",
  "readiness_delay",
  "confidence_low",
  "confidence_medium",
  "confidence_high",
] as const;

export type TortureFindingToken = (typeof TORTURE_FINDING_TOKENS)[number];

const WORKFLOW_FACT_TYPES = new Set<ObservationFactType>([
  "workflow_issue",
  "visualization_challenge",
  "fixation_challenge",
  "workflow_delay",
  "room_turnover_issue",
]);

function hasFactType(facts: ObservationFact[], type: ObservationFactType): boolean {
  return facts.some((fact) => fact.type === type);
}

function hasWorkflowFact(facts: ObservationFact[]): boolean {
  return facts.some((fact) => WORKFLOW_FACT_TYPES.has(fact.type));
}

function hasVisualizationFact(facts: ObservationFact[]): boolean {
  return facts.some(
    (fact) =>
      fact.type === "visualization_challenge" ||
      fact.type === "fixation_challenge" ||
      (fact.type === "workflow_issue" &&
        /visuali|view|fixation|angle|exposure|delay before/i.test(fact.value)),
  );
}

function hasReadinessDelayFact(facts: ObservationFact[]): boolean {
  return facts.some(
    (fact) =>
      fact.type === "workflow_delay" ||
      (fact.type === "workflow_issue" && /readiness|waiting|not ready|looking for/i.test(fact.value)),
  );
}

function hasProductFitFact(facts: ObservationFact[]): boolean {
  return facts.some((fact) => fact.type === "product_interest" || fact.type === "product_fit_signal");
}

function pipelineConfidenceLevels(
  pipeline: ObservationIntelligencePipelineResult,
): EvidenceConfidenceLevel[] {
  const levels = new Set<EvidenceConfidenceLevel>();
  for (const findings of Object.values(pipeline.aggregatedByCategory)) {
    for (const finding of findings) {
      levels.add(finding.confidence);
    }
  }
  return [...levels];
}

function highestConfidence(levels: EvidenceConfidenceLevel[]): EvidenceConfidenceLevel | null {
  if (levels.includes("High")) return "High";
  if (levels.includes("Medium")) return "Medium";
  if (levels.includes("Low")) return "Low";
  return null;
}

/** Map extracted facts + pipeline output to torture validation tokens. */
export function detectTortureFindings(input: {
  facts: ObservationFact[];
  pipeline: ObservationIntelligencePipelineResult;
}): Set<TortureFindingToken> {
  const { facts, pipeline } = input;
  const detected = new Set<TortureFindingToken>();

  if (hasFactType(facts, "current_product")) detected.add("current_product");
  if (hasFactType(facts, "competitor_product")) detected.add("competitor_product");
  if (hasFactType(facts, "provider_frustration")) detected.add("provider_pain");
  if (hasFactType(facts, "staff_issue")) detected.add("staff_pain");
  if (hasFactType(facts, "staff_efficiency")) detected.add("staff_efficiency");
  if (hasWorkflowFact(facts)) detected.add("workflow_issue");
  if (hasVisualizationFact(facts)) detected.add("visualization");
  if (hasFactType(facts, "fixation_challenge")) detected.add("fixation");
  if (hasProductFitFact(facts)) detected.add("product_fit");
  if (hasFactType(facts, "room_turnover_issue")) detected.add("room_turnover");
  if (hasReadinessDelayFact(facts)) detected.add("readiness_delay");

  const confidence = highestConfidence(pipelineConfidenceLevels(pipeline));
  if (confidence === "Low") detected.add("confidence_low");
  if (confidence === "Medium") detected.add("confidence_medium");
  if (confidence === "High") detected.add("confidence_high");

  return detected;
}

export function isTortureFindingToken(value: string): value is TortureFindingToken {
  return (TORTURE_FINDING_TOKENS as readonly string[]).includes(value);
}
