import { describe, expect, it } from "vitest";



import { buildProviderAccountUnderstandingView } from "./buildProviderAccountUnderstandingView";

import { buildProviderPlanningCompletion } from "./providerPlanningCompletion";

import {

  ACCOUNT_UNDERSTANDING_CARD,

  ACCOUNT_UNDERSTANDING_CONFIRM_AREA_ORDER,

} from "./providerAccountUnderstanding";



describe("buildProviderAccountUnderstandingView", () => {

  it("returns operational intelligence cards with synthesized fields", () => {

    const contact = {

      provider_relationship_stage: "prospect",

      provider_procedure_focus: "TKA",

      provider_or_team_dynamics: "",

      provider_credentialing_status: "",

      provider_current_vendors: "",

    };

    const planning = buildProviderPlanningCompletion(contact);



    const view = buildProviderAccountUnderstandingView({ contact, planning });

    expect(view).not.toBeNull();

    expect(view!.confirmCards).toHaveLength(ACCOUNT_UNDERSTANDING_CONFIRM_AREA_ORDER.length);

    expect(view!.workspaceSynthesis).toHaveLength(5);



    for (const card of view!.confirmCards) {

      expect(card.known.length).toBeGreaterThan(2);

      expect(card.unknown.length).toBeGreaterThan(5);

      expect(card.operationalRisk.length).toBeGreaterThan(10);

      expect(card.tacticalImplication.length).toBeGreaterThan(10);

      expect(card.bestNextAction.length).toBeGreaterThan(2);

      expect(card.confidenceLabel.length).toBeGreaterThan(3);

      expect(["Resolve unknowns", "Continue mapping", "Update operational intelligence"]).toContain(
        card.captureLabel,
      );

    }



    const operational = view!.confirmCards.find((c) => c.areaId === "operational");

    expect(operational?.sectionTitle).toBe("OR access & workflow");

  });



  it("builds workspace synthesis answering operational questions", () => {

    const contact = {

      provider_relationship_stage: "prospect",

      provider_observation_feasibility: "allowed",

      provider_procedure_focus: "laparoscopic hernia",

      provider_communication_style: "neutral",

    };

    const planning = buildProviderPlanningCompletion(contact);



    const view = buildProviderAccountUnderstandingView({

      contact,

      planning,

      engagements: [

        {

          id: "e1",

          engagement_type: "intro_call",

          engagement_type_label: "Intro call",

          status: "planned",

          status_label: "Planned",

          pre_call_filled: 0,

          pre_call_total: 0,

          pre_call_complete: false,

          outcome_label: "",

        },

      ],

    });



    const ids = view!.workspaceSynthesis.map((r) => r.id);

    expect(ids).toEqual(["operate", "decisions", "blockers", "missing", "tactical"]);

    expect(view!.workspaceSynthesis.find((r) => r.id === "operate")?.line.length).toBeGreaterThan(10);

  });



  it("does not bundle multiple unknowns into one operational card", () => {

    const contact = {

      provider_relationship_stage: "prospect",

      provider_procedure_focus: "TKA",

      provider_or_team_dynamics: "",

      provider_credentialing_status: "",

      provider_current_vendors: "",

    };

    const planning = buildProviderPlanningCompletion(contact);

    const view = buildProviderAccountUnderstandingView({ contact, planning });



    const operational = view!.areas.find((a) => a.id === "operational");

    expect(operational?.needsValidationSummary).not.toMatch(/ and /);

    expect(view!.priorityLaneIds).toContain("operational");

  });



  it("uses operational card labels", () => {

    expect(ACCOUNT_UNDERSTANDING_CARD.known).toBe("Confirmed");

    expect(ACCOUNT_UNDERSTANDING_CARD.unknown).toBe("Open questions");

    expect(ACCOUNT_UNDERSTANDING_CARD.captureIntelligence).toBe("Continue mapping");

  });

});


