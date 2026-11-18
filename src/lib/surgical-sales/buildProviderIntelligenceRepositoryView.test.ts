import { describe, expect, it } from "vitest";

import { buildProviderIntelligenceRepositoryView } from "./buildProviderIntelligenceRepositoryView";

describe("buildProviderIntelligenceRepositoryView", () => {
  it("returns six repository sections with empty states when no data", () => {
    const view = buildProviderIntelligenceRepositoryView({
      contact: { id: "p1" },
      providerId: "p1",
      engagements: [],
      cases: [],
    });

    expect(view.timeline).toEqual([]);
    expect(view.knownInformation).toEqual([]);
    expect(view.observedInformation).toEqual([]);
    expect(view.workflowIntelligence).toEqual([]);
    expect(view.contacts).toEqual([]);
    expect(view.capturedLearnings).toEqual([]);
  });

  it("maps workflow fields into workflow intelligence section", () => {
    const view = buildProviderIntelligenceRepositoryView({
      contact: {
        id: "p1",
        provider_workflow_pain_points: "Long turnover between cases",
      },
      providerId: "p1",
    });

    expect(view.workflowIntelligence.length).toBeGreaterThan(0);
    expect(view.workflowIntelligence[0]?.label).toMatch(/pain/i);
  });
});
