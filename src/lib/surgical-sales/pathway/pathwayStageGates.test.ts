import { describe, expect, it } from "vitest";
import {
  countObservedProcedures,
  hasDebriefCompleted,
  hasObservationApproved,
  isDebriefStageComplete,
  isDiscoveryReadyForObserve,
  isObserveStageComplete,
  isProductSalesConversationAllowed,
} from "@/lib/surgical-sales/pathwayStageGates";
import {
  discoveryAccessReadyContact,
  productFitValidatedContact,
} from "@/lib/surgical-sales/salesPathwayTestFixtures";
import { SALES_PATHWAY_MIN_OBSERVATIONS } from "@/lib/surgical-sales/salesPathwayCanonical";

describe("pathwayStageGates", () => {
  it("does not advance discovery on scheduled observation without approval", () => {
    const input = {
      contact: {},
      engagements: [
        { id: "e1", engagement_type: "or_observation", status: "scheduled" },
      ],
    };
    expect(hasObservationApproved(input)).toBe(false);
    expect(isDiscoveryReadyForObserve(input)).toBe(false);
  });

  it("advances discovery when observation approval is validated", () => {
    const contact = discoveryAccessReadyContact();
    expect(isDiscoveryReadyForObserve({ contact, engagements: [], cases: [] })).toBe(true);
  });

  it("counts observation cases with the canonical completion predicate", () => {
    // observation_completed_at marks a case complete even if status lags —
    // same rule as observationProgramGate so surfaces never disagree.
    const cases = [
      { id: "c1", case_type: "observation", status: "completed" },
      { id: "c2", case_type: "observation", status: "in_progress", observation_completed_at: "2026-06-01T12:00:00Z" },
      { id: "c3", case_type: "observation", status: "in_progress" },
      { id: "c4", case_type: "product_support", status: "completed" },
    ];
    expect(countObservedProcedures({ contact: {}, cases, engagements: [] })).toBe(2);
  });

  it("does not double-count a case and its linked legacy observation engagement (W6)", () => {
    // One OR day represented in both namespaces: the canonical case row carries
    // engagement_id pointing at the legacy completed observation engagement.
    const cases = [
      { id: "c1", case_type: "observation", status: "completed", engagement_id: "e1" },
    ];
    const engagements = [
      { id: "e1", engagement_type: "or_visit", status: "completed" },
      { id: "e2", engagement_type: "or_visit", status: "completed" },
    ];
    // c1+e1 are the same observation → 1; e2 is a separate legacy day → 2.
    expect(countObservedProcedures({ contact: {}, cases, engagements })).toBe(2);
  });

  it("merges the provider profile observation count like the program gate", () => {
    const cases = [{ id: "c1", case_type: "observation", status: "completed" }];
    expect(
      countObservedProcedures({ contact: { observation_count: 3 }, cases, engagements: [] }),
    ).toBe(3);
    expect(
      countObservedProcedures({ contact: { observation_count: 0 }, cases, engagements: [] }),
    ).toBe(1);
  });

  it("allows observe exit when rep marks sequence complete without five cases", () => {
    const contact = discoveryAccessReadyContact({
      provider_observation_sequence_complete: "yes",
    });
    expect(isObserveStageComplete({ contact, cases: [], engagements: [] })).toBe(true);
  });

  it("allows observe exit when the provider is already a customer", () => {
    expect(
      isObserveStageComplete({
        contact: { provider_relationship_stage: "established_customer" },
        cases: [],
        engagements: [],
      }),
    ).toBe(true);
    expect(
      isObserveStageComplete({
        contact: { provider_crm_status: "active" },
        cases: [],
        engagements: [],
      }),
    ).toBe(true);
    expect(isObserveStageComplete({ contact: {}, cases: [], engagements: [] })).toBe(false);
  });

  it("requires debrief completion and validated product fit before evaluation", () => {
    const contact = discoveryAccessReadyContact({
      provider_preference_card_signals: "QTi interest",
      provider_evaluation_openness: "evaluation_interest",
    });
    const cases = Array.from({ length: SALES_PATHWAY_MIN_OBSERVATIONS }, (_, i) => ({
      id: `c${i}`,
      case_type: "observation",
      status: "completed",
    }));
    const debriefEngagement = [
      {
        id: "d1",
        engagement_type: "provider_debrief",
        status: "completed",
        debrief_completed: true,
      },
    ];

    expect(isDebriefStageComplete({ contact, cases, engagements: [] })).toBe(false);
    expect(
      isDebriefStageComplete({ contact, cases, engagements: debriefEngagement }),
    ).toBe(false);

    expect(
      isDebriefStageComplete({
        contact: productFitValidatedContact(),
        cases,
        engagements: debriefEngagement,
      }),
    ).toBe(true);
  });

  it("blocks product sales until approval, observation sequence, debrief, and validated fit", () => {
    const contact = productFitValidatedContact({
      provider_preference_card_signals: "QTi",
      provider_evaluation_openness: "evaluation_interest",
    });
    const cases = Array.from({ length: SALES_PATHWAY_MIN_OBSERVATIONS }, (_, i) => ({
      id: `c${i}`,
      case_type: "observation",
      status: "completed",
    }));

    expect(isProductSalesConversationAllowed({ contact, cases, engagements: [] })).toBe(false);

    expect(
      isProductSalesConversationAllowed({
        contact,
        cases,
        engagements: [
          {
            id: "d1",
            engagement_type: "provider_debrief",
            status: "completed",
            debrief_completed: true,
          },
        ],
      }),
    ).toBe(true);
  });

  it("detects debrief_completed on engagement", () => {
    expect(
      hasDebriefCompleted({
        contact: {},
        engagements: [
          {
            id: "d1",
            engagement_type: "provider_debrief",
            status: "completed",
            debrief_completed: true,
          },
        ],
      }),
    ).toBe(true);
  });
});
