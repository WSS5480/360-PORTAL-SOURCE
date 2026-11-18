import { describe, expect, it } from "vitest";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { deriveMissionBoardStagePrimaryAction } from "./deriveMissionBoardCardActions";
import { buildGenericProviderDebriefPlan } from "./engagements/buildGenericProviderDebriefPlan";
import { buildProviderDebriefPlan } from "./engagements/buildProviderDebriefPlan";
import {
  JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
  JOHN_APPLE_CURRENT_ACTIVITIES,
  JOHN_APPLE_CURRENT_CASE,
  JOHN_APPLE_PRIOR_COMPLETED_CASES,
  JOHN_APPLE_PROVIDER_CONTACT,
} from "./engagements/johnAppleCommercialReadiness.fixture";
import { buildEngagementPrepareForMeetingHref } from "./engagements/engagementCreateWizard";
import { buildEngagementActiveHref } from "./engagements/engagementLifecycle";
import { providerHasActiveDebriefEngagement } from "./missionBoardDebriefEngagement";
import {
  buildMissionBoardDebriefLauncherView,
  buildMissionBoardDebriefLauncherEngagement,
  resolveMissionBoardDebriefPrimaryActionLabel,
} from "./missionBoardDebriefLauncherView";
import { summarizeMissionBoardDebriefLauncherIntelligence } from "./missionBoardDebriefLauncherIntelligence";
import {
  MISSION_BOARD_DEBRIEF_CREATE_LABEL,
  MISSION_BOARD_DEBRIEF_DICTATE_COMPLETE_LABEL,
  MISSION_BOARD_DEBRIEF_RESUME_LABEL,
  MISSION_BOARD_DEBRIEF_START_LABEL,
} from "./missionBoardDebriefLauncherUx";
import { MISSION_BOARD_DEBRIEF_REVIEW_LABEL } from "./missionBoardDebriefComplete";

function buildJohnAppleDebriefPlan() {
  return buildProviderDebriefPlan({
    caseRow: JOHN_APPLE_CURRENT_CASE,
    activities: JOHN_APPLE_CURRENT_ACTIVITIES,
    providerName: "Tim Apples",
    priorObservationCases: JOHN_APPLE_PRIOR_COMPLETED_CASES,
    providerContact: JOHN_APPLE_PROVIDER_CONTACT,
  });
}

function buildJohnAppleObservationIntelligence() {
  return {
    caseRow: JOHN_APPLE_CURRENT_CASE,
    activities: JOHN_APPLE_CURRENT_ACTIVITIES,
    priorCases: JOHN_APPLE_PRIOR_COMPLETED_CASES,
    providerContact: JOHN_APPLE_PROVIDER_CONTACT,
  };
}

function baseProvider(overrides: Partial<ProviderDirectoryRow> = {}): ProviderDirectoryRow {
  return {
    id: "p1",
    specialty: "Orthopedics",
    primary_organization_name: "Test Hospital",
    primary_organization_id: "org-1",
    organization_count: 1,
    additional_organizations_count: 0,
    territory: "TX",
    planning_status: "not_started",
    linked_opportunities_count: 0,
    recent_case_count: 0,
    last_activity_at: null,
    relationship_pathway_stage_id: "debrief",
    ...overrides,
  };
}

describe("buildMissionBoardDebriefLauncherView", () => {
  it("summarizes generic plan when provider has no observations", () => {
    const plan = buildGenericProviderDebriefPlan({
      providerId: "p1",
      providerName: "Dr. Apple",
      facilityName: "Test Hospital",
      completedObservationCount: 0,
    });

    const view = buildMissionBoardDebriefLauncherView({
      providerName: "Dr. Apple",
      organizationName: "Test Hospital",
      plan,
      completedObservationCount: 0,
      existingEngagement: null,
    });

    expect(view.objective.length).toBeGreaterThan(20);
    expect(view.whatWeKnow).toHaveLength(1);
    expect(view.whatWeKnow[0]).toMatch(/no validated observation findings/i);
    expect(view.biggestUnknown).toBeTruthy();
    expect(view.suggestedOpeningQuestion).toBeTruthy();
    expect(view.existingEngagement).toBeNull();
  });

  it("summarizes partial observation history with one completed case", () => {
    const plan = buildGenericProviderDebriefPlan({
      providerId: "p1",
      providerName: "Dr. Apple",
      facilityName: "Test Hospital",
      completedObservationCount: 1,
    });

    const view = buildMissionBoardDebriefLauncherView({
      providerName: "Dr. Apple",
      organizationName: "Test Hospital",
      plan,
      completedObservationCount: 1,
      existingEngagement: null,
    });

    expect(view.whatWeKnow[0]).toMatch(/observation notes exist|prepare full briefing/i);
    expect(view.biggestUnknown).toBeTruthy();
    expect(view.completedObservationCount).toBe(1);
  });

  it("shows top validated findings from intelligence-rich plan", () => {
    const plan = buildProviderDebriefPlan({
      caseRow: {
        id: "case-1",
        live_observation_clinical_pain_points: "Visualization delay before fixation",
        observation_key_questions: "Does extra setup time matter?",
      },
      activities: [
        {
          id: "n1",
          activity_type: "note",
          body: "Bard mesh observed during takedown. Staff workflow appeared organized.",
          created_at: "2026-05-01T12:00:00.000Z",
        },
      ],
    });

    const view = buildMissionBoardDebriefLauncherView({
      providerName: "Dr. Apple",
      organizationName: "Test Hospital",
      plan,
      completedObservationCount: 5,
      existingEngagement: null,
    });

    expect(view.whatWeKnow.length).toBeGreaterThan(0);
    expect(view.whatWeKnow.length).toBeLessThanOrEqual(5);
    expect(view.biggestUnknown).toBeTruthy();
    expect(view.suggestedOpeningQuestion).toBeTruthy();
    expect(view.completedObservationCount).toBe(5);
  });

  it("prioritizes repeated visualization workflow over product identification for John Apple", () => {
    const summary = summarizeMissionBoardDebriefLauncherIntelligence({
      plan: buildJohnAppleDebriefPlan(),
      providerName: "Tim Apples",
      completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
      observationIntelligence: buildJohnAppleObservationIntelligence(),
    });

    expect(summary.objective).toMatch(/visualization time before fixation/i);
    expect(summary.objective).toMatch(/meaningful workflow issue worth acting on/i);
    expect(summary.objective).not.toMatch(/which products|trays were actually used/i);

    expect(summary.whatWeKnow.some((line) => /Bard Mesh observed/i.test(line))).toBe(true);
    expect(summary.whatWeKnow.some((line) => /visualization time before fixation/i.test(line))).toBe(true);
    expect(summary.whatWeKnow.some((line) => /staff workflow appeared organized/i.test(line))).toBe(true);
    expect(summary.whatWeKnow.some((line) => /no staff complaints confirmed yet/i.test(line))).toBe(true);

    expect(summary.biggestUnknown).toMatch(/Dr\. Apples/i);
    expect(summary.biggestUnknown).toMatch(/visualization time/i);
    expect(summary.biggestUnknown).not.toMatch(/which products|trays were actually used/i);

    expect(summary.suggestedOpeningQuestion).toMatch(/visualization before fixation/i);
    expect(summary.suggestedOpeningQuestion).toMatch(/routine|workflow friction/i);
  });

  it("suppresses product-unknown questions when Bard Mesh is already known", () => {
    const summary = summarizeMissionBoardDebriefLauncherIntelligence({
      plan: buildJohnAppleDebriefPlan(),
      providerName: "Tim Apples",
      completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
      observationIntelligence: buildJohnAppleObservationIntelligence(),
    });

    expect(summary.whatWeKnow.some((line) => /Bard Mesh observed/i.test(line))).toBe(true);
    expect(summary.biggestUnknown).not.toMatch(/products or trays/i);
    expect(summary.suggestedOpeningQuestion).not.toMatch(/products or trays/i);
  });

  it("does not surface raw source strings or still-needed leakage in launcher facts", () => {
    const summary = summarizeMissionBoardDebriefLauncherIntelligence({
      plan: buildJohnAppleDebriefPlan(),
      providerName: "Tim Apples",
      completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
      observationIntelligence: buildJohnAppleObservationIntelligence(),
    });

    const blob = JSON.stringify(summary);
    expect(blob).not.toMatch(/source:/i);
    expect(blob).not.toMatch(/still needed:/i);
    expect(blob).not.toMatch(/validate in field intelligence/i);
    expect(summary.whatWeKnow.every((line) => !/source:/i.test(line))).toBe(true);
  });

  it("uses a conversational opening question tied to the strongest workflow pattern", () => {
    const summary = summarizeMissionBoardDebriefLauncherIntelligence({
      plan: buildJohnAppleDebriefPlan(),
      providerName: "Tim Apples",
      completedObservationCount: JOHN_APPLE_COMPLETED_OBSERVATION_COUNT,
      observationIntelligence: buildJohnAppleObservationIntelligence(),
    });

    expect(summary.suggestedOpeningQuestion).toMatch(/^During these cases, we noticed/i);
    expect(summary.suggestedOpeningQuestion).toMatch(/visualization before fixation/i);
    expect(summary.suggestedOpeningQuestion).toMatch(/\?$/);
  });

  it("uses resume label when an in-progress debrief engagement exists", () => {
    const plan = buildGenericProviderDebriefPlan({
      providerId: "p1",
      providerName: "Dr. Apple",
      facilityName: null,
      completedObservationCount: 2,
    });
    const engagementId = "eng-debrief-1";

    const view = buildMissionBoardDebriefLauncherView({
      providerName: "Dr. Apple",
      organizationName: null,
      plan,
      completedObservationCount: 2,
      existingEngagement: {
        engagementId,
        status: "in_progress",
        prepareHref: buildEngagementPrepareForMeetingHref(engagementId),
        activeHref: buildEngagementActiveHref(engagementId),
        debriefReviewHref: `/portal/sales/engagements/${engagementId}/debrief`,
        resume: true,
        canQuickComplete: true,
        isDebriefComplete: false,
        primaryActionLabel: MISSION_BOARD_DEBRIEF_RESUME_LABEL,
      },
    });

    expect(view.existingEngagement?.primaryActionLabel).toBe(MISSION_BOARD_DEBRIEF_RESUME_LABEL);
    expect(view.existingEngagement?.prepareHref).toContain("/prepare");
    expect(view.existingEngagement?.activeHref).toContain("/active");
  });
});

describe("resolveMissionBoardDebriefPrimaryActionLabel", () => {
  it("returns Start Debrief for new engagements", () => {
    expect(
      resolveMissionBoardDebriefPrimaryActionLabel({
        hasExistingEngagement: false,
      }),
    ).toBe(MISSION_BOARD_DEBRIEF_START_LABEL);
  });

  it("returns Resume Debrief for in-progress engagements", () => {
    expect(
      resolveMissionBoardDebriefPrimaryActionLabel({
        hasExistingEngagement: true,
        engagementStatus: "in_progress",
      }),
    ).toBe(MISSION_BOARD_DEBRIEF_RESUME_LABEL);
  });
});

describe("deriveMissionBoardStagePrimaryAction debrief lifecycle", () => {
  it("routes debrief stage through fast_debrief with Schedule Debrief label", () => {
    const primary = deriveMissionBoardStagePrimaryAction(baseProvider(), "debrief");

    expect(primary.kind).toBe("fast_debrief");
    expect(primary.label).toBe(MISSION_BOARD_DEBRIEF_CREATE_LABEL);
  });

  it("shows Start Debrief when a scheduled debrief engagement exists", () => {
    const primary = deriveMissionBoardStagePrimaryAction(
      baseProvider({
        provider_debrief_engagement: {
          id: "eng-1",
          status: "planned",
          debrief_completed: false,
        },
      }),
      "debrief",
    );

    expect(primary.kind).toBe("debrief_start");
    expect(primary.label).toBe("Start Debrief");
    expect(primary.href).toContain("/active");
  });

  it("shows Resume Debrief when debrief engagement is in progress", () => {
    const primary = deriveMissionBoardStagePrimaryAction(
      baseProvider({
        provider_debrief_engagement: {
          id: "eng-1",
          status: "in_progress",
          debrief_completed: false,
        },
      }),
      "debrief",
    );

    expect(primary.kind).toBe("link");
    expect(primary.label).toBe(MISSION_BOARD_DEBRIEF_RESUME_LABEL);
    expect(primary.href).toContain("/active");
  });

  it("shows Review Debrief when debrief engagement is completed", () => {
    const primary = deriveMissionBoardStagePrimaryAction(
      baseProvider({
        provider_debrief_engagement: {
          id: "eng-1",
          status: "completed",
          debrief_completed: true,
        },
      }),
      "debrief",
    );

    expect(primary.kind).toBe("link");
    expect(primary.label).toBe(MISSION_BOARD_DEBRIEF_REVIEW_LABEL);
  });

  it("shows Complete Debrief when engagement is completed but notes are pending", () => {
    const primary = deriveMissionBoardStagePrimaryAction(
      baseProvider({
        provider_debrief_engagement: {
          id: "eng-1",
          status: "completed",
          debrief_completed: false,
        },
      }),
      "debrief",
    );

    expect(primary.label).toBe("Complete Debrief");
    expect(primary.href).toContain("/debrief");
  });
});

describe("providerHasActiveDebriefEngagement", () => {
  it("detects active provider debrief engagements on directory rows", () => {
    expect(
      providerHasActiveDebriefEngagement({
        provider_debrief_engagement: {
          id: "eng-1",
          status: "planned",
          debrief_completed: false,
        },
      }),
    ).toBe(true);

    expect(
      providerHasActiveDebriefEngagement({
        provider_debrief_engagement: {
          id: "eng-1",
          status: "completed",
          debrief_completed: true,
        },
      }),
    ).toBe(false);
  });
});

describe("MissionBoardDebriefLauncherEngagement flags", () => {
  it("marks in_progress debrief as quick-complete eligible", () => {
    const view = buildMissionBoardDebriefLauncherView({
      providerName: "Dr. Apple",
      organizationName: null,
      plan: buildGenericProviderDebriefPlan({
        providerId: "p1",
        providerName: "Dr. Apple",
        facilityName: null,
        completedObservationCount: 2,
      }),
      completedObservationCount: 2,
      existingEngagement: buildMissionBoardDebriefLauncherEngagement({
        debrief: { id: "eng-debrief-1", status: "in_progress", debrief_completed: false },
      }),
    });

    expect(view.existingEngagement?.canQuickComplete).toBe(true);
    expect(view.existingEngagement?.isDebriefComplete).toBe(false);
  });

  it("marks planned debrief as not quick-complete eligible", () => {
    const view = buildMissionBoardDebriefLauncherView({
      providerName: "Dr. Apple",
      organizationName: null,
      plan: buildGenericProviderDebriefPlan({
        providerId: "p1",
        providerName: "Dr. Apple",
        facilityName: null,
        completedObservationCount: 2,
      }),
      completedObservationCount: 2,
      existingEngagement: buildMissionBoardDebriefLauncherEngagement({
        debrief: { id: "eng-debrief-1", status: "planned", debrief_completed: false },
      }),
    });

    expect(view.existingEngagement?.canQuickComplete).toBe(false);
  });
});
