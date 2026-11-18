/**
 * Discovery Intelligence — briefing layout helpers (collapsed scan + expanded signals).
 */

import { DISCOVERY_INTELLIGENCE_UI } from "@/lib/surgical-sales/discoveryIntelligenceCopy";
import {
  discoveryReadinessBlockerLine,
  discoverySignalFieldFocusLine,
} from "@/lib/surgical-sales/discoveryIntelligenceNarrative";
import { discoveryOperationalReadiness } from "@/lib/surgical-sales/discoveryIntelligenceMissionPresentation";
import {
  DISCOVERY_FIELD_STATUS,
  resolveDiscoveryStructuredSignalStatus,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import type {
  DiscoveryIntelligenceGroup,
  DiscoveryIntelligenceGroupsView,
  DiscoveryIntelligenceSignalRow,
} from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import type { DiscoveryIntelligenceGroupId } from "@/lib/surgical-sales/discoveryIntelligenceProgress";
import type { WorkflowRowAction } from "@/lib/surgical-sales/buildProviderOverviewStageRequirementsView";
import {
  filterPrimaryAlertItems,
  filterPrimaryAlertLabels,
  isAdminBackgroundSignalId,
  isAdminPrimaryAlertLabel,
  type ActiveScheduledFieldContext,
} from "@/lib/surgical-sales/backgroundIntelligenceSections";

const F = DISCOVERY_FIELD_STATUS;

export type DiscoveryDomainBlocker = {
  id: string;
  narrative: string;
};

export function discoveryDomainConfidenceState(progressPercent: number): string {
  return discoveryOperationalReadiness(progressPercent).tier;
}

export function discoveryPageConfidenceState(progressPercent: number): string {
  return discoveryOperationalReadiness(progressPercent).tier;
}

/** Top unresolved signals for collapsed domain scan (max 3). */
export function discoveryDomainBlockers(
  group: DiscoveryIntelligenceGroup,
  max = 3,
  fieldContext: ActiveScheduledFieldContext = {},
): DiscoveryDomainBlocker[] {
  const blockers: DiscoveryDomainBlocker[] = [];

  for (const row of [...group.rows].sort((a, b) => a.priority - b.priority)) {
    if (row.statusLabel === F.validated || row.statusLabel === F.notApplicable) continue;
    if (!row.signalId) continue;
    if (isAdminBackgroundSignalId(row.signalId)) continue;

    const narrative =
      discoveryReadinessBlockerLine(row.signalId, row.statusLabel) ??
      discoverySignalFieldFocusLine(row.signalId, row.statusLabel);
    if (!narrative) continue;

    blockers.push({
      id: row.id,
      narrative,
    });
    if (blockers.length >= max) break;
  }

  return filterPrimaryAlertItems(blockers, (blocker) => blocker.narrative, fieldContext).slice(0, max);
}

/** One-line operational summary for collapsed domain (legacy). */
export function discoveryDomainOperationalSummary(group: DiscoveryIntelligenceGroup): string {
  return discoveryDomainCardSummary(group);
}

/** Non-redundant card body line — signal counts, not blocker text. */
export function discoveryDomainCardSummary(group: DiscoveryIntelligenceGroup): string {
  const openCount = group.rows.filter(
    (row) => row.statusLabel !== F.validated && row.statusLabel !== F.notApplicable,
  ).length;

  if (group.progress.constrained) {
    return "Access context still forming — reference notes below.";
  }
  if (openCount === 0) {
    return "Domain clear — keep validation current.";
  }
  if (openCount === 1) {
    return "1 signal needs field input.";
  }
  return `${openCount} signals need field input.`;
}

/** Single top-gap chip for command-deck summary (avoids repeating full blocker lists). */
export function discoveryBriefingPrimaryGapLabel(
  view: DiscoveryIntelligenceGroupsView,
  contact: Record<string, unknown>,
  fieldContext: ActiveScheduledFieldContext = {},
): string | null {
  const top = view.priorityUnknowns[0];
  if (!top) return null;
  if (isAdminBackgroundSignalId(top.signalId)) return null;
  const hydrated = hydrateDiscoveryContactFromLegacy(contact);
  const status = resolveDiscoveryStructuredSignalStatus(top.signalId, hydrated);
  const label =
    discoveryReadinessBlockerLine(top.signalId, status) ??
    top.summary.split(".")[0]?.trim() ??
    null;
  if (!label || isAdminPrimaryAlertLabel(label)) {
    return filterPrimaryAlertLabels([label ?? ""], fieldContext)[0] ?? null;
  }
  return label;
}

/** All actions for a signal row — primary first, then overflow. */
export function discoverySignalActions(row: DiscoveryIntelligenceSignalRow): WorkflowRowAction[] {
  return [...row.primaryActions, ...row.overflowActions];
}

/** Strategic domain CTA label (collapsed sections — one calm action). */
export function discoveryDomainPrimaryCtaLabel(groupId: DiscoveryIntelligenceGroupId): string {
  return DISCOVERY_INTELLIGENCE_UI.domainPrimaryCta[groupId];
}

/** Highest-priority unresolved row action for domain primary CTA. */
export function discoveryDomainPrimaryAction(
  group: DiscoveryIntelligenceGroup,
): { action: WorkflowRowAction; row: DiscoveryIntelligenceSignalRow } | null {
  const unresolved = [...group.rows]
    .filter((row) => row.statusLabel !== F.validated && row.statusLabel !== F.notApplicable)
    .sort((a, b) => a.priority - b.priority);

  for (const row of unresolved) {
    const action = discoverySignalActions(row)[0];
    if (action) return { action, row };
  }

  return null;
}

export function discoveryBriefingPageNarrative(view: DiscoveryIntelligenceGroupsView): string {
  if (view.confidenceScore >= 85) {
    return "Field picture is mostly clear. Review captured findings and keep the pathway current.";
  }
  if (view.priorityUnknowns.length > 0) {
    return "Clinical fit and champion landscape still need field confirmation before advancing.";
  }
  return "Map access readiness, clinical fit, and champion landscape to sharpen execution.";
}

export function discoveryBriefingPageBlockers(
  view: DiscoveryIntelligenceGroupsView,
  contact: Record<string, unknown> = {},
  fieldContext: ActiveScheduledFieldContext = {},
): string[] {
  const hydrated = hydrateDiscoveryContactFromLegacy(contact);
  const labels = view.priorityUnknowns
    .filter((item) => !isAdminBackgroundSignalId(item.signalId))
    .map((item) => {
      const status = resolveDiscoveryStructuredSignalStatus(item.signalId, hydrated);
      return (
        discoveryReadinessBlockerLine(item.signalId, status) ??
        item.summary.split(".")[0]?.trim() ??
        item.summary
      );
    });
  return filterPrimaryAlertLabels(labels, fieldContext);
}
