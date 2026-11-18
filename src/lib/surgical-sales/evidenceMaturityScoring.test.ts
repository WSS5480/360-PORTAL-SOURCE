import { describe, expect, it } from "vitest";

import { buildObservationLearningTabView } from "./buildObservationLearningTabView";
import {
  enrichAggregatedFindingsWithMaturity,
  formatEvidenceProgressLeadFromMaturity,
  resolveDebriefEvidenceReadiness,
  resolveEvidenceMaturityStatus,
  scoreFindingMaturity,
} from "./evidenceMaturityScoring";

function productFinding(input: {
  label: string;
  observationCount: number;
  completedObservationCount: number;
  capturedFromCurrentNote?: boolean;
  sourceCaseIds?: string[];
}) {
  return {
    label: input.label,
    matchKey: "product_in_use:product_alpha",
    normalizedFindingId: "product_in_use:product_alpha",
    observationCount: input.observationCount,
    completedObservationCount: input.completedObservationCount,
    capturedFromCurrentNote: input.capturedFromCurrentNote ?? false,
    isPositiveStaffSignal: false,
    isEarlySignal: false,
    confidence: "Low" as const,
    evidenceLabel: "placeholder",
    sourceCaseIds: input.sourceCaseIds ?? ["case-1"],
  };
}

describe("evidenceMaturityScoring", () => {
  it("Test 1 — one in-progress note with Product Alpha is captured_signal with low confidence", () => {
    const score = scoreFindingMaturity(
      productFinding({
        label: "Product Alpha observed",
        observationCount: 1,
        completedObservationCount: 0,
        capturedFromCurrentNote: true,
        sourceCaseIds: ["case-current"],
      }),
    );

    expect(score.maturityStatus).toBe("captured_signal");
    expect(score.evidenceConfidenceLabel).toBe("Low confidence");
    expect(score.maturityStatus).not.toBe("observed_once");
  });

  it("Test 2 — one completed case with Product Alpha is observed_once with low confidence", () => {
    const score = scoreFindingMaturity(
      productFinding({
        label: "Product Alpha observed",
        observationCount: 1,
        completedObservationCount: 1,
      }),
    );

    expect(score.maturityStatus).toBe("observed_once");
    expect(score.evidenceConfidenceLabel).toBe("Low confidence");
  });

  it("Test 3 — one completed case plus in-progress repeat is repeated_signal without counting as completed", () => {
    const score = scoreFindingMaturity(
      productFinding({
        label: "Product Alpha observed again",
        observationCount: 2,
        completedObservationCount: 1,
        capturedFromCurrentNote: true,
        sourceCaseIds: ["case-prior", "case-current"],
      }),
    );

    expect(score.maturityStatus).toBe("repeated_signal");
    expect(score.evidenceConfidenceLabel).toMatch(/Low|Moderate confidence/);

    const view = buildObservationLearningTabView({
      caseRow: { id: "case-current", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: "Product Alpha observed again.",
          metadata_json: {
            ai_extraction: {
              facts: [{ type: "current_product", value: "Product Alpha", evidence: "again" }],
            },
          },
        },
      ],
      priorCases: [
        {
          id: "case-prior",
          status: "completed",
          observation_completed_at: "2026-06-01T00:00:00Z",
          notes: "Product Alpha observed.",
        },
      ],
    });

    expect(view.programCasesLabel).toBe("1 of 5 observation cases complete");
  });

  it("Test 4 — two completed cases with Product Alpha is supported_pattern with moderate/high confidence", () => {
    const score = scoreFindingMaturity(
      productFinding({
        label: "Product Alpha observed",
        observationCount: 2,
        completedObservationCount: 2,
        sourceCaseIds: ["case-1", "case-2"],
      }),
    );

    expect(score.maturityStatus).toBe("supported_pattern");
    expect(["Moderate confidence", "High confidence"]).toContain(score.evidenceConfidenceLabel);
  });

  it("Test 5 — three completed cases with Workflow Concept A is validated_pattern with high confidence", () => {
    const score = scoreFindingMaturity({
      label: "Workflow Concept A delay observed",
      normalizedFindingId: "workflow_delay",
      observationCount: 3,
      completedObservationCount: 3,
      capturedFromCurrentNote: false,
      isPositiveStaffSignal: false,
      isEarlySignal: false,
      hasWorkflowImpact: true,
    });

    expect(score.maturityStatus).toBe("debrief_ready");
    expect(score.evidenceConfidenceLabel).toBe("High confidence");
  });

  it("Test 6 — workflow evidence increases while provider pain point remains missing", () => {
    const view = buildObservationLearningTabView({
      caseRow: { id: "case-current", status: "completed", observation_completed_at: "2026-06-08T00:00:00Z" },
      activities: [
        {
          activity_type: "note",
          body: "Workflow Concept A delay observed again.",
          metadata_json: {
            ai_extraction: {
              facts: [
                { type: "workflow_delay", value: "Workflow Concept A delay", evidence: "delay again" },
              ],
            },
          },
        },
      ],
      priorCases: [],
    });

    const workflowStatus = view.evidenceProgress.find((item) => item.id === "workflow_findings")?.status;
    const providerStatus = view.evidenceProgress.find((item) => item.id === "provider_pain_points")?.status;
    expect(workflowStatus).not.toBe("missing");
    expect(providerStatus).toBe("missing");
  });

  it("Test 7 — positive Staff Signal A does not count as staff pain point", () => {
    const score = scoreFindingMaturity({
      label: "Staff Signal A",
      normalizedFindingId: "staff_efficiency:staff_signal_a",
      observationCount: 2,
      completedObservationCount: 1,
      capturedFromCurrentNote: true,
      isPositiveStaffSignal: true,
      isEarlySignal: false,
    });

    expect(score.maturityStatus).toBe("repeated_signal");
    expect(resolveEvidenceMaturityStatus({
      label: "Staff Signal A",
      normalizedFindingId: "staff_efficiency:staff_signal_a",
      observationCount: 2,
      completedObservationCount: 1,
      capturedFromCurrentNote: true,
      isPositiveStaffSignal: true,
      isEarlySignal: false,
      findingKind: "staff_workflow_signal",
    })).toBe("repeated_signal");

    const view = buildObservationLearningTabView({
      caseRow: { id: "case-current", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: "Staff Signal A again.",
          metadata_json: {
            ai_extraction: {
              facts: [{ type: "staff_efficiency", value: "Staff Signal A", evidence: "again" }],
            },
          },
        },
      ],
    });

    expect(view.evidenceProgress.find((item) => item.id === "staff_pain_points")?.status).toBe("missing");
  });

  it("Test 8 — product-fit opportunity stays limited without underlying workflow evidence", () => {
    const score = scoreFindingMaturity({
      label: "Product-fit Opportunity A may be relevant",
      normalizedFindingId: "product_interest",
      observationCount: 2,
      completedObservationCount: 2,
      capturedFromCurrentNote: false,
      isPositiveStaffSignal: false,
      isEarlySignal: true,
      hasUnderlyingWorkflowEvidence: false,
      findingKind: "product_fit_opportunity",
    });

    expect(score.maturityStatus).toBe("repeated_signal");
    expect(score.maturityStatus).not.toBe("validated_pattern");
    expect(score.evidenceConfidenceLabel).not.toBe("High confidence");
  });

  it("Test 9 — conflicting Product Alpha and Product Beta lowers product confidence", () => {
    const findings = enrichAggregatedFindingsWithMaturity([
      productFinding({
        label: "Product Alpha observed",
        observationCount: 1,
        completedObservationCount: 1,
        sourceCaseIds: ["case-1"],
      }),
      {
        ...productFinding({
          label: "Product Beta observed",
          observationCount: 1,
          completedObservationCount: 1,
          sourceCaseIds: ["case-2"],
        }),
        normalizedFindingId: "product_in_use:product_beta",
        matchKey: "product_in_use:product_beta",
      },
    ]);

    const alpha = findings.find((finding) => finding.normalizedFindingId.includes("product_alpha"));
    const beta = findings.find((finding) => finding.normalizedFindingId.includes("product_beta"));
    expect(alpha?.maturityStatus).toBe("conflicting_evidence");
    expect(beta?.maturityStatus).toBe("conflicting_evidence");
    expect(alpha?.evidenceConfidenceLabel).toBe("Low confidence");
  });

  it("Test 10 — resolved support issue uses support wording, not observation debrief language", () => {
    const score = scoreFindingMaturity({
      label: "Support Issue A resolved after training",
      normalizedFindingId: "context:training_need",
      observationCount: 1,
      completedObservationCount: 1,
      capturedFromCurrentNote: false,
      isPositiveStaffSignal: false,
      isEarlySignal: false,
      findingKind: "support_issue",
    });

    expect(score.maturityStatus).toBe("observed_once");
    expect(score.maturityDisplayLabel).not.toMatch(/observation case/i);
    expect(score.evidenceLabel).toMatch(/Observed in 1 completed case|Low confidence/i);
  });
});

describe("evidence progress lead maturity wording", () => {
  it("uses validated wording only when maturity threshold is met", () => {
    expect(
      formatEvidenceProgressLeadFromMaturity({
        total: 5,
        pillars: [
          { status: "validated_pattern" },
          { status: "observed_once" },
          { status: "missing" },
          { status: "missing" },
          { status: "missing" },
        ],
      }),
    ).toBe("1 of 5 evidence areas validated");

    expect(
      formatEvidenceProgressLeadFromMaturity({
        total: 5,
        pillars: [
          { status: "repeated_signal" },
          { status: "supported_pattern" },
          { status: "missing" },
          { status: "missing" },
          { status: "missing" },
        ],
      }),
    ).toBe("2 of 5 evidence areas have repeated signals");
  });

  it("resolves nearly ready debrief when repeated signals exist but pain points are missing", () => {
    expect(
      resolveDebriefEvidenceReadiness({
        completedObservations: 2,
        requiredObservations: 5,
        findings: [
          scoreFindingMaturity({
            label: "Workflow Concept A delay observed",
            normalizedFindingId: "workflow_delay",
            observationCount: 2,
            completedObservationCount: 2,
            capturedFromCurrentNote: false,
            isPositiveStaffSignal: false,
            isEarlySignal: false,
            hasWorkflowImpact: true,
          }),
        ],
        hasProviderPainEvidence: false,
        hasStaffPainEvidence: false,
        hasWorkflowOrProductEvidence: true,
        onlyCapturedSignals: false,
      }),
    ).toBe("nearly_ready");
  });
});
