import { describe, expect, it } from "vitest";
import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import {
  buildOpportunityPipelineView,
  buildProductFitEntries,
  classifyOpportunityPipelineSection,
  filterEligibleOpportunityProviders,
  isProviderOpportunityEligible,
} from "@/lib/surgical-sales/opportunityPipelineView";
import { isProviderCommercialProspect } from "@/lib/surgical-sales/providerCommercialStatus";

function baseProvider(overrides: Partial<ProviderDirectoryRow> = {}): ProviderDirectoryRow {
  return {
    id: "prov-1",
    first_name: "Jane",
    last_name: "Smith",
    crm_status: "prospect",
    relationship_stage: "early_discovery",
    primary_organization_name: "Test Hospital",
    specialty: "General Surgery",
    linked_opportunities_count: 0,
    recent_case_count: 0,
    last_activity_at: "2026-06-01T12:00:00.000Z",
    planning_status: "not_started",
    organization_count: 1,
    additional_organizations_count: 0,
    territory: null,
    ...overrides,
  };
}

describe("providerCommercialStatus eligibility", () => {
  it("includes prospect providers who are not active customers", () => {
    expect(
      isProviderOpportunityEligible({
        commercialStatus: "prospect",
        relationshipStage: "early_discovery",
      }),
    ).toBe(true);
  });

  it("excludes inactive and not targeted statuses", () => {
    expect(isProviderCommercialProspect("prospect")).toBe(true);
    expect(
      isProviderOpportunityEligible({ commercialStatus: "inactive", relationshipStage: "early_discovery" }),
    ).toBe(false);
    expect(
      isProviderOpportunityEligible({ commercialStatus: "not_targeted", relationshipStage: "early_discovery" }),
    ).toBe(false);
  });

  it("excludes established customers even if marked prospect", () => {
    expect(
      isProviderOpportunityEligible({
        commercialStatus: "prospect",
        relationshipStage: "established_customer",
        hasWonOpportunity: true,
      }),
    ).toBe(false);
  });
});

describe("classifyOpportunityPipelineSection", () => {
  it("places undeveloped providers in new prospects", () => {
    const section = classifyOpportunityPipelineSection({
      provider: baseProvider({ onboarding_status: "draft" }),
    });
    expect(section).toBe("new_prospects");
  });

  it("places linked evaluation work in evaluation_first_case", () => {
    const section = classifyOpportunityPipelineSection({
      provider: baseProvider({ linked_opportunities_count: 1 }),
    });
    expect(section).toBe("evaluation_first_case");
  });

  it("detects emerging product fit from intelligence fields", () => {
    const section = classifyOpportunityPipelineSection({
      provider: baseProvider(),
      contact: { provider_workflow_pain_points: "Turnover delays with current mesh tray" },
    });
    expect(section).toBe("product_fit_emerging");
  });
});

describe("buildProductFitEntries", () => {
  it("only surfaces product fits when evidence exists in intelligence text", () => {
    expect(buildProductFitEntries({ contact: null })).toEqual([]);
    expect(
      buildProductFitEntries({
        contact: { provider_product_interests: "Possible ACSIS fit during lap cases" },
        hasObservationEvidence: true,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ product: "ACSIS", status: "investigating" }),
      ]),
    );
  });
});

describe("buildOpportunityPipelineView", () => {
  it("groups eligible providers into pipeline sections", () => {
    const view = buildOpportunityPipelineView([
      { provider: baseProvider({ id: "a" }) },
      {
        provider: baseProvider({ id: "b", linked_opportunities_count: 2 }),
      },
      {
        provider: baseProvider({ id: "c", crm_status: "active" }),
      },
    ]);

    expect(view.totalCount).toBe(2);
    const evalSection = view.sections.find((s) => s.id === "evaluation_first_case");
    expect(evalSection?.providers.some((p) => p.providerId === "b")).toBe(true);
  });
});
