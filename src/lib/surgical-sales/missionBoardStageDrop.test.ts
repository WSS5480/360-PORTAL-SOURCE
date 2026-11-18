import { describe, expect, it } from "vitest";

import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  deriveMissionBoardSecondaryActions,
  deriveMissionBoardStagePrimaryAction,
} from "./deriveMissionBoardCardActions";
import { buildProviderMissionBoardCardModel } from "./buildProviderMissionBoardCardModel";
import {
  buildMissionBoardPathwayGateInput,
  isMissionBoardDebriefReadyForEvaluation,
  isMissionBoardForwardAdjacentDrop,
  missionBoardDropTargetPreview,
  missionBoardDropTargetState,
  resolveMissionBoardStageDrop,
} from "./missionBoardStageDrop";
import { discoveryAccessReadyContact } from "./salesPathwayTestFixtures";

function baseProvider(overrides: Partial<ProviderDirectoryRow> = {}): ProviderDirectoryRow {
  return {
    id: "p1",
    specialty: "Orthopedics",
    primary_organization_name: "Test4 Hospital",
    primary_organization_id: "org-1",
    organization_count: 1,
    additional_organizations_count: 0,
    territory: "TX",
    planning_status: "not_started",
    linked_opportunities_count: 0,
    recent_case_count: 0,
    last_activity_at: null,
    relationship_pathway_stage_id: "discovery",
    ...overrides,
  };
}

describe("deriveMissionBoardCardActions", () => {
  it("discovery secondary actions are Field note and Status only", () => {
    const provider = baseProvider();
    const primary = deriveMissionBoardStagePrimaryAction(provider, "discovery");
    const secondary = deriveMissionBoardSecondaryActions(provider, "discovery");

    expect(primary.label).toBe("Schedule Intro Call");
    expect(primary.kind).toBe("fast_intro_call");
    expect(primary.href).toContain("intro_call");
    expect(secondary.map((a) => a.id)).toEqual(["dictate", "observation_status"]);
    expect(secondary.find((a) => a.id === "observation_status")?.label).toBe("📋 Status");
    expect(secondary.find((a) => a.id === "dictate")?.label).toBe("Field Note");
    expect(secondary.some((a) => a.id === "schedule")).toBe(false);
    expect(secondary.some((a) => a.id === "open_profile")).toBe(false);
  });

  it("discovery scheduled intro routes to Prepare Intro Call without duplicate Prepare secondary", () => {
    const provider = baseProvider({
      upcoming_engagement: {
        id: "intro-1",
        href: "/portal/sales/engagements/intro-1",
        engagement_type: "intro_call",
        status: "planned",
        type_label: "Intro Meeting",
        datetime_label: "Jun 12",
        location_label: "Virtual",
        primary_goal: "Validate workflow fit",
        open_items: [],
      },
    });
    const primary = deriveMissionBoardStagePrimaryAction(provider, "discovery");
    const secondary = deriveMissionBoardSecondaryActions(provider, "discovery");
    expect(primary.label).toBe("Prepare Intro Call");
    expect(primary.kind).toBe("link");
    expect(primary.href).toContain("/prepare");
    expect(secondary.some((action) => action.id === "intro_prepare")).toBe(false);
    expect(secondary.some((action) => action.id === "intro_dictate_complete")).toBe(true);
    expect(secondary.some((action) => action.id === "intro_just_complete")).toBe(true);
  });

  it("discovery prepared intro routes to Start Intro Call", () => {
    const provider = baseProvider({
      upcoming_engagement: {
        id: "intro-1",
        href: "/portal/sales/engagements/intro-1",
        engagement_type: "intro_call",
        status: "planned",
        prepared_at: "2026-06-01T12:00:00Z",
        planning_status: "planned",
        type_label: "Intro Meeting",
        datetime_label: "Jun 12",
        location_label: "Virtual",
        primary_goal: "Validate workflow fit",
        open_items: [],
      },
    });
    const primary = deriveMissionBoardStagePrimaryAction(provider, "discovery");
    const secondary = deriveMissionBoardSecondaryActions(provider, "discovery");
    expect(primary.label).toBe("Start Intro Call");
    expect(primary.kind).toBe("intro_start");
    expect(primary.href).toContain("/active");
    expect(secondary.find((a) => a.id === "intro_prepare")?.label).toBe("Prepare Intro Call");
  });

  it("discovery active intro keeps Prepare alongside Resume", () => {
    const provider = baseProvider({
      upcoming_engagement: {
        id: "intro-1",
        href: "/portal/sales/engagements/intro-1",
        engagement_type: "intro_call",
        status: "in_progress",
        prepared_at: "2026-06-01T12:00:00Z",
        planning_status: "planned",
        type_label: "Intro Meeting",
        datetime_label: "Jun 12",
        location_label: "Virtual",
        primary_goal: "Validate workflow fit",
        open_items: [],
      },
    });
    const primary = deriveMissionBoardStagePrimaryAction(provider, "discovery");
    const secondary = deriveMissionBoardSecondaryActions(provider, "discovery");
    expect(primary.label).toBe("Resume Intro Call");
    expect(secondary.find((a) => a.id === "intro_prepare")?.href).toContain("/prepare");
  });

  it("observation primary is Add Observation", () => {
    const provider = baseProvider({ relationship_pathway_stage_id: "observe" });
    const primary = deriveMissionBoardStagePrimaryAction(provider, "observe");
    const secondary = deriveMissionBoardSecondaryActions(provider, "observe");

    expect(primary.label).toBe("Add Observation");
    expect(primary.kind).toBe("fast_observation");
    expect(secondary.map((a) => a.id)).toEqual(["dictate"]);
  });
});

describe("buildProviderMissionBoardCardModel", () => {
  it("uses stage primary action on discovery card", () => {
    const model = buildProviderMissionBoardCardModel(
      baseProvider({
        first_name: "Drew",
        last_name: "Barry",
      }),
    );

    expect(model.primaryCta.label).toBe("Schedule Intro Call");
    expect(model.primaryCta.kind).toBe("fast_intro_call");
    expect(model.progressLabel).toBe("Observation Access Unknown");
    expect(model.secondaryActions.some((a) => a.id === "observation_status")).toBe(true);
  });
});

describe("missionBoardStageDrop", () => {
  it("allows adjacent forward drops only", () => {
    expect(isMissionBoardForwardAdjacentDrop("discovery", "observe")).toBe(true);
    expect(isMissionBoardForwardAdjacentDrop("discovery", "debrief")).toBe(false);
    expect(isMissionBoardForwardAdjacentDrop("observe", "discovery")).toBe(false);
  });

  it("marks observe to debrief invalid when observation count is low", () => {
    const provider = baseProvider({
      relationship_pathway_stage_id: "observe",
      observation_count: 2,
    });
    expect(missionBoardDropTargetState("observe", "debrief", provider)).toBe("invalid");
  });

  it("shows discovery to observe as droppable without approval during drag", () => {
    const provider = baseProvider({ relationship_pathway_stage_id: "discovery" });
    const preview = missionBoardDropTargetPreview("discovery", "observe", provider);
    expect(preview.state).toBe("valid");
    expect(preview.hint).toBe("Release to confirm observation permission.");
  });

  it("shows discovery to observe as valid when approval confirmed", () => {
    const provider = baseProvider({
      relationship_pathway_stage_id: "discovery",
      ...(discoveryAccessReadyContact() as Partial<ProviderDirectoryRow>),
    });
    expect(missionBoardDropTargetPreview("discovery", "observe", provider).state).toBe("valid");
  });

  it("requests observation permission confirmation for discovery to observe drop without approval", () => {
    const resolution = resolveMissionBoardStageDrop("discovery", "observe", {
      contact: { provider_observation_feasibility: null },
    });
    expect(resolution.type).toBe("open_observation_approval");
  });

  it("blocks observe to debrief with shortfall message", () => {
    const resolution = resolveMissionBoardStageDrop("observe", "debrief", {
      contact: {},
      cases: [],
    });
    expect(resolution.type).toBe("blocked");
    if (resolution.type === "blocked") {
      expect(resolution.message).toBe("Only 0 of 5 observations completed.");
      expect(resolution.actions.some((a) => a.id === "add_observation")).toBe(true);
    }
  });

  it("allows debrief to evaluation when debrief_completed is saved", () => {
    const resolution = resolveMissionBoardStageDrop("debrief", "evaluation", {
      contact: {},
      engagements: [
        {
          id: "d1",
          engagement_type: "provider_debrief",
          status: "completed",
          debrief_completed: true,
        },
      ],
    });
    expect(resolution.type).toBe("refresh");
  });

  it("opens debrief status when engagement is completed but debrief_completed is false", () => {
    const resolution = resolveMissionBoardStageDrop("debrief", "evaluation", {
      contact: {},
      engagements: [
        {
          id: "d1",
          engagement_type: "provider_debrief",
          status: "completed",
          debrief_completed: false,
        },
      ],
    });
    expect(resolution.type).toBe("open_debrief_status");
  });

  it("opens debrief status from directory row when debrief is incomplete", () => {
    const provider = baseProvider({
      relationship_pathway_stage_id: "debrief",
      provider_debrief_engagement: {
        id: "d1",
        status: "in_progress",
        debrief_completed: false,
      },
    });
    const gateInput = buildMissionBoardPathwayGateInput(provider);
    expect(isMissionBoardDebriefReadyForEvaluation(gateInput)).toBe(false);
    expect(resolveMissionBoardStageDrop("debrief", "evaluation", gateInput).type).toBe(
      "open_debrief_status",
    );
  });

  it("opens debrief status modal for debrief to evaluation drop without completion", () => {
    const resolution = resolveMissionBoardStageDrop("debrief", "evaluation", {
      contact: {},
      engagements: [],
    });
    expect(resolution.type).toBe("open_debrief_status");
  });

  it("shows debrief status hint during drag when debrief is incomplete", () => {
    const provider = baseProvider({ relationship_pathway_stage_id: "debrief" });
    const preview = missionBoardDropTargetPreview("debrief", "evaluation", provider);
    expect(preview.state).toBe("valid");
    expect(preview.hint).toBe("Release to update debrief status.");
  });

  it("marks evaluation successful when dropped to commitment before completion", () => {
    const resolution = resolveMissionBoardStageDrop("evaluation", "commitment", {
      contact: { provider_evaluation_path: "360 Experience" },
    });
    expect(resolution.type).toBe("mark_evaluation_successful");
    if (resolution.type === "mark_evaluation_successful") {
      expect(resolution.message).toContain("Commitment");
    }
  });

  it("shows evaluation to commitment as droppable during drag before completion", () => {
    const provider = baseProvider({
      relationship_pathway_stage_id: "evaluation",
      provider_evaluation_path: "Product Trial",
    } as never);
    const preview = missionBoardDropTargetPreview("evaluation", "commitment", provider);
    expect(preview.state).toBe("valid");
    expect(preview.hint).toContain("mark evaluation successful");
  });

  it("opens commitment modal for commitment to outcomes drop without structured commitment", () => {
    const resolution = resolveMissionBoardStageDrop("commitment", "outcomes", {
      contact: {},
    });
    expect(resolution.type).toBe("open_commitment_modal");
  });

  it("shows commitment to outcomes as droppable during drag without structured commitment", () => {
    const provider = baseProvider({ relationship_pathway_stage_id: "commitment" });
    const preview = missionBoardDropTargetPreview("commitment", "outcomes", provider);
    expect(preview.state).toBe("valid");
    expect(preview.hint).toBe("Release to confirm structured use.");
  });

  it("activates outcomes tracking when commitment is saved but tracking is inactive", () => {
    const resolution = resolveMissionBoardStageDrop("commitment", "outcomes", {
      contact: {
        provider_commitment_confirmed: "yes",
        provider_commitment_type: "use_next_case",
      },
    });
    expect(resolution.type).toBe("activate_outcomes_tracking");
  });

  it("refreshes commitment to outcomes when outcomes tracking is already active", () => {
    const resolution = resolveMissionBoardStageDrop("commitment", "outcomes", {
      contact: {
        provider_commitment_confirmed: "yes",
        provider_commitment_type: "use_next_case",
        provider_outcomes_tracking_active: "yes",
      },
    });
    expect(resolution.type).toBe("refresh");
  });
});
