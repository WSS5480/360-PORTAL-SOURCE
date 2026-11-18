/**
 * Provider overview — high-level Discovery intelligence synthesis (detail lives on Intelligence tab).
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildDiscoveryIntelligenceGroupsView,
  type DiscoveryIntelligenceGroup,
  type DiscoveryIntelligenceSignalRow,
} from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import {
  DISCOVERY_FIELD_STATUS,
  isDiscoverySignalStatusResolved,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  DISCOVERY_OVERVIEW_GROUP_COPY,
  type DiscoveryOverviewGroupId,
} from "@/lib/surgical-sales/providerOverviewBriefingCopy";
import {
  hasProviderObservationApprovalValidated,
} from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import {
  hasClinicalLearningForNextMove,
  resolveDiscoveryOverviewWorkflowSummary,
} from "@/lib/surgical-sales/providerOverviewDiscoveryNextMove";
import { providerProfileFieldContext } from "@/lib/surgical-sales/backgroundIntelligenceSections";
import {
  FIELD_INTELLIGENCE_NOT_STARTED,
  providerHasFieldIntelligenceEvidence,
} from "@/lib/surgical-sales/providerFieldIntelligenceEvidence";

export type { DiscoveryOverviewGroupId };

export type DiscoveryOverviewGroupSummary = {
  id: DiscoveryOverviewGroupId;
  title: string;
  summary: string;
};

export type DiscoveryOverviewSynthesis = {
  currentFocus: string | null;
  nextFieldMove: string;
  groups: DiscoveryOverviewGroupSummary[];
  /** Full groups view — Intelligence tab and workflow wiring */
  intelligenceView: ReturnType<typeof buildDiscoveryIntelligenceGroupsView>;
};

const F = DISCOVERY_FIELD_STATUS;

const OVERVIEW_GROUP_IDS: DiscoveryOverviewGroupId[] = [
  "access_readiness",
  "clinical_fit",
  "champion_landscape",
];

type SignalSummaryRule = {
  signalId: DiscoveryStructuredSignalId;
  whenStatus: readonly string[];
  whenConfidenceIncludes?: string;
  line: string;
};

const ACCESS_SUMMARY_RULES: SignalSummaryRule[] = [
  {
    signalId: "observation_approval",
    whenStatus: [F.unknown],
    line: "Provider observation approval pending",
  },
  {
    signalId: "observation_approval",
    whenStatus: [F.blocked],
    line: "Observation access declined",
  },
  {
    signalId: "observation_approval",
    whenStatus: [F.captured],
    whenConfidenceIncludes: "Interested",
    line: "Provider interest captured — approval not confirmed",
  },
  {
    signalId: "observation_approval",
    whenStatus: [F.captured],
    whenConfidenceIncludes: "logged",
    line: "Approval noted — needs confirmation",
  },
  {
    signalId: "scheduling_owner",
    whenStatus: [F.unknown],
    line: "Scheduling owner not identified",
  },
  {
    signalId: "scheduling_owner",
    whenStatus: [F.captured],
    line: "Scheduling owner named — needs confirmation",
  },
  {
    signalId: "facility_vendor_pathway",
    whenStatus: [F.unknown],
    line: "Facility and vendor approval path unknown",
  },
  {
    signalId: "facility_vendor_pathway",
    whenStatus: [F.captured],
    line: "Facility/vendor pathway captured — confirm requirements",
  },
  {
    signalId: "facility_vendor_pathway",
    whenStatus: [F.notApplicable],
    line: "No vendor pathway steps required",
  },
  {
    signalId: "observation_logistics",
    whenStatus: [F.unknown],
    line: "Observation logistics not mapped",
  },
  {
    signalId: "observation_logistics",
    whenStatus: [F.captured],
    line: "Observation logistics captured — confirm timing",
  },
];

const CLINICAL_SUMMARY_RULES: SignalSummaryRule[] = [
  {
    signalId: "workflow_visibility",
    whenStatus: [F.unknown],
    line: "Procedure workflow understanding not yet captured",
  },
  {
    signalId: "workflow_visibility",
    whenStatus: [F.captured],
    whenConfidenceIncludes: "Discussed",
    line: "Workflow discussed only — field visibility still needed",
  },
  {
    signalId: "workflow_visibility",
    whenStatus: [F.captured],
    whenConfidenceIncludes: "Partial",
    line: "Workflow partially understood — gaps remain",
  },
  {
    signalId: "workflow_visibility",
    whenStatus: [F.captured],
    whenConfidenceIncludes: "Observed",
    line: "Workflow observed in field — confirm repeatability",
  },
  {
    signalId: "product_alignment",
    whenStatus: [F.unknown],
    line: "Product alignment still unknown",
  },
  {
    signalId: "product_alignment",
    whenStatus: [F.captured],
    whenConfidenceIncludes: "Low",
    line: "Product alignment assessed as low",
  },
  {
    signalId: "product_alignment",
    whenStatus: [F.captured],
    whenConfidenceIncludes: "Moderate",
    line: "Product alignment moderate — refine on observation",
  },
  {
    signalId: "case_opportunity",
    whenStatus: [F.unknown],
    line: "Case opportunity not sized yet",
  },
  {
    signalId: "case_opportunity",
    whenStatus: [F.captured],
    whenConfidenceIncludes: "Low",
    line: "Case opportunity assessed as low",
  },
];

const CHAMPION_SUMMARY_RULES: SignalSummaryRule[] = [
  {
    signalId: "clinical_champion",
    whenStatus: [F.unknown],
    line: "No clinical champion identified",
  },
  {
    signalId: "clinical_champion",
    whenStatus: [F.captured],
    line: "Potential champion captured — confirm influence",
  },
];

function rowBySignalId(
  rows: DiscoveryIntelligenceSignalRow[],
): Map<string, DiscoveryIntelligenceSignalRow> {
  const map = new Map<string, DiscoveryIntelligenceSignalRow>();
  for (const row of rows) {
    if (row.signalId) map.set(row.signalId, row);
  }
  return map;
}

function firstMatchingSummary(
  rules: SignalSummaryRule[],
  rows: DiscoveryIntelligenceSignalRow[],
): string | null {
  const byId = rowBySignalId(rows);
  for (const rule of rules) {
    const row = byId.get(rule.signalId);
    if (!row) continue;
    if (!rule.whenStatus.includes(row.statusLabel)) continue;
    if (
      rule.whenConfidenceIncludes &&
      !row.confidenceLabel.includes(rule.whenConfidenceIncludes)
    ) {
      continue;
    }
    return rule.line;
  }
  return null;
}

function confirmedSummary(rows: DiscoveryIntelligenceSignalRow[]): string {
  const total = rows.length;
  const resolved = rows.filter(
    (r) => r.signalId && isDiscoverySignalStatusResolved(r.signalId, r.statusLabel),
  ).length;
  if (total === 0) return "Nothing confirmed yet";
  if (resolved === total) return `Ready to use — ${resolved} of ${total} confirmed`;
  if (resolved > 0) {
    return `${resolved} of ${total} ready — ${total - resolved} still uncertain`;
  }
  return `${total - resolved} of ${total} still uncertain`;
}

function summarizeAccessGroup(rows: DiscoveryIntelligenceSignalRow[]): string {
  return (
    firstMatchingSummary(ACCESS_SUMMARY_RULES, rows) ??
    confirmedSummary(rows)
  );
}

function summarizeClinicalGroup(rows: DiscoveryIntelligenceSignalRow[]): string {
  return (
    firstMatchingSummary(CLINICAL_SUMMARY_RULES, rows) ??
    confirmedSummary(rows)
  );
}

function summarizeChampionGroup(rows: DiscoveryIntelligenceSignalRow[]): string {
  return (
    firstMatchingSummary(CHAMPION_SUMMARY_RULES, rows) ??
    confirmedSummary(rows)
  );
}

function summarizeOverviewGroup(
  id: DiscoveryOverviewGroupId,
  group: DiscoveryIntelligenceGroup | undefined,
  contact: Record<string, unknown>,
): string {
  if (!group || group.rows.length === 0) return "Still learning";

  if (
    id === "clinical_fit" &&
    !hasProviderObservationApprovalValidated(contact) &&
    !hasClinicalLearningForNextMove(contact)
  ) {
    return scanLine("Opens after observation approval", 96);
  }

  switch (id) {
    case "access_readiness":
      return scanLine(summarizeAccessGroup(group.rows), 96);
    case "clinical_fit":
      return scanLine(summarizeClinicalGroup(group.rows), 96);
    case "champion_landscape":
      return scanLine(summarizeChampionGroup(group.rows), 96);
    default:
      return scanLine(confirmedSummary(group.rows), 96);
  }
}

export function resolveDiscoveryOverviewCurrentFocus(input: {
  contact: Record<string, unknown>;
  intelligenceView: ReturnType<typeof buildDiscoveryIntelligenceGroupsView>;
  cases?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
}): string | null {
  void input.intelligenceView;
  return resolveDiscoveryOverviewWorkflowSummary(
    input.contact,
    providerProfileFieldContext({
      cases: input.cases,
      engagements: input.engagements,
    }),
  ).currentFocus;
}

export function resolveDiscoveryOverviewNextFieldMove(
  contact: Record<string, unknown>,
): string {
  return resolveDiscoveryOverviewWorkflowSummary(contact).nextFieldMove;
}

export function buildDiscoveryOverviewSynthesis(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  relationshipStage?: string | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
}): DiscoveryOverviewSynthesis {
  const hasFieldEvidence = providerHasFieldIntelligenceEvidence({
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
  });

  if (!hasFieldEvidence) {
    return {
      currentFocus: null,
      nextFieldMove: `${FIELD_INTELLIGENCE_NOT_STARTED.recommendedActions.startIntroCall} or ${FIELD_INTELLIGENCE_NOT_STARTED.recommendedActions.createFirstEngagement.toLowerCase()}.`,
      groups: OVERVIEW_GROUP_IDS.map((id) => ({
        id,
        title: DISCOVERY_OVERVIEW_GROUP_COPY[id].title,
        summary: FIELD_INTELLIGENCE_NOT_STARTED.message,
      })),
      intelligenceView: buildDiscoveryIntelligenceGroupsView({
        contact: input.contact,
        planning: input.planning,
        relationshipStage: input.relationshipStage,
        engagements: input.engagements,
        opportunities: input.opportunities,
        cases: input.cases,
      }),
    };
  }

  const intelligenceView = buildDiscoveryIntelligenceGroupsView({
    contact: input.contact,
    planning: input.planning,
    relationshipStage: input.relationshipStage,
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  const groups: DiscoveryOverviewGroupSummary[] = OVERVIEW_GROUP_IDS.map((id) => {
    const group = intelligenceView.groups.find((g) => g.id === id);
    return {
      id,
      title: DISCOVERY_OVERVIEW_GROUP_COPY[id].title,
      summary: summarizeOverviewGroup(id, group, input.contact),
    };
  });

  return {
    currentFocus: resolveDiscoveryOverviewCurrentFocus({
      contact: input.contact,
      intelligenceView,
      cases: input.cases,
      engagements: input.engagements,
    }),
    nextFieldMove: resolveDiscoveryOverviewNextFieldMove(input.contact),
    groups,
    intelligenceView,
  };
}
