import { describe, expect, it } from "vitest";
import {
  CASE_BOARD_PRIORITY_INSIGHT_EMPTY,
  deriveCaseBoardPriorityInsight,
  deriveCaseBoardPriorityInsightResult,
  deriveObservationCaseBoardPriorityInsight,
  deriveObservationCaseBoardPriorityInsightResult,
  deriveProductSupportCaseBoardPriorityInsight,
} from "./buildCaseBoardPriorityInsight";

describe("buildCaseBoardPriorityInsight", () => {
  it("prefers clinical validation targets over scheduling gaps for observation cases", () => {
    expect(
      deriveObservationCaseBoardPriorityInsight({
        case_type: "observation",
        observation_access_scheduling_owner: null,
        observation_access_credentialing: "unknown",
        observation_validation_targets: [
          {
            id: "watch-1",
            label: "Visualization challenges",
            source: "manual",
            status: "planned",
            created_at: "2026-06-01T00:00:00.000Z",
          },
        ],
      }),
    ).toBe("Visualization challenge mentioned");
  });

  it("uses quick findings and objective lines for observation insight", () => {
    expect(
      deriveObservationCaseBoardPriorityInsight({
        case_type: "observation",
        live_observation_staff_process: "Yes",
      }),
    ).toBe("Workflow friction observed on case day");

    expect(
      deriveObservationCaseBoardPriorityInsight({
        case_type: "observation",
        observation_signals_to_validate: "Need to validate workflow observations",
      }),
    ).toBe("Need to validate workflow observations");
  });

  it("uses latest dictation intelligence before planned objectives", () => {
    expect(
      deriveObservationCaseBoardPriorityInsightResult({
        case_type: "observation",
        observation_validation_targets: [
          {
            id: "target-1",
            label: "Workflow fit",
            status: "planned",
          },
        ],
        latest_note_body:
          "Dr. Lettuce mentioned he likes how familiar the team is with their current mesh but wishes it conformed a little better on larger defects.",
      }),
    ).toEqual({
      insight: "Product fit concern: conformability on larger defects",
      sourceLabel: "Latest dictation",
      sourceField: "latest_note_body",
    });

    expect(
      deriveObservationCaseBoardPriorityInsight({
        case_type: "observation",
        latest_note_body:
          "I spoke with Sarah afterward, and she said they're interested in scheduling an evaluation with us sometime next month.",
      }),
    ).toBe("Evaluation scheduling interest captured");
  });

  it("never defaults to scheduling or credentialing language", () => {
    expect(
      deriveObservationCaseBoardPriorityInsight({
        case_type: "observation",
        observation_access_scheduling_owner: null,
        observation_access_pathway: null,
        observation_access_credentialing: "unknown",
      }),
    ).toBe(CASE_BOARD_PRIORITY_INSIGHT_EMPTY);
  });

  it("derives product support priority insight examples", () => {
    expect(
      deriveProductSupportCaseBoardPriorityInsight({
        case_type: "product_support",
        product_name: "ACSIS Kit",
        case_product_needs: "First ACSIS case for this surgeon",
      }),
    ).toBe("First ACSIS case");

    expect(
      deriveProductSupportCaseBoardPriorityInsight({
        case_type: "product_support",
        follow_up_needed: true,
      }),
    ).toBe("Follow-up needed");

    expect(
      deriveProductSupportCaseBoardPriorityInsight({
        case_type: "product_support",
        case_product_needs: "Staff training requested for SPD team",
      }),
    ).toBe("Staff training requested");
  });

  it("routes by case type through deriveCaseBoardPriorityInsight", () => {
    expect(
      deriveCaseBoardPriorityInsight({
        case_type: "product_support",
        follow_up_needed: true,
      }),
    ).toBe("Follow-up needed");
  });

  it("tracks the source field for the selected priority insight", () => {
    expect(
      deriveCaseBoardPriorityInsightResult({
        case_type: "observation",
        debrief_key_findings: "Surgeon wants fewer setup steps",
        observation_validation_targets: [
          {
            id: "target-1",
            label: "Visualization challenges",
            status: "planned",
          },
        ],
      }),
    ).toEqual({
      insight: "Surgeon wants fewer setup steps",
      sourceLabel: "Observation key finding",
      sourceField: "debrief_key_findings",
    });
  });
});
