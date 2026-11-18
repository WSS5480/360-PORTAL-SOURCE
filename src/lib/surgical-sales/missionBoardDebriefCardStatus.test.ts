import { describe, expect, it } from "vitest";
import { buildProviderMissionBoardCardModel } from "@/lib/surgical-sales/buildProviderMissionBoardCardModel";
import { deriveMissionBoardStagePrimaryAction, deriveMissionBoardSecondaryActions } from "@/lib/surgical-sales/deriveMissionBoardCardActions";
import { isIntroCallScheduledOnDirectoryRow } from "@/lib/surgical-sales/discoveryIntroCallActivity";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  DEBRIEF_COMPLETE_LABEL,
  DEBRIEF_PREPARE_LABEL,
  DEBRIEF_RESUME_LABEL,
  DEBRIEF_SCHEDULE_LABEL,
  DEBRIEF_START_LABEL,
  DEBRIEF_STATUS_ACTIVE,
  DEBRIEF_STATUS_COMPLETE,
  DEBRIEF_STATUS_NEEDS_COMPLETION,
  DEBRIEF_STATUS_NOT_SCHEDULED,
  DEBRIEF_STATUS_SCHEDULED,
  deriveDebriefLifecyclePrimaryAction,
} from "@/lib/surgical-sales/debriefEngagementLifecycle";
import { deriveMissionBoardDebriefStatusLine } from "@/lib/surgical-sales/missionBoardDebriefCardStatus";
import { MISSION_BOARD_DEBRIEF_REVIEW_LABEL } from "@/lib/surgical-sales/missionBoardDebriefComplete";

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

describe("Intro call card regression", () => {
  it("still uses observation access status line and Status action", () => {
    const provider = baseProvider({ relationship_pathway_stage_id: "discovery" });
    expect(isIntroCallScheduledOnDirectoryRow(provider)).toBe(false);
    const model = buildProviderMissionBoardCardModel(provider);
    expect(model.progressLabel).toBe("Observation Access Unknown");
    expect(model.primaryCta.label).toBe("Schedule Intro Call");
    const secondary = deriveMissionBoardSecondaryActions(provider, "discovery");
    expect(secondary.some((a) => a.id === "dictate" && a.label.includes("Field note"))).toBe(true);
    expect(secondary.some((a) => a.id === "observation_status")).toBe(true);
  });
});

describe("Debrief card status line", () => {
  it("shows Debrief Not Scheduled when no engagement exists", () => {
    expect(deriveMissionBoardDebriefStatusLine(null)).toBe(DEBRIEF_STATUS_NOT_SCHEDULED);
    const model = buildProviderMissionBoardCardModel(baseProvider());
    expect(model.progressLabel).toBe(DEBRIEF_STATUS_NOT_SCHEDULED);
  });

  it("shows Debrief Scheduled and Start Debrief for scheduled engagement", () => {
    const debrief = { id: ENGAGEMENT_ID, status: "planned", debrief_completed: false };
    expect(deriveMissionBoardDebriefStatusLine(debrief)).toBe(DEBRIEF_STATUS_SCHEDULED);
    expect(deriveDebriefLifecyclePrimaryAction(debrief).label).toBe(DEBRIEF_PREPARE_LABEL);
  });

  it("shows Debrief Active and Resume Debrief for in_progress engagement", () => {
    const debrief = { id: ENGAGEMENT_ID, status: "in_progress", debrief_completed: false };
    expect(deriveMissionBoardDebriefStatusLine(debrief)).toBe(DEBRIEF_STATUS_ACTIVE);
    expect(deriveDebriefLifecyclePrimaryAction(debrief).label).toBe(DEBRIEF_RESUME_LABEL);
  });

  it("shows Debrief Needed and Complete Debrief when completed without debrief_completed", () => {
    const debrief = { id: ENGAGEMENT_ID, status: "completed", debrief_completed: false };
    expect(deriveMissionBoardDebriefStatusLine(debrief)).toBe(DEBRIEF_STATUS_NEEDS_COMPLETION);
    const cta = deriveDebriefLifecyclePrimaryAction(debrief);
    expect(cta.label).toBe(DEBRIEF_COMPLETE_LABEL);
    expect(cta.href).toContain("/debrief");
  });

  it("shows Debrief Complete and Review Debrief when debrief_completed", () => {
    const debrief = { id: ENGAGEMENT_ID, status: "completed", debrief_completed: true };
    expect(deriveMissionBoardDebriefStatusLine(debrief)).toBe(DEBRIEF_STATUS_COMPLETE);
    expect(deriveDebriefLifecyclePrimaryAction(debrief).label).toBe(MISSION_BOARD_DEBRIEF_REVIEW_LABEL);
  });
});

describe("Debrief card secondary actions", () => {
  it("includes Prepare Debrief secondary when debrief is scheduled", () => {
    const secondary = deriveMissionBoardSecondaryActions(
      baseProvider({
        provider_debrief_engagement: {
          id: ENGAGEMENT_ID,
          status: "planned",
          debrief_completed: false,
        },
      }),
      "debrief",
    );
    expect(secondary.find((a) => a.id === "debrief_prepare")?.label).toBe(DEBRIEF_PREPARE_LABEL);
  });

  it("includes Field note and Status buttons when debrief exists", () => {
    const secondary = deriveMissionBoardSecondaryActions(
      baseProvider({
        provider_debrief_engagement: {
          id: ENGAGEMENT_ID,
          status: "planned",
          debrief_completed: false,
        },
      }),
      "debrief",
    );
    expect(secondary.some((a) => a.id === "dictate" && a.label.includes("Field note"))).toBe(true);
    expect(secondary.some((a) => a.id === "debrief_status" && a.label.includes("Status"))).toBe(true);
  });

  it("includes Dictate & Complete and Just Complete when debrief is scheduled", () => {
    const secondary = deriveMissionBoardSecondaryActions(
      baseProvider({
        provider_debrief_engagement: {
          id: ENGAGEMENT_ID,
          status: "planned",
          debrief_completed: false,
        },
      }),
      "debrief",
    );
    expect(secondary.find((a) => a.id === "debrief_dictate_complete")?.label).toBe("Dictate & Complete");
    expect(secondary.find((a) => a.id === "debrief_just_complete")?.label).toBe("Just Complete");
    expect(secondary.find((a) => a.id === "debrief_dictate_complete")?.engagementId).toBe(ENGAGEMENT_ID);
  });

  it("does not include quick complete actions when debrief is already complete", () => {
    const secondary = deriveMissionBoardSecondaryActions(
      baseProvider({
        provider_debrief_engagement: {
          id: ENGAGEMENT_ID,
          status: "completed",
          debrief_completed: true,
        },
      }),
      "debrief",
    );
    expect(secondary.some((a) => a.id === "debrief_dictate_complete")).toBe(false);
    expect(secondary.some((a) => a.id === "debrief_just_complete")).toBe(false);
  });

  it("includes Status even when debrief is not scheduled", () => {
    const secondary = deriveMissionBoardSecondaryActions(baseProvider(), "debrief");
    expect(secondary.some((a) => a.id === "debrief_status" && a.label.includes("Status"))).toBe(true);
  });
});

describe("Debrief card create action", () => {
  it("routes Schedule Debrief through fast_debrief scheduling modal", () => {
    const primary = deriveMissionBoardStagePrimaryAction(baseProvider(), "debrief");
    expect(primary.label).toBe(DEBRIEF_SCHEDULE_LABEL);
    expect(primary.kind).toBe("fast_debrief");
  });

  it("routes prepared debrief through debrief_start to begin active session", () => {
    const primary = deriveMissionBoardStagePrimaryAction(
      baseProvider({
        provider_debrief_engagement: {
          id: ENGAGEMENT_ID,
          status: "planned",
          debrief_completed: false,
          prepared_at: "2026-06-11T12:00:00Z",
        },
      }),
      "debrief",
    );
    expect(primary.label).toBe("Start Debrief");
    expect(primary.kind).toBe("debrief_start");
  });

  it("routes completed debrief without product fit to Advance to Evaluation", () => {
    const primary = deriveMissionBoardStagePrimaryAction(
      baseProvider({
        provider_debrief_engagement: {
          id: ENGAGEMENT_ID,
          status: "completed",
          debrief_completed: true,
        },
      }),
      "debrief",
    );
    expect(primary.label).toBe("Advance to Evaluation");
    expect(primary.kind).toBe("debrief_advance_pathway");
  });
});
