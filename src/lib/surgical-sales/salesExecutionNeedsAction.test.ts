import { describe, expect, it } from "vitest";
import type { EnrichedSurgicalCaseListItem } from "@/lib/surgical-sales/enrichSurgicalCasesForList";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  assessCaseSalesExecutionNeedsAction,
  assessOpportunitySalesExecutionNeedsAction,
  assessProviderSalesExecutionNeedsAction,
  caseRecordNeedsAction,
  providerRecordNeedsAction,
} from "./salesExecutionNeedsAction";

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

function baseProvider(overrides: Partial<ProviderDirectoryRow> = {}): ProviderDirectoryRow {
  return {
    id: "p1",
    specialty: "Orthopedics",
    primary_organization_name: "Metro Surgical",
    primary_organization_id: "org-1",
    organization_count: 1,
    additional_organizations_count: 0,
    territory: "TX",
    planning_status: "not_started",
    linked_opportunities_count: 0,
    recent_case_count: 0,
    last_activity_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("salesExecutionNeedsAction", () => {
  it("does not flag missing observation objectives as needs action", () => {
    const assessment = assessCaseSalesExecutionNeedsAction(
      baseCase({ observation_goal: null }),
      "2026-06-01",
    );
    expect(assessment.items.some((item) => item.id === "scheduled_observation_objectives_missing")).toBe(
      false,
    );
  });

  it("does not flag billing gaps alone as needs action", () => {
    expect(
      caseRecordNeedsAction(
        baseCase({
          missing_po: true,
          missing_invoice: true,
          status: "billing_review",
          observation_goal: "Validate fit",
        }),
      ),
    ).toBe(false);
  });

  it("flags product support billing review as needs action", () => {
    expect(
      caseRecordNeedsAction(
        baseCase({
          case_type: "product_support",
          status: "billing_review",
        }),
      ),
    ).toBe(true);
  });

  it("flags completed observation without debrief plan only after provider series completes", () => {
    const assessment = assessCaseSalesExecutionNeedsAction(
      baseCase({
        status: "completed",
        observation_goal: "Validate fit",
        notes: "Captured in OR",
        debrief_key_findings: null,
      }),
    );
    expect(assessment.items.some((item) => item.id === "observation_debrief_pending")).toBe(false);
  });

  it("does not surface access gaps as optional intelligence warnings", () => {
    const assessment = assessCaseSalesExecutionNeedsAction(
      baseCase({
        case_date: "2026-06-02",
        observation_goal: "Validate fit",
        observation_access_scheduling_owner: null,
        observation_access_credentialing: "unknown",
      }),
      "2026-06-01",
    );
    expect(assessment.optionalIntelligenceLabel).toBeNull();
    expect(assessment.optionalIntelligenceGaps).toEqual([]);
    expect(assessment.items.some((item) => /scheduling owner/i.test(item.label))).toBe(false);
  });

  it("flags provider debrief as needs action", () => {
    const provider = baseProvider({
      observation_count: 5,
      relationship_pathway_stage_id: "debrief",
      recent_case_count: 2,
      planning_completion: {
        status: "in_progress",
        percent: 50,
        sections: [
          { id: "observation_readiness", label: "Observation readiness", status: "complete", confidence: "validated", confidence_progress: 100 },
          { id: "clinical_workflow", label: "Clinical workflow", status: "complete", confidence: "confirmed", confidence_progress: 100 },
          { id: "org_environment", label: "Facility context", status: "complete", confidence: "confirmed", confidence_progress: 100 },
          { id: "relationship_intelligence", label: "Relationship", status: "in_progress", confidence: "developing", confidence_progress: 40 },
        ],
      },
    });
    expect(providerRecordNeedsAction(provider)).toBe(true);
    expect(assessProviderSalesExecutionNeedsAction(provider).items[0]?.label).toBe("Complete debrief");
  });

  it("does not flag optional profile gaps as provider needs action", () => {
    const provider = baseProvider({
      last_activity_at: null,
      primary_organization_id: null,
      planning_completion: undefined,
    });
    expect(providerRecordNeedsAction(provider)).toBe(false);
  });

  it("flags evaluation follow-up when evaluation path is not scheduled", () => {
    const provider = baseProvider({
      relationship_pathway_stage_id: "evaluation",
      linked_opportunities_count: 2,
    });
    const assessment = assessProviderSalesExecutionNeedsAction(provider);
    expect(assessment.needsAction).toBe(true);
    expect(assessment.items[0]?.id).toBe("evaluation_follow_up_needed");
    expect(assessment.items[0]?.label).toBe("Schedule product trial case");
  });

  it("flags opportunities without next step assigned", () => {
    const assessment = assessOpportunitySalesExecutionNeedsAction({
      id: "opp-1",
      next_action: "",
      hasOpenTask: false,
      hasOverdueTask: false,
    });
    expect(assessment.needsAction).toBe(true);
    expect(assessment.items[0]?.id).toBe("opportunity_no_next_step");
  });
});
