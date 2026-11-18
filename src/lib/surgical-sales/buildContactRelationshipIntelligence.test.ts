import { describe, expect, it } from "vitest";
import { buildContactRelationshipIntelligence } from "./buildContactRelationshipIntelligence";

describe("buildContactRelationshipIntelligence", () => {
  it("builds scheduler purpose and influence areas", () => {
    const intel = buildContactRelationshipIntelligence({
      contact: {
        role_type: "scheduler",
        preferred_contact_method: "email",
        best_time_to_contact: "Mornings",
        access_notes: "Call before 10",
        personality_notes: "Direct",
        email: "sched@metro.com",
        influence_level: "influencer",
      },
      organizationLinks: [
        {
          id: "ol1",
          account_id: "org-1",
          role_type: "scheduler",
          is_primary_org: true,
          is_active: true,
          accounts: { name: "Metro Surgical" },
        },
      ],
      relatedContacts: [
        { id: "prov-1", first_name: "Alex", last_name: "Chen", role_type: "surgeon" },
      ],
      relationships: [{ primary_contact_id: "prov-1", relationship_type: "scheduler" }],
    });

    expect(intel.purposeLine).toMatch(/scheduling/i);
    expect(intel.influenceAreas.find((a) => a.id === "scheduling")?.active).toBe(true);
    expect(intel.supportedProviders).toHaveLength(1);
    expect(intel.missingItems).toEqual([]);
  });

  it("surfaces missing intelligence gaps", () => {
    const intel = buildContactRelationshipIntelligence({
      contact: { role_type: "office_manager" },
      organizationLinks: [],
      relatedContacts: [],
      relationships: [],
    });

    expect(intel.missingItems.length).toBeGreaterThan(0);
    expect(intel.missingItems).toContain("Preferred contact method");
    expect(intel.missingItems).toContain("Linked supported providers");
  });
});
