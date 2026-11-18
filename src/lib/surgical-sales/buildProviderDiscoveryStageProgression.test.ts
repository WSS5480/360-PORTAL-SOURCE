import { describe, expect, it } from "vitest";
import {
  buildDiscoveryReadinessItems,
  buildProviderDiscoveryStageProgression,
  resolveDiscoveryAdvancementSignal,
} from "./buildProviderDiscoveryStageProgression";

describe("buildProviderDiscoveryStageProgression", () => {
  it("treats provider observation approval as advancement, not logistics", () => {
    const contact = {
      provider_observation_feasibility: "approved",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "profile",
          source_label: "Manual",
          updated_at: "2026-05-01T00:00:00.000Z",
          validated_at: "2026-05-01T00:00:00.000Z",
        },
      },
      provider_relationship_stage: "prospect",
    };
    const model = buildProviderDiscoveryStageProgression({ contact, engagements: [] });

    expect(model.advancementSignal.met).toBe(true);
    expect(model.advancementSignal.label).toBe("Permission Confirmed");
    expect(model.progressPercent).toBe(100);
    expect(
      model.intelligenceGroups
        .find((g) => g.id === "access_readiness")
        ?.signals.some((r) => r.label.match(/scheduling owner/i)),
    ).toBe(true);
  });

  it("counts early access prep toward readiness before approval is confirmed", () => {
    const contact = {
      provider_relationship_stage: "prospect",
      provider_observation_coordinator_contact: "Maria — OR desk",
      provider_observation_access_path: "Through service line admin",
      provider_observation_best_days_case_types: "Tuesdays, general surgery",
    };
    const model = buildProviderDiscoveryStageProgression({
      contact,
      engagements: [{ id: "e1", engagement_type: "intro_call" } as never],
    });

    expect(model.advancementSignal.met).toBe(false);
    expect(model.phase).toBe("relationship_first");
    expect(model.observationReadiness.map((r) => r.id)).toContain("scheduling_owner");
    expect(model.tacticalGap).toMatch(/approval pending/i);
    expect(model.progressPercent).toBe(0);
  });

  it("does not expose redundant legacy access card ids in flattened readiness", () => {
    const model = buildProviderDiscoveryStageProgression({
      contact: {
        provider_observation_feasibility: "approved",
        provider_relationship_stage: "prospect",
      },
      engagements: [],
    });
    const ids = model.observationReadiness.map((r) => r.id);
    expect(ids).not.toContain("coordinator");
    expect(ids).not.toContain("access_path");
    expect(ids).not.toContain("credentialing");
    expect(ids).not.toContain("sponsor");
    expect(ids).toContain("scheduling_owner");
    expect(ids).toContain("facility_vendor_pathway");
  });

  it("resolves blocked advancement when observation is denied", () => {
    const signal = resolveDiscoveryAdvancementSignal({
      contact: { provider_observation_feasibility: "no" },
      phase: "access_mapping",
    });
    expect(signal.met).toBe(false);
    expect(signal.label).toMatch(/not approved/i);
  });
});
