import { describe, expect, it } from "vitest";
import { buildAssistChangeSummary } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistApply";
import { diffAddedProbeLines } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistProbeUtils";

describe("prepareTacticalAiAssistApply", () => {
  it("detects newly added probe lines", () => {
    expect(
      diffAddedProbeLines("Who owns block time?", "Who owns block time?\nWho coordinates observer access?"),
    ).toEqual(["Who coordinates observer access?"]);
  });

  it("summarizes workflow question insert", () => {
    const { summary, addedProbeLines } = buildAssistChangeSummary({
      action: "add_surgical_workflow_question",
      patch: {
        pre_observation_probes:
          "Existing ask?\nWhich high-volume procedure workflow runs today — and where is the friction?",
      },
      beforeProbes: "Existing ask?",
      beforeGoal: null,
    });
    expect(addedProbeLines.length).toBeGreaterThan(0);
    expect(summary).toMatch(/Added workflow ask/i);
  });

  it("summarizes intro call optimization", () => {
    const { summary } = buildAssistChangeSummary({
      action: "simplify_intro_call",
      patch: {
        observation_goal: "Build trust before asking for observation access.",
        pre_observation_probes: "Which procedures drive volume?\nWho controls access?",
      },
      beforeProbes: null,
      beforeGoal: "Long enterprise discovery goal that should be replaced.",
    });
    expect(summary).toMatch(/Optimized for intro call/i);
  });
});
