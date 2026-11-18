import { describe, expect, it } from "vitest";
import {
  engagementAllowsOutcomeIntelligenceApply,
  outcomeGroupForIntelligenceDomain,
  OUTCOME_INTELLIGENCE_EXTRACTION_GROUPS,
} from "@/lib/surgical-sales/engagements/engagementOutcomeIntelligence";
import { TACTICAL_DEBRIEF_NOTE_MARKER } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";

describe("engagementOutcomeIntelligence", () => {
  it("maps intelligence domains to normalized extraction groups", () => {
    expect(outcomeGroupForIntelligenceDomain("relationship")).toBe("relationship_intelligence");
    expect(outcomeGroupForIntelligenceDomain("or_access")).toBe("access_intelligence");
    expect(outcomeGroupForIntelligenceDomain("workflow")).toBe("workflow_intelligence");
    expect(outcomeGroupForIntelligenceDomain("product_fit")).toBe("product_fit_signals");
    expect(outcomeGroupForIntelligenceDomain("next_steps")).toBe("next_steps");
    expect(outcomeGroupForIntelligenceDomain("credentialing")).toBe("access_intelligence");
    expect(OUTCOME_INTELLIGENCE_EXTRACTION_GROUPS).toHaveLength(8);
  });

  it("blocks provider intelligence apply until outcome notes exist", () => {
    expect(engagementAllowsOutcomeIntelligenceApply({ notes: null, debrief_completed: false })).toBe(
      false,
    );
    expect(
      engagementAllowsOutcomeIntelligenceApply({
        notes: `${TACTICAL_DEBRIEF_NOTE_MARKER}\n\nWhat happened:\nMet with surgeon`,
        debrief_completed: true,
      }),
    ).toBe(true);
    expect(
      engagementAllowsOutcomeIntelligenceApply({
        notes: "plain notes only",
        debrief_completed: true,
      }),
    ).toBe(true);
  });
});
