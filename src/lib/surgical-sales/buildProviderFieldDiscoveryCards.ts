/**

 * Recommended field discoveries — one operational uncertainty per card.

 */



import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

import {

  buildProviderNextDiscoveryPriorities,

  NEXT_DISCOVERY_PRIORITIES_VISIBLE_DEFAULT,

  type NextDiscoveryPriority,

} from "@/lib/surgical-sales/buildProviderNextDiscoveryPriorities";

import {

  accountUnderstandingBestSource,

  accountUnderstandingCaptureHelper,

  ACCOUNT_UNDERSTANDING_CAPTURE_LABEL,

  accountUnderstandingNextMove,

  accountUnderstandingPrimaryUnknown,

  accountUnderstandingWhyItMatters,

} from "@/lib/surgical-sales/accountUnderstandingUncertaintyCopy";

import {
  buildUncertaintyCardRecentNotes,
  buildUncertaintyCardSummaryLines,
} from "@/lib/surgical-sales/accountUnderstandingUncertaintyDetail";

import { intelligenceGapFieldGuidance } from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

import type { IntelligenceLearningGap } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";

import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

import {

  ACCOUNT_UNDERSTANDING_AREAS,

  accountUnderstandingAreaForSection,

} from "@/lib/surgical-sales/providerAccountUnderstanding";

import { providerOperationalConsequenceForField } from "@/lib/surgical-sales/providerOperationalImpact";



import { FIELD_DISCOVERIES_SECTION_TITLE } from "@/lib/surgical-sales/providerIntelligenceRepVocabulary";



export { FIELD_DISCOVERIES_SECTION_TITLE };

export const FIELD_DISCOVERIES_VISIBLE_MAX = NEXT_DISCOVERY_PRIORITIES_VISIBLE_DEFAULT;



export type FieldDiscoveryCard = {

  id: string;

  sectionTitle: string;

  primaryUnknown: string;

  whyItMatters: string;

  bestSource: string;

  nextMove: string;

  captureLabel: string;

  captureHelper: string;

  summaryLines: string[];

  recentNotes: string | null;

  recentNotesHistory: string | null;

  sectionId: ProviderIntelligenceSectionId;

  dbKey: string;

};



function gapFromPriority(priority: NextDiscoveryPriority): IntelligenceLearningGap {

  const operationalConsequence =

    priority.operationalConsequence ?? providerOperationalConsequenceForField(priority.dbKey);



  return {

    dbKey: priority.dbKey,

    sectionId: priority.sectionId,

    phrase: priority.headline,

    state: "unknown",

    priorityScore: priority.priorityScore,

    bestLearnedFrom: priority.captureSource ?? "",

    unlocksNext: priority.unlockValue,

    operationalImpact: priority.operationalImpact ?? operationalConsequence.summary,

    operationalConsequence,

    fieldGuidance: intelligenceGapFieldGuidance(priority.dbKey, priority.sectionId),

  };

}



function sectionTitleForPriority(priority: NextDiscoveryPriority): string {

  const areaId = accountUnderstandingAreaForSection(priority.sectionId);

  return ACCOUNT_UNDERSTANDING_AREAS[areaId].title;

}



export function nextDiscoveryPriorityToFieldCard(
  priority: NextDiscoveryPriority,
  contact: Record<string, unknown> = {},
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
): FieldDiscoveryCard {
  const gap = gapFromPriority(priority);
  const bestSource = accountUnderstandingBestSource(gap);
  const nextMove = accountUnderstandingNextMove(gap);
  const primaryUnknown = accountUnderstandingPrimaryUnknown(gap);
  const recent = buildUncertaintyCardRecentNotes(contact, priority.dbKey, fieldMetadata);

  return {
    id: priority.id,
    sectionTitle: sectionTitleForPriority(priority),
    primaryUnknown,
    whyItMatters: accountUnderstandingWhyItMatters(gap),
    bestSource,
    nextMove,
    captureLabel: ACCOUNT_UNDERSTANDING_CAPTURE_LABEL,
    captureHelper: accountUnderstandingCaptureHelper(bestSource, nextMove),
    summaryLines: buildUncertaintyCardSummaryLines({ primaryUnknown, bestSource, nextMove }),
    recentNotes: recent.text,
    recentNotesHistory: recent.historyLine,
    sectionId: priority.sectionId,
    dbKey: priority.dbKey,
  };
}



export function buildProviderFieldDiscoveryCards(input: {

  contact: Record<string, unknown>;

  planning?: ProviderPlanningCompletion | null;

  specialty?: string | null;

  relationshipStage?: string | null;

  engagements?: ProviderEngagementSummary[];

  opportunities?: Array<Record<string, unknown>>;

  cases?: Array<Record<string, unknown>>;

  maxItems?: number;

  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;

}): FieldDiscoveryCard[] {

  if (!input.planning) return [];



  const maxItems = input.maxItems ?? FIELD_DISCOVERIES_VISIBLE_MAX;



  const priorities = buildProviderNextDiscoveryPriorities({

    contact: input.contact,

    planning: input.planning,

    specialty: input.specialty,

    relationshipStage: input.relationshipStage,

    engagements: input.engagements,

    opportunities: input.opportunities,

    cases: input.cases,

  }).filter((p) => p.priorityScore > 0 || p.id === "refresh");



  if (priorities.length === 1 && priorities[0]?.id === "refresh") {

    return [];

  }



  const seenAreas = new Set<string>();



  return priorities

    .filter((p) => p.id !== "refresh")

    .filter((p) => {

      const areaId = accountUnderstandingAreaForSection(p.sectionId);

      if (seenAreas.has(areaId)) return false;

      seenAreas.add(areaId);

      return true;

    })

    .slice(0, maxItems)

    .map((p) => nextDiscoveryPriorityToFieldCard(p, input.contact, input.fieldMetadata));

}


