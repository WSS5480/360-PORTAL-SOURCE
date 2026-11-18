/**
 * Rep-facing findings feed — evidence quotes only, no internal mapping labels.
 */

import {
  intelligenceCaptureCategoryDef,
  intelligenceCaptureCategoryForSignal,
  type IntelligenceCaptureCategoryId,
} from "@/lib/surgical-sales/intelligenceCaptureCategories";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { stageMappingRegistryDbKeys } from "@/lib/surgical-sales/stageMappingQuestionRegistry";
import type { StageMappingSignalId } from "@/lib/surgical-sales/stageMappingQuestions";

export type CategoryFindingFeedItem = {
  id: string;
  text: string;
  capturedLabel: string;
};

function formatRelativeCaptureUpdate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Recently";
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 14) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function buildCategoryFindingsFeed(input: {
  categoryId: IntelligenceCaptureCategoryId;
  contact: Record<string, unknown>;
  limit?: number;
}): CategoryFindingFeedItem[] {
  const def = intelligenceCaptureCategoryDef(input.categoryId);
  const meta = parseProviderIntelligenceFieldMetadata(input.contact.provider_intelligence_field_metadata);
  const dbKeys = new Set<string>();

  for (const signalId of def.signalIds) {
    for (const key of stageMappingRegistryDbKeys(signalId as StageMappingSignalId)) {
      dbKeys.add(key);
    }
  }

  const items: CategoryFindingFeedItem[] = [];

  for (const dbKey of dbKeys) {
    const entry = meta[dbKey];
    const evidence = entry?.discovery_mapping?.evidence_text?.trim() || entry?.evidence_text?.trim();
    if (!evidence) continue;
    const updatedAt = entry?.updated_at;
    items.push({
      id: `${dbKey}:${updatedAt ?? evidence.slice(0, 24)}`,
      text: evidence,
      capturedLabel: updatedAt ? formatRelativeCaptureUpdate(updatedAt) : "Recently",
    });
  }

  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = item.text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.capturedLabel < b.capturedLabel ? 1 : -1))
    .slice(0, input.limit ?? 8);
}

/** Whether a deep-linked signal belongs to this capture category. */
export function signalBelongsToCaptureCategory(
  categoryId: IntelligenceCaptureCategoryId,
  signalId: StageMappingSignalId,
): boolean {
  return intelligenceCaptureCategoryForSignal(signalId) === categoryId;
}
