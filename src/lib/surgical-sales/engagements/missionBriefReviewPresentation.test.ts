import { describe, expect, it } from "vitest";
import {
  buildPathwayImpactItems,
  summarizeDiscoveryPrompt,
  summarizeNextStepLine,
  summarizeOutcomeLine,
} from "./missionBriefReviewPresentation";

describe("missionBriefReviewPresentation", () => {
  it("summarizes discovery questions into tactical targets", () => {
    const item = summarizeDiscoveryPrompt("Who owns scheduling for OR access?", "observation");
    expect(item.text).toMatch(/scheduling|coordinator/i);
    expect(item.text.length).toBeLessThan(60);
    expect(item.text).not.toMatch(/\?$/);
  });

  it("summarizes outcome and next-step lines distinctly", () => {
    expect(summarizeOutcomeLine("Agree on follow-up observation window").text).toMatch(/follow-up|timing/i);
    expect(summarizeNextStepLine("Send observation request to coordinator").text).toMatch(
      /observation request/i,
    );
  });

  it("builds pathway impact from prep corpus keywords only", () => {
    const items = buildPathwayImpactItems(
      "observation access workflow coordinator evaluation",
    );
    expect(items.map((i) => i.text)).toEqual(
      expect.arrayContaining(["Observation qualification", "Workflow visibility"]),
    );
  });
});
