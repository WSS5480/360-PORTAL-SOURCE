import { describe, expect, it } from "vitest";
import {
  buildPreparationSpecializationView,
  resolvePreparationSpecializationTier,
} from "@/lib/surgical-sales/engagements/engagementPreparationSpecialization";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";

const emptyIntel: PrepareKnownIntelligence = { bullets: [], last_key_insight: null };

const richIntel: PrepareKnownIntelligence = {
  bullets: [
    { key: "procedural_preferences", label: "Prefs", value: "Lap-heavy ventral workflow" },
    { key: "or_team_dynamics", label: "OR", value: "Strong coordinator relationship" },
    { key: "evaluation_openness", label: "Eval", value: "Open to structured trial cases" },
  ],
  last_key_insight: { title: "Insight", body: "Wants observation before evaluation cases." },
};

describe("engagementPreparationSpecialization", () => {
  it("starts at low tier with minimal context", () => {
    expect(
      resolvePreparationSpecializationTier({
        engagementType: "intro_call",
        knownIntelligence: emptyIntel,
      }),
    ).toBe("low");
    const view = buildPreparationSpecializationView({
      engagementType: "intro_call",
      knownIntelligence: emptyIntel,
    });
    expect(view.show_discovery_focus).toBe(true);
    expect(view.show_specialty_guidance).toBe(false);
    expect(view.allow_product_specific_prep).toBe(false);
  });

  it("elevates to medium when product focus is explicitly selected", () => {
    expect(
      resolvePreparationSpecializationTier({
        engagementType: "intro_call",
        productLine: "BioTissue",
        knownIntelligence: emptyIntel,
      }),
    ).toBe("medium");
  });

  it("elevates to medium with specialty, opportunity, or emerging intelligence", () => {
    expect(
      resolvePreparationSpecializationTier({
        engagementType: "intro_call",
        providerSpecialty: "General Surgery",
        knownIntelligence: emptyIntel,
      }),
    ).toBe("medium");
    expect(
      resolvePreparationSpecializationTier({
        engagementType: "intro_call",
        productLine: "ACSIS",
        knownIntelligence: {
          bullets: [
            { key: "evaluation_openness", label: "Eval", value: "Interested in pilot workflow" },
          ],
          last_key_insight: null,
        },
      }),
    ).toBe("medium");
  });

  it("reaches high tier for evaluation context, case linkage, or deep intelligence", () => {
    expect(
      resolvePreparationSpecializationTier({
        engagementType: "intro_call",
        productLine: "ACSIS",
        opportunityStage: "evaluation_planned",
        opportunityId: "opp-1",
        knownIntelligence: {
          bullets: [
            { key: "evaluation_openness", label: "Eval", value: "Ready for trial cases next month" },
          ],
          last_key_insight: null,
        },
      }),
    ).toBe("high");

    expect(
      resolvePreparationSpecializationTier({
        engagementType: "intro_call",
        productLine: "ACSIS",
        caseId: "case-1",
        knownIntelligence: emptyIntel,
      }),
    ).toBe("high");

    expect(
      resolvePreparationSpecializationTier({
        engagementType: "intro_call",
        productLine: "ACSIS",
        knownIntelligence: richIntel,
      }),
    ).toBe("high");
  });

  it("exposes tier-specific focus areas and flags", () => {
    const high = buildPreparationSpecializationView({
      engagementType: "intro_call",
      productLine: "ACSIS",
      caseId: "case-1",
      knownIntelligence: emptyIntel,
    });
    expect(high.tier_label).toMatch(/Product & evaluation/i);
    expect(high.focus_areas.some((a) => /OR support|Adoption barriers/i.test(a))).toBe(true);
    expect(high.allow_product_specific_prep).toBe(true);
    expect(high.show_high_intensity_guidance).toBe(true);
  });
});
