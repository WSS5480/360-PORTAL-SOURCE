import { describe, expect, it } from "vitest";
import {
  observationKeyFindingNotePatch,
  observationQuickFindingsFromCaseRow,
  observationQuickFindingsPatch,
} from "./observationQuickFindings";

describe("observationQuickFindings", () => {
  it("reads structured quick findings from case row", () => {
    const draft = observationQuickFindingsFromCaseRow({
      live_observation_product_fit: "Possible",
      observation_quick_finding_product_interest: "Mentioned",
      live_observation_competitors: "Unknown",
      live_observation_staff_process: "Yes",
      follow_up_needed: true,
      debrief_key_findings: "Surgeon liked fixation approach",
    });

    expect(draft).toEqual({
      workflow_fit: "Possible",
      product_interest: "Mentioned",
      competitor_seen: "Unknown",
      workflow_friction: "Yes",
      follow_up_needed: "Yes",
      key_finding_note: "Surgeon liked fixation approach",
    });
  });

  it("maps legacy yes/no values into structured findings", () => {
    const draft = observationQuickFindingsFromCaseRow({
      live_observation_product_fit: "Yes",
      debrief_product_opportunity_identified: true,
      live_observation_competitors: "No",
      live_observation_staff_process: "No",
      follow_up_needed: false,
    });

    expect(draft.workflow_fit).toBe("Strong");
    expect(draft.product_interest).toBe("Mentioned");
    expect(draft.competitor_seen).toBe("None");
    expect(draft.workflow_friction).toBe("No");
    expect(draft.follow_up_needed).toBe("No");
  });

  it("writes patches with plain-language values", () => {
    expect(observationQuickFindingsPatch("workflow_fit", "Weak")).toEqual({
      live_observation_product_fit: "Weak",
    });
    expect(observationQuickFindingsPatch("product_interest", "Strong")).toEqual({
      observation_quick_finding_product_interest: "Strong",
      debrief_product_opportunity_identified: true,
    });
    expect(observationQuickFindingsPatch("follow_up_needed", null)).toEqual({
      follow_up_needed: false,
    });
    expect(observationKeyFindingNotePatch("  Key takeaway  ")).toEqual({
      debrief_key_findings: "Key takeaway",
    });
  });
});
