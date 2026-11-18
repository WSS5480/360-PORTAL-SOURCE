import { describe, expect, it } from "vitest";

import { aggregateFindingEvidenceAcrossCases } from "./observationFindingEvidenceConfidence";
import { formatProviderContextComparison } from "./canonicalFindingNormalization";
import {
  deduplicateCanonicalFindings,
  formatFindingMaturityDisplay,
  hasRepeatedDuplicateWords,
  isJunkFindingText,
  linkProductFitSupportBasis,
  normalizeFactsToCanonicalFindings,
  normalizeObservationFactToCanonicalFinding,
} from "./canonicalFindingNormalization";
import { scoreFindingMaturity } from "./evidenceMaturityScoring";
import { buildConciseEvidenceGaps } from "./canonicalFindingNormalization";

describe("canonicalFindingNormalization", () => {
  it("Test A — rejects junk dictation with repeated duplicate words", () => {
    expect(hasRepeatedDuplicateWords("They observed observed observed")).toBe(true);
    expect(isJunkFindingText("They observed observed observed")).toBe(true);

    const finding = normalizeObservationFactToCanonicalFinding({
      type: "current_product",
      value: "They observed observed observed",
      evidence: "They observed observed observed",
    });
    expect(finding).toBeNull();

    const findings = normalizeFactsToCanonicalFindings([
      {
        type: "current_product",
        value: "They observed observed observed",
        evidence: "They observed observed observed",
      },
    ]);
    expect(findings).toHaveLength(0);
  });

  it("Test B — in-progress Product Alpha repeat uses pending provider context language", () => {
    const findings = normalizeFactsToCanonicalFindings([
      { type: "current_product", value: "Product Alpha", evidence: "They were using Product Alpha again" },
    ]);

    expect(findings[0]?.canonical_label).toBe("Product Alpha observed");

    const aggregated = aggregateFindingEvidenceAcrossCases([
      {
        caseId: "case-prior",
        caseComplete: true,
        findings: [{ label: "Product Alpha observed", normalizedFindingId: "product_in_use:product alpha" }],
      },
      {
        caseId: "case-current",
        caseComplete: false,
        isCurrentCase: true,
        findings: [{ label: "Product Alpha observed", normalizedFindingId: "product_in_use:product alpha" }],
      },
    ]);

    const product = aggregated[0];
    expect(product?.completedObservationCount).toBe(1);
    expect(product?.observationCount).toBe(2);
    expect(product?.maturityStatus).not.toBe("supported_pattern");

    expect(
      formatProviderContextComparison({
        status: "in_progress",
        currentCaseComplete: false,
        hasPriorMatch: true,
        displayLabel: "Product Alpha observed",
      }),
    ).toBe("Seen again in current note · Pending case completion");
  });

  it("Test C — positive staff signal is staff_workflow_context, not pain point", () => {
    const finding = normalizeObservationFactToCanonicalFinding({
      type: "staff_efficiency",
      value: "The team seemed organized again",
      evidence: "The team seemed organized again",
    });

    expect(finding?.finding_type).toBe("staff_workflow_context");
    expect(finding?.canonical_label).toBe("Staff appeared organized");
    expect(finding?.is_positive_signal).toBe(true);
    expect(finding?.is_pain_point).toBe(false);
    expect(finding?.categoryId).toBe("staff_workflow");
  });

  it("Test D — workflow delay produces clean bottleneck label", () => {
    const finding = normalizeObservationFactToCanonicalFinding({
      type: "workflow_issue",
      value: "delay getting visualization before fixation",
      evidence: "There was a delay getting visualization before fixation",
    });

    expect(finding?.finding_type).toBe("workflow_bottleneck");
    expect(finding?.canonical_label).toBe("Visualization challenge before fixation");
    expect(finding?.canonical_label).not.toMatch(/may be an|noted:/i);
  });

  it("Test E — product-fit links to workflow support_basis when present", () => {
    const findings = linkProductFitSupportBasis(
      normalizeFactsToCanonicalFindings([
        {
          type: "workflow_issue",
          value: "visualization before fixation delay",
          evidence: "There was a delay getting visualization before fixation",
        },
        {
          type: "product_fit_signal",
          value: "visualization issue may be a product fit opportunity",
          evidence: "That visualization issue may be a product fit opportunity",
        },
      ]),
    );

    const productFit = findings.find((entry) => entry.finding_type === "product_fit_opportunity");
    expect(productFit?.canonical_label).toBe("Visualization/fixation workflow opportunity");
    expect(productFit?.support_basis).toMatch(/Linked workflow/i);

    const hypothesisOnly = linkProductFitSupportBasis(
      normalizeFactsToCanonicalFindings([
        {
          type: "product_fit_signal",
          value: "workflow concept may be a product fit opportunity",
          evidence: "That workflow concept may be a product fit opportunity",
        },
      ]),
    )[0];
    expect(hypothesisOnly?.is_product_fit_hypothesis).toBe(true);
    expect(hypothesisOnly?.support_basis).toBeNull();
  });

  it("Test F — one completed case plus in-progress repeat display", () => {
    expect(
      formatFindingMaturityDisplay({
        observationCount: 2,
        completedObservationCount: 1,
        capturedFromCurrentNote: true,
        currentCaseComplete: false,
        hasPriorMatch: true,
      }),
    ).toBe("Observed once; seen again in current note · Moderate-low confidence");
  });

  it("Test G — two completed cases display", () => {
    expect(
      formatFindingMaturityDisplay({
        observationCount: 2,
        completedObservationCount: 2,
        capturedFromCurrentNote: false,
        currentCaseComplete: true,
        hasPriorMatch: true,
      }),
    ).toBe("Repeated across 2 completed cases · Moderate confidence");
  });

  it("Test H — three completed cases display", () => {
    expect(
      formatFindingMaturityDisplay({
        observationCount: 3,
        completedObservationCount: 3,
        capturedFromCurrentNote: false,
        currentCaseComplete: true,
        hasPriorMatch: true,
      }),
    ).toBe("Validated across completed cases · High confidence");
  });

  it("Test I — same product phrasings dedupe to one normalized finding", () => {
    const findings = deduplicateCanonicalFindings(
      normalizeFactsToCanonicalFindings([
        { type: "current_product", value: "Product Alpha used", evidence: "Product Alpha used" },
        { type: "current_product", value: "Product Alpha in use", evidence: "using Product Alpha" },
        { type: "current_product", value: "Product Alpha observed", evidence: "Product Alpha observed" },
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.canonical_label).toBe("Product Alpha observed");
    expect(findings[0]?.normalized_key).toMatch(/current_product_used:product_alpha/);
  });

  it("Test J — conflicting products reduce confidence, not increase", () => {
    const aggregated = aggregateFindingEvidenceAcrossCases([
      {
        caseId: "case-1",
        caseComplete: true,
        findings: [{ label: "Product Alpha observed", normalizedFindingId: "product_in_use:product alpha" }],
      },
      {
        caseId: "case-2",
        caseComplete: true,
        findings: [{ label: "Product Beta observed", normalizedFindingId: "product_in_use:product beta" }],
      },
    ]);

    const alpha = aggregated.find((entry) => entry.normalizedFindingId.includes("product alpha"));
    const beta = aggregated.find((entry) => entry.normalizedFindingId.includes("product beta"));
    expect(alpha?.maturityStatus).toBe("conflicting_evidence");
    expect(beta?.maturityStatus).toBe("conflicting_evidence");
    expect(alpha?.evidenceConfidenceLabel).toBe("Low confidence");
  });

  it("evidence gaps stay concise without duplicate repeat lines", () => {
    const gaps = buildConciseEvidenceGaps({
      currentCaseComplete: false,
      currentCaseHasCapturedNotes: true,
      missingPillarLabels: ["Provider pain points", "Staff pain points"],
      hasPendingRepeatedSignals: true,
      hasProductOrWorkflowSignal: true,
    });

    expect(gaps).toEqual([
      "Complete current case to confirm pending signals",
      "Provider pain points",
      "Staff pain points",
    ]);
    expect(gaps.some((gap) => /repeat evidence needed/i.test(gap))).toBe(false);
    expect(gaps.some((gap) => /product-fit opportunity/i.test(gap))).toBe(false);
  });

  it("cleans usage in use product labels", () => {
    const finding = normalizeObservationFactToCanonicalFinding({
      type: "current_product",
      value: "Product Alpha usage in use",
      evidence: "Product Alpha usage in use",
    });
    expect(finding?.canonical_label).toBe("Product Alpha observed");
    expect(finding?.canonical_label).not.toMatch(/usage in use/i);
  });

  it("product-fit without workflow stays low confidence at repeat", () => {
    const score = scoreFindingMaturity({
      label: "Workflow concept opportunity",
      normalizedFindingId: "product_interest",
      observationCount: 2,
      completedObservationCount: 2,
      capturedFromCurrentNote: false,
      isPositiveStaffSignal: false,
      isEarlySignal: true,
      hasUnderlyingWorkflowEvidence: false,
      findingKind: "product_fit_opportunity",
    });
    expect(score.maturityStatus).not.toBe("validated_pattern");
    expect(score.evidenceConfidenceLabel).not.toBe("High confidence");
  });
});
