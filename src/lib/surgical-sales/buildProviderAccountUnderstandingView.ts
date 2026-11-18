/**

 * Account notes view — one operational uncertainty per card.

 */



import {

  ACCOUNT_UNDERSTANDING_AREA_ORDER,

  ACCOUNT_UNDERSTANDING_AREAS,

  accountUnderstandingAreaForSection,

  accountUnderstandingOperationalState,

  PROVIDER_ACCOUNT_UNDERSTANDING,

  type AccountUnderstandingAreaId,

  type AccountUnderstandingLaneTone,

} from "@/lib/surgical-sales/providerAccountUnderstanding";

import {
  buildAccountUnderstandingConfirmCards,
  buildAccountUnderstandingSolidAreas,
  buildAccountUnderstandingUncertaintyCards,
  type AccountUnderstandingConfirmCard,
  type AccountUnderstandingSolidArea,
  type AccountUnderstandingUncertaintyCard,
} from "@/lib/surgical-sales/buildAccountUnderstandingUncertaintyCards";
import {
  buildCommercializationOperationalPicture,
  type CommercializationOperationalPictureLine,
} from "@/lib/surgical-sales/buildCommercializationOperationalPicture";

import type { IntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

import { PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

import {

  buildIntelligenceLearningGaps,

  type IntelligenceLearningGap,

} from "@/lib/surgical-sales/providerIntelligenceLearningGaps";

import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";

import { formatIntelligenceCaptureDisplay } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  isOperationalIntelligenceDisplayable,
  sanitizeOperationalDisplayText,
} from "@/lib/surgical-sales/operationalIntelligenceDisplay";

import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

import { findPlanningSection } from "@/lib/surgical-sales/providerPlanningCompletion";

import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { pickSectionSynthesisField } from "@/lib/surgical-sales/discoveryOperationalSynthesis";

import { buildProviderOverviewKnownSoFar } from "@/lib/surgical-sales/buildProviderOverviewKnownSoFar";

import { resolveProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

import { ACCOUNT_UNDERSTANDING_KNOWN_MAX } from "@/lib/surgical-sales/providerAccountUnderstanding";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";



const MAX_KNOWN_FRAGMENTS = 2;

const VALUE_MAX = 48;

const SNAPSHOT_MAX = 100;



export type AccountUnderstandingThinArea = {

  id: AccountUnderstandingAreaId;

  title: string;

  hint: string;

  sectionId: ProviderIntelligenceSectionId;

};



/** @deprecated Retained for tests — lanes replaced by uncertainty cards */

export type AccountUnderstandingAreaView = {

  id: AccountUnderstandingAreaId;

  title: string;

  hint: string;

  sectionId: ProviderIntelligenceSectionId;

  operationalState: string;

  tone: AccountUnderstandingLaneTone;

  snapshot: string;

  knownSummary: string | null;

  needsValidationSummary: string | null;

  hasOpenLoops: boolean;

  whyItMatters: string;

  bestNextSource: string | null;

  cta: null;

};



export type ProviderAccountUnderstandingView = {

  lead: string;

  workspaceSynthesis: CommercializationOperationalPictureLine[];

  whatWeKnow: string[];

  confirmCards: AccountUnderstandingConfirmCard[];

  uncertaintyCards: AccountUnderstandingUncertaintyCard[];

  solidAreas: AccountUnderstandingSolidArea[];

  thinAreas: AccountUnderstandingThinArea[];

  /** Legacy lane model for regression tests */

  areas: AccountUnderstandingAreaView[];

  priorityLaneIds: AccountUnderstandingAreaId[];

};



function formatKnownFragment(contact: Record<string, unknown>, dbKey: string): string | null {

  const raw = String(contact[dbKey] ?? "").trim();

  if (!raw || !fieldHasIntelligenceSignal(dbKey, raw)) return null;
  if (!isOperationalIntelligenceDisplayable(dbKey, raw)) return null;

  const display =
    sanitizeOperationalDisplayText(formatIntelligenceCaptureDisplay(dbKey, raw) ?? raw) ?? null;
  if (!display) return null;

  return scanLine(display, VALUE_MAX);

}



export function buildKnownSummaryForSection(

  contact: Record<string, unknown>,

  sectionId: ProviderIntelligenceSectionId,

): string | null {

  const keys = PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? [];

  const parts: string[] = [];

  for (const dbKey of keys) {

    const value = formatKnownFragment(contact, dbKey);

    if (!value) continue;

    parts.push(value);

    if (parts.length >= MAX_KNOWN_FRAGMENTS) break;

  }

  if (parts.length === 0) return null;

  const synthesized = pickSectionSynthesisField(sectionId, contact);
  if (synthesized) return scanLine(synthesized, SNAPSHOT_MAX);

  return scanLine(parts.join(". "), SNAPSHOT_MAX);

}



function deriveLaneTone(

  knownSummary: string | null,

  hasOpenGap: boolean,

): AccountUnderstandingLaneTone {

  if (hasOpenGap) return "active";

  if (knownSummary) return "steady";

  return "thin";

}



function buildLegacySnapshot(

  knownSummary: string | null,

  primaryUnknown: string | null,

): string {

  if (primaryUnknown) return primaryUnknown;

  if (knownSummary) return knownSummary;

  return PROVIDER_ACCOUNT_UNDERSTANDING.notMuchHereYet;

}



function buildLegacyAreas(input: {

  contact: Record<string, unknown>;

  planning: ProviderPlanningCompletion;

  gaps: IntelligenceLearningGap[];

  uncertaintyCards: AccountUnderstandingUncertaintyCard[];

}): AccountUnderstandingAreaView[] {

  const openByArea = new Map(

    input.uncertaintyCards.map((c) => [c.areaId, c.primaryUnknown] as const),

  );



  return ACCOUNT_UNDERSTANDING_AREA_ORDER.map((areaId) => {

    const def = ACCOUNT_UNDERSTANDING_AREAS[areaId];

    const section = findPlanningSection(input.planning, def.sectionId);

    const confidence: IntelligenceSectionConfidence = section?.confidence ?? "unknown";

    const knownSummary = buildKnownSummaryForSection(input.contact, def.sectionId);

    const primaryUnknown = openByArea.get(areaId) ?? null;

    const hasOpenLoops = Boolean(primaryUnknown);

    const tone = deriveLaneTone(knownSummary, hasOpenLoops);



    return {

      id: areaId,

      title: def.title,

      hint: def.hint,

      sectionId: def.sectionId,

      operationalState: accountUnderstandingOperationalState(areaId, confidence, {

        hasOpenLoops,

      }),

      tone,

      snapshot: buildLegacySnapshot(knownSummary, primaryUnknown),

      knownSummary,

      needsValidationSummary: primaryUnknown,

      hasOpenLoops,

      whyItMatters: "",

      bestNextSource: null,

      cta: null,

    };

  });

}



export function buildProviderAccountUnderstandingView(input: {

  contact: Record<string, unknown>;

  planning?: ProviderPlanningCompletion | null;

  relationshipStage?: string | null;

  engagements?: ProviderEngagementSummary[];

  opportunities?: Array<Record<string, unknown>>;

  cases?: Array<Record<string, unknown>>;

  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;

}): ProviderAccountUnderstandingView | null {

  if (!input.planning) return null;



  const commercialStage = resolveProviderCommercialWorkflowStage({

    relationshipStage:

      input.relationshipStage ?? String(input.contact.provider_relationship_stage ?? ""),

    engagements: input.engagements,

    opportunities: input.opportunities,

    cases: input.cases,

  });



  const whatWeKnow = buildProviderOverviewKnownSoFar({

    contact: input.contact,

    commercialStage,

    engagements: input.engagements,

    maxItems: ACCOUNT_UNDERSTANDING_KNOWN_MAX,

  });



  const allGaps = buildIntelligenceLearningGaps(input.contact, input.planning, 24);

  const knownSummaryForSection = (sectionId: ProviderIntelligenceSectionId) =>
    buildKnownSummaryForSection(input.contact, sectionId);

  const confirmCards = buildAccountUnderstandingConfirmCards({
    contact: input.contact,
    gaps: allGaps,
    knownSummaryForSection,
    fieldMetadata: input.fieldMetadata,
    planning: input.planning,
  });

  const workspaceSynthesis = buildCommercializationOperationalPicture({
    contact: input.contact,
    planning: input.planning,
    fieldMetadata: input.fieldMetadata,
    confirmCards,
    gaps: allGaps,
    engagements: input.engagements,
    opportunities: input.opportunities,
  });

  const uncertaintyCards = buildAccountUnderstandingUncertaintyCards(allGaps, {
    contact: input.contact,
    fieldMetadata: input.fieldMetadata,
    planning: input.planning,
  });

  const solidAreas = buildAccountUnderstandingSolidAreas({

    contact: input.contact,

    gaps: allGaps,

    knownSummaryForSection,
  });



  const thinAreas: AccountUnderstandingThinArea[] = ACCOUNT_UNDERSTANDING_AREA_ORDER.flatMap(

    (areaId) => {

      const def = ACCOUNT_UNDERSTANDING_AREAS[areaId];

      const hasGap = allGaps.some((g) => accountUnderstandingAreaForSection(g.sectionId) === areaId);

      const hasKnown = Boolean(buildKnownSummaryForSection(input.contact, def.sectionId));

      if (hasGap || hasKnown) return [];

      return [

        {

          id: areaId,

          title: def.title,

          hint: def.hint,

          sectionId: def.sectionId,

        },

      ];

    },

  );



  const areas = buildLegacyAreas({

    contact: input.contact,

    planning: input.planning,

    gaps: allGaps,

    uncertaintyCards,

  });



  const priorityLaneIds = uncertaintyCards.map((c) => c.areaId);



  return {

    lead: PROVIDER_ACCOUNT_UNDERSTANDING.pageLead,

    workspaceSynthesis,

    whatWeKnow,

    confirmCards,

    uncertaintyCards,

    solidAreas,

    thinAreas,

    areas,

    priorityLaneIds,

  };

}


