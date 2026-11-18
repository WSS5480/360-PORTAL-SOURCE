import { describe, expect, it } from "vitest";
import { buildProviderFieldCommandBriefing } from "./buildProviderFieldCommandBriefing";
import { buildProviderFieldDeploymentBriefing } from "./buildProviderFieldDeploymentBriefing";
import { buildProviderCanonicalExecutionBlockers } from "./buildProviderCanonicalExecutionBlockers";

describe("buildProviderFieldDeploymentBriefing", () => {
  it("returns four deployment answers powered by readiness framework", () => {
    const briefing = buildProviderFieldCommandBriefing({
      contact: { provider_observation_feasibility: "easy" },
      commercialStage: "early_discovery",
      laneLabel: "Access mapping",
      recommendedNextStep: "Confirm OR coordinator before travel.",
      progression: null,
    });

    const deployment = buildProviderFieldDeploymentBriefing({
      contact: { provider_observation_feasibility: "easy" },
      commercialStage: "early_discovery",
      laneLabel: briefing.laneLabel,
      briefing,
      recommendedNextStep: "Confirm OR coordinator before travel.",
      executionBlockers: buildProviderCanonicalExecutionBlockers({
        contact: {},
        commercialStage: "early_discovery",
      }),
      discoveryPriorityCount: 2,
    });

    expect(deployment.answers).toHaveLength(4);
    expect(deployment.readiness.pillars).toHaveLength(7);
    expect(deployment.answers[0].question).toMatch(/OR/i);
    expect(deployment.protectFieldTime.dimensions).toHaveLength(5);
    expect(deployment.directive.length).toBeGreaterThan(5);
    expect(Array.isArray(deployment.knownSoFar)).toBe(true);
    expect(JSON.stringify(deployment)).not.toMatch(/confidence by area|pathway confidence/i);
  });

  it("routes must_validate to discovery priorities when count is set", () => {
    const briefing = buildProviderFieldCommandBriefing({
      contact: {},
      commercialStage: "early_discovery",
      laneLabel: "Access mapping",
      recommendedNextStep: "Map access.",
      progression: null,
    });

    const deployment = buildProviderFieldDeploymentBriefing({
      contact: {},
      commercialStage: "early_discovery",
      laneLabel: briefing.laneLabel,
      briefing,
      recommendedNextStep: "Map access.",
      executionBlockers: [],
      discoveryPriorityCount: 3,
    });

    const mustValidate = deployment.answers.find((a) => a.id === "must_validate");
    expect(mustValidate?.openDiscoveryPriorities).toBe(true);
    expect(mustValidate?.answer).toMatch(/discovery priorities/i);
  });
});
