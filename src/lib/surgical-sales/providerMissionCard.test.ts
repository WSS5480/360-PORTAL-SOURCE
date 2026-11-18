import { describe, expect, it } from "vitest";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  buildProviderMissionOpenSignals,
  buildProviderMissionPortfolioSummary,
  deriveProviderCardCurrentMission,
  deriveProviderLastTouch,
  deriveProviderMissionBadge,
  deriveProviderMissionNextAction,
  deriveProviderMissionRecentActivity,
  deriveProviderMissionStatus,
  deriveProviderOpsPriority,
  deriveProviderUpcomingObservationDate,
} from "@/lib/surgical-sales/providerDirectoryOperations";
import { discoveryAccessReadyContact } from "@/lib/surgical-sales/salesPathwayTestFixtures";
import { deriveProviderMissionHealth } from "@/lib/surgical-sales/providerMissionHealth";

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

describe("providerMissionCard", () => {
  it("defaults new providers to intro call mission with create intro call action", () => {
    const p = baseProvider({ planning_completion: undefined, last_activity_at: null });
    expect(deriveProviderCardCurrentMission(p)).toBe("Intro Call Needed");
    expect(deriveProviderMissionStatus(p)).toBe("Waiting on Provider");
    expect(deriveProviderMissionNextAction(p)).toBe("Create Intro Call");
    expect(deriveProviderMissionRecentActivity(p)).toBe("No recent touch");
  });

  it("uses discovery in progress mission after outcome-logged access intel", () => {
    const p = baseProvider({
      relationship_pathway_stage_id: "discovery",
      upcoming_engagement_count: 0,
      provider_evaluation_openness: "Open to observation after intro",
    });
    expect(deriveProviderCardCurrentMission(p)).toBe("Discovery In Progress");
    expect(deriveProviderMissionNextAction(p)).toBe("Create Intro Call");
    const signals = buildProviderMissionOpenSignals(p);
    expect(signals.some((s) => s.label === "Scheduling owner unknown")).toBe(false);
    expect(signals.some((s) => s.label === "Observation not scheduled")).toBe(false);
    expect(signals.length).toBeLessThanOrEqual(3);
  });

  it("does not surface admin access signals as open signals", () => {
    const p = baseProvider({
      relationship_pathway_stage_id: "discovery",
      recent_case_count: 1,
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
    });
    const signals = buildProviderMissionOpenSignals(p);
    expect(signals.some((s) => /scheduling owner/i.test(s.label))).toBe(false);
    expect(signals.length).toBeLessThanOrEqual(3);
  });

  it("prioritizes observation scheduled mission when access intel and calendar work exist", () => {
    const p = baseProvider({
      relationship_pathway_stage_id: "discovery",
      upcoming_engagement_count: 1,
      ...discoveryAccessReadyContact(),
      upcoming_engagement: {
        id: "e-obs",
        href: "/portal/sales/engagements/e-obs",
        engagement_type: "or_visit",
        type_label: "Observation",
        datetime_label: "Jun 8",
        location_label: "Metro Surgical",
        primary_goal: "Observe fixation technique",
        open_items: [],
      },
    });
    expect(deriveProviderCardCurrentMission(p)).toBe("Observation Scheduled");
    expect(deriveProviderMissionStatus(p)).toBe("Scheduled");
    expect(deriveProviderMissionNextAction(p)).toBe("Prepare for Observation");
    expect(deriveProviderMissionRecentActivity(p)).toMatch(/observation scheduled/i);
  });

  it("shows Prepare for Intro Call when intro is scheduled in discovery", () => {
    const p = baseProvider({
      relationship_pathway_stage_id: "discovery",
      upcoming_engagement_count: 1,
      upcoming_engagement: {
        id: "e1",
        href: "/portal/sales/engagements/e1",
        engagement_type: "intro_call",
        type_label: "Intro Meeting",
        datetime_label: "Jun 5",
        location_label: "Virtual",
        primary_goal: "Validate workflow fit",
        open_items: [],
      },
    });
    expect(deriveProviderCardCurrentMission(p)).toBe("Intro Call Needed");
    expect(deriveProviderMissionStatus(p)).toBe("Waiting on Provider");
    expect(deriveProviderMissionNextAction(p)).toBe("Prepare Intro Call");
  });

  it("maps opportunity active mission when initiatives are linked in evaluation stage", () => {
    const p = baseProvider({
      linked_opportunities_count: 2,
      relationship_pathway_stage_id: "evaluation",
    });
    expect(deriveProviderCardCurrentMission(p)).toBe("Prospect Active");
    expect(deriveProviderMissionStatus(p)).toBe("Follow Up Needed");
    expect(deriveProviderMissionNextAction(p)).toBe("Choose Evaluation Path");
  });

  it("shows schedule next observation after partial observation activity", () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const p = baseProvider({
      relationship_pathway_stage_id: "observe",
      observation_count: 2,
      recent_case_count: 0,
      last_activity_at: yesterday,
      ...discoveryAccessReadyContact(),
      planning_completion: {
        status: "in_progress",
        percent: 75,
        sections: [
          {
            id: "observation_readiness",
            label: "Observation readiness",
            status: "complete",
            confidence: "validated",
            confidence_progress: 100,
          },
          {
            id: "clinical_workflow",
            label: "Clinical workflow",
            status: "complete",
            confidence: "confirmed",
            confidence_progress: 100,
          },
          {
            id: "org_environment",
            label: "Facility context",
            status: "complete",
            confidence: "confirmed",
            confidence_progress: 100,
          },
          {
            id: "relationship_intelligence",
            label: "Relationship",
            status: "in_progress",
            confidence: "developing",
            confidence_progress: 40,
          },
        ],
      },
    });
    expect(deriveProviderCardCurrentMission(p)).toBe("Observation In Progress");
    expect(deriveProviderMissionStatus(p)).toBe("Scheduled");
    expect(deriveProviderMissionNextAction(p)).toBe("Schedule Next Observation");
    expect(deriveProviderMissionRecentActivity(p)).toMatch(/observation completed/i);
  });

  it("maps discovery in progress to discovery badge", () => {
    const p = baseProvider({
      provider_evaluation_openness: "Interested in workflow collaboration",
    });
    expect(deriveProviderMissionBadge(p)).toEqual({
      label: "Discovery In Progress",
      health: "yellow",
      healthLabel: "Discovery in progress",
    });
  });

  it("exposes upcoming observation date when engagement is scheduled", () => {
    const p = baseProvider({
      upcoming_engagement: {
        id: "e1",
        href: "/portal/sales/engagements/e1",
        type_label: "Observation",
        datetime_label: "Jun 4",
        location_label: "Metro Surgical",
        primary_goal: "Observe",
        open_items: [],
      },
    });
    expect(deriveProviderUpcomingObservationDate(p)).toBe("Jun 4 · Metro Surgical");
  });
});

describe("providerOperationsView", () => {
  it("summarizes portfolio operational state", () => {
    const providers = [
      baseProvider({
        id: "p1",
        relationship_pathway_stage_id: "observe",
        upcoming_engagement_count: 1,
      }),
      baseProvider({
        id: "p2",
        relationship_pathway_stage_id: "discovery",
        last_activity_at: null,
        planning_completion: undefined,
      }),
      baseProvider({
        id: "p3",
        relationship_pathway_stage_id: "debrief",
        recent_case_count: 2,
      }),
    ];

    const summary = buildProviderMissionPortfolioSummary(providers);
    expect(summary.metrics.find((metric) => metric.id === "observe")?.count).toBe(1);
    expect(summary.metrics.find((metric) => metric.id === "discovery")?.count).toBe(1);
    expect(summary.metrics.find((metric) => metric.id === "debrief")?.count).toBe(1);
  });

  it("uses last touch phrasing for intro calls", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const p = baseProvider({
      relationship_pathway_stage_id: "discovery",
      last_contacted_at: twoDaysAgo,
      last_activity_at: twoDaysAgo,
      planning_completion: undefined,
    });
    expect(deriveProviderLastTouch(p)).toBe("Intro call 2d ago");
  });

  it("prefers observation approved last touch when approval is validated on file", () => {
    const p = baseProvider({
      last_activity_at: new Date().toISOString(),
      provider_observation_feasibility: "easy|validated_at:2026-01-01",
    });
    expect(deriveProviderLastTouch(p)).toBe("Observation approved today");
  });

  it("labels planned observation requests as engagement planned until access is secured", () => {
    const p = baseProvider({
      relationship_pathway_stage_id: "discovery",
      upcoming_engagement: {
        id: "e1",
        href: "/portal/sales/engagements/e1",
        type_label: "Observation Access Request",
        datetime_label: "Today",
        location_label: "Metro Surgical",
        primary_goal: "Schedule observation",
        open_items: [],
      },
    });
    expect(deriveProviderLastTouch(p)).toBe("Engagement planned today");
  });

  it("does not mark stale providers as overdue without execution next step", () => {
    const p = baseProvider({ last_activity_at: null, planning_completion: undefined });
    expect(deriveProviderOpsPriority(p)).toBe("waiting");
  });

  it("marks providers with five observations as debrief-ready priority", () => {
    const p = baseProvider({
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
    expect(deriveProviderOpsPriority(p)).toBe("action");
    expect(deriveProviderMissionHealth(p).health).toBe("blue");
  });

  it("marks upcoming observation providers as progressing when access is secured", () => {
    const p = baseProvider({
      upcoming_engagement_count: 1,
      upcoming_observation_prep_incomplete: false,
      provider_scheduling_contact: "Karen — OR scheduler",
      provider_observation_access_path: "Vendor credentialing via materials management",
    });
    expect(deriveProviderOpsPriority(p)).toBe("progressing");
    expect(deriveProviderMissionHealth(p).health).toBe("green");
  });
});
