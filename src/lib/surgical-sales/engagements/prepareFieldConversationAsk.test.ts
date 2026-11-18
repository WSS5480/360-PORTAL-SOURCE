import { describe, expect, it } from "vitest";
import { formatAskForFieldGuide } from "./prepareFieldConversationAsk";

describe("formatAskForFieldGuide", () => {
  it("keeps existing questions", () => {
    expect(formatAskForFieldGuide("Which procedures drive the highest volume today?")).toMatch(/\?$/);
  });

  it("converts workflow topics into short how-questions", () => {
    const q = formatAskForFieldGuide("Current ventral hernia fixation workflow");
    expect(q).toMatch(/^How does/i);
    expect(q).toMatch(/\?$/);
    expect(q.length).toBeLessThanOrEqual(90);
  });

  it("uses the tail after an em dash for labeled intel lines", () => {
    const q = formatAskForFieldGuide("Documented procedure focus — robotic ventral cases monthly");
    expect(q.toLowerCase()).toContain("robotic");
    expect(q).toMatch(/\?$/);
  });
});
