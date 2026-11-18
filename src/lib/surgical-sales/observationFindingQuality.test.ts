import { describe, expect, it } from "vitest";
import {
  isActionableIntelligenceFinding,
  isConversationalFillerText,
} from "./observationFindingQuality";

describe("observationFindingQuality", () => {
  it("flags conversational filler", () => {
    expect(isConversationalFillerText("Yeah first case today.")).toBe(true);
    expect(isConversationalFillerText("Overall went pretty well.")).toBe(true);
    expect(isConversationalFillerText("Had a quick conversation afterward.")).toBe(true);
  });

  it("accepts concise findings", () => {
    expect(isActionableIntelligenceFinding("Competitor Mesh")).toBe(true);
    expect(isActionableIntelligenceFinding("Visualization challenges observed")).toBe(true);
    expect(isActionableIntelligenceFinding("Product availability/setup delays observed")).toBe(true);
  });

  it("rejects narrative transcript lines", () => {
    expect(isActionableIntelligenceFinding("Yeah first case today. Overall went pretty well.")).toBe(
      false,
    );
  });
});
