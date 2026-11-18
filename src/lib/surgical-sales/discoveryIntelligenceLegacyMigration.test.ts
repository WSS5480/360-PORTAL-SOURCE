import { describe, expect, it } from "vitest";
import {
  hydrateDiscoveryContactFromLegacy,
  LEGACY_DISCOVERY_LABEL_ALIASES,
  migrateDiscoveryIntelligenceFieldMetadata,
  normalizeLegacyDiscoveryDisplayLabel,
  normalizeLegacyDiscoveryWorkflowRowId,
} from "./discoveryIntelligenceLegacyMigration";

describe("discoveryIntelligenceLegacyMigration", () => {
  it("maps retired readiness row ids to consolidated workflow ids", () => {
    expect(normalizeLegacyDiscoveryWorkflowRowId("coordinator")).toBe("scheduling_owner");
    expect(normalizeLegacyDiscoveryWorkflowRowId("access_path")).toBe("facility_vendor_pathway");
    expect(normalizeLegacyDiscoveryWorkflowRowId("credentialing")).toBe("facility_vendor_pathway");
    expect(normalizeLegacyDiscoveryWorkflowRowId("sponsor")).toBe("clinical_champion");
    expect(normalizeLegacyDiscoveryWorkflowRowId("observation_pathway_approval")).toBe(
      "observation_approval_status",
    );
  });

  it("normalizes legacy display labels to consolidated signal labels", () => {
    expect(normalizeLegacyDiscoveryDisplayLabel("Facility access pathway mapped")).toBe(
      LEGACY_DISCOVERY_LABEL_ALIASES["Facility access pathway mapped"],
    );
    expect(normalizeLegacyDiscoveryDisplayLabel("OR access sponsor identified")).toBe(
      "Clinical champion identified",
    );
    expect(normalizeLegacyDiscoveryDisplayLabel("Observation pathway approval pending")).toBe(
      "Observation approval status",
    );
  });

  it("migrates validation metadata from legacy signal keys without dropping history", () => {
    const migrated = migrateDiscoveryIntelligenceFieldMetadata({
      coordinator: {
        source_type: "profile",
        source_label: "Field note",
        updated_at: "2026-05-01T12:00:00.000Z",
        validated_at: "2026-05-02T12:00:00.000Z",
      },
    });
    expect(migrated.provider_observation_coordinator_contact?.validated_at).toBe(
      "2026-05-02T12:00:00.000Z",
    );
    expect(migrated.coordinator).toBeUndefined();
  });

  it("hydrates champion from legacy sponsor notes on access path when champion field is empty", () => {
    const hydrated = hydrateDiscoveryContactFromLegacy({
      provider_observation_access_path: "Dr. Lee is the internal sponsor for observation",
      provider_champion_potential: "",
    });
    expect(String(hydrated.provider_champion_potential ?? "")).toMatch(/sponsor/i);
    expect(hydrated.provider_observation_access_path).toMatch(/sponsor/i);
  });

  it("does not overwrite existing champion capture during hydration", () => {
    const hydrated = hydrateDiscoveryContactFromLegacy({
      provider_observation_access_path: "Internal sponsor noted",
      provider_champion_potential: "high|Validated champion",
    });
    expect(hydrated.provider_champion_potential).toBe("high|Validated champion");
  });
});
