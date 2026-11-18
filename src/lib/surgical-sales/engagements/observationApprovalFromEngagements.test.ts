import { describe, expect, it } from "vitest";
import { START_MISSION_SNAPSHOT_KEY } from "@/lib/surgical-sales/engagements/startMissionSnapshot";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import {
  findLatestRecordedObservationOutcome,
} from "./observationApprovalFromEngagements";

describe("observationApprovalFromEngagements", () => {
  it("finds the latest recorded observation outcome on engagements", () => {
    const older = {
      debrief_intelligence_snapshot: {
        [START_MISSION_SNAPSHOT_KEY]: {
          opened_at: "2026-01-01T10:00:00.000Z",
          live_notes: "",
          outcome_id: "follow_up_needed",
          outcome_label: "Follow Up Needed",
          outcome_recorded_at: "2026-01-02T12:00:00.000Z",
        },
      },
    };
    const newer = {
      debrief_intelligence_snapshot: {
        [START_MISSION_SNAPSHOT_KEY]: {
          opened_at: "2026-01-03T10:00:00.000Z",
          live_notes: "OR lead confirmed",
          outcome_id: "observation_approved",
          outcome_label: "Observation Approved",
          outcome_recorded_at: "2026-01-04T15:00:00.000Z",
        },
      },
    };

    const latest = findLatestRecordedObservationOutcome([older, newer]);
    expect(latest?.outcomeId).toBe("observation_approved");
    expect(latest?.approvalNote).toContain("Observation Approved");
    expect(latest?.approvalNote).toContain("OR lead confirmed");
  });

  it("ignores engagements without a mapped observation outcome", () => {
    const latest = findLatestRecordedObservationOutcome([
      {
        debrief_intelligence_snapshot: {
          [START_MISSION_SNAPSHOT_KEY]: {
            opened_at: "2026-01-01T10:00:00.000Z",
            live_notes: "",
            outcome_id: "touch_success",
            outcome_label: "Objective Met",
            outcome_recorded_at: "2026-01-02T12:00:00.000Z",
          },
        },
      },
    ]);
    expect(latest?.outcomeId).toBe("touch_success");
  });

  it("matches pathway validated contact fixture for approved on file", () => {
    const contact = {
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
    expect(hasProviderObservationApprovalValidated(contact)).toBe(true);
  });
});
