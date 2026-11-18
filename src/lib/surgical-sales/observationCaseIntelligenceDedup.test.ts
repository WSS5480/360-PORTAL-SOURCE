import { describe, expect, it } from "vitest";
import {
  dedupeObservationIntelligenceBullets,
  isGenericObservationIntelligenceLabel,
  normalizeObservationIntelligenceMeaning,
  preferObservationIntelligenceBullet,
} from "./observationCaseIntelligenceDedup";

describe("observationCaseIntelligenceDedup", () => {
  it("treats internal topic labels as generic", () => {
    expect(isGenericObservationIntelligenceLabel("Competitor usage")).toBe(true);
    expect(isGenericObservationIntelligenceLabel("Competitor product observed")).toBe(false);
  });

  it("dedupes access pathway variants to one bullet", () => {
    const lines = dedupeObservationIntelligenceBullets([
      "Access pathway noted for this case",
      "Observation access pathway is documented",
      "Access pathway confirmed",
    ]);

    expect(lines).toHaveLength(1);
    expect(normalizeObservationIntelligenceMeaning(lines[0]!)).toBe("access_pathway");
  });

  it("prefers specific bullets over generic labels", () => {
    expect(
      preferObservationIntelligenceBullet(
        "Competitor usage",
        "Stryker triathlon tray observed in the room",
      ),
    ).toBe("Stryker triathlon tray observed in the room");
  });

  it("drops generic competitor labels without detail", () => {
    const lines = dedupeObservationIntelligenceBullets([
      "Competitor usage",
      "Competitor usage on this case",
      "Competitor product observed",
    ]);

    expect(lines).toEqual(["Competitor product observed"]);
  });
});
