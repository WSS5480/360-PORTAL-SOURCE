/**
 * Field-specific freshness decay — shorter windows and reconfirmation copy for volatile signals.
 */

import type {
  FieldFreshnessThresholds,
  IntelligenceFreshnessTier,
} from "@/lib/surgical-sales/providerIntelligenceFreshness";

const DAY_MS = 24 * 60 * 60 * 1000;

export const FRESHNESS_THRESHOLDS_DEFAULT: FieldFreshnessThresholds = {
  recentMs: 45 * DAY_MS,
  agingMs: 180 * DAY_MS,
  refreshMs: 9 * 30 * DAY_MS,
  outdatedMs: 12 * 30 * DAY_MS,
};

export const FRESHNESS_THRESHOLDS_PRIORITY: FieldFreshnessThresholds = {
  recentMs: 45 * DAY_MS,
  agingMs: 90 * DAY_MS,
  refreshMs: 6 * 30 * DAY_MS,
  outdatedMs: 9 * 30 * DAY_MS,
};

export type FreshnessDecayProfileId =
  | "procedure_mix"
  | "scheduling_cadence"
  | "or_coordinator"
  | "priority_operational"
  | "default";

export type FreshnessDecayProfile = {
  id: FreshnessDecayProfileId;
  thresholds: FieldFreshnessThresholds;
  /** Rep-facing stale warnings keyed by freshness tier. */
  staleByTier: Partial<Record<IntelligenceFreshnessTier, string>>;
  /** Prompt shown in quick capture and reconfirmation queue. */
  reconfirmationByTier: Partial<
    Record<"aging" | "needs_refresh" | "outdated" | "unverified", string>
  >;
};

export const FRESHNESS_THRESHOLDS_PROCEDURE_MIX: FieldFreshnessThresholds = {
  recentMs: 45 * DAY_MS,
  agingMs: 120 * DAY_MS,
  refreshMs: 6 * 30 * DAY_MS,
  outdatedMs: 9 * 30 * DAY_MS,
};

/** Scheduling rhythm — re-validate before procedure mix goes fully stale. */
export const FRESHNESS_THRESHOLDS_SCHEDULING: FieldFreshnessThresholds = {
  recentMs: 45 * DAY_MS,
  agingMs: 90 * DAY_MS,
  refreshMs: 5 * 30 * DAY_MS,
  outdatedMs: 7 * 30 * DAY_MS,
};

/** OR coordinator — high personnel turnover. */
export const FRESHNESS_THRESHOLDS_OR_COORDINATOR: FieldFreshnessThresholds = {
  recentMs: 30 * DAY_MS,
  agingMs: 75 * DAY_MS,
  refreshMs: 4 * 30 * DAY_MS,
  outdatedMs: 6 * 30 * DAY_MS,
};

export const FRESHNESS_DECAY_PROFILES: Record<FreshnessDecayProfileId, FreshnessDecayProfile> = {
  procedure_mix: {
    id: "procedure_mix",
    thresholds: FRESHNESS_THRESHOLDS_PROCEDURE_MIX,
    staleByTier: {
      aging: "Procedure mix is aging — confirm still accurate on next case day",
      needs_refresh: "Procedure mix older than 6 months — refresh before targeting cases",
      outdated: "Procedure mix is outdated — do not plan case mix from this signal",
      unverified: "Procedure mix captured but not validated — confirm before targeting",
    },
    reconfirmationByTier: {
      aging: "Quick check: is this still the primary procedure mix?",
      needs_refresh: "Reconfirm procedure focus and technique mix from a recent case or observation",
      outdated: "Rebuild procedure mix from the last 90 days of cases",
    },
  },
  scheduling_cadence: {
    id: "scheduling_cadence",
    thresholds: FRESHNESS_THRESHOLDS_SCHEDULING,
    staleByTier: {
      aging: "Scheduling cadence not recently validated — confirm on next coordinator touch",
      needs_refresh: "Observation cadence may have shifted — re-validate with OR scheduling",
      outdated: "Scheduling cadence is stale — do not rely on calendar planning",
      unverified: "Cadence captured but not validated — confirm before booking observation",
    },
    reconfirmationByTier: {
      aging: "Has observation cadence or best days changed since last capture?",
      needs_refresh: "Reconfirm how often observation can happen and which days stick",
      outdated: "Re-establish scheduling cadence with the coordinator before the next visit",
    },
  },
  or_coordinator: {
    id: "or_coordinator",
    thresholds: FRESHNESS_THRESHOLDS_OR_COORDINATOR,
    staleByTier: {
      aging: "OR coordinator contact aging — verify still correct before outreach",
      needs_refresh: "OR coordinator may have changed — reconfirm name and routing",
      outdated: "OR coordinator contact outdated — remapping required before access work",
      unverified: "Coordinator on file but not validated — confirm before scheduling",
    },
    reconfirmationByTier: {
      aging: "Still the right OR coordinator for observation access?",
      needs_refresh: "Confirm current OR coordinator — personnel changes are common",
      outdated: "Map the current OR coordinator before any observation scheduling",
    },
  },
  priority_operational: {
    id: "priority_operational",
    thresholds: FRESHNESS_THRESHOLDS_PRIORITY,
    staleByTier: {
      aging: "Operational signal aging — re-confirm on next touch",
      needs_refresh: "Validated signal may no longer match the OR — refresh on next touch",
      outdated: "Outdated operational signal — re-validate before planning",
    },
    reconfirmationByTier: {
      needs_refresh: "Reconfirm this operational signal before acting on it",
      outdated: "Re-validate before using this in field planning",
    },
  },
  default: {
    id: "default",
    thresholds: FRESHNESS_THRESHOLDS_DEFAULT,
    staleByTier: {},
    reconfirmationByTier: {
      needs_refresh: "Reconfirm this signal on your next touch",
      outdated: "Re-validate before planning against this signal",
    },
  },
};

export const FIELD_FRESHNESS_DECAY_PROFILE_ID: Record<string, FreshnessDecayProfileId> = {
  provider_procedure_focus: "procedure_mix",
  provider_technique_preferences: "procedure_mix",
  provider_technique_detail: "procedure_mix",
  provider_observation_cadence_preference: "scheduling_cadence",
  provider_observation_best_days_case_types: "scheduling_cadence",
  provider_observation_coordinator_contact: "or_coordinator",
  provider_observation_access_path: "priority_operational",
  provider_observation_credentialing_needed: "priority_operational",
  provider_credentialing_status: "priority_operational",
  provider_or_team_dynamics: "priority_operational",
  provider_ideal_observation_cases: "priority_operational",
  provider_observation_feasibility: "priority_operational",
};

export function freshnessDecayProfileForField(dbKey: string): FreshnessDecayProfile {
  const id = FIELD_FRESHNESS_DECAY_PROFILE_ID[dbKey] ?? "default";
  return FRESHNESS_DECAY_PROFILES[id];
}

export function freshnessThresholdsFromDecayProfile(dbKey: string): FieldFreshnessThresholds {
  return freshnessDecayProfileForField(dbKey).thresholds;
}

export function fieldSpecificStaleWarning(
  dbKey: string,
  tier: IntelligenceFreshnessTier,
  fieldLabel: string,
): string | null {
  const profile = freshnessDecayProfileForField(dbKey);
  const specific = profile.staleByTier[tier];
  if (specific) return specific;
  if (tier === "aging") return `${fieldLabel} aging — re-confirm on next touch`;
  if (tier === "needs_refresh") return `${fieldLabel} needs refresh — confidence is decaying`;
  if (tier === "outdated") return `${fieldLabel} outdated — do not plan from this signal`;
  if (tier === "unverified") return `${fieldLabel} — confirm before planning OR access`;
  return null;
}

export function fieldReconfirmationPrompt(
  dbKey: string,
  tier: IntelligenceFreshnessTier,
): string | null {
  const profile = freshnessDecayProfileForField(dbKey);
  if (tier === "aging") return profile.reconfirmationByTier.aging ?? null;
  if (tier === "needs_refresh") return profile.reconfirmationByTier.needs_refresh ?? null;
  if (tier === "outdated") return profile.reconfirmationByTier.outdated ?? null;
  if (tier === "unverified") return profile.reconfirmationByTier.unverified ?? null;
  return null;
}

/** Value updated after last validation — common when OR coordinator changes. */
export function signalChangedWithoutRevalidation(
  meta?: { validated_at?: string; updated_at?: string },
): boolean {
  const validatedMs = meta?.validated_at?.trim()
    ? new Date(meta.validated_at).getTime()
    : null;
  const updatedMs = meta?.updated_at?.trim() ? new Date(meta.updated_at).getTime() : null;
  if (
    validatedMs === null ||
    updatedMs === null ||
    !Number.isFinite(validatedMs) ||
    !Number.isFinite(updatedMs)
  ) {
    return false;
  }
  return updatedMs > validatedMs + 60_000;
}

export function coordinatorChangeNeedsRevalidation(dbKey: string): boolean {
  return dbKey === "provider_observation_coordinator_contact";
}
