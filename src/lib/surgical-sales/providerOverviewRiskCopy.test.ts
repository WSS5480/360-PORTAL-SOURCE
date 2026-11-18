import { describe, expect, it } from "vitest";
import {
  OVERVIEW_RISK_TITLE_MAX_WORDS,
  countOverviewRiskWords,
  overviewRiskFieldDescription,
  overviewRiskTitle,
  sanitizeOverviewRiskTitle,
} from "./providerOverviewRiskCopy";

describe("providerOverviewRiskCopy", () => {
  it("keeps mapped titles within word limit", () => {
    const title = overviewRiskTitle({ dbKey: "provider_observation_feasibility" });
    expect(countOverviewRiskWords(title)).toBeLessThanOrEqual(OVERVIEW_RISK_TITLE_MAX_WORDS);
    expect(title).toBe("Observation not confirmed");
  });

  it("strips dash clauses and banned travel phrasing", () => {
    const title = sanitizeOverviewRiskTitle(
      "Wasted OR travel — OR travel risk is high",
    );
    expect(title.toLowerCase()).not.toMatch(/wasted or travel/);
    expect(title).not.toMatch(/—/);
    expect(countOverviewRiskWords(title)).toBeLessThanOrEqual(OVERVIEW_RISK_TITLE_MAX_WORDS);
  });

  it("maps protect dimension without travel wording", () => {
    const title = overviewRiskTitle({ protectDimensionId: "wasted_or_travel" });
    expect(title.toLowerCase()).not.toMatch(/travel/);
    expect(title).toBe("OR access not confirmed");
  });

  it("returns direct field descriptions without assuming tone", () => {
    const line = overviewRiskFieldDescription({ dbKey: "provider_observation_coordinator_contact" });
    expect(line).toMatch(/scheduling owner/i);
    expect(line).not.toMatch(/assuming/i);
  });
});
