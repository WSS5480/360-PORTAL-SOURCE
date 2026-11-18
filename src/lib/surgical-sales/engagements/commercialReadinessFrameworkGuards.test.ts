import { describe, expect, it } from "vitest";
import { CommercialReadinessFrameworkSchema } from "./commercialReadinessFrameworkTypes";
import {
  commercialReadinessTextHasLabelLeak,
  enrichLearnedBulletsWithFramework,
  normalizeCommercialReadinessFramework,
} from "./commercialReadinessFrameworkGuards";
import { buildGenericCommercialReadinessFramework } from "./buildDeterministicCommercialReadinessFramework";

describe("commercialReadinessFrameworkGuards", () => {
  it("detects ontology label leakage", () => {
    expect(commercialReadinessTextHasLabelLeak("workflow friction")).toBe(true);
    expect(commercialReadinessTextHasLabelLeak("clinical pain point")).toBe(true);
    expect(
      commercialReadinessTextHasLabelLeak(
        "Surgeon noted visualization before fixation affects decision-making.",
      ),
    ).toBe(false);
  });

  it("validates framework schema shape", () => {
    const framework = buildGenericCommercialReadinessFramework({
      providerName: "Dr. Chen",
      completedObservationCount: 3,
    });
    const parsed = CommercialReadinessFrameworkSchema.safeParse(framework);
    expect(parsed.success).toBe(true);
  });

  it("enriches learned bullets with framework dimension references", () => {
    const framework = buildGenericCommercialReadinessFramework({
      providerName: "Dr. Chen",
      completedObservationCount: 4,
    });

    const enriched = enrichLearnedBulletsWithFramework(
      ["Observation notes suggest follow-up is warranted."],
      normalizeCommercialReadinessFramework(framework),
    );

    expect(enriched.length).toBeGreaterThanOrEqual(1);
  });
});
