import { describe, expect, it } from "vitest";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  buildProviderEvaluationPathView,
  deriveProviderEvaluationPath,
  EVALUATION_SCHEDULE_ACTION_LABELS,
  providerEvaluationPathFromDirectoryRow,
  resolveEvaluationNextActionLabel,
  resolveEvaluationStatus,
} from "./buildProviderEvaluationPathView";

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
    relationship_pathway_stage_id: "evaluation",
    ...overrides,
  };
}

describe("buildProviderEvaluationPathView", () => {
  it("defaults evaluation providers to 360 Experience when no fit signals exist", () => {
    expect(deriveProviderEvaluationPath({})).toBe("360 Experience");
  });

  it("prefers Product Trial when product fit exists on file", () => {
    expect(
      deriveProviderEvaluationPath({
        contact: {
          provider_preference_card_signals: "Strong QTi fit",
          provider_intelligence_field_metadata: {
            provider_preference_card_signals: {
              source_type: "engagement",
              source_label: "Debrief",
              updated_at: "2026-06-01T12:00:00Z",
              evidence_text: "Strong QTi fit",
            },
          },
        },
      }),
    ).toBe("Product Trial");
  });

  it("derives product trial from upcoming demo engagement", () => {
    expect(
      deriveProviderEvaluationPath({
        upcomingEngagement: {
          id: "e1",
          href: "/portal/sales/engagements/e1",
          engagement_type: "product_demo",
          type_label: "Product Evaluation",
          datetime_label: "Jun 15",
          location_label: "Metro Surgical",
          primary_goal: "Confirm product interest",
          open_items: [],
        },
      }),
    ).toBe("Product Trial");
  });

  it("uses path-specific schedule actions", () => {
    expect(EVALUATION_SCHEDULE_ACTION_LABELS["Product Trial"]).toBe("Schedule product trial case");
    expect(EVALUATION_SCHEDULE_ACTION_LABELS["360 Experience"]).toBe("Schedule 360 Experience");
    expect(
      resolveEvaluationNextActionLabel({
        pathLabel: "Product Trial",
        upcomingEngagement: null,
      }),
    ).toBe("Schedule product trial case");
  });

  it("prefers stored evaluation path over inference", () => {
    expect(
      deriveProviderEvaluationPath({
        contact: { provider_evaluation_path: "Surgeon Education" },
        linkedOpportunitiesCount: 1,
      }),
    ).toBe("Surgeon Education");
  });

  it("derives in-service from upcoming training engagement", () => {
    expect(
      buildProviderEvaluationPathView({
        upcomingEngagement: {
          id: "e2",
          href: "/portal/sales/engagements/e2",
          engagement_type: "in_service_training",
          type_label: "In-Service",
          datetime_label: "Jul 1",
          location_label: "Metro Surgical",
          primary_goal: "Train staff",
          open_items: [],
        },
      }).pathLabel,
    ).toBe("In-Service");
  });

  it("builds status and next action on evaluation view", () => {
    const view = buildProviderEvaluationPathView({
      upcomingEngagement: {
        id: "e3",
        href: "/portal/sales/engagements/e3",
        engagement_type: "office_visit_360",
        type_label: "360 Experience",
        datetime_label: "Aug 2",
        location_label: "Clinic",
        primary_goal: "Hands-on product experience",
        open_items: [],
      },
      engagements: [
        {
          id: "e3",
          engagement_type: "office_visit_360",
          engagement_type_label: "360 Experience",
          status: "scheduled",
          status_label: "Scheduled",
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          outcome_label: null,
        },
      ],
    });

    expect(view.pathLabel).toBe("360 Experience");
    expect(view.statusLabel).toBe("Planned");
    expect(view.nextActionLabel).toBe("Prepare 360 Experience");
  });

  it("derives evaluation path from directory row", () => {
    const view = providerEvaluationPathFromDirectoryRow(
      baseProvider({
        upcoming_engagement: {
          id: "e3",
          href: "/portal/sales/engagements/e3",
          engagement_type: "office_visit_360",
          type_label: "360 Experience",
          datetime_label: "Aug 2",
          location_label: "Clinic",
          primary_goal: "Hands-on product experience",
          open_items: [],
        },
      }),
    );

    expect(view.pathLabel).toBe("360 Experience");
    expect(resolveEvaluationStatus({ pathLabel: view.pathLabel })).toBe("Not Scheduled");
  });
});
