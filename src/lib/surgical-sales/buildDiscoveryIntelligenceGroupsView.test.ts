import { describe, expect, it } from "vitest";
import { buildDiscoveryIntelligenceGroupsView } from "./buildDiscoveryIntelligenceGroupsView";
import { DISCOVERY_FIELD_STATUS } from "./discoveryIntelligenceSignalStatus";

const F = DISCOVERY_FIELD_STATUS;

describe("buildDiscoveryIntelligenceGroupsView", () => {
  it("returns three discovery intelligence groups with structured signals", () => {
    const view = buildDiscoveryIntelligenceGroupsView({
      contact: {
        provider_relationship_stage: "early_discovery",
        provider_observation_feasibility: "restricted",
        provider_observation_coordinator_contact: "Jane — OR desk",
      },
      relationshipStage: "early_discovery",
    });

    expect(view.pathwayStageLabel).toBe("Discovery");
    expect(view.groups.map((g) => g.id)).toEqual([
      "access_readiness",
      "clinical_fit",
      "champion_landscape",
    ]);
    expect(view.priorityUnknowns.map((u) => u.summary)).toEqual([
      "Approval signals captured in the field — not yet validated for planning.",
      "Scheduling contact needs confirmation on file.",
      "Vendor access requirements remain unclear.",
    ]);

    const access = view.groups.find((g) => g.id === "access_readiness")!;
    expect(access.rows.map((r) => r.label)).toEqual([
      "Observation approval",
      "Scheduling owner",
      "Facility and vendor access",
      "Observation timing",
    ]);
    expect(access.framing.whatIsUncertain).toMatch(/not yet validated|needs confirmation|remain unclear/i);
    expect(access.framing.resolvingAction).toBe("Confirm approval");
    expect(access.rows[0]?.statusLabel).toBe(F.captured);
    expect(access.rows[0]?.confidenceLabel).toMatch(/Awaiting validation on file/i);
    expect(access.rows[1]?.statusLabel).toBe(F.captured);
    expect(access.rows.map((r) => r.priority)).toEqual([1, 1, 1, 2]);
    expect(access.rows[0]?.primaryActions.map((a) => a.label)).toEqual([
      "Confirm approval",
      "Note declined",
      "Note interest",
    ]);
    expect(access.rows[1]?.primaryActions.map((a) => a.label)).toEqual(["Name owner", "Add owner"]);
    expect(access.progress.percent).toBe(33);
    expect(access.progress.label).toBe("33% clear");
  });

  it("orders clinical fit signals by priority tier", () => {
    const view = buildDiscoveryIntelligenceGroupsView({
      contact: { provider_relationship_stage: "early_discovery" },
      relationshipStage: "early_discovery",
    });

    const clinical = view.groups.find((g) => g.id === "clinical_fit")!;
    expect(clinical.rows.map((r) => r.priority)).toEqual([2, 2, 3]);
    expect(clinical.rows.map((r) => r.label)).toEqual([
      "Procedure workflow",
      "Product fit",
      "Case opportunity",
    ]);
  });

  it("omits next uncertainties when access gate signals are validated", () => {
    const view = buildDiscoveryIntelligenceGroupsView({
      contact: {
        provider_relationship_stage: "early_discovery",
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "profile",
            source_label: "Manual",
            updated_at: "2026-05-01T00:00:00.000Z",
            validated_at: "2026-05-01T00:00:00.000Z",
          },
          provider_observation_coordinator_contact: {
            source_type: "profile",
            source_label: "Manual",
            updated_at: "2026-05-01T00:00:00.000Z",
            validated_at: "2026-05-01T00:00:00.000Z",
          },
          provider_observation_access_path: {
            source_type: "profile",
            source_label: "Manual",
            updated_at: "2026-05-01T00:00:00.000Z",
            validated_at: "2026-05-01T00:00:00.000Z",
          },
        },
        provider_observation_coordinator_contact: "Jane — OR desk",
        provider_observation_access_path: "Through service line",
      },
      relationshipStage: "early_discovery",
    });

    expect(view.priorityUnknowns.map((u) => u.signalId)).not.toContain("observation_approval");
    expect(view.priorityUnknowns.length).toBeLessThanOrEqual(3);
  });
});
