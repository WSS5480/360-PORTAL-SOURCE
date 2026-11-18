import { describe, expect, it } from "vitest";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { buildMissionBoardEvaluationPathViewFromDirectoryRow } from "@/lib/surgical-sales/missionBoardEvaluationPathView";

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
    relationship_pathway_stage_id: "evaluation",
    ...overrides,
  };
}

describe("buildMissionBoardEvaluationPathViewFromDirectoryRow", () => {
  it("builds a usable view from mission board directory row data", () => {
    const view = buildMissionBoardEvaluationPathViewFromDirectoryRow(
      baseProvider({
        first_name: "Alex",
        last_name: "Rivera",
        provider_evaluation_path: "360 Experience",
        provider_evaluation_path_target_date: "2026-06-15",
        provider_evaluation_path_notes: "Focus on spine workflow",
        provider_strategic_goal: "Reduce turnover on complex cases",
      } as never),
    );

    expect(view.providerName).toBe("Alex Rivera");
    expect(view.organizationName).toBe("Metro Surgical");
    expect(view.selectedPath).toBe("360 Experience");
    expect(view.targetDate).toBe("2026-06-15");
    expect(view.notes).toBe("Focus on spine workflow");
    expect(view.primaryOpportunity).toContain("Reduce turnover");
  });
});
