import { describe, expect, it } from "vitest";
import { buildDiscoveryIntelligenceGroupsView } from "./buildDiscoveryIntelligenceGroupsView";
import { buildStageMappingSession, splitStageMappingSectionQuestions } from "./buildStageMappingSession";
import { STAGE_MAPPING_SIGNAL_SPECS } from "./stageMappingQuestions";

describe("buildStageMappingSession", () => {
  it("builds sections and open uncertainty count for early discovery", () => {
    const view = buildDiscoveryIntelligenceGroupsView({
      contact: { provider_relationship_stage: "prospect" },
    });
    const session = buildStageMappingSession(view);

    expect(session.sections).toHaveLength(4);
    expect(session.openUncertainties).toBeGreaterThan(0);
    expect(session.nextUnresolved?.signalId).toBeTruthy();
    expect(session.sections[0]?.questions.length).toBeGreaterThan(0);
  });

  it("tracks intelligence category counts and next unresolved question", () => {
    const view = buildDiscoveryIntelligenceGroupsView({
      contact: { provider_relationship_stage: "prospect" },
    });
    const session = buildStageMappingSession(view);

    expect(session.priorityCounts.requiredRemaining).toBe(0);
    expect(session.priorityCounts.helpfulOpen).toBeGreaterThan(0);
    expect(session.priorityCounts.laterOpen).toBeGreaterThan(0);
    expect(session.deferLaterStage).toBe(false);
    expect(session.intelligenceCategoryCounts.opportunityOpen).toBeGreaterThan(0);
    expect(session.intelligenceCategoryCounts.operationalOpen).toBeGreaterThan(0);
    expect(session.intelligenceCategoryCounts.salesOpen).toBeGreaterThan(0);
    expect(session.nextUnresolved?.intelligenceCategory).toBeTruthy();
    expect(
      session.operationalQuestions.every(
        (q) =>
          q.intelligenceCategory === "operational" ||
          q.intelligenceCategory === "sales" ||
          q.intelligenceCategory === "opportunity",
      ),
    ).toBe(true);
  });

  it("attaches contextual answer specs per signal", () => {
    const view = buildDiscoveryIntelligenceGroupsView({
      contact: { provider_relationship_stage: "prospect" },
    });
    const session = buildStageMappingSession(view);
    const approval = session.sections
      .flatMap((s) => s.questions)
      .find((q) => q.signalId === "observation_approval");

    expect(approval?.answerSpec.questionType).toBe("approval");
    expect(approval?.answerSpec.expectationLevel).toBe("helpful");
    expect(approval?.answerSpec.expectationHelper).toContain("field work");
    expect(approval?.answerSpec.choices.map((c) => c.value)).toEqual([
      "approved",
      "partial",
      "pending",
      "declined",
    ]);

    const scheduling = session.sections
      .flatMap((s) => s.questions)
      .find((q) => q.signalId === "scheduling_owner");

    expect(scheduling?.answerSpec.questionType).toBe("ownership");
    expect(scheduling?.answerSpec.expectationLevel).toBe("helpful");
    expect(scheduling?.answerSpec.structuredForm).toBe("scheduling_ownership");
    expect(scheduling?.answerSpec.choices.some((c) => c.value === "provider_office")).toBe(true);
    expect(scheduling?.answerSpec.choices.some((c) => c.value === "shared_workflow")).toBe(true);

    const facility = session.sections
      .flatMap((s) => s.questions)
      .find((q) => q.signalId === "facility_vendor_pathway");

    expect(facility?.visibilityBucket).toBe("helpful_next");
    expect(facility?.answerSpec.expectationLevel).toBe("helpful");
    expect(facility?.answerSpec.structuredForm).toBe("facility_credentialing");
  });

  it("splits later-stage questions for deferred UI grouping", () => {
    const view = buildDiscoveryIntelligenceGroupsView({
      contact: { provider_relationship_stage: "prospect" },
    });
    const session = buildStageMappingSession(view);
    const clinicalSection = session.sections.find((s) => s.id === "clinical_fit");
    expect(clinicalSection).toBeTruthy();

    const split = splitStageMappingSectionQuestions(clinicalSection!);
    expect(split.immediate.length + split.laterStage.length).toBe(clinicalSection!.questions.length);
    expect(split.laterStage.some((q) => q.signalId === "case_opportunity")).toBe(true);
  });

  it("recomputes question resolution from session contact when view rows are stale", () => {
    const staleView = buildDiscoveryIntelligenceGroupsView({
      contact: { provider_relationship_stage: "prospect" },
    });
    const updatedContact = {
      provider_relationship_stage: "prospect",
      provider_observation_scheduling_control: "provider_office",
      provider_scheduling_contact: "Jane Smith — OR Coordinator",
      provider_intelligence_field_metadata: {
        provider_observation_scheduling_control: {
          source_type: "profile",
          source_label: "Manual mapping",
          updated_at: "2026-05-01T00:00:00.000Z",
          validated_at: "2026-05-01T00:00:00.000Z",
          lifecycle_state: "validated",
        },
        provider_scheduling_contact: {
          source_type: "profile",
          source_label: "Manual mapping",
          updated_at: "2026-05-01T00:00:00.000Z",
          validated_at: "2026-05-01T00:00:00.000Z",
          lifecycle_state: "validated",
        },
      },
    };
    const session = buildStageMappingSession(staleView, { contact: updatedContact });
    const scheduling = session.operationalQuestions.find((q) => q.signalId === "scheduling_owner");

    expect(scheduling?.resolved).toBe(true);
    expect(scheduling?.visibilityBucket).toBe("confirmed");
  });

  it("moves confirmed answers out of required buckets", () => {
    const contact = {
      provider_relationship_stage: "prospect",
      provider_observation_feasibility: "approved",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "profile",
          source_label: "Manual mapping",
          updated_at: "2026-05-01T00:00:00.000Z",
          validated_at: "2026-05-01T00:00:00.000Z",
          lifecycle_state: "validated",
        },
      },
    };
    const view = buildDiscoveryIntelligenceGroupsView({ contact });
    const session = buildStageMappingSession(view, { contact });

    const approval = session.operationalQuestions.find(
      (q) => q.signalId === "observation_approval",
    );
    expect(approval?.visibilityBucket).toBe("confirmed");
    expect(
      session.operationalQuestions.some(
        (q) =>
          q.signalId !== "observation_approval" &&
          q.visibilityBucket !== "confirmed" &&
          q.visibilityBucket !== "hidden",
      ),
    ).toBe(true);
  });

  it("defines specs for every stage mapping signal", () => {
    const signalIds = [
      "opportunity_clinical_frustrations",
      "opportunity_workflow_inefficiencies",
      "opportunity_products_in_use",
      "opportunity_product_gaps",
      "opportunity_outcome_priorities",
      "opportunity_staff_frustrations",
      "opportunity_future_signals",
      "observation_approval",
      "scheduling_owner",
      "facility_vendor_pathway",
      "observation_logistics",
      "workflow_visibility",
      "product_alignment",
      "case_opportunity",
      "clinical_champion",
    ] as const;

    for (const signalId of signalIds) {
      expect(STAGE_MAPPING_SIGNAL_SPECS[signalId].choices.length).toBeGreaterThan(0);
      expect(STAGE_MAPPING_SIGNAL_SPECS[signalId].expectationLevel).toBeTruthy();
      expect(STAGE_MAPPING_SIGNAL_SPECS[signalId].expectationHelper.length).toBeGreaterThan(0);
    }
  });
});
