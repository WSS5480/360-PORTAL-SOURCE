import { describe, expect, it } from "vitest";

import { buildProviderFieldIntelligenceModel } from "./providerFieldIntelligenceModel";

import { buildProviderIntelligenceReferenceView } from "./buildProviderIntelligenceReferenceView";

import { resolveNormalizedObservationPermission } from "./observationPermissionModel";

import { buildProviderIntelligenceFieldBriefingStory } from "./buildProviderIntelligenceFieldBriefingStory";



describe("buildProviderIntelligenceFieldBriefingStory", () => {

  it("Tom Sandy field brief mentions Jennifer scheduler reference", () => {

    const contact = {

      id: "p1",

      first_name: "Tom",

      last_name: "Sandy",

      provider_observation_feasibility: "interested",

      provider_observation_credentialing_needed: "required",

      provider_observation_coordinator_contact: "Jennifer — contact info missing",

      provider_procedure_focus:

        "Robotic ventral hernia repair · Increasing procedure volume|Abdominal wall reconstruction · Increasing case volume",

      provider_intelligence_field_metadata: {

        provider_observation_feasibility: {

          source_type: "intro_call",

          source_label: "Intro call debrief",

          lifecycle_state: "confirmed",

        },

      },

    };



    const model = buildProviderFieldIntelligenceModel({ contact });

    const reference = buildProviderIntelligenceReferenceView({ contact, providerId: "p1" });

    const permission = resolveNormalizedObservationPermission({ contact });



    const paragraphs = buildProviderIntelligenceFieldBriefingStory({

      contact,

      model,

      permission,

      reference,

    });



    const story = paragraphs.join(" ");

    expect(story).toMatch(/Tom/i);

    expect(story).toMatch(/observation/i);

    expect(story).toMatch(/credentialing/i);

    expect(story).toMatch(/scheduler|Jennifer/i);

    expect(paragraphs.length).toBeGreaterThan(1);

    expect(paragraphs.every((p) => !/^-/m.test(p))).toBe(true);

  });

});


