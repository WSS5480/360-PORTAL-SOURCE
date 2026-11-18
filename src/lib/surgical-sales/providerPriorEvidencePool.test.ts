import { describe, expect, it } from "vitest";

import { buildObservationCaseIntelligenceSections } from "./buildObservationCaseBriefingView";
import { buildObservationLearningTabView } from "./buildObservationLearningTabView";
import { cleanCapturedFindingLabel } from "./findingDisplayLabels";
import {
  buildProviderPriorEvidencePool,
  findMatchingPriorEvidence,
  priorEvidencePoolToSignals,
  priorEvidenceToCanonicalFinding,
} from "./providerPriorEvidencePool";
import { findingToIntelligenceSignal } from "./caseIntelligenceSignals";
import { buildProviderContextDisplayText, toCanonicalFinding } from "./caseIntelligenceReconciliation";
import type { AggregatedFindingEvidence } from "./observationFindingEvidenceConfidence";

const PRIOR_COMPLETED_CASE = {
  id: "case-prior-alpha",
  status: "completed",
  observation_completed_at: "2026-06-01T18:00:00Z",
  procedure_type: "Procedure Type A",
  notes: "Product Alpha observed during Procedure Type A.",
};

function mockFinding(
  overrides: Partial<AggregatedFindingEvidence> & Pick<AggregatedFindingEvidence, "normalizedFindingId" | "label">,
): AggregatedFindingEvidence {
  return {
    matchKey: overrides.normalizedFindingId,
    observationCount: 1,
    completedObservationCount: 1,
    capturedFromCurrentNote: false,
    isPositiveStaffSignal: false,
    isEarlySignal: false,
    confidence: "Low",
    evidenceLabel: "Observed in 1 completed case",
    sourceCaseIds: ["case-prior-alpha"],
    ...overrides,
  };
}

describe("providerPriorEvidencePool — generic reconciliation", () => {
  it("1 — repeated product with different wording is not new", () => {
    const sections = buildObservationCaseIntelligenceSections({
      caseRow: { id: "case-current", status: "confirmed", procedure_type: "Procedure Type A" },
      activities: [
        {
          activity_type: "note",
          body: "They were using Product Alpha again during the case.",
          metadata_json: {
            ai_extraction: {
              facts: [{ type: "current_product", value: "Product Alpha", evidence: "using again" }],
            },
          },
        },
      ],
      priorCases: [PRIOR_COMPLETED_CASE],
    });

    const providerText = sections.providerContextItems.map((item) => item.text).join(" ");
    expect(providerText).toMatch(/noted again — also seen in this in-progress case/i);
    expect(providerText).toMatch(/in-progress case/i);
    expect(providerText).not.toMatch(/New product observed/i);
  });

  it("2 — product display cleanup removes usage in use", () => {
    const finding = mockFinding({
      normalizedFindingId: "product_in_use:product_alpha",
      label: "Product Alpha usage in use",
      sourceCaseIds: ["case-current"],
      capturedFromCurrentNote: true,
      completedObservationCount: 0,
    });
    expect(cleanCapturedFindingLabel(finding)).toBe("Product Alpha observed");
  });

  it("3 — new product when prior only had Product Alpha", () => {
    const pool = buildProviderPriorEvidencePool({
      currentCaseId: "case-current",
      caseRow: { id: "case-current", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: "Product Beta used today.",
          metadata_json: {
            ai_extraction: {
              facts: [{ type: "current_product", value: "Product Beta", evidence: "used today" }],
            },
          },
        },
      ],
      priorCases: [PRIOR_COMPLETED_CASE],
    });

    const current = findingToIntelligenceSignal(
      mockFinding({
        normalizedFindingId: "product_in_use:product_beta",
        label: "Product Beta observed",
        sourceCaseIds: ["case-current"],
        capturedFromCurrentNote: true,
        completedObservationCount: 0,
      }),
      {},
    );
    expect(findMatchingPriorEvidence(current, pool)).toBeUndefined();

    const priorAlpha = priorEvidencePoolToSignals(pool).find((signal) =>
      /product alpha/i.test(signal.label),
    );
    expect(priorAlpha).toBeDefined();
  });

  it("4 — repeated workflow with different wording", () => {
    const priorCase = {
      ...PRIOR_COMPLETED_CASE,
      id: "case-prior-workflow",
      live_observation_workflow: "Workflow Concept A delay observed",
      notes: "Workflow Concept A delay observed during setup.",
      activities: [
        {
          id: "act-workflow-prior",
          activity_type: "note",
          body: "Workflow Concept A delay observed during setup.",
          metadata_json: {
            ai_extraction: {
              facts: [
                {
                  type: "workflow_delay",
                  value: "Workflow Concept A delay",
                  evidence: "delay during setup",
                },
              ],
            },
          },
        },
      ],
    };

    const pool = buildProviderPriorEvidencePool({
      currentCaseId: "case-current",
      caseRow: {
        id: "case-current",
        status: "confirmed",
        live_observation_workflow: "Workflow Concept A pause during placement",
      },
      activities: [
        {
          activity_type: "note",
          body: "They paused again during Workflow Concept A before placement.",
          metadata_json: {
            ai_extraction: {
              facts: [
                {
                  type: "workflow_delay",
                  value: "Workflow Concept A pause",
                  evidence: "paused again",
                },
              ],
            },
          },
        },
      ],
      priorCases: [priorCase],
    });

    const current = findingToIntelligenceSignal(
      mockFinding({
        normalizedFindingId: "workflow_delay",
        label: "Workflow Concept A pause observed",
        sourceCaseIds: ["case-current"],
        capturedFromCurrentNote: true,
        completedObservationCount: 0,
      }),
      {},
    );

    expect(findMatchingPriorEvidence(current, pool)).toBeDefined();
    expect(
      buildProviderContextDisplayText({
        current: toCanonicalFinding(current, { caseComplete: false }),
        prior: priorEvidenceToCanonicalFinding(
          findMatchingPriorEvidence(current, pool)!,
        ),
        caseComplete: false,
        briefingKind: "follow_up",
      }).text,
    ).toMatch(/Workflow Concept A.*noted again/i);
  });

  it("5 — new workflow when prior only had Workflow Concept A", () => {
    const priorCase = {
      ...PRIOR_COMPLETED_CASE,
      live_observation_workflow: "Workflow Concept A delay",
    };
    const pool = buildProviderPriorEvidencePool({
      currentCaseId: "case-current",
      caseRow: { id: "case-current", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: "Workflow Concept B caused a delay today.",
          metadata_json: {
            ai_extraction: {
              facts: [
                { type: "workflow_delay", value: "Workflow Concept B delay", evidence: "delay today" },
              ],
            },
          },
        },
      ],
      priorCases: [priorCase],
    });

    const current = findingToIntelligenceSignal(
      mockFinding({
        normalizedFindingId: "workflow_delay",
        label: "Workflow Concept B delay",
        sourceCaseIds: ["case-current"],
        capturedFromCurrentNote: true,
        completedObservationCount: 0,
      }),
      {},
    );
    expect(findMatchingPriorEvidence(current, pool)).toBeUndefined();
  });

  it("6 — repeated staff workflow signal", () => {
    const priorCase = {
      ...PRIOR_COMPLETED_CASE,
      id: "case-prior-staff",
      live_observation_staff_process: "",
      notes: "",
      activities: [
        {
          id: "act-staff-prior",
          activity_type: "note",
          body: "Staff Signal A noted — team organized.",
          metadata_json: {
            ai_extraction: {
              facts: [
                {
                  type: "staff_efficiency",
                  value: "Staff Signal A",
                  evidence: "team organized",
                },
              ],
            },
          },
        },
      ],
    };
    const sections = buildObservationCaseIntelligenceSections({
      caseRow: { id: "case-current", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: "Staff Signal A again — team still organized.",
          metadata_json: {
            ai_extraction: {
              facts: [
                {
                  type: "staff_efficiency",
                  value: "Staff Signal A",
                  evidence: "again",
                },
              ],
            },
          },
        },
      ],
      priorCases: [priorCase],
    });

    const providerText = sections.providerContextItems.map((item) => item.text).join(" ");
    expect(providerText).not.toMatch(/staff workflow:/i);
    expect(providerText).toMatch(/positive staff workflow|staff appeared/i);
    expect(providerText).not.toMatch(/New staff workflow signal captured/i);
  });

  it("7 — provider frustrations not yet noted", () => {
    const sections = buildObservationCaseIntelligenceSections({
      caseRow: { id: "case-current", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: "Product Alpha observed. Staff seemed organized.",
        },
      ],
      priorCases: [PRIOR_COMPLETED_CASE],
    });

    expect(
      sections.providerContextItems.some((item) => /Provider frustrations not yet noted/i.test(item.text)),
    ).toBe(true);
  });

  it("8 — staff frustrations not yet noted when only positive staff workflow captured", () => {
    const sections = buildObservationCaseIntelligenceSections({
      caseRow: { id: "case-current", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: "Staff Signal A — positive staff workflow context.",
          metadata_json: {
            ai_extraction: {
              facts: [
                {
                  type: "staff_efficiency",
                  value: "Staff Signal A",
                  evidence: "positive context",
                },
              ],
            },
          },
        },
      ],
      priorCases: [],
    });

    expect(
      sections.providerContextItems.some((item) => /Staff frustrations not yet noted/i.test(item.text)),
    ).toBe(true);
  });

  it("9 — prior case activities included in repeat detection", () => {
    const priorCase = {
      id: "case-prior-activity",
      status: "completed",
      observation_completed_at: "2026-06-01T18:00:00Z",
      notes: "",
      activities: [
        {
          id: "act-1",
          activity_type: "note",
          body: "Product Alpha observed in prior case activity.",
          metadata_json: {
            ai_extraction: {
              facts: [{ type: "current_product", value: "Product Alpha", evidence: "observed" }],
            },
          },
        },
      ],
    };

    const sections = buildObservationCaseIntelligenceSections({
      caseRow: { id: "case-current", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: "They were using Product Alpha again.",
        },
      ],
      priorCases: [priorCase],
    });

    const providerText = sections.providerContextItems.map((item) => item.text).join(" ");
    expect(providerText).toMatch(/noted again — also seen in this in-progress case/i);
    expect(providerText).not.toMatch(/New product observed/i);
  });

  it("10 — prior snapshot included in repeat detection", () => {
    const priorCase = {
      id: "case-prior-snapshot",
      status: "completed",
      observation_completed_at: "2026-06-01T18:00:00Z",
      notes: "",
      observation_workflow_intelligence_snapshot: {
        categories: [{ items: ["Product Alpha observed from snapshot"] }],
      },
    };

    const sections = buildObservationCaseIntelligenceSections({
      caseRow: { id: "case-current", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: "Product Alpha used again today.",
          metadata_json: {
            ai_extraction: {
              facts: [{ type: "current_product", value: "Product Alpha", evidence: "used again" }],
            },
          },
        },
      ],
      priorCases: [priorCase],
    });

    const providerText = sections.providerContextItems.map((item) => item.text).join(" ");
    expect(providerText).toMatch(/noted again — also seen in this in-progress case/i);
    expect(providerText).not.toMatch(/New product observed/i);
  });

  it("11 — saved provider intelligence included as prior evidence", () => {
    const sections = buildObservationCaseIntelligenceSections({
      caseRow: { id: "case-current", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: "Product Alpha used again today.",
          metadata_json: {
            ai_extraction: {
              facts: [{ type: "current_product", value: "Product Alpha", evidence: "used again" }],
            },
          },
        },
      ],
      priorCases: [],
      providerContact: {
        provider_product_preferences: "Product Alpha preferred for Procedure Type A",
        provider_intelligence_field_metadata: {
          provider_product_preferences: {
            evidence_text: "Product Alpha preferred for Procedure Type A",
            validated_at: "2026-05-01T00:00:00Z",
          },
        },
      },
    });

    const providerText = sections.providerContextItems.map((item) => item.text).join(" ");
    expect(providerText).toMatch(/noted again — also seen in this in-progress case/i);
    expect(providerText).not.toMatch(/New product observed/i);
  });

  it("12 — organization-inherited intelligence is not provider-confirmed evidence", () => {
    const pool = buildProviderPriorEvidencePool({
      currentCaseId: "case-current",
      caseRow: { id: "case-current", status: "confirmed" },
      activities: [{ activity_type: "note", body: "First observation for this provider." }],
      priorCases: [],
      providerContact: {
        provider_observation_access_path: "Shared scheduler contact from organization baseline",
        provider_intelligence_field_metadata: {
          provider_observation_access_path: {
            evidence_text: "Shared scheduler contact from organization baseline",
            organization_inheritance: true,
          },
        },
      },
    });

    expect(pool.some((evidence) => /scheduler/i.test(evidence.displayLabel))).toBe(false);
  });

  it("13 — case count remains correct with one completed and one in-progress note", () => {
    const view = buildObservationLearningTabView({
      caseRow: { id: "case-current", status: "confirmed" },
      activities: [{ activity_type: "note", body: "Product Alpha observed again." }],
      priorCases: [PRIOR_COMPLETED_CASE],
    });

    expect(view.programCasesLabel).toBe("1 of 5 observation cases complete");
    expect(view.programInProgressNote).toBe("1 in-progress case note captured");
  });

  it("14 — in-progress repeat detection does not increment completed count", () => {
    const view = buildObservationLearningTabView({
      caseRow: { id: "case-current", status: "confirmed" },
      activities: [{ activity_type: "note", body: "Product Alpha used again." }],
      priorCases: [PRIOR_COMPLETED_CASE],
    });

    const sections = buildObservationCaseIntelligenceSections({
      caseRow: { id: "case-current", status: "confirmed" },
      activities: [{ activity_type: "note", body: "Product Alpha used again." }],
      priorCases: [PRIOR_COMPLETED_CASE],
    });

    expect(view.programCasesLabel).toBe("1 of 5 observation cases complete");
    expect(sections.providerContextItems.some((item) => /noted again — also seen in this in-progress case/i.test(item.text))).toBe(true);
  });
});

describe("buildProviderContextDisplayText — generic wording", () => {
  it("uses concise repeated product wording for in-progress cases", () => {
    const current = toCanonicalFinding(
      findingToIntelligenceSignal(
        mockFinding({
          normalizedFindingId: "product_in_use:product_alpha",
          label: "Product Alpha usage in use",
          sourceCaseIds: ["case-current"],
          capturedFromCurrentNote: true,
          completedObservationCount: 0,
        }),
        {},
      ),
      { caseComplete: false },
    );
    const prior = toCanonicalFinding(
      findingToIntelligenceSignal(
        mockFinding({
          normalizedFindingId: "product_in_use:product_alpha",
          label: "Product Alpha observed",
        }),
        {},
      ),
    );

    const result = buildProviderContextDisplayText({
      current,
      prior,
      caseComplete: false,
      briefingKind: "follow_up",
    });
    expect(result.text).toBe("Product Alpha noted again — also seen in this in-progress case.");
  });
});
