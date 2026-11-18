import { describe, expect, it } from "vitest";
import { formatReviewSaveScopeDisplay } from "./logUpdateReviewScopeDisplay";
import type { LogUpdateRoutedFieldUpdate } from "./logUpdateProviderRouting";

function field(
  partial: Partial<LogUpdateRoutedFieldUpdate> & { dbKey: string },
): LogUpdateRoutedFieldUpdate {
  return {
    id: "f1",
    label: "Test",
    proposedValue: "value",
    accepted: true,
    conflict: null,
    scopeReason: "",
    destinationReason: "",
    ...partial,
  };
}

describe("formatReviewSaveScopeDisplay", () => {
  it("shows provider-only scope for surgeon-specific updates", () => {
    const display = formatReviewSaveScopeDisplay(
      field({
        dbKey: "provider_procedure_mix",
        proposedScope: "provider",
        proposedDestination: "provider",
        label: "Procedure mix partially mapped",
      }),
    );
    expect(display).toEqual({ primaryLabel: "Provider", secondaryNote: null });
  });

  it("shows facility with hospital sharing note from provider workspace", () => {
    const display = formatReviewSaveScopeDisplay(
      field({
        dbKey: "provider_ideal_observation_process",
        proposedScope: "organization",
        proposedDestination: "facility",
        label: "Scheduling process",
      }),
      { organizationLabel: "Test Hospital", fromProviderWorkspace: true },
    );
    expect(display.primaryLabel).toBe("Organization Intelligence");
    expect(display.secondaryNote).toMatch(/Shared across providers at Test Hospital/);
  });

  it("shows organization intelligence for facility-wide coordinator contact", () => {
    const display = formatReviewSaveScopeDisplay(
      field({
        dbKey: "provider_observation_coordinator_contact",
        proposedScope: "organization",
        proposedDestination: "facility",
        label: "Scheduler approves observation requests",
      }),
      { organizationLabel: "Test Hospital", fromProviderWorkspace: true },
    );
    expect(display.primaryLabel).toBe("Organization Intelligence");
    expect(display.secondaryNote).toMatch(/Shared across providers at Test Hospital/);
  });

  it("shows organization intelligence for facility-class access fields", () => {
    const display = formatReviewSaveScopeDisplay(
      field({
        dbKey: "provider_observation_access_path",
        proposedScope: "organization",
        proposedDestination: "provider",
        label: "Vendor credentialing required",
      }),
    );
    expect(display).toEqual({ primaryLabel: "Organization Intelligence", secondaryNote: null });
  });

  it("shows engagement touch note scope", () => {
    const display = formatReviewSaveScopeDisplay(
      field({
        dbKey: "engagement",
        proposedScope: "case",
        proposedDestination: "engagement_note",
        label: "Intro call debrief",
      }),
    );
    expect(display.primaryLabel).toBe("Engagement");
    expect(display.secondaryNote).toMatch(/touch/i);
  });
});
