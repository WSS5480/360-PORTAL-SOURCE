import { describe, expect, it } from "vitest";
import { buildProductSupportCaseIdentity } from "./buildProductSupportCaseIdentity";
import { buildProductSupportCaseOverviewSections } from "./buildProductSupportCaseOverviewSections";

describe("buildProductSupportCaseIdentity", () => {
  it("labels product support cases and derives execution status badges", () => {
    const identity = buildProductSupportCaseIdentity({
      case_type: "product_support",
      surgeon_display: "Dr. Smith",
      account_name: "Memorial Hospital",
      case_date: "2026-06-04",
      status: "scheduled",
      procedure_type: "TKA",
      surgeon_contact_id: "provider-1",
      account_id: "acct-1",
      products: [{ id: "line-1", name: "ACSIS Kit", expectedQuantity: 2 }],
    } as Parameters<typeof buildProductSupportCaseIdentity>[0]);

    expect(identity.caseTypeLabel).toBe("Product Support Case");
    expect(identity.procedureType).toBe("TKA");
    expect(identity.statusBadges.find((badge) => badge.id === "in_progress")?.active).toBe(true);
  });
});

describe("buildProductSupportCaseOverviewSections", () => {
  it("builds execution overview sections", () => {
    const sections = buildProductSupportCaseOverviewSections({
      caseRow: { observation_goal: "Confirm tray coverage", case_operational_risks: "Late SPD delivery" },
      procedureType: "TKA",
      supportType: "Case coverage",
      products: [{ id: "line-1", name: "ACSIS Kit", expectedQuantity: 1 }],
      providerName: "Dr. Smith",
      facilityName: "Memorial Hospital",
    });

    expect(sections.caseSummary.headline).toContain("TKA");
    expect(sections.productsPlanned).toHaveLength(1);
    expect(sections.coverageObjectives[0]).toContain("Confirm tray coverage");
    expect(sections.risks[0]).toContain("Late SPD delivery");
    expect(sections.contacts[0]?.label).toBe("Provider");
  });
});
