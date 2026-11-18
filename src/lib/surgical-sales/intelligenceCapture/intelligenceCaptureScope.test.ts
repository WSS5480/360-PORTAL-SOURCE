import { describe, expect, it } from "vitest";
import {
  buildIntelligencePropagationTargets,
  buildIntelligenceScopePropagationTargets,
} from "./intelligenceCaptureScope";

describe("buildIntelligencePropagationTargets", () => {
  const scope = {
    engagementId: "eng-1",
    providerId: "prov-1",
    organizationId: "org-1",
    providerLabel: "John Candy",
    organizationLabel: "Sinai Hospital",
    engagementTypeLabel: "Intro Call",
    productFocus: "ACSIS",
    locked: true,
  };

  it("activates case and OR access when observation fields match", () => {
    const scopeTargets = buildIntelligenceScopePropagationTargets({
      scope,
      engagementNotesSaved: true,
      logUpdate: {
        sourceText: "OR access through vendor credentialing",
        suggestedUpdates: [],
        fieldUpdates: [
          {
            id: "or",
            label: "OR access",
            dbKey: "provider_observation_access_path",
            proposedValue: "Vendor credentialing",
            accepted: true,
            conflict: null,
          },
        ],
        stillMissing: [],
        intelligenceReview: {
          confirmedUpdates: ["OR access"],
          partiallyConfirmed: [],
          stillWorthConfirming: [],
          relatedOperationalAreas: ["OR access"],
        },
        saveAsNoteAccepted: false,
        usesProviderIntelligence: false,
      },
    });
    const byScope = Object.fromEntries(scopeTargets.map((t) => [t.scope, t]));
    expect(byScope.case?.active).toBe(true);
    expect(byScope.organization?.active).toBe(true);
    expect(byScope.provider?.active).toBe(false);

    const targets = buildIntelligencePropagationTargets({
      scope,
      engagementNotesSaved: true,
      logUpdate: {
        sourceText: "OR access through vendor credentialing",
        suggestedUpdates: [],
        fieldUpdates: [
          {
            id: "or",
            label: "OR access",
            dbKey: "provider_observation_access_path",
            proposedValue: "Vendor credentialing",
            accepted: true,
            conflict: null,
          },
        ],
        stillMissing: [],
        intelligenceReview: {
          confirmedUpdates: ["OR access"],
          partiallyConfirmed: [],
          stillWorthConfirming: [],
          relatedOperationalAreas: ["OR access"],
        },
        saveAsNoteAccepted: false,
        usesProviderIntelligence: false,
      },
    });
    const labels = targets.map((t) => t.label);
    expect(labels).toContain("Provider profile intelligence");
    expect(labels).not.toContain("Provider operational understanding");
    expect(labels).not.toContain("OR access & deployment gates");
    expect(labels).not.toContain("Deployment readiness");
    expect(labels).not.toContain("Clinical focus");
    expect(labels).not.toContain("Observation Access");
    expect(targets.every((t) => t.active)).toBe(true);
  });
});
