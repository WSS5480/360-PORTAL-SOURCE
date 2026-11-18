import { describe, expect, it } from "vitest";
import { buildPrepareSuggestedGoal } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedGoal";
import { INTRO_CALL_FORBIDDEN_PRODUCT_TERMS } from "@/lib/surgical-sales/engagements/introCallOfficialPreCallTemplates";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";

const emptyIntel: PrepareKnownIntelligence = { bullets: [], summary: null };

describe("buildPrepareSuggestedGoal intro call official templates", () => {
  it("generic intro call goal avoids product terms", () => {
    const { goal } = buildPrepareSuggestedGoal({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      productLine: "",
      intentionalProductFocus: false,
      knownIntelligence: emptyIntel,
      prepContextState: "discovery",
    });
    expect(goal.toLowerCase()).toMatch(/procedure fit|workflow/);
    expect(INTRO_CALL_FORBIDDEN_PRODUCT_TERMS.test(goal)).toBe(false);
  });

  it("ACSIS intro call goal may reference hernia", () => {
    const { goal } = buildPrepareSuggestedGoal({
      engagementType: "intro_call",
      providerSpecialty: "General Surgery",
      productLine: "ACSIS",
      intentionalProductFocus: true,
      prepSpecializationTier: "medium",
      knownIntelligence: emptyIntel,
      prepContextState: "product_exploration",
      dominantPrep: {
        prep_mode: "product_exploration",
        intentional_product_focus: true,
        product_line: "ACSIS",
        effective_specialty_key: "general_surgery",
        prep_context_state: "product_exploration",
        use_product_bundle: true,
        include_generic_discovery_core: false,
        include_generic_talking_core: false,
        include_specialty_generic_pool: false,
        include_specialty_workflow_focus: false,
        include_prep_context_extras: true,
        include_observation_goals: false,
        include_commercialization_signals: false,
        product_prep_tier: "medium",
      },
    });
    expect(goal.toLowerCase()).toMatch(/hernia|abdominal/);
  });
});
