import { describe, expect, it } from "vitest";

import { buildAccountUnderstandingConfirmCards } from "@/lib/surgical-sales/buildAccountUnderstandingUncertaintyCards";
import {
  buildOperationalReadinessCardFromConfirmCard,
  buildOrganizationOperationalReadinessCards,
} from "@/lib/surgical-sales/buildOperationalReadinessCardView";
import { INTELLIGENCE_CARD_READINESS_LABELS } from "@/lib/surgical-sales/providerIntelligenceCardStatus";

describe("buildOperationalReadinessCardView", () => {
  it("uses punchy synthesis instead of CRM narrative", () => {
    const contact = {
      provider_technique_preferences: "robotic|Surgeon prefers robotic cases",
    };
    const cards = buildAccountUnderstandingConfirmCards({
      contact,
      gaps: [],
      knownSummaryForSection: () => "Robotic-heavy workflow suspected",
      planning: {
        sections: [
          {
            id: "clinical_workflow",
            label: "Clinical",
            confidence: "partial",
            complete: false,
            missing_fields: [],
          },
        ],
      } as import("@/lib/surgical-sales/providerPlanningCompletion").ProviderPlanningCompletion,
    });
    const view = buildOperationalReadinessCardFromConfirmCard(cards[0]!, contact);
    expect(view.synthesisLine.length).toBeLessThan(90);
    expect(view.synthesisLine.toLowerCase()).not.toContain("provider stated");
  });

  it("exposes scan-first card fields", () => {
    const contact = {};
    const orgCards = buildOrganizationOperationalReadinessCards({ contact });
    expect(orgCards.length).toBeGreaterThan(0);
    const card = orgCards[0]!;
    expect(INTELLIGENCE_CARD_READINESS_LABELS[card.tone]).toBeTruthy();
    expect(card.scopeBadgeLabel).toBe("Facility");
    expect(card.openItemsLabel).toMatch(/open item/);
    expect(card.primaryActionLabel).toMatch(/Map|Refine/);
    expect(card.synthesisLine).not.toMatch(/…$/);
    expect(card.whatWeKnowItems.length + card.stillLearningItems.length).toBeGreaterThanOrEqual(0);
  });
});
