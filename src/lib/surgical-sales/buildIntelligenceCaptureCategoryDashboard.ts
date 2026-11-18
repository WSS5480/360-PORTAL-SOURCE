/**
 * Intelligence capture category dashboard — mission-area cards with live stats.
 */

import type { StageMappingQuestion } from "@/lib/surgical-sales/buildStageMappingSession";
import { buildCategoryFindingsFeed } from "@/lib/surgical-sales/intelligenceCapture/buildCategoryFindingsFeed";
import {
  groupStageMappingQuestionsByCaptureCategory,
  intelligenceCaptureCategoriesForPathwayStage,
  type IntelligenceCaptureCategoryId,
} from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { stageMappingRegistryDbKeys } from "@/lib/surgical-sales/stageMappingQuestionRegistry";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import type { StageMappingSignalId } from "@/lib/surgical-sales/stageMappingQuestions";
import {
  formatCategoryFindingsStat,
  formatCategoryOpenItemsStat,
  formatCategoryUpdatedStat,
  resolveIntelligenceCaptureCategoryStatus,
  type IntelligenceCaptureCategoryStatusId,
} from "@/lib/surgical-sales/intelligenceCapture/resolveIntelligenceCaptureCategoryStatus";

export type IntelligenceCaptureCategoryCard = {
  id: IntelligenceCaptureCategoryId;
  name: string;
  description: string;
  findingsCount: number;
  openCount: number;
  confirmedCount: number;
  status: IntelligenceCaptureCategoryStatusId;
  findingsLabel: string;
  openItemsLabel: string;
  lastUpdatedIso: string | null;
  lastUpdatedLabel: string;
  hasActivity: boolean;
};

function formatRelativeCaptureUpdate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 14) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function latestMetadataIsoForQuestions(
  questions: StageMappingQuestion[],
  contact: Record<string, unknown>,
): string | null {
  const meta = parseProviderIntelligenceFieldMetadata(contact.provider_intelligence_field_metadata);
  let latestIso = "";

  for (const question of questions) {
    const dbKeys = stageMappingRegistryDbKeys(question.signalId as StageMappingSignalId);
    for (const dbKey of dbKeys) {
      const iso = meta[dbKey]?.updated_at?.trim();
      if (!iso) continue;
      if (!latestIso || new Date(iso).getTime() > new Date(latestIso).getTime()) {
        latestIso = iso;
      }
    }
  }

  return latestIso || null;
}

function formatLastUpdatedLabel(iso: string | null): string {
  return formatCategoryUpdatedStat(iso);
}

export function buildIntelligenceCaptureCategoryDashboard(input: {
  questions: StageMappingQuestion[];
  contact: Record<string, unknown>;
  pathwayStageId: SalesPathwayStageId;
}): IntelligenceCaptureCategoryCard[] {
  const groups = groupStageMappingQuestionsByCaptureCategory(
    input.questions,
    input.pathwayStageId,
    input.contact,
  );
  const defs = intelligenceCaptureCategoriesForPathwayStage(
    input.pathwayStageId,
    input.contact,
  );

  return defs.map((def) => {
    const slice = groups[def.id];
    const allQuestions = [...slice.open, ...slice.laterStage, ...slice.confirmed];
    const findingsCount = buildCategoryFindingsFeed({
      categoryId: def.id,
      contact: input.contact,
      limit: 24,
    }).length;
    const openCount = slice.open.length + slice.laterStage.length;
    const confirmedCount = slice.confirmed.length;
    const lastUpdatedIso = latestMetadataIsoForQuestions(allQuestions, input.contact);
    const status = resolveIntelligenceCaptureCategoryStatus({
      findingsCount,
      openCount,
      confirmedCount,
    });

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      findingsCount,
      openCount,
      confirmedCount,
      status,
      findingsLabel: formatCategoryFindingsStat(findingsCount),
      openItemsLabel: formatCategoryOpenItemsStat(openCount),
      lastUpdatedIso,
      lastUpdatedLabel: formatLastUpdatedLabel(lastUpdatedIso),
      hasActivity: findingsCount > 0 || openCount > 0 || confirmedCount > 0,
    };
  });
}

/** Highest-priority category with open items — for dashboard emphasis. */
export function pickSuggestedIntelligenceCaptureCategory(
  cards: IntelligenceCaptureCategoryCard[],
): IntelligenceCaptureCategoryCard | null {
  return cards.find((card) => card.openCount > 0) ?? null;
}
