import { describe, expect, it } from "vitest";

import { buildProviderIntelligenceComparisonCurrentView } from "./buildProviderIntelligenceComparisonCurrentView";

describe("buildProviderIntelligenceComparisonCurrentView", () => {
  it("maps existing field evidence into comparable topic rows", () => {
    const snapshot = buildProviderIntelligenceComparisonCurrentView({
      hasFieldEvidence: true,
      fieldEvidence: [
        {
          id: "workflow",
          icon: "clinical_signal",
          title: "Workflow Pain Point",
          dateLabel: "—",
          excerpt: "Extra visualization time before fixation",
          whyItMatters: "Guides evaluation focus.",
          intelligenceImpacts: [
            { label: "Extra visualization time before fixation", impact: "created" },
          ],
          href: null,
        },
        {
          id: "staff",
          icon: "observation",
          title: "Observation",
          dateLabel: "—",
          excerpt: "Staff seemed organized and efficient",
          whyItMatters: "Feeds evidence maturity.",
          intelligenceImpacts: [{ label: "Staff seemed organized and efficient", impact: "created" }],
          href: null,
        },
      ],
      emergingSignals: [],
      needsMoreEvidence: [],
      caseIntelligence: null,
    });

    expect(snapshot.has_data).toBe(true);
    expect(snapshot.topics.map((topic) => topic.concept)).toEqual([
      "visualization_or_access_issue",
      "staff_workflow",
    ]);
    expect(snapshot.topics[0]?.observed_count).toBe(1);
    expect(snapshot.topics[1]?.observed_count).toBe(1);
  });

  it("returns empty snapshot when no field evidence exists", () => {
    const snapshot = buildProviderIntelligenceComparisonCurrentView({
      hasFieldEvidence: false,
      fieldEvidence: [],
      emergingSignals: [],
      needsMoreEvidence: [],
      caseIntelligence: null,
    });

    expect(snapshot.has_data).toBe(false);
    expect(snapshot.topics).toHaveLength(0);
  });
});
