/**
 * Mission overview presentation — field command briefing copy and grouping.
 */

import type { OperationalFieldSignal } from "@/lib/surgical-sales/buildProviderOverviewOperationalSignals";
import type { ProviderOverviewSimpleView } from "@/lib/surgical-sales/buildProviderOverviewSimpleView";
import type { OperationalVisibilityState } from "@/lib/surgical-sales/operationalVisibilityVocabulary";
import { flattenOperationalSignalGroups } from "@/lib/surgical-sales/buildProviderOverviewOperationalSignals";
import type { OperationalFieldSignalGroup } from "@/lib/surgical-sales/buildProviderOverviewOperationalSignals";

export type OperationalChipStatus =
  | "needs_validation"
  | "confirmed"
  | "still_learning"
  | "not_observed";

export const CHIP_STATUS_LABELS: Record<OperationalChipStatus, string> = {
  needs_validation: "Needs validation",
  confirmed: "Confirmed",
  still_learning: "Still learning",
  not_observed: "Not observed",
};

export type HeroChipGroup = "blockers" | "confirmed" | "unknown";

export const HERO_GOAL_DEFAULT =
  "Validate workflow visibility and observation viability.";

export const FACILITY_OPERATIONAL_REALITIES_DEFAULTS = [
  "Vendor clearance path still forming",
  "Credentialing steps not validated",
  "OR access process not yet confirmed",
] as const;

export const SURGEON_OPERATIONAL_REALITIES_DEFAULTS = [
  "Procedure mix still developing",
  "Technique preferences not validated",
  "Field workflow not observed yet",
] as const;

/** @deprecated Use FACILITY_OPERATIONAL_REALITIES_DEFAULTS */
export const FACILITY_ACCESS_REALITIES_DEFAULTS = FACILITY_OPERATIONAL_REALITIES_DEFAULTS;

/** @deprecated Use SURGEON_OPERATIONAL_REALITIES_DEFAULTS */
export const SURGEON_WORKFLOW_REALITIES_DEFAULTS = SURGEON_OPERATIONAL_REALITIES_DEFAULTS;

/** @deprecated */
export const FACILITY_CONTEXT_DEFAULTS = FACILITY_OPERATIONAL_REALITIES_DEFAULTS;

/** @deprecated */
export const PROVIDER_CONTEXT_DEFAULTS = SURGEON_OPERATIONAL_REALITIES_DEFAULTS;

/** @deprecated Use HERO_GOAL_DEFAULT */
export const HERO_DEFAULT_SUBTEXT = HERO_GOAL_DEFAULT;

const CONTEXT_LINE_SHORT: Record<string, string> = {
  "Vendor clearance path still forming": "Vendor clearance path still unclear",
  "Vendor clearance process still unclear": "Vendor clearance path still unclear",
  "Credentialing steps need validation": "Credentialing path not mapped",
  "Credentialing path not validated": "Credentialing path not mapped",
  "OR access process not yet confirmed": "OR access path not mapped",
  "OR access gates not yet validated": "OR access path not mapped",
  "Observation access not yet confirmed": "Observation approval pathway not mapped",
  "Observation workflow still developing": "Observation approval pathway not mapped",
  "Scheduling path still developing": "Scheduling authority not mapped",
  "Scheduling authority not mapped": "Scheduling authority not mapped",
  "Procedure mix still developing": "Modality preference not validated",
  "Modality preference not validated": "Modality preference not validated",
  "Technique preferences need validation": "Dock preference not validated",
  "Dock preferences not yet validated": "Dock preference not validated",
  "Instrument setup expectations unclear": "Instrument setup expectations unclear",
  "Field workflow not observed yet": "Turnover workflow not observed",
  "Turnover workflow not observed": "Turnover workflow not observed",
  "Evaluation posture still developing": "Evaluation posture still developing",
  "Robotic utilization unknown": "Robotic utilization unknown",
};

const BLOCKER_BULLET_BY_TOPIC: Record<string, string> = {
  "or access": "OR access not validated",
  "or access path": "OR access not validated",
  "vendor clearance": "Vendor clearance still forming",
  "credentialing": "Credentialing path not validated",
  "credentialing path": "Credentialing path not validated",
  "observation access": "Observation access not validated",
  "scheduling": "Scheduling path not validated",
  "procedure mix": "Procedure mix still developing",
  "technique": "Technique preferences not validated",
};

export function heroChipGroup(status: OperationalChipStatus): HeroChipGroup {
  if (status === "confirmed") return "confirmed";
  if (status === "not_observed") return "unknown";
  return "blockers";
}

export function heroBlockerBulletLine(shortLabel: string): string {
  const key = shortLabel.trim().toLowerCase();
  for (const [topic, line] of Object.entries(BLOCKER_BULLET_BY_TOPIC)) {
    if (key.includes(topic)) return line;
  }
  if (/not validated|still forming|unclear|developing/i.test(key)) return shortLabel;
  return `${shortLabel} needs validation`;
}

export function buildHeroPrimaryBlockers(
  groups: OperationalFieldSignalGroup[],
  view: ProviderOverviewSimpleView,
  max = 3,
): string[] {
  const signals = flattenOperationalSignalGroups(groups);
  const fromChips = signals
    .filter((s) => heroChipGroup(s.chipStatus) === "blockers")
    .map((s) => heroBlockerBulletLine(s.shortLabel));

  const lines: string[] = [];
  const seen = new Set<string>();
  const push = (line: string) => {
    const t = line.trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    lines.push(t);
  };

  for (const line of fromChips) push(line);
  if (lines.length < max && view.blocker.headline) {
    push(heroBlockerBulletLine(view.blocker.headline));
  }
  for (const w of view.strategicWarnings) {
    if (lines.length >= max) break;
    push(heroBlockerBulletLine(w));
  }

  return lines.slice(0, max);
}

export function groupHeroSignals(
  groups: OperationalFieldSignalGroup[],
): Record<HeroChipGroup, OperationalFieldSignal[]> {
  const out: Record<HeroChipGroup, OperationalFieldSignal[]> = {
    blockers: [],
    confirmed: [],
    unknown: [],
  };
  const seen = new Set<string>();
  for (const signal of flattenOperationalSignalGroups(groups)) {
    const key = signal.shortLabel.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out[heroChipGroup(signal.chipStatus)].push(signal);
  }
  return out;
}

export function heroReadinessLabel(view: ProviderOverviewSimpleView): string {
  return view.stageLabel;
}

export function heroGoalLine(view: ProviderOverviewSimpleView): string {
  const line =
    view.recommendedActionLine?.trim() ||
    view.tactical.recommendedFieldMoveLine?.trim();
  if (line && line.length < 120 && !/recommended field move/i.test(line)) {
    return line.endsWith(".") ? line : `${line}.`;
  }
  return HERO_GOAL_DEFAULT;
}

/** Field-ready one-line copy for overview bullets and signals (no trailing clauses). */
export function formatContextMemoryLine(line: string): string {
  let t = line.trim();
  if (!t) return t;
  if (CONTEXT_LINE_SHORT[t]) return CONTEXT_LINE_SHORT[t];

  t = t
    .replace(/\bnot validated in\b.*$/i, "not validated")
    .replace(/\bnot yet validated in\b.*$/i, "not validated")
    .replace(/\bstill developing in\b.*$/i, "still developing")
    .replace(/\bstill forming in\b.*$/i, "still forming")
    .replace(/\bcaptured but not validated\b.*$/i, "needs validation")
    .replace(/\.{2,}$/, "")
    .replace(/\s+/g, " ")
    .trim();

  const lower = t.toLowerCase();
  for (const [key, value] of Object.entries(CONTEXT_LINE_SHORT)) {
    if (lower.includes(key.toLowerCase().slice(0, 20))) return value;
  }

  if (/dock.*instrument|instrument.*dock/i.test(t)) {
    return "Dock and instrument preferences not validated";
  }
  if (/preference card/i.test(t)) {
    return "Technique preferences not validated";
  }

  return t
    .replace(/\bnot yet validated\b/gi, "not validated")
    .replace(/\bstill emerging\b/gi, "still developing")
    .replace(/\s+/g, " ")
    .trim();
}

export function chipStatusFromSeverity(
  severity: "confirmed" | "attention" | "open",
  dbKey?: string,
): OperationalChipStatus {
  if (severity === "confirmed") return "confirmed";
  if (severity === "open") {
    if (dbKey && /observation|history/i.test(dbKey)) return "not_observed";
    return "still_learning";
  }
  return "needs_validation";
}

export function resolveChipShortLabel(dbKey: string, fallback: string): string {
  const map: Partial<Record<string, string>> = {
    provider_credentialing_status: "Vendor clearance",
    provider_observation_credentialing_needed: "Credentialing",
    provider_observation_access_path: "OR access",
    provider_observation_feasibility: "Observation access",
    provider_observation_coordinator_contact: "Scheduling",
    provider_observation_best_days_case_types: "Observation workflow",
    provider_procedure_focus: "Procedure mix",
    provider_evaluation_openness: "Evaluation posture",
    provider_preference_card_signals: "Technique preferences",
  };
  return map[dbKey] ?? fallback.slice(0, 24);
}

/** @deprecated Rail removed from hero — kept for tests */
export function confidenceRailFill(visibilityState: OperationalVisibilityState): number {
  switch (visibilityState) {
    case "early":
      return 1;
    case "developing":
      return 2;
    case "strong":
      return 3;
    case "validated":
      return 4;
    default:
      return 2;
  }
}

export function heroVisibilityShort(
  visibilityState: OperationalVisibilityState,
  _longLabel?: string,
): string {
  switch (visibilityState) {
    case "early":
      return "Early";
    case "developing":
      return "Developing";
    case "strong":
      return "Strong";
    case "validated":
      return "Validated";
    default:
      return "Developing";
  }
}

export function heroConfidenceShort(visibilityState: OperationalVisibilityState): string {
  return heroVisibilityShort(visibilityState);
}
