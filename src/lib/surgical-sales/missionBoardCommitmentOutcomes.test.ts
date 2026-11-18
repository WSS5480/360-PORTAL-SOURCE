import { describe, expect, it } from "vitest";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { deriveMissionBoardStagePrimaryAction } from "@/lib/surgical-sales/deriveMissionBoardCardActions";
import {
  buildProviderCommitmentView,
  hasStructuredCommitmentSaved,
} from "@/lib/surgical-sales/providerCommitmentOutcomes";
import {
  MISSION_BOARD_CONFIRM_STRUCTURED_USE_CARD_LABEL,
  MISSION_BOARD_MOVE_TO_OUTCOMES_LABEL,
} from "@/lib/surgical-sales/missionBoardCommitmentOutcomesService";

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
    relationship_pathway_stage_id: "commitment",
    ...overrides,
  };
}

describe("missionBoardCommitmentOutcomes", () => {
  it("shows confirm structured use when commitment is not saved", () => {
    const action = deriveMissionBoardStagePrimaryAction(baseProvider(), "commitment");
    expect(action.kind).toBe("commitment_modal");
    expect(action.label).toBe(MISSION_BOARD_CONFIRM_STRUCTURED_USE_CARD_LABEL);
  });

  it("shows move to outcomes after commitment is saved", () => {
    const provider = baseProvider({
      provider_commitment_confirmed: "yes",
      provider_commitment_type: "trial_series",
      provider_evaluation_path: "Product Trial",
    } as never);
    const action = deriveMissionBoardStagePrimaryAction(provider, "commitment");
    expect(action.kind).toBe("move_to_outcomes");
    expect(action.label).toBe(MISSION_BOARD_MOVE_TO_OUTCOMES_LABEL);
  });

  it("builds commitment view from contact fields", () => {
    const structured = buildProviderCommitmentView({
      provider_commitment_confirmed: "yes",
      provider_commitment_type: "structured_use",
      provider_evaluation_path: "Product Trial",
    });
    expect(structured?.summaryLabel).toBe("Structured product use confirmed");

    const legacy = buildProviderCommitmentView({
      provider_commitment_confirmed: "yes",
      provider_commitment_type: "use_next_case",
      provider_commitment_product_path: "QTi Plus",
      provider_evaluation_path: "Product Trial",
    });
    expect(legacy?.summaryLabel).toContain("Use in next case");
    expect(hasStructuredCommitmentSaved({
      provider_commitment_confirmed: "yes",
      provider_commitment_type: "structured_use",
    })).toBe(true);
  });
});
