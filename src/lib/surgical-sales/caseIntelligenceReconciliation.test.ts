import { describe, expect, it } from "vitest";

import {
  buildCanonicalKeyFromSignal,
  buildProviderContextDisplayText,
  buildThisCaseDisplayLabel,
  cleanProductEvidenceGapLabel,
  conceptsMatch,
  dedupeFindingsByCanonicalKey,
  findMatchingPriorFinding,
  isOrganizationScopedFinding,
  isProviderScopedFinding,
  normalizeConceptText,
  reconcileFinding,
  toCanonicalFinding,
  type ReconcilableSignal,
} from "./caseIntelligenceReconciliation";
import { findingToIntelligenceSignal } from "./caseIntelligenceSignals";
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
    sourceCaseIds: ["case-prior"],
    ...overrides,
  };
}

function toSignal(
  finding: AggregatedFindingEvidence,
  procedureContext: string | null = null,
): ReconcilableSignal {
  return findingToIntelligenceSignal(finding, { procedureContext });
}

describe("caseIntelligenceReconciliation", () => {
  describe("generic normalization", () => {
    it("normalizes wrapper words without removing meaningful product identity", () => {
      expect(normalizeConceptText("Product Alpha usage in use")).toBe("product alpha");
      expect(normalizeConceptText("Product Alpha observed again")).toBe("product alpha");
      expect(normalizeConceptText("Workflow Concept A delay signal")).toBe("workflow concept a");
    });

    it("matches concepts with wording variation", () => {
      expect(conceptsMatch("workflow concept a during setup", "Workflow Concept A described differently")).toBe(true);
      expect(conceptsMatch("product alpha", "product beta")).toBe(false);
    });
  });

  describe("acceptance scenarios with placeholder data", () => {
    it("Test A — repeated product with wording variation is not classified as new", () => {
      const prior = toCanonicalFinding(
        toSignal(mockFinding({ normalizedFindingId: "product_in_use:product alpha", label: "Product Alpha observed" })),
      );
      const current = toCanonicalFinding(
        toSignal(
          mockFinding({
            normalizedFindingId: "product_in_use:product alpha usage",
            label: "Product Alpha use mentioned again with different wording",
            capturedFromCurrentNote: true,
            sourceCaseIds: ["case-current"],
          }),
        ),
        { caseComplete: false },
      );

      expect(findMatchingPriorFinding(current, [prior])).toBeDefined();
      expect(reconcileFinding({ current, prior, caseComplete: false })).toBe("in_progress");
      expect(
        buildProviderContextDisplayText({
          current,
          prior,
          caseComplete: false,
          briefingKind: "follow_up",
        }).text,
      ).toMatch(/noted again — also seen in this in-progress case/i);
      expect(
        buildProviderContextDisplayText({
          current,
          prior,
          caseComplete: false,
          briefingKind: "follow_up",
        }).text,
      ).not.toMatch(/^New product observed/i);
    });

    it("Test B — different product is new and conflicting with prior product pattern", () => {
      const prior = toCanonicalFinding(
        toSignal(mockFinding({ normalizedFindingId: "product_in_use:product alpha", label: "Product Alpha observed" })),
      );
      const current = toCanonicalFinding(
        toSignal(
          mockFinding({
            normalizedFindingId: "product_in_use:product beta",
            label: "Product Beta observed",
            capturedFromCurrentNote: true,
          }),
        ),
      );

      expect(findMatchingPriorFinding(current, [prior])).toBeUndefined();
      expect(reconcileFinding({ current, prior, caseComplete: false })).toBe("conflicting");
      expect(
        buildProviderContextDisplayText({
          current,
          prior,
          caseComplete: false,
          briefingKind: "follow_up",
        }).tone,
      ).toBe("conflicts");
    });

    it("Test C — repeated workflow with wording variation matches prior concept", () => {
      const prior = toCanonicalFinding(
        toSignal(
          mockFinding({
            normalizedFindingId: "workflow_concept_a",
            label: "Workflow Concept A during setup",
          }),
        ),
      );
      const current = toCanonicalFinding(
        toSignal(
          mockFinding({
            normalizedFindingId: "workflow_concept_a",
            label: "Workflow Concept A described with different language",
            capturedFromCurrentNote: true,
          }),
        ),
      );

      expect(findMatchingPriorFinding(current, [prior])).toBeDefined();
      expect(
        buildProviderContextDisplayText({
          current,
          prior,
          caseComplete: false,
          briefingKind: "follow_up",
        }).text,
      ).toMatch(/noted again — also seen in this in-progress case/i);
      expect(
        buildProviderContextDisplayText({
          current,
          prior,
          caseComplete: false,
          briefingKind: "follow_up",
        }).text,
      ).not.toMatch(/^New workflow note/i);
    });

    it("Test D — generic and specific workflow in same note keeps specific only", () => {
      const findings = [
        mockFinding({
          normalizedFindingId: "workflow_delay",
          label: "Generic delay signal",
          capturedFromCurrentNote: true,
        }),
        mockFinding({
          normalizedFindingId: "workflow_concept_a_setup",
          label: "Specific Workflow Concept A setup delay",
          capturedFromCurrentNote: true,
        }),
      ];

      const deduped = dedupeFindingsByCanonicalKey(findings, (finding) => toSignal(finding));
      expect(deduped).toHaveLength(1);
      expect(deduped[0]?.normalizedFindingId).toBe("workflow_concept_a_setup");
    });

    it("Test E — repeated provider pain point with wording variation", () => {
      const prior = toCanonicalFinding(
        toSignal(
          mockFinding({
            normalizedFindingId: "provider_frustration",
            label: "Provider Pain Concept A captured",
          }),
        ),
      );
      const current = toCanonicalFinding(
        toSignal(
          mockFinding({
            normalizedFindingId: "provider_frustration_repeat",
            label: "Provider Pain Concept A mentioned again with different wording",
            capturedFromCurrentNote: true,
          }),
        ),
      );

      expect(findMatchingPriorFinding(current, [prior])).toBeDefined();
      expect(
        buildProviderContextDisplayText({
          current,
          prior,
          caseComplete: false,
          briefingKind: "follow_up",
        }).text,
      ).toMatch(/noted again — provider frustration pattern is building/i);
    });

    it("Test F — repeated staff pain point with wording variation", () => {
      const prior = toCanonicalFinding(
        toSignal(
          mockFinding({
            normalizedFindingId: "staff_friction",
            label: "Staff Pain Concept A captured",
          }),
        ),
      );
      const current = toCanonicalFinding(
        toSignal(
          mockFinding({
            normalizedFindingId: "staff_friction_repeat",
            label: "Staff Pain Concept A mentioned again with different wording",
            capturedFromCurrentNote: true,
          }),
        ),
      );

      expect(findMatchingPriorFinding(current, [prior])).toBeDefined();
      expect(
        buildProviderContextDisplayText({
          current,
          prior,
          caseComplete: false,
          briefingKind: "follow_up",
        }).text,
      ).toMatch(/noted again — staff frustration pattern is building/i);
    });

    it("Test G — product-fit opportunity repeated strengthens hypothesis", () => {
      const prior = toCanonicalFinding(
        toSignal(
          mockFinding({
            normalizedFindingId: "product_fit_concept_a",
            label: "Product-fit Opportunity A captured",
          }),
        ),
      );
      const current = toCanonicalFinding(
        toSignal(
          mockFinding({
            normalizedFindingId: "product_fit_concept_a_repeat",
            label: "Product-fit Opportunity A appears again with different wording",
            capturedFromCurrentNote: true,
          }),
        ),
      );

      expect(findMatchingPriorFinding(current, [prior])).toBeDefined();
      expect(
        buildProviderContextDisplayText({
          current,
          prior,
          caseComplete: false,
          briefingKind: "follow_up",
        }).text,
      ).toMatch(/noted again — product opening looks more consistent/i);
    });

    it("Test H — support case resolved wording without observation-specific phrasing", () => {
      const current = toCanonicalFinding(
        toSignal(
          mockFinding({
            normalizedFindingId: "support_issue_a",
            label: "Support Issue A resolved after retraining",
            capturedFromCurrentNote: true,
          }),
        ),
      );

      const text = buildProviderContextDisplayText({
        current,
        caseComplete: true,
        briefingKind: "support",
        resolved: true,
      }).text;

      expect(text).toMatch(/resolved — monitor for recurrence/i);
      expect(text).not.toMatch(/observation cases complete/i);
      expect(text).not.toMatch(/debrief readiness/i);
    });

    it("Test I — product-covered case strengthens adoption signal", () => {
      const prior = toCanonicalFinding(
        toSignal(
          mockFinding({
            normalizedFindingId: "product_adoption_signal_a",
            label: "Product Adoption Signal A captured",
          }),
        ),
      );
      const current = toCanonicalFinding(
        toSignal(
          mockFinding({
            normalizedFindingId: "product_adoption_signal_a_repeat",
            label: "Product Adoption Signal A appears again",
            capturedFromCurrentNote: true,
          }),
        ),
      );

      expect(
        buildProviderContextDisplayText({
          current,
          prior,
          caseComplete: false,
          briefingKind: "product_covered",
        }).text,
      ).toMatch(/noted again — product use pattern is building/i);
      expect(
        buildProviderContextDisplayText({
          current,
          prior,
          caseComplete: false,
          briefingKind: "product_covered",
        }).text,
      ).not.toMatch(/observation cases complete/i);
    });

    it("Test J — provider product usage is provider-scoped, not organization-scoped", () => {
      const finding = toCanonicalFinding(
        toSignal(mockFinding({ normalizedFindingId: "product_in_use:product alpha", label: "Product Alpha observed" })),
      );

      expect(isProviderScopedFinding(finding)).toBe(true);
      expect(isOrganizationScopedFinding(finding)).toBe(false);
    });
  });

  describe("this-case display labels", () => {
    it("uses clean labels without awkward concatenations", () => {
      const finding = mockFinding({
        normalizedFindingId: "product_in_use:product alpha",
        label: "Product Alpha usage in use",
        capturedFromCurrentNote: true,
      });
      expect(buildThisCaseDisplayLabel(finding, toSignal(finding))).toBe("Product Alpha observed");
      expect(buildThisCaseDisplayLabel(finding, toSignal(finding))).not.toMatch(/usage in use/i);
    });

    it("cleans awkward product evidence gap labels", () => {
      expect(cleanProductEvidenceGapLabel("Product Alpha usage in use")).toBe("Product Alpha");
      expect(cleanProductEvidenceGapLabel("Product Alpha usage use")).toBe("Product Alpha");
    });

    it("builds stable canonical keys from meaning", () => {
      const left = toSignal(
        mockFinding({ normalizedFindingId: "product_in_use:product alpha", label: "Product Alpha in use" }),
      );
      const right = toSignal(
        mockFinding({
          normalizedFindingId: "product_in_use:product alpha usage in use",
          label: "Product Alpha usage in use",
        }),
      );
      expect(buildCanonicalKeyFromSignal(left)).toBe(buildCanonicalKeyFromSignal(right));
    });
  });
});
