import { describe, expect, it } from "vitest";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  deriveEvidenceBasedProviderFieldMission,
  engagementHasLoggedExecutionOutcome,
  providerHasObservationScheduledEvidence,
  workflowSourceMayAdvanceStage,
} from "./relationshipStageProgression";
import { deriveProviderMissionBoardColumn } from "./providerMissionBoard";

function baseProvider(overrides: Partial<ProviderDirectoryRow> = {}): ProviderDirectoryRow {
  return {
    id: "p1",
    specialty: "Orthopedics",
    primary_organization_name: "Metro Surgical",
    primary_organization_id: "org-1",
    organization_count: 1,
    additional_organizations_count: 0,
    territory: "TX",
    planning_status: "not_started",
    linked_opportunities_count: 0,
    recent_case_count: 0,
    last_activity_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("relationshipStageProgression", () => {
  it("blocks non-execution sources from advancing stage", () => {
    expect(workflowSourceMayAdvanceStage("engagement_create")).toBe(false);
    expect(workflowSourceMayAdvanceStage("briefing_generate")).toBe(false);
    expect(workflowSourceMayAdvanceStage("template_generate")).toBe(false);
    expect(workflowSourceMayAdvanceStage("planning_activity")).toBe(false);
    expect(workflowSourceMayAdvanceStage("outcome_log")).toBe(true);
    expect(workflowSourceMayAdvanceStage("case_completion")).toBe(true);
  });

  it("does not treat planned engagements as execution outcome", () => {
    expect(
      engagementHasLoggedExecutionOutcome({
        notes: null,
        debrief_completed: false,
        debrief_completed_at: null,
      }),
    ).toBe(false);
    expect(
      engagementHasLoggedExecutionOutcome({
        notes: "--- tactical debrief ---\nWhat happened:\nAccess secured",
        debrief_completed: true,
        debrief_completed_at: "2026-06-01T12:00:00Z",
      }),
    ).toBe(true);
  });

  it("keeps intro call and observation request creation in discovery", () => {
    expect(
      deriveEvidenceBasedProviderFieldMission(
        baseProvider({
          upcoming_engagement_count: 1,
          planning_completion: {
            status: "in_progress",
            percent: 20,
            sections: [
              {
                id: "observation_readiness",
                label: "Observation readiness",
                status: "in_progress",
                confidence: "developing",
                confidence_progress: 40,
              },
            ],
          },
        }),
      ),
    ).toBe("Intro Call Needed");

    expect(
      deriveProviderMissionBoardColumn(
        baseProvider({
          upcoming_engagement_count: 1,
          planning_completion: {
            status: "in_progress",
            percent: 20,
            sections: [
              {
                id: "observation_readiness",
                label: "Observation readiness",
                status: "in_progress",
                confidence: "developing",
                confidence_progress: 40,
              },
            ],
          },
        }),
      ),
    ).toBe("discovery");
  });

  it("advances to observation scheduled only after outcome-logged access and scheduling intel", () => {
    const contact = {
      provider_scheduling_contact: "Karen — OR scheduler",
      provider_observation_access_path: "Vendor credentialing via materials management",
    };

    expect(providerHasObservationScheduledEvidence(contact)).toBe(true);
    expect(
      deriveEvidenceBasedProviderFieldMission(
        baseProvider({
          ...contact,
          upcoming_engagement_count: 1,
        }),
      ),
    ).toBe("Observation Scheduled");
    expect(
      deriveProviderMissionBoardColumn(
        baseProvider({
          ...contact,
          upcoming_engagement_count: 0,
        }),
      ),
    ).toBe("discovery");
  });

  it("advances to observation complete after cases are logged", () => {
    expect(
      deriveEvidenceBasedProviderFieldMission(baseProvider({ observation_count: 1 })),
    ).toBe("Observation In Progress");
  });

  it("advances to discovery in progress from logged access intel without schedule", () => {
    expect(
      deriveEvidenceBasedProviderFieldMission(
        baseProvider({
          provider_evaluation_openness: "Open to observation after intro",
        }),
      ),
    ).toBe("Discovery In Progress");
  });
});
