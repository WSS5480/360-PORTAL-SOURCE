import { describe, expect, it } from "vitest";
import {
  catalogVolumeClaimContradicted,
  isCatalogVolumeClaim,
  resolveProductCardCopy,
} from "./resolveProductCardCopy";

describe("resolveProductCardCopy", () => {
  it("detects catalog volume claims", () => {
    expect(
      isCatalogVolumeClaim("Provider has minimal ventral or incisional hernia volume"),
    ).toBe(true);
    expect(isCatalogVolumeClaim("Surgeon states current fixation approach is not a priority")).toBe(
      false,
    );
  });

  it("suppresses ventral volume claim when procedure and observations contradict", () => {
    const resolved = resolveProductCardCopy({
      avoidWhen: "Provider has minimal ventral or incisional hernia volume",
      validationNeeded: "Provider has minimal ventral or incisional hernia volume",
      fallbackValidate: "Confirm workflow value with the surgeon first.",
      fallbackAvoid: "Do not pitch a product until the surgeon confirms the workflow issue is meaningful.",
      context: {
        procedureLabel: "Robotic ventral hernia",
        completedObservationCount: 5,
        productId: "ACSIS",
      },
    });

    expect(resolved.suppressedCatalogVolumeClaims).toHaveLength(2);
    expect(resolved.whatNotToSayYet).not.toMatch(/minimal ventral/i);
    expect(resolved.whatMustBeValidated).not.toMatch(/minimal ventral/i);
    expect(resolved.whatNotToSayYet).toMatch(/do not pitch a product/i);
  });

  it("prefixes surviving catalog lines as playbook guardrails", () => {
    const resolved = resolveProductCardCopy({
      avoidWhen: "Surgeon states current fixation approach is not a priority to change",
      validationNeeded: null,
      fallbackValidate: "Confirm workflow value.",
      fallbackAvoid: "Do not pitch yet.",
      context: {
        procedureLabel: "Robotic ventral hernia",
        completedObservationCount: 5,
        productId: "ACSIS",
      },
    });

    expect(resolved.whatNotToSayYet).toMatch(/^Playbook guardrail/i);
    expect(catalogVolumeClaimContradicted(resolved.whatNotToSayYet, {
      procedureLabel: "Robotic ventral hernia",
      completedObservationCount: 5,
      productId: "ACSIS",
    })).toBe(false);
  });
});
