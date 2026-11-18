import { describe, expect, it } from "vitest";

import { buildProviderIntelligenceKnowledgeDashboardView } from "./buildProviderIntelligenceKnowledgeDashboardView";

describe("buildProviderIntelligenceKnowledgeDashboardView scheduler sync", () => {
  it("shows validated scheduler in confirmed facts after overview save shape", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: {
        first_name: "Alex",
        last_name: "Surgeon",
        provider_observation_coordinator_contact: "Maria Lopez (Scheduler) maria@hospital.org",
        provider_intelligence_field_metadata: {
          provider_observation_coordinator_contact: {
            source_type: "profile",
            source_label: "Provider overview",
            validated_at: "2026-06-05T12:00:00.000Z",
            lifecycle_state: "validated",
            updated_at: "2026-06-05T12:00:00.000Z",
          },
        },
      },
      providerId: "p1",
      activityTimeline: [
        {
          activity_type: "provider_intelligence_updated",
          body: "Scheduler linked",
        },
      ],
    });

    expect(view.hasFieldEvidence).toBe(true);
    expect(view.whatWeKnow.some((fact) => /scheduler/i.test(fact.text))).toBe(true);
  });
});
