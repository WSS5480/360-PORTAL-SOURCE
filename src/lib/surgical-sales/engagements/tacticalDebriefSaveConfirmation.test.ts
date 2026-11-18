import { describe, expect, it } from "vitest";
import {
  buildTacticalDebriefSaveConfirmation,
  finalizeTacticalDebriefSaveConfirmation,
} from "./tacticalDebriefSaveConfirmation";

describe("buildTacticalDebriefSaveConfirmation", () => {
  it("groups provider and engagement saves", () => {
    const result = buildTacticalDebriefSaveConfirmation({
      logUpdate: {
        sourceText: "Met scheduler. OR access via credentialing.",
        suggestedUpdates: [],
        fieldUpdates: [
          {
            id: "f1",
            label: "OR access — how you get in",
            dbKey: "provider_observation_access_path",
            proposedValue: "Vendor credentialing",
            accepted: true,
            conflict: null,
          },
        ],
        intelligenceReview: {
          confirmedUpdates: [],
          partiallyConfirmed: [],
          stillWorthConfirming: ["Observation approval still unresolved"],
          relatedOperationalAreas: [],
        },
        stillMissing: [],
        saveAsNoteAccepted: true,
        usesProviderIntelligence: true,
        mappingSource: "openai",
        aiMapping: null,
      },
      propagationTargets: [
        {
          id: "observation_access",
          destinationId: "observation_access_notes",
          groupId: "provider_profile",
          groupLabel: "Provider Profile",
          label: "Observation Access",
          active: true,
          detail: null,
        },
      ],
      engagementDebriefSaved: true,
      providerNoteSaved: true,
    });

    expect(result.categories.some((c) => c.id === "provider_profile")).toBe(true);
    expect(result.categories.some((c) => c.id === "engagement_record")).toBe(true);
    expect(result.categories.some((c) => c.id === "operational_readiness")).toBe(true);
    expect(result.destinationGroups.some((g) => g.heading === "Saved to Engagement")).toBe(true);
    expect(result.briefingHighlightZones).toContain("today");
    expect(result.progressLine).toMatch(/updated|captured/i);
    expect(result.changedSummary.length).toBeGreaterThan(0);
  });

  it("builds post-touch navigation actions for provider", () => {
    const finalized = finalizeTacticalDebriefSaveConfirmation(
      buildTacticalDebriefSaveConfirmation({
        logUpdate: null,
        propagationTargets: [],
        engagementDebriefSaved: true,
        providerNoteSaved: false,
      }),
      { providerId: "prov-1", accountId: "acct-1" },
    );

    expect(finalized.providerOverviewHref).toContain("/providers/prov-1");
    expect(finalized.postTouchActions.some((a) => a.id === "view_intelligence")).toBe(true);
    expect(finalized.postTouchActions.some((a) => a.id === "create_follow_up")).toBe(true);
    expect(finalized.postTouchActions.find((a) => a.id === "create_follow_up")?.href).toContain(
      "follow_up",
    );
  });
});
