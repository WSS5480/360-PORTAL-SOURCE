import { describe, expect, it } from "vitest";

import {
  buildImmediateBlockers,
  buildIntelligenceCriticalUnknowns,
  buildOperationalStatusSummary,
  buildRequiredActions,
  buildTacticalRealities,
  sanitizeIntelligenceTabUserCopy,
} from "@/lib/surgical-sales/buildIntelligenceTabPresentation";
import { buildProviderIntelligenceScopeDisplay } from "@/lib/surgical-sales/buildProviderIntelligenceScopeDisplay";

describe("buildIntelligenceTabPresentation", () => {
  it("builds a lean status summary without duplicate blocker lists", () => {
    const summary = buildOperationalStatusSummary({
      contact: {},
      nextBestMove: "Schedule intro call",
      maturitySnapshot: {
        stage: "early_discovery",
        stageLabel: "Early discovery",
        stageHint: "",
        evolutionLine: "",
        stageIndex: 0,
        nextStageCriteria: [],
        nextStage: null,
        nextStageLabel: null,
        progressToNextPercent: 0,
        unmetNextDbKeys: [],
      },
    });
    expect(summary.readinessHeadline).toBe("Early discovery");
    expect(summary.operationalConfidence).toMatch(/still learning/i);
    expect(summary).not.toHaveProperty("primaryBlocker");
    expect(summary).not.toHaveProperty("viabilityLine");
    expect(summary.nextFieldMove).toBe("Schedule intro call");
  });

  it("omits generic blocker detail lines", () => {
    const scope = buildProviderIntelligenceScopeDisplay({
      contact: { organization_id: "org-1" },
      organizationName: "Metro General",
    });
    const signals = buildIntelligenceCriticalUnknowns({
      scope,
      organizationLinked: true,
      hasObservationHistory: false,
      combinedTier: "low",
    });
    const blockers = buildImmediateBlockers(signals);
    for (const b of blockers) {
      if (b.detail) {
        expect(b.detail.toLowerCase()).not.toBe(b.title.toLowerCase());
        expect(b.detail).not.toMatch(/needs validation on next field touch/i);
      }
    }
  });

  it("builds tactical realities as bullet lines", () => {
    const scope = buildProviderIntelligenceScopeDisplay({
      contact: {},
      organizationName: "Metro General",
      providerName: "Dr. Smith",
    });
    const realities = buildTacticalRealities({
      facilityGroups: [],
      providerGroups: [],
      facilityBullets: scope.facility.bullets,
      providerBullets: scope.provider.bullets,
    });
    expect(realities.facilityAccess.length).toBeGreaterThan(0);
    expect(realities.surgeonWorkflow.length).toBeGreaterThan(0);
  });

  it("dedupes required actions", () => {
    const actions = buildRequiredActions(
      [
        {
          id: "a",
          label: "Validate OR access path",
          detail: "",
          sectionId: "or_environment",
          priority: "high",
        },
        {
          id: "b",
          label: "Validate OR access path",
          detail: "",
          sectionId: "or_environment",
          priority: "medium",
        },
      ],
      { excludeLabels: ["Schedule intro call"] },
    );
    expect(actions).toHaveLength(1);
  });

  it("sanitizes legacy CRM phrases from user copy", () => {
    expect(sanitizeIntelligenceTabUserCopy("Not viable yet — primary blocker")).toMatch(
      /operational picture still developing/i,
    );
    expect(sanitizeIntelligenceTabUserCopy("Not viable yet — primary blocker")).toMatch(
      /needs validation/i,
    );
    expect(sanitizeIntelligenceTabUserCopy("Procedure mix captured but not validated")).toMatch(
      /needs validation/i,
    );
    expect(sanitizeIntelligenceTabUserCopy("Visibility still forming visibility")).toBe(
      "Visibility developing",
    );
  });
});
