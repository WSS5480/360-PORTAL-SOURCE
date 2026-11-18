import { describe, expect, it } from "vitest";

import {

  buildProviderOverviewMissionQuickActions,

  shouldSuggestScheduleIntroCallQuickAction,

} from "./buildProviderOverviewMissionQuickActions";

import { buildProviderOverviewMissionCardView } from "./buildProviderOverviewMissionCardView";



describe("buildProviderOverviewMissionQuickActions", () => {

  const baseInput = {

    intelligenceHref: "/portal/sales/providers/p1?tab=intelligence",

    newEngagementHref: "/portal/sales/engagements/new?provider_id=p1",

    providerId: "p1",

    contact: {},

    stageId: "discovery" as const,

  };



  it("promotes schedule intro call next to update permission for brand-new providers", () => {
    expect(
      shouldSuggestScheduleIntroCallQuickAction({
        contact: {},
        engagements: [],
        stageId: "discovery",
      }),
    ).toBe(true);

    const card = buildProviderOverviewMissionCardView({
      contact: {},
      providerId: "p1",
      stageId: "discovery",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=p1",
      noteHref: "/note",
      intelligenceHref: "/portal/sales/providers/p1?tab=intelligence",
      engagements: [],
    });

    expect(card.primary.label).toBe("Update Permission Status");
    expect(card.secondary?.label).toBe("Schedule intro call");
    expect(card.secondary?.href).toContain("engagement_type=intro_call");
    expect(card.quickActions.some((action) => action.id === "schedule_intro_call")).toBe(false);
  });



  it("hides schedule intro call once the intro engagement is planned", () => {
    expect(
      shouldSuggestScheduleIntroCallQuickAction({
        contact: {},
        engagements: [{ id: "e1", engagement_type: "intro_call", status: "scheduled" } as never],
        stageId: "discovery",
      }),
    ).toBe(false);

    const card = buildProviderOverviewMissionCardView({
      contact: {},
      providerId: "p1",
      stageId: "discovery",
      newEngagementHref: "/portal/sales/engagements/new?provider_id=p1",
      noteHref: "/note",
      intelligenceHref: "/intel",
      engagements: [{ id: "e1", engagement_type: "intro_call", status: "scheduled" } as never],
    });

    expect(card.secondary).toBeUndefined();
    expect(card.quickActions.some((action) => action.id === "schedule_intro_call")).toBe(false);
  });



  it("hides schedule intro call after intro is completed", () => {

    expect(

      shouldSuggestScheduleIntroCallQuickAction({

        contact: {},

        engagements: [{ id: "e1", engagement_type: "intro_call", status: "completed" } as never],

        stageId: "discovery",

      }),

    ).toBe(false);

  });



  it("hides schedule intro call outside discovery stage", () => {

    expect(

      shouldSuggestScheduleIntroCallQuickAction({

        contact: {},

        engagements: [],

        stageId: "observe",

      }),

    ).toBe(false);



    const card = buildProviderOverviewMissionCardView({

      contact: {},

      providerId: "p-new",

      stageId: "observe",

      newEngagementHref: "/eng",

      noteHref: "/note",

      intelligenceHref: "/intel",

      engagements: [],

    });

    expect(card.quickActions.some((action) => action.id === "schedule_intro_call")).toBe(false);

  });



  it("shows contextual execution actions after observation approval", () => {
    const drAppleContact = {
      provider_observation_feasibility: "approved",
      provider_observation_credentialing_needed: "required",
      provider_credentialing_status: "Vendor credentialing required before OR access",
      provider_observation_coordinator_contact: "Karen — contact info missing",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          lifecycle_state: "validated",
          validated_at: "2026-06-01T00:00:00Z",
        },
      },
    };

    const actions = buildProviderOverviewMissionQuickActions({
      ...baseInput,
      contact: drAppleContact,
    });

    const labels = actions.map((action) => action.label);

    expect(labels).not.toContain("Update Permission");
    expect(labels).toContain("Field note");
    expect(labels).toContain("Add Observation Case");
    expect(labels).toContain("Update Scheduler Contact");
    expect(labels).toContain("Add Credentialing Note");
  });
});


