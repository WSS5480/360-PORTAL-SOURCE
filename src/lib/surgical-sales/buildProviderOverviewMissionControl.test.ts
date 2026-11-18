import { describe, expect, it } from "vitest";
import { buildProviderOverviewMissionControl } from "./buildProviderOverviewMissionControl";
import { buildProviderOverviewCommandSummary } from "./buildProviderOverviewCommandSummary";
import { resolveProviderCommercialWorkflowStage } from "./providerCommercialWorkflowStage";

describe("buildProviderOverviewMissionControl", () => {
  it("surfaces intro-call stakes and qualitative prep when upcoming", () => {
    const commercialStage = resolveProviderCommercialWorkflowStage({
      relationshipStage: "prospect",
      opportunities: [],
      cases: [],
      engagements: [],
    });
    const commandSummary = buildProviderOverviewCommandSummary({
      contact: { provider_relationship_stage: "prospect" },
      relationshipStage: "prospect",
      commercialStage,
      stageLabel: "Early discovery",
      recommendedNextStep: "Schedule intro call",
      tone: "warn",
      engagements: [],
      opportunities: [],
    });
    const contact = { provider_relationship_stage: "prospect" };

    const mission = buildProviderOverviewMissionControl({
      contact,
      engagements: [
        {
          id: "e1",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          title: "Intro call",
          status: "planned",
          status_label: "Scheduled",
          scheduled_at: "2026-06-01T14:00:00Z",
          pre_call_total: 5,
          pre_call_filled: 2,
          pre_call_complete: false,
          is_meeting_prepared: false,
          prepared_at: null,
          outcome_label: "",
        } as never,
      ],
      primaryAction: {
        label: "Schedule engagement",
        href: "/engagements/new",
        reason: "Schedule intro",
      },
      readinessIndicators: commandSummary.readinessIndicators,
      newEngagementHref: "/engagements/new",
    });

    expect(mission.hasUpcomingEngagement).toBe(true);
    expect(mission.whyThisMeetingMatters).toMatch(/OR observation/i);
    expect(mission.objective.length).toBeGreaterThan(20);
    expect(mission.missingPrep).toMatch(/pre-call/i);
    expect(mission.missingPrepTone).toBe("attention");
    expect(mission.missingPrep).not.toMatch(/\d+\/\d+/);
    expect(mission.primaryCta.label).toMatch(/prepare/i);
  });

  it("empty schedule uses dominant schedule CTA", () => {
    const commercialStage = resolveProviderCommercialWorkflowStage({
      relationshipStage: "prospect",
      opportunities: [],
      cases: [],
      engagements: [],
    });
    const commandSummary = buildProviderOverviewCommandSummary({
      contact: {},
      relationshipStage: "prospect",
      commercialStage,
      stageLabel: "Early discovery",
      recommendedNextStep: "Schedule intro",
      tone: "warn",
      engagements: [],
      opportunities: [],
    });

    const mission = buildProviderOverviewMissionControl({
      contact: {},
      engagements: [],
      primaryAction: { label: "Schedule engagement", href: "/new", reason: "" },
      readinessIndicators: commandSummary.readinessIndicators,
      newEngagementHref: "/new",
    });

    expect(mission.hasUpcomingEngagement).toBe(false);
    expect(mission.scheduleEngagementHref).toBe("/new");
  });
});
