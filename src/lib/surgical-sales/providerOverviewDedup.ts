/**

 * Provider profile — canonical surface routing (no duplicate homes).

 *

 * | Concept | System of record | Tab |

 * |---------|------------------|-----|

 * | Operational readiness | buildProviderOperationalReadinessFramework → deployment briefing | Overview |

 * | Execution blockers | buildProviderCanonicalExecutionBlockers | Overview |

 * | Discovery priorities | buildProviderNextDiscoveryPriorities | Intelligence |

 * | Validated intelligence | buildProviderIntelligenceStatusCards | Intelligence |

 *

 * Helpers below only de-dupe data when builders overlap — they do not create second UI homes.

 */



import type { ProviderOperationalRisk } from "@/lib/surgical-sales/buildProviderOperationalRisks";

import type { ProviderOverviewOperationalGap } from "@/lib/surgical-sales/buildProviderOverviewStrategyGaps";

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

import type { ObservationFeasibilityValidationItem } from "@/lib/surgical-sales/buildProviderObservationFeasibilitySummary";



/** @deprecated Overview uses execution blockers only; full discovery map removed from overview. */

export function overviewShowsFullDiscoveryMap(strategyGapCount: number): boolean {

  return strategyGapCount === 0;

}



const RISK_IDS_COVERED_BY_SECTION_GAP = new Set([

  "or_access_blockers",

  "scheduling_uncertainty",

  "credentialing_unknown",

]);



function normalizeHeadline(text: string): string {

  return text.trim().toLowerCase().replace(/\s+/g, " ");

}



export function dedupeOperationalRisksForOverview(

  risks: ProviderOperationalRisk[],

  priorityGaps: ProviderOverviewOperationalGap[],

): ProviderOperationalRisk[] {

  if (priorityGaps.length === 0) return risks;



  const gapSectionIds = new Set(priorityGaps.map((g) => g.sectionId));

  const gapHeadlines = new Set(priorityGaps.map((g) => normalizeHeadline(g.headline)));

  const gapDbKeys = new Set(priorityGaps.map((g) => g.dbKey));



  return risks.filter((risk) => {

    if (gapDbKeys.has(risk.dbKey)) return false;

    if (gapHeadlines.has(normalizeHeadline(risk.headline))) return false;

    if (gapSectionIds.has(risk.sectionId) && RISK_IDS_COVERED_BY_SECTION_GAP.has(risk.id)) {

      return false;

    }

    return true;

  });

}



export function priorityGapDbKeysForSection(

  gaps: ProviderOverviewOperationalGap[],

  sectionId: ProviderIntelligenceSectionId,

): Set<string> {

  return new Set(gaps.filter((g) => g.sectionId === sectionId).map((g) => g.dbKey));

}



export function filterFeasibilityValidationAgainstPriorityGaps(

  items: ObservationFeasibilityValidationItem[],

  priorityGaps: ProviderOverviewOperationalGap[],

): ObservationFeasibilityValidationItem[] {

  const covered = priorityGapDbKeysForSection(priorityGaps, "observation_readiness");

  if (covered.size === 0) return items;

  return items.filter((item) => !covered.has(item.dbKey));

}

