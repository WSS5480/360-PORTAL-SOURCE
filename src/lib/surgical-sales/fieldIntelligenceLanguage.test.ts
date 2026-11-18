import { describe, expect, it } from "vitest";
import {
  buildFieldIntelligenceSummary,
  isConsultantProse,
  sanitizeFieldIntelligenceText,
} from "./fieldIntelligenceLanguage";

describe("fieldIntelligenceLanguage", () => {
  it("detects consultant speculation", () => {
    expect(
      isConsultantProse(
        "Dr. Lee performs a variety of surgical procedures, indicating potential interest in diverse product applications.",
      ),
    ).toBe(true);
    expect(
      isConsultantProse("The lack of clarity could hinder future engagement and product evaluation efforts."),
    ).toBe(true);
  });

  it("rewrites procedure mix speculation into field language", () => {
    const out = sanitizeFieldIntelligenceText(
      "Dr. Lee performs a variety of surgical procedures, indicating potential interest in diverse product applications.",
    );
    expect(out).toMatch(/open, lap, and robotic|case mix still needs confirmation/i);
    expect(out).not.toMatch(/indicating potential interest/i);
  });

  it("rewrites engagement hindrance into operational gap language", () => {
    const out = sanitizeFieldIntelligenceText(
      "The lack of clarity could hinder future engagement and product evaluation efforts.",
    );
    expect(out).toMatch(/scheduling contact still needs/i);
    expect(out).not.toMatch(/could hinder/i);
  });

  it("builds short summaries from lines", () => {
    const summary = buildFieldIntelligenceSummary([
      "Vendor credentialing is required before observation cases are approved at this facility.",
      "Open, lap, and robotic cases were mentioned, but detailed breakdown still needs validation.",
    ]);
    expect(summary.split(/[.!?]/).filter(Boolean).length).toBeLessThanOrEqual(2);
    expect(summary).not.toMatch(/could impact product acceptance/i);
  });
});
