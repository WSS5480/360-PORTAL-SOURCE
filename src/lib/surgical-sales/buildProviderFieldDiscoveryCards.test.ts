import { describe, expect, it } from "vitest";
import {
  buildProviderFieldDiscoveryCards,
  FIELD_DISCOVERIES_SECTION_TITLE,
  nextDiscoveryPriorityToFieldCard,
} from "./buildProviderFieldDiscoveryCards";
import type { NextDiscoveryPriority } from "./buildProviderNextDiscoveryPriorities";
import type { ProviderPlanningCompletion } from "./providerPlanningCompletion";

function basePlanning(): ProviderPlanningCompletion {
  return {
    filled: 0,
    total: 20,
    percent: 0,
    status: "not_started",
    sections_complete: 0,
    sections_total: 4,
    sections: [
      { id: "clinical_workflow", label: "Clinical", status: "not_started", filled: 0, total: 3, percent: 0, last_updated_at: null },
      { id: "or_environment", label: "OR", status: "not_started", filled: 0, total: 1, percent: 0, last_updated_at: null },
      { id: "relationship_intelligence", label: "Relationship", status: "not_started", filled: 0, total: 8, percent: 0, last_updated_at: null },
      { id: "commercial_signals", label: "Commercial", status: "not_started", filled: 0, total: 5, percent: 0, last_updated_at: null },
    ],
  } as ProviderPlanningCompletion;
}

describe("buildProviderFieldDiscoveryCards", () => {
  it("uses recommended field discoveries title", () => {
    expect(FIELD_DISCOVERIES_SECTION_TITLE).toBe("Next field priorities");
  });

  it("maps priorities to five card fields without leverage metrics", () => {
    const priority = {
      id: "provider_observation_coordinator_contact",
      missionTitle: "Confirm OR scheduling owner",
      headline: "Ask who controls OR scheduling",
      rationale: "",
      whyItMatters: "Without a scheduler owner, observation dates never hold.",
      expectedOutcome: "",
      operationalConsequence: { summary: "", ifIgnored: "", unlocks: "" },
      operationalImpact: "Without a scheduler owner, observation dates never hold.",
      unlockValue: "Observation scheduling authority.",
      captureMethod: "Scheduler + circulating nurse.",
      urgency: "high" as const,
      urgencyLabel: "High",
      confidenceGain: "",
      captureLabel: "Confirm OR scheduling owner",
      sectionId: "observation_readiness" as const,
      dbKey: "provider_observation_coordinator_contact",
      priorityScore: 80,
      leverageScore: 0,
      leverageTier: "",
      interactionTiming: "",
      bestInteraction: "",
      captureSource: "",
      operationalUnlock: "",
      confidenceGainEstimate: "",
      drivers: ["missing_signal" as const],
      workflowStage: "early_discovery" as const,
      maturityStage: "early_discovery" as const,
      stageTier: 1,
    } satisfies NextDiscoveryPriority;

    const card = nextDiscoveryPriorityToFieldCard(priority, {});
    expect(card.sectionTitle).toBe("Getting in to observe");
    expect(card.primaryUnknown).toBe("Who owns OR scheduling still unclear.");
    expect(card.whyItMatters.length).toBeGreaterThan(10);
    expect(card.bestSource).toMatch(/scheduler/i);
    expect(card.nextMove).toBe("Confirm OR scheduling owner");
    expect(card).not.toHaveProperty("leverageScore");
  });

  it("returns at most three discovery cards", () => {
    const cards = buildProviderFieldDiscoveryCards({
      contact: { provider_relationship_stage: "prospect" },
      planning: basePlanning(),
    });
    expect(cards.length).toBeLessThanOrEqual(3);
    for (const card of cards) {
      expect(card.sectionTitle.length).toBeGreaterThan(3);
      expect(card.summaryLines.length).toBeGreaterThan(0);
    expect(card.summaryLines.length).toBeLessThanOrEqual(4);
    expect(card.primaryUnknown.length).toBeGreaterThan(10);
    expect(card.primaryUnknown).not.toMatch(/,/);
    }
  });
});
