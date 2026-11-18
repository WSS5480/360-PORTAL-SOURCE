import { describe, expect, it } from "vitest";
import {
  countCompletedObservationsForProvider,
  isEvaluationEngagementType,
  promotedFieldScoresCommitment,
  promotedFieldScoresOutcomeQti,
} from "@/lib/surgical-sales/leaderboardPathwayScoring";

describe("leaderboardPathwayScoring", () => {
  it("recognizes evaluation engagement types", () => {
    expect(isEvaluationEngagementType("office_visit_360")).toBe(true);
    expect(isEvaluationEngagementType("intro_call")).toBe(false);
  });

  it("counts completed observations per provider", () => {
    const total = countCompletedObservationsForProvider(
      [
        {
          sales_rep_id: "rep-1",
          surgeon_contact_id: "prov-1",
          case_type: "observation",
          status: "completed",
        },
        {
          sales_rep_id: "rep-1",
          surgeon_contact_id: "prov-1",
          case_type: "observation",
          status: "completed",
        },
        {
          sales_rep_id: "rep-1",
          surgeon_contact_id: "prov-2",
          case_type: "observation",
          status: "completed",
        },
      ],
      "rep-1",
      "prov-1",
    );
    expect(total).toBe(2);
  });

  it("detects commitment and outcome pathway promotions only", () => {
    expect(promotedFieldScoresCommitment("Preference card process confirmed")).toBe(true);
    expect(promotedFieldScoresCommitment("Scheduler identified")).toBe(false);
    expect(promotedFieldScoresOutcomeQti("QTi report draft started")).toBe(true);
    expect(promotedFieldScoresOutcomeQti("Access pathway mapped")).toBe(false);
  });
});
