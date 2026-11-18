import { describe, expect, it } from "vitest";

import {
  compareDebriefExtractionParity,
  PARITY_COVERAGE_TARGET,
  parityGatePasses,
} from "@/lib/surgical-sales/universalExtractor/compareDebriefExtractionParity";
import { DEBRIEF_EXTRACTION_PARITY_FIXTURES } from "@/lib/surgical-sales/universalExtractor/debriefExtractionParityFixtures";

describe("compareDebriefExtractionParity", () => {
  for (const fixture of DEBRIEF_EXTRACTION_PARITY_FIXTURES) {
    it(`meets parity gate for ${fixture.id}`, () => {
      const result = compareDebriefExtractionParity(fixture);
      expect(result.garbageProducts, `garbage products in ${fixture.id}`).toEqual([]);
      expect(
        result.aggregateCoverage,
        `coverage ${result.aggregateCoverage} below ${PARITY_COVERAGE_TARGET} for ${fixture.id}`,
      ).toBeGreaterThanOrEqual(PARITY_COVERAGE_TARGET);
      expect(parityGatePasses(result)).toBe(true);
    });
  }

  it("Tom Sandy fixture has semantic parity coverage", () => {
    const fixture = DEBRIEF_EXTRACTION_PARITY_FIXTURES.find((item) => item.id === "tom_sandy_jennifer_intro");
    expect(fixture).toBeDefined();
    const result = compareDebriefExtractionParity(fixture!);
    expect(parityGatePasses(result)).toBe(true);
  });

  it("Sandy Berry fixture has semantic parity coverage", () => {
    const fixture = DEBRIEF_EXTRACTION_PARITY_FIXTURES.find((item) => item.id === "sandy_berry_intro");
    expect(fixture).toBeDefined();
    const result = compareDebriefExtractionParity(fixture!);
    expect(parityGatePasses(result)).toBe(true);
  });

  it("Dr Fig-style dictation does not produce garbled Acumed product name", () => {
    const fixture = DEBRIEF_EXTRACTION_PARITY_FIXTURES.find((item) => item.id === "dr_fig_procedure_volume");
    expect(fixture).toBeDefined();
    const result = compareDebriefExtractionParity(fixture!);
    expect(result.garbageProducts).toEqual([]);
    const productRows = [...result.dipRows, ...result.ufRows].filter(
      (row) => row.section === "product_intelligence",
    );
    for (const row of productRows) {
      expect(row.headline).not.toMatch(/\b(for|many|of)\b/i);
    }
  });
});
