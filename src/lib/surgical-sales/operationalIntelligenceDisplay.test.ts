import { describe, expect, it } from "vitest";
import {
  isIncompleteSentenceFragment,
  isLowQualityIntelligenceText,
  isOperationalIntelligenceDisplayable,
  isRawFragmentUnsuitableForCard,
  sanitizeOperationalDisplayText,
} from "./operationalIntelligenceDisplay";

describe("operationalIntelligenceDisplay", () => {
  it("flags CRM visit fragments", () => {
    expect(isLowQualityIntelligenceText("I met with Dr. Candy.")).toBe(true);
    expect(isLowQualityIntelligenceText("Intro completed")).toBe(true);
    expect(isLowQualityIntelligenceText("Met with doctor")).toBe(true);
  });

  it("allows operational synthesis", () => {
    const line =
      "Relationship is still early-stage and workflow impact concerns remain unresolved.";
    expect(isLowQualityIntelligenceText(line)).toBe(false);
    expect(isOperationalIntelligenceDisplayable("provider_or_team_dynamics", line)).toBe(true);
  });

  it("flags incomplete sentence fragments", () => {
    expect(isIncompleteSentenceFragment("Scheduler said credentialing and")).toBe(true);
    expect(
      isIncompleteSentenceFragment(
        "Vendor credentialing is required before observation cases are approved.",
      ),
    ).toBe(false);
  });

  it("blocks raw evidence copied into operational meaning", () => {
    const raw = "Met with scheduler about credentialing.";
    expect(isRawFragmentUnsuitableForCard(raw, raw)).toBe(true);
  });

  it("allows synthesized credentialing meaning distinct from evidence", () => {
    const meaning =
      "Vendor credentialing is required before the scheduler will approve observation cases at this facility.";
    const evidence = "Scheduler said vendor credentialing is required before observation.";
    expect(sanitizeOperationalDisplayText(meaning)).toBeTruthy();
    expect(isIncompleteSentenceFragment(meaning)).toBe(false);
    expect(isRawFragmentUnsuitableForCard(meaning, evidence)).toBe(false);
  });

  it("allows OR access synthesis lines", () => {
    const meaning =
      "OR observation requires vendor credentialing clearance before the scheduler will approve cases at this facility.";
    expect(isLowQualityIntelligenceText(meaning)).toBe(false);
    expect(isIncompleteSentenceFragment(meaning)).toBe(false);
    expect(sanitizeOperationalDisplayText(meaning)).toBeTruthy();
  });

  it("blocks mid-sentence evaluation clause fragments", () => {
    expect(isIncompleteSentenceFragment("During an actual case before making any decisions")).toBe(true);
    expect(
      isIncompleteSentenceFragment(
        "how the product performs during an actual case before making any decisions",
      ),
    ).toBe(true);
  });
});
