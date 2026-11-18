import { describe, expect, it } from "vitest";
import type { EnrichedSurgicalCaseListItem } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import {
  buildCaseBoardCardView,
  buildObservationBoardCardView,
  buildObservationBoardIntelligenceItems,
  buildObservationBoardMetricPills,
  buildProductSupportBoardCardView,
  buildProductSupportBoardIntelligenceItems,
  buildProductSupportBoardMetricPills,
  buildSurgicalCaseBoardCardView,
  caseDictationStatusLabel,
  buildCaseMissionIntelligenceItems,
  caseListRowNeedsAttention,
  countCasesNeedingAttention,
  deriveCaseBoardNextRecommendedAction,
  deriveCaseListNextAction,
  deriveMissionBoardStage,
  deriveObservationBoardStatusLabel,
  deriveProductSupportBoardStatusLabel,
  deriveProductSupportOutcomeReviewStatus,
  isProductSupportBoardCase,
  resolveCaseBoardCardKind,
  formatCaseBoardDateLine,
  formatCaseBoardScheduleLine,
  formatCaseBoardStatusBadge,
  formatCaseListDate,
  groupCasesByMissionStage,
  isCaseReadyToObserve,
  sortCasesForExecutionList,
  sortCasesForMobileFeed,
} from "./surgicalCasesListMobileHelpers";

function baseCase(overrides: Partial<EnrichedSurgicalCaseListItem> = {}): EnrichedSurgicalCaseListItem {
  return {
    id: "case-1",
    case_number: "SC-1001",
    account_id: "acct-1",
    case_date: "2026-06-01",
    status: "scheduled",
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

describe("mission board helpers", () => {
  it("places scheduled observation with objectives in Upcoming even without access admin", () => {
    const c = baseCase({
      observation_goal: "Validate workflow fit",
      surgeon_contact_id: "provider-1",
    });
    expect(deriveMissionBoardStage(c)).toBe("ready_to_observe");
    expect(isCaseReadyToObserve(c)).toBe(true);
  });

  it("places observation missing objectives in Upcoming when scheduled", () => {
    const c = baseCase({
      observation_access_scheduling_owner: null,
      observation_access_credentialing: "unknown",
      observation_goal: null,
    });
    expect(deriveMissionBoardStage(c)).toBe("ready_to_observe");
    expect(isCaseReadyToObserve(c)).toBe(true);
  });

  it("prioritizes debrief and follow-up stages over ready state", () => {
    const debrief = baseCase({
      status: "completed",
      observation_goal: "",
      notes: "",
      observation_access_scheduling_owner: "OR coordinator",
      observation_access_credentialing: "verified",
    });
    expect(deriveMissionBoardStage(debrief)).toBe("awaiting_debrief");

    const followUp = baseCase({
      follow_up_needed: true,
      observation_access_scheduling_owner: "OR coordinator",
      observation_access_credentialing: "verified",
      observation_goal: "Validate workflow fit",
    });
    expect(deriveMissionBoardStage(followUp)).toBe("follow_up_needed");
  });

  it("groups cases into mission stages", () => {
    const planning = baseCase({
      status: "requested",
      observation_goal: null,
    });
    const ready = baseCase({
      observation_access_pathway: "Approved via OR leadership",
      observation_access_scheduling_owner: "OR coordinator",
      observation_access_credentialing: "verified",
      observation_goal: "Validate workflow fit",
      surgeon_contact_id: "provider-1",
    });
    const grouped = groupCasesByMissionStage([planning, ready]);
    expect(grouped.get("needs_planning")).toHaveLength(1);
    expect(grouped.get("ready_to_observe")).toHaveLength(1);
  });

  it("sorts mobile feed with earlier dates first", () => {
    const today = "2026-06-01";
    const later = baseCase({ case_date: "2026-06-10" });
    const sooner = baseCase({ case_date: today });
    const sorted = [later, sooner].sort(sortCasesForMobileFeed);
    expect(sorted[0]?.case_date).toBe(today);
  });

  it("formats case list dates with time when present", () => {
    expect(formatCaseListDate(baseCase({ case_date: "2026-06-01", case_time: "07:30:00" }))).toMatch(/Jun/);
  });

  it("counts cases needing attention for missing observation notes after case day", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const attention = baseCase({
      case_date: yesterday,
      status: "scheduled",
      notes: "",
    });
    const ready = baseCase({
      case_date: yesterday,
      status: "scheduled",
      notes: "Captured observation notes",
    });
    expect(countCasesNeedingAttention([attention, ready])).toBe(1);
  });

  it("flags attention rows for incomplete observation planning", () => {
    const c = baseCase({
      observation_access_scheduling_owner: null,
      observation_goal: null,
    });
    expect(caseListRowNeedsAttention(c)).toBe(true);
  });

  it("builds mission intelligence items for field execution gaps", () => {
    const items = buildCaseMissionIntelligenceItems(
      baseCase({
        status: "scheduled",
        case_date: "2026-05-01",
        notes: "",
        observation_goal: "Validate fit",
      }),
    );
    expect(items.map((item) => item.label)).toEqual(["Capture observation notes"]);
  });

  it("derives next action for observation objectives before admin work", () => {
    expect(
      deriveCaseListNextAction(
        baseCase({
          case_date: "2026-12-15",
          observation_access_scheduling_owner: null,
          observation_access_credentialing: "unknown",
          observation_goal: null,
        }),
      ),
    ).toBe("Set observation objectives");
  });
});

describe("case board card view", () => {
  it("builds observation board cards with header, workflow status, intelligence, and action", () => {
    const view = buildSurgicalCaseBoardCardView(
      baseCase({
        surgeon_display: "Dr. John Smith",
        account_name: "Test Hospital",
        procedure_type: "Laparoscopic Cholecystectomy",
        status: "scheduled",
        case_date: "2026-12-15",
        observation_goal: "Validate workflow fit\nConfirm technique",
        observation_key_questions: "How does the surgeon dock?\nWhat fixation is used?",
        observation_signals_to_validate: "ACSIS interest",
        observation_validation_targets: [
          {
            id: "target-1",
            label: "Workflow fit",
            source: "manual",
            status: "planned",
            created_at: "2026-06-01T00:00:00.000Z",
          },
        ],
      }),
    );

    expect(view.providerName).toBe("John Smith");
    expect(view.procedureLabel).toBe("Laparoscopic Cholecystectomy");
    expect(view.facilityName).toBe("Test Hospital");
    expect(view.dateLine).toMatch(/December 15/);
    expect(view.caseBoardKind).toBe("observation");
    expect(view.statusLabel).toBe("Ready to Observe");
    expect(view.metricsSectionLabel).toBe("Observation Metrics");
    expect(view.priorityInsightSourceLabel).toBe("Planned validation target");
    expect(view.priorityInsightSourceField).toBe("observation_validation_targets");
    expect(view.metricPills.map((pill) => pill.id)).toEqual(
      expect.arrayContaining(["learning_objectives", "open_questions", "product_signals"]),
    );
    expect(view.metricPills.map((pill) => pill.text)).toEqual(
      expect.arrayContaining([
        "3 Learning Objectives",
        "2 Open Questions",
        "1 Product Signal",
      ]),
    );
    expect(view.nextRecommendedAction).toBe("Perform Observation");
  });

  it("uses observation-specific status labels instead of generic workflow labels", () => {
    expect(
      formatCaseBoardStatusBadge(
        baseCase({
          status: "scheduled",
          observation_access_scheduling_owner: null,
          observation_goal: null,
        }),
      ),
    ).toBe("Scheduled");

    expect(
      deriveObservationBoardStatusLabel(
        baseCase({
          status: "confirmed",
          case_date: "2026-12-15",
          observation_access_pathway: null,
          observation_access_scheduling_owner: "OR coordinator",
          observation_access_credentialing: "verified",
          observation_goal: "Validate workflow fit",
          surgeon_contact_id: "provider-1",
        }),
      ),
    ).toBe("Ready to Observe");
  });

  it("uses note_count to show observation dictation captured", () => {
    const c = baseCase({
      status: "completed",
      case_date: "2026-05-01",
      notes: "",
      note_count: 1,
    });

    expect(caseDictationStatusLabel(c)).toBe("Dictation captured");
    expect(deriveObservationBoardStatusLabel(c, "2026-06-01")).not.toBe("Notes Pending");
    expect(caseListRowNeedsAttention(c)).toBe(false);
  });

  it("shows latest dictation intelligence as the board priority insight", () => {
    const view = buildSurgicalCaseBoardCardView(
      baseCase({
        note_count: 1,
        latest_note_body:
          "I spoke with Sarah afterward, and she said they're interested in scheduling an evaluation with us sometime next month.",
        observation_validation_targets: [
          {
            id: "target-1",
            label: "Workflow fit",
            status: "planned",
          },
        ],
      }),
    );

    expect(view.priorityInsight).toBe("Evaluation scheduling interest captured");
    expect(view.priorityInsightSourceLabel).toBe("Latest dictation");
    expect(view.priorityInsightSourceField).toBe("latest_note_body");
  });

  it("builds product support board cards with support-specific metrics and status", () => {
    const view = buildProductSupportBoardCardView(
      baseCase({
        case_type: "product_support",
        surgeon_display: "John Smith",
        account_name: "Test Hospital",
        procedure_type: "Laparoscopic Ventral Hernia Repair",
        product_name: "ACSIS Kit",
        case_date: "2026-06-04",
        status: "scheduled",
        surgeon_contact_id: "provider-1",
        account_id: "acct-1",
        observation_access_pathway: "Approved for case coverage",
        case_support_coverage: "rep_in_room|Rep assigned",
        case_implants_on_site: "confirmed|On site",
        case_trays_sterilization_status: "confirmed|Ready",
      }),
    );

    expect(view.providerName).toBe("John Smith");
    expect(view.procedureLabel).toBe("Laparoscopic Ventral Hernia Repair");
    expect(view.facilityName).toBe("Test Hospital");
    expect(view.dateLine).toMatch(/June 4/);
    expect(view.caseBoardKind).toBe("product_support");
    expect(view.statusLabel).toBe("Coverage Confirmed");
    expect(view.metricsSectionLabel).toBe("Support Metrics");
    expect(view.metricPills.map((pill) => pill.id)).toEqual(
      expect.arrayContaining(["product", "outcome_review"]),
    );
    expect(view.metricPills.some((pill) => pill.id === "product" && pill.text.includes("ACSIS Kit"))).toBe(true);
    expect(view.metricPills.some((pill) => pill.id === "learning_objectives")).toBe(false);
    expect(view.nextRecommendedAction).toBe("Support Procedure");
  });

  it("does not attach observation metrics to product support cards", () => {
    const view = buildSurgicalCaseBoardCardView(
      baseCase({
        case_type: "product_support",
        observation_goal: "Should not appear",
        observation_key_questions: "Should not appear",
        observation_signals_to_validate: "Should not appear",
        product_name: "ACSIS Kit",
      }),
    );

    expect(view.caseBoardKind).toBe("product_support");
    expect(view.metricPills.every((pill) => !["learning_objectives", "open_questions", "product_signals", "opportunity_signals"].includes(pill.id))).toBe(true);
  });

  it("does not attach support metrics to observation cards", () => {
    const view = buildSurgicalCaseBoardCardView(
      baseCase({
        case_type: "observation",
        product_name: "ACSIS Kit",
        case_support_outcome: "follow_up_needed",
      }),
    );

    expect(view.caseBoardKind).toBe("observation");
    expect(view.metricPills.every((pill) => !["product", "rep_tasks", "follow_up", "outcome_review"].includes(pill.id))).toBe(true);
  });

  it("shows follow-up actions on product support cards when flagged", () => {
    const pills = buildProductSupportBoardMetricPills(
      baseCase({
        case_type: "product_support",
        follow_up_needed: true,
        product_name: "ACSIS Kit",
      }),
    );

    expect(pills.some((pill) => pill.id === "follow_up")).toBe(true);
  });

  it("includes opportunity signal pills when follow-up or linked opportunity exists", () => {
    const pills = buildObservationBoardMetricPills(
      baseCase({
        follow_up_needed: true,
        related_opportunity_id: "opp-1",
      }),
    );

    expect(pills.some((pill) => pill.text === "2 Product Fit Signals")).toBe(true);
  });

  it("includes dictation status in observation board metrics", () => {
    expect(
      buildObservationBoardMetricPills(baseCase({ note_count: 0 })).some(
        (pill) => pill.id === "dictation_status" && pill.text === "Dictation needed",
      ),
    ).toBe(true);

    expect(
      buildObservationBoardMetricPills(baseCase({ note_count: 2 })).some(
        (pill) => pill.id === "dictation_status" && pill.text === "2 dictations captured",
      ),
    ).toBe(true);
  });

  it("derives board next actions for debrief, notes, and opportunity follow-up", () => {
    expect(
      deriveCaseBoardNextRecommendedAction(
        baseCase({
          status: "completed",
          observation_goal: "",
          notes: "",
        }),
      ),
    ).toBe("Complete Observation Notes");

    expect(
      deriveCaseBoardNextRecommendedAction(
        baseCase({
          status: "completed",
          case_date: "2026-05-01",
          observation_goal: "Validate fit",
          notes: "",
        }),
        "2026-06-01",
      ),
    ).toBe("Complete Observation Notes");

    expect(
      deriveCaseBoardNextRecommendedAction(
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

  it("builds observation metrics from dictation status and case objectives", () => {
    const pills = buildObservationBoardMetricPills(
      baseCase({
        observation_goal: "Validate workflow fit",
        observation_key_questions: "How does the surgeon dock?",
        observation_signals_to_validate: "Product interest",
      }),
    );

    expect(pills.map((pill) => pill.text)).toEqual([
      "Dictation needed",
      "1 Learning Objective",
      "1 Open Question",
      "1 Product Signal",
    ]);
  });

  it("keeps legacy case identity builder for list compatibility", () => {
    const view = buildCaseBoardCardView(
      baseCase({
        surgeon_display: "Dr. John Smith",
        surgeon_specialty: "General Surgery",
        account_name: "Test Hospital",
        status: "draft",
        case_date: "2026-05-29",
        observation_access_pathway: "Approved via OR leadership",
        observation_access_scheduling_owner: "Karen",
        observation_access_credentialing: "unknown",
        observation_goal: null,
      }),
    );

    expect(view.caseTypeLabel).toBe("Observation Case");
    expect(view.providerName).toBe("John Smith");
    expect(view.openQuestionsCount).toBe(0);
  });

  it("formats board dates without time", () => {
    const caseRow = baseCase({ case_date: "2026-05-29", case_time: "07:00:00" });
    expect(formatCaseBoardDateLine(caseRow)).toMatch(/May 29/);
    expect(formatCaseBoardScheduleLine(caseRow)).toMatch(/May 29/);
  });
});
