import { describe, expect, it } from "vitest";

import { buildProviderOverviewNarrative } from "./buildProviderOverviewNarrative";

import {

  buildProviderOverviewBody,

  VALIDATION_GROUP_LABELS,

} from "./buildProviderOverviewBody";

import { SALES_PATHWAY_STAGE_IDS } from "./providerSalesPathwayExecution";



describe("buildProviderOverviewBody", () => {

  it("returns sales pathway execution model without blocker language", () => {

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



    const body = buildProviderOverviewBody({

      narrative,

      contact: { provider_relationship_stage: "prospect" },

      providerId: "prov-1",

      intelligenceHref: "/providers/prov-1?tab=intelligence",

      briefingHref: "/providers/prov-1?tab=briefing",

      newEngagementHref: "/engagements/new",

      activityHref: "/providers/prov-1?tab=activity",

    });



    expect(body.pathwayStage.stageLabel).toBeTruthy();

    expect(
      body.pathwayStage.discoveryProgression != null ||
        body.pathwayStage.requirements.length > 0,
    ).toBe(true);

    expect(body.pathwayStage.discoveryProgress).not.toBeNull();
    expect(body.pathwayStage.discoveryProgress?.statusLabel).toBe("Observation Not Approved");
    expect(body.pathwayStage.discoveryProgress?.approved).toBe(false);

    expect(body.nextBestAction.label.length).toBeGreaterThan(0);

    expect(body.nextBestAction.href).toBeTruthy();

    expect(body.pathwayTimeline.phases).toHaveLength(SALES_PATHWAY_STAGE_IDS.length);

    expect(body.whatWeKnow.confirmed.length + body.whatWeKnow.validating.length).toBe(0);

    expect(body.nextBestAction.label).toBe("Create Intro Call");

    expect(body.recentFieldIntel.length).toBeGreaterThan(0);

    expect(JSON.stringify(body)).not.toMatch(/blocker|critical|not viable|strategic warning/i);

  });



  it("maps validation buckets to what we know columns", () => {

    expect(VALIDATION_GROUP_LABELS.confirmed).toBe("Confirmed");

    expect(VALIDATION_GROUP_LABELS.needsValidation).toBe("Still Validating");

    expect(VALIDATION_GROUP_LABELS.unknown).toBe("Unknown");

    const contact = {
      provider_observation_feasibility: "approved",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "profile",
          source_label: "Manual",
          updated_at: "2026-05-01T00:00:00.000Z",
          validated_at: "2026-05-01T00:00:00.000Z",
        },
      },
      provider_relationship_stage: "prospect",
    };

    const narrative = buildProviderOverviewNarrative({

      providerId: "prov-1",

      contact,

      relationshipStage: "prospect",

      engagements: [{ id: "e1", engagement_type: "intro_call", status: "completed" }],

      newEngagementHref: "/engagements/new",

      newCaseHref: "/cases/new",

      intelligenceHref: "/intelligence",

      createOpportunityHref: "/opportunities/new",

    });

    const body = buildProviderOverviewBody({

      narrative,

      contact,

      providerId: "prov-1",

      intelligenceHref: "/intelligence",

      briefingHref: "/briefing",

      newEngagementHref: "/engagements/new",

      activityHref: "/activity",

      engagements: [{ id: "e1", engagement_type: "intro_call", status: "completed" }],

    });

    expect(body.pathwayStage.hasFieldEvidence).toBe(true);

    expect(body.whatWeKnow.validating.length + body.whatWeKnow.unknown.length).toBeGreaterThan(0);

  });

});

