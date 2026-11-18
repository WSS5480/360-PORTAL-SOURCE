import { describe, expect, it } from "vitest";
import { rebuildCaseIntelligenceFromNoteBodies } from "./rebuildCaseIntelligenceFromNotes";

describe("rebuildCaseIntelligenceFromNoteBodies", () => {
  it("rebuilds observation live fields without a deleted note", () => {
    const patch = rebuildCaseIntelligenceFromNoteBodies({
      caseType: "observation",
      noteBodies: [
        "Competitor tray observed in the room.",
        "Long turnover before start.",
      ],
    });

    expect(String(patch.live_observation_competitors ?? "")).toContain("Competitor");
    expect(String(patch.live_observation_workflow ?? "")).toContain("turnover");
    expect(patch.observation_workflow_intelligence_snapshot).toBeTruthy();
  });

  it("clears intelligence when all notes are removed", () => {
    const patch = rebuildCaseIntelligenceFromNoteBodies({
      caseType: "observation",
      noteBodies: [],
    });

    expect(patch.live_observation_competitors).toBeNull();
    expect(patch.live_observation_workflow).toBeNull();
    expect(patch.observation_workflow_intelligence_snapshot).toBeNull();
  });

  it("rebuilds product support follow-up flags from remaining notes", () => {
    const patch = rebuildCaseIntelligenceFromNoteBodies({
      caseType: "product_support",
      noteBodies: ["Need to follow up with the surgeon next week."],
    });

    expect(patch.follow_up_needed).toBe(true);
    expect(String(patch.debrief_suggested_next_action ?? "")).toContain("follow up");
  });
});
