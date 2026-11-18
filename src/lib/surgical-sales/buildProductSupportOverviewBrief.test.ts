import { describe, expect, it } from "vitest";
import { buildCaseOperationalContextView } from "./buildCaseOperationalContextView";
import {
  buildProductSupportOverviewBrief,
  formatProductSupportOverviewLineStatus,
} from "./buildProductSupportOverviewBrief";

describe("buildProductSupportOverviewBrief", () => {
  it("builds case purpose from procedure and support type", () => {
    const brief = buildProductSupportOverviewBrief({
      caseRow: {},
      procedureType: "Robotic hernia",
      supportType: "In-room coverage",
      products: [],
    });
    expect(brief.procedureLabel).toBe("Robotic hernia");
    expect(brief.supportReason).toBe("In-room coverage");
  });

  it("formats product lines with sku and quantity status", () => {
    const line = {
      id: "1",
      name: "Mesh kit",
      skuCode: "M-100",
      expectedQuantity: 2,
      actualQuantity: 1,
    };
    expect(formatProductSupportOverviewLineStatus(line)).toBe("SKU M-100 · Used 1 of 2 expected");
  });

  it("maps readiness dimensions for coverage logistics", () => {
    const context = buildCaseOperationalContextView({
      caseRow: {
        case_implants_on_site: "confirmed|Implants delivered",
        case_trays_sterilization_status: "confirmed|Trays ready",
        case_support_coverage: "confirmed|Rep assigned",
      },
      surgeonContact: {
        facility_logistics: "Dock delivery by 7am",
      },
    });

    const brief = buildProductSupportOverviewBrief({
      caseRow: {
        observation_access_credentialing: "verified",
      },
      procedureType: "TAPP",
      supportType: "Case coverage",
      products: [],
      operationalContext: context,
    });

    expect(brief.readiness.map((row) => row.label)).toEqual([
      "Product availability",
      "Tray/instrument status",
      "Credentialing/access",
      "Facility logistics",
    ]);
    expect(brief.readiness[0]?.summary).toContain("Implants");
  });

  it("surfaces follow-up items for documentation and evaluation", () => {
    const brief = buildProductSupportOverviewBrief({
      caseRow: {
        follow_up_needed: true,
        debrief_suggested_next_action: "Send PO and schedule reorder check",
        status: "docs_needed",
      },
      procedureType: "TAPP",
      supportType: "Case coverage",
      products: [{ id: "1", name: "Mesh", skuCode: null, expectedQuantity: 1, actualQuantity: null }],
      linkedOpportunityHref: "/portal/sales/opportunities/abc",
      requiresBillingDocuments: true,
      bill: {
        po_uploaded: false,
        invoice_uploaded: false,
        quantities_confirmed: false,
        readiness: "missing",
      },
    });

    expect(brief.followUps.some((item) => /documentation/i.test(item))).toBe(true);
    expect(brief.followUps.some((item) => /evaluation/i.test(item))).toBe(true);
    expect(brief.followUps.some((item) => /product feedback/i.test(item))).toBe(true);
  });
});
