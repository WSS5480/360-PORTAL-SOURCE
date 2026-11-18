import { describe, expect, it, vi } from "vitest";
import { runProductAiResearch } from "@/lib/surgical-sales/productIntelligence";
import * as structuredIntelligenceAnalysis from "@/lib/surgical-sales/structuredIntelligenceAnalysis";

describe("runProductAiResearch", () => {
  it("does not use AI to invent facts when product context is thin", async () => {
    const call = vi.spyOn(structuredIntelligenceAnalysis, "callOpenAiStructuredJson");

    const candidates = await runProductAiResearch({
      productName: "Amchoplast",
      category: "graft",
      description: "Surgical graft family (no catalog variants yet)",
    });

    expect(call).not.toHaveBeenCalled();
    expect(candidates).toHaveLength(2);
    expect(candidates[0].content).toContain("Do not infer procedures, competitors, indications");
    expect(candidates[1].knowledge_type).toBe("evaluation_questions");
  });

  it("grounds AI research in product category and description when context is sufficient", async () => {
    const call = vi.spyOn(structuredIntelligenceAnalysis, "callOpenAiStructuredJson").mockResolvedValue(
      JSON.stringify({
        summary: "Seeded product context only.",
        candidates: [
          {
            knowledge_type: "what_it_does",
            title: "Surgical graft family",
            content: "AmchoPlast is currently described only as a surgical graft family.",
            evidence: "Known description: Surgical graft family (no catalog variants yet)",
            confidence: "low",
          },
        ],
      }),
    );

    await runProductAiResearch({
      productName: "Amchoplast",
      category: "graft",
      description:
        "Surgical graft family used for soft tissue reinforcement in documented product materials. Catalog variants and approved applications are available in the uploaded brochure.",
    });

    const userPrompt = call.mock.calls[0]?.[0].userPrompt ?? "";
    expect(userPrompt).toContain("Category: graft");
    expect(userPrompt).toContain("Known description: Surgical graft family used for soft tissue reinforcement");
    expect(userPrompt).toContain("Do not infer clinical specialty, procedures, competitors, claims");
  });
});
