import { describe, expect, it } from "vitest";
import {
  buildIntelligenceSaveConfirmationGroups,
  buildLogUpdateIntelligenceSaveConfirmation,
  buildSingleIntelligenceSaveConfirmation,
  intelligenceSavedDisplayLine,
} from "./intelligenceSaveConfirmation";

describe("intelligenceSaveConfirmation", () => {
  it("groups session saves by facility vs provider scope", () => {
    const baseline = {
      provider_observation_credentialing_needed: "",
      provider_procedure_focus: "",
    };
    const current = {
      provider_observation_credentialing_needed: "yes|required",
      provider_procedure_focus: "hernia|Hernia",
      provider_intelligence_field_metadata: {},
    };
    const groups = buildIntelligenceSaveConfirmationGroups({
      baseline,
      current,
      answeredDbKeys: [
        "provider_observation_credentialing_needed",
        "provider_procedure_focus",
      ],
      discoveryStakeholder: "unspecified",
    });
    expect(groups.map((g) => g.destination)).toEqual(["facility", "provider"]);
    expect(groups[0]?.heading).toBe("Saved to Organization Intelligence");
    expect(groups[1]?.heading).toBe("Saved to Provider");
  });

  it("uses facility lane default scope for organization fields", () => {
    const group = buildSingleIntelligenceSaveConfirmation({
      dbKey: "provider_observation_access_path",
      contact: { provider_observation_access_path: "scheduler|Through scheduler" },
      discoveryStakeholder: "facility_or_access",
    });
    expect(group?.destination).toBe("facility");
    expect(group?.heading).toBe("Saved to Organization Intelligence");
  });

  it("formats inheritance resolution lines", () => {
    const line = intelligenceSavedDisplayLine("provider_observation_credentialing_needed", {
      provider_intelligence_field_metadata: {
        provider_observation_credentialing_needed: {
          source_type: "profile",
          source_label: "Provider profile",
          updated_at: "2026-05-01T00:00:00.000Z",
          organization_inheritance: {
            stance: "does_not_apply",
            facility_display_line: "Vendor credentialing required",
            resolved_at: "2026-05-01T00:00:00.000Z",
          },
        },
      },
    });
    expect(line).toMatch(/Does not apply/i);
    expect(line).toMatch(/Vendor credentialing required/i);
  });

  it("builds log-update confirmation by save destination", () => {
    const groups = buildLogUpdateIntelligenceSaveConfirmation(
      {
        sourceText: "Intro call — relationship early-stage.",
        suggestedUpdates: [],
        fieldUpdates: [
          {
            id: "f1",
            label: "Relationship stage",
            dbKey: "provider_relationship_stage",
            proposedValue: "early|Early-stage",
            accepted: true,
            conflict: null,
            proposedScope: "provider",
            scopeReason: "Provider scope",
            proposedDestination: "provider",
            destinationReason: "Provider intelligence",
          },
        ],
        intelligenceReview: {
          confirmedUpdates: [],
          partiallyConfirmed: [],
          stillWorthConfirming: [],
          relatedOperationalAreas: [],
        },
        stillMissing: [],
        saveAsNoteAccepted: false,
        usesProviderIntelligence: true,
        mappingSource: "openai",
        aiMapping: null,
      },
      { engagementDebriefLine: "Intro call debrief" },
    );

    expect(groups.map((g) => g.heading)).toEqual(["Saved to Provider", "Saved to Engagement"]);
    expect(groups[0]?.lines[0]).toMatch(/early/i);
    expect(groups[1]?.lines[0]).toBe("Intro call debrief");
  });
});
