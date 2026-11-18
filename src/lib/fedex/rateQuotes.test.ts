import { describe, expect, it } from "vitest";
import {
  fedexServiceTypesMatch,
  findPreferredQuote,
  parseRateReplyDetails,
  parseRatedNetCharge,
  preferredServiceUnavailableMessage,
} from "./rateQuotes";

describe("fedexServiceTypesMatch", () => {
  it("matches Priority Overnight with or without a FEDEX_ prefix", () => {
    expect(fedexServiceTypesMatch("PRIORITY_OVERNIGHT", "PRIORITY_OVERNIGHT")).toBe(true);
    expect(fedexServiceTypesMatch("PRIORITY_OVERNIGHT", "FEDEX_PRIORITY_OVERNIGHT")).toBe(true);
    expect(fedexServiceTypesMatch("first-overnight", "FIRST_OVERNIGHT")).toBe(true);
  });

  it("does not treat Priority Overnight as Ground", () => {
    expect(fedexServiceTypesMatch("PRIORITY_OVERNIGHT", "FEDEX_GROUND")).toBe(false);
    expect(fedexServiceTypesMatch("FIRST_OVERNIGHT", "PRIORITY_OVERNIGHT")).toBe(false);
  });
});

describe("findPreferredQuote", () => {
  const quotes = [
    { serviceType: "FEDEX_GROUND", totalNetCharge: 12.1 },
    { serviceType: "FEDEX_2_DAY", totalNetCharge: 28.4 },
    { serviceType: "PRIORITY_OVERNIGHT", totalNetCharge: 64.2 },
  ];

  it("selects the requested overnight service instead of the cheapest quote", () => {
    expect(findPreferredQuote(quotes, "PRIORITY_OVERNIGHT")).toEqual({
      serviceType: "PRIORITY_OVERNIGHT",
      totalNetCharge: 64.2,
    });
  });

  it("returns null instead of falling back to Ground when the requested service is missing", () => {
    expect(findPreferredQuote(quotes.slice(0, 2), "PRIORITY_OVERNIGHT")).toBeNull();
    expect(findPreferredQuote(quotes, "")).toBeNull();
  });
});

describe("parseRateReplyDetails", () => {
  it("keeps Priority Overnight when the charge is nested and prefers ACCOUNT over LIST", () => {
    const quotes = parseRateReplyDetails([
      {
        serviceType: "FEDEX_GROUND",
        ratedShipmentDetails: [{ rateType: "LIST", totalNetCharge: 18 }, { rateType: "ACCOUNT", totalNetCharge: 11.5 }],
      },
      {
        serviceType: "PRIORITY_OVERNIGHT",
        ratedShipmentDetails: [
          {
            rateType: "ACCOUNT",
            shipmentRateDetail: { totalNetCharge: { amount: "64.20" } },
          },
        ],
      },
    ]);

    expect(quotes).toEqual([
      { serviceType: "FEDEX_GROUND", totalNetCharge: 11.5 },
      { serviceType: "PRIORITY_OVERNIGHT", totalNetCharge: 64.2 },
    ]);
  });
});

describe("parseRatedNetCharge", () => {
  it("reads numeric, amount-object, and shipmentRateDetail charges", () => {
    expect(parseRatedNetCharge({ totalNetCharge: 9.5 })).toBe(9.5);
    expect(parseRatedNetCharge({ totalNetCharge: { amount: 10.25 } })).toBe(10.25);
    expect(parseRatedNetCharge({ shipmentRateDetail: { totalNetFedExCharge: "7" } })).toBe(7);
  });
});

describe("preferredServiceUnavailableMessage", () => {
  it("lists available rates and does not imply Ground was selected", () => {
    const msg = preferredServiceUnavailableMessage("PRIORITY_OVERNIGHT", [
      { serviceType: "FEDEX_GROUND", totalNetCharge: 12.1 },
    ]);
    expect(msg).toContain("FedEx Priority Overnight is not available");
    expect(msg).toContain("FedEx Ground ($12.10)");
    expect(msg).toContain("The selected service was not changed");
  });
});
