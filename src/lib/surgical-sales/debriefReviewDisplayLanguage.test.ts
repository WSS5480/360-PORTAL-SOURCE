import { describe, expect, it } from "vitest";
import {
  classifyDebriefPathwaySignal,
  debriefCardBody,
  debriefCardTitle,
  formatDebriefFieldValueForDisplay,
  formatDebriefOperationalSummary,
  isEarlyProductIntelligenceField,
  shouldBlockEarlyProductFieldAcceptance,
  stripStoredIntelligenceEncoding,
} from "./debriefReviewDisplayLanguage";
import type { DebriefIntelligenceUpdateItem } from "./buildDebriefIntelligenceExtractionReview";

describe("debriefReviewDisplayLanguage", () => {
  it("renders discussed_only maturity tokens for reps", () => {
    expect(stripStoredIntelligenceEncoding("discussed_only|Verbal understanding")).toMatch(
      /not yet validated in live procedures/i,
    );
    expect(stripStoredIntelligenceEncoding("discussed_only|Verbal understanding")).not.toMatch(
      /discussed_only/i,
    );
  });

  it("formats operational summary line", () => {
    expect(
      formatDebriefOperationalSummary({
        signalsCount: 3,
        validationCount: 2,
        dependenciesCount: 1,
      }).detailLine,
    ).toBe(
      "3 operational signals identified · 2 require validation · 1 workflow dependency detected",
    );
  });

  it("classifies ACSIS as early clinical interest before selling stages", () => {
    const item = {
      discoverySignalId: "product_alignment",
      field: { dbKey: "provider_preference_card_signals", id: "ai-partial-0", label: "Product" },
      proposedValue: "ACSIS discussed on intro",
      extractedStatement: "",
      intelligenceFieldLabel: "Product fit",
    } as DebriefIntelligenceUpdateItem;

    expect(
      classifyDebriefPathwaySignal({
        item,
        groupId: "product_fit_signals",
        pathwayStageId: "observe",
      }),
    ).toBe("early_clinical_interest");
    expect(debriefCardTitle({ item, pathwayClass: "early_clinical_interest" })).toBe(
      "Early clinical interest surfaced.",
    );
    expect(debriefCardBody({ item, pathwayClass: "early_clinical_interest" })).toMatch(
      /not been validated through live observation/i,
    );
  });

  it("uses scheduling ownership copy for Karen", () => {
    const item = {
      discoverySignalId: "scheduling_owner",
      field: { dbKey: "provider_scheduling_contact", id: "ai-partial-1", label: "Scheduling" },
      proposedValue: "Karen handles scheduling with OR team",
      extractedStatement: "",
      intelligenceFieldLabel: "Scheduling owner",
    } as DebriefIntelligenceUpdateItem;

    expect(
      classifyDebriefPathwaySignal({ item, groupId: "people_contacts", pathwayStageId: "discovery" }),
    ).toBe("observation_scheduling");
    expect(
      debriefCardTitle({
        item,
        pathwayClass: "observation_scheduling",
        groupId: "people_contacts",
      }),
    ).toMatch(/Karen/i);
    expect(
      debriefCardBody({ item, pathwayClass: "observation_scheduling" }),
    ).toMatch(/Karen/i);
  });

  it("blocks early product field auto-accept during discovery and observe", () => {
    expect(shouldBlockEarlyProductFieldAcceptance("discovery")).toBe(true);
    expect(shouldBlockEarlyProductFieldAcceptance("observe")).toBe(true);
    expect(shouldBlockEarlyProductFieldAcceptance("debrief")).toBe(false);
    expect(
      isEarlyProductIntelligenceField({
        dbKey: "provider_preference_card_signals",
        id: "ai-partial-0",
        label: "ACSIS interest",
      }),
    ).toBe(true);
  });

  it("humanizes credentialing_required tokens in field values", () => {
    expect(
      formatDebriefFieldValueForDisplay(
        "provider_observation_feasibility",
        "credentialing_required|Still learning access path",
      ),
    ).not.toMatch(/credentialing_required/i);
  });
});
