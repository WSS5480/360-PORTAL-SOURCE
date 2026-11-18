/**
 * Operational field indicators — actionable signals tied to intelligence sections.
 */

import type { IntelligenceScopeBullet, ProviderIntelligenceScopeDisplay } from "@/lib/surgical-sales/buildProviderIntelligenceScopeDisplay";
import type { ProviderOverviewIntelligenceDensity } from "@/lib/surgical-sales/buildProviderOverviewIntelligenceDensity";
import {
  intelligenceSectionIdForDbKey,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { overviewObservationHistorySignal } from "@/lib/surgical-sales/providerOverviewEarlyDiscoveryVocabulary";
import {
  chipStatusFromSeverity,
  resolveChipShortLabel,
} from "@/lib/surgical-sales/providerOverviewMissionPresentation";
import type { OperationalChipStatus } from "@/lib/surgical-sales/providerOverviewMissionPresentation";

export type OperationalSignalSeverity = "confirmed" | "attention" | "open";

export type OperationalSignalGroupId = "access" | "workflow" | "history";

export type OperationalFieldSignal = {
  id: string;
  label: string;
  shortLabel: string;
  chipStatus: OperationalChipStatus;
  severity: OperationalSignalSeverity;
  group: OperationalSignalGroupId;
  /** Short operational read — why this matters in the field */
  meaning: string;
  /** CTA hint when the rep should act */
  actionHint?: string;
  sectionId?: ProviderIntelligenceSectionId;
  dbKey?: string;
};

export type OperationalFieldSignalGroup = {
  id: OperationalSignalGroupId;
  label: string;
  signals: OperationalFieldSignal[];
};

export const OPERATIONAL_SIGNAL_GROUP_LABELS: Record<OperationalSignalGroupId, string> = {
  access: "Access & clearance",
  workflow: "Workflow & provider",
  history: "Field history",
};

const GROUP_ORDER: OperationalSignalGroupId[] = ["access", "workflow", "history"];

const SEVERITY_RANK: Record<OperationalSignalSeverity, number> = {
  attention: 0,
  open: 1,
  confirmed: 2,
};

/** Gap-state labels — full line for legacy consumers */
const GAP_LABEL_BY_DB_KEY: Partial<Record<string, string>> = {
  provider_credentialing_status: "Vendor clearance path still forming",
  provider_observation_credentialing_needed: "Credentialing path still developing",
  provider_observation_access_path: "OR access path needs validation",
  provider_observation_feasibility: "Observation access needs validation",
  provider_observation_coordinator_contact: "Scheduling path still developing",
  provider_observation_best_days_case_types: "Observation workflow still developing",
  provider_procedure_focus: "Procedure mix still developing",
  provider_evaluation_openness: "Evaluation posture still developing",
  provider_preference_card_signals: "Technique preferences need validation",
};

function resolveGroup(dbKey: string, panel: "facility" | "provider"): OperationalSignalGroupId {
  if (
    /observation_access|credential|vendor|coordinator|scheduling|vendors|access_path/i.test(dbKey)
  ) {
    return "access";
  }
  if (panel === "facility") return "access";
  return "workflow";
}

function operationalLabel(bullet: IntelligenceScopeBullet): string {
  if (bullet.state === "gap" && GAP_LABEL_BY_DB_KEY[bullet.dbKey]) {
    return GAP_LABEL_BY_DB_KEY[bullet.dbKey]!;
  }
  return scanLine(bullet.line, 52);
}

function operationalMeaning(
  severity: OperationalSignalSeverity,
  bullet: IntelligenceScopeBullet,
): string {
  if (severity === "confirmed") {
    return bullet.contextHint
      ? scanLine(bullet.contextHint, 56)
      : "Validated on file — supports field planning";
  }
  if (severity === "attention") {
    return bullet.confidenceLabel
      ? scanLine(bullet.confidenceLabel, 56)
      : "Needs validation on next field touch";
  }
  return "Still learning — confirm on first field day";
}

function actionHintFor(
  severity: OperationalSignalSeverity,
  sectionId?: ProviderIntelligenceSectionId,
): string | undefined {
  if (severity === "attention" && sectionId) return "Open operational intelligence";
  if (severity === "attention") return "Validate on next touch";
  if (severity === "open" && sectionId === "observation_readiness") {
    return "Plan when access clears";
  }
  if (severity === "open") return "Log after first field day";
  if (severity === "confirmed" && sectionId) return "View in intelligence";
  return undefined;
}

function signalFromBullet(
  bullet: IntelligenceScopeBullet,
  panel: "facility" | "provider",
): OperationalFieldSignal | null {
  if (bullet.state === "empty") return null;

  const severity: OperationalSignalSeverity =
    bullet.state === "known" ? "confirmed" : "attention";
  const sectionId =
    intelligenceSectionIdForDbKey(bullet.dbKey) ??
    (panel === "facility" ? "or_environment" : "clinical_workflow");

  const label = operationalLabel(bullet);
  return {
    id: `bullet-${bullet.dbKey}`,
    label,
    shortLabel: resolveChipShortLabel(bullet.dbKey, label),
    chipStatus: chipStatusFromSeverity(severity, bullet.dbKey),
    severity,
    group: resolveGroup(bullet.dbKey, panel),
    meaning: operationalMeaning(severity, bullet),
    actionHint: actionHintFor(severity, sectionId),
    sectionId,
    dbKey: bullet.dbKey,
  };
}

function sortSignals(signals: OperationalFieldSignal[]): OperationalFieldSignal[] {
  return [...signals].sort((a, b) => {
    const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sev !== 0) return sev;
    return a.label.localeCompare(b.label);
  });
}

function groupSignals(signals: OperationalFieldSignal[]): OperationalFieldSignalGroup[] {
  const byGroup = new Map<OperationalSignalGroupId, OperationalFieldSignal[]>();
  for (const id of GROUP_ORDER) byGroup.set(id, []);

  for (const signal of signals) {
    byGroup.get(signal.group)?.push(signal);
  }

  return GROUP_ORDER.map((id) => ({
    id,
    label: OPERATIONAL_SIGNAL_GROUP_LABELS[id],
    signals: sortSignals(byGroup.get(id) ?? []),
  })).filter((g) => g.signals.length > 0);
}

export function buildProviderOverviewOperationalSignals(input: {
  scope: ProviderIntelligenceScopeDisplay;
  organizationLinked: boolean;
  hasObservationHistory: boolean;
  density: ProviderOverviewIntelligenceDensity;
}): OperationalFieldSignalGroup[] {
  const collected: OperationalFieldSignal[] = [];
  const seen = new Set<string>();

  const push = (signal: OperationalFieldSignal) => {
    const key = signal.label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    collected.push(signal);
  };

  if (input.organizationLinked) {
    push({
      id: "affiliation",
      label: "Hospital affiliation confirmed",
      shortLabel: "Hospital affiliation",
      chipStatus: "confirmed",
      severity: "confirmed",
      group: "access",
      meaning: "Facility anchor on file",
      actionHint: "View operational intelligence",
      sectionId: "or_environment",
    });
  }

  const preferGaps = input.density === "sparse";
  const facilityBullets = preferGaps
    ? [
        ...input.scope.facility.bullets.filter((b) => b.state === "gap"),
        ...input.scope.facility.bullets.filter((b) => b.state === "known"),
      ]
    : input.scope.facility.bullets;
  const providerBullets = preferGaps
    ? [
        ...input.scope.provider.bullets.filter((b) => b.state === "gap"),
        ...input.scope.provider.bullets.filter((b) => b.state === "known"),
      ]
    : input.scope.provider.bullets;

  for (const bullet of facilityBullets) {
    const signal = signalFromBullet(bullet, "facility");
    if (signal) push(signal);
  }
  for (const bullet of providerBullets) {
    const signal = signalFromBullet(bullet, "provider");
    if (signal) push(signal);
  }

  if (!input.hasObservationHistory) {
    const obs = overviewObservationHistorySignal({ density: input.density });
    push({
      id: "workflow-visibility",
      label: "Workflow visibility not yet mapped",
      shortLabel: "Workflow visibility",
      chipStatus: "not_observed",
      severity: "open",
      group: "workflow",
      meaning: obs.meaning,
      actionHint: obs.actionHint,
      sectionId: "clinical_workflow",
      dbKey: "observation_history",
    });
  }

  const attention = collected.filter((s) => s.severity === "attention");
  const open = collected.filter((s) => s.severity === "open");
  const confirmed = collected.filter((s) => s.severity === "confirmed");

  const capped = [
    ...attention.slice(0, 3),
    ...open.slice(0, 2),
    ...confirmed.slice(0, 2),
  ];

  return groupSignals(capped);
}

/** Flat list for tests and legacy consumers */
export function flattenOperationalSignalGroups(
  groups: OperationalFieldSignalGroup[],
): OperationalFieldSignal[] {
  return groups.flatMap((g) => g.signals);
}
