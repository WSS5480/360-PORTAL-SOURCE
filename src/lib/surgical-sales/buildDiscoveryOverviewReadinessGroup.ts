/**
 * Provider overview — operational readiness cards with actions and signal detail.
 */

import type { DiscoveryIntelligenceGroup } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import type { DiscoveryIntelligenceSignalRow } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import {
  discoveryReadinessBlockerLine,
  overviewReadinessChipLabel,
  overviewReadinessPrimaryLabel,
  DISCOVERY_INTELLIGENCE_UI,
} from "@/lib/surgical-sales/discoveryIntelligenceCopy";
import { discoveryIntelligenceRowActionsFlat } from "@/lib/surgical-sales/discoveryIntelligenceRowActions";
import {
  DISCOVERY_FIELD_STATUS,
  type DiscoveryFieldStatusLabel,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import type {
  DiscoveryIntelligenceGroupView,
  WorkflowRowAction,
} from "@/lib/surgical-sales/buildProviderOverviewStageRequirementsView";
import type { DiscoveryOverviewGroupId } from "@/lib/surgical-sales/providerOverviewBriefingCopy";
import { intelligenceMetadataFromContact } from "@/lib/surgical-sales/providerCreateWizard";
import { formatWorkflowConfirmedDate } from "@/lib/surgical-sales/providerOverviewWorkflowActions";
import { schedulingOwnerDisplayLine } from "@/lib/surgical-sales/schedulingIntelligenceReadModel";

const F = DISCOVERY_FIELD_STATUS;
const OBSERVATION_APPROVAL_DB_KEY = "provider_observation_feasibility";

export type DiscoveryReadinessSignalDetail = {
  id: string;
  signalId: DiscoveryStructuredSignalId;
  label: string;
  statusLabel: string;
  confidenceLabel: string;
  lastUpdatedLabel: string;
  linkedContact: string | null;
  validationNote: string | null;
  actions: WorkflowRowAction[];
};

function isUnresolved(status: string): boolean {
  return status !== F.validated && status !== F.notApplicable;
}

function sortUnresolved(rows: DiscoveryIntelligenceSignalRow[]): DiscoveryIntelligenceSignalRow[] {
  return rows.filter((row) => isUnresolved(row.statusLabel)).sort((a, b) => a.priority - b.priority);
}

function withScopedActionId(groupId: string, prefix: string, action: WorkflowRowAction): WorkflowRowAction {
  return { ...action, id: `${groupId}-${prefix}-${action.id}` };
}

function collectQuickActions(
  rows: DiscoveryIntelligenceSignalRow[],
  groupId: string,
  excludeActionId?: string,
  max = 3,
): WorkflowRowAction[] {
  const seen = new Set<string>();
  const actions: WorkflowRowAction[] = [];

  for (const row of sortUnresolved(rows)) {
    for (const action of [...row.primaryActions, ...row.overflowActions]) {
      const chipLabel = overviewReadinessChipLabel(action);
      if (seen.has(chipLabel)) continue;
      const scoped = withScopedActionId(groupId, "quick", action);
      if (scoped.id === excludeActionId) continue;
      seen.add(chipLabel);
      actions.push(scoped);
      if (actions.length >= max) return actions;
    }
  }

  return actions;
}

function linkedContactForSignal(
  signalId: DiscoveryStructuredSignalId,
  contact: Record<string, unknown>,
): string | null {
  if (signalId === "scheduling_owner") {
    return schedulingOwnerDisplayLine(contact);
  }
  if (signalId === "clinical_champion" || signalId === "decision_influence") {
    const raw = contact.provider_champion_potential ?? contact.influence_level;
    const text = typeof raw === "string" ? raw.trim() : "";
    if (text && !/^(high|medium|low|unknown)$/i.test(text)) return text;
  }
  return null;
}

function validationNoteForSignal(
  signalId: DiscoveryStructuredSignalId,
  contact: Record<string, unknown>,
): string | null {
  if (signalId === "observation_approval" && hasProviderObservationApprovalValidated(contact)) {
    const meta = intelligenceMetadataFromContact(contact)[OBSERVATION_APPROVAL_DB_KEY];
    const date = formatWorkflowConfirmedDate(meta);
    return date ? `Confirmed ${date}` : "Confirmed on file";
  }
  return null;
}

function buildSignalDetail(
  row: DiscoveryIntelligenceSignalRow,
  groupId: string,
  contact: Record<string, unknown>,
): DiscoveryReadinessSignalDetail {
  const signalId = row.signalId as DiscoveryStructuredSignalId;
  const actions = discoveryIntelligenceRowActionsFlat({
    signalId,
    statusLabel: row.statusLabel,
    sectionId: row.sectionId,
  }).map((action) => withScopedActionId(groupId, `signal-${row.id}`, action));

  return {
    id: row.id,
    signalId,
    label: row.label,
    statusLabel: row.statusLabel,
    confidenceLabel: row.confidenceLabel,
    lastUpdatedLabel: row.lastUpdatedLabel,
    linkedContact: linkedContactForSignal(signalId, contact),
    validationNote: validationNoteForSignal(signalId, contact),
    actions,
  };
}

export function buildDiscoveryOverviewReadinessGroup(input: {
  id: DiscoveryOverviewGroupId;
  title: string;
  subtitle: string;
  summary: string;
  intelGroup: DiscoveryIntelligenceGroup;
  contact: Record<string, unknown>;
}): DiscoveryIntelligenceGroupView {
  const { intelGroup, contact, id } = input;
  const rows = intelGroup.rows;
  const unresolved = sortUnresolved(rows);

  const blockers = unresolved
    .map((row) =>
      row.signalId
        ? discoveryReadinessBlockerLine(
            row.signalId,
            row.statusLabel as DiscoveryFieldStatusLabel,
          )
        : null,
    )
    .filter((line): line is string => Boolean(line))
    .slice(0, 3);

  if (blockers.length === 0) {
    blockers.push(
      unresolved.length === 0 && rows.length > 0
        ? DISCOVERY_INTELLIGENCE_UI.overviewReadiness.mapped
        : DISCOVERY_INTELLIGENCE_UI.overviewReadiness.open,
    );
  }

  const top = unresolved[0];

  const primaryAction = top?.primaryActions[0]
    ? withScopedActionId(id, "primary", top.primaryActions[0])
    : null;

  const quickActions = collectQuickActions(rows, id, primaryAction?.id, 3);

  const signals = rows.map((row) => buildSignalDetail(row, id, contact));

  return {
    id,
    title: input.title,
    subtitle: input.subtitle,
    summary: input.summary,
    progressLabel: intelGroup.progress.label,
    progressPercent: intelGroup.progress.percent,
    progressConstrained: intelGroup.progress.constrained,
    blockers,
    /** @deprecated Use blockers */
    narrativeLines: blockers,
    /** @deprecated Use blockers */
    primaryBlocker: null,
    primaryAction,
    primaryActionLabel: primaryAction ? overviewReadinessPrimaryLabel(primaryAction) : null,
    quickActions,
    signals,
    rows: [],
  };
}
