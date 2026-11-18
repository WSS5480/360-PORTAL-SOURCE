import { describe, expect, it } from "vitest";

import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { discoveryAccessReadyContact } from "@/lib/surgical-sales/salesPathwayTestFixtures";

import {
  deriveProviderMissionBoardColumn,
  deriveProviderMissionBoardNextAction,
  groupProvidersByMissionBoardColumn,
  PROVIDER_MISSION_BOARD_COLUMNS,
} from "@/lib/surgical-sales/providerMissionBoard";

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
    last_activity_at: null,
    ...overrides,
  };
}

describe("providerMissionBoard", () => {
  it("uses the six official sales pathway columns", () => {
    expect(PROVIDER_MISSION_BOARD_COLUMNS.map((column) => column.id)).toEqual([
      "discovery",
      "observe",
      "debrief",
      "evaluation",
      "commitment",
      "outcomes",
    ]);
    expect(PROVIDER_MISSION_BOARD_COLUMNS.map((column) => column.label)).toEqual([
      "Discovery",
      "Observation",
      "Debrief",
      "Evaluation",
      "Commitment",
      "Outcomes",
    ]);
  });

  it("places each provider in exactly one pathway stage", () => {
    expect(deriveProviderMissionBoardColumn(baseProvider())).toBe("discovery");

    expect(
      deriveProviderMissionBoardColumn(
        baseProvider({
          ...discoveryAccessReadyContact(),
        }),
      ),
    ).toBe("observe");

    expect(
      deriveProviderMissionBoardColumn(
        baseProvider({ relationship_pathway_stage_id: "debrief" }),
      ),
    ).toBe("debrief");

    expect(deriveProviderMissionBoardColumn(baseProvider({ archived_at: new Date().toISOString() }))).toBeNull();
  });

  it("returns pathway-aligned next actions", () => {
    expect(deriveProviderMissionBoardNextAction(baseProvider())).toBe("Create Intro Call");
    expect(
      deriveProviderMissionBoardNextAction(
        baseProvider({ relationship_pathway_stage_id: "commitment" }),
      ),
    ).toBe("Confirm Structured Use");
    expect(
      deriveProviderMissionBoardNextAction(
        baseProvider({
          relationship_pathway_stage_id: "observe",
          upcoming_engagement_count: 1,
          upcoming_engagement: {
            id: "e-obs",
            href: "/portal/sales/engagements/e-obs",
            engagement_type: "or_visit",
            type_label: "Observation",
            datetime_label: "Jun 4",
            location_label: "Metro Surgical",
            primary_goal: "Observe",
            open_items: [],
          },
        }),
      ),
    ).toBe("Add First Observation Case");
  });

  it("groups providers by pathway stage", () => {
    const grouped = groupProvidersByMissionBoardColumn([
      baseProvider({ id: "discovery" }),
      baseProvider({
        id: "observe",
        relationship_pathway_stage_id: "observe",
        observation_count: 1,
        ...discoveryAccessReadyContact(),
      }),
      baseProvider({ id: "debrief", relationship_pathway_stage_id: "debrief" }),
    ]);

    expect(grouped.get("discovery")?.map((p) => p.id)).toEqual(["discovery"]);
    expect(grouped.get("observe")?.map((p) => p.id)).toEqual(["observe"]);
    expect(grouped.get("debrief")?.map((p) => p.id)).toEqual(["debrief"]);
  });
});
