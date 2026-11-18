import { describe, expect, it } from "vitest";

import { buildProviderOverviewNarrative } from "./buildProviderOverviewNarrative";

import {

  buildProviderOverviewBody,

  isIntelligenceFieldValidatedOnFile,

  sanitizeOverviewDisplayText,

  VALIDATION_GROUP_LABELS,

} from "./buildProviderOverviewBody";

import { formatContextMemoryLine } from "./providerOverviewMissionPresentation";

import { PROVIDER_FIELD_OPS_SECTION } from "./providerFieldOperationsUiLabels";

import { EARLY_DISCOVERY_NEXT_FIELD_ACTION_DETAIL } from "./providerOverviewDiscoveryProgression";
import { SALES_PATHWAY_STAGE_IDS } from "./providerSalesPathwayExecution";



const BANNED_UI_PATTERN =

  /blocker|critical|not viable|strategic warning|commercialization|commercial influence|field execution risk|should we invest field time/i;



function baseInput() {

  const narrative = buildProviderOverviewNarrative({

    providerId: "prov-qa",

    contact: {

      provider_observation_access_path: "",

      provider_relationship_stage: "prospect",

    },

    relationshipStage: "prospect",

    engagements: [],

    newEngagementHref: "/engagements/new",

    newCaseHref: "/cases/new",

    intelligenceHref: "/providers/prov-qa?tab=intelligence",

    createOpportunityHref: "/opportunities/new",

  });

  return {

    narrative,

    contact: { provider_relationship_stage: "prospect" },

    providerId: "prov-qa",

    intelligenceHref: "/providers/prov-qa?tab=intelligence",

    briefingHref: "/providers/prov-qa?tab=briefing",

    newEngagementHref: "/engagements/new",

    activityHref: "/providers/prov-qa?tab=activity",

  };

}



describe("Provider Overview QA — pathway execution model", () => {

  it("renders five logical sections with pathway copy", () => {

    const body = buildProviderOverviewBody(baseInput());

    const serialized = JSON.stringify(body);



    expect(body.pathwayStage.stageObjective).toBe("");

    expect(body.whatWeKnow.validating.length + body.whatWeKnow.confirmed.length).toBe(0);

    expect(body.nextBestAction.label).toBe(body.nextBestAction.label.trim());

    expect(body.pathwayTimeline.phases).toHaveLength(SALES_PATHWAY_STAGE_IDS.length);

    expect(body.recentFieldIntel.length).toBeGreaterThan(0);

    expect(serialized).not.toMatch(BANNED_UI_PATTERN);

  });



  it("uses pathway validation labels not blocker language", () => {

    expect(VALIDATION_GROUP_LABELS.needsValidation).toBe("Still Validating");

    expect(VALIDATION_GROUP_LABELS.unknown).toBe("Unknown");

    expect(PROVIDER_FIELD_OPS_SECTION.missionOverviewAria).toBe("Sales pathway execution");

  });



  it("keeps what-we-know empty for new providers without field evidence", () => {

    const body = buildProviderOverviewBody(baseInput());

    const lines = [

      ...body.whatWeKnow.confirmed.map((i) => i.label),

      ...body.whatWeKnow.validating.map((i) => i.label),

      ...body.whatWeKnow.unknown.map((i) => i.label),

    ];

    expect(lines).toHaveLength(0);

  });



  it("sanitizes legacy dashboard phrases", () => {

    expect(sanitizeOverviewDisplayText("Primary blockers")).toBe("Still Validating");

    expect(sanitizeOverviewDisplayText("Commercialization path")).toBe("");

    expect(sanitizeOverviewDisplayText("OR access path")).toBe("OR access path");

  });



  it("shortens truncated-style intelligence bullets", () => {

    expect(

      formatContextMemoryLine("Dock and instrument preferences not validated in the OR workflow yet"),

    ).toBe("Dock and instrument preferences not validated");

  });



  it("prioritizes intro call before access mapping for new providers", () => {
    const body = buildProviderOverviewBody({
      ...baseInput(),
      engagements: [],
    });

    expect(body.nextBestAction.label).toBe("Create Intro Call");
    expect(body.nextBestAction.href).toContain("engagement_type=intro_call");
    expect(body.pathwayStage.requirements).toHaveLength(0);
    expect(body.pathwayStage.discoveryProgression).not.toBeNull();
    expect(body.pathwayStage.discoveryProgression!.advancementSignal.met).toBe(false);
    expect(body.pathwayStage.discoveryProgress).toMatchObject({
      approved: false,
      statusLabel: "Observation Not Approved",
    });
    expect(body.pathwayStage.hasFieldEvidence).toBe(false);
    expect(body.pathwayStage.stageObjective).toBe("");
    expect(body.priorityUnknowns).toEqual([]);
    expect(body.tacticalProgression.openItems).toEqual([]);
    expect(
      body.whatWeKnow.validating.some((i) => i.label === "Facility access pathway"),
    ).toBe(false);
  });

  it("keeps procedure mix in unknown until validated on file", () => {

    const narrative = buildProviderOverviewNarrative({

      providerId: "prov-qa",

      contact: {

        provider_procedure_focus: "Lap colorectal",

        provider_relationship_stage: "prospect",

      },

      relationshipStage: "prospect",

      engagements: [],

      newEngagementHref: "/engagements/new",

      newCaseHref: "/cases/new",

      intelligenceHref: "/providers/prov-qa?tab=intelligence",

      createOpportunityHref: "/opportunities/new",

    });



    expect(

      isIntelligenceFieldValidatedOnFile("provider_procedure_focus", {

        provider_procedure_focus: "Lap colorectal",

      }),

    ).toBe(false);



    const body = buildProviderOverviewBody({

      ...baseInput(),

      narrative,

      contact: { provider_procedure_focus: "Lap colorectal", provider_relationship_stage: "prospect" },

    });



    expect(body.whatWeKnow.confirmed.some((i) => i.label === "Procedure volume")).not.toBe(true);

    expect(body.whatWeKnow.unknown.some((i) => i.label === "Procedure volume")).not.toBe(true);

  });

});

