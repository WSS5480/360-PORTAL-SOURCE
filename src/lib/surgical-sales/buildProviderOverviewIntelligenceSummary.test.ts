import { describe, expect, it } from "vitest";
import {
  ACCESS_READINESS_DISPLAY,
  CLINICAL_UNDERSTANDING_DISPLAY,
  NEXT_BEST_ACTION_DISPLAY,
  WORKFLOW_UNDERSTANDING_DISPLAY,
} from "./buildProviderOverviewCommandIntelligence";
import {
  emptyProviderCommercialIntelligence,
} from "./providerCommercialIntelligenceModel";
import {
  PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN,
  buildProviderOverviewIntelligenceSummary,
} from "./buildProviderOverviewIntelligenceSummary";

describe("buildProviderOverviewIntelligenceSummary", () => {
  it("surfaces derived command intelligence instead of raw access field rows", () => {
    const summary = buildProviderOverviewIntelligenceSummary({
      contact: { provider_relationship_stage: "prospect" },
    });

    expect(summary.commandIntelligence.map((item) => item.label)).toEqual([
      "Access status",
      "Progress drivers",
      "Clinical signals",
      "Next mission",
    ]);
    expect(summary.commandIntelligence[0]?.value).toBe(ACCESS_READINESS_DISPLAY.not_started);
    expect(summary.commandIntelligence[1]?.value).toBe(WORKFLOW_UNDERSTANDING_DISPLAY.minimal);
    expect(summary.commandIntelligence[2]?.value).toBe(CLINICAL_UNDERSTANDING_DISPLAY.minimal);
    expect(summary.commandIntelligence[3]?.value).toBe(NEXT_BEST_ACTION_DISPLAY.access_mapping);

    const labels = summary.commandIntelligence.map((item) => item.label);
    expect(labels).not.toContain("Observation approval");
    expect(labels).not.toContain("Scheduler");
    expect(labels).not.toContain("Credentialing");
  });

  it("still exposes legacy field rows for dossier and propagation consumers", () => {
    const summary = buildProviderOverviewIntelligenceSummary({
      contact: { provider_relationship_stage: "prospect" },
    });

    expect(summary.confirmed).toEqual([]);
    expect(summary.stillLearning.map((item) => item.label)).toEqual([
      "Observation approval",
      "Scheduler",
      "Credentialing",
      "Influence paths",
      "Procedure interests",
      "Progress drivers",
      "Key relationships",
      "Facility context",
    ]);
    expect(summary.stillLearning.every((item) => item.value === PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN)).toBe(
      true,
    );
  });

  it("does not repeat master record hospital or specialty rows", () => {
    const summary = buildProviderOverviewIntelligenceSummary({
      contact: {},
      organizationName: "Sinai Hospital",
      specialty: "Orthopedics",
    });

    const labels = summary.commandIntelligence.map((item) => item.label);
    expect(labels).not.toContain("Hospital");
    expect(labels).not.toContain("Specialty");
    expect(labels).not.toContain("Sinai Hospital");
  });

  it("derives ready access readiness when observation is approved and credentialing clear", () => {
    const commercial = emptyProviderCommercialIntelligence();
    commercial.updated_at = "2026-06-01T00:00:00.000Z";
    commercial.observation.interest = "yes";
    commercial.observation.approval_status = "approved";
    commercial.observation.access_status = "approved";
    commercial.observation.readiness = "ready";
    commercial.observation.credentialing_required = "no";
    commercial.scheduling.scheduler_identified = "yes";
    commercial.scheduling.scheduler_contact_linked = "yes";
    commercial.scheduling.scheduling_workflow_known = "yes";
    commercial.credentialing.credentialing_required = "no";
    commercial.credentialing.credentialing_platform_known = "yes";

    const summary = buildProviderOverviewIntelligenceSummary({
      contact: {
        provider_observation_feasibility: "approved",
        provider_intelligence_field_metadata: {
          provider_observation_feasibility: {
            source_type: "profile",
            source_label: "Manual",
            updated_at: "2026-05-01T00:00:00.000Z",
            validated_at: "2026-05-01T00:00:00.000Z",
          },
        },
        provider_commercial_intelligence: commercial,
      },
    });

    expect(summary.commandIntelligence.find((item) => item.id === "access_readiness")?.value).toBe(
      ACCESS_READINESS_DISPLAY.ready,
    );
    expect(summary.commandIntelligence.find((item) => item.id === "next_best_action")?.value).toBe(
      NEXT_BEST_ACTION_DISPLAY.observation_scheduling,
    );
    expect(summary.stillLearning.map((item) => item.id)).not.toContain("observation_approval");
  });

  it("derives partial clinical understanding from captured optional intelligence", () => {
    const summary = buildProviderOverviewIntelligenceSummary({
      contact: {
        provider_procedure_focus: "Robotic hernia",
        provider_champion_potential: "Karen Smith",
        provider_observation_best_days_case_types: "Schedulers coordinate OR access",
      },
    });

    expect(summary.commandIntelligence.find((item) => item.id === "clinical_understanding")?.value).toBe(
      CLINICAL_UNDERSTANDING_DISPLAY.partial,
    );
    expect(summary.confirmed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Procedure interests",
          value: expect.stringMatching(/Robotic hernia/i),
        }),
        expect.objectContaining({
          label: "Influence paths",
          value: "Karen Smith",
        }),
      ]),
    );
  });

  it("derives observation execution when an observation touch is scheduled", () => {
    const summary = buildProviderOverviewIntelligenceSummary({
      contact: {},
      engagements: [
        {
          id: "e1",
          engagement_type: "or_visit",
          status: "scheduled",
        } as never,
      ],
    });

    expect(summary.commandIntelligence.find((item) => item.id === "next_best_action")?.value).toBe(
      NEXT_BEST_ACTION_DISPLAY.observation_execution,
    );
  });
});
