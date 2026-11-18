import { describe, expect, it } from "vitest";
import { buildProviderOverviewLatestFieldIntelligence } from "./buildProviderOverviewLatestFieldIntelligence";

describe("buildProviderOverviewLatestFieldIntelligence", () => {
  it("returns conversational bullets across discovery, workflow, and relationship", () => {
    const items = buildProviderOverviewLatestFieldIntelligence({
      contact: {
        provider_observation_credentialing_needed: "required",
        provider_evaluation_openness: "open",
        provider_responsiveness: "slow",
        provider_procedure_focus: "laparoscopic",
        provider_observation_best_days_case_types: "thursday",
      },
      commercialStage: "early_discovery",
      engagements: [],
    });

    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.length).toBeLessThanOrEqual(5);
    const joined = items.map((i) => i.line).join(" ");
    expect(joined).toMatch(/vendor clearance|48 hours/i);
    expect(joined).toMatch(/open to observation/i);
    expect(joined).toMatch(/responds slowly/i);
    expect(joined).toMatch(/Laparoscopic|Thursday/i);
    expect(joined).not.toMatch(/assuming|confidence score|on file:/i);
  });

  it("includes engagement insight when memory context exists", () => {
    const items = buildProviderOverviewLatestFieldIntelligence({
      contact: {},
      commercialStage: "early_discovery",
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status: "completed",
          status_label: "Completed",
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          outcome_label: "Done",
          updated_at: "2026-05-18T12:00:00.000Z",
          memory_context_line: "Surgeon asked to confirm vendor badge before the first OR visit.",
        },
      ],
    });

    expect(items.some((i) => i.kind === "engagement")).toBe(true);
    expect(items.some((i) => /vendor badge|OR visit/i.test(i.line))).toBe(true);
  });
});
