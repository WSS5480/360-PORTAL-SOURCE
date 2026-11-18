/**
 * Tactical presentation layer — header, signals, and dominant next-move copy for overview.
 */

import type { ProviderOverviewNarrative } from "@/lib/surgical-sales/buildProviderOverviewNarrative";
import type { ProviderOverviewSimpleView } from "@/lib/surgical-sales/buildProviderOverviewSimpleView";
import { resolveProviderLastActivity } from "@/lib/surgical-sales/buildProviderStrategicSummary";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  operationalStatusPillLabel,
  resolveProviderIntelligenceMaturityLabel,
  type ProviderIntelligenceMaturityTone,
} from "@/lib/surgical-sales/providerOverviewIntelligenceMaturity";
import { normalizeFieldOpsPrimaryCta } from "@/lib/surgical-sales/providerOverviewFieldOpsCta";
import type { ProviderIntelligenceScopeDisplay } from "@/lib/surgical-sales/buildProviderIntelligenceScopeDisplay";
import {
  buildProviderOverviewOperationalSignals,
  flattenOperationalSignalGroups,
  type OperationalFieldSignal,
  type OperationalFieldSignalGroup,
} from "@/lib/surgical-sales/buildProviderOverviewOperationalSignals";
import type { ProviderOverviewIntelligenceDensity } from "@/lib/surgical-sales/buildProviderOverviewIntelligenceDensity";
import {
  OVERVIEW_FIELD_ACTIVITY_ON_FILE,
  OVERVIEW_WORKFLOW_INTELLIGENCE_DEVELOPING,
  overviewFreshnessWhenNoActivity,
} from "@/lib/surgical-sales/providerOverviewEarlyDiscoveryVocabulary";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";

/** @deprecated Use OperationalFieldSignal */
export type FieldReadinessSignalTone = "confirmed" | "watch" | "open" | "neutral";

/** @deprecated Use OperationalFieldSignal */
export type FieldReadinessSignal = {
  id: string;
  label: string;
  tone: FieldReadinessSignalTone;
};

export type { OperationalFieldSignal, OperationalFieldSignalGroup };

export type ProviderOverviewTacticalHeader = {
  statusPill: string;
  statusTone: ProviderIntelligenceMaturityTone;
  contextLine: string;
  nextFieldMove: string;
  maturityLabel: string;
};

export type ProviderOverviewTacticalPresentation = {
  header: ProviderOverviewTacticalHeader;
  fieldSignalGroups: OperationalFieldSignalGroup[];
  /** Flattened signals — prefer fieldSignalGroups in UI */
  fieldSignals: OperationalFieldSignal[];
  nextActionNarrative: string;
  recommendedFieldMoveTitle: string;
  recommendedFieldMoveLine: string;
};

function formatFreshnessLabel(
  activityTimeline: Array<Record<string, unknown>> | undefined,
  engagements: ProviderEngagementSummary[] | undefined,
  density: ProviderOverviewIntelligenceDensity,
): string {
  const lastActivity = resolveProviderLastActivity(activityTimeline ?? []);
  if (lastActivity?.atLabel) {
    return `Last updated ${lastActivity.atLabel.toLowerCase()}`;
  }
  const completed = (engagements ?? []).some(
    (e) => String(e.status || "").toLowerCase() === "completed",
  );
  if (completed) return OVERVIEW_FIELD_ACTIVITY_ON_FILE;
  return overviewFreshnessWhenNoActivity(density);
}

function countOpenItems(scope: ProviderIntelligenceScopeDisplay): number {
  return (
    scope.facility.bullets.filter((b) => b.state === "gap").length +
    scope.provider.bullets.filter((b) => b.state === "gap").length
  );
}

function buildContextLine(input: {
  maturityLabel: string;
  openItemCount: number;
  freshness: string;
  hasWorkflowSignals: boolean;
}): string {
  const parts: string[] = [input.maturityLabel];
  if (input.openItemCount > 0) {
    parts.push(
      `${input.openItemCount} open item${input.openItemCount === 1 ? "" : "s"}`,
    );
  } else if (input.hasWorkflowSignals) {
    parts.push("Workflow signals emerging");
  } else if (input.maturityLabel.includes("forming") || input.maturityLabel.includes("developing")) {
    parts.push(OVERVIEW_WORKFLOW_INTELLIGENCE_DEVELOPING);
  }
  parts.push(input.freshness);
  return parts.join(" • ");
}

function buildNextActionNarrative(input: {
  nextLabel: string;
  commercialStage: ProviderOverviewNarrative["commercialStage"];
  density: ProviderOverviewSimpleView["intelligenceDensity"];
}): string {
  const action = input.nextLabel;
  if (/access follow-up/i.test(action)) {
    return "Follow up on scheduling contact and credentialing pathway to advance observation access.";
  }
  if (/intro call/i.test(action)) {
    return "Schedule intro call to assess openness to observation and workflow collaboration.";
  }
  if (/debrief/i.test(action)) {
    return "Debrief the touchpoint and capture what changed in the operational picture.";
  }
  if (/observation/i.test(action)) {
    return "Confirm observation access and align on realistic case days.";
  }
  if (input.density === "sparse") {
    return "Start with provider openness before mapping facility access or scheduling logistics.";
  }
  return scanLine(
    `Advance ${action.toLowerCase()} to strengthen the operational picture.`,
    88,
  );
}

export type ProviderOverviewTacticalPresentationInputView = Omit<
  ProviderOverviewSimpleView,
  "operationalMemory" | "tactical" | "scopeDisplay"
>;

export function buildProviderOverviewTacticalPresentation(input: {
  view: ProviderOverviewTacticalPresentationInputView;
  narrative: ProviderOverviewNarrative;
  scope: ProviderIntelligenceScopeDisplay;
  contact: Record<string, unknown>;
  activityTimeline?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  organizationLinked?: boolean;
}): ProviderOverviewTacticalPresentation {
  const { view, narrative, scope } = input;
  const maturity = resolveProviderIntelligenceMaturityLabel({
    visibilityState: view.deploymentReadiness.visibilityState,
    density: view.intelligenceDensity,
    commercialStage: narrative.commercialStage,
    status: view.status,
  });

  const openItemCount = countOpenItems(scope);
  const freshness = formatFreshnessLabel(
    input.activityTimeline,
    input.engagements,
    view.intelligenceDensity,
  );
  const hasObservationHistory =
    (input.cases ?? []).some((c) => String(c.case_type || "").toLowerCase() === "observation") ||
    (input.engagements ?? []).some((e) =>
      /observation|or_visit|or_observation/i.test(String(e.engagement_type || "")),
    );

  const nextLabel = normalizeFieldOpsPrimaryCta(
    view.currentWorkflowAction?.ctaLabel || view.recommendedNextAction.ctaLabel,
  );

  const header: ProviderOverviewTacticalHeader = {
    statusPill: operationalStatusPillLabel(narrative.commercialStage, view.stageLabel),
    statusTone: maturity.tone,
    maturityLabel: maturity.label,
    nextFieldMove: nextLabel,
    contextLine: buildContextLine({
      maturityLabel: maturity.label,
      openItemCount,
      freshness,
      hasWorkflowSignals: scope.facility.bullets.some((b) => b.state === "known"),
    }),
  };

  const fieldSignalGroups = buildProviderOverviewOperationalSignals({
    scope,
    organizationLinked: Boolean(input.organizationLinked),
    hasObservationHistory,
    density: view.intelligenceDensity,
  });

  return {
    header,
    fieldSignalGroups,
    fieldSignals: flattenOperationalSignalGroups(fieldSignalGroups),
    nextActionNarrative: buildNextActionNarrative({
      nextLabel,
      commercialStage: narrative.commercialStage,
      density: view.intelligenceDensity,
    }),
    recommendedFieldMoveTitle: PROVIDER_FIELD_OPS_SECTION.recommendedFieldMove,
    recommendedFieldMoveLine: view.recommendedActionLine,
  };
}
