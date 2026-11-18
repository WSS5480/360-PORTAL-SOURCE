import { describe, expect, it } from "vitest";
import type { EnrichedSurgicalCaseListItem } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import {
  deriveCaseBoardWorkflowStage,
  groupCasesByBoardWorkflowStage,
  visibleCaseBoardWorkflowStages,
} from "./buildCaseBoardWorkflowStage";

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

describe("buildCaseBoardWorkflowStage", () => {
  it("places observation cases without access approval in Observation Requested", () => {
    expect(
      deriveCaseBoardWorkflowStage(
        baseCase({
          observation_access_pathway: null,
        }),
      ),
    ).toBe("requested");
  });

  it("places approved-but-unscheduled cases in Observation Approved", () => {
    expect(
      deriveCaseBoardWorkflowStage(
        baseCase({
          observation_access_pathway: "Approved via OR leadership",
          case_date: null,
          status: "draft",
        }),
      ),
    ).toBe("approved");
  });

  it("places scheduled observation cases in Observation Scheduled", () => {
    expect(
      deriveCaseBoardWorkflowStage(
        baseCase({
          observation_access_pathway: "Approved via OR leadership",
          case_date: "2026-06-10",
          status: "scheduled",
          surgeon_contact_id: "provider-1",
        }),
      ),
    ).toBe("scheduled");
  });

  it("places completed cases with notes in Observation Completed", () => {
    expect(
      deriveCaseBoardWorkflowStage(
        baseCase({
          status: "completed",
          observation_goal: "Validate workflow fit",
          notes: "Captured intra-op workflow notes",
        }),
      ),
    ).toBe("completed");
  });

  it("places debrief-pending cases in Completed Cases", () => {
    expect(
      deriveCaseBoardWorkflowStage(
        baseCase({
          status: "completed",
          observation_goal: "",
          notes: "",
        }),
      ),
    ).toBe("completed");
  });

  it("always shows scheduled and completed, plus any column that has cases", () => {
    const requested = baseCase({ observation_access_pathway: null });
    const debrief = baseCase({
      status: "completed",
      observation_goal: "",
      notes: "",
    });
    const grouped = groupCasesByBoardWorkflowStage([requested, debrief], (a, b) =>
      String(a.case_date ?? "").localeCompare(String(b.case_date ?? "")),
    );

    expect(visibleCaseBoardWorkflowStages(grouped).map((stage) => stage.id)).toEqual([
      "requested",
      "scheduled",
      "completed",
    ]);
  });

  it("puts dated draft cases on Scheduled Cases so the board matches the list count", () => {
    const datedDraft = baseCase({
      case_type: "product_support",
      case_date: "2026-08-17",
      status: "draft",
    });
    expect(deriveCaseBoardWorkflowStage(datedDraft, "2026-08-18")).toBe("scheduled");

    const grouped = groupCasesByBoardWorkflowStage([datedDraft], () => 0);
    expect(grouped.get("scheduled")).toHaveLength(1);
    expect(visibleCaseBoardWorkflowStages(grouped).map((stage) => stage.id)).toEqual(["scheduled", "completed"]);
  });

  it("keeps the scheduled and completed columns visible when only scheduled cases are populated", () => {
    const scheduled = baseCase({
      observation_access_pathway: "Approved",
      case_date: "2026-06-10",
      status: "scheduled",
      surgeon_contact_id: "provider-1",
    });
    const grouped = groupCasesByBoardWorkflowStage([scheduled], (a, b) =>
      String(a.case_date ?? "").localeCompare(String(b.case_date ?? "")),
    );

    expect(visibleCaseBoardWorkflowStages(grouped).map((stage) => stage.id)).toEqual(["scheduled", "completed"]);
  });

  it("maps product support cases through the same workflow progression", () => {
    expect(
      deriveCaseBoardWorkflowStage(
        baseCase({
          case_type: "product_support",
          case_date: "2026-06-12",
          status: "confirmed",
          case_support_coverage: "rep_in_room|Rep assigned",
        }),
      ),
    ).toBe("scheduled");
  });
});
