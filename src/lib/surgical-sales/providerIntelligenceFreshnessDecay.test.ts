import { describe, expect, it } from "vitest";
import {
  fieldReconfirmationPrompt,
  fieldSpecificStaleWarning,
  signalChangedWithoutRevalidation,
} from "./providerIntelligenceFreshnessDecay";

describe("providerIntelligenceFreshnessDecay", () => {
  it("returns procedure-mix stale copy", () => {
    expect(
      fieldSpecificStaleWarning(
        "provider_procedure_focus",
        "needs_refresh",
        "Procedure focus",
      ),
    ).toMatch(/6 months/i);
  });

  it("returns coordinator reconfirmation prompt", () => {
    expect(fieldReconfirmationPrompt("provider_observation_coordinator_contact", "needs_refresh")).toMatch(
      /coordinator/i,
    );
  });

  it("detects post-validation edits", () => {
    expect(
      signalChangedWithoutRevalidation({
        validated_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2026-01-15T00:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      signalChangedWithoutRevalidation({
        validated_at: "2026-01-15T00:00:00.000Z",
        updated_at: "2026-01-15T00:00:00.000Z",
      }),
    ).toBe(false);
  });
});
