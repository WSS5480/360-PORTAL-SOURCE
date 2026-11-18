import { describe, expect, it } from "vitest";
import { buildProductSupportKnownInsights } from "@/lib/surgical-sales/buildProductSupportRepBriefingContent";

describe("buildProductSupportRepBriefingContent", () => {
  it("formats provider intelligence without raw machine tokens or generic filler", () => {
    const insights = buildProductSupportKnownInsights({
      caseRow: { id: "case-1", procedure_type: "general" },
      providerContact: {
        provider_current_vendors: "they currently use Acumed for many of their distal radius fracture procedures.",
        provider_competitive_products: "Bard Mesh",
        provider_procedure_focus: "general",
        provider_clinical_frustrations: "interest_in_acsis_discussed",
      },
      priorCases: [],
      activities: [],
    });

    const joined = insights.map((item) => item.text).join(" | ");
    expect(joined).toMatch(/Acumed|distal radius/i);
    expect(joined).toMatch(/Bard Mesh/i);
    expect(joined).not.toMatch(/interest_in_acsis_discussed/i);
    expect(insights.some((item) => /^general$/i.test(item.text))).toBe(false);
  });
});
