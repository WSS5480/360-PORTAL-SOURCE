import { describe, expect, it } from "vitest";
import { evaluatePathwayAdvancement } from "@/lib/surgical-sales/pathway/pathwayStageAdvancement";
import { deriveGatedPathwayStage } from "@/lib/surgical-sales/pathwayStageGates";
import {
  discoveryAccessReadyContact,
  productFitValidatedContact,
} from "@/lib/surgical-sales/salesPathwayTestFixtures";
import { SALES_PATHWAY_MIN_OBSERVATIONS } from "@/lib/surgical-sales/salesPathwayCanonical";

describe("pathwayStageAdvancement", () => {
  it("does not advance discovery from follow-up or scheduling without observation approval", () => {
    const input = {
      contact: {
        provider_observation_coordinator_contact: "Karen",
        provider_evaluation_openness: "evaluation_interest",
      },
      engagements: [{ id: "e1", engagement_type: "or_observation", status: "scheduled" }],
      cases: [],
    };
    expect(deriveGatedPathwayStage(input)).toBe("discovery");
    const evaln = evaluatePathwayAdvancement(input);
    expect(evaln.canAdvanceToNext).toBe(false);
    expect(evaln.blockedSummary).toMatch(/Observation Approved/i);
  });

  it("allows observe exit when rep marks observation sequence complete", () => {
    const input = {
      contact: discoveryAccessReadyContact({
        provider_observation_sequence_complete: "yes",
      }),
      cases: [],
      engagements: [],
    };
    expect(deriveGatedPathwayStage(input)).toBe("debrief");
    const sequenceGate = evaluatePathwayAdvancement(input).gateChecks.find(
      (c) => c.id === "observation_sequence",
    );
    expect(sequenceGate?.met).toBe(true);
  });

  it("keeps provider in debrief after debrief until product fit is validated", () => {
    const cases = Array.from({ length: SALES_PATHWAY_MIN_OBSERVATIONS }, (_, i) => ({
      id: `c${i}`,
      case_type: "observation",
      status: "completed",
    }));
    const input = {
      contact: discoveryAccessReadyContact({
        provider_preference_card_signals: "Likes QTi",
        provider_evaluation_openness: "evaluation_interest",
      }),
      cases,
      engagements: [
        {
          id: "d1",
          engagement_type: "provider_debrief",
          status: "completed",
          debrief_completed: true,
        },
      ],
    };
    expect(deriveGatedPathwayStage(input)).toBe("debrief");
    const evaln = evaluatePathwayAdvancement(input);
    expect(evaln.stageSummary).toMatch(/product fit is not validated/i);
    expect(evaln.blockedSummary).toMatch(/sentiment|interest|follow-up/i);
  });

  it("advances to evaluation when debrief and product fit are validated", () => {
    const cases = Array.from({ length: SALES_PATHWAY_MIN_OBSERVATIONS }, (_, i) => ({
      id: `c${i}`,
      case_type: "observation",
      status: "completed",
    }));
    const input = {
      contact: productFitValidatedContact(),
      cases,
      engagements: [
        {
          id: "d1",
          engagement_type: "provider_debrief",
          status: "completed",
          debrief_completed: true,
        },
      ],
    };
    expect(deriveGatedPathwayStage(input)).toBe("evaluation");
    expect(evaluatePathwayAdvancement(input).stageSummary).toMatch(/Evaluation/i);
  });
});
