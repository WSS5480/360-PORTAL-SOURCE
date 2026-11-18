import { describe, expect, it } from "vitest";
import {
  buildProviderOverviewKnownSoFar,
  PROVIDER_OVERVIEW_KNOWN_SO_FAR_MAX,
} from "./buildProviderOverviewKnownSoFar";

describe("buildProviderOverviewKnownSoFar", () => {
  it("returns at most four positive lines without warning phrasing", () => {
    const lines = buildProviderOverviewKnownSoFar({
      contact: {
        provider_observation_feasibility: "allowed",
        provider_procedure_focus: "laparoscopic hernia",
        relationship_strength: "strong",
      },
      commercialStage: "early_discovery",
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status: "planned",
          status_label: "Planned",
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          outcome_label: "",
        },
      ],
    });

    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(PROVIDER_OVERVIEW_KNOWN_SO_FAR_MAX);
    for (const line of lines) {
      expect(line).not.toMatch(/—/);
      expect(line.toLowerCase()).not.toMatch(/risk|warning|unknown|not confirmed/);
    }
    expect(lines.some((l) => /laparoscopic|intro engagement/i.test(l))).toBe(true);
  });

  it("includes observation discussion and early relationship phrasing", () => {
    const lines = buildProviderOverviewKnownSoFar({
      contact: {
        provider_relationship_stage: "engagement_active",
        provider_evaluation_openness: "open",
      },
      commercialStage: "early_discovery",
      engagements: [
        {
          id: "e2",
          engagement_type: "observation_request",
          engagement_type_label: "Observation request",
          status: "planned",
          status_label: "Planned",
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          outcome_label: "",
        },
      ],
    });

    expect(lines.some((l) => /observation discussion initiated/i.test(l))).toBe(true);
    expect(lines.some((l) => /surgeon relationship started/i.test(l))).toBe(true);
  });

  it("omits restricted observation feasibility", () => {
    const lines = buildProviderOverviewKnownSoFar({
      contact: {
        provider_observation_feasibility: "restricted",
        provider_procedure_focus: "lap",
      },
      commercialStage: "early_discovery",
    });

    expect(lines.some((l) => /observation appears feasible/i.test(l))).toBe(false);
  });
});
