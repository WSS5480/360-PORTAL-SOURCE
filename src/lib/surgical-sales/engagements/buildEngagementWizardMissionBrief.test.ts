import { describe, expect, it } from "vitest";
import {
  buildEngagementWizardMissionBrief,
  buildEngagementWizardReviewReadiness,
  MISSION_BRIEF_SECTION_TITLE,
} from "./buildEngagementWizardMissionBrief";
import { compressObjectiveToTacticalBullets } from "./missionBriefReviewPresentation";
import { assessEngagementWizardPrepReadiness } from "./engagementWizardPrepReadiness";

describe("buildEngagementWizardMissionBrief", () => {
  it("structures prep into operational briefing sections with tactical discovery and pathway impact", () => {
    const brief = buildEngagementWizardMissionBrief({
      draft: {
        observation_goal:
          "Confirm observation openness. Map workflow friction before first case look.",
        pre_observation_probes:
          "Who owns scheduling?\nWhere does workflow create friction?\nWhat cases are ideal for first look?",
        pre_observation_tools_resources: "Vendor clearance path unknown",
        pre_observation_planned_close: "Agree on follow-up observation window.\nCoordinator path identified.",
        next_action: "Schedule observation request",
      },
      isStrategic: true,
      isOfficeVisit: false,
      playbookName: "Generic intro",
    });

    expect(brief.sections.map((s) => s.id)).toContain("pathwayImpact");
    expect(brief.sections.map((s) => s.id)).toContain("unknownsRemaining");

    const objective = brief.sections.find((s) => s.id === "objective");
    expect(objective?.items.length).toBeGreaterThan(0);
    expect(objective?.items.some((i) => /observation|workflow/i.test(i.text))).toBe(true);

    const discovery = brief.sections.find((s) => s.id === "discoveryTargets");
    const workflowGroup = discovery?.groups?.find(
      (g) => g.title === MISSION_BRIEF_SECTION_TITLE.workflowDiscovery,
    );
    expect(workflowGroup?.items.some((i) => /workflow friction|procedure/i.test(i.text))).toBe(true);
    expect(workflowGroup?.items.every((i) => i.text.length < 80)).toBe(true);

    const outcome = brief.sections.find((s) => s.id === "expectedOutcome");
    expect(outcome?.subtitle).toMatch(/success/i);

    const next = brief.sections.find((s) => s.id === "nextStep");
    expect(next?.subtitle).toMatch(/after/i);
    expect(next?.items[0]?.text).toMatch(/observation request/i);
    expect(next?.items[0]?.suggested).toBeFalsy();
  });

  it("compresses long objective narrative into tactical bullets", () => {
    const bullets = compressObjectiveToTacticalBullets(
      "Confirm observation access. Validate workflow fit. Identify scheduling ownership.",
    );
    expect(bullets.length).toBeGreaterThanOrEqual(2);
    expect(bullets.every((b) => b.text.length <= 80)).toBe(true);
  });

  it("maps readiness into operational checklist labels and notes", () => {
    const readiness = assessEngagementWizardPrepReadiness({
      isStrategic: true,
      engagementType: "intro_call",
      workflowDraft: {
        observation_goal: "Map workflow and observation access path for first look.",
        pre_observation_probes: "Who owns scheduling for robotic cases?",
        pre_observation_impact_opening_statement: "Reference prior facility work.",
      },
      basicsProductLine: "generic",
      suggestContext: { productLine: "generic" },
    });

    const display = buildEngagementWizardReviewReadiness({
      readiness,
      draft: {
        observation_goal: "Map workflow and observation access path for first look.",
        pre_observation_probes: "Who owns scheduling for robotic cases?",
        pre_observation_impact_opening_statement: "Reference prior facility work.",
        next_action: "Schedule observation",
      },
      isStrategic: true,
    });

    expect(display.metItems).toContain("Objective defined");
    expect(display.metItems).toContain("Follow-up path planned");
    expect(display.operationalNotes.length).toBeGreaterThan(0);
  });
});
