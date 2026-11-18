import { describe, expect, it } from "vitest";
import {
  buildCaseFieldWatchBriefing,
  isPositiveWatchSignal,
  isWatchBriefingCandidate,
} from "@/lib/surgical-sales/caseFieldWatchBriefing";

describe("caseFieldWatchBriefing", () => {
  it("excludes positive staff signals from watch briefing", () => {
    expect(isPositiveWatchSignal("Staff workflow appeared coordinated")).toBe(true);
    expect(isWatchBriefingCandidate("Staff workflow appeared coordinated")).toBe(false);

    const briefing = buildCaseFieldWatchBriefing({
      caseRow: { id: "case-1" },
      providerContact: {
        provider_workflow_pain_points: "Staff workflow appeared coordinated",
      },
      priorCases: [],
    });

    expect(briefing.hasItems).toBe(false);
    expect(briefing.sections.flatMap((section) => section.items).join(" ")).not.toMatch(/coordinated/i);
  });

  it("groups surgeon, staff, workflow, and inventory issues by category", () => {
    const briefing = buildCaseFieldWatchBriefing({
      caseRow: { id: "case-1", case_product_needs: "Mesh kit availability questioned" },
      providerContact: {
        provider_clinical_frustrations: "Visualization before fixation slows cases",
        provider_staff_frustrations: "Circulator unfamiliar with vendor trays",
        provider_workflow_pain_points: "Turnover delays between cases",
        provider_product_gaps: "Preferred mesh size often out of stock",
      },
      priorCases: [],
    });

    const labels = briefing.sections.map((section) => section.label);
    expect(labels).toContain("Surgeon");
    expect(labels).toContain("Staff");
    expect(labels).toContain("Workflow");
    expect(labels).toContain("Inventory & products");

    const surgeon = briefing.sections.find((section) => section.category === "surgeon_pain");
    expect(surgeon?.items[0]?.text).toMatch(/visualization/i);
    expect(surgeon?.items[0]?.text).not.toMatch(/on file/i);

    const inventory = briefing.sections.find((section) => section.category === "inventory_products");
    expect(inventory?.items.some((item) => /mesh kit availability/i.test(item.text))).toBe(true);
    expect(inventory?.items.some((item) => /out of stock/i.test(item.text))).toBe(true);
  });

  it("returns guidance when nothing is flagged", () => {
    const briefing = buildCaseFieldWatchBriefing({
      caseRow: { id: "case-1" },
      providerContact: {},
      priorCases: [],
    });

    expect(briefing.hasItems).toBe(false);
    expect(briefing.emptyLines.some((line) => /listen for surgeon or staff friction/i.test(line))).toBe(true);
  });
});
