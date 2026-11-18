import { describe, expect, it } from "vitest";
import { buildProviderRelationshipSignals } from "./buildProviderRelationshipSignals";
import { buildProviderRelationshipSnapshotView } from "./buildProviderRelationshipSnapshotView";
import type { ProviderEngagementSummary } from "./engagements/providerEngagementSummary";
import type { ProviderPlanningCompletion } from "./providerPlanningCompletion";

function eng(status: string): ProviderEngagementSummary {
  return {
    id: "e1",
    engagement_type: "intro_call",
    engagement_type_label: "Intro Call",
    status,
    status_label: status,
    pre_call_filled: 0,
    pre_call_total: 5,
    pre_call_complete: false,
    outcome_label: status,
  };
}

describe("buildProviderRelationshipSignals", () => {
  it("surfaces gap signals for a sparse new prospect", () => {
    const contact = { provider_relationship_stage: "prospect" };
    const signals = buildProviderRelationshipSignals({ contact, engagements: [] });

    expect(signals.length).toBeGreaterThanOrEqual(3);
    expect(signals.length).toBeLessThanOrEqual(5);
    expect(signals.map((s) => s.text)).toContain("Decision authority unclear");
    expect(signals.map((s) => s.text)).toContain("Clinical interests still unknown");
    expect(signals.map((s) => s.text)).toContain("Relationship still early-stage");
  });

  it("detects operational communication preference", () => {
    const contact = {
      provider_relationship_stage: "engagement_active",
      provider_communication_style: "Direct and operational — wants concise updates",
      influence_level: "influencer",
      provider_decision_maker_status: "partial",
      provider_follow_up_approach: "Biweekly check-in",
      provider_product_interests: "Wound care",
      provider_procedure_focus: "ACL",
    };
    const signals = buildProviderRelationshipSignals({
      contact,
      engagements: [eng("completed"), eng("completed")],
    });

    expect(signals.map((s) => s.text)).toContain("Prefers operational discussions");
    expect(signals.map((s) => s.text)).toContain("Strong procedural influence suspected");
  });

  it("caps at five signals and dedupes by id", () => {
    const contact = { provider_relationship_stage: "prospect" };
    const snapshot = buildProviderRelationshipSnapshotView({ contact });
    const signals = buildProviderRelationshipSignals({
      contact,
      snapshot,
      engagements: [],
    });

    expect(signals.length).toBeLessThanOrEqual(5);
    expect(new Set(signals.map((s) => s.id)).size).toBe(signals.length);
  });

  it("flags thin playbook for established customers", () => {
    const contact = {
      provider_relationship_stage: "established_customer",
      influence_level: "high",
      provider_follow_up_approach: "Quarterly review",
    };
    const signals = buildProviderRelationshipSignals({ contact, engagements: [eng("completed")] });

    expect(signals.map((s) => s.text)).toContain("Established stage — relationship playbook still thin");
  });
});
