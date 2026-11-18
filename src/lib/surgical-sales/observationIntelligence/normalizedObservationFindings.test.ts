import { describe, expect, it } from "vitest";

import { normalizeFactsToFindings } from "./normalizedObservationFindings";
import { generateObservationIntelligenceFromFacts } from "./generateObservationIntelligence";
import { runObservationIntelligencePipeline } from "./observationIntelligencePipeline";

describe("normalizedObservationFindings", () => {
  it("collapses multiple visualization facts into one finding per case", () => {
    const findings = normalizeFactsToFindings([
      {
        type: "workflow_issue",
        value: "visualization challenge before fixation",
        evidence: "asked for a different angle",
      },
      {
        type: "visualization_challenge",
        value: "visualization challenge before fixation",
        evidence: "wasn't getting the view",
      },
      {
        type: "fixation_challenge",
        value: "visualization challenge before fixation",
        evidence: "before fixation",
      },
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.normalizedFindingId).toBe("workflow_visualization_before_fixation");
    expect(findings[0]?.label).toBe("Visualization challenge before fixation");
  });

  it("aggregates visualization language across cases into one finding with observation count", () => {
    const result = runObservationIntelligencePipeline({
      caseRow: { id: "case-3" },
      priorCases: [
        {
          id: "case-1",
          notes: "Needed a better view before fixation.",
        },
        {
          id: "case-2",
          notes: "Spent extra time improving visualization before fixation.",
        },
      ],
      activities: [
        {
          activity_type: "note",
          body: "Surgeon asked for a different angle because he wasn't getting the view he wanted before fixation.",
        },
      ],
    });

    const workflowFindings = result.aggregatedByCategory.workflow_findings;
    const visualizationFindings = workflowFindings.filter(
      (finding) =>
        finding.normalizedFindingId === "workflow_visualization_before_fixation" ||
        finding.normalizedFindingId === "visualization_challenge",
    );

    expect(visualizationFindings).toHaveLength(1);
    expect(visualizationFindings[0]?.observationCount).toBe(3);
    expect(visualizationFindings[0]?.confidence).toMatch(/Low|Medium|High/);
    expect(visualizationFindings[0]?.label).toBe("Visualization challenge before fixation");
    expect(visualizationFindings[0]?.evidenceLabel).toMatch(/Pending case completion|Repeated|Observed/i);
  });

  it("deduplicates duplicate visualization phrasing within one note", () => {
    const findings = normalizeFactsToFindings([
      {
        type: "workflow_issue",
        value: "visualization challenge before fixation",
        evidence: "needed a better view before fixation",
      },
      {
        type: "visualization_challenge",
        value: "extra visualization time before fixation",
        evidence: "spent extra time getting exposure",
      },
      {
        type: "fixation_challenge",
        value: "visualization delay before fixation",
        evidence: "before mesh went in",
      },
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.normalizedFindingId).toBe("workflow_visualization_before_fixation");
  });

  it("deduplicates generated intelligence findings within a case", () => {
    const generated = generateObservationIntelligenceFromFacts([
      {
        type: "workflow_issue",
        value: "extra visualization time before fixation",
        evidence: "spent extra time improving visualization",
      },
      {
        type: "visualization_challenge",
        value: "visualization challenge before fixation",
        evidence: "different angle before fixation",
      },
      {
        type: "workflow_delay",
        value: "delay caused by readiness issue",
        evidence: "waiting around for supplies",
      },
    ]);

    const workflow = generated.filter((finding) => finding.categoryId === "workflow_findings");
    expect(workflow).toHaveLength(2);
    expect(workflow.map((finding) => finding.normalizedFindingId).sort()).toEqual([
      "staff_supply_delay",
      "workflow_visualization_before_fixation",
    ]);
  });
});
