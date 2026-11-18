import { describe, expect, it } from "vitest";
import { buildProviderOverviewMissionControlPanel } from "./buildProviderOverviewMissionControlPanel";
import {
  emptyProviderCommercialIntelligence,
} from "./providerCommercialIntelligenceModel";
import { OBSERVATION_PERMISSION_STAGE_LABELS } from "./observationPermissionModel";

describe("buildProviderOverviewMissionControlPanel", () => {
  it("discovery stage surfaces permission model, not gap-driven scheduler work", () => {
    const commercial = emptyProviderCommercialIntelligence();
    commercial.updated_at = "2026-06-01T00:00:00.000Z";
    commercial.observation.interest = "yes";
    commercial.observation.approval_status = "not_approved";
    commercial.observation.credentialing_required = "yes";
    commercial.credentialing.credentialing_required = "yes";
    commercial.scheduling.scheduler_identified = "partial";

    const panel = buildProviderOverviewMissionControlPanel({
      contact: {
        provider_commercial_intelligence: JSON.stringify(commercial),
        provider_observation_feasibility:
          "Observation interest: Yes. Observation approval: No.",
        provider_procedure_focus: "revisional bariatric",
        provider_case_volume_estimate: "increasing volume trend",
        provider_relationship_stage: "early_discovery",
      },
      providerId: "prov-1",
      newEngagementHref: "/portal/sales/providers/prov-1/engagements/new",
      engagements: [
        {
          id: "e-intro",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status: "completed",
          status_label: "Completed",
        } as never,
      ],
    });

    expect(panel.stageId).toBe("discovery");
    expect(panel.missionObjective).toBe("Get provider permission to observe");
    expect(panel.missionStatus.map((m) => m.label)).toEqual([
      OBSERVATION_PERMISSION_STAGE_LABELS.unknown,
      OBSERVATION_PERMISSION_STAGE_LABELS.interested,
      OBSERVATION_PERMISSION_STAGE_LABELS.permission_not_yet_confirmed,
      OBSERVATION_PERMISSION_STAGE_LABELS.permission_confirmed,
      OBSERVATION_PERMISSION_STAGE_LABELS.observation_scheduled,
      OBSERVATION_PERMISSION_STAGE_LABELS.observation_completed,
    ]);
    const activePermissionStep = panel.missionStatus.find((m) => m.state === "current");
    expect(activePermissionStep?.id).toMatch(/interested|permission_not_yet_confirmed/);
    expect(panel.missionStatus.find((m) => m.id === "unknown")?.state).toBe("complete");

    expect(panel.knownFacts.join(" ").toLowerCase()).toMatch(/permission requested/);
    expect(panel.knownFacts.some((f) => /credentialing/i.test(f))).toBe(false);
    expect(panel.knownFacts.some((f) => /scheduler/i.test(f))).toBe(false);

    expect(panel.optionalIntelligence.some((f) => /scheduler/i.test(f))).toBe(true);
    expect(panel.recommendedAction.label).toBe("Request Observation Approval");
    expect(panel.recommendedAction.label).not.toMatch(/identify scheduler/i);
  });

  it("does not recommend scheduler work when only optional context is missing", () => {
    const commercial = emptyProviderCommercialIntelligence();
    commercial.observation.interest = "yes";
    commercial.observation.approval_status = "approved";
    commercial.observation.access_status = "approved";

    const panel = buildProviderOverviewMissionControlPanel({
      contact: {
        provider_commercial_intelligence: JSON.stringify(commercial),
        provider_observation_feasibility: "approved",
        provider_relationship_pathway_stage_id: "observe",
      },
      providerId: "prov-2",
      newEngagementHref: "/new",
    });

    expect(panel.recommendedAction.label).not.toMatch(/scheduler|identify/i);
    expect(panel.knownFacts.join(" ").toLowerCase()).toMatch(/permission confirmed/);
  });
});
