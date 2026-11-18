import { describe, expect, it } from "vitest";
import {
  normalizeSurgicalProviderActivityType,
  SURGICAL_PROVIDER_ACTIVITY_TYPES,
} from "./providerActivityLog";
import { unifiedTypeForLegacyProviderActivity } from "@/lib/activity/providerActivityDualWrite";

describe("providerActivityLog", () => {
  it("normalizeSurgicalProviderActivityType accepts all allowed DB types", () => {
    for (const t of SURGICAL_PROVIDER_ACTIVITY_TYPES) {
      expect(normalizeSurgicalProviderActivityType(t)).toBe(t);
    }
  });

  it("maps unknown types to provider_updated", () => {
    expect(normalizeSurgicalProviderActivityType("planning_section_completed")).toBe(
      "planning_section_completed",
    );
    expect(normalizeSurgicalProviderActivityType("invalid_type")).toBe("provider_updated");
  });

  it("dual-writes provider note activity as NOTE_ADDED", () => {
    expect(unifiedTypeForLegacyProviderActivity("note_added")).toBe("NOTE_ADDED");
    expect(unifiedTypeForLegacyProviderActivity("note")).toBe("NOTE_ADDED");
    expect(unifiedTypeForLegacyProviderActivity("provider_created")).toBe("PROVIDER_CREATED");
    expect(unifiedTypeForLegacyProviderActivity("planning_section_completed")).toBe(
      "PLANNING_SECTION_COMPLETED",
    );
    expect(unifiedTypeForLegacyProviderActivity("outcome_update")).toBe("OUTCOME_UPDATE_LOGGED");
    expect(unifiedTypeForLegacyProviderActivity("product_use_log")).toBe("PRODUCT_USE_LOGGED");
  });
});
