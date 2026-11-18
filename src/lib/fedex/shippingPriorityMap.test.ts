import { describe, expect, it } from "vitest";
import {
  formatFedexServiceLabel,
  serviceSupportsSaturdayDelivery,
} from "./shippingPriorityMap";

describe("serviceSupportsSaturdayDelivery", () => {
  it("allows overnight and 2-day services", () => {
    expect(serviceSupportsSaturdayDelivery("PRIORITY_OVERNIGHT")).toBe(true);
    expect(serviceSupportsSaturdayDelivery("STANDARD_OVERNIGHT")).toBe(true);
    expect(serviceSupportsSaturdayDelivery("FIRST_OVERNIGHT")).toBe(true);
    expect(serviceSupportsSaturdayDelivery("FEDEX_2_DAY")).toBe(true);
    expect(serviceSupportsSaturdayDelivery("FEDEX_2_DAY_AM")).toBe(true);
    expect(serviceSupportsSaturdayDelivery("FEDEX_EXPRESS_SAVER")).toBe(true);
  });

  it("blocks Ground", () => {
    expect(serviceSupportsSaturdayDelivery("FEDEX_GROUND")).toBe(false);
    expect(serviceSupportsSaturdayDelivery("fedex_ground")).toBe(false);
  });

  it("allows an empty service so rates can be requested first", () => {
    expect(serviceSupportsSaturdayDelivery("")).toBe(true);
    expect(serviceSupportsSaturdayDelivery(null)).toBe(true);
    expect(serviceSupportsSaturdayDelivery(undefined)).toBe(true);
  });
});

describe("formatFedexServiceLabel", () => {
  it("appends Saturday delivery when requested", () => {
    expect(formatFedexServiceLabel("PRIORITY_OVERNIGHT", { saturdayDelivery: true })).toBe(
      "FedEx Priority Overnight + Saturday delivery"
    );
  });

  it("omits Saturday delivery by default", () => {
    expect(formatFedexServiceLabel("PRIORITY_OVERNIGHT")).toBe("FedEx Priority Overnight");
  });
});
