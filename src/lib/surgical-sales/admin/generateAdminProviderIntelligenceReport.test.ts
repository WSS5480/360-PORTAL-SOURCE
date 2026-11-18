import { afterEach, describe, expect, it, vi } from "vitest";
import { generateAdminProviderIntelligenceReport } from "@/lib/surgical-sales/admin/generateAdminProviderIntelligenceReport";
import type { AdminProviderReportCorpus } from "@/lib/surgical-sales/admin/fetchAdminProviderPreviewData";
import * as structuredIntelligenceAnalysis from "@/lib/surgical-sales/structuredIntelligenceAnalysis";

const corpus: AdminProviderReportCorpus = {
  provider_name: "Mark Onion",
  organization_name: "Pilot Hospital",
  rep_name: "Brandon",
  stage_label: "Discovery",
  case_count: 6,
  last_case_date: "2026-06-16",
  last_captured_at: "2026-06-17",
  crm_lines: ["clinical frustrations: Visualization challenge before fixation"],
  uf_lines: ["Turnover delays between cases"],
  case_lines: ["2026-06-16 · product_support · completed · SS-100 (Brandon)"],
  engagement_lines: [],
  evidence_lines: [
    "2026-06-16 observation_case SS-100 debrief findings: Staff waited on tray turnover before the observation.",
  ],
};

describe("generateAdminProviderIntelligenceReport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a structured fallback report without OpenAI", async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const { report, used_ai } = await generateAdminProviderIntelligenceReport(corpus);
    expect(used_ai).toBe(false);
    expect(report.headline).toMatch(/Mark Onion/i);
    expect(report.what_we_know.length).toBeGreaterThan(0);
    expect(report.manager_actions.length).toBeGreaterThan(0);

    if (prev) process.env.OPENAI_API_KEY = prev;
  });

  it("normalizes recoverable AI report shape drift instead of falling back", async () => {
    const prev = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key";
    vi.spyOn(structuredIntelligenceAnalysis, "callOpenAiStructuredJson").mockResolvedValue(
      JSON.stringify({
        headline: "Mark Onion — Discovery signals need manager review",
        summary:
          "Mark Onion has captured field intelligence around visualization challenge and turnover delays that should guide the next manager review.",
        what_we_know: ["Visualization challenge before fixation", "Turnover delays between cases"],
        friction_or_risks: [],
        commercial_outlook: [
          "Commercial motion is still early.",
          "The team should confirm observation quality before advancing evaluation.",
        ],
        manager_actions: [
          "Review the full provider file with Brandon",
          "Confirm the next touchpoint is logged",
          "Ask for fresh notes after the next case",
          "Do not include this fourth action",
        ],
      }),
    );

    const { report, used_ai } = await generateAdminProviderIntelligenceReport(corpus);

    expect(used_ai).toBe(true);
    expect(report.commercial_outlook).toContain("Commercial motion is still early");
    expect(report.manager_actions).toHaveLength(3);
    expect(structuredIntelligenceAnalysis.callOpenAiStructuredJson).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining("Treat \"Cases on file\" as activity count only"),
        userPrompt: expect.stringContaining("Source-labelled evidence from notes, dictations"),
      }),
    );

    if (prev) process.env.OPENAI_API_KEY = prev;
    else delete process.env.OPENAI_API_KEY;
  });
});
