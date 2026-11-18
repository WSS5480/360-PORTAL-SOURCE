import { describe, expect, it } from "vitest";
import type { EnrichedSurgicalCaseListItem } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import { deriveCaseBoardNextAction } from "./buildCaseBoardNextAction";

function baseCase(overrides: Partial<EnrichedSurgicalCaseListItem> = {}): EnrichedSurgicalCaseListItem {
  return {
    id: "case-1",
    case_number: "SC-1001",
    account_id: "acct-1",
    case_date: null,
    status: "draft",
    case_type: "observation",
    account_name: "Metro Hospital",
    product_name: null,
    surgeon_display: "Dr. Smith",
    surgeon_specialty: null,
    has_purchase_order: false,
    has_invoice: false,
    missing_po: false,
    missing_invoice: false,
    billing_readiness: "ready",
    checklist_po: false,
    checklist_invoice: false,
    checklist_quantities: false,
    billing_checklist_score: 0,
    requires_billing_workflow: false,
    surgeon_missing_support: false,
    ...overrides,
  };
}

describe("buildCaseBoardNextAction", () => {
  it("recommends securing access for observation requests", () => {
    expect(
      deriveCaseBoardNextAction(
        baseCase({
          observation_access_pathway: null,
        }),
      ),
    ).toBe("Secure Observation Access");
  });

  it("recommends scheduling when observation is approved but not on the calendar", () => {
    expect(
      deriveCaseBoardNextAction(
        baseCase({
          observation_access_pathway: "Approved via OR leadership",
          case_date: null,
          status: "draft",
        }),
      ),
    ).toBe("Schedule Observation");
  });

  it("recommends performing observation when scheduled", () => {
    expect(
      deriveCaseBoardNextAction(
        baseCase({
          observation_access_pathway: "Approved via OR leadership",
          case_date: "2026-06-10",
          status: "scheduled",
          surgeon_contact_id: "provider-1",
          observation_goal: "Validate workflow fit",
        }),
      ),
    ).toBe("Perform Observation");
  });

  it("recommends reviewing intelligence after observation is completed before debrief unlock", () => {
    expect(
      deriveCaseBoardNextAction(
        baseCase({
          status: "completed",
          observation_goal: "Validate workflow fit",
          notes: "Captured intra-op workflow notes",
        }),
      ),
    ).toBe("Review Intelligence");
  });

  it("recommends completing notes before debrief when field notes are missing", () => {
    expect(
      deriveCaseBoardNextAction(
        baseCase({
          status: "completed",
          case_date: "2026-05-01",
          observation_goal: "Validate fit",
          notes: "",
        }),
        "2026-06-01",
      ),
    ).toBe("Complete Observation Notes");
  });

  it("recommends creating an opportunity after debrief is captured", () => {
    expect(
      deriveCaseBoardNextAction(
        baseCase({
          status: "docs_needed",
          observation_goal: "Validate fit",
          notes: "Captured",
          debrief_key_findings: "Strong product interest",
        }),
      ),
    ).toBe("Add to Opportunities");

    expect(
      deriveCaseBoardNextAction(
        baseCase({
          follow_up_needed: true,
          related_opportunity_id: null,
          status: "completed",
          observation_goal: "Validate fit",
          notes: "Captured",
        }),
      ),
    ).toBe("Add to Opportunities");
  });

  it("recommends confirming product readiness for scheduled support cases", () => {
    expect(
      deriveCaseBoardNextAction(
        baseCase({
          case_type: "product_support",
          case_date: "2026-06-12",
          status: "scheduled",
          case_support_coverage: "rep_in_room|Rep assigned",
          case_implants_on_site: null,
          case_trays_sterilization_status: null,
        }),
      ),
    ).toBe("Confirm Product Readiness");
  });

  it("recommends supporting the procedure when support readiness is confirmed", () => {
    expect(
      deriveCaseBoardNextAction(
        baseCase({
          case_type: "product_support",
          case_date: "2026-06-12",
          status: "confirmed",
          case_support_coverage: "rep_in_room|Rep assigned",
          case_implants_on_site: "confirmed|On site",
          case_trays_sterilization_status: "confirmed|Ready",
        }),
      ),
    ).toBe("Support Procedure");
  });

  it("recommends completing case review after support cases finish", () => {
    expect(
      deriveCaseBoardNextAction(
        baseCase({
          case_type: "product_support",
          status: "completed",
          case_support_coverage: "rep_in_room|Rep assigned",
          case_implants_on_site: "confirmed|On site",
          case_trays_sterilization_status: "confirmed|Ready",
        }),
      ),
    ).toBe("Complete Case Review");
  });
});
