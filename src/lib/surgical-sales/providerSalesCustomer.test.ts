import { describe, expect, it } from "vitest";

import { buildProviderOverviewBody } from "@/lib/surgical-sales/buildProviderOverviewBody";
import { buildProviderOverviewNarrative } from "@/lib/surgical-sales/buildProviderOverviewNarrative";
import { buildProviderOverviewWhatMattersSummary } from "@/lib/surgical-sales/buildProviderOverviewWhatMattersSummary";
import { buildProviderPathwayNextAction } from "@/lib/surgical-sales/buildProviderPathwayNextAction";
import { buildProviderEvidenceBasedRecommendations } from "@/lib/surgical-sales/providerEvidenceBasedRecommendations";
import {
  deriveProviderMissionBoardColumn,
  deriveProviderMissionBoardNextAction,
  groupProvidersByMissionBoardColumn,
} from "@/lib/surgical-sales/providerMissionBoard";
import { assessProviderSalesExecutionNeedsAction } from "@/lib/surgical-sales/salesExecutionNeedsAction";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";

function customerContact() {
  return { provider_relationship_stage: "established_customer" };
}

function pathwayContact() {
  return { provider_relationship_stage: "early_discovery" };
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
    last_activity_at: null,
    relationship_pathway_stage_id: "discovery",
    ...overrides,
  };
}

describe("provider sales customer classification", () => {
  it("does not suggest pathway next actions for customers", () => {
    expect(
      buildProviderPathwayNextAction(
        baseProvider({
          relationship_stage: "established_customer",
          provider_relationship_stage: "established_customer",
        } as ProviderDirectoryRow),
      ).label,
    ).toBe("Customer");
    expect(
      buildProviderPathwayNextAction(baseProvider({ relationship_stage: "early_discovery" })).label.length,
    ).toBeGreaterThan(0);
  });

  it("keeps in-pathway providers on the mission board and excludes customers", () => {
    const pathway = baseProvider({ id: "pathway", relationship_stage: "early_discovery" });
    const customer = baseProvider({
      id: "customer",
      relationship_stage: "established_customer",
      relationship_pathway_stage_id: "discovery",
    });

    expect(deriveProviderMissionBoardColumn(pathway)).toBe("discovery");
    expect(deriveProviderMissionBoardColumn(customer)).toBeNull();
    expect(deriveProviderMissionBoardNextAction(customer)).toBe("Customer");

    const grouped = groupProvidersByMissionBoardColumn([pathway, customer]);
    expect(grouped.get("discovery")?.map((p) => p.id)).toEqual(["pathway"]);
  });

  it("does not flag customers for pathway needs-action", () => {
    const assessment = assessProviderSalesExecutionNeedsAction(
      baseProvider({
        relationship_stage: "established_customer",
        observation_count: 5,
        relationship_pathway_stage_id: "debrief",
      }),
    );
    expect(assessment.needsAction).toBe(false);
    expect(assessment.items).toEqual([]);
  });

  it("hides overview pathway coaching for customers without changing pathway providers", () => {
    const customerNarrative = buildProviderOverviewNarrative({
      providerId: "prov-customer",
      contact: customerContact(),
      relationshipStage: "established_customer",
      engagements: [],
      newEngagementHref: "/engagements/new",
      newCaseHref: "/cases/new",
      intelligenceHref: "/providers/prov-customer?tab=intelligence",
      createOpportunityHref: "/opportunities/new",
    });
    const customerBody = buildProviderOverviewBody({
      narrative: customerNarrative,
      contact: customerContact(),
      providerId: "prov-customer",
      intelligenceHref: "/providers/prov-customer?tab=intelligence",
      briefingHref: "/providers/prov-customer?tab=briefing",
      newEngagementHref: "/engagements/new",
      activityHref: "/providers/prov-customer?tab=activity",
    });
    expect(customerBody.isSalesCustomer).toBe(true);
    expect(customerBody.nextBestAction.label).toBe("");
    expect(customerBody.priorityUnknowns).toEqual([]);

    const pathwayNarrative = buildProviderOverviewNarrative({
      providerId: "prov-1",
      contact: pathwayContact(),
      relationshipStage: "early_discovery",
      engagements: [],
      newEngagementHref: "/engagements/new",
      newCaseHref: "/cases/new",
      intelligenceHref: "/providers/prov-1?tab=intelligence",
      createOpportunityHref: "/opportunities/new",
    });
    const pathwayBody = buildProviderOverviewBody({
      narrative: pathwayNarrative,
      contact: pathwayContact(),
      providerId: "prov-1",
      intelligenceHref: "/providers/prov-1?tab=intelligence",
      briefingHref: "/providers/prov-1?tab=briefing",
      newEngagementHref: "/engagements/new",
      activityHref: "/providers/prov-1?tab=activity",
    });
    expect(pathwayBody.isSalesCustomer).toBe(false);
    expect(pathwayBody.nextBestAction.label.length).toBeGreaterThan(0);
  });

  it("does not emit what-matters or evidence-based suggestions for customers", () => {
    expect(
      buildProviderOverviewWhatMattersSummary({
        providerId: "prov-customer",
        relationshipStage: "established_customer",
        newEngagementHref: "/engagements/new",
        intelligenceHref: "/intel",
        engagements: [],
        contact: customerContact(),
      }),
    ).toEqual([]);
    expect(
      buildProviderEvidenceBasedRecommendations({
        contact: {
          ...customerContact(),
          provider_observation_feasibility: "yes",
        },
      }),
    ).toEqual([]);
  });
});
