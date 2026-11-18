import { describe, expect, it } from "vitest";



import { discoveryAnswerQualifiesForScore, LEADERBOARD_EXCLUDED_DISCOVERY_QUESTION_KEYS } from "./executionLeaderboardSafeguards";

import {

  buildOptionalIntelligenceOverviewItems,

  buildProviderOverviewOptionalIntelligenceView,

  isOptionalIntelligenceDbKey,

  OPTIONAL_INTELLIGENCE_CATEGORIES,

  readOptionalIntelligenceCategorySummary,

} from "./optionalIntelligenceCategories";



describe("optionalIntelligenceCategories", () => {

  it("defines field-knowledge optional categories only", () => {

    expect(OPTIONAL_INTELLIGENCE_CATEGORIES).toHaveLength(8);

    expect(OPTIONAL_INTELLIGENCE_CATEGORIES.map((category) => category.label)).toEqual([

      "Procedure interests",

      "Product interests",

      "Competitor products",

      "Key relationships",

      "Influence paths",

      "Facility context",

      "Progress drivers",

      "Personal notes",

    ]);

    expect(OPTIONAL_INTELLIGENCE_CATEGORIES.some((category) => /scheduler|credentialing|OR coordinator/i.test(category.label))).toBe(

      false,

    );

  });



  it("reads captured summaries for planning and CRM fields", () => {

    const contact = {

      provider_procedure_focus: "Robotic hernia",

      provider_competitive_products: "Incumbent lap stack",

      personality_notes: "Prefers early-morning touchpoints",

    };



    expect(readOptionalIntelligenceCategorySummary(OPTIONAL_INTELLIGENCE_CATEGORIES[0], contact)).toBe(

      "Robotic hernia",

    );

    expect(readOptionalIntelligenceCategorySummary(OPTIONAL_INTELLIGENCE_CATEGORIES[2], contact)).toBe(

      "Incumbent lap stack",

    );

    expect(readOptionalIntelligenceCategorySummary(OPTIONAL_INTELLIGENCE_CATEGORIES[7], contact)).toBe(

      "Prefers early-morning touchpoints",

    );

  });



  it("builds overview items only for captured categories", () => {

    const items = buildOptionalIntelligenceOverviewItems({
      contact: {
        provider_champion_potential: "Strong internal advocate",
      },
    });



    expect(items).toHaveLength(1);

    expect(items[0]?.label).toBe("Influence paths");

  });



  it("builds compact provider overview rows for captured optional intelligence only", () => {
    const view = buildProviderOverviewOptionalIntelligenceView({
      contact: {
        provider_procedure_focus: "Hernia / abdominal wall",
        provider_competitive_products: "Competitor mesh",
      },
      relatedContacts: [
        {
          id: "c-1",
          first_name: "Karen",
          last_name: "Smith",
          title: "Scheduler",
          role_type: "scheduler",
        },
      ],
    });

    expect(view.hasData).toBe(true);
    expect(view.capturedCount).toBe(3);
    expect(view.rows.map((row) => row.label)).toEqual([
      "Procedure interests",
      "Competitor products",
      "Key relationships",
    ]);
    expect(view.rows.find((row) => row.id === "staff_contacts")?.value).toMatch(/Karen Smith/);
  });

  it("does not treat free-text team dynamics as support contacts", () => {
    const view = buildProviderOverviewOptionalIntelligenceView({
      contact: {
        provider_or_team_dynamics: "Strong nursing rapport",
      },
    });

    expect(view.rows.some((row) => row.id === "staff_contacts")).toBe(false);
  });



  it("returns no overview data when optional intelligence rows are empty", () => {

    const view = buildProviderOverviewOptionalIntelligenceView({ contact: {} });

    expect(view.hasData).toBe(false);

    expect(view.capturedCount).toBe(0);

    expect(view.rows).toEqual([]);

  });



  it("excludes optional intelligence db keys from leaderboard scoring keys", () => {

    for (const category of OPTIONAL_INTELLIGENCE_CATEGORIES) {
      if (category.captureMode === "support_contact") continue;

      expect(isOptionalIntelligenceDbKey(category.primaryDbKey)).toBe(true);

      expect(LEADERBOARD_EXCLUDED_DISCOVERY_QUESTION_KEYS.has(category.primaryDbKey)).toBe(true);

      expect(discoveryAnswerQualifiesForScore(category.primaryDbKey)).toBe(false);

    }

  });

});

