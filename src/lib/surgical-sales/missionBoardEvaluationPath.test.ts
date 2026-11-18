import { describe, expect, it } from "vitest";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { buildMissionBoardEvaluationCardContext } from "@/lib/surgical-sales/buildMissionBoardEvaluationCardContext";
import {
  deriveMissionBoardSecondaryActions,
  deriveMissionBoardStagePrimaryAction,
} from "@/lib/surgical-sales/deriveMissionBoardCardActions";
import { MISSION_BOARD_CHOOSE_EVALUATION_PATH_LABEL } from "@/lib/surgical-sales/buildProviderEvaluationPathView";

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

describe("missionBoardEvaluationPath", () => {
  it("shows choose path CTA when evaluation path is not saved", () => {
    const provider = baseProvider();
    const action = deriveMissionBoardStagePrimaryAction(provider, "evaluation");
    expect(action.kind).toBe("evaluation_path_modal");
    expect(action.label).toBe(MISSION_BOARD_CHOOSE_EVALUATION_PATH_LABEL);
  });

  it("routes additional observation to fast observation after path is saved", () => {
    const provider = baseProvider({
      provider_evaluation_path: "Additional Observation",
    } as never);
    const action = deriveMissionBoardStagePrimaryAction(provider, "evaluation");
    expect(action.kind).toBe("fast_observation");
    expect(action.label).toBe("Add observation case");
  });

  it("does not include evaluation Status secondary action", () => {
    const provider = baseProvider({
      provider_evaluation_path: "Product Trial",
    } as never);
    const secondary = deriveMissionBoardSecondaryActions(provider, "evaluation");
    expect(secondary.some((a) => a.id === "evaluation_status")).toBe(false);
  });

  it("builds evaluation card context from contact intelligence", () => {
    const context = buildMissionBoardEvaluationCardContext({
      provider: baseProvider({
        provider_strategic_goal: "Reduce OR turnover on spine cases",
        provider_evaluation_path: "Product Trial",
      } as never),
    });
    expect(context.primaryOpportunity).toContain("Reduce OR turnover");
    expect(context.selectedPath).toBe("Product Trial");
  });
});
