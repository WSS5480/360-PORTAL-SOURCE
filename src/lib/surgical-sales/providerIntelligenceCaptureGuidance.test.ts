import { describe, expect, it } from "vitest";
import {
  INTELLIGENCE_FIELD_WHY_IT_MATTERS,
  intelligenceFieldWhyItMatters,
  intelligenceSectionWhyItMatters,
  PROVIDER_INTELLIGENCE_SECTION_WHY_IT_MATTERS,
} from "./providerIntelligenceCaptureGuidance";
import { PROGRESSIVE_DISCOVERY_PROMPTS } from "./providerIntelligenceProgressiveCapture";
import { PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER } from "./providerIntelligenceArchitecture";

describe("providerIntelligenceCaptureGuidance", () => {
  it("defines why-this-matters for every intelligence section", () => {
    for (const sectionId of Object.keys(PROVIDER_INTELLIGENCE_SECTION_WHY_IT_MATTERS)) {
      expect(intelligenceSectionWhyItMatters(sectionId as keyof typeof PROVIDER_INTELLIGENCE_SECTION_WHY_IT_MATTERS).length).toBeGreaterThan(20);
    }
  });

  it("uses operational copy for observation access and procedural influence", () => {
    expect(intelligenceFieldWhyItMatters("provider_observation_access_path")).toMatch(
      /observation access works/i,
    );
    expect(intelligenceFieldWhyItMatters("provider_current_vendors")).toMatch(
      /evaluation, not required for intro/i,
    );
    expect(intelligenceFieldWhyItMatters("influence_level")).toMatch(
      /procedural adoption decisions/i,
    );
  });

  it("covers every field in intelligence sections", () => {
    const fieldKeys = new Set(
      Object.values(PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER).flat(),
    );
    for (const dbKey of fieldKeys) {
      expect(INTELLIGENCE_FIELD_WHY_IT_MATTERS[dbKey]?.trim().length).toBeGreaterThan(15);
      expect(PROGRESSIVE_DISCOVERY_PROMPTS[dbKey]?.whyItMatters).toBe(
        INTELLIGENCE_FIELD_WHY_IT_MATTERS[dbKey],
      );
    }
  });
});
