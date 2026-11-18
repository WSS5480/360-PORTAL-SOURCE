import { describe, expect, it } from "vitest";
import { buildProviderDiscoveryStageProgression } from "./buildProviderDiscoveryStageProgression";
import { buildProviderOverviewStageRequirementsView } from "./buildProviderOverviewStageRequirementsView";
import { buildProviderOverviewTacticalProgression } from "./buildProviderOverviewTacticalLayout";
import {
  enrichProviderOverviewWorkflowRequirements,
  formatWorkflowConfirmedDate,
  planningPatchForWorkflowApiAction,
} from "./providerOverviewWorkflowActions";
import { SALES_PATHWAY_STAGE_LABELS, SALES_PATHWAY_STAGE_OBJECTIVES } from "./providerSalesPathwayExecution";

function discoveryView(contact: Record<string, unknown>) {
  const discovery = buildProviderDiscoveryStageProgression({ contact, engagements: [] });
  const pathway = {
    stageId: "discovery" as const,
    stageLabel: SALES_PATHWAY_STAGE_LABELS.discovery,
    stageObjective: SALES_PATHWAY_STAGE_OBJECTIVES.discovery,
    progressPercent: 10,
    riskLevel: "Medium",
    confidenceLevel: "Partial",
    requirements: [],
    discoveryProgression: discovery,
    hasFieldEvidence: false,
  };
  const progression = buildProviderOverviewTacticalProgression({ pathway, contact });
  const base = buildProviderOverviewStageRequirementsView({ pathway, progression, contact });
  return enrichProviderOverviewWorkflowRequirements(base, contact);
}

describe("enrichProviderOverviewWorkflowRequirements", () => {
  it("leaves discovery overview groups without duplicated workflow rows", () => {
    const view = discoveryView({ provider_relationship_stage: "prospect" });
    expect(view.discoveryIntelligenceGroups.every((group) => group.rows.length === 0)).toBe(true);
    expect(view.accessWorkflow).toEqual([]);
  });
});

describe("planningPatchForWorkflowApiAction", () => {
  it("maps observation and pathway quick actions", () => {
    expect(planningPatchForWorkflowApiAction("mark_observation_approved")).toEqual({
      provider_observation_feasibility: "approved",
    });
    expect(planningPatchForWorkflowApiAction("mark_observation_interested")).toEqual({
      provider_evaluation_openness: "open",
    });
    expect(planningPatchForWorkflowApiAction("mark_observation_declined")).toEqual({
      provider_evaluation_openness: "closed",
    });
    expect(planningPatchForWorkflowApiAction("mark_pathway_partially_known")).toEqual({
      provider_observation_credentialing_needed: "in_progress",
    });
    expect(planningPatchForWorkflowApiAction("mark_champion_confirmed")).toEqual({
      provider_champion_potential: "high",
    });
  });
});

describe("formatWorkflowConfirmedDate", () => {
  it("formats validated metadata dates", () => {
    const validatedAt = "2026-05-20T12:00:00.000Z";
    expect(
      formatWorkflowConfirmedDate({
        source_type: "profile",
        source_label: "Manual update",
        updated_at: validatedAt,
        validated_at: validatedAt,
      }),
    ).toBeTruthy();
  });
});
