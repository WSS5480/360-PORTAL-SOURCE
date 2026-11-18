import { describe, expect, it } from "vitest";
import {
  encouragesEngagementPreCallOnboarding,
  formatProviderRelationshipStage,
  isProviderSalesCustomer,
  normalizeProviderRelationshipStage,
  PROVIDER_CREATE_PATHWAY_STAGES,
  PROVIDER_ONBOARDING_RELATIONSHIP_OPTIONS,
  relationshipStageFromOnboardingAnswer,
  salesTrackFromOnboardingAnswer,
  skipsMandatoryPlanningOnboarding,
} from "@/lib/surgical-sales/providerRelationshipStage";

describe("providerRelationshipStage", () => {
  it("exposes five onboarding choices without workflow-duplicative labels", () => {
    const labels = PROVIDER_ONBOARDING_RELATIONSHIP_OPTIONS.map((o) => o.label);
    expect(labels).toEqual([
      "Early discovery",
      "Active evaluation",
      "Active relationship",
      "Established customer",
      "Dormant / reactivation",
    ]);
    expect(labels).not.toContain("New prospect");
    expect(labels).not.toContain("Planning first interaction");
  });

  it("maps onboarding answers to canonical stored stages", () => {
    expect(relationshipStageFromOnboardingAnswer("early_discovery")).toBe("early_discovery");
    expect(relationshipStageFromOnboardingAnswer("active_evaluation")).toBe("active_evaluation");
    expect(relationshipStageFromOnboardingAnswer("active_relationship")).toBe("active_relationship");
    expect(relationshipStageFromOnboardingAnswer("established_customer")).toBe("established_customer");
    expect(relationshipStageFromOnboardingAnswer("dormant_reactivation")).toBe("dormant");
  });

  it("normalizes legacy workflow stages to maturity stages", () => {
    expect(normalizeProviderRelationshipStage("prospect")).toBe("early_discovery");
    expect(normalizeProviderRelationshipStage("pre_call_planning")).toBe("early_discovery");
    expect(normalizeProviderRelationshipStage("engagement_active")).toBe("active_evaluation");
    expect(normalizeProviderRelationshipStage("observation_scheduled")).toBe("active_evaluation");
    expect(formatProviderRelationshipStage("prospect")).toBe("Early discovery");
  });

  it("treats only early discovery as encouraging engagement creation on profile", () => {
    expect(encouragesEngagementPreCallOnboarding("early_discovery")).toBe(true);
    expect(encouragesEngagementPreCallOnboarding("active_evaluation")).toBe(false);
    expect(encouragesEngagementPreCallOnboarding("pre_call_planning")).toBe(true);
    expect(skipsMandatoryPlanningOnboarding("active_relationship")).toBe(true);
    expect(skipsMandatoryPlanningOnboarding("active_evaluation")).toBe(false);
  });

  it("keeps Customer off the add-provider sales pathway track", () => {
    expect(PROVIDER_CREATE_PATHWAY_STAGES.map((s) => s.id)).toEqual([
      "discovery",
      "observation",
      "evaluation",
      "reactivation",
    ]);
    expect(salesTrackFromOnboardingAnswer("established_customer")).toBe("customer");
    expect(salesTrackFromOnboardingAnswer("early_discovery")).toBe("sales_pathway");
  });

  it("treats only established_customer as a sales customer", () => {
    expect(isProviderSalesCustomer("established_customer")).toBe(true);
    expect(isProviderSalesCustomer({ provider_relationship_stage: "established_customer" })).toBe(true);
    expect(isProviderSalesCustomer({ relationship_stage: "established_customer" })).toBe(true);
    expect(isProviderSalesCustomer("active_evaluation")).toBe(false);
    expect(isProviderSalesCustomer({ provider_relationship_stage: "early_discovery" })).toBe(false);
    expect(isProviderSalesCustomer({ provider_crm_status: "active" } as { provider_relationship_stage?: string })).toBe(
      false,
    );
  });
});
