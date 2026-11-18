import { describe, expect, it } from "vitest";
import { buildProviderRelationshipSnapshotView } from "./buildProviderRelationshipSnapshotView";
import { relationshipEmptyHint } from "./providerIntelligenceDisplayLabels";

describe("buildProviderRelationshipSnapshotView", () => {
  it("shows six relationship fields with rep-friendly empty guidance", () => {
    const view = buildProviderRelationshipSnapshotView({ contact: {} });

    expect(view.fields).toHaveLength(6);
    expect(view.fields.map((f) => f.id)).toEqual([
      "stage",
      "influence",
      "decision_maker",
      "communication",
      "follow_up",
      "strategy_notes",
    ]);
    expect(view.influence.emptyHint).toBe("Clarify who influences product decisions");
    expect(view.communication.emptyHint).toBe("Document preferred communication rhythm");
    expect(view.followUp.emptyHint).toBe("Ask during next engagement");
    expect(view.influence.hasValue).toBe(false);
    expect(view.influence.value).toBeNull();
  });

  it("formats values and avoids showing Unknown", () => {
    const view = buildProviderRelationshipSnapshotView({
      contact: {
        provider_relationship_stage: "engagement_active",
        influence_level: "unknown",
        provider_decision_maker_status: "yes",
        preferred_contact_method: "unknown",
        provider_communication_style: "Direct, prefers concise updates",
        provider_follow_up_approach: "Monthly lunch",
        provider_rep_strategy_notes: "Land preference card Q3",
      },
    });

    expect(view.stage.value).toBeTruthy();
    expect(view.influence.hasValue).toBe(false);
    expect(view.decisionMaker.value).toBe("Confirmed decision maker");
    expect(view.communication.value).toContain("Direct");
    expect(view.communication.value).not.toContain("Unknown");
    expect(view.followUp.value).toBe("Monthly lunch");
    expect(view.strategyNotes.value).toBe("Land preference card Q3");
  });

  it("uses field-specific guidance phrases", () => {
    expect(relationshipEmptyHint("influence")).toBe("Clarify who influences product decisions");
    expect(relationshipEmptyHint("communication")).toBe("Document preferred communication rhythm");
    expect(relationshipEmptyHint("follow_up")).toBe("Ask during next engagement");
    expect(relationshipEmptyHint("strategy_notes")).toBe("Capture after first call");
  });
});
