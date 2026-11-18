import { describe, expect, it } from "vitest";

import { aggregateFindingEvidenceAcrossCases } from "./observationFindingEvidenceConfidence";
import {
  isJunkFindingText,
  normalizeFactsToCanonicalFindings,
  normalizeMessyExtractedLabel,
} from "./canonicalFindingNormalization";
import {
  buildObservationOnlyFindingTitle,
  containsInterpretiveTitleLanguage,
} from "./findingDisplayContract";
import { FINDING_TITLE_INTERPRETATION_PATTERN } from "./findingTitleLanguage";
import { cleanCapturedFindingLabel } from "./findingDisplayLabels";
import { formatIntelligenceFindingLabel } from "./caseIntelligenceSignals";
import type { AggregatedFindingEvidence } from "./observationFindingEvidenceConfidence";

const INTERPRETATION_TOKENS = [
  "observed again",
  "repeated",
  "may",
  "might",
  "appears",
  "signal captured",
  "keep watching",
  "strengthens",
  "needs supporting evidence",
  "pending completion",
  "new signal",
  "case not complete",
];

function assertTitleIsObservationOnly(title: string): void {
  expect(title.trim().length).toBeGreaterThan(0);
  expect(containsInterpretiveTitleLanguage(title)).toBe(false);
  for (const token of INTERPRETATION_TOKENS) {
    expect(title.toLowerCase()).not.toContain(token);
  }
}

function toSignal(finding: AggregatedFindingEvidence) {
  return {
    label: finding.label,
    type: finding.normalizedFindingId.startsWith("product_in_use:")
      ? "observed_product"
      : "workflow_signal",
    normalizedFindingId: finding.normalizedFindingId,
    productContext: null,
    workflowStep: null,
  };
}

describe("finding display contract — observation-only titles", () => {
  it("rejects junk interpretive LLM labels at normalization", () => {
    expect(isJunkFindingText("Uncertain workflow integration")).toBe(true);
    expect(isJunkFindingText("Workflow area keep watching")).toBe(true);

    const findings = normalizeFactsToCanonicalFindings([
      {
        type: "workflow_issue",
        value: "Uncertain workflow integration",
        evidence: "Not sure yet how this integrates into their workflow",
      },
      {
        type: "workflow_issue",
        value: "Workflow area keep watching",
        evidence: "Keep watching the workflow area during setup",
      },
    ]);
    expect(findings).toHaveLength(0);
  });

  it("remaps messy LLM-shaped labels to canonical observation titles", () => {
    expect(normalizeMessyExtractedLabel("Product Alpha used again")).toBe("Product Alpha observed");
    expect(normalizeMessyExtractedLabel("New workflow signal captured: delay")).toBe("Workflow delay");
    expect(normalizeMessyExtractedLabel("Team appeared organized again")).toBe(
      "Staff appeared organized",
    );
    expect(
      normalizeMessyExtractedLabel("Workflow Concept A may be a product-fit opportunity", {
        findingType: "product_fit_opportunity",
      }),
    ).toMatch(/opportunity$/i);
  });

  it("never puts repeat language in product finding titles", () => {
    const finding: AggregatedFindingEvidence = {
      label: "Product Alpha used again",
      matchKey: "product_in_use:product alpha",
      normalizedFindingId: "product_in_use:product alpha",
      observationCount: 2,
      completedObservationCount: 1,
      capturedFromCurrentNote: true,
      isPositiveStaffSignal: false,
      isEarlySignal: false,
      confidence: "Low",
      evidenceLabel: "Captured from current case note",
      sourceCaseIds: ["case-1", "case-2"],
    };

    const title = buildObservationOnlyFindingTitle(finding, toSignal(finding));
    assertTitleIsObservationOnly(title);
    expect(title).toBe("Product Alpha observed");
  });

  it("never puts signal-repeated language in workflow finding titles", () => {
    const finding: AggregatedFindingEvidence = {
      label: "Workflow Concept A delay observed again",
      matchKey: "workflow_delay",
      normalizedFindingId: "workflow_delay",
      observationCount: 2,
      completedObservationCount: 2,
      capturedFromCurrentNote: false,
      isPositiveStaffSignal: false,
      isEarlySignal: false,
      confidence: "Medium",
      evidenceLabel: "Observed in 2 completed cases",
      sourceCaseIds: ["case-1", "case-2"],
    };

    const title = formatIntelligenceFindingLabel(finding);
    assertTitleIsObservationOnly(title);
    expect(title).toBe("Workflow delay");
  });

  it("excludes inferred product-fit from main finding title eligibility", () => {
    const inferred: AggregatedFindingEvidence = {
      label: "Workflow opportunity",
      matchKey: "product_fit_visualization_fixation_workflow",
      normalizedFindingId: "product_fit_visualization_fixation_workflow",
      observationCount: 1,
      completedObservationCount: 0,
      capturedFromCurrentNote: true,
      isPositiveStaffSignal: false,
      isEarlySignal: true,
      confidence: "Low",
      evidenceLabel: "Captured from current case note",
      sourceCaseIds: ["case-1"],
      isInferred: true,
    };

    expect(cleanCapturedFindingLabel(inferred)).toBe("");
  });

  it("prefers shorter factual labels during aggregation", () => {
    const aggregated = aggregateFindingEvidenceAcrossCases([
      {
        caseId: "case-1",
        caseComplete: true,
        findings: [
          {
            label: "Workflow Concept A delay observed again — strengthens prior signal",
            normalizedFindingId: "workflow_delay",
          },
        ],
      },
      {
        caseId: "case-2",
        caseComplete: true,
        findings: [{ label: "Workflow delay", normalizedFindingId: "workflow_delay" }],
      },
    ]);

    expect(aggregated[0]?.label).toBe("Workflow delay");
    assertTitleIsObservationOnly(cleanCapturedFindingLabel(aggregated[0]!));
  });

  it("pattern covers required interpretation tokens", () => {
    for (const sample of [
      "observed again",
      "may be opportunity",
      "keep watching",
      "signal captured",
      "needs supporting evidence",
    ]) {
      expect(FINDING_TITLE_INTERPRETATION_PATTERN.test(sample)).toBe(true);
    }
  });
});
