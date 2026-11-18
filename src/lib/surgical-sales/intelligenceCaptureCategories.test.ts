import { describe, expect, it } from "vitest";
import { buildDiscoveryIntelligenceGroupsView } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { buildStageMappingSession } from "@/lib/surgical-sales/buildStageMappingSession";
import { buildIntelligenceCaptureCategoryDashboard } from "@/lib/surgical-sales/buildIntelligenceCaptureCategoryDashboard";
import {
  groupStageMappingQuestionsByCaptureCategory,
  intelligenceCaptureCategoriesForPathwayStage,
  intelligenceCaptureCategoryForSignal,
} from "@/lib/surgical-sales/intelligenceCaptureCategories";

function sessionFor(contact: Record<string, unknown> = { provider_relationship_stage: "prospect" }) {
  const view = buildDiscoveryIntelligenceGroupsView({ contact });
  return { view, session: buildStageMappingSession(view, { contact }) };
}

describe("intelligenceCaptureCategories", () => {
  it("maps observation approval to Observation Access", () => {
    expect(intelligenceCaptureCategoryForSignal("observation_approval")).toBe("observation_access");
  });

  const approvedContact = {
    provider_observation_feasibility: "approved",
    provider_intelligence_field_metadata: {
      provider_observation_feasibility: {
        source_type: "profile",
        updated_at: new Date().toISOString(),
        validated_at: new Date().toISOString(),
        lifecycle_state: "validated",
      },
    },
  };

  it("shows six discovery categories at discovery stage", () => {
    const categories = intelligenceCaptureCategoriesForPathwayStage("discovery");
    expect(categories).toHaveLength(6);
    expect(categories.map((c) => c.id)).toEqual([
      "observation_access",
      "access_pathway",
      "credentialing_facility",
      "key_people_influence",
      "clinical_focus",
      "opportunity_signals",
    ]);
    expect(categories.map((c) => c.id)).not.toContain("procedure_workflow");
  });

  it("hides Procedure Workflow during Discovery even when observation is approved", () => {
    const categories = intelligenceCaptureCategoriesForPathwayStage("discovery", approvedContact);
    expect(categories.map((c) => c.id)).not.toContain("procedure_workflow");
  });

  it("hides Procedure Workflow at observe until observation approval is on file", () => {
    const withoutApproval = intelligenceCaptureCategoriesForPathwayStage("observe", {
      provider_observation_feasibility: "interested",
    });
    expect(withoutApproval.map((c) => c.id)).not.toContain("procedure_workflow");

    const withApproval = intelligenceCaptureCategoriesForPathwayStage("observe", approvedContact);
    expect(withApproval.map((c) => c.id)).toContain("procedure_workflow");
  });

  it("unlocks observation-stage categories at observe after approval without debrief-only areas", () => {
    const categories = intelligenceCaptureCategoriesForPathwayStage("observe", approvedContact);
    expect(categories).toHaveLength(9);
    expect(categories.map((c) => c.id)).not.toContain("adoption_strategy");
    expect(categories.map((c) => c.id)).toContain("procedure_workflow");
    expect(categories.map((c) => c.id)).toContain("product_fit_evaluation");
  });

  it("defines Procedure Workflow with example finding themes", () => {
    const def = intelligenceCaptureCategoriesForPathwayStage("observe", approvedContact).find(
      (c) => c.id === "procedure_workflow",
    );
    expect(def?.description).toMatch(/how cases actually run/i);
    expect(def?.exampleFindings).toContain("Turnover issues");
    expect(def?.requiresObservationApproval).toBe(true);
  });

  it("unlocks Adoption Strategy only at debrief and later", () => {
    const debrief = intelligenceCaptureCategoriesForPathwayStage("debrief");
    expect(debrief.map((c) => c.id)).toContain("adoption_strategy");
    const discovery = intelligenceCaptureCategoriesForPathwayStage("discovery");
    expect(discovery.map((c) => c.id)).not.toContain("adoption_strategy");
  });

  it("builds dashboard cards with findings, open, and last-updated labels", () => {
    const contact = {
      provider_relationship_stage: "prospect",
      provider_observation_feasibility: "approved",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "profile",
          source_label: "Manual mapping",
          updated_at: new Date().toISOString(),
          validated_at: new Date().toISOString(),
          lifecycle_state: "validated",
          evidence_text: "Provider said observation should not be a problem.",
        },
      },
    };
    const { view, session } = sessionFor(contact);
    const groups = groupStageMappingQuestionsByCaptureCategory(
      session.operationalQuestions,
      view.pathwayStageId,
      contact,
    );
    const cards = buildIntelligenceCaptureCategoryDashboard({
      questions: session.operationalQuestions,
      contact,
      pathwayStageId: view.pathwayStageId,
    });

    const accessCard = cards.find((c) => c.id === "observation_access");
    expect(accessCard).toBeTruthy();
    expect(accessCard?.findingsCount).toBeGreaterThanOrEqual(1);
    expect(accessCard?.status).toBe("complete");
    expect(accessCard?.findingsLabel).toMatch(/Finding/);
    expect(accessCard?.lastUpdatedLabel).toMatch(/Updated today/i);
    expect(groups.observation_access.confirmed.length).toBeGreaterThanOrEqual(1);
  });
});
