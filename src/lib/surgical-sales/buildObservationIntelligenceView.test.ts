import { describe, expect, it } from "vitest";

import {

  buildObservationIntelligenceView,

  OBSERVATION_INTELLIGENCE_CATEGORIES,

  OBSERVATION_INTELLIGENCE_EMPTY,

} from "./buildObservationIntelligenceView";



describe("buildObservationIntelligenceView", () => {

  it("returns all intelligence categories with empty placeholders", () => {

    const view = buildObservationIntelligenceView({});



    expect(view.categories).toHaveLength(7);

    expect(view.categories.map((category) => category.id)).toEqual(

      OBSERVATION_INTELLIGENCE_CATEGORIES.map((category) => category.id),

    );

    expect(view.hasAnyContent).toBe(false);

    expect(view.categories.every((category) => !category.hasItems)).toBe(true);

  });



  it("maps live observation fields into intelligence categories", () => {

    const view = buildObservationIntelligenceView({

      live_observation_clinical_pain_points: "Difficulty achieving fixation consistency",

      live_observation_workflow: "Additional setup steps required",

      live_observation_product_fit: "ACSIS may improve visualization",

    });



    const byId = Object.fromEntries(view.categories.map((category) => [category.id, category.items]));



    expect(byId.clinical_pain_points).toEqual(["Difficulty achieving fixation consistency"]);

    expect(byId.workflow_friction).toEqual(["Additional setup steps required"]);

    expect(byId.product_fit_signals).toEqual(["ACSIS may improve visualization"]);

    expect(view.hasAnyContent).toBe(true);

  });



  it("merges snapshot intelligence from observation notes", () => {

    const view = buildObservationIntelligenceView({

      observation_workflow_intelligence_snapshot: {

        sections: [

          { id: "competitor_products", items: ["Competitor drill on field"] },

          { id: "staff_observations", items: ["Circulator flagged turnover delay"] },

        ],

        extracted_at: "2026-06-01T12:00:00.000Z",

      },

    });



    const byId = Object.fromEntries(view.categories.map((category) => [category.id, category.items]));

    expect(byId.competitor_products).toEqual(["Competitor drill on field"]);

    expect(byId.staff_observations).toEqual(["Circulator flagged turnover delay"]);

    expect(view.extractedAt).toBe("2026-06-01T12:00:00.000Z");

  });



  it("uses the standard empty copy for categories without findings", () => {

    const view = buildObservationIntelligenceView({

      live_observation_clinical_pain_points: "Visualization issues observed",

    });



    const emptyCategory = view.categories.find((category) => category.id === "workflow_friction");

    expect(emptyCategory?.hasItems).toBe(false);

    expect(OBSERVATION_INTELLIGENCE_EMPTY).toBe("No intelligence captured yet.");

  });

});

