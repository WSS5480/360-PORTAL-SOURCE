import { describe, expect, it } from "vitest";

import {
  buildUniversalConceptTimeline,
  groupConceptTimelineEventsByAssertion,
} from "./buildUniversalConceptTimeline";

describe("buildUniversalConceptTimeline", () => {
  it("orders concept events oldest to newest across runs", () => {
    const timeline = buildUniversalConceptTimeline([
      {
        capture_id: "run-new",
        declared_source_type: "debrief_validation",
        created_at: "2026-06-14T14:00:00Z",
        facts: [
          {
            concept: "sizing_or_fit_issue",
            assertion_level: "validated",
            evidence_snippets: ["confirmed recurring issue"],
          },
        ],
      },
      {
        capture_id: "run-old",
        declared_source_type: "observation_case",
        created_at: "2026-06-14T12:00:00Z",
        facts: [
          {
            concept: "sizing_or_fit_issue",
            assertion_level: "observed",
            evidence_snippets: ["extra time confirming sizing"],
          },
        ],
      },
    ]);

    expect(timeline).toHaveLength(1);
    expect(timeline[0].concept).toBe("sizing_or_fit_issue");
    expect(timeline[0].events.map((event) => event.assertion_level)).toEqual([
      "observed",
      "validated",
    ]);
  });

  it("groups visualization_or_access_issue by assertion across observation, debrief, and validation", () => {
    const timeline = buildUniversalConceptTimeline([
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
            evidence_snippets: ["Provider said visualization has been difficult in robotic cases"],
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
        ],
      },
    ]);

    expect(timeline).toHaveLength(1);
    expect(timeline[0].concept).toBe("visualization_or_access_issue");

    const groups = groupConceptTimelineEventsByAssertion(timeline[0].events);
    expect(groups.map((group) => group.assertion_label)).toEqual([
      "Provider reported",
      "Observed",
      "Validated",
    ]);
    expect(groups[0].events[0].declared_source_type).toBe("debrief_note");
    expect(groups[1].events[0].declared_source_type).toBe("observation_case");
    expect(groups[2].events[0].declared_source_type).toBe("debrief_validation");
  });
});
