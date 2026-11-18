import { describe, expect, it } from "vitest";
import { buildProviderOverviewAccountNotes } from "./buildProviderOverviewAccountNotes";

describe("buildProviderOverviewAccountNotes", () => {
  it("returns three account note sections for early discovery", () => {
    const sections = buildProviderOverviewAccountNotes({
      contact: {
        provider_procedure_focus: "laparoscopic hernia",
        provider_observation_feasibility: "allowed",
        relationship_strength: "strong",
        provider_responsiveness: "returns within 48h",
      },
      commercialStage: "early_discovery",
    });

    expect(sections).toHaveLength(3);
    expect(sections.map((s) => s.id)).toEqual([
      "workflow_insights",
      "relationship_insights",
      "observation_readiness",
    ]);
    expect(sections[0].title).toBe("Workflow insights");
    expect(sections[0].summary.length).toBeGreaterThan(10);
    expect(JSON.stringify(sections)).not.toMatch(/confidence|score|framework/i);
  });
});
