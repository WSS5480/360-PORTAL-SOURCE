import { describe, expect, it } from "vitest";
import {
  buildGuidedIntelCaptureAudienceCounts,
  buildGuidedIntelCaptureLaunchStats,
  buildGuidedIntelCaptureProgress,
  buildGuidedIntelCaptureQueue,
  buildGuidedIntelCaptureSessionEnd,
  formatDiscoveryAudienceChipLabel,
  formatGuidedIntelExitSummaryLines,
  formatGuidedIntelRemainingLabel,
  guidedDiscoveryCategoryDisplay,
  guidedIntelCaptureCtaLabel,
  GUIDED_INTEL_CAPTURE,
} from "./providerGuidedIntelCapture";
import { isIntelligenceFieldDeprioritizedForDiscovery } from "./operationalIntelligenceReadiness";
import {
  fieldHasIntelligenceSignal,
  shouldAutoAdvanceRapidDiscoveryAnswer,
} from "./providerIntelligenceIncrementalCapture";
import { intelligenceCaptureSpecForKey } from "./providerIntelligenceStructuredCapture";
import type { WizardFieldConfig } from "./providerWizardFields";
import type { OrganizationIntelligenceBaseline } from "./loadOrganizationIntelligenceBaseline";
import { DISCOVERY_STAKEHOLDER_PATH_OPTIONS } from "./providerIntelligenceStakeholderDiscovery";

const ORG_BASELINE: OrganizationIntelligenceBaseline = {
  organizationId: "org-1",
  organizationName: "Sinai Hospital",
  supportContacts: [],
  fields: {
    provider_observation_credentialing_needed: {
      dbKey: "provider_observation_credentialing_needed",
      label: "Observation credentialing required?",
      value: "yes|required",
      displayLine: "Vendor credentialing required",
      contributorCount: 2,
    },
    provider_credentialing_status: {
      dbKey: "provider_credentialing_status",
      label: "Vendor credentialing process",
      value: "committee|Monthly committee",
      displayLine: "Monthly credentialing committee",
      contributorCount: 1,
    },
  },
};

describe("providerGuidedIntelCapture", () => {
  it("prioritizes unresolved questions across visible sections", () => {
    const queue = buildGuidedIntelCaptureQueue({
      provider_observation_feasibility: "",
      provider_procedure_focus: "",
    });
    expect(queue.length).toBeGreaterThan(0);
    expect(queue[0].globalIndex).toBe(1);
    expect(queue[0].prompt.length).toBeGreaterThan(10);
    expect(queue[0].sectionLabel.length).toBeGreaterThan(0);
  });

  it("uses enrichment CTAs instead of required-setup language", () => {
    expect(guidedIntelCaptureCtaLabel(8, 0)).toBe(GUIDED_INTEL_CAPTURE.buildAccountIntel);
    expect(guidedIntelCaptureCtaLabel(6, 2)).toBe(GUIDED_INTEL_CAPTURE.addContext);
    expect(guidedIntelCaptureCtaLabel(2, 4)).toBe(GUIDED_INTEL_CAPTURE.addContext);
    expect(guidedIntelCaptureCtaLabel(0, 10)).toBe(GUIDED_INTEL_CAPTURE.refineVisibility);
  });

  it("summarizes session end with insights added and items left for later", () => {
    const baseline = { provider_observation_feasibility: "" };
    const current = { provider_observation_feasibility: "easy" };
    const end = buildGuidedIntelCaptureSessionEnd({
      baseline,
      current,
      answeredDbKeys: ["provider_observation_feasibility"],
      sessionTotal: 8,
      remainingQueueLength: 7,
    });
    expect(end.savedByScope.length).toBeGreaterThan(0);
    expect(end.savedByScope.some((g) => g.scope === "provider")).toBe(true);
    expect(end.readinessLine).toMatch(/visibility|provider ·/i);
    expect(end.exitSummaryLines).toContain("1 insight added");
    expect(end.remainingCount).toBe(7);
    expect(end.exitSummaryLines.some((l) => /left for later/i.test(l))).toBe(true);
    expect(end.exitSummaryLines.some((l) => /gaps resolved/i.test(l))).toBe(false);
  });

  it("builds stable question progress from session total and queue length", () => {
    const progress = buildGuidedIntelCaptureProgress({
      sessionTotal: 8,
      queueLength: 7,
      discoveryStakeholder: "scheduler_office",
      audienceCategory: "Office",
    });
    expect(progress.currentQuestionNumber).toBe(2);
    expect(progress.remainingCount).toBe(6);
    expect(progress.categoryLabel).toBe("Office / Scheduler");
    expect(progress.remainingLabel).toBe("6 open items · office still learning");
    expect(progress.mapProgressLabel).toBe("1 of 8 insights captured this session");
    expect(progress.progressPercent).toBe(13);
  });

  it("formats workflow-style remaining labels for All lane", () => {
    expect(
      formatGuidedIntelRemainingLabel({
        remainingCount: 3,
        discoveryStakeholder: "unspecified",
        sectionId: "clinical_workflow",
      }),
    ).toBe("3 open items · workflow insight opportunities");
    expect(
      formatGuidedIntelRemainingLabel({
        remainingCount: 2,
        discoveryStakeholder: "facility_or_access",
      }),
    ).toBe("2 open items · facility still learning");
  });

  it("formats enrichment exit summary lines", () => {
    expect(
      formatGuidedIntelExitSummaryLines({
        answeredCount: 3,
        dontKnowYetCount: 0,
        skippedCount: 0,
        notRelevantCount: 0,
        remainingCount: 2,
        facilityVisibilityImproved: true,
      }),
    ).toEqual(["3 insights added", "Facility visibility improved", "2 items left for later"]);
    expect(guidedDiscoveryCategoryDisplay("unspecified", "Provider")).toBe("Provider");
    expect(guidedDiscoveryCategoryDisplay("case_scoped", "Case")).toBe("Case");
  });

  it("exposes All / Facility / Provider / Case scope filters", () => {
    expect(DISCOVERY_STAKEHOLDER_PATH_OPTIONS.map((o) => o.shortLabel)).toEqual([
      "All",
      "Facility",
      "Provider",
      "Case",
    ]);
  });

  it("builds launch stats with subtitle when open items remain", () => {
    const stats = buildGuidedIntelCaptureLaunchStats({});
    expect(stats.unresolvedTotal).toBeGreaterThan(0);
    expect(stats.subtitle).toMatch(/visibility|still learning/i);
    expect(stats.deployment.combinedTier).toBeDefined();
  });

  it("builds audience counts for scope filter chips", () => {
    const counts = buildGuidedIntelCaptureAudienceCounts({});
    expect(counts.unspecified).toBeGreaterThan(0);
    expect(counts.provider_surgeon).toBeGreaterThan(0);
    expect(counts.facility_or_access).toBeGreaterThan(0);
    expect(counts.case_scoped).toBeGreaterThanOrEqual(0);
    expect(counts.unspecified).toBeGreaterThanOrEqual(counts.provider_surgeon);
    expect(formatDiscoveryAudienceChipLabel("All", counts.unspecified)).toMatch(/^All \(\d+\)$/);
  });

  it("auto-advances only simple segmented and chip fields", () => {
    const feasibility: WizardFieldConfig = {
      key: "provider_observation_feasibility",
      label: "Observation access",
      capture: intelligenceCaptureSpecForKey("provider_observation_feasibility"),
    };
    const accessPath: WizardFieldConfig = {
      key: "provider_observation_access_path",
      label: "Access path",
      capture: intelligenceCaptureSpecForKey("provider_observation_access_path"),
    };
    expect(shouldAutoAdvanceRapidDiscoveryAnswer(feasibility)).toBe(true);
    expect(shouldAutoAdvanceRapidDiscoveryAnswer(accessPath)).toBe(false);
    expect(fieldHasIntelligenceSignal("provider_observation_feasibility", "easy")).toBe(true);
  });

  it("excludes not_relevant fields from the All queue", () => {
    const contact = {
      provider_intelligence_field_metadata: {
        provider_procedure_focus: {
          source_type: "profile",
          source_label: "Provider profile",
          updated_at: "2026-01-01T00:00:00.000Z",
          discovery_stance: "not_relevant",
        },
      },
    };
    const queue = buildGuidedIntelCaptureQueue(contact, { discoveryStakeholder: "unspecified" });
    expect(queue.some((q) => q.dbKey === "provider_procedure_focus")).toBe(false);
    expect(
      isIntelligenceFieldDeprioritizedForDiscovery("provider_procedure_focus", {
        provider_procedure_focus: { discovery_stance: "not_relevant" },
      }),
    ).toBe(true);
  });

  it("surfaces inherited organization questions instead of re-asking facility facts", () => {
    const contact = {
      provider_observation_feasibility: "easy",
      provider_observation_credentialing_needed: "",
    };
    const queue = buildGuidedIntelCaptureQueue(contact, {
      discoveryStakeholder: "unspecified",
      organizationBaseline: ORG_BASELINE,
    });
    const inherited = queue.find((q) => q.dbKey === "provider_observation_credentialing_needed");
    expect(inherited?.discoveryMode).toBe("inherited_organization");
    expect(inherited?.prompt).toContain("Sinai Hospital");
    expect(inherited?.prompt).toContain("Vendor credentialing required");
  });

  it("skips inherited org questions after does_not_apply resolution metadata", () => {
    const contact = {
      provider_observation_feasibility: "easy",
      provider_intelligence_field_metadata: {
        provider_observation_credentialing_needed: {
          source_type: "profile",
          source_label: "Provider profile",
          updated_at: "2026-01-01T00:00:00.000Z",
          organization_inheritance: {
            stance: "does_not_apply",
            facility_display_line: "Vendor credentialing required",
            facility_value: "yes|required",
            resolved_at: "2026-05-01T00:00:00.000Z",
          },
        },
      },
    };
    const queue = buildGuidedIntelCaptureQueue(contact, {
      discoveryStakeholder: "unspecified",
      organizationBaseline: ORG_BASELINE,
    });
    expect(queue.some((q) => q.dbKey === "provider_observation_credentialing_needed")).toBe(false);
  });
});
