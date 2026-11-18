import { describe, expect, it } from "vitest";

import {
  buildProviderFieldBriefingAsks,
  fieldBriefingLogResponseHref,
} from "./buildProviderFieldBriefingAsks";
import { resolveProviderCommercialWorkflowStage } from "./providerCommercialWorkflowStage";

describe("buildProviderFieldBriefingAsks", () => {
  it("prioritizes surgeon workflow questions on intro call and excludes credentialing", () => {
    const asks = buildProviderFieldBriefingAsks({
      contact: {
        provider_observation_credentialing_needed: null,
        provider_credentialing_status: null,
        provider_observation_coordinator_contact: null,
        provider_workflow_pain_points: null,
        provider_procedure_focus: null,
      },
      engagementType: "intro_call",
      relationshipStage: "prospect",
      commercialStage: resolveProviderCommercialWorkflowStage({
        relationshipStage: "prospect",
      }),
    });

    const ids = asks.map((a) => a.id);
    expect(ids).toContain("provider_workflow_pain_points");
    expect(ids).toContain("provider_procedure_focus");
    expect(ids).not.toContain("provider_observation_credentialing_needed");
    expect(ids).not.toContain("provider_credentialing_status");
    expect(ids).not.toContain("provider_observation_coordinator_contact");
  });

  it("includes scheduling and credentialing asks on office visit touch", () => {
    const asks = buildProviderFieldBriefingAsks({
      contact: {},
      engagementType: "office_visit_360",
      relationshipStage: "prospect",
      commercialStage: resolveProviderCommercialWorkflowStage({
        relationshipStage: "prospect",
      }),
    });

    const ids = asks.map((a) => a.id);
    expect(ids.some((id) => id.includes("credentialing") || id.includes("coordinator"))).toBe(
      true,
    );
    expect(ids).not.toContain("provider_technique_preferences");
  });

  it("deprioritizes asks that already have validated intelligence", () => {
    const asks = buildProviderFieldBriefingAsks({
      contact: {
        provider_workflow_pain_points: "dock setup delays|validated",
        provider_procedure_focus: "hernia|validated",
        provider_technique_preferences: "lap|validated",
        influence_level: "high",
        provider_communication_style: "text|validated",
        provider_follow_up_approach: "email|validated",
        provider_evaluation_openness: "open|validated",
        provider_or_team_dynamics: "collaborative|validated",
      },
      planning: { status: "complete", sections: [] },
      engagementType: "intro_call",
      relationshipStage: "active",
      commercialStage: resolveProviderCommercialWorkflowStage({
        relationshipStage: "active",
      }),
    });

    const ids = asks.map((a) => a.id);
    expect(ids).not.toContain("provider_workflow_pain_points");
    expect(ids).not.toContain("provider_procedure_focus");
    expect(ids).not.toContain("provider_technique_preferences");
    expect(ids.length).toBeLessThanOrEqual(3);
  });
});

describe("fieldBriefingLogResponseHref", () => {
  it("opens intelligence on the field section", () => {
    const href = fieldBriefingLogResponseHref(
      "/portal/sales/providers/p1?tab=overview",
      "provider_workflow_pain_points",
    );
    expect(href).toContain("tab=intelligence");
    expect(href).toContain("planning_section=");
  });
});
