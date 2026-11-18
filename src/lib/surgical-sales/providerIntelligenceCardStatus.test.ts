import { describe, expect, it } from "vitest";
import {
  INTELLIGENCE_CARD_READINESS_LABELS,
  INTELLIGENCE_CARD_SECTION_LABELS,
  intelligenceSectionEmptyConfirmed,
  resolveIntelligenceCardReadiness,
} from "./providerIntelligenceCardStatus";

describe("providerIntelligenceCardStatus", () => {
  it("uses human section labels", () => {
    expect(INTELLIGENCE_CARD_SECTION_LABELS.confirmed).toBe("What we know");
    expect(INTELLIGENCE_CARD_SECTION_LABELS.openQuestions).toBe("Still learning");
    expect(INTELLIGENCE_CARD_SECTION_LABELS.whatWeKnow).toBe("What we know");
  });

  it("uses field-operational empty confirmed copy", () => {
    expect(intelligenceSectionEmptyConfirmed("clinical_workflow")).toMatch(
      /procedure mix|workflow/i,
    );
    expect(intelligenceSectionEmptyConfirmed("clinical_workflow")).not.toMatch(
      /synthesized/i,
    );
  });

  it("uses operational visibility state labels", () => {
    expect(INTELLIGENCE_CARD_READINESS_LABELS.confirmed).toBe("Strong");
    expect(INTELLIGENCE_CARD_READINESS_LABELS.unmapped).toBe("Developing");
    expect(INTELLIGENCE_CARD_READINESS_LABELS.not_started).toBe("Early");
    expect(INTELLIGENCE_CARD_READINESS_LABELS.operationally_ready).toBe("Validated");
  });

  it("formats visibility metrics for mobile", () => {
    const r = resolveIntelligenceCardReadiness({
      mapped: 1,
      total: 3,
      unresolvedCount: 2,
      confidence: "partial",
    });
    expect(r.label).toBe("Developing");
    expect(r.metricsLine).toBe("1 signal on file · 2 open items");
  });

  it("uses gaps remaining when fields are open but not in gap queue", () => {
    const r = resolveIntelligenceCardReadiness({
      mapped: 2,
      total: 5,
      unresolvedCount: 0,
      confidence: "confirmed",
    });
    expect(r.metricsLine).toBe("2 signals on file · 3 open items");
  });

  it("returns early when nothing captured", () => {
    const r = resolveIntelligenceCardReadiness({
      mapped: 0,
      total: 5,
      unresolvedCount: 5,
      confidence: "unknown",
    });
    expect(r.tone).toBe("not_started");
    expect(r.metricsLine).toBe("Early");
  });

  it("returns validated when fully mapped", () => {
    const r = resolveIntelligenceCardReadiness({
      mapped: 4,
      total: 4,
      unresolvedCount: 0,
      confidence: "validated",
    });
    expect(r.tone).toBe("operationally_ready");
    expect(r.metricsLine).toBe("4 signals on file");
  });
});
