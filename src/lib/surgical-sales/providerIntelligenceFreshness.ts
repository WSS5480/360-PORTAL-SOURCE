/**
 * Intelligence freshness — time decay, priority operational fields, and rep-facing indicators.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { intelligenceContextualCaptureCta } from "@/lib/surgical-sales/providerIntelligenceContextualCtas";
import type {
  IntelligenceFieldAttribution,
  ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  intelligenceFieldDisplayName,
  resolveIntelligenceFieldLifecycle,
  type IntelligenceFieldLifecycleResult,
  type IntelligenceSignalLifecycleState,
} from "@/lib/surgical-sales/providerIntelligenceLifecycle";

const DAY_MS = 24 * 60 * 60 * 1000;

import { FRESHNESS_PRIORITY_DB_KEYS } from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import {
  fieldReconfirmationPrompt,
  fieldSpecificStaleWarning,
  freshnessThresholdsFromDecayProfile,
  coordinatorChangeNeedsRevalidation,
  signalChangedWithoutRevalidation,
} from "@/lib/surgical-sales/providerIntelligenceFreshnessDecay";

export { FRESHNESS_PRIORITY_DB_KEYS };
export {
  FIELD_FRESHNESS_DECAY_PROFILE_ID,
  freshnessDecayProfileForField,
} from "@/lib/surgical-sales/providerIntelligenceFreshnessDecay";

export type IntelligenceFreshnessTier =
  | "recent"
  | "current"
  | "aging"
  | "needs_refresh"
  | "outdated"
  | "unverified";

export type FieldFreshnessThresholds = {
  recentMs: number;
  agingMs: number;
  refreshMs: number;
  outdatedMs: number;
};

export {
  FRESHNESS_THRESHOLDS_DEFAULT,
  FRESHNESS_THRESHOLDS_PRIORITY,
} from "@/lib/surgical-sales/providerIntelligenceFreshnessDecay";

export function isFreshnessPriorityField(dbKey: string): boolean {
  return FRESHNESS_PRIORITY_DB_KEYS.has(dbKey);
}

export function freshnessThresholdsForField(dbKey: string): FieldFreshnessThresholds {
  return freshnessThresholdsFromDecayProfile(dbKey);
}

export function fieldRecencyIso(meta?: IntelligenceFieldAttribution): string | undefined {
  return meta?.validated_at?.trim() || meta?.confirmed_at?.trim() || meta?.updated_at?.trim() || undefined;
}

/** Smooth confidence decay 0.52–1.0 from age and validation state. */
export function graduatedFreshnessDecay(
  ageMs: number | null,
  state: IntelligenceSignalLifecycleState,
  thresholds: FieldFreshnessThresholds,
  hasValidatedAt: boolean,
): number {
  if (state === "assumed") return 0.68;
  if (state === "outdated") return 0.52;
  if (!hasValidatedAt) {
    if (ageMs === null) return 0.78;
    if (ageMs >= thresholds.outdatedMs) return 0.58;
    if (ageMs >= thresholds.refreshMs) return 0.72;
    if (ageMs >= thresholds.agingMs) return 0.82;
    return 0.88;
  }
  if (ageMs === null) return 0.9;
  if (ageMs <= thresholds.recentMs) return 1;
  if (ageMs <= thresholds.agingMs) return 0.94;
  if (ageMs <= thresholds.refreshMs) return 0.86;
  if (ageMs <= thresholds.outdatedMs) return 0.72;
  return 0.55;
}

export function resolveFreshnessTier(
  lifecycle: IntelligenceFieldLifecycleResult,
  meta: IntelligenceFieldAttribution | undefined,
  thresholds: FieldFreshnessThresholds,
  dbKey?: string,
): IntelligenceFreshnessTier {
  if (lifecycle.state === "outdated") return "outdated";
  if (lifecycle.needsRefresh && lifecycle.state === "validated") return "needs_refresh";
  if (
    dbKey &&
    coordinatorChangeNeedsRevalidation(dbKey) &&
    signalChangedWithoutRevalidation(meta) &&
    (lifecycle.state === "validated" || lifecycle.state === "confirmed")
  ) {
    return "needs_refresh";
  }
  if (!meta?.validated_at?.trim()) return "unverified";
  const age = lifecycle.ageMs;
  if (age === null) return "current";
  if (age <= thresholds.recentMs) return "recent";
  if (age <= thresholds.agingMs) return "current";
  if (age <= thresholds.refreshMs) return "aging";
  return "needs_refresh";
}

export const FRESHNESS_BADGE_LABELS: Record<IntelligenceFreshnessTier, string> = {
  recent: "Recently validated",
  current: "Validated on file",
  aging: "Aging signal",
  needs_refresh: "Needs refresh",
  outdated: "Outdated operational signal",
  unverified: "Not yet validated",
};

export function formatLastValidatedLine(meta?: IntelligenceFieldAttribution): string | null {
  const iso = meta?.validated_at?.trim();
  if (!iso) {
    const captured = meta?.updated_at?.trim();
    if (!captured) return null;
    const d = new Date(captured);
    if (Number.isNaN(d.getTime())) return null;
    return `Captured ${d.toLocaleString(undefined, { month: "short", year: "numeric" })} — not validated`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Last validated ${d.toLocaleString(undefined, { month: "long", year: "numeric" })}`;
}

export type IntelligenceFieldFreshnessDisplay = IntelligenceFieldLifecycleResult & {
  freshnessTier: IntelligenceFreshnessTier;
  freshnessBadge: string;
  lastValidatedLine: string | null;
  isPriorityField: boolean;
  confidenceDecay: number;
  /** 0–100 — how much confidence remains after time decay. */
  confidencePercent: number;
  staleWarning: string | null;
  reconfirmationPrompt: string | null;
  needsReconfirmation: boolean;
};

export function resolveIntelligenceFieldFreshness(
  dbKey: string,
  raw: string | null | undefined,
  meta?: IntelligenceFieldAttribution,
  nowMs = Date.now(),
): IntelligenceFieldFreshnessDisplay | null {
  const lifecycle = resolveIntelligenceFieldLifecycle(dbKey, raw, meta, nowMs);
  if (!lifecycle) return null;

  const thresholds = freshnessThresholdsForField(dbKey);
  const hasValidatedAt = Boolean(meta?.validated_at?.trim());
  const freshnessTier = resolveFreshnessTier(lifecycle, meta, thresholds, dbKey);
  const confidenceDecay = graduatedFreshnessDecay(
    lifecycle.ageMs,
    lifecycle.state,
    thresholds,
    hasValidatedAt,
  );
  const fieldLabel = intelligenceFieldDisplayName(dbKey);

  let freshnessBadge = FRESHNESS_BADGE_LABELS[freshnessTier];
  if (freshnessTier === "needs_refresh" && lifecycle.ageMs !== null) {
    const months = Math.max(1, Math.round(lifecycle.ageMs / (30 * DAY_MS)));
    freshnessBadge = `Needs refresh (${months} mo)`;
  } else if (freshnessTier === "aging") {
    freshnessBadge = "Aging signal";
  }

  const lastValidatedLine = formatLastValidatedLine(meta);
  const needsReconfirmation =
    freshnessTier === "outdated" ||
    freshnessTier === "needs_refresh" ||
    freshnessTier === "unverified" ||
    (freshnessTier === "aging" &&
      (isFreshnessPriorityField(dbKey) || Boolean(fieldReconfirmationPrompt(dbKey, freshnessTier))));

  let staleWarning: string | null = null;
  if (
    freshnessTier === "outdated" ||
    freshnessTier === "needs_refresh" ||
    freshnessTier === "aging" ||
    freshnessTier === "unverified"
  ) {
    staleWarning =
      fieldSpecificStaleWarning(dbKey, freshnessTier, fieldLabel) ??
      lifecycle.refreshLine ??
      `${freshnessBadge} — ${fieldLabel}`;
  }

  const reconfirmationPrompt = needsReconfirmation
    ? fieldReconfirmationPrompt(dbKey, freshnessTier) ??
      (freshnessTier === "outdated" || freshnessTier === "needs_refresh"
        ? `Reconfirm ${fieldLabel.toLowerCase()} before planning from this signal`
        : null)
    : null;

  return {
    ...lifecycle,
    confidenceMultiplier: confidenceDecay,
    freshnessTier,
    freshnessBadge,
    lastValidatedLine,
    isPriorityField: isFreshnessPriorityField(dbKey),
    confidenceDecay,
    confidencePercent: Math.round(confidenceDecay * 100),
    staleWarning,
    reconfirmationPrompt,
    needsReconfirmation,
  };
}

export type IntelligenceFreshnessReconfirmationItem = IntelligenceFieldFreshnessDisplay & {
  revalidateCta: string;
};

export function buildIntelligenceFreshnessReconfirmationQueue(
  contact: Record<string, unknown>,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
  maxItems = 6,
  nowMs = Date.now(),
): IntelligenceFreshnessReconfirmationItem[] {
  const items: IntelligenceFreshnessReconfirmationItem[] = [];
  const seen = new Set<string>();

  for (const sectionId of Object.keys(
    PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER,
  ) as ProviderIntelligenceSectionId[]) {
    for (const dbKey of PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId]) {
      if (seen.has(dbKey)) continue;
      seen.add(dbKey);
      const raw = contact[dbKey] as string | null | undefined;
      if (!fieldHasIntelligenceSignal(dbKey, raw)) continue;
      const freshness = resolveIntelligenceFieldFreshness(dbKey, raw, fieldMetadata?.[dbKey], nowMs);
      if (!freshness?.needsReconfirmation) continue;
      items.push({
        ...freshness,
        revalidateCta: intelligenceContextualCaptureCta(dbKey, { revalidate: true }),
      });
    }
  }

  return items
    .sort((a, b) => {
      const rank = (t: IntelligenceFreshnessTier) =>
        t === "outdated" ? 0 : t === "needs_refresh" ? 1 : t === "unverified" ? 2 : 3;
      return (
        rank(a.freshnessTier) - rank(b.freshnessTier) ||
        b.revalidationPriority - a.revalidationPriority
      );
    })
    .slice(0, maxItems);
}

export function buildSectionFreshnessWarnings(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
  maxItems = 3,
  nowMs = Date.now(),
): IntelligenceFieldFreshnessDisplay[] {
  const warnings: IntelligenceFieldFreshnessDisplay[] = [];
  for (const dbKey of PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId]) {
    const raw = contact[dbKey] as string | null | undefined;
    if (!fieldHasIntelligenceSignal(dbKey, raw)) continue;
    const freshness = resolveIntelligenceFieldFreshness(
      dbKey,
      raw,
      fieldMetadata?.[dbKey],
      nowMs,
    );
    if (!freshness?.staleWarning) continue;
    warnings.push(freshness);
  }
  return warnings
    .sort((a, b) => {
      const rank = (t: IntelligenceFreshnessTier) =>
        t === "outdated" ? 0 : t === "needs_refresh" ? 1 : t === "unverified" ? 2 : 3;
      return rank(a.freshnessTier) - rank(b.freshnessTier) || b.revalidationPriority - a.revalidationPriority;
    })
    .slice(0, maxItems);
}

export function buildPriorityStaleFreshnessLines(
  contact: Record<string, unknown>,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
  maxItems = 2,
  nowMs = Date.now(),
): string[] {
  const lines: string[] = [];
  for (const dbKey of FRESHNESS_PRIORITY_DB_KEYS) {
    const raw = contact[dbKey] as string | null | undefined;
    if (!fieldHasIntelligenceSignal(dbKey, raw)) continue;
    const freshness = resolveIntelligenceFieldFreshness(dbKey, raw, fieldMetadata?.[dbKey], nowMs);
    if (!freshness?.staleWarning) continue;
    lines.push(freshness.staleWarning);
    if (lines.length >= maxItems) break;
  }
  return lines;
}

export function recencyMultiplierFromFieldMeta(
  meta: IntelligenceFieldAttribution | undefined,
  dbKey: string,
  nowMs: number,
): number {
  const iso = fieldRecencyIso(meta);
  if (!iso) return 0.68;
  const thresholds = freshnessThresholdsForField(dbKey);
  const ms = nowMs - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return 0.68;
  return graduatedFreshnessDecay(ms, meta?.validated_at ? "validated" : "captured", thresholds, Boolean(meta?.validated_at));
}
