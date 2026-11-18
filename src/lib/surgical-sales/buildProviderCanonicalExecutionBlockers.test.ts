import { describe, expect, it } from "vitest";
import { buildProviderCanonicalExecutionBlockers } from "./buildProviderCanonicalExecutionBlockers";
import {
  countOverviewRiskWords,
  OVERVIEW_RISK_TITLE_MAX_WORDS,
} from "./providerOverviewRiskCopy";

describe("buildProviderCanonicalExecutionBlockers", () => {
  it("merges gaps and risks without duplicate headlines", () => {
    const blockers = buildProviderCanonicalExecutionBlockers({
      contact: {
        provider_observation_feasibility: "restricted",
        provider_procedure_focus: "hernia",
      },
      commercialStage: "early_discovery",
    });

    expect(blockers.length).toBeGreaterThan(0);
    const headlines = blockers.map((b) => b.headline.toLowerCase());
    expect(new Set(headlines).size).toBe(headlines.length);
  });

  it("uses short operational headlines without travel-risk phrasing", () => {
    const blockers = buildProviderCanonicalExecutionBlockers({
      contact: {},
      commercialStage: "early_discovery",
      relationshipStage: "prospect",
    });

    for (const blocker of blockers) {
      expect(blocker.headline).not.toMatch(/—/);
      expect(blocker.headline.toLowerCase()).not.toMatch(/travel risk|wasted or travel|protect field time/);
      expect(countOverviewRiskWords(blocker.headline)).toBeLessThanOrEqual(OVERVIEW_RISK_TITLE_MAX_WORDS);
    }
  });
});
