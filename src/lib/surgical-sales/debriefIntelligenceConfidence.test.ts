import { describe, expect, it } from "vitest";

import {
  scoreConfidenceFromEvidence,
  scorePersonMentionConfidence,
  shouldPreselectDebriefFinding,
} from "@/lib/surgical-sales/debriefIntelligenceConfidence";

describe("debriefIntelligenceConfidence", () => {
  it("scores explicit scheduling ownership as High", () => {
    expect(
      scorePersonMentionConfidence("Jennifer", "He mentioned that Jennifer handles scheduling coordination."),
    ).toBe("High");
    expect(scoreConfidenceFromEvidence("Jennifer handles scheduling.")).toBe("High");
  });

  it("scores talk-to-about as Medium implication", () => {
    expect(
      scorePersonMentionConfidence("Jennifer", "Talk to Jennifer about scheduling."),
    ).toBe("Medium");
  });

  it("scores weak assumptions as Low", () => {
    expect(scoreConfidenceFromEvidence("Jennifer might handle scheduling eventually.")).toBe("Low");
    expect(scorePersonMentionConfidence("Jennifer", "Jennifer was mentioned in passing.")).toBe("Low");
  });

  it("pre-selects only Medium and High", () => {
    expect(shouldPreselectDebriefFinding("High")).toBe(true);
    expect(shouldPreselectDebriefFinding("Medium")).toBe(true);
    expect(shouldPreselectDebriefFinding("Low")).toBe(false);
  });
});
