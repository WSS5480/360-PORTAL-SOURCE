import { describe, expect, it } from "vitest";
import {
  buildGenericProviderDebriefPlan,
  resolveProviderDebriefPlanMode,
} from "./buildGenericProviderDebriefPlan";
import { buildProviderDebriefPlan } from "./buildProviderDebriefPlan";
import { PROVIDER_OBSERVATION_TARGET } from "@/lib/surgical-sales/providerObservationProgress";

describe("buildGenericProviderDebriefPlan", () => {
  it("returns a structured generic debrief guide with no observation history", () => {
    const plan = buildGenericProviderDebriefPlan({
      providerId: "prov-1",
      providerName: "Dr. Chen",
      facilityName: "Memorial",
      completedObservationCount: 0,
    });

    expect(plan.context.caseId).toBe("generic-debrief-plan");
    expect(plan.desiredMeetingOutcome.primary.length).toBeGreaterThan(10);
    expect(plan.suggestedObjectives.length).toBeGreaterThanOrEqual(4);
    expect(plan.suggestedQuestions.length).toBeGreaterThanOrEqual(4);
    expect(plan.recommendedNextStep.action).toBe("capture_additional_observation_notes");
    expect(plan.hasSufficientInputs).toBe(false);
  });

  it("reflects partial observation program progress", () => {
    const plan = buildGenericProviderDebriefPlan({
      providerId: "prov-1",
      providerName: "Dr. Chen",
      facilityName: null,
      completedObservationCount: 2,
    });

    expect(plan.recommendedNextStep.body).toMatch(/2 of 5/i);
    expect(plan.desiredMeetingOutcome.supporting.some((line) => /2 observation/i.test(line))).toBe(true);
  });

  it("reflects full observation program readiness", () => {
    const plan = buildGenericProviderDebriefPlan({
      providerId: "prov-1",
      providerName: "Dr. Chen",
      facilityName: null,
      completedObservationCount: PROVIDER_OBSERVATION_TARGET,
    });

    expect(plan.recommendedNextStep.action).toBe("schedule_provider_debrief");
    expect(plan.desiredMeetingOutcome.supporting.some((line) => /5 completed observations/i.test(line))).toBe(
      true,
    );
  });
});

describe("resolveProviderDebriefPlanMode", () => {
  it("marks generic template plans as generic", () => {
    const plan = buildGenericProviderDebriefPlan({
      providerId: "prov-1",
      providerName: "Dr. Chen",
      facilityName: null,
      completedObservationCount: 0,
    });
    expect(resolveProviderDebriefPlanMode(plan)).toBe("generic");
  });

  it("marks intelligence-rich plans as intelligence", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: {
        id: "case-1",
        live_observation_clinical_pain_points: "Sac visualization was difficult",
      },
      activities: [
        {
          id: "n1",
          activity_type: "note",
          body: "Surgeon noted workflow friction during takedown.",
          created_at: "2026-05-01T12:00:00.000Z",
        },
      ],
    });
    expect(resolveProviderDebriefPlanMode(plan)).toBe("intelligence");
  });
});
