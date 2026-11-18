import { describe, expect, it } from "vitest";
import { buildObservationTodaysFocusBullets } from "./buildObservationTodaysFocusBullets";

describe("buildObservationTodaysFocusBullets", () => {
  it("returns 3-5 focus bullets from provider intelligence", () => {
    const bullets = buildObservationTodaysFocusBullets({
      caseRow: {},
      providerContact: {
        provider_competitive_products: "Uses Competitor X",
        provider_workflow_pain_points: "Long turnover",
      },
    });

    expect(bullets.length).toBeGreaterThanOrEqual(1);
    expect(bullets.length).toBeLessThanOrEqual(5);
    expect(bullets.some((bullet) => /competitor|product|workflow/i.test(bullet))).toBe(true);
  });

  it("falls back to default bullets when no guidance signals exist", () => {
    const bullets = buildObservationTodaysFocusBullets({ caseRow: {} });

    expect(bullets).toHaveLength(3);
  });
});
