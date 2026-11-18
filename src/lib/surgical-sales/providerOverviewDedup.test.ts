import { describe, expect, it } from "vitest";
import {
  dedupeOperationalRisksForOverview,
  overviewShowsFullDiscoveryMap,
  priorityGapDbKeysForSection,
} from "./providerOverviewDedup";
import type { ProviderOperationalRisk } from "./buildProviderOperationalRisks";
import type { ProviderOverviewOperationalGap } from "./buildProviderOverviewStrategyGaps";
import { intelligenceGapFieldGuidance } from "./providerIntelligenceGapFieldGuidance";
import { providerOperationalConsequenceForField } from "./providerOperationalImpact";

function risk(partial: Partial<ProviderOperationalRisk> & Pick<ProviderOperationalRisk, "id" | "headline" | "sectionId">): ProviderOperationalRisk {
  return {
    title: partial.title ?? partial.id,
    severity: partial.severity ?? "medium",
    severityLabel: partial.severityLabel ?? "Medium",
    consequence: partial.consequence ?? "Consequence",
    mitigation: partial.mitigation ?? "Mitigation",
    consequenceScan: partial.consequenceScan ?? "Consequence",
    mitigationScan: partial.mitigationScan ?? "Mitigation",
    dbKey: partial.dbKey ?? "provider_observation_access_path",
    ...partial,
  };
}

function gap(partial: Partial<ProviderOverviewOperationalGap> & Pick<ProviderOverviewOperationalGap, "dbKey" | "headline">): ProviderOverviewOperationalGap {
  const sectionId = partial.sectionId ?? "observation_readiness";
  const operationalConsequence =
    partial.operationalConsequence ?? providerOperationalConsequenceForField(partial.dbKey);
  return {
    id: partial.id ?? partial.dbKey,
    unlockValue: partial.unlockValue ?? "Unlock",
    unlockScan: partial.unlockScan ?? "Unlock scan",
    sectionId,
    operationalConsequence,
    operationalImpact: partial.operationalImpact ?? operationalConsequence.summary,
    fieldGuidance:
      partial.fieldGuidance ?? intelligenceGapFieldGuidance(partial.dbKey, sectionId),
    ...partial,
  };
}

describe("providerOverviewDedup", () => {
  it("uses full discovery map only when no prioritized gaps", () => {
    expect(overviewShowsFullDiscoveryMap(0)).toBe(true);
    expect(overviewShowsFullDiscoveryMap(2)).toBe(false);
  });

  it("drops OR access risks when observation gaps are prioritized", () => {
    const gaps = [
      gap({
        dbKey: "provider_observation_access_path",
        headline: "OR access gates unknown",
        sectionId: "observation_readiness",
      }),
    ];
    const risks = [
      risk({
        id: "or_access_blockers",
        headline: "Different headline",
        sectionId: "observation_readiness",
      }),
      risk({
        id: "incumbent_vendor_strength",
        headline: "Incumbent entrenched",
        sectionId: "or_environment",
        dbKey: "provider_current_vendors",
      }),
    ];
    const filtered = dedupeOperationalRisksForOverview(risks, gaps);
    expect(filtered.map((r) => r.id)).toEqual(["incumbent_vendor_strength"]);
  });

  it("collects priority db keys for a section", () => {
    const keys = priorityGapDbKeysForSection(
      [
        gap({ dbKey: "a", headline: "A", sectionId: "observation_readiness" }),
        gap({ dbKey: "b", headline: "B", sectionId: "clinical_workflow" }),
      ],
      "observation_readiness",
    );
    expect([...keys]).toEqual(["a"]);
  });
});
