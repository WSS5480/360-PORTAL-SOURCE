import { describe, expect, it } from "vitest";
import {
  buildConcreteDebriefNextSteps,
  contactInfoNextStepForName,
  convertOpenQuestionToFieldAction,
  isConcreteFieldActionStep,
} from "@/lib/surgical-sales/buildConcreteDebriefNextSteps";

describe("buildConcreteDebriefNextSteps", () => {
  it("rejects generic fragments and questions", () => {
    expect(isConcreteFieldActionStep("Identify Surgical")).toBe(false);
    expect(isConcreteFieldActionStep("Observation approval pathway")).toBe(false);
    expect(isConcreteFieldActionStep("Platform and steps confirmation")).toBe(false);
    expect(isConcreteFieldActionStep("What is the credentialing pathway")).toBe(false);
  });

  it("converts open questions into field actions", () => {
    expect(convertOpenQuestionToFieldAction("What is the credentialing pathway?")).toBe(
      "Confirm which credentialing platform is required.",
    );
    expect(convertOpenQuestionToFieldAction("Has the provider approved observation access?")).toBe(
      "Confirm who officially approves vendor observation access.",
    );
  });

  it("builds Jennifer contact and access-blocking steps from dictation", () => {
    const dictation =
      "Jennifer handles scheduling but I don't have her contact info yet. Credentialing is required but platform is unknown. Observation might be possible.";
    const steps = buildConcreteDebriefNextSteps({
      dictation,
      rules: {
        observationApprovedExplicit: false,
        observationInterestOnly: true,
        credentialingPlatformLabel: "Unknown",
        credentialingPlatformConfirmed: false,
        pathwayStageId: "discovery",
        engagementOutcomeId: "follow_up_needed",
        workflowParticipantNames: ["Jennifer"],
        supportContactCandidateNames: [],
        rejectedFactIds: [],
      },
    });

    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps.length).toBeLessThanOrEqual(5);
    expect(steps.some((s) => /Jennifer/i.test(s))).toBe(true);
    expect(steps.some((s) => /credentialing platform/i.test(s))).toBe(true);
    expect(steps.every((s) => /^[A-Z]/.test(s) && /[.!?]$/.test(s))).toBe(true);
    expect(steps.join(" ")).not.toMatch(/Identify Surgical|approval pathway|Platform and steps/i);
  });

  it("formats contact info step with possessive first name", () => {
    expect(contactInfoNextStepForName("Jennifer Miller")).toBe("Get Jennifer's phone or email.");
  });
});
