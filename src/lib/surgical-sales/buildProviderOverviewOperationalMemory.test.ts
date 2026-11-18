import { describe, expect, it } from "vitest";

import { buildProviderIntelligenceScopeDisplay } from "./buildProviderIntelligenceScopeDisplay";
import { buildProviderOverviewOperationalMemory } from "./buildProviderOverviewOperationalMemory";

describe("buildProviderOverviewOperationalMemory", () => {
  it("returns four tactical memory lines for sparse providers", () => {
    const scope = buildProviderIntelligenceScopeDisplay({
      contact: { provider_preference_card_signals: "" },
      organizationName: "Memorial",
      providerName: "Dr. Lee",
    });

    const memory = buildProviderOverviewOperationalMemory({
      contact: { provider_preference_card_signals: "" },
      scope,
      density: "sparse",
    });

    expect(memory.lines).toHaveLength(4);
    expect(memory.lines.map((l) => l.kicker)).toEqual([
      "Last operational update",
      "Recent field learning",
      "Latest validated signal",
      "Operational intelligence freshness",
    ]);
    expect(memory.lines.some((l) => /unvalidated|forming|validation/i.test(l.line))).toBe(true);
  });

  it("surfaces metadata-driven learning and update lines", () => {
    const scope = buildProviderIntelligenceScopeDisplay({
      contact: {
        provider_procedure_focus: "Lap colorectal",
        provider_intelligence_field_metadata: {
          provider_procedure_focus: {
            source_type: "intro_call",
            source_label: "Intro call",
            updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
          provider_observation_access_path: {
            source_type: "engagement",
            source_label: "OR scheduler",
            updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
          },
        },
      },
      providerName: "Dr. Lee",
    });

    const memory = buildProviderOverviewOperationalMemory({
      contact: {
        provider_procedure_focus: "Lap colorectal",
        provider_observation_access_path: "Coordinator clears Fridays",
        provider_intelligence_field_metadata: {
          provider_procedure_focus: {
            source_type: "intro_call",
            source_label: "Intro call",
            updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
          provider_observation_access_path: {
            source_type: "engagement",
            source_label: "OR scheduler",
            updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
          },
        },
      },
      scope,
      density: "developing",
    });

    expect(memory.lines[0]?.line).toMatch(/updated/i);
    expect(memory.lines[1]?.line).toMatch(/scheduler|captured/i);
  });
});
