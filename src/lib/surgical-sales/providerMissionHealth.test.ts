import { describe, expect, it } from "vitest";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  computeUpcomingObservationImminent,
  computeUpcomingObservationPrepIncomplete,
  deriveProviderMissionHealth,
} from "@/lib/surgical-sales/providerMissionHealth";

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

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days));
  return dt.toISOString().slice(0, 10);
}

describe("providerMissionHealth", () => {
  it("uses yellow for waiting on provider and observation requested", () => {
    expect(deriveProviderMissionHealth(baseProvider({ planning_completion: undefined })).health).toBe("yellow");
    expect(
      deriveProviderMissionHealth(
        baseProvider({
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
      ).health,
    ).toBe("yellow");
  });

  it("uses green for opportunity active and observation scheduled with prep complete", () => {
    expect(deriveProviderMissionHealth(baseProvider({ linked_opportunities_count: 1 })).health).toBe("green");
    expect(
      deriveProviderMissionHealth(
        baseProvider({
          upcoming_engagement_count: 1,
          upcoming_observation_prep_incomplete: false,
          provider_scheduling_contact: "Karen — OR scheduler",
          provider_observation_access_path: "Vendor credentialing via materials management",
        }),
      ).health,
    ).toBe("green");
  });

  it("uses blue for debrief ready and upcoming observation with prep gaps", () => {
    const debriefProvider = baseProvider({
      observation_count: 5,
      relationship_pathway_stage_id: "debrief",
      recent_case_count: 2,
      planning_completion: {
        status: "in_progress",
        percent: 50,
        sections: [
          { id: "observation_readiness", label: "Observation readiness", status: "complete", confidence: "validated", confidence_progress: 100 },
          { id: "clinical_workflow", label: "Clinical workflow", status: "complete", confidence: "confirmed", confidence_progress: 100 },
          { id: "org_environment", label: "Facility context", status: "complete", confidence: "confirmed", confidence_progress: 100 },
          { id: "relationship_intelligence", label: "Relationship", status: "in_progress", confidence: "developing", confidence_progress: 40 },
        ],
      },
    });
    expect(deriveProviderMissionHealth(debriefProvider).health).toBe("blue");

    expect(
      deriveProviderMissionHealth(
        baseProvider({
          upcoming_engagement_count: 1,
          upcoming_observation_prep_incomplete: true,
          upcoming_observation_imminent: false,
        }),
      ).health,
    ).toBe("blue");
  });

  it("uses red only for follow-up unscheduled and imminent observation prep gaps", () => {
    expect(
      deriveProviderMissionHealth(baseProvider({ pending_follow_up_unscheduled: true })).health,
    ).toBe("red");

    expect(
      deriveProviderMissionHealth(
        baseProvider({
          upcoming_observation_imminent: true,
          upcoming_observation_prep_incomplete: true,
          upcoming_engagement_count: 1,
        }),
      ).health,
    ).toBe("red");
  });

  it("does not use red for scheduler unknown or credentialing gaps alone", () => {
    const adminMetadataOnly = baseProvider({
      planning_completion: {
        status: "in_progress",
        percent: 10,
        sections: [
          {
            id: "observation_readiness",
            label: "Observation readiness",
            status: "not_started",
            confidence: "early",
            confidence_progress: 5,
          },
        ],
      },
    });
    expect(deriveProviderMissionHealth(adminMetadataOnly).health).toBe("yellow");

    const schedulerUnknownWithUpcoming = baseProvider({
      upcoming_engagement_count: 1,
      upcoming_observation_imminent: false,
      upcoming_observation_prep_incomplete: false,
      provider_scheduling_contact: "Karen — OR scheduler",
      provider_observation_access_path: "Vendor credentialing via materials management",
      planning_completion: {
        status: "in_progress",
        percent: 10,
        sections: [
          {
            id: "observation_readiness",
            label: "Observation readiness",
            status: "in_progress",
            confidence: "early",
            confidence_progress: 10,
          },
        ],
      },
    });
    expect(deriveProviderMissionHealth(schedulerUnknownWithUpcoming).health).toBe("green");
  });

  it("counts only execution prep gaps toward imminent red", () => {
    const today = todayYmd();
    const tomorrow = addDaysYmd(today, 1);

    expect(
      computeUpcomingObservationImminent(
        { engagement_type: "or_visit", engagement_date: tomorrow },
        today,
      ),
    ).toBe(true);

    expect(
      computeUpcomingObservationPrepIncomplete(
        { engagement_type: "or_visit", observation_goal: "Observe technique", case_id: "c1" },
        baseProvider(),
      ),
    ).toBe(false);

    expect(
      computeUpcomingObservationPrepIncomplete(
        { engagement_type: "or_visit", observation_goal: null, case_id: "c1" },
        baseProvider(),
      ),
    ).toBe(true);
  });
});
