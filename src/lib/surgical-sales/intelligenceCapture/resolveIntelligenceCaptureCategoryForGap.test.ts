import { describe, expect, it } from "vitest";

import {
  resolveIntelligenceCaptureCategoryForDbKey,
  resolveIntelligenceCaptureCategoryForGapQuestion,
} from "./resolveIntelligenceCaptureCategoryForGap";

describe("resolveIntelligenceCaptureCategoryForGap", () => {
  it("maps known gap question ids to capture categories", () => {
    expect(resolveIntelligenceCaptureCategoryForGapQuestion("gap-provider-pain")).toBe(
      "clinical_challenges",
    );
    expect(resolveIntelligenceCaptureCategoryForGapQuestion("gap-product-confirmation")).toBe(
      "opportunity_signals",
    );
    expect(resolveIntelligenceCaptureCategoryForGapQuestion("gap-workflow-validation")).toBe(
      "procedure_workflow",
    );
  });

  it("maps provider db key gaps from question id suffix", () => {
    expect(resolveIntelligenceCaptureCategoryForGapQuestion("gap-provider_procedure_focus")).toBe(
      "clinical_focus",
    );
    expect(resolveIntelligenceCaptureCategoryForGapQuestion("gap-provider_competitive_products")).toBe(
      "opportunity_signals",
    );
  });

  it("resolves db keys via signal registry when possible", () => {
    expect(resolveIntelligenceCaptureCategoryForDbKey("provider_procedure_focus")).toBe(
      "clinical_focus",
    );
    expect(resolveIntelligenceCaptureCategoryForDbKey("provider_competitive_products")).toBe(
      "opportunity_signals",
    );
  });
});
