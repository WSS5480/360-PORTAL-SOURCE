import { describe, expect, it } from "vitest";

import {
  buildDiscoveryProviderOverviewActions,
  DISCOVERY_OVERVIEW_PRIMARY_LABEL,
} from "./buildDiscoveryProviderOverviewActions";
import { PROVIDER_ACCESS_FOLLOW_UP_CTA } from "./providerObservationReadiness";
import { PROVIDER_OVERVIEW_CUSTOM_ACTION } from "./providerOverviewDiscoveryApprovalActions";
import { discoveryAccessReadyContact } from "./salesPathwayTestFixtures";
import { buildProviderEngagementWorkflowAction } from "./buildProviderEngagementWorkflowAction";

const NEW_ENG = "/portal/sales/engagements/new?provider_id=p1";

describe("buildDiscoveryProviderOverviewActions", () => {
  it("uses Start Intro Call when no intro is scheduled and observation is not approved", () => {
    const actions = buildDiscoveryProviderOverviewActions({
      engagements: [],
      workflow: null,
      briefingHref: "/briefing",
      newEngagementHref: NEW_ENG,
      contact: {},
    });

    expect(actions[0]?.label).toBe(DISCOVERY_OVERVIEW_PRIMARY_LABEL.startIntroCall);
    expect(actions[0]?.href).toContain("engagement_type=intro_call");
    expect(actions).toHaveLength(1);
    expect(
      actions.some(
        (action) => action.customAction === PROVIDER_OVERVIEW_CUSTOM_ACTION.openObservationApproval,
      ),
    ).toBe(false);
  });

  it("promotes briefing prep when intro call is scheduled", () => {
    const engagements = [
      {
        id: "e-intro",
        title: "Intro call",
        engagement_type: "intro_call",
        engagement_type_label: "Intro call",
        status: "planned",
        status_label: "Planned",
        scheduled_at: new Date().toISOString(),
        engagement_date: null,
        pre_call_filled: 0,
        pre_call_total: 2,
        pre_call_complete: false,
        briefing_status: "not_started",
        briefing_status_label: "Not started",
        planning_status: "not_started",
        planning_status_label: "Not started",
        outcome_label: "",
        updated_at: new Date().toISOString(),
      },
    ];
    const workflow = buildProviderEngagementWorkflowAction({
      engagements,
      briefingHref: "/briefing",
      fallbackAction: { label: "Start Intro Call", href: NEW_ENG, reason: "" },
    });

    const actions = buildDiscoveryProviderOverviewActions({
      engagements,
      workflow,
      briefingHref: "/briefing",
      newEngagementHref: NEW_ENG,
      contact: {},
    });

    expect(actions[0]?.label).toBe(DISCOVERY_OVERVIEW_PRIMARY_LABEL.continuePrep);
    expect(actions.some((action) => action.label === DISCOVERY_OVERVIEW_PRIMARY_LABEL.logOutcome)).toBe(true);
  });

  it("shows view briefing and record outcome for incomplete non-intro engagements", () => {
    const engagements = [
      {
        id: "e-or",
        title: "OR visit",
        engagement_type: "or_visit",
        engagement_type_label: "OR visit",
        status: "planned",
        status_label: "Planned",
        scheduled_at: new Date().toISOString(),
        engagement_date: null,
        pre_call_filled: 0,
        pre_call_total: 2,
        pre_call_complete: false,
        briefing_status: "not_started",
        briefing_status_label: "Not started",
        planning_status: "not_started",
        planning_status_label: "Not started",
        outcome_label: "",
        updated_at: new Date().toISOString(),
      },
    ];
    const workflow = buildProviderEngagementWorkflowAction({
      engagements,
      briefingHref: "/briefing",
      fallbackAction: { label: "Start Intro Call", href: NEW_ENG, reason: "" },
    });

    const actions = buildDiscoveryProviderOverviewActions({
      engagements,
      workflow,
      briefingHref: "/briefing",
      newEngagementHref: NEW_ENG,
      contact: discoveryAccessReadyContact(),
    });

    expect(actions.some((action) => action.label === DISCOVERY_OVERVIEW_PRIMARY_LABEL.openBriefing)).toBe(
      true,
    );
    expect(actions.some((action) => action.label === DISCOVERY_OVERVIEW_PRIMARY_LABEL.logOutcome)).toBe(true);
    expect(actions.some((action) => action.label === DISCOVERY_OVERVIEW_PRIMARY_LABEL.scheduleFirstObservation)).toBe(
      false,
    );
  });

  it("uses Start Access Follow-Up after completed intro without observation approval", () => {
    const engagements = [
      {
        id: "e-intro",
        engagement_type: "intro_call",
        status: "completed",
        engagement_type_label: "Intro call",
        status_label: "Completed",
        debrief_completed: true,
      },
    ] as import("./engagements/providerEngagementSummary").ProviderEngagementSummary[];

    const actions = buildDiscoveryProviderOverviewActions({
      engagements,
      workflow: null,
      briefingHref: "/briefing",
      newEngagementHref: NEW_ENG,
      contact: {
        provider_observation_feasibility: "interested",
        provider_observation_access_path:
          "Observation interest: Yes. Observation approval: No. Access path identified: Partial.",
        provider_scheduling_contact:
          "Jennifer in his office handles scheduling coordination with the hospital OR team.",
        provider_observation_credentialing_needed: "required",
      },
    });

    expect(actions[0]?.label).toBe(PROVIDER_ACCESS_FOLLOW_UP_CTA);
    expect(actions[0]?.href).toContain("engagement_type=follow_up");
    expect(actions.some((action) => action.label === DISCOVERY_OVERVIEW_PRIMARY_LABEL.startIntroCall)).toBe(
      false,
    );
  });

  it("Add First Observation Case opens observation case creation, not an or_visit engagement", () => {
    const actions = buildDiscoveryProviderOverviewActions({
      engagements: [],
      workflow: null,
      briefingHref: "/briefing",
      newEngagementHref: NEW_ENG,
      contact: discoveryAccessReadyContact(),
    });

    expect(actions[0]?.label).toBe(DISCOVERY_OVERVIEW_PRIMARY_LABEL.scheduleFirstObservation);
    expect(actions[0]?.href).toContain("/portal/sales/cases/new");
    expect(actions[0]?.href).toContain("case_type=observation");
    expect(actions[0]?.href).toContain("surgeon_contact_id=p1");
    expect(actions[0]?.href).not.toContain("engagement_type=or_visit");
    expect(
      actions.some(
        (action) => action.customAction === PROVIDER_OVERVIEW_CUSTOM_ACTION.openObservationApproval,
      ),
    ).toBe(false);
    expect(actions).toHaveLength(1);
  });
});
