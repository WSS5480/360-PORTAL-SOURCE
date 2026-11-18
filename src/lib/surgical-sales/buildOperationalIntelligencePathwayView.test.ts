import { describe, expect, it } from "vitest";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { buildOperationalIntelligencePathwayView } from "./buildOperationalIntelligencePathwayView";

describe("buildOperationalIntelligencePathwayView", () => {
  it("returns five pathway sections for early discovery", () => {
    const view = buildOperationalIntelligencePathwayView({
      contact: {
        provider_relationship_stage: "early_discovery",
        provider_observation_feasibility: "open to observation next month",
      },
      relationshipStage: "early_discovery",
    });

    expect(view.requirementsToAdvance).toHaveLength(1);
    expect(view.requirementsToAdvance[0]?.requirementLabel).toMatch(/observation approved/i);
    expect(view.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(view.pathwayStageLabel).toBe("Discovery");

    const withEvidence = view.requirementsToAdvance.find((r) => r.knownEvidence);
    if (withEvidence) {
      expect(withEvidence.knownEvidence).toMatch(/"/);
      expect(withEvidence.whyItMatters.length).toBeGreaterThan(10);
    }

    expect(JSON.stringify(view)).not.toMatch(/recommended next move|strategic warning|AI summary/i);
  });

  it("lists only hard gate blockers for observe stage", () => {
    const view = buildOperationalIntelligencePathwayView({
      contact: {
        provider_relationship_stage: "observation_requested",
        provider_observation_feasibility: "allowed pending approval",
      },
      engagements: [
        {
          id: "e1",
          engagement_type: "or_observation",
          engagement_type_label: "OR observation",
          status: "scheduled",
          status_label: "Scheduled",
          pre_call_filled: 0,
          pre_call_total: 0,
          pre_call_complete: false,
          outcome_label: null,
          updated_at: "2026-05-01T12:00:00Z",
        } satisfies ProviderEngagementSummary,
      ],
      relationshipStage: "observation_requested",
    });

    expect(view.pathwayStageId).toBe("discovery");
    const blockers = view.knownBlockers.map((b) => b.requirementLabel.toLowerCase());
    expect(blockers).toEqual(expect.arrayContaining(["observation approved"]));
    expect(blockers.some((b) => /scheduler|credential/i.test(b))).toBe(false);
  });
});
