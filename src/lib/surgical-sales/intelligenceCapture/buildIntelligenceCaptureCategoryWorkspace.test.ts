import { describe, expect, it } from "vitest";
import { buildDiscoveryIntelligenceGroupsView } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { buildStageMappingSession } from "@/lib/surgical-sales/buildStageMappingSession";
import { groupStageMappingQuestionsByCaptureCategory } from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { buildIntelligenceCaptureCategoryWorkspace } from "@/lib/surgical-sales/intelligenceCapture/buildIntelligenceCaptureCategoryWorkspace";

function workspaceFor(contact: Record<string, unknown>) {
  const view = buildDiscoveryIntelligenceGroupsView({ contact });
  const session = buildStageMappingSession(view, { contact });
  const groups = groupStageMappingQuestionsByCaptureCategory(
    session.operationalQuestions,
    view.pathwayStageId,
  );
  return buildIntelligenceCaptureCategoryWorkspace({
    categoryId: "observation_access",
    contact,
    slice: groups.observation_access,
  });
}

describe("buildIntelligenceCaptureCategoryWorkspace", () => {
  it("builds Observation Access progress with findings, open questions, and confirmed counts", () => {
    const contact = {
      provider_relationship_stage: "prospect",
      provider_observation_feasibility: "approved",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "profile",
          source_label: "Field capture",
          updated_at: new Date().toISOString(),
          validated_at: new Date().toISOString(),
          lifecycle_state: "validated",
          evidence_text: "Provider said observation should not be a problem.",
        },
      },
    };

    const workspace = workspaceFor(contact);

    expect(workspace.name).toBe("Observation Access");
    expect(workspace.progress.label).toBe("Observation Access Progress");
    expect(workspace.progress.status).toBe("complete");
    expect(workspace.progress.findingsCaptured).toBeGreaterThanOrEqual(1);
    expect(workspace.progress.confirmed).toBeGreaterThanOrEqual(1);
    expect(workspace.progress.findingsLabel).toMatch(/Finding/);
    expect(workspace.confirmedFindings.length).toBeGreaterThanOrEqual(1);
    expect(workspace.supportingEvidence.length).toBeGreaterThanOrEqual(1);
    expect(workspace.supportingEvidence[0]?.quote).toContain("should not be a problem");
    expect(workspace.recentUpdates.length).toBeGreaterThanOrEqual(1);
  });

  it("lists open questions only from the active category slice", () => {
    const contact = { provider_relationship_stage: "prospect" };
    const view = buildDiscoveryIntelligenceGroupsView({ contact });
    const session = buildStageMappingSession(view, { contact });
    const groups = groupStageMappingQuestionsByCaptureCategory(
      session.operationalQuestions,
      view.pathwayStageId,
    );

    const accessWorkspace = buildIntelligenceCaptureCategoryWorkspace({
      categoryId: "observation_access",
      contact,
      slice: groups.observation_access,
    });
    const pathwayWorkspace = buildIntelligenceCaptureCategoryWorkspace({
      categoryId: "access_pathway",
      contact,
      slice: groups.access_pathway,
    });

    expect(accessWorkspace.openQuestions.every((q) => q.signalId === "observation_approval")).toBe(
      true,
    );
    expect(pathwayWorkspace.openQuestions.every((q) =>
      ["scheduling_owner", "observation_logistics"].includes(q.signalId),
    )).toBe(true);
  });
});
