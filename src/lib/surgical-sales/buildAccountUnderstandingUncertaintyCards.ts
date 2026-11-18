/**

 * Understanding tab — operational intelligence cards per area.

 */



import {

  ACCOUNT_UNDERSTANDING_AREA_ORDER,

  ACCOUNT_UNDERSTANDING_AREAS,

  ACCOUNT_UNDERSTANDING_CONFIRM_AREA_ORDER,

  accountUnderstandingAreaForSection,

  type AccountUnderstandingAreaId,

} from "@/lib/surgical-sales/providerAccountUnderstanding";

import {

  accountUnderstandingBestPerson,

  accountUnderstandingCaptureHelper,

  accountUnderstandingMappingCta,

  accountUnderstandingNextMove,

  accountUnderstandingPrimaryUnknown,

  accountUnderstandingWhyItMatters,

} from "@/lib/surgical-sales/accountUnderstandingUncertaintyCopy";

import {

  accountUnderstandingBestNextAction,

  accountUnderstandingConfidenceFromSection,

  accountUnderstandingKnownLine,

  accountUnderstandingOperationalRisk,

  accountUnderstandingSourceAttribution,

  accountUnderstandingTacticalImplication,

  accountUnderstandingUnknownLine,

  type AccountUnderstandingConfidenceLevel,

} from "@/lib/surgical-sales/accountUnderstandingOperationalCard";

import {

  buildUncertaintyCardRecentNotes,

  buildUncertaintyCardSummaryLines,

} from "@/lib/surgical-sales/accountUnderstandingUncertaintyDetail";

import type { IntelligenceLearningGap } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

import type { IntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import type { OperationalIntelligenceUncertaintyKind } from "@/lib/surgical-sales/operationalIntelligenceReadiness";
import { buildSectionOperationalMappingProgress } from "@/lib/surgical-sales/providerIntelligenceOperationalMapping";
import {
  buildIntelligenceSectionProgressPills,
  buildIntelligenceSectionScanSummary,
} from "@/lib/surgical-sales/intelligenceSectionScanView";
import { deploymentReadinessBadgeLabel } from "@/lib/surgical-sales/discoveryOperationalSynthesis";

import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

import { findPlanningSection } from "@/lib/surgical-sales/providerPlanningCompletion";



export const ACCOUNT_UNDERSTANDING_UNCERTAINTY_MAX = 3;



export type AccountUnderstandingConfirmCard = {

  id: string;

  areaId: AccountUnderstandingAreaId;

  sectionTitle: string;

  sectionHint: string;

  known: string;

  unknown: string;

  operationalRisk: string;

  tacticalImplication: string;

  bestNextAction: string;

  confidenceLevel: AccountUnderstandingConfidenceLevel;

  confidenceLabel: string;

  missionReadinessLabel: string;

  readinessScore: number;

  uncertaintyKind: OperationalIntelligenceUncertaintyKind | null;

  sourceAttribution: string | null;

  captureLabel: string;

  captureHelper: string;

  mappingStatusBadge: string;

  scanMetricsLine: string;

  scanSummaryLine: string;

  progressPills: ReturnType<typeof buildIntelligenceSectionProgressPills>;

  readinessTone: import("@/lib/surgical-sales/providerIntelligenceCardStatus").IntelligenceCardReadinessTone;

  /** @deprecated Use scanMetricsLine */
  mappingProgressLines: string[];

  sectionId: ProviderIntelligenceSectionId;

  dbKey: string;

  /** @deprecated Use known */

  knownSummary: string | null;

  /** @deprecated Use unknown */

  stillNeed: string;

  /** @deprecated */

  bestPersonToAsk: string;

  /** @deprecated Use captureLabel */

  addNoteLabel: string;

};



export type AccountUnderstandingUncertaintyCard = {

  id: string;

  areaId: AccountUnderstandingAreaId;

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



export type AccountUnderstandingWorkspaceSynthesisLine = {

  id: "operate" | "decisions" | "blockers" | "missing" | "tactical";

  label: string;

  line: string;

};



function topGapForArea(

  gaps: IntelligenceLearningGap[],

  areaId: AccountUnderstandingAreaId,

): IntelligenceLearningGap | null {

  if (areaId === "operational") {

    return (

      gaps.find((g) => g.sectionId === "or_environment") ??

      gaps.find((g) => g.sectionId === "observation_readiness") ??

      null

    );

  }

  const sectionId = ACCOUNT_UNDERSTANDING_AREAS[areaId].sectionId;

  return gaps.find((g) => g.sectionId === sectionId) ?? null;

}



function sectionConfidence(

  planning: ProviderPlanningCompletion | null | undefined,

  sectionId: ProviderIntelligenceSectionId,

): IntelligenceSectionConfidence {

  return findPlanningSection(planning, sectionId)?.confidence ?? "unknown";

}



export function buildAccountUnderstandingConfirmCards(input: {

  contact: Record<string, unknown>;

  gaps: IntelligenceLearningGap[];

  knownSummaryForSection: (sectionId: ProviderIntelligenceSectionId) => string | null;

  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;

  planning?: ProviderPlanningCompletion | null;

}): AccountUnderstandingConfirmCard[] {

  const { contact, gaps, knownSummaryForSection, fieldMetadata, planning } = input;



  return ACCOUNT_UNDERSTANDING_CONFIRM_AREA_ORDER.map((areaId) => {

    const def = ACCOUNT_UNDERSTANDING_AREAS[areaId];

    const gap = topGapForArea(gaps, areaId);

    const knownSummary = knownSummaryForSection(def.sectionId);

    const dbKey = gap?.dbKey ?? def.sectionId;

    const sectionId = gap?.sectionId ?? def.sectionId;

    const confidence = accountUnderstandingConfidenceFromSection(
      sectionId,
      contact,
      gap,
      {
        sectionConfidence: sectionConfidence(planning, def.sectionId),
        fieldMetadata,
        planning,
      },
    );

    const bestNextAction = accountUnderstandingBestNextAction(gap, areaId);

    const bestPersonToAsk = accountUnderstandingBestPerson(gap, areaId);

    const sectionConf = sectionConfidence(planning, def.sectionId);
    const mappingProgress = buildSectionOperationalMappingProgress(def.sectionId, contact, {
      planning,
      confidence: sectionConf,
      fieldMetadata,
    });
    const captureLabel = accountUnderstandingMappingCta(
      def.sectionId,
      contact,
      planning,
      sectionConf,
    );

    return {

      id: `intel:${areaId}`,

      areaId,

      sectionTitle: def.title,

      sectionHint: def.hint,

      known: accountUnderstandingKnownLine(knownSummary, areaId),

      unknown: accountUnderstandingUnknownLine(gap, areaId),

      operationalRisk: accountUnderstandingOperationalRisk(gap, areaId, confidence.uncertaintyKind),

      tacticalImplication: accountUnderstandingTacticalImplication(gap, areaId),

      bestNextAction,

      confidenceLevel: confidence.level,

      confidenceLabel: confidence.label,

      missionReadinessLabel: confidence.missionLabel,

      readinessScore: confidence.readinessScore,

      uncertaintyKind: confidence.uncertaintyKind,

      sourceAttribution: accountUnderstandingSourceAttribution(dbKey, fieldMetadata),

      captureLabel,

      captureHelper: gap

        ? accountUnderstandingCaptureHelper(bestPersonToAsk, accountUnderstandingNextMove(gap))

        : accountUnderstandingCaptureHelper(bestPersonToAsk, bestNextAction),

      mappingStatusBadge: deploymentReadinessBadgeLabel(mappingProgress),

      scanMetricsLine: mappingProgress.metricsLine,

      scanSummaryLine: buildIntelligenceSectionScanSummary({
        sectionId,
        progress: mappingProgress,
        topGap: gap,
        contact,
      }),

      progressPills: buildIntelligenceSectionProgressPills(mappingProgress),

      readinessTone: mappingProgress.readinessTone,

      mappingProgressLines: mappingProgress.progressLines,

      sectionId,

      dbKey,

      knownSummary,

      stillNeed: accountUnderstandingUnknownLine(gap, areaId),

      bestPersonToAsk,

      addNoteLabel: captureLabel,

    };

  });

}



export function buildAccountUnderstandingWorkspaceSynthesis(

  cards: AccountUnderstandingConfirmCard[],

): AccountUnderstandingWorkspaceSynthesisLine[] {

  const byArea = (id: AccountUnderstandingAreaId) => cards.find((c) => c.areaId === id);

  const workflow = byArea("workflow");

  const relationship = byArea("relationship");

  const operational = byArea("operational");

  const commercial = byArea("commercial");



  const topBlocker =

    cards.find((c) => c.confidenceLevel === "high_risk") ??

    cards.find((c) => c.unknown && !c.unknown.toLowerCase().includes("synthesized")) ??

    operational;



  const missingLines = cards

    .map((c) => c.unknown)

    .filter((line) => line && !line.toLowerCase().includes("synthesized"))

    .slice(0, 2);



  return [

    {

      id: "operate",

      label: "How they operate",

      line:
        workflow?.known ??
        operational?.known ??
        "Workflow visibility still limited — procedure mix and room rhythm need a live read.",

    },

    {

      id: "decisions",

      label: "How decisions are made",

      line:

        relationship?.known ??

        commercial?.known ??

        "No evaluation or relationship read confirmed yet.",

    },

    {

      id: "blockers",

      label: "Where operational risk sits",

      line: topBlocker?.operationalRisk ?? "No major operational risk flagged yet.",

    },

    {

      id: "missing",

      label: "Intelligence still developing",

      line:

        missingLines.length > 0

          ? missingLines.join(" · ")

          : "Core signals captured — validate on the next touch.",

    },

    {

      id: "tactical",

      label: "Tactical implications",

      line:

        operational?.tacticalImplication ??

        cards[0]?.tacticalImplication ??

        "Capture field signals to unlock the next OR or office touch.",

    },

  ];

}



export function buildAccountUnderstandingUncertaintyCards(

  gaps: IntelligenceLearningGap[],

  options?: {

    maxItems?: number;

    contact?: Record<string, unknown>;

    fieldMetadata?: ProviderIntelligenceFieldMetadataMap;

    planning?: ProviderPlanningCompletion | null;

  },

): AccountUnderstandingUncertaintyCard[] {

  const maxItems = options?.maxItems ?? ACCOUNT_UNDERSTANDING_UNCERTAINTY_MAX;

  const contact = options?.contact ?? {};

  const fieldMetadata = options?.fieldMetadata;

  const planning = options?.planning;

  const cards: AccountUnderstandingUncertaintyCard[] = [];



  for (const areaId of ACCOUNT_UNDERSTANDING_AREA_ORDER) {

    if (cards.length >= maxItems) break;



    const gap = topGapForArea(gaps, areaId);

    if (!gap) continue;



    const def = ACCOUNT_UNDERSTANDING_AREAS[areaId];

    const bestSource = accountUnderstandingBestPerson(gap, areaId);

    const nextMove = accountUnderstandingNextMove(gap);

    const primaryUnknown = accountUnderstandingPrimaryUnknown(gap);

    const whyItMatters = accountUnderstandingWhyItMatters(gap);

    const recent = buildUncertaintyCardRecentNotes(contact, gap.dbKey, fieldMetadata);



    cards.push({

      id: `uncertainty:${gap.dbKey}`,

      areaId,

      sectionTitle: def.title,

      primaryUnknown,

      whyItMatters,

      bestSource,

      nextMove,

      captureLabel: accountUnderstandingMappingCta(gap.sectionId, contact, planning),

      captureHelper: accountUnderstandingCaptureHelper(bestSource, nextMove),

      summaryLines: buildUncertaintyCardSummaryLines({ primaryUnknown, bestSource, nextMove }),

      recentNotes: recent.text,

      recentNotesHistory: recent.historyLine,

      sectionId: gap.sectionId,

      dbKey: gap.dbKey,

    });

  }



  return cards;

}



export type AccountUnderstandingSolidArea = {

  areaId: AccountUnderstandingAreaId;

  sectionTitle: string;

  summary: string;

};



export function buildAccountUnderstandingSolidAreas(input: {

  contact: Record<string, unknown>;

  gaps: IntelligenceLearningGap[];

  knownSummaryForSection: (sectionId: ProviderIntelligenceSectionId) => string | null;

}): AccountUnderstandingSolidArea[] {

  const lines: AccountUnderstandingSolidArea[] = [];



  for (const areaId of ACCOUNT_UNDERSTANDING_AREA_ORDER) {

    const def = ACCOUNT_UNDERSTANDING_AREAS[areaId];

    if (topGapForArea(input.gaps, areaId)) continue;



    const known = input.knownSummaryForSection(def.sectionId);

    if (!known) continue;



    lines.push({

      areaId,

      sectionTitle: def.title,

      summary: known,

    });

  }



  return lines;

}



export function areaIdForGap(gap: IntelligenceLearningGap): AccountUnderstandingAreaId {

  return accountUnderstandingAreaForSection(gap.sectionId);

}


