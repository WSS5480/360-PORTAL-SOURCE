import { describe, expect, it } from "vitest";

import { buildObservationCaseIntelligenceSections } from "./buildObservationCaseBriefingView";
import { buildObservationLearningTabView } from "./buildObservationLearningTabView";
import { buildObservationRepPresentationView } from "./buildObservationRepPresentationView";
import {
  appendRepPendingSuffix,
  formatRepObservedWithCompletedCount,
  hasPendingRepeatInCurrentCase,
  repDisplayCompletedObservationCount,
  repFindingCountsFromFinding,
  REP_PENDING_CURRENT_OBSERVATION,
} from "./observationRepFindingPresentation";
import {
  buildProviderFieldBriefing,
  buildWhatWeKnowLines,
  formatWhatWeKnowLine,
} from "./observationRepPresentationCopy";
import {
  isOntologyStaffWorkflowLabel,
  staffEfficiencyRepLabel,
} from "./staffEfficiencyRepLabels";
import type { AggregatedFindingEvidence } from "./observationFindingEvidenceConfidence";

const PRIOR_COMPLETED_CASE = {
  id: "case-prior-1",
  status: "completed",
  observation_completed_at: "2026-06-01T18:00:00Z",
  notes:
    "They're still using Bard Mesh. Team seemed organized. They spent extra time trying to improve visualization before fixation. It did seem to slow the flow down a little.",
  live_observation_competitors: "Bard Mesh observed",
  live_observation_workflow: "Extra visualization time before fixation",
  live_observation_staff_process: "Team seemed organized",
};

const IN_PROGRESS_FOLLOW_UP_NOTE =
  "They were using Bard Mesh again. There were a couple points where they spent extra time getting a better view before placing fixation. The team seemed organized.";

function mockFinding(
  overrides: Partial<AggregatedFindingEvidence> = {},
): AggregatedFindingEvidence {
  return {
    label: "Visualization challenge before fixation",
    matchKey: "workflow_visualization_before_fixation",
    normalizedFindingId: "workflow_visualization_before_fixation",
    observationCount: 2,
    completedObservationCount: 1,
    capturedFromCurrentNote: true,
    isPositiveStaffSignal: false,
    isEarlySignal: true,
    confidence: "Low",
    evidenceLabel: "Observed in 1 completed case",
    sourceCaseIds: ["case-prior-1", "case-current"],
    maturityStatus: "repeated_signal",
    ...overrides,
  };
}

function completedCountFromLine(line: string): number | null {
  const match = line.match(/(\d+) completed case/i);
  if (match?.[1]) return Number(match[1]);
  if (/across 2 completed cases/i.test(line)) return 2;
  if (/multiple completed cases/i.test(line)) return 2;
  return null;
}

describe("staffEfficiencyRepLabels", () => {
  it("maps common staff-efficiency concepts to natural language", () => {
    expect(staffEfficiencyRepLabel("familiarity")).toBe("Staff appeared familiar with workflow");
    expect(staffEfficiencyRepLabel("team organized")).toBe("Staff appeared organized");
    expect(staffEfficiencyRepLabel("comfortable with current products")).toBe(
      "Staff appeared comfortable with current process",
    );
    expect(staffEfficiencyRepLabel("coordinated team")).toBe("Staff workflow appeared coordinated");
    expect(staffEfficiencyRepLabel("efficiency")).toBe("Staff workflow appeared efficient");
  });

  it("never exposes raw Staff workflow: Ontology labels", () => {
    expect(staffEfficiencyRepLabel("Staff workflow: Familiarity")).toBe(
      "Staff appeared familiar with workflow",
    );
    expect(isOntologyStaffWorkflowLabel("Staff workflow: Familiarity")).toBe(true);
    expect(isOntologyStaffWorkflowLabel("Staff appeared organized")).toBe(false);
  });
});

describe("observationRepFindingPresentation — unified completed-case counting", () => {
  it("detects pending repeat in current in-progress observation", () => {
    const counts = repFindingCountsFromFinding(mockFinding());
    expect(hasPendingRepeatInCurrentCase(counts)).toBe(true);
    expect(
      appendRepPendingSuffix("Visualization challenge before fixation observed in 1 completed case", counts),
    ).toContain(REP_PENDING_CURRENT_OBSERVATION);
  });

  it("uses completed-case phrasing consistently", () => {
    expect(formatRepObservedWithCompletedCount("Workflow delay", 1)).toBe(
      "Workflow delay observed in 1 completed case",
    );
    expect(formatRepObservedWithCompletedCount("Workflow delay", 2)).toBe(
      "Workflow delay observed across 2 completed cases",
    );
  });

  it("clamps inflated finding completed counts to program completed cases", () => {
    const finding = mockFinding({ completedObservationCount: 1 });
    expect(repDisplayCompletedObservationCount(finding, 0)).toBe(0);
    expect(repFindingCountsFromFinding(finding, 0).completedObservationCount).toBe(0);
    expect(buildWhatWeKnowLines({ findings: [finding], providerName: "Dr. Apple", programCompletedCount: 0 })).toEqual(
      [],
    );
  });

  it("keeps What We Know and Provider Context aligned for repeated in-progress visualization", () => {
    const view = buildObservationRepPresentationView({
      caseRow: { id: "case-current", status: "confirmed", provider_name: "Dr. Apple" },
      activities: [{ activity_type: "note", body: IN_PROGRESS_FOLLOW_UP_NOTE }],
      priorCases: [PRIOR_COMPLETED_CASE],
    });

    const vizWhatWeKnow = view.whatWeKnow.find((item) => /visualization/i.test(item.text));
    const vizProvider = view.providerBriefing.items.find((item) => /visualization/i.test(item.text));

    expect(vizWhatWeKnow?.text).toMatch(/1 completed case/i);
    expect(vizWhatWeKnow?.text).toMatch(REP_PENDING_CURRENT_OBSERVATION);
    expect(vizProvider?.text).toMatch(/1 completed case/i);
    expect(vizProvider?.text).not.toMatch(/multiple observations/i);
    expect(vizProvider?.text).not.toMatch(/appeared across multiple/i);

    const whatCompleted = completedCountFromLine(vizWhatWeKnow?.text ?? "");
    const providerCompleted = completedCountFromLine(vizProvider?.text ?? "");
    expect(whatCompleted).toBe(providerCompleted);
  });

  it("prevents contradictory repetition language in mock finding copy", () => {
    const finding = mockFinding();
    const whatLine = formatWhatWeKnowLine(finding, "Dr. Apple");
    const providerLines = buildProviderFieldBriefing({
      findings: [finding],
      evidenceGaps: [],
      evidenceProgress: [],
      providerName: "Dr. Apple",
    });

    expect(whatLine).toMatch(/1 completed case/i);
    expect(providerLines.join(" ")).toMatch(/1 completed case/i);
    expect(providerLines.join(" ")).not.toMatch(/multiple observations/i);
  });
});

describe("Dr. Apple provider history audit", () => {
  const DR_APPLE_INCOMPLETE = {
    id: "case-apple-obs-1",
    case_type: "observation",
    status: "confirmed",
    live_observation_competitors: "They were using Bard Mesh again",
    live_observation_workflow:
      "There were a couple points where they spent extra time getting a better view before placing fixation",
    live_observation_staff_process: "The team seemed organized",
    live_observation_product_fit: "The early opportunity may be around visualization and fixation workflow",
  };

  const DR_APPLE_COMPLETED = {
    ...DR_APPLE_INCOMPLETE,
    id: "case-apple-obs-2",
    status: "completed",
    observation_completed_at: "2026-06-08T18:00:00Z",
  };

  function auditFinding(labelMatch: RegExp, view: ReturnType<typeof buildObservationLearningTabView>) {
    const finding = view.knownFindings.find((entry) => labelMatch.test(entry.label));
    if (!finding) return null;
    const whatLine = buildWhatWeKnowLines({ findings: [finding], providerName: "Dr. Apple" })[0] ?? "";
    return {
      label: finding.label,
      normalizedFindingId: finding.normalizedFindingId,
      observationCount: finding.observationCount,
      completedObservationCount: finding.completedObservationCount,
      displayedCount: completedCountFromLine(whatLine),
      maturityStatus: finding.maturityStatus ?? null,
      whatWeKnowLine: whatLine,
      capturedFromCurrentNote: finding.capturedFromCurrentNote,
    };
  }

  it("reports finding metrics for incomplete single-case Dr. Apple history", () => {
    const view = buildObservationLearningTabView({
      caseRow: DR_APPLE_INCOMPLETE,
      priorCases: [],
    });

    const bard = auditFinding(/Bard Mesh/i, view);
    const visualization = auditFinding(/Visualization challenge/i, view);
    const staff = auditFinding(/Staff appeared organized|organized/i, view);

    expect(bard).toMatchObject({
      observationCount: 1,
      completedObservationCount: 0,
      capturedFromCurrentNote: true,
    });
    expect(bard?.maturityStatus).not.toBe("validated_pattern");
    expect(bard?.whatWeKnowLine).toBe("");

    expect(visualization?.observationCount).toBe(1);
    expect(visualization?.completedObservationCount).toBe(0);
    expect(visualization?.maturityStatus).not.toBe("validated_pattern");

    expect(staff?.label).toMatch(/Staff appeared organized/i);
    expect(staff && view.knownFindings.find((f) => f.normalizedFindingId === staff.normalizedFindingId)?.isPositiveStaffSignal).toBe(true);
  });

  it("reports finding metrics when one Dr. Apple case is complete", () => {
    const view = buildObservationLearningTabView({
      caseRow: DR_APPLE_COMPLETED,
      priorCases: [],
    });

    const bard = auditFinding(/Bard Mesh/i, view);
    const visualization = auditFinding(/Visualization challenge/i, view);
    const staff = auditFinding(/Staff appeared organized|organized/i, view);

    expect(bard?.completedObservationCount).toBe(1);
    expect(bard?.displayedCount).toBe(1);
    expect(bard?.maturityStatus).not.toBe("validated_pattern");

    expect(visualization?.completedObservationCount).toBe(1);
    expect(visualization?.displayedCount).toBe(1);
    expect(visualization?.maturityStatus).not.toBe("validated_pattern");

    expect(staff?.completedObservationCount).toBe(1);
    expect(staff?.label).toMatch(/Staff appeared organized/i);
  });

  it("supports repeated visualization with pending completion when prior case is complete", () => {
    const view = buildObservationLearningTabView({
      caseRow: { ...DR_APPLE_INCOMPLETE, id: "case-apple-obs-3" },
      activities: [{ activity_type: "note", body: IN_PROGRESS_FOLLOW_UP_NOTE }],
      priorCases: [DR_APPLE_COMPLETED],
    });

    const visualization = auditFinding(/Visualization challenge/i, view);
    expect(visualization?.observationCount).toBe(2);
    expect(visualization?.completedObservationCount).toBe(1);
    expect(visualization?.whatWeKnowLine).toMatch(/1 completed case/i);
    expect(visualization?.whatWeKnowLine).toMatch(REP_PENDING_CURRENT_OBSERVATION);
    expect(visualization?.maturityStatus).not.toBe("validated_pattern");

    const sections = buildObservationCaseIntelligenceSections({
      caseRow: { ...DR_APPLE_INCOMPLETE, id: "case-apple-obs-3" },
      activities: [{ activity_type: "note", body: IN_PROGRESS_FOLLOW_UP_NOTE }],
      priorCases: [DR_APPLE_COMPLETED],
    });
    const providerLine = sections.providerContextItems.find((item) => /visualization/i.test(item.text))?.text ?? "";
    expect(providerLine).toMatch(/in-progress case|pending|again/i);
    expect(providerLine).not.toMatch(/multiple observations/i);
  });

  it("confirms Bard Mesh is not validated until repeated across completed cases", () => {
    const singleComplete = buildObservationLearningTabView({
      caseRow: DR_APPLE_COMPLETED,
      priorCases: [],
    });
    const bardSingle = singleComplete.knownFindings.find((f) => /Bard Mesh/i.test(f.label));
    expect(bardSingle?.maturityStatus).not.toBe("validated_pattern");
    expect(bardSingle?.completedObservationCount).toBe(1);

    const twoComplete = buildObservationLearningTabView({
      caseRow: { ...DR_APPLE_COMPLETED, id: "case-apple-obs-4" },
      activities: [{ activity_type: "note", body: "Bard Mesh used again. Team organized." }],
      priorCases: [{ ...DR_APPLE_COMPLETED, id: "case-apple-obs-5" }],
    });
    const bardRepeated = twoComplete.knownFindings.find((f) => /Bard Mesh/i.test(f.label));
    expect(bardRepeated?.completedObservationCount).toBe(2);
    expect(bardRepeated?.maturityStatus).toBe("supported_pattern");
  });
});
