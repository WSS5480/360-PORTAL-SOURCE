import { describe, expect, it } from "vitest";

import { enrichProviderIntelligenceContact } from "./enrichProviderIntelligenceContact";
import { buildProviderIntelligenceKnowledgeDashboardView } from "./buildProviderIntelligenceKnowledgeDashboardView";

describe("enrichProviderIntelligenceContact", () => {
  it("fills scheduling owner from linked support contact when planning column is empty", () => {
    const contact = enrichProviderIntelligenceContact({
      contact: { first_name: "Alex", last_name: "Surgeon" },
      relatedContacts: [
        {
          id: "c1",
          first_name: "Maria",
          last_name: "Lopez",
          email: "maria@hospital.org",
          role_type: "scheduler",
          relationship_type: "support",
        },
      ],
    });

    expect(String(contact.provider_observation_coordinator_contact ?? "")).toMatch(/Maria/i);
    expect(String(contact.provider_observation_coordinator_contact ?? "")).toMatch(/maria@hospital.org/i);
  });

  it("surfaces linked scheduler on the intelligence briefing", () => {
    const view = buildProviderIntelligenceKnowledgeDashboardView({
      contact: enrichProviderIntelligenceContact({
        contact: { first_name: "Alex", last_name: "Surgeon" },
        relatedContacts: [
          {
            id: "c1",
            first_name: "Maria",
            last_name: "Lopez",
            email: "maria@hospital.org",
            role_type: "scheduler",
          },
        ],
      }),
      providerId: "p1",
      relatedContacts: [
        {
          id: "c1",
          first_name: "Maria",
          last_name: "Lopez",
          email: "maria@hospital.org",
          role_type: "scheduler",
        },
      ],
    });

    expect(view.hasFieldEvidence).toBe(true);
    expect(view.whatWeKnow.some((fact) => /scheduler/i.test(fact.text))).toBe(true);
    expect(view.keyPeople.find((p) => p.role.toLowerCase().includes("scheduler"))?.name).toMatch(/Maria/i);
    expect(view.keyPeople.find((p) => p.role.toLowerCase().includes("scheduler"))?.statusLabel).toBeTruthy();
  });
});
