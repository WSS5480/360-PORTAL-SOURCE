import { describe, expect, it } from "vitest";

import { buildProviderIntelligenceScopeDisplay } from "./buildProviderIntelligenceScopeDisplay";
import { buildProviderOverviewOperationalSignals } from "./buildProviderOverviewOperationalSignals";

describe("buildProviderOverviewOperationalSignals", () => {
  it("groups attention signals with intelligence section links", () => {
    const scope = buildProviderIntelligenceScopeDisplay({
      contact: {
        provider_credentialing_status: "",
        provider_observation_access_path: "",
        provider_procedure_focus: "Lap colorectal",
      },
      organizationName: "Memorial",
      providerName: "Dr. Lee",
    });

    const groups = buildProviderOverviewOperationalSignals({
      scope,
      organizationLinked: true,
      hasObservationHistory: false,
      density: "sparse",
    });

    expect(groups.length).toBeGreaterThan(0);
    const flat = groups.flatMap((g) => g.signals);
    expect(flat.some((s) => s.severity === "attention")).toBe(true);
    expect(flat.some((s) => s.shortLabel === "Hospital affiliation")).toBe(true);
    expect(flat.some((s) => s.shortLabel === "Workflow visibility")).toBe(true);
    expect(flat.some((s) => s.chipStatus === "needs_validation")).toBe(true);

    const attention = flat.find((s) => s.severity === "attention");
    expect(attention?.sectionId).toBeTruthy();
    expect(attention?.actionHint).toMatch(/intelligence/i);
  });
});
