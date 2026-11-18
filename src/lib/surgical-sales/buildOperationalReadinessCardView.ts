/**

 * Operational readiness module cards — scan-first synthesis for Intelligence UI.

 */



import type { AccountUnderstandingConfirmCard } from "@/lib/surgical-sales/buildAccountUnderstandingUncertaintyCards";

import {

  buildOrganizationIntelligenceSections,

  ORGANIZATION_INTELLIGENCE_SECTION_LABELS,

  type OrganizationIntelligenceSectionId,

} from "@/lib/surgical-sales/organizationIntelligenceArchitecture";

import { buildSectionSynthesizedScanSummary } from "@/lib/surgical-sales/discoveryOperationalSynthesis";

import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";

import { fieldScanSummaryLine } from "@/lib/surgical-sales/intelligenceSectionScanView";

import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";

import {

  buildSectionOperationalMappingProgress,

} from "@/lib/surgical-sales/providerIntelligenceOperationalMapping";

import {

  INTELLIGENCE_CARD_READINESS_LABELS,

  intelligenceSectionEmptyConfirmed,

  type IntelligenceCardReadinessTone,

} from "@/lib/surgical-sales/providerIntelligenceCardStatus";

import {

  PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER,

  type ProviderIntelligenceSectionId,

} from "@/lib/surgical-sales/providerIntelligenceArchitecture";

import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

import { synthesizeOperationalInsight } from "@/lib/surgical-sales/discoveryOperationalSynthesis";

import { accountUnderstandingNextMove } from "@/lib/surgical-sales/accountUnderstandingUncertaintyCopy";

import {

  buildIntelligenceCardSourceTouchLines,

  intelligenceCardOpenItemsLabel,

  intelligenceCardScanActionLabel,

  INTELLIGENCE_CARD_SCOPE_BADGE_LABELS,

  isOperationalScanPlaceholder,

  operationalCardScanSummaryLine,

  resolveIntelligenceCardScopeBadge,

  type IntelligenceCardScopeBadge,

} from "@/lib/surgical-sales/intelligenceCardScanLayout";



export type OperationalReadinessCardView = {

  id: string;

  title: string;

  tone: IntelligenceCardReadinessTone;

  readinessLabel: string;

  scopeBadge: IntelligenceCardScopeBadge;

  scopeBadgeLabel: string;

  synthesisLine: string;

  openItemsLabel: string;

  openQuestionCount: number;

  whatWeKnowItems: string[];

  stillLearningItems: string[];

  sourceTouchLines: string[];

  recommendedNext: string;

  sectionId: ProviderIntelligenceSectionId;

  dbKey: string;

  primaryActionLabel: string;

  /** @deprecated Use whatWeKnowItems */

  confirmedItems: string[];

  /** @deprecated Use stillLearningItems */

  missingItems: string[];

  /** @deprecated Use recommendedNext */

  nextStep: string;

  scope?: "organization" | "provider";

};



function whatWeKnowFromSection(

  sectionId: ProviderIntelligenceSectionId,

  contact: Record<string, unknown>,

  fieldKeys: readonly string[],

  limit = 6,

): string[] {

  const lines: string[] = [];

  for (const dbKey of fieldKeys) {

    const raw = String(contact[dbKey] ?? "").trim();

    if (!fieldHasIntelligenceSignal(dbKey, raw)) continue;

    const insight = synthesizeOperationalInsight(dbKey, raw);

    if (insight && !isOperationalScanPlaceholder(insight)) {

      lines.push(operationalCardScanSummaryLine(insight));

    }

    if (lines.length >= limit) break;

  }

  if (lines.length > 0) return lines;

  const fallback = intelligenceSectionEmptyConfirmed(sectionId);

  return isOperationalScanPlaceholder(fallback) ? [] : [fallback];

}



function stillLearningFromSection(

  sectionId: ProviderIntelligenceSectionId,

  contact: Record<string, unknown>,

  planning?: ProviderPlanningCompletion | null,

  limit = 6,

): string[] {

  const gaps = buildIntelligenceLearningGaps(contact, planning, 12).filter(

    (g) => g.sectionId === sectionId,

  );

  const lines = gaps

    .map((g) => fieldScanSummaryLine(g.dbKey))

    .filter((line) => line && !isOperationalScanPlaceholder(line));

  return [...new Set(lines)].slice(0, limit);

}



function openCountFromProgressPills(card: AccountUnderstandingConfirmCard): number | null {
  const openPill = card.progressPills.find((p) => p.variant === "open");
  if (!openPill) return null;
  const match = openPill.label.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}



function resolveSynthesisForSection(input: {

  sectionId: ProviderIntelligenceSectionId;

  contact: Record<string, unknown>;

  progress: ReturnType<typeof buildSectionOperationalMappingProgress>;

  topGap?: import("@/lib/surgical-sales/providerIntelligenceLearningGaps").IntelligenceLearningGap | null;

  preferDbKey?: string;

  scanSummaryFallback?: string;

}): string {

  const synthesized = operationalCardScanSummaryLine(

    buildSectionSynthesizedScanSummary({

      sectionId: input.sectionId,

      contact: input.contact,

      progress: input.progress,

      topGap: input.topGap,

      preferDbKey: input.preferDbKey,

    }),

  );

  if (synthesized) return synthesized;

  const fallback = operationalCardScanSummaryLine(input.scanSummaryFallback ?? "");

  if (fallback) return fallback;

  const stillLearning = stillLearningFromSection(input.sectionId, input.contact, null, 1)[0];

  return stillLearning ?? "Additional context welcome on the next touch.";

}



function attachLegacyAliases(view: Omit<

  OperationalReadinessCardView,

  "confirmedItems" | "missingItems" | "nextStep"

>): OperationalReadinessCardView {

  return {

    ...view,

    confirmedItems: view.whatWeKnowItems,

    missingItems: view.stillLearningItems,

    nextStep: view.recommendedNext,

  };

}



export function buildOperationalReadinessCardFromConfirmCard(

  card: AccountUnderstandingConfirmCard,

  contact: Record<string, unknown>,

  options?: {
    fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
    planning?: ProviderPlanningCompletion | null;
    fieldKeys?: readonly string[];
  },

): OperationalReadinessCardView {

  const keys = options?.fieldKeys ?? PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[card.sectionId] ?? [card.dbKey];

  const progress = buildSectionOperationalMappingProgress(card.sectionId, contact, {
    fieldMetadata: options?.fieldMetadata,
    planning: options?.planning,
  });

  const topGap =

    buildIntelligenceLearningGaps(contact, null, 8).find((g) => g.dbKey === card.dbKey) ?? null;

  const openQuestionCount = openCountFromProgressPills(card) ?? progress.unresolvedCount;

  const scopeBadge = resolveIntelligenceCardScopeBadge({

    scope: "provider",

    dbKey: card.dbKey,

    sectionId: card.sectionId,

  });



  return attachLegacyAliases({

    id: card.id,

    title: card.sectionTitle,

    tone: card.readinessTone,

    readinessLabel: INTELLIGENCE_CARD_READINESS_LABELS[card.readinessTone],

    scopeBadge,

    scopeBadgeLabel: INTELLIGENCE_CARD_SCOPE_BADGE_LABELS[scopeBadge],

    synthesisLine: resolveSynthesisForSection({

      sectionId: card.sectionId,

      contact,

      progress,

      topGap,

      preferDbKey: card.dbKey,

      scanSummaryFallback: card.scanSummaryLine,

    }),

    openItemsLabel: intelligenceCardOpenItemsLabel(openQuestionCount),

    openQuestionCount,

    whatWeKnowItems: whatWeKnowFromSection(card.sectionId, contact, keys),

    stillLearningItems: stillLearningFromSection(card.sectionId, contact, options?.planning),

    sourceTouchLines: buildIntelligenceCardSourceTouchLines({

      fieldKeys: keys,

      fieldMetadata: options?.fieldMetadata,

    }),

    recommendedNext: operationalCardScanSummaryLine(card.bestNextAction) || "Continue discovery on this area.",

    sectionId: card.sectionId,

    dbKey: card.dbKey,

    primaryActionLabel: intelligenceCardScanActionLabel({

      mapped: progress.mapped,

      unresolvedCount: openQuestionCount,

      tone: card.readinessTone,

      confidence: progress.confidence,

    }),

    scope: "provider",

  });

}



export function buildOrganizationOperationalReadinessCards(input: {

  contact: Record<string, unknown>;

  planning?: ProviderPlanningCompletion | null;

  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;

}): OperationalReadinessCardView[] {

  const { contact, planning, fieldMetadata } = input;



  return buildOrganizationIntelligenceSections().map((section) => {

    const sectionId = "or_environment" as ProviderIntelligenceSectionId;

    const keys = section.fieldKeys;

    let mapped = 0;

    for (const dbKey of keys) {

      if (fieldHasIntelligenceSignal(dbKey, String(contact[dbKey] ?? ""))) mapped += 1;

    }

    const progress = buildSectionOperationalMappingProgress(sectionId, contact, {

      planning,

      fieldMetadata,

    });

    const topGap =

      buildIntelligenceLearningGaps(contact, planning, 6).find((g) => keys.includes(g.dbKey)) ?? null;

    const openQuestionCount = progress.unresolvedCount;

    const scopeBadge = resolveIntelligenceCardScopeBadge({

      scope: "organization",

      dbKey: topGap?.dbKey ?? keys[0] ?? "provider_observation_access_path",

      sectionId,

    });



    return attachLegacyAliases({

      id: `org:${section.id}`,

      title: ORGANIZATION_INTELLIGENCE_SECTION_LABELS[section.id as OrganizationIntelligenceSectionId],

      tone: progress.readinessTone,

      readinessLabel: INTELLIGENCE_CARD_READINESS_LABELS[progress.readinessTone],

      scopeBadge,

      scopeBadgeLabel: INTELLIGENCE_CARD_SCOPE_BADGE_LABELS[scopeBadge],

      synthesisLine: resolveSynthesisForSection({

        sectionId,

        contact,

        progress: { ...progress, mapped, total: keys.length },

        topGap,

        preferDbKey: topGap?.dbKey,

      }),

      openItemsLabel: intelligenceCardOpenItemsLabel(openQuestionCount),

      openQuestionCount,

      whatWeKnowItems: whatWeKnowFromSection(sectionId, contact, keys),

      stillLearningItems: stillLearningFromSection(sectionId, contact, planning),

      sourceTouchLines: buildIntelligenceCardSourceTouchLines({ fieldKeys: keys, fieldMetadata }),

      recommendedNext: topGap

        ? operationalCardScanSummaryLine(accountUnderstandingNextMove(topGap)) ||

          "Capture facility rule on next OR access or scheduler touch."

        : mapped > 0

          ? "Maintain facility baseline — confirm if anything changed."

          : "Capture facility rule on next OR access or scheduler touch.",

      sectionId,

      dbKey: topGap?.dbKey ?? keys[0] ?? "provider_observation_access_path",

      primaryActionLabel: intelligenceCardScanActionLabel({

        mapped,

        unresolvedCount: openQuestionCount,

        tone: progress.readinessTone,

        confidence: progress.confidence,

      }),

      scope: "organization",

    });

  });

}



export function buildOperationalReadinessCardFromSection(input: {

  sectionId: ProviderIntelligenceSectionId;

  title: string;

  contact: Record<string, unknown>;

  planning?: ProviderPlanningCompletion | null;

  progress: ReturnType<typeof buildSectionOperationalMappingProgress>;

  topGap?: import("@/lib/surgical-sales/providerIntelligenceLearningGaps").IntelligenceLearningGap | null;

  fieldKeys?: readonly string[];

  scope?: "organization" | "provider";

  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;

}): OperationalReadinessCardView {

  const keys =

    input.fieldKeys ??

    PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[input.sectionId] ??

    [input.topGap?.dbKey ?? "provider_procedure_focus"];

  const openQuestionCount = input.progress.unresolvedCount;

  const scopeBadge = resolveIntelligenceCardScopeBadge({

    scope: input.scope ?? "provider",

    dbKey: input.topGap?.dbKey ?? keys[0] ?? input.sectionId,

    sectionId: input.sectionId,

  });



  return attachLegacyAliases({

    id: `section:${input.sectionId}`,

    title: input.title,

    tone: input.progress.readinessTone,

    readinessLabel: INTELLIGENCE_CARD_READINESS_LABELS[input.progress.readinessTone],

    scopeBadge,

    scopeBadgeLabel: INTELLIGENCE_CARD_SCOPE_BADGE_LABELS[scopeBadge],

    synthesisLine: resolveSynthesisForSection({

      sectionId: input.sectionId,

      contact: input.contact,

      progress: input.progress,

      topGap: input.topGap,

      preferDbKey: input.topGap?.dbKey,

    }),

    openItemsLabel: intelligenceCardOpenItemsLabel(openQuestionCount),

    openQuestionCount,

    whatWeKnowItems: whatWeKnowFromSection(input.sectionId, input.contact, keys),

    stillLearningItems: stillLearningFromSection(input.sectionId, input.contact, input.planning),

    sourceTouchLines: buildIntelligenceCardSourceTouchLines({

      fieldKeys: keys,

      fieldMetadata: input.fieldMetadata,

    }),

    recommendedNext: input.topGap

      ? operationalCardScanSummaryLine(accountUnderstandingNextMove(input.topGap)) ||

        "Continue discovery on this area."

      : "Continue discovery on this area.",

    sectionId: input.sectionId,

    dbKey: input.topGap?.dbKey ?? keys[0] ?? input.sectionId,

    primaryActionLabel: intelligenceCardScanActionLabel({

      mapped: input.progress.mapped,

      unresolvedCount: openQuestionCount,

      tone: input.progress.readinessTone,

      confidence: input.progress.confidence,

    }),

    scope: input.scope ?? "provider",

  });

}



export function buildOperationalReadinessCardsForProvider(input: {

  contact: Record<string, unknown>;

  planning?: ProviderPlanningCompletion | null;

  confirmCards: AccountUnderstandingConfirmCard[];

  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;

}): OperationalReadinessCardView[] {

  return input.confirmCards.map((card) =>

    buildOperationalReadinessCardFromConfirmCard(card, input.contact, {
      fieldMetadata: input.fieldMetadata,
      planning: input.planning,
    }),

  );

}

