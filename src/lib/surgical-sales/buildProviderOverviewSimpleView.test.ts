import { describe, expect, it } from "vitest";

import { buildProviderOverviewNarrative } from "./buildProviderOverviewNarrative";

import { buildProviderOverviewSimpleView } from "./buildProviderOverviewSimpleView";



describe("buildProviderOverviewSimpleView", () => {

  it("returns strategic overview fields without tactical bullets", () => {

    const narrative = buildProviderOverviewNarrative({

      providerId: "prov-1",

      contact: {

        provider_observation_access_path: "",

        provider_relationship_stage: "prospect",

      },

      relationshipStage: "prospect",

      engagements: [],

      newEngagementHref: "/engagements/new",

      newCaseHref: "/cases/new",

      intelligenceHref: "/providers/prov-1?tab=intelligence",

      createOpportunityHref: "/opportunities/new",

    });



    const view = buildProviderOverviewSimpleView({

      narrative,

      contact: { provider_relationship_stage: "prospect" },

      providerId: "prov-1",

      intelligenceHref: "/providers/prov-1?tab=intelligence",

      briefingHref: "/providers/prov-1?tab=briefing",

      newEngagementHref: "/engagements/new",

      activityHref: "/providers/prov-1?tab=activity",

    });



    expect(view.stageLabel).toBe("Early discovery");

    expect(view.statusLabel).toBeTruthy();

    expect(view.intelligenceDensity).toBe("sparse");
    expect(view.visibilityLabel).toBe("Visibility developing");
    expect(view.tactical.header.statusPill).toBeTruthy();
    expect(view.operationalMemory.lines).toHaveLength(4);
    expect(view.tactical.fieldSignalGroups.length).toBeGreaterThan(0);
    expect(view.tactical.fieldSignals.length).toBeGreaterThan(0);
    expect(
      view.tactical.fieldSignals.some((s) => s.severity === "attention" && s.sectionId),
    ).toBe(true);
    expect(view.recommendedActionLine.length).toBeGreaterThan(10);
    expect(view.operationalReadinessLabel).toBe("Visibility developing");
    expect(view.deploymentReadiness.visibilityStateLabel).toBeTruthy();
    expect(view.deploymentReadiness.becauseKicker).toBe("Discovery progress");
    expect(view.operationalSnapshot.groups.length).toBeGreaterThanOrEqual(2);
    expect(view.operationalSnapshot.groups.some((g) => g.id === "facility")).toBe(true);
    expect(
      view.operationalSnapshot.groups
        .flatMap((g) => g.insights)
        .some((i) => i.confidenceLabel || i.contextHint),
    ).toBe(true);
    expect(view.operationalSnapshot.facilitySignals.length).toBeLessThanOrEqual(3);
    expect(view.operationalSnapshot.providerSignals.length).toBeLessThanOrEqual(3);
    expect(view.tacticalSummary).toMatch(/early discovery/i);
    expect(view.strategicWarnings).toEqual([]);

    expect(view.tacticalSummary.length).toBeGreaterThan(0);

    expect(view.recommendedNextAction.ctaLabel.length).toBeGreaterThan(0);

    expect(view.deploymentReadiness.label).toBeTruthy();

    expect(view.investFieldTime.answer).toBeTruthy();

    expect(view.blocker.ctaLabel.length).toBeGreaterThan(0);

    expect(view.recommendedNextAction.headline.length).toBeGreaterThan(0);

    expect(view.briefingHref).toContain("tab=briefing");

    expect("intelligenceBullets" in view).toBe(false);

  });

  it("prioritizes in-progress engagement workflow over intelligence blocker in hero CTA", () => {
    const narrative = buildProviderOverviewNarrative({
      providerId: "prov-1",
      contact: {
        provider_observation_coordinator_contact: "",
        provider_relationship_stage: "active_evaluation",
      },
      relationshipStage: "active_evaluation",
      engagements: [
        {
          id: "eng-active",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status: "in_progress",
          status_label: "In progress",
          title: "Intro with Dr. Lee",
          pre_call_filled: 2,
          pre_call_total: 4,
          pre_call_complete: false,
          outcome_label: "In progress",
        },
      ],
      newEngagementHref: "/engagements/new",
      newCaseHref: "/cases/new",
      intelligenceHref: "/providers/prov-1?tab=intelligence",
      createOpportunityHref: "/opportunities/new",
    });

    const view = buildProviderOverviewSimpleView({
      narrative,
      contact: { provider_observation_coordinator_contact: "" },
      providerId: "prov-1",
      intelligenceHref: "/providers/prov-1?tab=intelligence",
      briefingHref: "/providers/prov-1?tab=briefing",
      newEngagementHref: "/engagements/new",
      activityHref: "/providers/prov-1?tab=activity",
      engagements: [
        {
          id: "eng-active",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status: "in_progress",
          status_label: "In progress",
          title: "Intro with Dr. Lee",
          pre_call_filled: 2,
          pre_call_total: 4,
          pre_call_complete: false,
          outcome_label: "In progress",
        },
      ],
    });

    expect(view.currentWorkflowAction?.phase).toBe("in_progress");
    expect(view.recommendedNextAction.ctaLabel).toBe("Debrief touchpoint");
    expect(view.recommendedNextAction.ctaHref).toContain("panel=debrief");
    expect(view.tacticalSummary).toMatch(/in progress/i);
    expect(view.blocker.ctaLabel).not.toBe("Debrief intro call");
    expect(view.recommendedNextAction.ctaLabel).not.toBe(view.blocker.ctaLabel);
  });

});

