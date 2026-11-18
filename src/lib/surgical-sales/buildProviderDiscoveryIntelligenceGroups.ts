/**
 * Discovery intelligence — four operational groups (not redundant top-level cards).
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
export type DiscoveryAdvancementSnapshot = {
  met: boolean;
  detail: string | null;
  dbKey?: string;
  sectionId?: ProviderIntelligenceSectionId;
};
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { formatIntelligenceCaptureSummaryChip } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  hydrateDiscoveryContactFromLegacy,
  isStructuredDiscoveryDbKey,
  normalizeLegacyDiscoveryDisplayLabel,
} from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import { DISCOVERY_OVERVIEW_GROUP_COPY } from "@/lib/surgical-sales/providerOverviewBriefingCopy";
import {
  DISCOVERY_ACCESS_PREP_SIGNAL_IDS,
  DISCOVERY_ACCESS_SIGNAL_IDS,
} from "@/lib/surgical-sales/discoveryAccessSignalIds";

export { DISCOVERY_ACCESS_PREP_SIGNAL_IDS, DISCOVERY_ACCESS_SIGNAL_IDS };

export type DiscoveryReadinessRowStatus = "complete" | "partial" | "open" | "blocked";

export const DISCOVERY_READINESS_MARKERS: Record<DiscoveryReadinessRowStatus, string> = {
  complete: "✓",
  partial: "△",
  open: "○",
  blocked: "!",
};

const OBSERVATION_FEASIBILITY_BLOCKED = new Set(["no", "blocked", "denied"]);

function fieldLooksBlocked(dbKey: string, contact: Record<string, unknown>): boolean {
  const raw = String(contact[dbKey] ?? "").trim().toLowerCase();
  if (!raw) return false;
  if (/\b(blocked|denied|not allowed|won'?t allow)\b/i.test(raw)) return true;
  if (dbKey === "provider_observation_feasibility" && OBSERVATION_FEASIBILITY_BLOCKED.has(raw)) {
    return true;
  }
  return false;
}

export function mapContactFieldReadinessStatus(
  dbKey: string,
  contact: Record<string, unknown>,
): DiscoveryReadinessRowStatus {
  if (fieldLooksBlocked(dbKey, contact)) return "blocked";
  const validated = isIntelligenceFieldValidatedOnFile(dbKey, contact);
  const hasSignal = fieldHasIntelligenceSignal(dbKey, contact[dbKey] as string | null | undefined);
  if (validated) return "complete";
  if (hasSignal) return "partial";
  return "open";
}

export type DiscoveryIntelligenceGroupId =
  | "access_readiness"
  | "clinical_fit"
  | "champion_landscape"
  | "open_questions";

export type DiscoveryIntelligenceSignal = {
  id: string;
  label: string;
  status: DiscoveryReadinessRowStatus;
  marker: string;
  contextLine: string | null;
  dbKey?: string;
  sectionId?: ProviderIntelligenceSectionId;
  /** When set, aggregate status across these keys (facility/vendor pathway). */
  dbKeys?: string[];
};

export type DiscoveryIntelligenceGroup = {
  id: DiscoveryIntelligenceGroupId;
  title: string;
  purpose: string;
  signals: DiscoveryIntelligenceSignal[];
};

export const DISCOVERY_INTELLIGENCE_GROUP_META: Record<
  DiscoveryIntelligenceGroupId,
  { title: string; purpose: string }
> = {
  access_readiness: {
    title: DISCOVERY_OVERVIEW_GROUP_COPY.access_readiness.title,
    purpose: DISCOVERY_OVERVIEW_GROUP_COPY.access_readiness.subtitle,
  },
  clinical_fit: {
    title: DISCOVERY_OVERVIEW_GROUP_COPY.clinical_fit.title,
    purpose: DISCOVERY_OVERVIEW_GROUP_COPY.clinical_fit.subtitle,
  },
  champion_landscape: {
    title: DISCOVERY_OVERVIEW_GROUP_COPY.champion_landscape.title,
    purpose: DISCOVERY_OVERVIEW_GROUP_COPY.champion_landscape.subtitle,
  },
  open_questions: {
    title: "Still exploring",
    purpose: "What still needs to be learned?",
  },
};

const FACILITY_VENDOR_PATHWAY_DB_KEYS = [
  "provider_observation_access_path",
  "provider_observation_credentialing_needed",
  "provider_credentialing_status",
] as const;

const CLINICAL_FIT_SIGNAL_SPECS = [
  {
    id: "procedure_workflow_visibility",
    label: "Procedure/workflow visibility",
    dbKeys: ["provider_procedure_focus", "provider_technique_preferences"],
    sectionId: "clinical_workflow" as const,
  },
  {
    id: "product_alignment_confidence",
    label: "Product alignment confidence",
    dbKeys: ["provider_competitive_products", "provider_evaluation_openness"],
    sectionId: "commercial_signals" as const,
  },
  {
    id: "case_opportunity_potential",
    label: "Case opportunity potential",
    dbKeys: ["provider_case_volume_estimate", "provider_ideal_observation_cases"],
    sectionId: "clinical_workflow" as const,
  },
] as const;

const CHAMPION_SIGNAL_SPECS = [
  {
    id: "clinical_champion",
    label: "Clinical champion identified",
    dbKeys: ["provider_champion_potential", "provider_or_team_dynamics"],
    sectionId: "relationship_intelligence" as const,
  },
] as const;

function aggregateDbKeyStatuses(
  dbKeys: readonly string[],
  contact: Record<string, unknown>,
): DiscoveryReadinessRowStatus {
  const statuses = dbKeys.map((key) => mapContactFieldReadinessStatus(key, contact));
  if (statuses.some((s) => s === "blocked")) return "blocked";
  if (statuses.every((s) => s === "complete")) return "complete";
  if (statuses.some((s) => s === "complete" || s === "partial")) return "partial";
  return "open";
}

function signalContextLine(
  dbKeys: readonly string[],
  contact: Record<string, unknown>,
): string | null {
  for (const dbKey of dbKeys) {
    const raw = String(contact[dbKey] ?? "").trim();
    if (!raw) continue;
    const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
    return scanLine(chip || raw, 72);
  }
  return null;
}

function buildSignal(input: {
  id: string;
  label: string;
  dbKeys: readonly string[];
  sectionId: ProviderIntelligenceSectionId;
  contact: Record<string, unknown>;
}): DiscoveryIntelligenceSignal {
  const status = aggregateDbKeyStatuses(input.dbKeys, input.contact);
  return {
    id: input.id,
    label: input.label,
    status,
    marker: DISCOVERY_READINESS_MARKERS[status],
    contextLine: status !== "open" ? signalContextLine(input.dbKeys, input.contact) : null,
    dbKey: input.dbKeys[0],
    dbKeys: [...input.dbKeys],
    sectionId: input.sectionId,
  };
}

function advancementToSignal(
  advancement: DiscoveryAdvancementSnapshot,
): DiscoveryIntelligenceSignal {
  const status: DiscoveryReadinessRowStatus = advancement.met
    ? "complete"
    : advancement.detail?.toLowerCase().includes("blocked") ||
        advancement.detail?.toLowerCase().includes("denied")
      ? "blocked"
      : "open";
  return {
    id: "observation_approval_status",
    label: "Observation approval status",
    status,
    marker: DISCOVERY_READINESS_MARKERS[status],
    contextLine: advancement.detail,
    dbKey: advancement.dbKey,
    sectionId: advancement.sectionId,
  };
}

function buildAccessReadinessGroup(input: {
  contact: Record<string, unknown>;
  advancement: DiscoveryAdvancementSnapshot;
}): DiscoveryIntelligenceGroup {
  const meta = DISCOVERY_INTELLIGENCE_GROUP_META.access_readiness;
  const signals: DiscoveryIntelligenceSignal[] = [
    advancementToSignal(input.advancement),
    buildSignal({
      id: "scheduling_owner",
      label: "Scheduling owner identified",
      dbKeys: ["provider_observation_coordinator_contact"],
      sectionId: "observation_readiness",
      contact: input.contact,
    }),
    buildSignal({
      id: "facility_vendor_pathway",
      label: "Facility/vendor pathway understood",
      dbKeys: FACILITY_VENDOR_PATHWAY_DB_KEYS,
      sectionId: "observation_readiness",
      contact: input.contact,
    }),
    buildSignal({
      id: "observation_logistics",
      label: "Observation logistics understood",
      dbKeys: ["provider_observation_best_days_case_types"],
      sectionId: "observation_readiness",
      contact: input.contact,
    }),
  ];

  return { id: "access_readiness", ...meta, signals };
}

function buildClinicalFitGroup(contact: Record<string, unknown>): DiscoveryIntelligenceGroup {
  const meta = DISCOVERY_INTELLIGENCE_GROUP_META.clinical_fit;
  return {
    id: "clinical_fit",
    ...meta,
    signals: CLINICAL_FIT_SIGNAL_SPECS.map((spec) =>
      buildSignal({
        id: spec.id,
        label: spec.label,
        dbKeys: spec.dbKeys,
        sectionId: spec.sectionId,
        contact,
      }),
    ),
  };
}

function buildChampionLandscapeGroup(contact: Record<string, unknown>): DiscoveryIntelligenceGroup {
  const meta = DISCOVERY_INTELLIGENCE_GROUP_META.champion_landscape;
  return {
    id: "champion_landscape",
    ...meta,
    signals: CHAMPION_SIGNAL_SPECS.map((spec) =>
      buildSignal({
        id: spec.id,
        label: spec.label,
        dbKeys: spec.dbKeys,
        sectionId: spec.sectionId,
        contact,
      }),
    ),
  };
}

function openQuestionLine(signal: DiscoveryIntelligenceSignal): string {
  const label = signal.label.replace(/\s+(identified|understood|mapped|status)$/i, "").trim();
  return scanLine(`${label} still open`, 72);
}

function buildOpenQuestionsGroup(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  sourceGroups: DiscoveryIntelligenceGroup[];
}): DiscoveryIntelligenceGroup {
  const meta = DISCOVERY_INTELLIGENCE_GROUP_META.open_questions;
  const seen = new Set<string>();
  const signals: DiscoveryIntelligenceSignal[] = [];

  for (const group of input.sourceGroups) {
    if (group.id === "open_questions") continue;
    for (const signal of group.signals) {
      if (signal.status === "complete") continue;
      if (
        signal.id === "scheduling_owner" ||
        signal.id === "facility_vendor_pathway" ||
        signal.id === "observation_logistics" ||
        signal.id.startsWith("open_scheduling") ||
        signal.id.startsWith("open_facility")
      ) {
        continue;
      }
      const line = openQuestionLine(signal);
      if (seen.has(line)) continue;
      seen.add(line);
      signals.push({
        id: `open_${signal.id}`,
        label: line,
        status: signal.status === "blocked" ? "blocked" : "open",
        marker: DISCOVERY_READINESS_MARKERS[signal.status === "blocked" ? "blocked" : "open"],
        contextLine: signal.contextLine,
        dbKey: signal.dbKey,
        dbKeys: signal.dbKeys,
        sectionId: signal.sectionId,
      });
      if (signals.length >= 6) break;
    }
    if (signals.length >= 6) break;
  }

  if (signals.length < 6) {
    const gaps = buildIntelligenceLearningGaps(input.contact, input.planning, 8);
    for (const gap of gaps) {
      if (isStructuredDiscoveryDbKey(gap.dbKey)) continue;
      const line = scanLine(normalizeLegacyDiscoveryDisplayLabel(gap.phrase), 72);
      if (!line || seen.has(line)) continue;
      if (fieldHasIntelligenceSignal(gap.dbKey, input.contact[gap.dbKey] as string | null | undefined)) {
        if (isIntelligenceFieldValidatedOnFile(gap.dbKey, input.contact)) continue;
      }
      seen.add(line);
      signals.push({
        id: `gap_${gap.dbKey}`,
        label: line,
        status: "open",
        marker: DISCOVERY_READINESS_MARKERS.open,
        contextLine: null,
        dbKey: gap.dbKey,
        sectionId: gap.sectionId,
      });
      if (signals.length >= 6) break;
    }
  }

  return { id: "open_questions", ...meta, signals };
}

export function flattenDiscoveryIntelligenceSignals(
  groups: DiscoveryIntelligenceGroup[],
): DiscoveryIntelligenceSignal[] {
  return groups
    .filter((g) => g.id !== "open_questions")
    .flatMap((g) => g.signals);
}

export function buildAccessReadinessSignalsForProgress(
  contact: Record<string, unknown>,
): DiscoveryIntelligenceSignal[] {
  return [
    buildSignal({
      id: "scheduling_owner",
      label: "Scheduling owner identified",
      dbKeys: ["provider_observation_coordinator_contact"],
      sectionId: "observation_readiness",
      contact,
    }),
    buildSignal({
      id: "facility_vendor_pathway",
      label: "Facility/vendor pathway understood",
      dbKeys: FACILITY_VENDOR_PATHWAY_DB_KEYS,
      sectionId: "observation_readiness",
      contact,
    }),
    buildSignal({
      id: "observation_logistics",
      label: "Observation logistics understood",
      dbKeys: ["provider_observation_best_days_case_types"],
      sectionId: "observation_readiness",
      contact,
    }),
  ];
}

export function buildProviderDiscoveryIntelligenceGroups(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  advancement: DiscoveryAdvancementSnapshot;
}): DiscoveryIntelligenceGroup[] {
  const contact = hydrateDiscoveryContactFromLegacy(input.contact);
  const accessReadiness = buildAccessReadinessGroup({
    contact,
    advancement: input.advancement,
  });
  const clinicalFit = buildClinicalFitGroup(contact);
  const championLandscape = buildChampionLandscapeGroup(contact);
  return [accessReadiness, clinicalFit, championLandscape];
}
