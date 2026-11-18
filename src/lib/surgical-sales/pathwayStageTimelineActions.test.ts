import { describe, expect, it } from "vitest";
import {
  buildPathwayStageExitRequirementMessage,
  buildPathwayStageUnlockHint,
  resolvePathwayStageClick,
} from "./pathwayStageTimelineActions";

describe("pathwayStageTimelineActions", () => {
  const discoveryContact = {
    provider_observation_feasibility: null,
  };

  const approvedContact = {
    provider_observation_feasibility: "approved",
    provider_intelligence_field_metadata: {
      provider_observation_feasibility: {
        source_type: "profile",
        source_label: "Manual",
        updated_at: "2026-05-01T00:00:00.000Z",
        validated_at: "2026-05-01T00:00:00.000Z",
      },
    },
  };

  it("opens observation approval from discovery when observation stage is clicked", () => {
    expect(
      resolvePathwayStageClick({
        activeStageId: "discovery",
        clickedStageId: "observe",
        clickedStepStatus: "upcoming",
        gateInput: { contact: discoveryContact },
      }),
    ).toEqual({
      type: "open_observation_approval",
      preferScheduleObservation: true,
    });
  });

  it("does not act on complete or current steps", () => {
    expect(
      resolvePathwayStageClick({
        activeStageId: "observe",
        clickedStageId: "observe",
        clickedStepStatus: "current",
        gateInput: { contact: approvedContact },
      }),
    ).toEqual({ type: "none" });
  });

  it("explains observation approval for locked debrief from discovery", () => {
    const hint = buildPathwayStageUnlockHint("debrief", { contact: discoveryContact });
    expect(hint.message).toMatch(/Observation requires observation permission confirmed/i);
  });

  it("uses observation count for locked debrief after approval", () => {
    const hint = buildPathwayStageUnlockHint("debrief", {
      contact: approvedContact,
      engagements: [],
      cases: [],
    });
    expect(hint.message).toMatch(/0 of 5 complete/i);
  });

  it("builds discovery exit requirement copy", () => {
    expect(buildPathwayStageExitRequirementMessage("discovery", { contact: discoveryContact })).toBe(
      "Observation requires observation permission confirmed.",
    );
  });

  it("opens observation approval when discovery blocks a later stage", () => {
    expect(
      resolvePathwayStageClick({
        activeStageId: "discovery",
        clickedStageId: "debrief",
        clickedStepStatus: "upcoming",
        gateInput: { contact: discoveryContact },
      }),
    ).toEqual({
      type: "open_observation_approval",
      preferScheduleObservation: false,
    });
  });

  it("opens debrief status when debrief blocks evaluation", () => {
    const observeCompleteContact = {
      ...approvedContact,
      provider_observation_sequence_complete: true,
    };

    expect(
      resolvePathwayStageClick({
        activeStageId: "debrief",
        clickedStageId: "evaluation",
        clickedStepStatus: "upcoming",
        gateInput: {
          contact: observeCompleteContact,
          engagements: [],
          cases: [],
        },
      }),
    ).toEqual({ type: "open_debrief_status" });
  });
});
