import { describe, expect, it } from "vitest";
import { buildEngagementPrepareForMeetingHref } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import { isIntroCallScheduledOnDirectoryRow } from "@/lib/surgical-sales/discoveryIntroCallActivity";
import {
  deriveMissionBoardSecondaryActions,
  deriveMissionBoardStagePrimaryAction,
} from "@/lib/surgical-sales/deriveMissionBoardCardActions";
import { INTRO_DICTATE_COMPLETE_LABEL, INTRO_PREPARE_LABEL } from "@/lib/surgical-sales/introCallEngagementLifecycle";
import { buildEngagementPrimaryActionFromSummary } from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import { deriveGatedPathwayStage } from "@/lib/surgical-sales/pathwayStageGates";
import {
  discoveryAccessReadyContact,
  productFitValidatedContact,
} from "@/lib/surgical-sales/salesPathwayTestFixtures";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  MISSION_BOARD_DEBRIEF_CREATE_LABEL,
  MISSION_BOARD_DEBRIEF_RESUME_LABEL,
} from "@/lib/surgical-sales/missionBoardDebriefLauncherUx";
import {
  DEBRIEF_COMPLETE_LABEL,
  DEBRIEF_PREPARE_LABEL,
  DEBRIEF_START_LABEL,
} from "@/lib/surgical-sales/debriefEngagementLifecycle";
import { MISSION_BOARD_DEBRIEF_REVIEW_LABEL } from "@/lib/surgical-sales/missionBoardDebriefComplete";
import {
  buildDebriefMissionCommandActions,
  resolveProviderDebriefEngagementFromSummaries,
} from "@/lib/surgical-sales/missionBoardEngagementCommand";

const PROVIDER_ID = "11111111-1111-4111-8111-111111111111";
const ENGAGEMENT_ID = "22222222-2222-4222-8222-222222222222";

function baseProvider(extra: Partial<ProviderDirectoryRow> = {}): ProviderDirectoryRow {
  return {
    id: PROVIDER_ID,
    organization_count: 1,
    specialty: "Orthopedics",
    primary_organization_name: "Metro General",
    primary_organization_id: "org-1",
    additional_organizations_count: 0,
    territory: "TX",
    planning_status: "not_started",
    linked_opportunities_count: 0,
    recent_case_count: 0,
    last_activity_at: null,
    relationship_pathway_stage_id: "debrief",
    ...extra,
  };
}

describe("Intro call mission command (regression)", () => {
  it("shows Prepare Intro Call when intro is scheduled with Prepare secondary", () => {
    const primary = deriveMissionBoardStagePrimaryAction(
      baseProvider({
        relationship_pathway_stage_id: "discovery",
        upcoming_engagement: {
          id: "intro-1",
          href: "/portal/sales/engagements/intro-1/prepare",
          engagement_type: "intro_call",
          type_label: "Intro call",
          datetime_label: "Tomorrow",
          location_label: "Metro General",
          primary_goal: "Discovery",
          open_items: [],
        },
      }),
      "discovery",
    );
    expect(primary.label).toBe("Prepare Intro Call");
    expect(primary.kind).toBe("link");
    expect(primary.href).toContain("/prepare");
    expect(primary.href).not.toContain("/active");
  });

  it("shows Prepare and Dictate & Complete secondaries when intro is scheduled", () => {
    const provider = baseProvider({
      relationship_pathway_stage_id: "discovery",
      upcoming_engagement: {
        id: "intro-1",
        href: "/portal/sales/engagements/intro-1/prepare",
        engagement_type: "intro_call",
        type_label: "Intro call",
        datetime_label: "Tomorrow",
        location_label: "Metro General",
        primary_goal: "Discovery",
        open_items: [],
      },
    });
    const secondary = deriveMissionBoardSecondaryActions(provider, "discovery");
    expect(secondary.some((action) => action.id === "intro_prepare" && action.label === INTRO_PREPARE_LABEL)).toBe(
      false,
    );
    expect(
      secondary.some(
        (action) => action.id === "intro_dictate_complete" && action.label === INTRO_DICTATE_COMPLETE_LABEL,
      ),
    ).toBe(true);
  });

  it("still shows Schedule Intro Call when no intro is scheduled", () => {
    const provider = baseProvider({ relationship_pathway_stage_id: "discovery" });
    expect(isIntroCallScheduledOnDirectoryRow(provider)).toBe(false);
    const primary = deriveMissionBoardStagePrimaryAction(provider, "discovery");
    expect(primary.label).toBe("Schedule Intro Call");
    expect(primary.kind).toBe("fast_intro_call");
  });
});

describe("Debrief mission command actions", () => {
  it("shows Schedule Debrief when no engagement exists", () => {
    const actions = buildDebriefMissionCommandActions({ debrief: null });
    expect(actions.primaryLabel).toBe(MISSION_BOARD_DEBRIEF_CREATE_LABEL);
    expect(actions.showPrepareFullBriefing).toBe(false);
    expect(actions.showCompleteDebrief).toBe(false);
  });

  it("shows Prepare Debrief for scheduled debrief", () => {
    const actions = buildDebriefMissionCommandActions({
      debrief: { id: ENGAGEMENT_ID, status: "planned", debrief_completed: false },
    });
    expect(actions.primaryLabel).toBe(DEBRIEF_PREPARE_LABEL);
    expect(actions.showPrepareFullBriefing).toBe(true);
    expect(actions.showCompleteDebrief).toBe(false);
  });

  it("shows Resume Debrief and Complete Debrief for active debrief", () => {
    const actions = buildDebriefMissionCommandActions({
      debrief: { id: ENGAGEMENT_ID, status: "in_progress", debrief_completed: false },
    });
    expect(actions.primaryLabel).toBe(MISSION_BOARD_DEBRIEF_RESUME_LABEL);
    expect(actions.showCompleteDebrief).toBe(true);
    expect(actions.showPrepareFullBriefing).toBe(false);
  });

  it("shows Complete Debrief for debrief-needed state", () => {
    const actions = buildDebriefMissionCommandActions({
      debrief: { id: ENGAGEMENT_ID, status: "completed", debrief_completed: false },
    });
    expect(actions.showCompleteDebrief).toBe(true);
    expect(actions.primaryLabel).toBe(DEBRIEF_COMPLETE_LABEL);
  });

  it("shows Review Debrief only when debrief_completed", () => {
    const actions = buildDebriefMissionCommandActions({
      debrief: { id: ENGAGEMENT_ID, status: "completed", debrief_completed: true },
    });
    expect(actions.primaryLabel).toBe(MISSION_BOARD_DEBRIEF_REVIEW_LABEL);
    expect(actions.isComplete).toBe(true);
    expect(actions.showDictateAndComplete).toBe(false);
    expect(actions.showPrepareFullBriefing).toBe(false);
  });
});

describe("Mission Board debrief card CTA", () => {
  it("uses shared command labels on cards", () => {
    expect(
      deriveMissionBoardStagePrimaryAction(baseProvider(), "debrief").label,
    ).toBe(MISSION_BOARD_DEBRIEF_CREATE_LABEL);

    expect(
      deriveMissionBoardStagePrimaryAction(
        baseProvider({
          provider_debrief_engagement: { id: ENGAGEMENT_ID, status: "planned", debrief_completed: false },
        }),
        "debrief",
      ).label,
    ).toBe(DEBRIEF_PREPARE_LABEL);

    expect(
      deriveMissionBoardStagePrimaryAction(
        baseProvider({
          provider_debrief_engagement: { id: ENGAGEMENT_ID, status: "in_progress", debrief_completed: false },
        }),
        "debrief",
      ).label,
    ).toBe(MISSION_BOARD_DEBRIEF_RESUME_LABEL);
  });
});

describe("Provider overview debrief label alignment", () => {
  it("matches Mission Board labels from engagement summaries", () => {
    const debrief = resolveProviderDebriefEngagementFromSummaries([
      {
        id: ENGAGEMENT_ID,
        engagement_type: "provider_debrief",
        status: "in_progress",
        debrief_completed: false,
      },
    ]);
    expect(debrief?.status).toBe("in_progress");

    const primary = buildEngagementPrimaryActionFromSummary({
      id: ENGAGEMENT_ID,
      engagement_type: "provider_debrief",
      status: "in_progress",
      debrief_completed: false,
    });
    expect(primary.label).toBe(MISSION_BOARD_DEBRIEF_RESUME_LABEL);
  });
});

describe("pathway gates after debrief complete", () => {
  it("advances to Evaluation only through existing gates", () => {
    const observationCases = Array.from({ length: 5 }, (_, i) => ({
      id: `c${i}`,
      case_type: "observation",
      status: "completed",
    }));
    const debriefEngagement = {
      id: ENGAGEMENT_ID,
      engagement_type: "provider_debrief",
      status: "completed",
      debrief_completed: true,
    };

    expect(
      deriveGatedPathwayStage({
        contact: discoveryAccessReadyContact({
          provider_product_fit_validated: "no",
          provider_observation_sequence_complete: "yes",
        }),
        engagements: [debriefEngagement],
        cases: observationCases,
      }),
    ).toBe("debrief");

    expect(
      deriveGatedPathwayStage({
        contact: productFitValidatedContact({
          provider_observation_sequence_complete: "yes",
        }),
        engagements: [debriefEngagement],
        cases: observationCases,
      }),
    ).toBe("evaluation");
  });
});
