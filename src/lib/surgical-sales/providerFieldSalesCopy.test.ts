import { describe, expect, it } from "vitest";
import {
  fieldSalesPrimaryUnknown,
  fieldSalesStillNeedPhrase,
  formatFieldSalesStillNeedSummary,
  formatFieldSalesMissingArea,
} from "./providerFieldSalesCopy";

describe("providerFieldSalesCopy", () => {
  it("uses direct rep phrasing for still-open summaries", () => {
    expect(fieldSalesStillNeedPhrase("provider_decision_maker_status")).toBe(
      "who approves evaluations",
    );
    expect(fieldSalesStillNeedPhrase("provider_responsiveness")).toBe("how fast the office responds");
    expect(fieldSalesStillNeedPhrase("provider_champion_potential")).toBe(
      "whether anyone inside will back a new vendor",
    );
    expect(formatFieldSalesStillNeedSummary(["who approves evaluations"])).toBe(
      "Still open: who approves evaluations.",
    );
    expect(
      formatFieldSalesStillNeedSummary([
        "how fast the office responds",
        "who approves evaluations",
      ]),
    ).toBe("Still open: how fast the office responds and who approves evaluations.");
  });

  it("avoids framework jargon in missing-area mapping", () => {
    expect(formatFieldSalesMissingArea("evaluation openness")).toBe(
      "whether they'll run an evaluation",
    );
    expect(formatFieldSalesMissingArea("approval authority")).toBe("who approves evaluations");
    expect(formatFieldSalesMissingArea("engagement responsiveness")).toBe(
      "how fast the office responds",
    );
  });

  it("writes primary unknowns as one field-sales sentence", () => {
    expect(fieldSalesPrimaryUnknown("provider_ideal_observation_cases")).toBe(
      "Which procedures are realistically observable still unclear.",
    );
    expect(fieldSalesPrimaryUnknown("provider_observation_access_path")).toBe(
      "How observation access works here still unclear.",
    );
  });
});
