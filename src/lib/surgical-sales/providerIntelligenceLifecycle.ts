/**
 * Intelligence validation lifecycle — per-field state drives confidence, reminders, and re-validation.
 *
 * States: Captured → Assumed → Confirmed → Validated → Outdated (time-decayed).
 */

import { operationalIntelligenceChipLabel } from "@/lib/surgical-sales/providerIntelligenceBriefing";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type {
  IntelligenceCaptureSourceType,
  IntelligenceFieldAttribution,
  ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  assessIntelligenceFieldQuality,
  type IntelligenceFieldQualityAssessment,
} from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";

export const INTELLIGENCE_SIGNAL_LIFECYCLE_STATES = [
  "captured",
  "assumed",
  "confirmed",
  "validated",
  "outdated",
] as const;

export type IntelligenceSignalLifecycleState = (typeof INTELLIGENCE_SIGNAL_LIFECYCLE_STATES)[number];

export const INTELLIGENCE_LIFECYCLE_LABELS: Record<IntelligenceSignalLifecycleState, string> = {
  captured: "Captured",
  assumed: "Assumed",
  confirmed: "Confirmed",
  validated: "Validated",
  outdated: "Outdated",
};

/** ~9 months — validated signals may need refresh (rep-facing reminders). */
export const LIFECYCLE_REFRESH_REMINDER_MS = 9 * 30 * 24 * 60 * 60 * 1000;

/** Beyond this age, validated/confirmed signals are treated as outdated for confidence. */
export const LIFECYCLE_OUTDATED_MS = 12 * 30 * 24 * 60 * 60 * 1000;

const HIGH_TRUST_SOURCES = new Set<IntelligenceCaptureSourceType>([
  "observation",
  "case",
  "intro_call",
  "promote",
]);

const ASSUMED_TOKENS = new Set(["unknown", "unclear", "assumed", ""]);

const DAY_MS = 24 * 60 * 60 * 1000;

/** OR access, credentialing, coordinators, procedural workflow — shorter freshness windows. */
export const FRESHNESS_PRIORITY_DB_KEYS = new Set([
  "provider_observation_access_path",
  "provider_observation_coordinator_contact",
  "provider_observation_credentialing_needed",
  "provider_observation_cadence_preference",
  "provider_observation_best_days_case_types",
  "provider_credentialing_status",
  "provider_procedure_focus",
  "provider_technique_preferences",
  "provider_or_team_dynamics",
]);

type FieldAgeThresholds = { refreshMs: number; outdatedMs: number };

function ageThresholdsForField(dbKey: string): FieldAgeThresholds {
  if (dbKey === "provider_observation_coordinator_contact") {
    return { refreshMs: 4 * 30 * DAY_MS, outdatedMs: 6 * 30 * DAY_MS };
  }
  if (
    dbKey === "provider_observation_cadence_preference" ||
    dbKey === "provider_observation_best_days_case_types"
  ) {
    return { refreshMs: 5 * 30 * DAY_MS, outdatedMs: 7 * 30 * DAY_MS };
  }
  if (FRESHNESS_PRIORITY_DB_KEYS.has(dbKey)) {
    return { refreshMs: 6 * 30 * DAY_MS, outdatedMs: 9 * 30 * DAY_MS };
  }
  return { refreshMs: LIFECYCLE_REFRESH_REMINDER_MS, outdatedMs: LIFECYCLE_OUTDATED_MS };
}

export type IntelligenceFieldLifecycleResult = {
  dbKey: string;
  state: IntelligenceSignalLifecycleState;
  /** ISO reference for age (validated_at, confirmed_at, or updated_at). */
  referenceAt: string | null;
  ageMs: number | null;
  needsRefresh: boolean;
  refreshLine: string | null;
  scanLine: string;
  confidenceMultiplier: number;
  revalidationPriority: number;
};

export const LIFECYCLE_CONFIDENCE_MULTIPLIER: Record<IntelligenceSignalLifecycleState, number> = {
  assumed: 0.72,
  captured: 0.86,
  confirmed: 0.94,
  validated: 1,
  outdated: 0.55,
};

export const LIFECYCLE_REVALIDATION_PRIORITY: Record<IntelligenceSignalLifecycleState, number> = {
  assumed: 12,
  captured: 8,
  confirmed: 14,
  validated: 0,
  outdated: 28,
};

function parseMs(iso: string | undefined): number | null {
  if (!iso?.trim()) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function monthsAgoLabel(ageMs: number): string {
  const months = Math.max(1, Math.round(ageMs / (30 * 24 * 60 * 60 * 1000)));
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}

export function intelligenceFieldDisplayName(dbKey: string): string {
  return operationalIntelligenceChipLabel(dbKey);
}

function inferLifecycleFromSignal(
  dbKey: string,
  raw: string | null | undefined,
  assessment: IntelligenceFieldQualityAssessment,
  meta: IntelligenceFieldAttribution | undefined,
): IntelligenceSignalLifecycleState {
  if (meta?.lifecycle_state && INTELLIGENCE_SIGNAL_LIFECYCLE_STATES.includes(meta.lifecycle_state)) {
    return meta.lifecycle_state;
  }

  if (meta?.validated_at?.trim()) {
    return "validated";
  }

  if (meta?.confirmed_at?.trim()) {
    return "confirmed";
  }

  if (assessment.depth === "weak") {
    return "assumed";
  }

  const trimmed = String(raw ?? "").trim();
  if (trimmed && ASSUMED_TOKENS.has(trimmed.toLowerCase())) {
    return "assumed";
  }

  if (
    meta?.source_type &&
    HIGH_TRUST_SOURCES.has(meta.source_type) &&
    (assessment.depth === "structured" || assessment.depth === "validated")
  ) {
    return "confirmed";
  }

  if (assessment.depth === "validated" || assessment.depth === "structured") {
    return meta?.source_type === "profile" ? "captured" : "confirmed";
  }

  return "captured";
}

function applyAgeDecay(
  dbKey: string,
  state: IntelligenceSignalLifecycleState,
  referenceAt: string | null,
  nowMs: number,
): { state: IntelligenceSignalLifecycleState; needsRefresh: boolean } {
  if (!referenceAt) {
    return { state, needsRefresh: false };
  }
  const refMs = parseMs(referenceAt);
  if (refMs === null) {
    return { state, needsRefresh: false };
  }
  const { refreshMs, outdatedMs } = ageThresholdsForField(dbKey);
  const ageMs = nowMs - refMs;
  if (ageMs >= outdatedMs && (state === "validated" || state === "confirmed")) {
    return { state: "outdated", needsRefresh: true };
  }
  if (ageMs >= refreshMs && state === "validated") {
    return { state: "validated", needsRefresh: true };
  }
  return { state, needsRefresh: false };
}

export function resolveIntelligenceFieldLifecycle(
  dbKey: string,
  raw: string | null | undefined,
  meta?: IntelligenceFieldAttribution,
  nowMs = Date.now(),
): IntelligenceFieldLifecycleResult | null {
  if (!fieldHasIntelligenceSignal(dbKey, raw)) {
    return null;
  }

  const assessment = assessIntelligenceFieldQuality(dbKey, raw);
  let state = inferLifecycleFromSignal(dbKey, raw, assessment, meta);

  const referenceAt =
    meta?.validated_at?.trim() ||
    meta?.confirmed_at?.trim() ||
    meta?.updated_at?.trim() ||
    null;
  const refMs = referenceAt ? parseMs(referenceAt) : null;
  const ageMs = refMs !== null ? nowMs - refMs : null;

  const decayed = applyAgeDecay(dbKey, state, referenceAt, nowMs);
  state = decayed.state;

  const fieldName = intelligenceFieldDisplayName(dbKey);
  const needsRefresh = decayed.needsRefresh || state === "outdated";

  let refreshLine: string | null = null;
  if (needsRefresh && ageMs !== null) {
    const ago = monthsAgoLabel(ageMs);
    if (state === "outdated") {
      refreshLine = `${fieldName} outdated (${ago}) — re-validate on next touch`;
    } else {
      refreshLine = `${fieldName} validated ${ago} — may require refresh`;
    }
  }

  const scanLine = refreshLine ?? `${fieldName} ${INTELLIGENCE_LIFECYCLE_LABELS[state].toLowerCase()}`;

  return {
    dbKey,
    state,
    referenceAt,
    ageMs,
    needsRefresh,
    refreshLine,
    scanLine,
    confidenceMultiplier: LIFECYCLE_CONFIDENCE_MULTIPLIER[state],
    revalidationPriority: needsRefresh
      ? LIFECYCLE_REVALIDATION_PRIORITY[state] + (state === "outdated" ? 10 : 4)
      : LIFECYCLE_REVALIDATION_PRIORITY[state],
  };
}

export function lifecycleStateForCapture(
  dbKey: string,
  raw: string | null | undefined,
  sourceType: IntelligenceCaptureSourceType,
): IntelligenceSignalLifecycleState | undefined {
  if (!fieldHasIntelligenceSignal(dbKey, raw)) return undefined;
  const assessment = assessIntelligenceFieldQuality(dbKey, raw);
  if (assessment.depth === "weak") return "assumed";
  if (HIGH_TRUST_SOURCES.has(sourceType)) return "confirmed";
  if (assessment.depth === "structured" || assessment.depth === "validated") {
    return "confirmed";
  }
  return "captured";
}

export function buildStaleIntelligenceReminders(
  contact: Record<string, unknown>,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
  maxItems = 6,
  nowMs = Date.now(),
): IntelligenceFieldLifecycleResult[] {
  const reminders: IntelligenceFieldLifecycleResult[] = [];

  for (const sectionId of Object.keys(
    PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER,
  ) as ProviderIntelligenceSectionId[]) {
    for (const dbKey of PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId]) {
      const lifecycle = resolveIntelligenceFieldLifecycle(
        dbKey,
        contact[dbKey] as string | null | undefined,
        fieldMetadata?.[dbKey],
        nowMs,
      );
      if (!lifecycle?.needsRefresh) continue;
      reminders.push(lifecycle);
    }
  }

  return reminders
    .sort((a, b) => b.revalidationPriority - a.revalidationPriority)
    .slice(0, maxItems);
}

export function buildRevalidationPriorities(
  contact: Record<string, unknown>,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
  maxItems = 8,
  nowMs = Date.now(),
): IntelligenceFieldLifecycleResult[] {
  const items: IntelligenceFieldLifecycleResult[] = [];

  for (const sectionId of Object.keys(
    PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER,
  ) as ProviderIntelligenceSectionId[]) {
    for (const dbKey of PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId]) {
      const lifecycle = resolveIntelligenceFieldLifecycle(
        dbKey,
        contact[dbKey] as string | null | undefined,
        fieldMetadata?.[dbKey],
        nowMs,
      );
      if (!lifecycle) continue;
      if (
        lifecycle.state === "outdated" ||
        lifecycle.needsRefresh ||
        lifecycle.state === "assumed"
      ) {
        items.push(lifecycle);
      }
    }
  }

  return items
    .sort((a, b) => b.revalidationPriority - a.revalidationPriority)
    .slice(0, maxItems);
}

export function sectionHasOutdatedSignals(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
  nowMs = Date.now(),
): boolean {
  for (const dbKey of PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId]) {
    const lifecycle = resolveIntelligenceFieldLifecycle(
      dbKey,
      contact[dbKey] as string | null | undefined,
      fieldMetadata?.[dbKey],
      nowMs,
    );
    if (lifecycle?.state === "outdated") return true;
  }
  return false;
}

export function formatIntelligenceLifecycleLabel(
  lifecycle: IntelligenceFieldLifecycleResult | null,
  assessment?: IntelligenceFieldQualityAssessment,
): string | null {
  if (!lifecycle) {
    if (!assessment?.hasSignal) return null;
    if (assessment.depth === "validated") return "Validated on file";
    if (assessment.depth === "structured") return "Structured capture";
    if (assessment.depth === "weak") return "Assumed — confirm on next touch";
    return "Captured";
  }

  if (lifecycle.refreshLine) {
    return lifecycle.refreshLine;
  }

  return `${INTELLIGENCE_LIFECYCLE_LABELS[lifecycle.state]} on file`;
}
