import { describe, expect, it } from "vitest";
import { DISCOVERY_FIELD_STATUS } from "./discoveryIntelligenceSignalStatus";
import { resolveStageMappingVisibilityBucket } from "./stageMappingQuestionRegistry";
import { buildPathwayIntelligenceForStage } from "./pathwayStageIntelligence";

describe("resolveStageMappingVisibilityBucket", () => {
  const prospectGaps = [
    ...buildPathwayIntelligenceForStage("discovery", { contact: {} }),
    ...buildPathwayIntelligenceForStage("observe", { contact: {} }),
  ];

  it("places validated intelligence in confirmed only", () => {
    const bucket = resolveStageMappingVisibilityBucket({
      signalId: "observation_approval",
      pathwayStageId: "discovery",
      maturity: "confirmed",
      statusLabel: DISCOVERY_FIELD_STATUS.validated,
      dbKeys: ["provider_observation_feasibility"],
      fieldMeta: {
        provider_observation_feasibility: {
          validated_at: "2026-01-01",
          lifecycle_state: "validated",
        },
      },
      pathwayGaps: prospectGaps,
    });

    expect(bucket).toBe("confirmed");
  });

  it("routes discovery→observe access gaps to helpful next", () => {
    for (const signalId of [
      "observation_approval",
      "scheduling_owner",
      "facility_vendor_pathway",
    ] as const) {
      const bucket = resolveStageMappingVisibilityBucket({
        signalId,
        pathwayStageId: "discovery",
        maturity: "unknown",
        statusLabel: DISCOVERY_FIELD_STATUS.unknown,
        dbKeys: [],
        fieldMeta: {},
        pathwayGaps: prospectGaps,
      });
      expect(bucket).toBe("helpful_next");
    }
  });

  it("routes helpful signals to helpful next when gaps are closed", () => {
    const closedGaps = prospectGaps.map((g) => ({ ...g, met: true }));

    expect(
      resolveStageMappingVisibilityBucket({
        signalId: "clinical_champion",
        pathwayStageId: "discovery",
        maturity: "unknown",
        statusLabel: DISCOVERY_FIELD_STATUS.unknown,
        dbKeys: ["provider_champion_potential"],
        fieldMeta: {},
        pathwayGaps: closedGaps,
      }),
    ).toBe("helpful_next");

    expect(
      resolveStageMappingVisibilityBucket({
        signalId: "workflow_visibility",
        pathwayStageId: "discovery",
        maturity: "unknown",
        statusLabel: DISCOVERY_FIELD_STATUS.unknown,
        dbKeys: ["provider_workflow_pain_points"],
        fieldMeta: {},
        pathwayGaps: closedGaps,
      }),
    ).toBe("helpful_next");
  });

  it("keeps needs-validation on operational signals in helpful next", () => {
    const bucket = resolveStageMappingVisibilityBucket({
      signalId: "scheduling_owner",
      pathwayStageId: "discovery",
      maturity: "partial",
      statusLabel: DISCOVERY_FIELD_STATUS.captured,
      dbKeys: ["provider_observation_scheduling_control"],
      fieldMeta: {
        provider_observation_scheduling_control: {
          discovery_stance: "needs_validation",
          lifecycle_state: "captured",
        },
      },
      pathwayGaps: prospectGaps.map((g) =>
        g.id === "scheduling_owner" ? { ...g, met: true } : g,
      ),
    });

    expect(bucket).toBe("helpful_next");
  });

  it("routes needs-validation on helpful signals to helpful next", () => {
    const bucket = resolveStageMappingVisibilityBucket({
      signalId: "clinical_champion",
      pathwayStageId: "discovery",
      maturity: "likely",
      statusLabel: DISCOVERY_FIELD_STATUS.captured,
      dbKeys: ["provider_champion_potential"],
      fieldMeta: {
        provider_champion_potential: {
          discovery_stance: "needs_validation",
          lifecycle_state: "captured",
        },
      },
      pathwayGaps: prospectGaps,
    });

    expect(bucket).toBe("helpful_next");
  });
});
