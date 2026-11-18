import { describe, expect, it } from "vitest";
import { buildDiscoveryIntelligenceGroupsView } from "./buildDiscoveryIntelligenceGroupsView";
import { buildStageMappingSession } from "./buildStageMappingSession";
import {
  compareOpenStageMappingQuestions,
  groupStageMappingQuestionsByBucket,
  groupStageMappingQuestionsByIntelligenceCategory,
  pickNextOpenStageMappingQuestion,
  pickNextRequiredStageMappingQuestion,
} from "./stageMappingOperationalGroups";

describe("stageMappingOperationalGroups", () => {
  it("picks the next unresolved required item by priority", () => {
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
        },
      },
    };
    const view = buildDiscoveryIntelligenceGroupsView({ contact });
    const session = buildStageMappingSession(view, { contact });

    const groups = groupStageMappingQuestionsByBucket(session.operationalQuestions);
    const next = pickNextRequiredStageMappingQuestion(session.operationalQuestions);

    expect(groups.requiredNow.every((q) => q.visibilityBucket === "required_now")).toBe(true);
    expect(next?.signalId).not.toBe("observation_approval");
    expect(groups.confirmed.some((q) => q.signalId === "observation_approval")).toBe(true);
  });

  it("groups open and confirmed questions by intelligence category", () => {
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
        },
      },
    };
    const view = buildDiscoveryIntelligenceGroupsView({ contact });
    const session = buildStageMappingSession(view, { contact });
    const byCategory = groupStageMappingQuestionsByIntelligenceCategory(
      session.operationalQuestions,
      session.focusStage,
    );

    expect(byCategory.operational.confirmed.some((q) => q.signalId === "observation_approval")).toBe(
      true,
    );
    expect(byCategory.operational.open.every((q) => q.intelligenceCategory === "operational")).toBe(
      true,
    );
    expect(byCategory.sales.laterStage.every((q) => q.intelligenceCategory === "sales")).toBe(true);
    expect(byCategory.sales.laterStage.some((q) => q.signalId === "workflow_visibility")).toBe(
      true,
    );
    expect(byCategory.sales.open.some((q) => q.signalId === "workflow_visibility")).toBe(false);
  });

  it("prioritizes access pathway intelligence for early discovery", () => {
    const view = buildDiscoveryIntelligenceGroupsView({
      contact: { provider_relationship_stage: "prospect" },
    });
    const session = buildStageMappingSession(view);
    const next = pickNextOpenStageMappingQuestion(session.operationalQuestions, session.focusStage);

    expect(next).not.toBeNull();
    expect(next?.intelligenceCategory).toBe("operational");
    expect(session.focusStage).toBe("access_pathway");
    expect(session.intelligenceCategoryCounts.opportunityOpen).toBeGreaterThan(0);
    expect(session.intelligenceCategoryCounts.operationalOpen).toBeGreaterThan(0);
  });

  it("prioritizes low-confidence open questions ahead of medium-confidence items", () => {
    const lowConfidenceQuestion = {
      signalId: "scheduling_owner" as const,
      visibilityBucket: "required_now" as const,
      priority: 1,
      intelligenceConfidenceLevel: "low" as const,
    };
    const mediumConfidenceQuestion = {
      signalId: "observation_approval" as const,
      visibilityBucket: "required_now" as const,
      priority: 1,
      intelligenceConfidenceLevel: "medium" as const,
    };

    expect(
      compareOpenStageMappingQuestions(
        lowConfidenceQuestion as import("./buildStageMappingSession").StageMappingQuestion,
        mediumConfidenceQuestion as import("./buildStageMappingSession").StageMappingQuestion,
      ),
    ).toBeLessThan(0);
  });
});
