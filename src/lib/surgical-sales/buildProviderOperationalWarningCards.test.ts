import { describe, expect, it } from "vitest";
import {
  buildProviderOperationalWarningCards,
  canonicalBlockerToWarningCard,
  OPERATIONAL_WARNINGS_MAX,
  OPERATIONAL_WARNINGS_SECTION_TITLE,
} from "./buildProviderOperationalWarningCards";
import type { CanonicalExecutionBlocker } from "./buildProviderCanonicalExecutionBlockers";
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

describe("buildProviderOperationalWarningCards", () => {
  it("exposes calm section title and max three cards", () => {
    expect(OPERATIONAL_WARNINGS_SECTION_TITLE).toBe("Likely risks");
    expect(OPERATIONAL_WARNINGS_MAX).toBe(3);
  });

  it("maps blockers to four-field warning cards without jargon labels", () => {
    const blocker: CanonicalExecutionBlocker = {
      id: "risk:access",
      kind: "hard_stop",
      headline: "OR access path unclear",
      operationalImpact: "Vendor approval and OR access rules are still unclear.",
      resolveScan: "Confirm vendor clearance with scheduling before booking travel.",
      sectionId: "observation_readiness",
      dbKey: "provider_observation_access_path",
      severity: "high",
    };

    const card = canonicalBlockerToWarningCard(blocker);
    expect(card.title).toBe("Observation access may fail");
    expect(card.whyItMatters).toContain("Vendor approval");
    expect(card.reduceRisk).toContain("vendor clearance");
    expect(card.ctaLabel).toMatch(/access path/i);
    expect(card).not.toHaveProperty("operationalImpact");
  });

  it("returns at most three warnings for a prospect", () => {
    const cards = buildProviderOperationalWarningCards({
      contact: { provider_relationship_stage: "prospect" },
      planning: basePlanning(),
    });
    expect(cards.length).toBeLessThanOrEqual(3);
    for (const card of cards) {
      expect(card.title).not.toMatch(/protect field time/i);
      expect(card.whyItMatters).not.toMatch(/operational impact/i);
    }
  });
});
