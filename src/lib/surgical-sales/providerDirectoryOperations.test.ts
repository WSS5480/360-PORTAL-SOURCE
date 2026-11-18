import { describe, expect, it } from "vitest";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  buildProviderDirectoryReadinessGaps,
  buildProviderDirectoryReadinessSummary,
  deriveProviderCurrentMissionLabel,
  deriveProviderNextAction,
  deriveProviderNextFieldMove,
  deriveProviderOpsQuickActions,
  deriveProviderOpsStatus,
  deriveProviderPathwayStatus,
  deriveProviderRelationshipPathwayStageLabel,
  deriveProviderTacticalActions,
  parseProviderViewMode,
} from "@/lib/surgical-sales/providerDirectoryOperations";

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

describe("providerDirectoryOperations", () => {
  it("parses view mode storage values", () => {
    expect(parseProviderViewMode("operations")).toBe("operations");
    expect(parseProviderViewMode("mission")).toBe("mission");
    expect(parseProviderViewMode("crm")).toBe("mission");
  });

  it("prioritizes prep engagement when upcoming work exists", () => {
    const p = baseProvider({ upcoming_engagement_count: 2 });
    expect(deriveProviderNextFieldMove(p)).toBe("Prep engagement");
    expect(deriveProviderNextAction(p)).toBe("Prep engagement");
    expect(deriveProviderOpsStatus(p)).toBe("advancing");
  });

  it("marks blocked when organization and activity are missing", () => {
    const p = baseProvider({
      primary_organization_id: null,
      primary_organization_name: null,
      last_activity_at: null,
      upcoming_engagement_count: 0,
      planning_completion: undefined,
    });
    expect(deriveProviderOpsStatus(p)).toBe("blocked");
    const summary = buildProviderDirectoryReadinessSummary(p);
    expect(summary.headline).not.toMatch(/signals/i);
    expect(summary.openGapCount).toBeGreaterThan(0);
  });

  it("uses field-facing readiness gaps instead of abstract counts", () => {
    const p = baseProvider({ upcoming_engagement_count: 1 });
    const gaps = buildProviderDirectoryReadinessGaps(p);
    expect(gaps.some((g) => g.label.includes("signal"))).toBe(false);
    const summary = buildProviderDirectoryReadinessSummary(p);
    expect(summary.headline).toMatch(/Observation readiness|readiness|approved|calendar/i);
    const actions = deriveProviderTacticalActions(p);
    expect(actions.some((a) => a.label === "Open")).toBe(true);
    expect(deriveProviderPathwayStatus(p)).not.toMatch(/signal/i);
    expect(["Upcoming touch", "Case active", "In progress"]).toContain(
      deriveProviderPathwayStatus(p),
    );
  });

  it("exposes standard operations quick actions", () => {
    const p = baseProvider();
    const actions = deriveProviderOpsQuickActions(p);
    expect(actions.map((a) => a.id)).toEqual(["open", "intel", "engagement", "case"]);
  });

  it("separates relationship pathway stage from current focus", () => {
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
    expect(deriveProviderRelationshipPathwayStageLabel(p)).toBe("Discovery");
    expect(deriveProviderCurrentMissionLabel(p)).toBe("Observation Scheduled");
  });
});
