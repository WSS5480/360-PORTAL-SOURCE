import { describe, expect, it } from "vitest";
import {
  buildProviderOverviewMissionPosture,
} from "./buildProviderOverviewMissionPosture";
import { emptyProviderCommercialIntelligence } from "./providerCommercialIntelligenceModel";

const emptyHero = {
  stageLabel: "Discovery",
  missionLine: "",
  tacticalSummary: "",
  nextMove: "",
  metrics: [],
  actions: [],
};

describe("buildProviderOverviewMissionPosture", () => {
  it("derives discovery-stage access follow-up posture from intelligence", () => {
    const commercial = emptyProviderCommercialIntelligence();
    commercial.updated_at = "2026-06-01T00:00:00.000Z";
    commercial.observation.interest = "yes";
    commercial.observation.approval_status = "not_approved";
    commercial.observation.access_status = "interested";
    commercial.observation.credentialing_required = "yes";
    commercial.credentialing.credentialing_required = "yes";
    commercial.credentialing.credentialing_platform_known = "no";
    commercial.scheduling.scheduler_identified = "yes";
    commercial.scheduling.scheduler_contact_linked = "yes";

    const posture = buildProviderOverviewMissionPosture({
      contact: {
        provider_commercial_intelligence: JSON.stringify(commercial),
        provider_observation_feasibility:
          "Observation interest: Yes. Observation approval: No. Access path identified: Partial.",
        provider_relationship_stage: "early_discovery",
      },
      providerId: "prov-1",
      newEngagementHref: "/portal/sales/providers/prov-1/engagements/new",
      currentGoal: "Secure observation approval",
      nextBestAction: { label: "Schedule Intro Call", detail: "", href: "/x" },
      hero: emptyHero,
      engagements: [
        {
          id: "e-intro",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status: "completed",
          status_label: "Completed",
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          briefing_status: "reviewed",
          briefing_status_label: "Reviewed",
          planning_status: "reviewed",
          planning_status_label: "Reviewed",
          outcome_label: "Completed",
        },
      ],
    });

    expect(posture.stageId).toBe("discovery");
    expect(posture.nextEngagement).toMatch(/request observation approval|access follow-up/i);
    expect(posture.currentObjective).toMatch(/permission to observe|observation access/i);
    expect(posture.briefingStatus.lines.join(" ").toLowerCase()).toMatch(/interested/);
    expect(posture.briefingStatus.lines.length).toBeGreaterThanOrEqual(2);
    expect(posture.primaryCta?.label).toBe("Request Observation Approval");
  });

  it("derives observation-stage posture when case is scheduled", () => {
    const commercial = emptyProviderCommercialIntelligence();
    commercial.updated_at = "2026-06-01T00:00:00.000Z";
    commercial.observation.interest = "yes";
    commercial.observation.approval_status = "approved";
    commercial.observation.access_status = "approved";
    commercial.observation.readiness = "ready";
    commercial.observation.credentialing_required = "no";

    const posture = buildProviderOverviewMissionPosture({
      contact: {
        provider_commercial_intelligence: JSON.stringify(commercial),
        provider_observation_feasibility: "yes",
        provider_relationship_stage: "observation",
        provider_relationship_pathway_stage_id: "observe",
      },
      providerId: "prov-2",
      newEngagementHref: "/portal/sales/providers/prov-2/engagements/new",
      currentGoal: "Capture workflow intelligence",
      nextBestAction: { label: "Open Briefing", detail: "", href: "/x" },
      hero: emptyHero,
      cases: [
        {
          id: "case-obs",
          case_type: "observation",
          status: "scheduled",
        },
      ],
    });

    expect(posture.nextEngagement).toMatch(/case observation/i);
    expect(posture.currentObjective.toLowerCase()).toMatch(/workflow|observation|schedule/);
    expect(posture.briefingStatus.lines.join(" ").toLowerCase()).toMatch(/approved/);
    expect(posture.primaryCta?.label).toBe("Open Next Observation");
    expect(posture.primaryCta?.href).toContain("case-obs");
  });

  it("derives debrief-stage posture for completed observation touch", () => {
    const posture = buildProviderOverviewMissionPosture({
      contact: {
        provider_relationship_stage: "debrief",
        provider_relationship_pathway_stage_id: "debrief",
        provider_observation_feasibility: "yes",
      },
      providerId: "prov-3",
      newEngagementHref: "/portal/sales/providers/prov-3/engagements/new",
      currentGoal: "Validate clinical opportunities",
      nextBestAction: { label: "Debrief", detail: "", href: "/x" },
      hero: emptyHero,
      engagements: [
        {
          id: "e-debrief",
          engagement_type: "or_visit",
          engagement_type_label: "OR visit",
          status: "completed",
          status_label: "Completed",
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          briefing_status: "reviewed",
          briefing_status_label: "Reviewed",
          planning_status: "reviewed",
          planning_status_label: "Reviewed",
          outcome_label: "Completed",
        },
      ],
      activeEngagement: {
        id: "e-debrief",
        engagement_type: "or_visit",
        engagement_type_label: "OR visit",
        status: "completed",
        status_label: "Completed",
        pre_call_filled: 0,
        pre_call_total: 0,
        pre_call_complete: false,
        briefing_status: "reviewed",
        briefing_status_label: "Reviewed",
        planning_status: "reviewed",
        planning_status_label: "Reviewed",
        outcome_label: "Completed",
      },
    });

    expect(posture.stageId).toBe("debrief");
    expect(posture.nextEngagement).toBe("Case Observation");
    expect(posture.currentObjective.toLowerCase()).toMatch(/clinical|validate|debrief|observation/);
    expect(posture.primaryCta?.label).toBe("Start Debrief");
  });
});
