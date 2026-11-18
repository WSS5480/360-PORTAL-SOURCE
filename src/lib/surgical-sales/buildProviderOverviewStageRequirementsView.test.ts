import { describe, expect, it } from "vitest";
import { buildProviderDiscoveryStageProgression } from "./buildProviderDiscoveryStageProgression";
import { buildProviderOverviewStageRequirementsView } from "./buildProviderOverviewStageRequirementsView";
import { buildProviderOverviewTacticalProgression } from "./buildProviderOverviewTacticalLayout";
import { DISCOVERY_OVERVIEW_GROUP_COPY } from "./providerOverviewBriefingCopy";
import { DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE } from "./providerOverviewDiscoveryNextMove";
import { SALES_PATHWAY_STAGE_LABELS, SALES_PATHWAY_STAGE_OBJECTIVES } from "./providerSalesPathwayExecution";

describe("buildProviderOverviewStageRequirementsView", () => {
  it("summarizes discovery intelligence groups without duplicating workflow rows", () => {
    const contact = { provider_relationship_stage: "prospect" };
    const discovery = buildProviderDiscoveryStageProgression({
      contact,
      engagements: [{ id: "e1", engagement_type: "intro_call", status: "scheduled" } as never],
    });
    const pathway = {
      stageId: "discovery" as const,
      stageLabel: SALES_PATHWAY_STAGE_LABELS.discovery,
      stageObjective: SALES_PATHWAY_STAGE_OBJECTIVES.discovery,
      progressPercent: 10,
      riskLevel: "Medium",
      confidenceLevel: "Partial",
      requirements: [],
      discoveryProgression: discovery,
      hasFieldEvidence: true,
    };
    const progression = buildProviderOverviewTacticalProgression({ pathway, contact });

    const view = buildProviderOverviewStageRequirementsView({
      pathway,
      progression,
      contact,
      engagements: [{ id: "e1", engagement_type: "intro_call", status: "scheduled" }],
    });

    expect(view.discoveryIntelligenceGroups.map((g) => g.id)).toEqual([
      "clinical_fit",
      "champion_landscape",
    ]);
    const clinical = view.discoveryIntelligenceGroups.find((g) => g.id === "clinical_fit")!;
    expect(clinical.subtitle).toBe(DISCOVERY_OVERVIEW_GROUP_COPY.clinical_fit.subtitle);
    expect(clinical.summary).toBe("Opens after observation approval");
    expect(clinical.rows).toEqual([]);
    expect(view.accessWorkflow).toEqual([]);
    expect(view.showAccessEarlyPrepHint).toBe(false);
    expect(view.pathwayNextMove).toBe(DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.obtainApproval);
  });

  it("derives pathway next move from access readiness after approval", () => {
    const contact = {
      provider_observation_feasibility: "approved",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "profile",
          source_label: "Test",
          updated_at: "2026-05-20T12:00:00.000Z",
          validated_at: "2026-05-20T12:00:00.000Z",
        },
      },
      provider_relationship_stage: "prospect",
    };
    const discovery = buildProviderDiscoveryStageProgression({ contact, engagements: [] });
    const pathway = {
      stageId: "discovery" as const,
      stageLabel: SALES_PATHWAY_STAGE_LABELS.discovery,
      stageObjective: SALES_PATHWAY_STAGE_OBJECTIVES.discovery,
      progressPercent: 70,
      riskLevel: "Medium",
      confidenceLevel: "Partial",
      requirements: [],
      discoveryProgression: discovery,
      hasFieldEvidence: true,
    };
    const progression = buildProviderOverviewTacticalProgression({ pathway, contact });

    const view = buildProviderOverviewStageRequirementsView({ pathway, progression, contact });

    expect(view.accessWorkflow).toEqual([]);
    expect(view.pathwayNextMove).toBe(DISCOVERY_WORKFLOW_NEXT_FIELD_MOVE.schedulingOwner);
  });
});
