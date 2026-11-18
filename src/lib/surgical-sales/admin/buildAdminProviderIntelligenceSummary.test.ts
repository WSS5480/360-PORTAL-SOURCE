import { describe, expect, it } from "vitest";
import { buildAdminProviderIntelligenceSummary } from "@/lib/surgical-sales/admin/buildAdminProviderIntelligenceSummary";

describe("buildAdminProviderIntelligenceSummary", () => {
  it("returns categorized bullets from CRM fields", () => {
    const bullets = buildAdminProviderIntelligenceSummary({
      contact: {
        provider_clinical_frustrations: "Visualization before fixation slows cases",
        provider_product_gaps: "Mesh kit availability is inconsistent",
      },
      stageId: "observe",
      maxBullets: 3,
    });

    expect(bullets.length).toBeGreaterThan(0);
    expect(bullets.some((b) => b.startsWith("Clinical:"))).toBe(true);
    expect(bullets.some((b) => b.startsWith("Inventory / product:"))).toBe(true);
  });

  it("supplements CRM bullets with universal facts", () => {
    const bullets = buildAdminProviderIntelligenceSummary({
      contact: {},
      stageId: "observe",
      universalFacts: [
        {
          id: "f1",
          capture_id: "c1",
          provider_id: "p1",
          organization_id: null,
          case_id: null,
          encounter_id: null,
          concept: "workflow_or_timing_issue",
          normalized_label: "Turnover delays between cases",
          assertion_level: "observed",
          source_type: "observation_case",
          evidence_text: "Turnover delays between cases were noted in the OR",
          confidence: "high",
          negated: false,
          uncertain: false,
          suppressed: false,
          created_at: "2026-06-01T00:00:00.000Z",
        },
      ],
    });

    expect(bullets.some((b) => b.startsWith("Workflow:"))).toBe(true);
  });

  it("returns stage nudge when no intelligence on file", () => {
    const bullets = buildAdminProviderIntelligenceSummary({
      contact: {},
      stageId: "discovery",
    });

    expect(bullets).toHaveLength(1);
    expect(bullets[0]).toMatch(/No intelligence on file yet/i);
    expect(bullets[0]).toMatch(/intro call/i);
  });
});
