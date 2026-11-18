import { describe, expect, it } from "vitest";
import {
  ACCESS_READINESS_DISPLAY,
  buildProviderOverviewCommandIntelligence,
  CLINICAL_UNDERSTANDING_DISPLAY,
  deriveAccessReadinessLevel,
  deriveClinicalUnderstandingLevel,
  deriveProviderOverviewNextBestAction,
  deriveWorkflowUnderstandingLevel,
  NEXT_BEST_ACTION_DISPLAY,
  WORKFLOW_UNDERSTANDING_DISPLAY,
} from "./buildProviderOverviewCommandIntelligence";
import { buildProviderFieldIntelligenceModel } from "./providerFieldIntelligenceModel";
import {
  emptyProviderCommercialIntelligence,
  type ProviderCommercialIntelligence,
} from "./providerCommercialIntelligenceModel";

function contactWithCommercialIntel(
  mutate: (intel: ProviderCommercialIntelligence) => void,
): Record<string, unknown> {
  const intel = emptyProviderCommercialIntelligence();
  mutate(intel);
  intel.updated_at = "2026-06-01T00:00:00.000Z";
  return { provider_commercial_intelligence: intel };
}

describe("buildProviderOverviewCommandIntelligence", () => {
  it("returns four derived command objects for an empty provider", () => {
    const items = buildProviderOverviewCommandIntelligence({ contact: {} });

    expect(items.map((item) => item.id)).toEqual([
      "access_readiness",
      "workflow_understanding",
      "clinical_understanding",
      "next_best_action",
    ]);
    expect(items[0]?.value).toBe(ACCESS_READINESS_DISPLAY.not_started);
    expect(items[1]?.value).toBe(WORKFLOW_UNDERSTANDING_DISPLAY.minimal);
    expect(items[2]?.value).toBe(CLINICAL_UNDERSTANDING_DISPLAY.minimal);
    expect(items[3]?.value).toBe(NEXT_BEST_ACTION_DISPLAY.access_mapping);
  });

  it("derives conditional access readiness when approval is pending but signals exist", () => {
    const contact = contactWithCommercialIntel((intel) => {
      intel.observation.interest = "yes";
      intel.observation.approval_status = "interested";
      intel.observation.credentialing_required = "yes";
      intel.scheduling.scheduler_identified = "partial";
      intel.scheduling.scheduler_contact_linked = "no";
      intel.credentialing.credentialing_required = "yes";
      intel.credentialing.credentialing_platform_known = "no";
    });

    const items = buildProviderOverviewCommandIntelligence({ contact });
    expect(items.find((item) => item.id === "access_readiness")?.value).toBe(
      ACCESS_READINESS_DISPLAY.conditional,
    );
    expect(items.find((item) => item.id === "next_best_action")?.value).toBe(
      NEXT_BEST_ACTION_DISPLAY.access_mapping,
    );
  });

  it("derives ready access and observation scheduling when pathway is clear", () => {
    const contact = {
      provider_observation_feasibility: "approved",
      provider_intelligence_field_metadata: {
        provider_observation_feasibility: {
          source_type: "profile",
          validated_at: "2026-06-01T00:00:00.000Z",
        },
      },
      ...contactWithCommercialIntel((intel) => {
        intel.observation.interest = "yes";
        intel.observation.approval_status = "approved";
        intel.observation.access_status = "approved";
        intel.observation.readiness = "ready";
        intel.observation.credentialing_required = "no";
        intel.scheduling.scheduler_identified = "yes";
        intel.scheduling.scheduler_contact_linked = "yes";
        intel.scheduling.scheduling_workflow_known = "yes";
        intel.credentialing.credentialing_required = "no";
        intel.credentialing.credentialing_platform_known = "yes";
      }),
    };

    const items = buildProviderOverviewCommandIntelligence({ contact });
    expect(items.find((item) => item.id === "access_readiness")?.value).toBe(
      ACCESS_READINESS_DISPLAY.ready,
    );
    expect(items.find((item) => item.id === "next_best_action")?.value).toBe(
      NEXT_BEST_ACTION_DISPLAY.observation_scheduling,
    );
  });

  it("derives partial clinical understanding from captured procedure focus", () => {
    const contact = {
      provider_procedure_focus: "Robotic ventral hernia",
      ...contactWithCommercialIntel((intel) => {
        intel.clinical.procedure_focus = ["Robotic ventral hernia"];
      }),
    };

    const model = buildProviderFieldIntelligenceModel({ contact });
    expect(deriveClinicalUnderstandingLevel({ model, contact })).toBe("partial");
    expect(buildProviderOverviewCommandIntelligence({ contact }).find((i) => i.id === "clinical_understanding")?.value).toBe(
      CLINICAL_UNDERSTANDING_DISPLAY.partial,
    );
  });

  it("derives observation execution when an observation case is open", () => {
    const action = deriveProviderOverviewNextBestAction({
      contact: {},
      cases: [
        {
          id: "case-1",
          case_type: "observation",
          status: "scheduled",
        },
      ],
    });

    expect(action.kind).toBe("observation_execution");
    expect(NEXT_BEST_ACTION_DISPLAY[action.kind]).toBe("Open observation case");
  });

  it("derives learning access readiness when referenced signals exist without readiness clearance", () => {
    const contact = {
      provider_observation_coordinator_contact:
        "Jennifer in his office usually handles scheduling coordination",
    };

    const model = buildProviderFieldIntelligenceModel({ contact });
    expect(deriveAccessReadinessLevel({ model, contact })).toBe("learning");
  });

  it("maps workflow maturity to established when observed in field", () => {
    const contact = {
      provider_procedure_focus: "observed_in_field|Workflow directly seen during observation or case",
    };
    expect(deriveWorkflowUnderstandingLevel(contact)).toBe("established");
  });
});
