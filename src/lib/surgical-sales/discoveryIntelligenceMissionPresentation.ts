/**
 * Discovery Intelligence — mission-control presentation (readiness tiers, activity, questions).
 */

import type {
  DiscoveryIntelligenceGroup,
  DiscoveryIntelligenceGroupsView,
  DiscoveryIntelligenceSignalRow,
} from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { buildDiscoveryIntelligencePriorityUnknowns } from "@/lib/surgical-sales/buildDiscoveryIntelligencePriorityUnknowns";
import { discoveryReadinessBlockerLine } from "@/lib/surgical-sales/discoveryIntelligenceNarrative";
import { openQuestionForIncompleteSignal } from "@/lib/surgical-sales/discoveryIntelligenceOpenQuestions";
import {
  DISCOVERY_FIELD_STATUS,
  resolveDiscoveryStructuredSignalStatus,
  type DiscoveryFieldStatusLabel,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { pickNextUpcomingEngagement } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { DiscoveryIntelligenceGroupId } from "@/lib/surgical-sales/discoveryIntelligenceProgress";
import {
  parseProviderIntelligenceFieldMetadata,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { providerHasFieldIntelligenceEvidence } from "@/lib/surgical-sales/providerFieldIntelligenceEvidence";
import {
  formatEvidenceCaptureSummary,
  resolveEvidenceCaptureCounts,
  shouldShowAbstractMetrics,
} from "@/lib/surgical-sales/fieldIntelligenceMetricPolicy";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";

const F = DISCOVERY_FIELD_STATUS;

export type DiscoveryOperationalReadinessTier =
  | "EARLY"
  | "FORMING"
  | "PARTIAL"
  | "DEVELOPING"
  | "READY"
  | "VALIDATED";

export type DiscoveryVisualSignalState = "validated" | "partial" | "untouched" | "blocked";

export type DiscoveryOperationalReadiness = {
  tier: DiscoveryOperationalReadinessTier;
  percent: number;
  mappedLabel: string;
};

export type DiscoveryRecentActivityItem = {
  id: string;
  line: string;
  whenLabel: string;
  state: DiscoveryVisualSignalState;
};

export type DiscoveryMissionControlModel = {
  objective: string;
  topRisks: string[];
  bestNextQuestion: string | null;
  upcoming: string | null;
  secondaryActions: Array<{ id: string; label: string }>;
};

export function discoveryOperationalReadiness(percent: number): DiscoveryOperationalReadiness {
  const mappedLabel = `${percent}% captured`;
  if (percent >= 90) return { tier: "VALIDATED", percent, mappedLabel };
  if (percent >= 75) return { tier: "READY", percent, mappedLabel };
  if (percent >= 55) return { tier: "DEVELOPING", percent, mappedLabel };
  if (percent >= 35) return { tier: "PARTIAL", percent, mappedLabel };
  if (percent >= 15) return { tier: "FORMING", percent, mappedLabel };
  return { tier: "EARLY", percent, mappedLabel };
}

/** Evidence-based page summary — replaces weighted percent tiers in the intelligence UI. */
export function discoveryIntelligenceEvidenceSummary(
  view: DiscoveryIntelligenceGroupsView,
  hasFieldEvidence: boolean,
): { summary: string | null; showMetrics: boolean } {
  const allSignals = view.groups.flatMap((g) =>
    g.rows.map((row) => ({ statusLabel: row.statusLabel })),
  );
  const counts = resolveEvidenceCaptureCounts(allSignals);
  const summary = formatEvidenceCaptureSummary(counts, hasFieldEvidence);
  const showMetrics = shouldShowAbstractMetrics({
    hasFieldEvidence,
    confirmedCount: counts.confirmed,
  });
  return { summary, showMetrics };
}

export function discoveryVisualSignalState(input: {
  percent: number;
  constrained?: boolean;
  statusLabel?: string;
}): DiscoveryVisualSignalState {
  if (input.constrained || input.statusLabel === F.blocked) return "blocked";
  if (input.percent >= 75 || input.statusLabel === F.validated || input.statusLabel === F.notApplicable) {
    return "validated";
  }
  if (input.percent >= 20 || input.statusLabel === F.captured) return "partial";
  return "untouched";
}

export function discoveryDomainVisualState(group: DiscoveryIntelligenceGroup): DiscoveryVisualSignalState {
  const topUnresolved = group.rows.find(
    (row) => row.statusLabel !== F.validated && row.statusLabel !== F.notApplicable,
  );
  return discoveryVisualSignalState({
    percent: group.progress.percent,
    constrained: group.progress.constrained,
    statusLabel: topUnresolved?.statusLabel,
  });
}

const CONVERSATIONAL_QUESTIONS: Partial<
  Record<DiscoveryStructuredSignalId, Partial<Record<DiscoveryFieldStatusLabel, string>>>
> = {
  observation_approval: {
    [F.unknown]: "Has anyone confirmed vendor observation approval here?",
    [F.captured]: "Who still needs to sign off on observation access?",
    [F.blocked]: "Is observation access permanently off the table here?",
  },
  scheduling_owner: {
    [F.unknown]: "Who coordinates scheduling for vendor observations?",
    [F.captured]: "Can you confirm who owns scheduling day-to-day?",
  },
  facility_vendor_pathway: {
    [F.unknown]: "Who manages vendor observation approvals here?",
    [F.captured]: "What vendor or facility steps still need confirmation?",
  },
  observation_logistics: {
    [F.unknown]: "How far out do observation cases usually post?",
    [F.captured]: "Which days or case types should we target first?",
  },
  workflow_visibility: {
    [F.unknown]: "Which procedures should we observe first?",
    [F.captured]: "What still needs validation on the OR workflow?",
  },
  product_alignment: {
    [F.unknown]: "What products are typically opened for these procedures?",
    [F.captured]: "Which competitive products show up most in these cases?",
    [F.blocked]: "Is product evaluation effectively closed here?",
  },
  case_opportunity: {
    [F.unknown]: "Roughly how many cases per month justify pursuit?",
    [F.captured]: "What volume or timing still needs confirmation?",
  },
  clinical_champion: {
    [F.unknown]: "Who inside the account can advocate for access?",
    [F.captured]: "How committed is the champion lead you have in mind?",
  },
  decision_influence: {
    [F.unknown]: "Who influences evaluation and access decisions here?",
    [F.captured]: "Who else sits on the decision path we have not met?",
  },
};

export function discoveryConversationalQuestion(
  signalId: DiscoveryStructuredSignalId,
  status: DiscoveryFieldStatusLabel,
): string | null {
  return (
    CONVERSATIONAL_QUESTIONS[signalId]?.[status] ??
    openQuestionForIncompleteSignal(signalId, status)
  );
}

export function discoveryBestNextQuestion(input: {
  contact: Record<string, unknown>;
  hasFieldEvidence?: boolean;
}): string | null {
  if (input.hasFieldEvidence === false) return null;

  const contact = hydrateDiscoveryContactFromLegacy(input.contact);

  for (const item of buildDiscoveryIntelligencePriorityUnknowns({ contact, max: 5 })) {
    const status = resolveDiscoveryStructuredSignalStatus(item.signalId, contact);
    const question = discoveryConversationalQuestion(item.signalId, status);
    if (question) return question;
  }

  return null;
}

export function discoveryMissionObjective(
  view: DiscoveryIntelligenceGroupsView,
  options?: { hasFieldEvidence?: boolean },
): string {
  if (options?.hasFieldEvidence === false) return "";
  const focus = view.priorityUnknowns[0]?.summary;
  if (focus) {
    const short = focus.split(".")[0]?.trim();
    return short ? `Resolve ${short.toLowerCase()}` : "Advance discovery access and fit";
  }
  if (view.confidenceScore >= 85) return "Review captured findings and keep pathway current";
  return "Secure observation access and confirm clinical fit";
}

/** Compact risk lines from priority unknowns using blocker bullets when possible. */
export function discoveryMissionTopRisksFromView(
  view: DiscoveryIntelligenceGroupsView,
  contact: Record<string, unknown>,
  max = 3,
): string[] {
  const hydrated = hydrateDiscoveryContactFromLegacy(contact);
  const lines: string[] = [];

  for (const item of view.priorityUnknowns) {
    if (lines.length >= max) break;
    const status = resolveDiscoveryStructuredSignalStatus(item.signalId, hydrated);
    const line =
      discoveryReadinessBlockerLine(item.signalId, status) ??
      item.summary.split(".")[0]?.trim() ??
      item.summary;
    if (line && !lines.includes(line)) lines.push(line);
  }

  return lines;
}

export function buildDiscoveryMissionControl(input: {
  view: DiscoveryIntelligenceGroupsView;
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  onLogFieldIntelLabel?: string;
  hasFieldEvidence?: boolean;
}): DiscoveryMissionControlModel {
  const hasFieldEvidence =
    input.hasFieldEvidence ??
    providerHasFieldIntelligenceEvidence({
      contact: input.contact,
      engagements: input.engagements,
    });

  if (!hasFieldEvidence) {
    return {
      objective: "",
      topRisks: [],
      bestNextQuestion: null,
      upcoming: null,
      secondaryActions: [],
    };
  }

  const next = pickNextUpcomingEngagement(input.engagements);
  let upcoming: string | null = null;
  if (next) {
    const title =
      next.title?.trim() ||
      next.engagement_type_label ||
      next.engagement_type ||
      "Engagement";
    const when = next.scheduled_at || next.engagement_date;
    const whenLabel = when
      ? new Date(when.includes("T") ? when : `${when}T12:00:00`).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "TBD";
    upcoming = `${title} · ${whenLabel}`;
  }

  return {
    objective: discoveryMissionObjective(input.view, { hasFieldEvidence }),
    topRisks: discoveryMissionTopRisksFromView(input.view, input.contact, 3),
    bestNextQuestion: discoveryBestNextQuestion({ contact: input.contact, hasFieldEvidence }),
    upcoming,
    secondaryActions: LOG_UPDATE_UI_ENABLED
      ? [{ id: "log-intel", label: input.onLogFieldIntelLabel ?? "Log field intel" }]
      : [],
  };
}

const ACTIVITY_VERB: Partial<Record<DiscoveryStructuredSignalId, Partial<Record<DiscoveryFieldStatusLabel, string>>>> = {
  observation_approval: {
    [F.captured]: "Observation interest noted",
    [F.validated]: "Observation approval validated",
    [F.blocked]: "Observation access declined",
  },
  scheduling_owner: {
    [F.captured]: "Scheduling contact captured",
    [F.validated]: "Scheduling owner confirmed",
  },
  facility_vendor_pathway: {
    [F.captured]: "Vendor pathway partially mapped",
    [F.validated]: "Vendor pathway confirmed",
  },
  workflow_visibility: {
    [F.captured]: "Workflow partially observed",
    [F.validated]: "Workflow validated",
  },
  product_alignment: {
    [F.captured]: "Product fit noted",
    [F.validated]: "Product fit confirmed",
  },
  clinical_champion: {
    [F.captured]: "Champion lead noted",
    [F.validated]: "Champion confirmed",
  },
};

function parseRelativeWhen(updatedAt: string | undefined): string | null {
  if (!updatedAt?.trim()) return null;
  const d = new Date(updatedAt);
  if (Number.isNaN(d.getTime())) return null;

  const now = Date.now();
  const diffMs = now - d.getTime();
  const dayMs = 86_400_000;

  if (diffMs < dayMs) return "Today";
  if (diffMs < dayMs * 2) return "Yesterday";
  const days = Math.floor(diffMs / dayMs);
  if (days <= 14) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function latestMetaForRow(
  row: DiscoveryIntelligenceSignalRow,
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
): { updatedAt?: string; label: string } {
  const meta = fieldMeta[row.primaryDbKey];
  return { updatedAt: meta?.updated_at, label: row.label };
}

export function buildDiscoveryRecentIntelligenceActivity(input: {
  view: DiscoveryIntelligenceGroupsView;
  contact: Record<string, unknown>;
  max?: number;
}): DiscoveryRecentActivityItem[] {
  const fieldMeta = parseProviderIntelligenceFieldMetadata(
    input.contact.provider_intelligence_field_metadata,
  );
  const max = input.max ?? 5;
  const items: DiscoveryRecentActivityItem[] = [];

  const rows = input.view.groups.flatMap((g) => g.rows);

  for (const row of rows) {
    if (!row.signalId) continue;
    const { updatedAt } = latestMetaForRow(row, fieldMeta);
    const whenLabel = parseRelativeWhen(updatedAt);
    if (!whenLabel) continue;

    const verb =
      ACTIVITY_VERB[row.signalId]?.[row.statusLabel as DiscoveryFieldStatusLabel] ??
      (row.statusLabel === F.validated
        ? `${row.label} validated`
        : row.statusLabel === F.captured
          ? `${row.label} updated`
          : null);

    if (!verb) continue;

    items.push({
      id: `${row.signalId}-${updatedAt ?? row.id}`,
      line: verb,
      whenLabel,
      state: discoveryVisualSignalState({
        percent: row.statusLabel === F.validated ? 100 : row.statusLabel === F.captured ? 50 : 0,
        statusLabel: row.statusLabel,
      }),
    });
  }

  items.sort((a, b) => {
    const order = (w: string) => {
      if (w === "Today") return 0;
      if (w === "Yesterday") return 1;
      const m = /^(\d+)d ago$/.exec(w);
      if (m) return 2 + Number(m[1]);
      return 99;
    };
    return order(a.whenLabel) - order(b.whenLabel);
  });

  return items.slice(0, max);
}

export function discoveryDomainStaleIntelLabel(
  group: DiscoveryIntelligenceGroup,
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
): string | null {
  let latest: Date | null = null;

  for (const row of group.rows) {
    const meta = fieldMeta[row.primaryDbKey];
    if (meta?.updated_at) {
      const d = new Date(meta.updated_at);
      if (!Number.isNaN(d.getTime()) && (!latest || d > latest)) latest = d;
    }
  }

  const relative = parseRelativeWhen(latest?.toISOString() ?? undefined);
  if (!relative) return null;
  if (relative === "Today") return "Updated today";
  return `Updated ${relative.toLowerCase()}`;
}

export const DISCOVERY_DOMAIN_ICON_LABEL: Record<DiscoveryIntelligenceGroupId, string> = {
  opportunity_intelligence: "Opportunity",
  access_readiness: "Access",
  clinical_fit: "Clinical",
  champion_landscape: "Champions",
};

export type DiscoveryDomainOperationalPriority = "critical" | "important" | "monitoring";

export const DISCOVERY_DOMAIN_OPERATIONAL_PRIORITY: Record<
  DiscoveryIntelligenceGroupId,
  DiscoveryDomainOperationalPriority
> = {
  opportunity_intelligence: "monitoring",
  access_readiness: "critical",
  clinical_fit: "important",
  champion_landscape: "important",
};

export const DISCOVERY_DOMAIN_PRIORITY_LABEL: Record<DiscoveryDomainOperationalPriority, string> = {
  critical: "Critical",
  important: "Important",
  monitoring: "Monitoring",
};

export function discoveryDomainOperationalPriority(
  groupId: DiscoveryIntelligenceGroupId,
): DiscoveryDomainOperationalPriority {
  return DISCOVERY_DOMAIN_OPERATIONAL_PRIORITY[groupId];
}
