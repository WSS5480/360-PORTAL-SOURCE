import { describe, expect, it } from "vitest";

import { buildProviderIntelligenceFromUniversalFacts } from "./buildProviderIntelligenceFromUniversalFacts";

describe("buildProviderIntelligenceFromUniversalFacts", () => {
  it("summarizes observed and validated counts per concept", () => {
    const snapshot = buildProviderIntelligenceFromUniversalFacts({
      runs: [
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
            {
              concept: "sizing_or_fit_issue",
              assertion_level: "observed",
              evidence_snippets: ["Sized twice before closing"],
            },
            {
              concept: "inventory_availability_issue",
              assertion_level: "observed",
              evidence_snippets: ["Requested item was not on the cart"],
            },
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
              concept: "staff_workflow",
              assertion_level: "observed",
              evidence_snippets: ["Team stayed organized"],
            },
          ],
        },
        {
          capture_id: "run-b",
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
      ],
    });

    expect(snapshot.has_data).toBe(true);
    expect(snapshot.topics.map((topic) => topic.concept)).toEqual([
      "visualization_or_access_issue",
      "sizing_or_fit_issue",
      "inventory_availability_issue",
      "staff_workflow",
    ]);

    const visualization = snapshot.topics.find((topic) => topic.concept === "visualization_or_access_issue");
    expect(visualization?.label).toBe("Visualization & Access");
    expect(visualization?.observed_count).toBe(1);
    expect(visualization?.validated_count).toBe(1);

    const staff = snapshot.topics.find((topic) => topic.concept === "staff_workflow");
    expect(staff?.observed_count).toBe(3);
    expect(staff?.validated_count).toBe(0);
  });

  it("omits provider-reported-only concepts from the comparison snapshot", () => {
    const snapshot = buildProviderIntelligenceFromUniversalFacts({
      runs: [
        {
          capture_id: "run-a",
          declared_source_type: "discovery_note",
          created_at: "2026-06-14T10:00:00Z",
          facts: [
            {
              concept: "training_or_familiarity_issue",
              assertion_level: "provider_reported",
              evidence_snippets: ["Provider mentioned training gap"],
            },
          ],
        },
      ],
    });

    expect(snapshot.has_data).toBe(false);
    expect(snapshot.topics).toHaveLength(0);
  });
});
