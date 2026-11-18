import { describe, expect, it } from "vitest";

import {
  extractProductMentionsFromText,
  isGarbledProductName,
} from "@/lib/surgical-sales/sharedIntelligence/extractProductMention";

describe("extractProductMention", () => {
  it('extracts Acumed only from "uses acumed for many of his ventral cases"', () => {
    const mentions = extractProductMentionsFromText({
      text: "uses acumed for many of his ventral cases",
      mode: "debrief",
    });
    expect(mentions).toHaveLength(1);
    expect(mentions[0]?.productName).toBe("Acumed");
    expect(isGarbledProductName(mentions[0]?.productName ?? "")).toBe(false);
  });

  it('extracts Bard Mesh from "using Bard Mesh"', () => {
    const mentions = extractProductMentionsFromText({
      text: "He is using Bard Mesh for ventral cases.",
      mode: "debrief",
    });
    expect(mentions).toHaveLength(1);
    expect(mentions[0]?.productName).toBe("Bard Mesh");
  });

  it('does not extract robot as a product from "uses the robot"', () => {
    const mentions = extractProductMentionsFromText({
      text: "He uses the robot for most repairs.",
      mode: "debrief",
    });
    expect(mentions.some((mention) => /robot/i.test(mention.productName))).toBe(false);
  });

  it("dedupes duplicate product mentions in one sentence", () => {
    const mentions = extractProductMentionsFromText({
      text: "Still using Bard Mesh. They continue using Bard Mesh today.",
      mode: "debrief",
    });
    expect(mentions).toHaveLength(1);
    expect(mentions[0]?.productName).toBe("Bard Mesh");
  });

  it("marks hedged Bard usage as medium confidence with hedged modifier", () => {
    const mentions = extractProductMentionsFromText({
      text: "From what I understood they might be using Bard Mesh.",
      mode: "debrief",
    });
    expect(mentions).toHaveLength(1);
    expect(mentions[0]?.productName).toBe("Bard Mesh");
    expect(mentions[0]?.confidence).toBe("medium");
    expect(mentions[0]?.modifiers).toContain("hedged_language");
    expect(mentions[0]?.evidenceStatus).toBe("needs_confirmation");
  });

  it("never produces garbled Acumed For Many Of style names", () => {
    const mentions = extractProductMentionsFromText({
      text: "uses acumed for many of his cases",
      mode: "debrief",
    });
    for (const mention of mentions) {
      expect(isGarbledProductName(mention.productName)).toBe(false);
      expect(mention.productName).not.toMatch(/\b(for|many|of|his|her|their|cases)\b/i);
    }
  });

  it('does not invent "Commented That" from used Bard Soft Mesh and commented that', () => {
    const mentions = extractProductMentionsFromText({
      text: "He again used Bard Soft Mesh and commented that he's comfortable with it for routine cases.",
      mode: "debrief",
    });
    expect(mentions.map((mention) => mention.productName)).toEqual(["Bard Soft Mesh"]);
    expect(mentions.some((mention) => /commented/i.test(mention.productName))).toBe(false);
  });
});
