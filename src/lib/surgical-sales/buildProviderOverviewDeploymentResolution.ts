/**
 * Overview deployment resolution — ties primary CTA to blocker + field guidance.
 */

import type { CanonicalExecutionBlocker } from "@/lib/surgical-sales/buildProviderCanonicalExecutionBlockers";
import type { ProviderFieldTimeRisk } from "@/lib/surgical-sales/buildProviderFieldTimeRisk";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  intelligenceGapBestSource,
  intelligenceGapFieldGuidance,
} from "@/lib/surgical-sales/providerIntelligenceGapFieldGuidance";
import { overviewRiskFieldDescription } from "@/lib/surgical-sales/providerOverviewRiskCopy";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  operationalValidateBeforeDeployLabel,
  topOpenFieldDbKey,
} from "@/lib/surgical-sales/providerOperationalActionLabels";
import type { ProviderRepPrimaryAction } from "@/lib/surgical-sales/buildProviderRepPrimaryAction";

export type ProviderOverviewDeploymentResolution = {
  blockerId: string | null;
  blockerHeadline: string | null;
  whyItMatters: string;
  nextBestMove: string;
  bestSource: string | null;
  ctaLabel: string;
  ctaHref: string;
};

const NEXT_BEST_MOVE_BY_DB_KEY: Record<string, string> = {
  provider_observation_coordinator_contact:
    "Confirm who controls OR scheduling and posting.",
  provider_observation_access_path:
    "Confirm who approves OR access and how vendors get in.",
  provider_observation_cadence_preference:
    "Confirm posting rhythm before you hold OR time.",
  provider_observation_best_days_case_types:
    "Confirm which posted days carry the cases you need.",
  provider_observation_feasibility:
    "Confirm observation is allowed before you travel.",
  provider_observation_credentialing_needed:
    "Confirm credentialing lead time before you book case day.",
  provider_credentialing_status: "Confirm vendor clearance rules before case day.",
  provider_procedure_focus: "Confirm procedure mix before you pick an OR day.",
  provider_technique_preferences: "Confirm technique mix before you pick an OR day.",
  provider_workflow_pain_points: "Confirm turnover pain points in the room.",
  provider_responsiveness: "Confirm how the office responds between case days.",
  provider_evaluation_openness: "Confirm whether evaluation is actually on the table.",
  provider_decision_maker_status: "Confirm who signs off on trials and preference cards.",
  provider_champion_potential: "Confirm who will advocate for access inside the office.",
  influence_level: "Confirm who actually moves supply and trial decisions.",
  provider_current_vendors: "Confirm incumbent vendor access rules before you push in.",
  provider_competitive_products: "Confirm who is already in the room competitively.",
};

const BEST_SOURCE_OVERRIDES: Partial<Record<string, string>> = {
  provider_observation_coordinator_contact: "OR scheduler or office coordinator",
  provider_observation_access_path: "OR scheduler or credentialing office",
  provider_observation_cadence_preference: "OR scheduler or office coordinator",
  provider_observation_best_days_case_types: "OR scheduler or office coordinator",
};

function polishSentence(text: string, max = 120): string {
  let line = scanLine(text.replace(/\s+/g, " ").trim(), max);
  if (!line) return "";
  if (!/[.!?]$/.test(line)) line += ".";
  return line.charAt(0).toUpperCase() + line.slice(1);
}

function intelligenceCaptureHref(
  intelligenceHref: string,
  sectionId: ProviderIntelligenceSectionId,
): string {
  try {
    const u = new URL(intelligenceHref, "http://local");
    u.searchParams.set("tab", "intelligence");
    u.searchParams.set("planning_section", sectionId);
    return `${u.pathname}${u.search}`;
  } catch {
    const sep = intelligenceHref.includes("?") ? "&" : "?";
    return `${intelligenceHref}${sep}tab=intelligence&planning_section=${encodeURIComponent(sectionId)}`;
  }
}

function resolveNextBestMove(
  blocker: CanonicalExecutionBlocker | null,
  fieldTimeRisk: ProviderFieldTimeRisk,
  primaryAction: ProviderRepPrimaryAction,
  contact: Record<string, unknown>,
): string {
  const dbKey = blocker?.dbKey ?? fieldTimeRisk.primaryDbKey ?? topOpenFieldDbKey(contact);

  if (dbKey && NEXT_BEST_MOVE_BY_DB_KEY[dbKey]) {
    return NEXT_BEST_MOVE_BY_DB_KEY[dbKey]!;
  }

  const reducer = fieldTimeRisk.narrative?.reducers[0]?.reducerSignal?.trim();
  if (reducer && reducer.length > 14) {
    return polishSentence(reducer, 100);
  }

  if (blocker?.resolveScan?.trim()) {
    const raw = blocker.resolveScan.trim();
    if (raw.length > 20) return polishSentence(raw, 100);
    if (dbKey) {
      const mapped = NEXT_BEST_MOVE_BY_DB_KEY[dbKey];
      if (mapped) return mapped;
    }
    return polishSentence(raw.charAt(0).toUpperCase() + raw.slice(1), 100);
  }

  const reason = primaryAction.reason?.trim();
  if (reason) {
    const first = reason.split(/[.!?]/)[0]?.trim();
    if (first && first.length > 16) return polishSentence(first, 100);
  }

  return "Confirm the open gap before you book OR time.";
}

function resolveWhyItMatters(
  blocker: CanonicalExecutionBlocker | null,
  fieldTimeRisk: ProviderFieldTimeRisk,
): string {
  if (blocker?.dbKey) {
    const direct = overviewRiskFieldDescription({
      dbKey: blocker.dbKey,
      rawHeadline: blocker.headline,
    });
    if (direct) return direct;
  }

  const impact =
    blocker?.operationalConsequence?.summary?.trim() || blocker?.operationalImpact?.trim();
  if (impact) return polishSentence(impact, 120);

  const why = fieldTimeRisk.narrative?.whyFieldTimeFails?.trim();
  if (why) return polishSentence(why, 120);

  return "Field time may be wasted until this is confirmed in the OR.";
}

function resolveBestSource(
  blocker: CanonicalExecutionBlocker | null,
  contact: Record<string, unknown>,
): string | null {
  const dbKey = blocker?.dbKey ?? topOpenFieldDbKey(contact);
  if (!dbKey) return null;

  if (BEST_SOURCE_OVERRIDES[dbKey]) {
    return BEST_SOURCE_OVERRIDES[dbKey]!;
  }

  const guidance = blocker?.fieldGuidance ?? intelligenceGapFieldGuidance(dbKey, blocker?.sectionId);
  const source = guidance.bestSource?.trim() || intelligenceGapBestSource(dbKey, blocker?.sectionId);
  return source || null;
}

function resolveCta(
  blocker: CanonicalExecutionBlocker | null,
  primaryAction: ProviderRepPrimaryAction,
  contact: Record<string, unknown>,
  intelligenceHref: string,
): { label: string; href: string } {
  const dbKey = blocker?.dbKey ?? topOpenFieldDbKey(contact);
  const label = dbKey
    ? operationalValidateBeforeDeployLabel(dbKey)
    : primaryAction.label?.trim() || "Confirm before booking";

  if (blocker?.sectionId && intelligenceHref) {
    return {
      label,
      href: intelligenceCaptureHref(intelligenceHref, blocker.sectionId),
    };
  }

  return {
    label,
    href: primaryAction.href,
  };
}

export function buildProviderOverviewDeploymentResolution(input: {
  blocker: CanonicalExecutionBlocker | null;
  fieldTimeRisk: ProviderFieldTimeRisk;
  primaryAction: ProviderRepPrimaryAction;
  contact: Record<string, unknown>;
  intelligenceHref: string;
}): ProviderOverviewDeploymentResolution {
  const { blocker, fieldTimeRisk, primaryAction, contact, intelligenceHref } = input;

  const { label, href } = resolveCta(blocker, primaryAction, contact, intelligenceHref);

  return {
    blockerId: blocker?.id ?? null,
    blockerHeadline: blocker?.headline?.trim() || null,
    whyItMatters: resolveWhyItMatters(blocker, fieldTimeRisk),
    nextBestMove: resolveNextBestMove(blocker, fieldTimeRisk, primaryAction, contact),
    bestSource: resolveBestSource(blocker, contact),
    ctaLabel: label,
    ctaHref: href,
  };
}
