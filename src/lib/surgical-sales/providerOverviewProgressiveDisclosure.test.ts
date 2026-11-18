import { describe, expect, it } from "vitest";
import {
  buildProviderOverviewWorkDisclosure,
  providerOverviewWorkDisclosureHasData,
} from "./providerOverviewProgressiveDisclosure";
import { resolveProviderCommercialWorkflowStage } from "./providerCommercialWorkflowStage";

describe("providerOverviewProgressiveDisclosure", () => {
  it("hides cases and initiatives for early prospect", () => {
    const stage = resolveProviderCommercialWorkflowStage({ relationshipStage: "prospect" });
    const streams = buildProviderOverviewWorkDisclosure({
      commercialStage: stage,
      relationshipStage: "prospect",
      newCaseHref: "/cases/new",
      createOpportunityHref: "/opps/new",
    });
    expect(streams.find((s) => s.id === "cases")).toBeUndefined();
    expect(streams.find((s) => s.id === "initiatives")).toBeUndefined();
  });

  it("shows initiative guidance instead of empty widget in evaluation without opps", () => {
    const stage = resolveProviderCommercialWorkflowStage({
      relationshipStage: "active_relationship",
    });
    const streams = buildProviderOverviewWorkDisclosure({
      commercialStage: stage,
      relationshipStage: "active_relationship",
      engagements: [
        {
          id: "e1",
          status: "completed",
          engagement_type: "intro_call",
          engagement_type_label: "Intro call",
          status_label: "Completed",
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          outcome_label: "",
        },
      ],
      newCaseHref: "/cases/new",
      createOpportunityHref: "/opps/new",
    });
    const initiatives = streams.find((s) => s.id === "initiatives");
    expect(initiatives?.mode).toBe("guidance");
    expect(initiatives?.guidance).toMatch(/evaluation planned/i);
    expect(providerOverviewWorkDisclosureHasData(streams)).toBe(false);
  });

  it("shows cases data when cases exist", () => {
    const stage = resolveProviderCommercialWorkflowStage({
      relationshipStage: "observation_scheduled",
    });
    const streams = buildProviderOverviewWorkDisclosure({
      commercialStage: stage,
      relationshipStage: "observation_scheduled",
      cases: [{ id: "c1", case_type: "observation" }],
      newCaseHref: "/cases/new",
      createOpportunityHref: "/opps/new",
    });
    expect(streams.find((s) => s.id === "cases")?.mode).toBe("data");
  });

  it("reveals evaluation tracking guidance during observation before eval", () => {
    const stage = resolveProviderCommercialWorkflowStage({
      relationshipStage: "observation_scheduled",
    });
    const streams = buildProviderOverviewWorkDisclosure({
      commercialStage: stage,
      relationshipStage: "observation_scheduled",
      newCaseHref: "/cases/new",
      createOpportunityHref: "/opps/new",
    });
    const evalTrack = streams.find((s) => s.id === "evaluation_tracking");
    expect(evalTrack?.mode).toBe("guidance");
    expect(evalTrack?.guidance).toMatch(/clinical validation/i);
  });
});
