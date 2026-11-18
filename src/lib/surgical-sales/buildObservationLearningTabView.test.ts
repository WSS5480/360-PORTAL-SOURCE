import { describe, expect, it } from "vitest";

import {
  buildObservationLearningTabView,
  formatDebriefReadinessDetail,
  formatDebriefReadinessHeadline,
  formatEvidenceProgressLead,
  formatKnownFindingMeta,
  formatObservationProgramCasesLabel,
  resolveDebriefReadinessPhase,
  resolveFindingsSectionTitle,
} from "./buildObservationLearningTabView";

const BARD_MESH_NOTE =
  "They're still using Bard Mesh. Team seemed comfortable with it. They spent extra time trying to improve visualization before fixation. Staff seemed organized. Need more cases before I understand the pain points.";

const REGRESSION_INCOMPLETE_NOTE =
  "They were using Bard Mesh again. There were a couple points where they spent extra time getting a better view before placing fixation. I'm not sure yet if that is normal, but it did seem to slow the flow down a little. The team seemed organized. The early opportunity may be around visualization and fixation workflow.";

describe("observation intelligence dashboard labels", () => {
  it("formats program cases label", () => {
    expect(formatObservationProgramCasesLabel(1, 5)).toBe("1 of 5 observation cases complete");
  });

  it("formats debrief readiness status and detail", () => {
    expect(formatDebriefReadinessHeadline("building")).toBe("Not Ready for Debrief");
    expect(formatDebriefReadinessHeadline("nearly_ready")).toBe("Evidence Nearly Ready");
    expect(
      formatDebriefReadinessDetail({
        phase: "not_ready",
        completed: 0,
        total: 5,
        observationsRemaining: 5,
        currentCaseComplete: false,
        currentCaseHasCapturedNotes: true,
      }),
    ).toBe(
      "Early evidence captured in this case — mark it complete and keep observing to build debrief readiness.",
    );
    expect(
      formatDebriefReadinessDetail({
        phase: "building",
        completed: 1,
        total: 5,
        observationsRemaining: 4,
        currentCaseComplete: true,
        currentCaseHasCapturedNotes: true,
      }),
    ).toBe("Evidence is building — 4 more observations would strengthen debrief readiness.");
    expect(
      formatDebriefReadinessDetail({
        phase: "nearly_ready",
        completed: 3,
        total: 5,
        observationsRemaining: 2,
        currentCaseComplete: true,
        currentCaseHasCapturedNotes: true,
      }),
    ).toBe("Evidence is nearly ready, but debrief stays locked until 5 completed observations.");
  });

  it("formats evidence progress lead without validated wording for draft cases", () => {
    expect(
      formatEvidenceProgressLead({
        signalCount: 2,
        total: 5,
        currentCaseComplete: false,
        validatedCount: 0,
      }),
    ).toBe("2 of 5 evidence areas have captured signals");
    expect(
      formatEvidenceProgressLead({
        signalCount: 2,
        total: 5,
        currentCaseComplete: true,
        validatedCount: 0,
      }),
    ).toBe("2 of 5 evidence areas observed");
  });

  it("resolves findings section title from case completion", () => {
    expect(
      resolveFindingsSectionTitle({ currentCaseComplete: false, completedObservationCount: 0 }),
    ).toBe("Captured Findings");
    expect(
      resolveFindingsSectionTitle({ currentCaseComplete: true, completedObservationCount: 1 }),
    ).toBe("Observed Findings");
  });
});

describe("buildObservationLearningTabView", () => {
  it("returns empty learned categories when no intelligence exists", () => {
    const view = buildObservationLearningTabView({
      caseRow: {},
      activities: [],
    });

    expect(view.programCasesLabel).toBe("0 of 5 observation cases complete");
    expect(view.hasValidatedEvidence).toBe(false);
    expect(view.learnedCategories).toEqual([]);
    expect(view.validatedFindingGroups).toEqual([]);
    expect(view.evidenceGaps.length).toBe(5);
    expect(view.evidenceProgressValidatedCount).toBe(0);
    expect(view.evidenceProgressLead).toBe("0 of 5 evidence areas have captured signals");
    expect(view.findingsSectionTitle).toBe("Captured Findings");
  });

  it("shows captured findings for incomplete case notes without counting toward program progress", () => {
    const view = buildObservationLearningTabView({
      caseRow: { id: "case-1", status: "confirmed" },
      activities: [{ activity_type: "note", body: BARD_MESH_NOTE }],
      providerContact: { observation_count: 1 },
    });

    const statuses = Object.fromEntries(
      view.evidenceProgress.map((item) => [item.id, item.status]),
    );

    expect(view.programCasesLabel).toBe("0 of 5 observation cases complete");
    expect(view.programInProgressNote).toBe("1 in-progress case note captured");
    expect(view.debriefReadinessDetail).toBe(
      "Early evidence captured in this case — mark it complete and keep observing to build debrief readiness.",
    );
    expect(view.evidenceProgressSignalCount).toBe(3);
    expect(view.evidenceProgressValidatedCount).toBe(0);
    expect(view.evidenceProgressLead).toBe("3 of 5 evidence areas have captured signals");
    expect(view.findingsSectionTitle).toBe("Captured Findings");
    expect(statuses.current_products).toBe("captured_signal");
    expect(statuses.workflow_findings).toBe("early_signal");
    expect(statuses.product_fit_signals).toBe("early_signal");
    expect(statuses.provider_pain_points).toBe("missing");
    expect(statuses.staff_pain_points).toBe("missing");

    expect(view.evidenceGaps).toEqual(
      expect.arrayContaining([
        "Complete current case to confirm pending signals",
        "Provider pain points",
        "Staff pain points",
      ]),
    );

    const staffFinding = view.validatedFindingGroups
      .find((group) => group.id === "staff_workflow")
      ?.findings[0];
    expect(staffFinding?.evidenceLabel).toMatch(/Captured in current note|Pending case completion/i);
    expect(formatKnownFindingMeta(staffFinding!)).toContain("Positive staff workflow context");
    expect(formatKnownFindingMeta(staffFinding!)).toContain("Not a pain point");

    const productFitGroup = view.validatedFindingGroups.find(
      (group) => group.id === "product_fit_signals",
    );
    expect(productFitGroup?.title).toBe("Product Fit Opportunity");
    expect(productFitGroup?.findings[0]?.label).toBe("Visualization/fixation workflow opportunity");

    const workflowGroup = view.validatedFindingGroups.find((group) => group.id === "workflow_findings");
    expect(workflowGroup?.title).toBe("Workflow Findings");
    expect(workflowGroup?.findings[0]?.label).toMatch(/visualization before fixation/i);
    expect(workflowGroup?.findings[0]?.normalizedFindingId).toBe("workflow_visualization_before_fixation");
    expect(workflowGroup?.findings[0]?.evidenceLabel).toMatch(/Captured in current note|Pending case completion/i);
  });

  it("supplements partial ai_extraction metadata with workflow facts from note body", () => {
    const note =
      "They're still using Bard Mesh. Team seemed comfortable with it. There were a couple points where they spent extra time getting a better view before placing fixation. Staff seemed organized. it did seem to slow the flow down a little.";

    const view = buildObservationLearningTabView({
      caseRow: { id: "case-1", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: note,
          metadata_json: {
            ai_extraction: {
              facts: [
                { type: "current_product", value: "Bard Mesh", evidence: "using Bard Mesh" },
                { type: "competitor_product", value: "Bard Mesh", evidence: "using Bard Mesh" },
                { type: "staff_efficiency", value: "staff appeared organized", evidence: "organized" },
                {
                  type: "product_fit_signal",
                  value: "visualization and fixation workflow opportunity",
                  evidence: "inferred",
                },
              ],
            },
          },
        },
      ],
    });

    const statuses = Object.fromEntries(view.evidenceProgress.map((item) => [item.id, item.status]));
    expect(view.evidenceProgressSignalCount).toBe(3);
    expect(view.evidenceProgressLead).toBe("3 of 5 evidence areas have captured signals");
    expect(statuses.workflow_findings).toBe("early_signal");
    expect(statuses.current_products).toBe("captured_signal");
    expect(statuses.product_fit_signals).toBe("early_signal");
    expect(statuses.provider_pain_points).toBe("missing");
    expect(statuses.staff_pain_points).toBe("missing");

    const groupIds = view.validatedFindingGroups.map((group) => group.id);
    expect(groupIds).toEqual(
      expect.arrayContaining(["current_products_used", "workflow_findings", "staff_workflow", "product_fit_signals"]),
    );
  });

  it("credits evidence progress from bard mesh observation note after case completion", () => {
    const view = buildObservationLearningTabView({
      caseRow: { id: "case-1", status: "completed" },
      activities: [{ activity_type: "note", body: BARD_MESH_NOTE }],
      providerContact: { observation_count: 1 },
    });

    const statuses = Object.fromEntries(
      view.evidenceProgress.map((item) => [item.id, item.status]),
    );

    expect(view.programCasesLabel).toBe("1 of 5 observation cases complete");
    expect(view.debriefReadinessDetail).toBe(
      "Evidence is building — 4 more observations would strengthen debrief readiness.",
    );
    expect(view.evidenceProgressSignalCount).toBe(3);
    expect(view.evidenceProgressValidatedCount).toBe(0);
    expect(view.evidenceProgressLead).toBe("3 of 5 evidence areas observed");
    expect(view.findingsSectionTitle).toBe("Observed Findings");
    expect(statuses.current_products).toBe("observed");
    expect(statuses.workflow_findings).toBe("observed");
    expect(statuses.product_fit_signals).toBe("early_signal");
    expect(statuses.provider_pain_points).toBe("missing");
    expect(statuses.staff_pain_points).toBe("missing");

    const productFinding = view.validatedFindingGroups
      .find((group) => group.id === "current_products_used")
      ?.findings[0];
    expect(productFinding?.evidenceLabel).toMatch(/Observed in 1 completed case/i);
  });

  it("enters building phase after first completed observation", () => {
    const view = buildObservationLearningTabView({
      caseRow: { id: "case-1", status: "completed" },
      activities: [{ activity_type: "note", body: BARD_MESH_NOTE }],
      providerContact: { observation_count: 1 },
    });

    expect(view.debriefReadinessPhase).toBe("building");
    expect(view.debriefUnlocked).toBe(false);
    expect(resolveDebriefReadinessPhase({ debriefUnlocked: false, completed: 1 })).toBe("building");
  });

  it("maps dictated incomplete-case note to three captured evidence areas", () => {
    const view = buildObservationLearningTabView({
      caseRow: { id: "case-1", status: "confirmed" },
      activities: [{ activity_type: "note", body: REGRESSION_INCOMPLETE_NOTE }],
    });

    const statuses = Object.fromEntries(view.evidenceProgress.map((item) => [item.id, item.status]));
    expect(view.progress.completed).toBe(0);
    expect(view.evidenceProgressSignalCount).toBe(3);
    expect(view.evidenceProgressLead).toBe("3 of 5 evidence areas have captured signals");
    expect(statuses.workflow_findings).toBe("early_signal");
    expect(statuses.current_products).toBe("captured_signal");
    expect(statuses.product_fit_signals).toBe("early_signal");
    expect(statuses.provider_pain_points).toBe("missing");
    expect(statuses.staff_pain_points).toBe("missing");
    expect(view.evidenceProgressValidatedCount).toBe(0);

    const labels = view.validatedFindingGroups.flatMap((group) =>
      group.findings.map((finding) => finding.label),
    );
    expect(labels).toEqual(
      expect.arrayContaining([
        "Bard Mesh observed",
        "visualization before fixation",
        "Staff appeared organized",
        "Visualization/fixation workflow opportunity",
      ]),
    );
  });

  it("restores workflow from stored product-fit when note body is empty", () => {
    const view = buildObservationLearningTabView({
      caseRow: { id: "case-1", status: "confirmed" },
      activities: [
        {
          activity_type: "note",
          body: "",
          metadata_json: {
            ai_extraction: {
              facts: [
                { type: "current_product", value: "Bard Mesh", evidence: "They were using Bard Mesh again" },
                { type: "competitor_product", value: "Bard Mesh", evidence: "They were using Bard Mesh again" },
                { type: "staff_efficiency", value: "staff appeared organized", evidence: "The team seemed organized" },
                {
                  type: "product_fit_signal",
                  value: "visualization and fixation workflow opportunity",
                  evidence:
                    "The early opportunity may be around visualization and fixation workflow",
                },
              ],
            },
          },
        },
      ],
    });

    expect(view.evidenceProgressSignalCount).toBe(3);
    expect(
      view.validatedFindingGroups.find((group) => group.id === "workflow_findings")?.findings[0]?.label,
    ).toMatch(/visualization before fixation/i);
  });

  it("unlocks ready phase at five observations", () => {
    const view = buildObservationLearningTabView({
      caseRow: { id: "case-1", status: "completed" },
      activities: [{ activity_type: "note", body: BARD_MESH_NOTE }],
      providerContact: { observation_count: 5 },
    });

    expect(view.debriefUnlocked).toBe(true);
    expect(view.debriefReadinessPhase).toBe("ready");
    expect(view.debriefPreview).not.toBeNull();
  });

  it("credits evidence progress from workflow snapshot when live fields are empty", () => {
    const view = buildObservationLearningTabView({
      caseRow: {
        id: "case-1",
        status: "completed",
        observation_completed_at: "2026-06-08T18:00:00Z",
        observation_workflow_intelligence_snapshot: {
          sections: [
            { id: "competitor_observations", items: ["They were using Bard Mesh again"] },
            { id: "workflow_findings", items: ["Extra visualization time before fixation"] },
            { id: "product_opportunities", items: ["Visualization and fixation workflow opportunity"] },
          ],
        },
      },
      activities: [],
      providerContact: { observation_count: 0 },
    });

    expect(view.programCasesLabel).toBe("1 of 5 observation cases complete");
    expect(view.evidenceProgressSignalCount).toBeGreaterThanOrEqual(1);
    expect(view.evidenceProgressLead).toMatch(/of 5 evidence areas observed$/);
  });
});
