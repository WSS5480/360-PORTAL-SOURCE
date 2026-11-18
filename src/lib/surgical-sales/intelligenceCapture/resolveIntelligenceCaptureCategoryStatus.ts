/**
 * Practical category progress — status labels, not completion percentages.
 */

import { REP_INTELLIGENCE_VOCAB } from "@/lib/surgical-sales/intelligenceCapture/repIntelligenceVocabulary";

export const INTELLIGENCE_CAPTURE_CATEGORY_STATUS_IDS = [
  "empty",
  "partial",
  "healthy",
  "complete",
] as const;

export type IntelligenceCaptureCategoryStatusId =
  (typeof INTELLIGENCE_CAPTURE_CATEGORY_STATUS_IDS)[number];

export const INTELLIGENCE_CAPTURE_CATEGORY_STATUS_UI: Record<
  IntelligenceCaptureCategoryStatusId,
  { label: string; cssModifier: string }
> = {
  empty: { label: REP_INTELLIGENCE_VOCAB.statusEmpty, cssModifier: "empty" },
  partial: { label: REP_INTELLIGENCE_VOCAB.statusPartial, cssModifier: "partial" },
  healthy: { label: REP_INTELLIGENCE_VOCAB.statusHealthy, cssModifier: "healthy" },
  complete: { label: REP_INTELLIGENCE_VOCAB.statusComplete, cssModifier: "complete" },
};

export function resolveIntelligenceCaptureCategoryStatus(input: {
  findingsCount: number;
  openCount: number;
  confirmedCount: number;
}): IntelligenceCaptureCategoryStatusId {
  const { findingsCount, openCount, confirmedCount } = input;
  const hasCapture = findingsCount > 0 || confirmedCount > 0;

  if (!hasCapture) return "empty";
  if (openCount === 0) return "complete";
  if (findingsCount >= 2 && openCount <= 1) return "healthy";
  if (findingsCount >= 1 && confirmedCount >= 1 && openCount <= 1) return "healthy";
  return "partial";
}

export function formatCategoryFindingsStat(count: number): string {
  return `${count} Finding${count === 1 ? "" : "s"}`;
}

export function formatCategoryOpenItemsStat(count: number): string {
  if (count === 0) return REP_INTELLIGENCE_VOCAB.nothingToExplore;
  return `${count} ${REP_INTELLIGENCE_VOCAB.toExplore}`;
}

export function formatCategoryUpdatedStat(iso: string | null, neverLabel = "Not captured yet"): string {
  if (!iso) return neverLabel;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Updated recently";
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Updated today";
  if (diffDays === 1) return "Updated yesterday";
  if (diffDays < 14) return `Updated ${diffDays} days ago`;
  const dateLabel = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `Updated ${dateLabel}`;
}
