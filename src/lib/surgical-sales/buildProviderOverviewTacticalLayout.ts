/**
 * Tactical provider overview — hero, progression summary, actions, upcoming.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { formatEngagementTouchWhenLabel } from "@/lib/surgical-sales/engagements/engagementScheduleDisplay";
import { buildEngagementDebriefHref } from "@/lib/surgical-sales/engagements/engagementLifecycle";
import {
  buildEngagementPrepareForMeetingHref,
  isUpcomingEngagementStatus,
  pickNextUpcomingEngagement,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  pickEngagementNeedingDebrief,
  PROVIDER_OVERVIEW_DEBRIEF_NOW_CTA,
  type ProviderEngagementWorkflowAction,
} from "@/lib/surgical-sales/buildProviderEngagementWorkflowAction";
import {
  hasLoggedEngagements,
  PROVIDER_OVERVIEW_NO_ACTIVITY_HINT,
} from "@/lib/surgical-sales/deriveProviderOverviewWorkflowActions";
import type { ProviderOverviewDiscoveryProgressionModel } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import type {
  ProviderOverviewNextBestActionModel,
  ProviderOverviewPathwayStageModel,
} from "@/lib/surgical-sales/buildProviderOverviewBody";
import { providerOverviewRequirementsMetCount } from "@/lib/surgical-sales/buildProviderOverviewPathwayRequirements";
import {
  ACCESS_WORKFLOW_READINESS_IDS,
  OPERATIONAL_ACCESS_READINESS_IDS,
  PRIMARY_CLINICAL_GAP_LABEL,
  resolveProviderOverviewDiscoveryOperationalPhase,
  type ProviderOverviewDiscoveryOperationalPhase,
} from "@/lib/surgical-sales/providerOverviewDiscoveryOperationalPhase";
import { deriveProviderOverviewWorkflowActions } from "@/lib/surgical-sales/deriveProviderOverviewWorkflowActions";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  filterPrimaryAlertItems,
  filterPrimaryAlertLabels,
  type ActiveScheduledFieldContext,
} from "@/lib/surgical-sales/backgroundIntelligenceSections";
import {
  formatRequirementProgress,
  shouldShowAbstractMetrics,
} from "@/lib/surgical-sales/fieldIntelligenceMetricPolicy";
import { sanitizeFieldFriendlyOverviewCopy } from "@/lib/surgical-sales/providerOverviewBriefingCopy";
import { buildProviderObservationReadiness } from "@/lib/surgical-sales/providerObservationReadiness";

export type { ProviderOverviewDiscoveryOperationalPhase };

import type { ProviderOverviewWorkflowCtaAction } from "@/lib/surgical-sales/providerOverviewWorkflowCta";
import type { ProviderOverviewCustomAction } from "@/lib/surgical-sales/providerOverviewDiscoveryApprovalActions";
import { buildDiscoveryProviderOverviewActions } from "@/lib/surgical-sales/buildDiscoveryProviderOverviewActions";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";

export type ProviderOverviewTacticalAction = {
  id: string;
  label: string;
  href?: string;
  kind: "link" | "button";
  emphasis: "primary" | "secondary" | "ghost";
  workflowAction?: ProviderOverviewWorkflowCtaAction;
  customAction?: ProviderOverviewCustomAction;
};

export type ProviderOverviewTacticalHeroModel = {
  stageLabel: string;
  /** One-line operational mission (headline). */
  missionLine: string;
  tacticalSummary: string;
  nextMove: string;
  metrics: Array<{ id: string; label: string; value: string; inline: string }>;
  actions: ProviderOverviewTacticalAction[];
};

export type ProviderOverviewProgressionDetailRow = {
  id: string;
  label: string;
  marker: string;
  tone: "complete" | "partial" | "open" | "blocked";
};

export type ProviderOverviewTacticalProgressionModel = {
  operationalPhase: ProviderOverviewDiscoveryOperationalPhase;
  /** Action-oriented target (displayed as NEXT TARGET). */
  nextTarget: string;
  milestoneMet: boolean;
  gapCount: number;
  gapPhrase: string | null;
  /** Dominant open gap — one item in the active context. */
  openItems: Array<{ id: string; label: string }>;
  /** Logistics hidden until observation approval (clinical phase only). */
  lockedItems: Array<{ id: string; label: string }>;
  details: ProviderOverviewProgressionDetailRow[];
};

export type ProviderOverviewEngagementTouchState = "upcoming" | "debrief_needed";

export type ProviderOverviewUpcomingTouchModel =
  | {
      state: "upcoming";
      title: string;
      whenLabel: string;
      briefingHref: string;
      ctaLabel: string;
    }
  | {
      state: "debrief_needed";
      title: string;
      whenLabel: string;
      debriefHref: string;
      ctaLabel: string;
      /** Secondary field briefing when an upcoming touch is also on calendar. */
      briefingHref?: string;
      briefingCtaLabel?: string;
    }
  | null;

function buildDebriefHref(engagementId: string): string {
  return buildEngagementDebriefHref(engagementId);
}

function formatEngagementTouchWhen(engagement: ProviderEngagementSummary): string {
  return formatEngagementTouchWhenLabel(engagement);
}

function resolveTacticalSummary(
  pathway: ProviderOverviewPathwayStageModel,
  discovery: ProviderOverviewDiscoveryProgressionModel | null,
  operationalPhase: ProviderOverviewDiscoveryOperationalPhase,
): string {
  if (operationalPhase === "clinical_sponsorship") {
    if (discovery?.advancementSignal.detail && !discovery.advancementSignal.met) {
      const detail = discovery.advancementSignal.detail;
      if (!/\b(scheduling|vendor|credential|logistics|coordinator|access path)\b/i.test(detail)) {
        return scanLine(detail, 72);
      }
    }
    return PRIMARY_CLINICAL_GAP_LABEL;
  }
  if (discovery) {
    if (discovery.advancementSignal.met) {
      const firstGap = discovery.observationReadiness.find(
        (r) =>
          OPERATIONAL_ACCESS_READINESS_IDS.has(r.id) &&
          (r.status === "open" || r.status === "blocked" || r.status === "partial"),
      );
      if (firstGap) {
        return scanLine(formatOperationalBlockerLabel(firstGap.label, firstGap.id), 72);
      }
      return scanLine("Close remaining operational access requirements on your next touch.", 72);
    }
  }
  const open = pathway.requirements.find((r) => r.status !== "validated");
  if (open) return scanLine(open.contextLine || open.label, 72);
  return scanLine(pathway.stageObjective, 72);
}

function resolveNextMove(next: ProviderOverviewNextBestActionModel): string {
  const detail = next.detail.trim();
  const label = next.label.trim();
  const line = (detail || label).replace(/^next move:\s*/i, "").replace(/\.$/, "");
  return scanLine(line, 88);
}

function resolveMissionLine(
  pathway: ProviderOverviewPathwayStageModel,
  discovery: ProviderOverviewDiscoveryProgressionModel | null,
  operationalPhase: ProviderOverviewDiscoveryOperationalPhase,
): string {
  if (pathway.stageId === "discovery" && !pathway.hasFieldEvidence) {
    return "";
  }
  if (operationalPhase === "clinical_sponsorship") {
    return scanLine("Secure provider-sponsored observation access", 96);
  }
  if (operationalPhase === "operational_access") {
    return scanLine("Coordinate observation access", 96);
  }
  if (discovery?.advancementSignal.met) {
    return scanLine(
      discovery.nextRecommendedAction || "Coordinate observation access",
      96,
    );
  }
  const objective = pathway.stageObjective?.trim();
  if (objective) return scanLine(objective, 96);
  return resolveNextTargetLabel(pathway, discovery, operationalPhase);
}

function resolveNextTargetLabel(
  pathway: ProviderOverviewPathwayStageModel,
  discovery: ProviderOverviewDiscoveryProgressionModel | null,
  operationalPhase: ProviderOverviewDiscoveryOperationalPhase,
): string {
  if (operationalPhase === "clinical_sponsorship") {
    return "Validate provider-sponsored observation access";
  }
  if (discovery?.advancementSignal.met) {
    const first = discovery.observationReadiness.find(
      (r) =>
        OPERATIONAL_ACCESS_READINESS_IDS.has(r.id) &&
        r.status !== "complete",
    );
    if (first) {
      return scanLine(formatOperationalBlockerLabel(first.label, first.id), 72);
    }
    return scanLine(
      discovery.nextRecommendedAction || "Complete operational access requirements",
      72,
    );
  }
  const open = pathway.requirements.find((r) => r.status !== "validated");
  return scanLine(open?.label || "Complete pathway requirements", 72);
}

function formatMetricInline(label: string, value: string): string {
  return `${label}: ${value}`;
}

function buildProgressionDetails(
  pathway: ProviderOverviewPathwayStageModel,
  discovery: ProviderOverviewDiscoveryProgressionModel | null,
  operationalPhase: ProviderOverviewDiscoveryOperationalPhase,
): ProviderOverviewProgressionDetailRow[] {
  if (discovery) {
    const rows = discovery.observationReadiness.map((row) => ({
      id: row.id,
      label: row.label,
      marker: row.marker,
      tone: row.status,
    }));
    if (operationalPhase === "clinical_sponsorship") {
      return [];
    }
    return rows.filter((r) => ACCESS_WORKFLOW_READINESS_IDS.has(r.id));
  }
  return pathway.requirements.map((req) => ({
    id: req.id,
    label: req.label,
    marker: req.status === "validated" ? "✓" : req.status === "blocked" ? "!" : "△",
    tone:
      req.status === "validated"
        ? "complete"
        : req.status === "blocked"
          ? "blocked"
          : req.status === "in_progress" || req.status === "needs_follow_up"
            ? "partial"
            : "open",
  }));
}

function countOperationalGaps(
  pathway: ProviderOverviewPathwayStageModel,
  discovery: ProviderOverviewDiscoveryProgressionModel | null,
  operationalPhase: ProviderOverviewDiscoveryOperationalPhase,
  openItems: Array<{ id: string; label: string }>,
): number {
  if (operationalPhase === "clinical_sponsorship") {
    return openItems.length > 0 ? 1 : 0;
  }
  if (discovery) {
    return discovery.observationReadiness.filter(
      (r) =>
        OPERATIONAL_ACCESS_READINESS_IDS.has(r.id) && r.status !== "complete",
    ).length;
  }
  const total = pathway.requirements.length;
  const met = providerOverviewRequirementsMetCount(pathway.requirements);
  return Math.max(0, total - met);
}

function buildDominantOpenItems(
  operationalPhase: ProviderOverviewDiscoveryOperationalPhase,
  details: ProviderOverviewProgressionDetailRow[],
  fieldContext: ActiveScheduledFieldContext = {},
  contact: Record<string, unknown> = {},
): Array<{ id: string; label: string }> {
  if (operationalPhase === "clinical_sponsorship") {
    return filterPrimaryAlertItems(
      [{ id: "observation_approval", label: PRIMARY_CLINICAL_GAP_LABEL }],
      (item) => item.label,
      fieldContext,
    );
  }

  const readinessBlockers = buildProviderObservationReadiness(contact).blockers;
  if (operationalPhase === "operational_access" && readinessBlockers.length > 0) {
    return filterPrimaryAlertItems(
      readinessBlockers.map((label, index) => ({
        id: `readiness_blocker_${index}`,
        label,
      })),
      (item) => item.label,
      fieldContext,
    ).slice(0, 3);
  }

  const first = details.find(
    (r) => OPERATIONAL_ACCESS_READINESS_IDS.has(r.id) && r.tone !== "complete",
  );
  if (!first) return [];
  return filterPrimaryAlertItems(
    [{ id: first.id, label: formatOperationalBlockerLabel(first.label, first.id) }],
    (item) => item.label,
    fieldContext,
  );
}

function dedupeGapPhrase(
  gapPhrase: string | null,
  openItems: Array<{ id: string; label: string }>,
): string | null {
  if (!gapPhrase || openItems.length === 0) return gapPhrase;
  const primary = openItems[0].label.toLowerCase();
  const phrase = gapPhrase.toLowerCase();
  if (phrase.includes(primary) || primary.includes(phrase.slice(0, 24))) {
    return null;
  }
  return gapPhrase;
}

export function buildProviderOverviewPrimaryActions(input: {
  engagements?: ProviderEngagementSummary[];
  briefingHref: string;
  workflow: ProviderEngagementWorkflowAction | null;
  nextBestAction: ProviderOverviewNextBestActionModel;
  newEngagementHref: string;
  contact?: Record<string, unknown>;
  pathwayStageId?: SalesPathwayStageId;
}): ProviderOverviewTacticalAction[] {
  if (input.pathwayStageId === "discovery") {
    return buildDiscoveryProviderOverviewActions({
      engagements: input.engagements,
      workflow: input.workflow,
      briefingHref: input.briefingHref,
      newEngagementHref: input.newEngagementHref,
      contact: input.contact ?? {},
    });
  }

  return deriveProviderOverviewWorkflowActions({
    engagements: input.engagements,
    workflow: input.workflow,
    nextBestAction: input.nextBestAction,
    newEngagementHref: input.newEngagementHref,
    contact: input.contact,
  });
}

export function buildProviderOverviewTacticalHero(input: {
  pathway: ProviderOverviewPathwayStageModel;
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  nextBestAction: ProviderOverviewNextBestActionModel;
  briefingHref: string;
  newEngagementHref: string;
  workflow: ProviderEngagementWorkflowAction | null;
}): ProviderOverviewTacticalHeroModel {
  const discovery = input.pathway.discoveryProgression;
  const operationalPhase = resolveProviderOverviewDiscoveryOperationalPhase({
    discovery,
    contact: input.contact,
  });
  const readinessMet = discovery
    ? discovery.observationReadiness.filter(
        (r) =>
          operationalPhase === "operational_access" &&
          ACCESS_WORKFLOW_READINESS_IDS.has(r.id) &&
          r.status === "complete",
      ).length
    : providerOverviewRequirementsMetCount(input.pathway.requirements);
  const readinessTotal = discovery
    ? discovery.observationReadiness.filter(
        (r) =>
          operationalPhase === "operational_access" && ACCESS_WORKFLOW_READINESS_IDS.has(r.id),
      ).length
    : input.pathway.requirements.length;

  const tacticalSummary =
    input.pathway.stageId === "discovery" && !input.pathway.hasFieldEvidence
      ? ""
      : !hasLoggedEngagements(input.engagements)
        ? scanLine(PROVIDER_OVERVIEW_NO_ACTIVITY_HINT, 120)
        : resolveTacticalSummary(input.pathway, discovery, operationalPhase);

  const showMetrics = shouldShowAbstractMetrics({
    hasFieldEvidence: input.pathway.hasFieldEvidence,
    confirmedCount: readinessMet,
  });
  const readinessValue = showMetrics
    ? (formatRequirementProgress(readinessMet, readinessTotal, input.pathway.hasFieldEvidence) ??
      (readinessTotal > 0 ? `${readinessMet}/${readinessTotal}` : null))
    : null;

  const metrics: ProviderOverviewTacticalHeroModel["metrics"] = [];

  if (showMetrics) {
    metrics.push({
      id: "risk",
      label: "Visibility",
      value: input.pathway.riskLevel,
      inline: formatMetricInline("Visibility", input.pathway.riskLevel),
    });
    metrics.push({
      id: "confidence",
      label: "Access confidence",
      value: input.pathway.confidenceLevel,
      inline: formatMetricInline("Access confidence", input.pathway.confidenceLevel),
    });
  }

  if (readinessValue) {
    metrics.push({
      id: "readiness",
      label: "Readiness",
      value: readinessValue,
      inline: formatMetricInline("Readiness", readinessValue),
    });
  }

  return {
    stageLabel: input.pathway.stageLabel,
    missionLine: resolveMissionLine(input.pathway, discovery, operationalPhase),
    tacticalSummary,
    nextMove: resolveNextMove(input.nextBestAction),
    metrics,
    actions: buildProviderOverviewPrimaryActions({
      engagements: input.engagements,
      briefingHref: input.briefingHref,
      workflow: input.workflow,
      nextBestAction: input.nextBestAction,
      newEngagementHref: input.newEngagementHref,
      contact: input.contact,
      pathwayStageId: input.pathway.stageId,
    }),
  };
}

const BLOCKER_LABEL_OVERRIDES: Record<string, string> = {
  observation_approval_status: "Observation approval pending",
  scheduling_owner: "Scheduling owner not identified",
  facility_vendor_pathway: "Facility/vendor pathway unclear",
  observation_logistics: "Observation logistics unvalidated",
  procedure_workflow_visibility: "Procedure/workflow visibility limited",
  product_alignment_confidence: "Product alignment unclear",
  case_opportunity_potential: "Case opportunity not sized",
  clinical_champion: "Clinical champion not identified",
  decision_influence: "Decision influence not mapped",
};

const BLOCKER_LABEL_BY_SOURCE: Record<string, string> = {
  "Observation approval status": "Observation approval pending",
  "Scheduling owner identified": "Scheduling owner not identified",
  "Facility/vendor pathway understood": "Facility/vendor pathway unclear",
  "Observation logistics understood": "Observation logistics unvalidated",
  "Procedure/workflow visibility": "Procedure/workflow visibility limited",
  "Product alignment confidence": "Product alignment unclear",
  "Case opportunity potential": "Case opportunity not sized",
  "Clinical champion identified": "Clinical champion not identified",
  "Decision influence mapped": "Decision influence not mapped",
};

export function formatOperationalBlockerLabel(label: string, id?: string): string {
  if (id && BLOCKER_LABEL_OVERRIDES[id]) return BLOCKER_LABEL_OVERRIDES[id];
  if (BLOCKER_LABEL_BY_SOURCE[label]) return BLOCKER_LABEL_BY_SOURCE[label];
  const lower = label.toLowerCase();
  if (lower.includes("scheduling") && (lower.includes("owner") || lower.includes("ownership"))) {
    return "Scheduling owner not identified";
  }
  if (lower.includes("access pathway") || lower.includes("facility access")) {
    return "Vendor pathway not confirmed";
  }
  if (lower.includes("credential")) {
    return "Credentialing requirements unclear";
  }
  if (lower.includes("logistics")) {
    return "Observation logistics unvalidated";
  }
  if (lower.includes("workflow fit")) {
    return "Workflow fit not confirmed";
  }
  if (lower.includes("sponsor")) {
    return "OR sponsor not identified";
  }
  if (lower.includes("vendor approval")) {
    return "Vendor approval not confirmed";
  }
  const formatted = label
    .replace(/\bownership identified\b/i, "owner not identified")
    .replace(/\brequirements known\b/i, "requirements unclear")
    .replace(/\bpathway mapped\b/i, "pathway not confirmed")
    .replace(/\binterest understood\b/i, "interest unclear")
    .replace(/\bfit assessed\b/i, "fit not confirmed")
    .replace(/\blogistics confirmed\b/i, "logistics unvalidated")
    .trim();
  return sanitizeFieldFriendlyOverviewCopy(formatted);
}

export function buildProviderOverviewTacticalProgression(input: {
  pathway: ProviderOverviewPathwayStageModel;
  contact: Record<string, unknown>;
  fieldContext?: ActiveScheduledFieldContext;
}): ProviderOverviewTacticalProgressionModel {
  const fieldContext = input.fieldContext ?? {};
  const discovery = input.pathway.discoveryProgression;
  const operationalPhase = resolveProviderOverviewDiscoveryOperationalPhase({
    discovery,
    contact: input.contact,
  });
  const details = buildProgressionDetails(input.pathway, discovery, operationalPhase);
  const milestoneMet = discovery
    ? discovery.advancementSignal.met
    : input.pathway.requirements.every((r) => r.status === "validated");
  const openItems =
    input.pathway.stageId === "discovery" && !input.pathway.hasFieldEvidence
      ? []
      : buildDominantOpenItems(operationalPhase, details, fieldContext, input.contact);
  const gapCount = countOperationalGaps(
    input.pathway,
    discovery,
    operationalPhase,
    openItems,
  );
  const rawGapPhrase =
    operationalPhase === "clinical_sponsorship"
      ? null
      : discovery?.tacticalGap ??
        input.pathway.requirements.find((r) => r.status === "blocked" || r.status === "needs_follow_up")
          ?.contextLine ??
        null;
  const filteredGapPhrase = filterPrimaryAlertLabels(
    rawGapPhrase ? [scanLine(rawGapPhrase, 88)] : [],
    fieldContext,
  )[0] ?? null;
  const gapPhrase = dedupeGapPhrase(filteredGapPhrase, openItems);
  const lockedItems: Array<{ id: string; label: string }> = [];

  return {
    operationalPhase,
    nextTarget: resolveNextTargetLabel(input.pathway, discovery, operationalPhase),
    milestoneMet,
    gapCount,
    gapPhrase,
    openItems,
    lockedItems,
    details,
  };
}

export function buildProviderOverviewUpcomingTouch(input: {
  engagements?: ProviderEngagementSummary[];
  briefingHref?: string;
  completedObservationCount?: number;
}): ProviderOverviewUpcomingTouchModel {
  const engagements = input.engagements ?? [];
  const debriefEngagement = pickEngagementNeedingDebrief(
    engagements,
    input.completedObservationCount ?? 0,
  );

  if (debriefEngagement) {
    const title =
      debriefEngagement.engagement_type_label?.trim() ||
      debriefEngagement.title?.trim() ||
      "Engagement";
    const upcoming = pickNextUpcomingEngagement(engagements);
    const secondaryBriefing =
      upcoming &&
      isUpcomingEngagementStatus(upcoming.status) &&
      upcoming.id !== debriefEngagement.id
        ? buildEngagementPrepareForMeetingHref(upcoming.id)
        : input.briefingHref;

    return {
      state: "debrief_needed",
      title: scanLine(title, 48),
      whenLabel: formatEngagementTouchWhen(debriefEngagement),
      debriefHref: buildDebriefHref(debriefEngagement.id),
      ctaLabel: PROVIDER_OVERVIEW_DEBRIEF_NOW_CTA,
      ...(secondaryBriefing
        ? { briefingHref: secondaryBriefing, briefingCtaLabel: "Open briefing" }
        : {}),
    };
  }

  const upcoming = pickNextUpcomingEngagement(engagements);
  if (!upcoming || !isUpcomingEngagementStatus(upcoming.status)) return null;

  const title =
    upcoming.title?.trim() ||
    upcoming.engagement_type_label?.trim() ||
    "Engagement";

  return {
    state: "upcoming",
    title: scanLine(title, 48),
    whenLabel: formatEngagementTouchWhen(upcoming),
    briefingHref: buildEngagementPrepareForMeetingHref(upcoming.id),
    ctaLabel: "Open briefing",
  };
}

export function providerOverviewTouchActionHref(
  touch: ProviderOverviewUpcomingTouchModel,
): string | null {
  if (!touch) return null;
  return touch.state === "debrief_needed" ? touch.debriefHref : touch.briefingHref;
}

export { buildProviderOverviewWorkflowAction as resolveProviderOverviewWorkflowAction } from "@/lib/surgical-sales/deriveProviderOverviewWorkflowActions";
