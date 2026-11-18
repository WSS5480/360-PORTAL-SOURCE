import { describe, expect, it } from "vitest";

import {
  buildCaseFocusFromSignals,
  buildContextImpactText,
  buildIntelligenceSignals,
  canonicalProductKey,
  canonicalWorkflowKey,
  CASE_BRIEF_BASELINE_MISSING,
  dedupeFindingsForThisCaseDisplay,
  effectiveCanonicalWorkflowKey,
  findingToIntelligenceSignal,
  findMatchingPriorSignal,
  formatFocusCue,
  formatIntelligenceFindingLabel,
  isPositiveStaffContextSignal,
  normalizeProductNameForMatching,
  normalizeWorkflowQuestionPhrase,
  rankSignalsForPrimaryQuestion,
  resolveSignalTypeFromFinding,
} from "./caseIntelligenceSignals";
import type { AggregatedFindingEvidence } from "./observationFindingEvidenceConfidence";

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
    sourceCaseIds: ["case-1"],
    ...overrides,
  };
}

describe("caseIntelligenceSignals", () => {
  it("maps findings to generic signal types", () => {
    expect(
      resolveSignalTypeFromFinding(
        mockFinding({ normalizedFindingId: "product_in_use:biotissue", label: "BioTissue in use" }),
      ),
    ).toBe("observed_product");

    expect(
      resolveSignalTypeFromFinding(
        mockFinding({
          normalizedFindingId: "workflow_delay",
          label: "Graft preparation delay",
        }),
      ),
    ).toBe("workflow_bottleneck");

    expect(
      resolveSignalTypeFromFinding(
        mockFinding({
          normalizedFindingId: "staff_efficiency_organized",
          label: "Team appeared organized",
          isPositiveStaffSignal: true,
        }),
      ),
    ).toBe("staff_workflow_signal");
  });

  it("Test A — follow-up case brief prioritizes workflow in focus today", () => {
    const findings = [
      mockFinding({
        normalizedFindingId: "staff_efficiency_organized",
        label: "Team appeared organized",
        isPositiveStaffSignal: true,
      }),
      mockFinding({
        normalizedFindingId: "workflow_visualization_before_fixation",
        label: "Visualization challenge before fixation",
      }),
    ];
    const signals = buildIntelligenceSignals({ findings, procedureContext: null });
    const ranked = rankSignalsForPrimaryQuestion(signals, false);

    expect(ranked[0]?.type).toBe("workflow_signal");
    expect(signals.some((signal) => isPositiveStaffContextSignal(signal))).toBe(true);
    expect(isPositiveStaffContextSignal(ranked[0]!)).toBe(false);

    const brief = buildCaseFocusFromSignals({
      kind: "follow_up",
      signals,
      procedureContext: "Robotic ventral hernia repair",
      debriefUnlocked: false,
      observationsRemaining: 3,
      completedObservations: 1,
      evidenceGaps: ["Provider pain points still unknown", "Staff pain points still unknown"],
    });

    expect(brief.knownSoFar).toEqual(
      expect.arrayContaining([
        "Visualization before fixation observed in 1 completed case",
        "Staff appeared organized",
      ]),
    );
    expect(brief.focusToday).toMatch(/visualization\/fixation workflow/i);
    expect(brief.focusToday).not.toMatch(/team appeared organized/i);
    expect(brief.focusToday).not.toMatch(/product-fit opening/i);
  });

  it("Test B — only positive staff workflow uses baseline-style focus", () => {
    const findings = [
      mockFinding({
        normalizedFindingId: "staff_efficiency_organized",
        label: "Team appeared organized",
        isPositiveStaffSignal: true,
      }),
    ];
    const signals = buildIntelligenceSignals({ findings, procedureContext: null });
    const brief = buildCaseFocusFromSignals({
      kind: "follow_up",
      signals,
      procedureContext: null,
      debriefUnlocked: false,
      observationsRemaining: 3,
      completedObservations: 1,
    });

    expect(brief.focusToday).toBe("Capture baseline workflow, product usage, and provider/staff pain points.");
    expect(brief.knownSoFar).toEqual(expect.arrayContaining(["Staff appeared organized"]));
  });

  it("Test C — prior product and workflow populate known and missing sections", () => {
    const findings = [
      mockFinding({
        normalizedFindingId: "product_in_use:bard_mesh",
        label: "Bard Mesh in use",
      }),
      mockFinding({
        normalizedFindingId: "workflow_visualization_before_fixation",
        label: "Visualization challenge before fixation",
      }),
    ];
    const signals = buildIntelligenceSignals({
      findings,
      evidenceProgress: [
        { id: "provider_pain_points", label: "Provider pain points", status: "missing", validated: false, confirmed: false },
        { id: "staff_pain_points", label: "Staff pain points", status: "missing", validated: false, confirmed: false },
      ] as never,
      procedureContext: null,
    });

    const brief = buildCaseFocusFromSignals({
      kind: "follow_up",
      signals,
      procedureContext: "Hernia repair",
      debriefUnlocked: false,
      observationsRemaining: 3,
      completedObservations: 1,
      evidenceGaps: [
        "Provider frustrations not yet understood",
        "Staff frustrations not yet understood",
        "Repeat evidence for visualization/fixation workflow",
        "Confirm whether Bard Mesh use is consistent across completed cases",
      ],
    });

    expect(brief.knownSoFar).toEqual(
      expect.arrayContaining([
        "Bard Mesh observed in 1 completed case",
        "Visualization before fixation observed in 1 completed case",
      ]),
    );
    expect(brief.stillMissing).toEqual(
      expect.arrayContaining([
        "Provider pain points",
        "Staff pain points",
        "Repeat evidence for visualization/fixation workflow",
        "Confirm whether Bard Mesh repeats",
      ]),
    );
    expect(brief.focusToday).toMatch(/product use, provider\/staff friction/i);
  });

  it("Test D — baseline case brief uses standard missing categories", () => {
    const brief = buildCaseFocusFromSignals({
      kind: "baseline",
      signals: [],
      procedureContext: null,
      debriefUnlocked: false,
      observationsRemaining: 4,
      completedObservations: 0,
    });

    expect(brief.knownSoFar).toEqual(["No prior case evidence captured yet"]);
    expect(brief.stillMissing).toEqual([...CASE_BRIEF_BASELINE_MISSING]);
    expect(brief.focusToday).toBe("Capture baseline workflow, product usage, and provider/staff pain points.");
  });

  it("normalizes workflow phrases for question-safe wording", () => {
    expect(normalizeWorkflowQuestionPhrase("Visualization challenge before fixation")).toBe(
      "visualization before fixation",
    );
    expect(normalizeWorkflowQuestionPhrase("Extra visualization time before fixation")).toBe(
      "visualization before fixation",
    );
    expect(normalizeWorkflowQuestionPhrase("Team appeared organized")).toBe("organized");
  });

  it("emphasizes instrument setup workflow for orthopedic follow-up", () => {
    const signal = findingToIntelligenceSignal(
      mockFinding({
        normalizedFindingId: "workflow_delay",
        label: "Instrument setup confusion",
      }),
      { procedureContext: "Orthopedic fixation" },
    );

    const brief = buildCaseFocusFromSignals({
      kind: "follow_up",
      signals: [signal],
      procedureContext: "Orthopedic fixation",
      debriefUnlocked: false,
      observationsRemaining: 3,
      completedObservations: 1,
    });

    expect(brief.focusToday).toMatch(/instrument setup/i);
  });

  it("formats confirm today items with rep-facing phrasing", () => {
    expect(formatFocusCue("Is Bard Mesh used again?")).toBe("Is Bard Mesh used again?");
    expect(formatFocusCue("Does visualization before fixation slow the case?")).toBe(
      "Does visualization before fixation slow the case?",
    );
    expect(formatFocusCue("Listen for provider frustration, hesitation, workaround, or unmet need.")).toBe(
      "Does the provider react with hesitation, frustration, or workaround?",
    );
    expect(
      formatFocusCue("Does the visualization/fixation workflow create a product-fit opening?"),
    ).toBe("Does the visualization/fixation workflow create a product-fit opening?");
    expect(formatFocusCue("Current product identified?")).toBe("Identify current product used.");
  });

  it("formats clean This Case finding labels without raw enums", () => {
    expect(
      formatIntelligenceFindingLabel(
        mockFinding({ normalizedFindingId: "product_in_use:product_a", label: "Product A usage in use" }),
      ),
    ).toBe("Product A observed");

    expect(
      formatIntelligenceFindingLabel(
        mockFinding({
          normalizedFindingId: "workflow_delay",
          label: "Workflow Signal A during setup",
        }),
      ),
    ).toBe("Workflow delay");
  });

  it("matches prior signals by normalized product and workflow identity", () => {
    const priors = buildIntelligenceSignals({
      findings: [
        mockFinding({ normalizedFindingId: "product_in_use:product_a", label: "Product A in use" }),
        mockFinding({
          normalizedFindingId: "workflow_setup_delay",
          label: "Workflow Signal A during setup",
        }),
      ],
      procedureContext: null,
    });

    const currentProduct = findingToIntelligenceSignal(
      mockFinding({
        normalizedFindingId: "product_in_use:product_a",
        label: "Product A used again",
        capturedFromCurrentNote: true,
      }),
      { procedureContext: null },
    );

    expect(findMatchingPriorSignal(currentProduct, priors)?.label).toMatch(/Product A/i);
    expect(buildContextImpactText(currentProduct, undefined, {
      caseComplete: false,
      priorSignals: priors,
    }).text).toMatch(/noted again — also seen in this in-progress case/i);
    expect(buildContextImpactText(currentProduct, undefined, {
      caseComplete: true,
      priorSignals: priors,
    }).text).toMatch(/noted in 2 completed cases — same product pattern/i);
  });

  describe("canonical matching and deduplication", () => {
    it("Test 1 — product repeat with label variation canonicalizes to same product", () => {
      expect(normalizeProductNameForMatching("Bard Mesh usage in use")).toBe("bard mesh");
      expect(normalizeProductNameForMatching("Bard Mesh in use")).toBe("bard mesh");

      const priors = buildIntelligenceSignals({
        findings: [
          mockFinding({
            normalizedFindingId: "product_in_use:bard mesh",
            label: "Bard Mesh in use",
          }),
        ],
        procedureContext: null,
      });

      const current = findingToIntelligenceSignal(
        mockFinding({
          normalizedFindingId: "product_in_use:bard mesh usage in use",
          label: "Bard Mesh usage in use",
          capturedFromCurrentNote: true,
        }),
        { procedureContext: null },
      );

      expect(canonicalProductKey(current)).toBe("bard mesh");
      expect(findMatchingPriorSignal(current, priors)).toBeDefined();
      expect(buildContextImpactText(current, undefined, {
        caseComplete: false,
        priorSignals: priors,
      }).text).toBe("Bard Mesh noted again — also seen in this in-progress case.");
      expect(buildContextImpactText(current, undefined, {
        caseComplete: false,
        priorSignals: priors,
      }).text).not.toMatch(/^New product observed/i);
    });

    it("Test 2 — workflow repeat with wording variation matches prior workflow concept", () => {
      const priors = buildIntelligenceSignals({
        findings: [
          mockFinding({
            normalizedFindingId: "workflow_delay",
            label: "Workflow Concept A delay observed",
          }),
        ],
        procedureContext: null,
      });

      const current = findingToIntelligenceSignal(
        mockFinding({
          normalizedFindingId: "workflow_delay",
          label: "Workflow Concept A pause observed",
          capturedFromCurrentNote: true,
        }),
        { procedureContext: null },
      );

      expect(findMatchingPriorSignal(current, priors)).toBeDefined();
      expect(buildContextImpactText(current, undefined, {
        caseComplete: false,
        priorSignals: priors,
      }).text).toMatch(/Workflow Concept A.*noted again — also seen in this in-progress case/i);
    });

    it("Test 3 — generic/specific workflow dedupe keeps specific visualization/fixation delay", () => {
      const findings = [
        mockFinding({
          normalizedFindingId: "workflow_delay",
          label: "Workflow delay observed",
          capturedFromCurrentNote: true,
        }),
        mockFinding({
          normalizedFindingId: "workflow_visualization_before_fixation",
          label: "Visualization challenge before fixation",
          capturedFromCurrentNote: true,
        }),
      ];

      const deduped = dedupeFindingsForThisCaseDisplay(findings, { procedureContext: null });
      expect(deduped.map((finding) => finding.normalizedFindingId)).toEqual([
        "workflow_visualization_before_fixation",
      ]);
      expect(
        formatIntelligenceFindingLabel(deduped[0]!, {
          procedureContext: null,
          coOccurringFindingIds: findings.map((finding) => finding.normalizedFindingId),
        }),
      ).toBe("Visualization challenge before fixation");
    });

    it("Test 4 — product-fit opportunity repeated matches prior topic", () => {
      const priors = buildIntelligenceSignals({
        findings: [
          mockFinding({
            normalizedFindingId: "product_interest",
            label: "Workflow Concept A may be a product-fit opportunity",
          }),
        ],
        procedureContext: null,
      });

      const current = findingToIntelligenceSignal(
        mockFinding({
          normalizedFindingId: "product_interest",
          label: "Product-fit opportunity around Workflow Concept A",
          capturedFromCurrentNote: true,
        }),
        { procedureContext: null },
      );

      expect(buildContextImpactText(current, undefined, {
        caseComplete: false,
        priorSignals: priors,
      }).text).toMatch(/Workflow Concept A noted again — product opening looks more consistent/i);
    });

    it("Test 5 — positive staff signal repeated across appeared/seemed wording", () => {
      const priors = buildIntelligenceSignals({
        findings: [
          mockFinding({
            normalizedFindingId: "staff_efficiency_organized",
            label: "Team appeared organized",
            isPositiveStaffSignal: true,
          }),
        ],
        procedureContext: null,
      });

      const current = findingToIntelligenceSignal(
        mockFinding({
          normalizedFindingId: "staff_efficiency_organized",
          label: "Team seemed organized again",
          isPositiveStaffSignal: true,
          capturedFromCurrentNote: true,
        }),
        { procedureContext: null },
      );

      expect(buildContextImpactText(current, undefined, {
        caseComplete: false,
        priorSignals: priors,
      }).text).toBe("Staff appeared organized again — positive staff workflow context.");
    });

    it("maps generic workflow delay to specific sibling workflow concept when present", () => {
      const delay = findingToIntelligenceSignal(
        mockFinding({
          normalizedFindingId: "workflow_delay",
          label: "Workflow delay observed",
        }),
        { procedureContext: null },
      );
      const specific = findingToIntelligenceSignal(
        mockFinding({
          normalizedFindingId: "workflow_delay",
          label: "Workflow Concept A delay observed",
        }),
        { procedureContext: null },
      );

      expect(effectiveCanonicalWorkflowKey(delay, [delay, specific])).toBe("workflow_concept_a");
    });
  });
});
