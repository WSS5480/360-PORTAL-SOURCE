import { describe, expect, it } from "vitest";
import {
  OBSERVATION_DICTATION_SCENARIOS,
  ROBOTIC_VENTRAL_HERNIA_DICTATION,
  factLabelsFromDictation,
  whatWeKnowFromObservationDictations,
} from "@/lib/surgical-sales/observationDictationIntelligenceFixtures";

describe("observation dictation intelligence (universal rules)", () => {
  it("extracts the robotic ventral hernia note without fake products or routine false positives", () => {
    const labels = factLabelsFromDictation(ROBOTIC_VENTRAL_HERNIA_DICTATION);

    expect(labels).toMatch(/Bard Soft Mesh/i);
    expect(labels).toMatch(/AmchoPlast|Amchoplast/i);
    expect(labels).toMatch(/robotic ventral hernia/i);
    expect(labels).toMatch(/conformability|flexibility|larger defects?/i);
    expect(labels).toMatch(/email|clinical data|published/i);
    expect(labels).toMatch(/reach out.*(?:three|3)\s+weeks?/i);
    expect(labels).toMatch(/Sarah/i);
    expect(labels).toMatch(/willing to evaluate|evaluate.*observation/i);

    expect(labels).not.toMatch(/(?:Current|Competitor) product:\s*Commented That/i);
    expect(labels).not.toMatch(/Routine or smooth case progression/i);
  });

  for (const scenario of OBSERVATION_DICTATION_SCENARIOS) {
    it(`scenario: ${scenario.name}`, () => {
      const labels = factLabelsFromDictation(scenario.dictation);
      for (const pattern of scenario.expectVisible) {
        expect(labels, `missing ${pattern} in:\n${labels}`).toMatch(pattern);
      }
      for (const pattern of scenario.expectHidden) {
        expect(labels, `unexpected ${pattern} in:\n${labels}`).not.toMatch(pattern);
      }
    });
  }

  it("rolls 5 observations into counted What We Know lines without duplicate product junk", () => {
    const whatWeKnow = whatWeKnowFromObservationDictations();

    expect(whatWeKnow).toMatch(/Bard Soft Mesh/i);
    expect(whatWeKnow).toMatch(/seen in [2-5] of 5 observations/i);
    expect(whatWeKnow).toMatch(/Sarah/i);
    expect(whatWeKnow).toMatch(/AmchoPlast|Amchoplast/i);

    expect(whatWeKnow).not.toMatch(/Commented That/i);

    const bardLines = whatWeKnow
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /Bard Soft Mesh/i.test(line));
    expect(bardLines.length).toBeGreaterThanOrEqual(1);
    expect(bardLines.length).toBeLessThanOrEqual(2);
  });
});
