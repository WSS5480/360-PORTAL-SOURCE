import { describe, expect, it } from "vitest";
import { addressHasMinimum } from "@/lib/accounts/accountAddressMinimum";

describe("addressHasMinimum", () => {
  it("requires line1, city, and postal", () => {
    expect(addressHasMinimum(null)).toBe(false);
    expect(addressHasMinimum({ line1: "123 Main", city: "Austin" })).toBe(false);
    expect(addressHasMinimum({ line1: "123 Main", city: "Austin", postal: "78701" })).toBe(true);
  });
});
