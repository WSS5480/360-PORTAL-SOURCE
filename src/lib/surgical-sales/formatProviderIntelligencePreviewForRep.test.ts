import { describe, expect, it } from "vitest";
import {
  buildProviderIntelligenceInsightCards,
  buildProviderIntelligencePreviewForRep,
  formatRepFacingDisplayText,
  formatRepIntelligenceFieldValue,
  isMachineGeneratedIntelligenceLabel,
  parseMachineIntelligenceSegments,
  translateRepIntelligenceText,
  withRepInsightCategoryTitles,
} from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";

describe("formatProviderIntelligencePreviewForRep", () => {
  it("splits concatenated machine blobs into separate segments", () => {
    expect(
      parseMachineIntelligenceSegments(
        "interest_in_acsis_discussed_fit_strength_still_needs_confirmation",
      ),
    ).toEqual(["interest_in_acsis_discussed", "fit_strength_still_needs_confirmation"]);
  });

  it("builds readable insight cards from concatenated provider signals", () => {
    const view = buildProviderIntelligenceInsightCards({
      provider_evaluation_openness:
        "interest_in_acsis_discussed_fit_strength_still_needs_confirmation",
      provider_procedure_focus: "Watch workflow fit and fixation technique",
    });

    expect(view.cards.some((c) => c.title === "ACSIS Interest")).toBe(true);
    expect(view.cards.some((c) => c.detail === "Discussed during discovery")).toBe(true);
    expect(view.cards.some((c) => c.title === "Fit Validation")).toBe(true);
    expect(view.cards.some((c) => c.detail === "Still needs observation confirmation")).toBe(true);
    expect(view.cards.some((c) => c.title === "Recommended Observation Focus")).toBe(true);

    for (const card of view.cards) {
      expect(card.title).not.toMatch(/_/);
      expect(card.detail).not.toMatch(/interest_in_acsis/);
    }
  });

  it("maps observe-a-case validation signals to rep copy", () => {
    expect(translateRepIntelligenceText("observe_a_case_to_validate_fit_strength")).toBe(
      "Observe a case to validate fit",
    );
  });

  it("formatRepFacingDisplayText never returns raw snake_case tokens", () => {
    expect(formatRepFacingDisplayText("interest_in_acsis_discussed")).toBe("ACSIS interest was discussed");
    expect(formatRepFacingDisplayText("fit_strength_still_needs_confirmation_in_a_live_case")).toBe(
      "Fit still needs confirmation in a live case",
    );
    expect(formatRepFacingDisplayText("observe_a_case_to_validate_fit_strength")).toBe(
      "Observe a case to validate fit",
    );
  });

  it("maps category titles for observation provider context cards", () => {
    const view = buildProviderIntelligenceInsightCards({
      provider_evaluation_openness: "interest_in_acsis_discussed",
      provider_workflow_pain_points: "Turnover friction on heavy days",
    });
    const categorized = withRepInsightCategoryTitles(view.cards);
    expect(categorized.some((card) => card.title === "Fit validation")).toBe(true);
    expect(categorized.some((card) => card.title === "Workflow friction")).toBe(true);
    expect(categorized.every((card) => !card.detail.includes("interest_in_acsis"))).toBe(true);
  });

  it("maps known machine signal ids to rep copy", () => {
    expect(translateRepIntelligenceText("interest_in_acsis_discussed")).toBe(
      "ACSIS interest was discussed",
    );
    expect(translateRepIntelligenceText("fit_strength_still_needs_confirmation_in_a_live_case")).toBe(
      "Fit still needs confirmation in a live case",
    );
  });

  it("does not surface raw snake_case tokens on field values", () => {
    expect(
      formatRepIntelligenceFieldValue(
        "provider_preference_card_signals",
        "interest_in_acsis_discussed",
      ),
    ).toBe("ACSIS interest was discussed");
    expect(isMachineGeneratedIntelligenceLabel("interest_in_acsis_discussed")).toBe(true);
    expect(
      formatRepIntelligenceFieldValue("provider_evaluation_openness", "fit_strength_still_needs_confirmation"),
    ).toBe("Fit still needs confirmation");
  });

  it("groups signals under rep-facing headings", () => {
    const view = buildProviderIntelligencePreviewForRep({
      provider_procedure_focus: "Hernia repair",
      provider_observation_feasibility: "yes",
      provider_observation_coordinator_contact: "Karen — OR desk",
      provider_credentialing_status: "in_progress",
      provider_evaluation_openness: "interest_in_acsis_discussed",
    });

    const titles = view.groups.map((g) => g.title);
    expect(titles).toContain("Clinical signals");
    expect(titles).toContain("Access signals");
    expect(titles).toContain("Scheduling signals");
    expect(titles).toContain("Credentialing signals");
    expect(titles).toContain("Workflow fit");

    const workflow = view.groups.find((g) => g.id === "workflow_fit");
    expect(workflow?.items.some((i) => i.text.includes("ACSIS interest was discussed"))).toBe(true);
    expect(
      workflow?.items.every(
        (i) => !i.text.includes("interest_in_acsis") && !i.text.includes("_"),
      ),
    ).toBe(true);
  });

  it("never includes raw enum keys in preview item text", () => {
    const view = buildProviderIntelligencePreviewForRep({
      provider_workflow_pain_points: "discussed_only|Turnover friction on heavy days",
      provider_competitive_products: "acsis",
    });

    for (const group of view.groups) {
      for (const item of group.items) {
        expect(item.text).not.toMatch(/discussed_only/);
        expect(item.text).not.toMatch(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/);
      }
    }
  });
});
