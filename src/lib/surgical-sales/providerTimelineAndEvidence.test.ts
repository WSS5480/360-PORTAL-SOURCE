import { describe, expect, it } from "vitest";

import { buildProviderActivityTimeline } from "@/lib/surgical-sales/buildProviderActivityTimeline";
import { buildProviderIntelligenceKnowledgeDashboardView } from "@/lib/surgical-sales/buildProviderIntelligenceKnowledgeDashboardView";
import { resolveIntelligenceSourceDisplay } from "@/lib/surgical-sales/resolveIntelligenceSourceDisplay";

const PROVIDER_ID = "provider-test";

describe("Provider Timeline and Intelligence Evidence labeling", () => {
  it("labels Quick Capture field notes as Field Note in timeline, not Intro Call", () => {
    const timeline = buildProviderActivityTimeline({
      providerId: PROVIDER_ID,
      activityTimeline: [
        {
          kind: "provider_activity",
          id: "act-qc-1",
          at: "2026-06-11T15:00:00Z",
          activity_type: "ai_note_capture",
          body: "Karen handles observation scheduling. Credentialing required before observation.",
          title: "AI note captured",
        },
      ],
    });

    expect(timeline).toHaveLength(1);
    expect(timeline[0].sourceTypeLabel).toBe("Field Note");
    expect(timeline[0].preview).toMatch(/Karen handles observation scheduling/i);
  });

  it("shows Review Updates field note in timeline and Field Note source on extracted evidence", () => {
    const contact = {
      provider_observation_coordinator_contact: "Karen — Scheduling Coordinator",
      provider_procedure_focus: "Robotic hernia · Increasing procedure volume",
      provider_intelligence_field_metadata: {
        provider_observation_coordinator_contact: {
          source_type: "ai_capture",
          source_label: "Log update",
          updated_at: "2026-06-11T12:00:00Z",
          evidence_text: "Karen handles observation scheduling.",
        },
        provider_procedure_focus: {
          source_type: "ai_capture",
          source_label: "Quick capture field note",
          updated_at: "2026-06-11T12:00:00Z",
          evidence_text: "Robotic hernia volume is increasing.",
        },
      },
    };

    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact,
      providerId: PROVIDER_ID,
      activityTimeline: [
        {
          kind: "provider_activity",
          id: "act-review-1",
          at: "2026-06-11T12:00:00Z",
          activity_type: "clinical_discovery_updated",
          category: "discovery",
          body: "Karen handles observation scheduling. Robotic hernia volume is increasing.",
          question_label: "Karen handles observation scheduling.",
          title: "Planning updated",
        },
      ],
    });

    expect(view.providerTimeline.some((item) => item.sourceTypeLabel === "Field Note")).toBe(true);
    expect(view.providerTimeline.some((item) => item.sourceTypeLabel === "Intro Call")).toBe(false);

    const scheduling = view.fieldEvidence.find((card) => card.title === "Scheduling Contact");
    expect(scheduling?.sourceTypeLabel).toBe("Field Note");
    expect(scheduling?.sourceQuote).toMatch(/Karen handles observation scheduling/i);

    const clinical = view.fieldEvidence.find((card) => card.title === "Clinical Trend");
    expect(clinical?.sourceTypeLabel).toBe("Field Note");
    expect(clinical?.sourceTypeLabel).not.toBe("Intro Call");
  });

  it("labels intro call notes as Intro Call in timeline and evidence when metadata traces to intro_call", () => {
    const engagements = [
      {
        id: "eng-intro-1",
        engagement_type: "intro_call",
        status: "completed",
        debrief_completed: true,
        debrief_completed_at: "2026-06-10T14:00:00Z",
        engagement_type_label: "Intro Call",
        notes: "Provider was open to observation after credentialing.",
      },
    ] as never[];

    const contact = {
      provider_observation_feasibility: "approved",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "intro_call",
          source_label: "Intro call debrief",
          source_engagement_id: "eng-intro-1",
          updated_at: "2026-06-10T14:00:00Z",
          evidence_text: "Provider was open to observation after credentialing.",
        },
      },
    };

    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact,
      providerId: PROVIDER_ID,
      engagements,
    });

    expect(view.providerTimeline.some((item) => item.sourceTypeLabel === "Intro Call")).toBe(true);
    const access = view.fieldEvidence.find((card) => card.title === "Observation Access");
    expect(access?.sourceTypeLabel).toBe("Intro Call");
  });

  it("labels debrief notes as Debrief in timeline and evidence", () => {
    const engagements = [
      {
        id: "eng-debrief-1",
        engagement_type: "provider_debrief",
        status: "completed",
        debrief_completed: true,
        debrief_completed_at: "2026-06-09T16:00:00Z",
        engagement_type_label: "Observation Debrief",
        notes: "What happened:\nChampion identified during debrief.",
      },
    ] as never[];

    const timeline = buildProviderActivityTimeline({
      providerId: PROVIDER_ID,
      engagements,
    });

    expect(timeline.some((item) => item.sourceTypeLabel === "Debrief")).toBe(true);

    const source = resolveIntelligenceSourceDisplay({
      meta: {
        source_type: "engagement",
        source_label: "Observation debrief",
        source_engagement_id: "eng-debrief-1",
        updated_at: "2026-06-09T16:00:00Z",
      },
      engagements,
      providerId: PROVIDER_ID,
    });
    expect(source.sourceTypeLabel).toBe("Debrief");
  });

  it("does not label clinical trend from field note as Intro Call", () => {
    const source = resolveIntelligenceSourceDisplay({
      meta: {
        source_type: "ai_capture",
        source_label: "Quick capture field note",
        updated_at: "2026-06-11T12:00:00Z",
        evidence_text: "Robotic hernia volume is increasing.",
      },
      providerId: PROVIDER_ID,
    });

    expect(source.sourceTypeLabel).toBe("Field Note");
    expect(source.sourceTypeLabel).not.toMatch(/intro call/i);
  });
});
