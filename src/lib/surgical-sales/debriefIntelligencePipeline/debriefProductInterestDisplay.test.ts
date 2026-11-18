import { describe, expect, it } from "vitest";

import {
  formatProductInterestHeadline,
  normalizeProductInterestLabel,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductInterestDisplay";

describe("debriefProductInterestDisplay", () => {
  it("rewrites abstract published-outcomes labels into rep language", () => {
    expect(normalizeProductInterestLabel("Desire for published outcomes")).toBe(
      "Wants published outcomes before product change",
    );
    expect(
      formatProductInterestHeadline("Desire for published outcomes", "wanted to see published outcomes before considering any changes"),
    ).toBe("Product interest: Wants published outcomes before product change");
  });

  it("keeps comparative clinical data interest readable", () => {
    expect(normalizeProductInterestLabel("Product comparison or clinical-data interest")).toBe(
      "Comparative clinical data interest",
    );
  });
});
