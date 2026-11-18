import { describe, expect, it } from "vitest";
import {
  isIntroCallProductPrepEnabled,
  resolveIntroCallProductPrepBundle,
} from "@/lib/surgical-sales/engagements/introCallProductContext";

describe("introCallProductContext", () => {
  it("returns specialty workflow focus when no product is selected", () => {
    const bundle = resolveIntroCallProductPrepBundle({
      providerSpecialty: "General Surgery",
      productLine: null,
    });
    expect(bundle.mode).toBe("specialty");
    expect(bundle.workflowFocus).toMatch(/reconstructive workflow variability/i);
    expect(bundle.procedureDiscoveryQuestions).toHaveLength(0);
  });

  it("returns product workflow focus and procedure questions when product is selected", () => {
    const acsis = resolveIntroCallProductPrepBundle({
      providerSpecialty: "General Surgery",
      productLine: "ACSIS",
    });
    expect(acsis.mode).toBe("product");
    expect(acsis.workflowFocus).toMatch(/fixation workflow and closure inefficiencies/i);
    expect(acsis.procedureDiscoveryQuestions.some((q) => /fixation workflow/i.test(q))).toBe(true);
    expect(acsis.evaluationTalkingPoints.some((p) => /evaluation case profile/i.test(p))).toBe(true);

    const endolumik = resolveIntroCallProductPrepBundle({
      providerSpecialty: "General Surgery",
      productLine: "Endolumik",
    });
    expect(endolumik.workflowFocus).toMatch(/bougie calibration|foregut workflow/i);
    expect(endolumik.procedureDiscoveryQuestions.some((q) => /bougie|foregut/i.test(q))).toBe(true);
  });

  it("enables product prep by tier and intentional product focus", () => {
    expect(isIntroCallProductPrepEnabled("")).toBe(false);
    expect(isIntroCallProductPrepEnabled("ACSIS", "low")).toBe(false);
    expect(isIntroCallProductPrepEnabled("ACSIS", "medium")).toBe(false);
    expect(isIntroCallProductPrepEnabled("ACSIS", "medium", true)).toBe(true);
    expect(isIntroCallProductPrepEnabled("ACSIS", "high")).toBe(false);
    expect(isIntroCallProductPrepEnabled("ACSIS", "high", true)).toBe(true);
    expect(isIntroCallProductPrepEnabled("ACSIS")).toBe(false);
    expect(isIntroCallProductPrepEnabled("ACSIS", undefined, true)).toBe(true);
    expect(
      resolveIntroCallProductPrepBundle({
        productLine: "ACSIS, BioTissue",
        providerSpecialty: "General Surgery",
      }).productLine,
    ).toBe("ACSIS");
  });
});
