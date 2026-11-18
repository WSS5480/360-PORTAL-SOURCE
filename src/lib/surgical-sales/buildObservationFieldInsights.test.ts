import { describe, expect, it } from "vitest";
import { buildObservationFieldInsights } from "./buildObservationFieldInsights";

describe("buildObservationFieldInsights", () => {
  it("groups learnings into provider-facing intelligence sections", () => {
    const sections = buildObservationFieldInsights({
      caseRow: {
        live_observation_competitors: "Competitor tray observed",
        live_observation_workflow: "Long turnover before start",
        live_observation_clinical_pain_points: "Visualization was difficult",
      },
      activities: [],
    });

    expect(sections.find((section) => section.id === "competitors")?.items.length).toBeGreaterThan(0);
    expect(sections.find((section) => section.id === "workflow")?.items.length).toBeGreaterThan(0);
    expect(sections.find((section) => section.id === "provider_pain")?.items.length).toBeGreaterThan(0);
  });

  it("surfaces still-unknown focus areas when not yet learned", () => {
    const sections = buildObservationFieldInsights({
      caseRow: {},
      activities: [],
    });

    const unknown = sections.find((section) => section.id === "unknown");
    expect(unknown?.items.length).toBeGreaterThan(0);
  });
});
