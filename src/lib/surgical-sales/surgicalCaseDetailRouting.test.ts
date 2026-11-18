import { describe, expect, it } from "vitest";
import {
  resolveSurgicalCaseDetailVariant,
  surgicalCaseDetailVariantIsObservation,
  surgicalCaseDetailVariantIsProductSupport,
} from "./surgicalCaseDetailRouting";

describe("surgicalCaseDetailRouting", () => {
  it("maps observation case_type to observation variant", () => {
    expect(resolveSurgicalCaseDetailVariant("observation")).toBe("observation");
    expect(resolveSurgicalCaseDetailVariant("Observation")).toBe("observation");
  });

  it("maps product_support case_type to product support variant", () => {
    expect(resolveSurgicalCaseDetailVariant("product_support")).toBe("product_support");
  });

  it("defaults unknown or empty case_type to product support variant", () => {
    expect(resolveSurgicalCaseDetailVariant(null)).toBe("product_support");
    expect(resolveSurgicalCaseDetailVariant(undefined)).toBe("product_support");
    expect(resolveSurgicalCaseDetailVariant("evaluation")).toBe("product_support");
  });

  it("exposes variant type guards", () => {
    expect(surgicalCaseDetailVariantIsObservation("observation")).toBe(true);
    expect(surgicalCaseDetailVariantIsObservation("product_support")).toBe(false);
    expect(surgicalCaseDetailVariantIsProductSupport("product_support")).toBe(true);
    expect(surgicalCaseDetailVariantIsProductSupport("observation")).toBe(false);
  });
});
