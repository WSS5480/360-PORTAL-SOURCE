import { describe, expect, it } from "vitest";
import { buildDiscoveryMappingQuestionView } from "./buildDiscoveryMappingQuestionView";
import { formatPartialIntelligencePersistValue } from "./partialIntelligencePersist";

describe("buildDiscoveryMappingQuestionView", () => {
  it("surfaces partial evidence from debrief metadata for observation allowed", () => {
    const stored = formatPartialIntelligencePersistValue({
      narrative:
        "Provider did not appear opposed to observation, but approval was not directly confirmed.",
      stillNeeds: ["Direct approval from surgeon"],
      sourceQuote: "Observation wasn't directly approved today but he didn't seem opposed",
    });

    const view = buildDiscoveryMappingQuestionView({
      dbKey: "provider_observation_feasibility",
      contact: {
        provider_observation_feasibility: stored,
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "engagement",
            source_label: "Intro Call",
            updated_at: "2026-05-20T12:00:00.000Z",
            evidence_text:
              "Provider did not appear opposed to observation, but approval was not directly confirmed.",
            lifecycle_state: "captured",
          },
        },
      },
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro Call",
          status: "completed",
        } as never,
      ],
    });

    expect(view).not.toBeNull();
    expect(view!.title).toBe("Observation allowed?");
    expect(view!.currentState.maturityLabel).toMatch(/partial|likely|unknown/i);
    expect(view!.evidence?.quote).toMatch(/did not appear opposed/i);
    expect(view!.evidence?.sourceLabel).toMatch(/Intro Call/i);
    expect(view!.whyItMatters).toMatch(/observation is allowed/i);
  });

  it("shows unknown state when no evidence exists", () => {
    const view = buildDiscoveryMappingQuestionView({
      dbKey: "provider_observation_feasibility",
      contact: {},
    });
    expect(view!.currentState.summary).toBe("No validated answer yet.");
    expect(view!.evidence).toBeNull();
  });

  it("surfaces conditional workflow for not until credentialed", () => {
    const view = buildDiscoveryMappingQuestionView({
      dbKey: "provider_observation_feasibility",
      contact: {
        provider_observation_feasibility: "credentialing_required",
        provider_observation_credentialing_needed: "required",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "engagement",
            source_label: "Intro Call",
            updated_at: "2026-05-20T12:00:00.000Z",
            evidence_text:
              "Provider did not appear opposed to observation, but approval was not directly confirmed.",
            access_blocker: "credentialing_required",
          },
        },
      },
    });
    expect(view!.currentState.maturityLabel).toBe("Conditional");
    expect(view!.conditionalWorkflow?.answer).toMatch(/not until credentialed/i);
    expect(view!.conditionalWorkflow?.conditionBlocker).toMatch(/credentialing required/i);
    expect(view!.evidence?.quote).toMatch(/did not appear opposed/i);
    expect(view!.evidence?.sourceLabel).toMatch(/Intro Call debrief/i);
    expect(view!.conditionalWorkflow?.nextStep).toBe("Complete credentialing");
    expect(view!.currentState.summary).toMatch(/conditionally allowed pending credentialing/i);
    expect(view!.currentState.summary).not.toMatch(/credentialing_required/);
  });
});
