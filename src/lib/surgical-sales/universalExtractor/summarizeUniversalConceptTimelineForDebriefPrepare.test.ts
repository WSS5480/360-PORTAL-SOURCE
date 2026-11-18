import { describe, expect, it } from "vitest";

import { summarizeUniversalConceptTimelineForDebriefPrepare } from "./summarizeUniversalConceptTimelineForDebriefPrepare";

describe("summarizeUniversalConceptTimelineForDebriefPrepare", () => {
  it("groups concepts into rep-friendly debrief prep buckets", () => {
    const summary = summarizeUniversalConceptTimelineForDebriefPrepare({
      runs: [
        {
          capture_id: "run-c",
          declared_source_type: "debrief_validation",
          created_at: "2026-06-14T14:00:00Z",
          facts: [
            {
              concept: "visualization_or_access_issue",
              assertion_level: "validated",
              evidence_snippets: ["Provider confirmed visualization is a recurring issue"],
            },
            {
              concept: "sizing_or_fit_issue",
              assertion_level: "rejected",
              evidence_snippets: ["Provider said sizing is not a recurring issue"],
            },
          ],
        },
        {
          capture_id: "run-b",
          declared_source_type: "debrief_note",
          created_at: "2026-06-14T12:00:00Z",
          facts: [
            {
              concept: "visualization_or_access_issue",
              assertion_level: "provider_reported",
              evidence_snippets: ["Provider said visualization has been difficult"],
            },
            {
              concept: "staff_workflow",
              assertion_level: "provider_reported",
              evidence_snippets: ["Staff seemed organized"],
            },
          ],
        },
        {
          capture_id: "run-a",
          declared_source_type: "observation_case",
          created_at: "2026-06-14T10:00:00Z",
          facts: [
            {
              concept: "visualization_or_access_issue",
              assertion_level: "observed",
              evidence_snippets: ["Extra time getting a better view before fixation"],
            },
            {
              concept: "sizing_or_fit_issue",
              assertion_level: "observed",
              evidence_snippets: ["Extra time confirming implant sizing"],
            },
          ],
        },
      ],
    });

    expect(summary.meta.concept_count).toBe(3);
    expect(summary.strongest_debrief_topics.map((item) => item.concept)).toEqual([
      "visualization_or_access_issue",
    ]);
    expect(summary.potential_topics_from_observations).toHaveLength(0);
    expect(summary.mentioned_not_yet_confirmed).toHaveLength(0);
    expect(summary.positive_context.map((item) => item.concept)).toEqual(["staff_workflow"]);
    expect(summary.ruled_out.map((item) => item.concept)).toEqual(["sizing_or_fit_issue"]);
  });

  it("keeps observed potential topics separate from positive context", () => {
    const summary = summarizeUniversalConceptTimelineForDebriefPrepare({
      runs: [
        {
          capture_id: "run-a",
          declared_source_type: "observation_case",
          created_at: "2026-06-14T10:00:00Z",
          facts: [
            {
              concept: "staff_workflow",
              assertion_level: "observed",
              evidence_snippets: ["Staff moved efficiently"],
            },
            {
              concept: "staff_workflow",
              assertion_level: "observed",
              evidence_snippets: ["Circulator anticipated next step"],
            },
            {
              concept: "workflow_or_timing_issue",
              assertion_level: "observed",
              evidence_snippets: ["Extra time before fixation"],
            },
          ],
        },
      ],
    });

    expect(summary.potential_topics_from_observations.map((item) => item.concept)).toEqual([
      "workflow_or_timing_issue",
    ]);
    expect(summary.positive_context.map((item) => item.concept)).toEqual(["staff_workflow"]);
  });

  it("returns empty buckets when no runs exist", () => {
    const summary = summarizeUniversalConceptTimelineForDebriefPrepare({ runs: [] });
    expect(summary.meta.has_timeline_data).toBe(false);
    expect(summary.strongest_debrief_topics).toHaveLength(0);
    expect(summary.mentioned_not_yet_confirmed).toHaveLength(0);
  });
});
