/**
 * Provider overview — deployment cockpit view model.
 * Answers one question: "Should I deploy field time here right now?"
 */

import type { CanonicalExecutionBlocker } from "@/lib/surgical-sales/buildProviderCanonicalExecutionBlockers";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderOverviewNarrative } from "@/lib/surgical-sales/buildProviderOverviewNarrative";
import type { ProviderFieldTimeRisk } from "@/lib/surgical-sales/buildProviderFieldTimeRisk";
import {
  PROVIDER_FIELD_TIME_RISK_STATE_LABELS,
  type ProviderFieldTimeRiskState,
} from "@/lib/surgical-sales/providerFieldTimeRiskVocabulary";
import type { ProviderOverviewReadinessIndicator } from "@/lib/surgical-sales/providerOverviewQualitativeReadiness";
import { intelligenceCaptureHasSignal } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { overviewRiskFieldDescription } from "@/lib/surgical-sales/providerOverviewRiskCopy";
import { textsShareOperationalConcept } from "@/lib/surgical-sales/providerOverviewConceptDedup";
import {
  buildProviderOverviewConfirmedSoFar,
} from "@/lib/surgical-sales/buildProviderOverviewKnownSoFar";
import {
  buildProviderOverviewDeploymentResolution,
  type ProviderOverviewDeploymentResolution,
} from "@/lib/surgical-sales/buildProviderOverviewDeploymentResolution";
import {
  buildProviderOverviewGuidanceCards,
  type ProviderOverviewGuidanceCard,
} from "@/lib/surgical-sales/buildProviderOverviewGuidanceCards";

export type ProviderOverviewDeploymentStepStatus = "complete" | "partial" | "open";

export type ProviderDeploymentRecommendationTone = "deploy" | "hold" | "caution";

export type ProviderOverviewDeploymentStep = {
  id: string;
  label: string;
  status: ProviderOverviewDeploymentStepStatus;
};

export type ProviderOverviewCardCopy = {
  headline: string;
  support: string | null;
  context: string | null;
};

export type ProviderOverviewUpcomingEngagement = {
  headline: string;
  whenLabel: string;
  ctaLabel: string;
  ctaHref: string;
};

/** Deployment cockpit — mobile-first priority feed */
export type ProviderDeploymentCockpitView = {
  command: ProviderOverviewCardCopy & { tone: ProviderDeploymentRecommendationTone };
  blocker: ProviderOverviewCardCopy | null;
  operationalRisk: ProviderOverviewCardCopy | null;
  action: ProviderOverviewCardCopy & { ctaLabel: string; ctaHref: string };
  upcomingEngagement: ProviderOverviewUpcomingEngagement | null;
  readinessSteps: ProviderOverviewDeploymentStep[];
  status: ProviderOverviewCardCopy;
  statusPriorities: ProviderOverviewDeploymentStep[];
  /** Scannable priority cards — headline, why, next move */
  guidanceCards: ProviderOverviewGuidanceCard[];
  /** Primary CTA tied to blocker — resolution path to deploy */
  deploymentResolution: ProviderOverviewDeploymentResolution;
  /** High-confidence validated bullets (max 4) */
  confirmedSoFar: string[];
};

function deploymentStatusFromOperationalState(
  state: ProviderOverviewReadinessIndicator["state"],
): ProviderOverviewDeploymentStepStatus {
  if (
    state === "operationally_viable" ||
    state === "observation_ready" ||
    state === "evaluation_active" ||
    state === "adoption_building"
  ) {
    return "complete";
  }
  if (state === "partially_validated") {
    return "partial";
  }
  return "open";
}

function resolveSchedulingConfidence(
  contact: Record<string, unknown>,
): ProviderOverviewDeploymentStepStatus {
  const coordinator = intelligenceCaptureHasSignal(
    "provider_observation_coordinator_contact",
    String(contact.provider_observation_coordinator_contact ?? ""),
  );
  const cadence = intelligenceCaptureHasSignal(
    "provider_observation_cadence_preference",
    String(contact.provider_observation_cadence_preference ?? ""),
  );
  const bestDays = intelligenceCaptureHasSignal(
    "provider_observation_best_days_case_types",
    String(contact.provider_observation_best_days_case_types ?? ""),
  );

  if (coordinator && cadence && bestDays) return "complete";
  if (coordinator || cadence || bestDays) return "partial";
  return "open";
}

export function buildProviderOverviewDeploymentSteps(input: {
  readinessIndicators: ProviderOverviewReadinessIndicator[];
  contact: Record<string, unknown>;
}): ProviderOverviewDeploymentStep[] {
  const byId = new Map(input.readinessIndicators.map((i) => [i.id, i]));

  const steps: Array<{ id: string; label: string; indicator?: ProviderOverviewReadinessIndicator }> = [
    { id: "access", label: "Access", indicator: byId.get("observation_readiness") },
    { id: "workflow", label: "Workflow", indicator: byId.get("workflow_understanding") },
    { id: "relationship", label: "Relationship", indicator: byId.get("relationship_maturity") },
    { id: "commercial", label: "Commercial", indicator: byId.get("commercial_influence") },
    { id: "scheduling", label: "Scheduling" },
  ];

  return steps.map((step) => {
    if (step.id === "scheduling") {
      return { id: step.id, label: step.label, status: resolveSchedulingConfidence(input.contact) };
    }
    const indicator = step.indicator;
    const status = indicator
      ? deploymentStatusFromOperationalState(indicator.state)
      : ("open" as const);
    return { id: step.id, label: step.label, status };
  });
}

function buildCommandCardCopy(fieldTimeRisk: ProviderFieldTimeRisk): ProviderOverviewCardCopy & {
  tone: ProviderDeploymentRecommendationTone;
} {
  const state = fieldTimeRisk.state as ProviderFieldTimeRiskState;
  const protect = fieldTimeRisk.protectFieldTime;

  if (protect?.posture === "clear_to_deploy" || state === "efficient_field_target") {
    return {
      headline: "Good to deploy",
      support: "OR path looks workable — book the touch when ready",
      context: null,
      tone: "deploy",
    };
  }
  if (state === "high_wasted_field_risk" || protect?.posture === "hold_field_time") {
    return {
      headline: "Hold off for now",
      support: "Fix what's blocking you before you travel",
      context: null,
      tone: "hold",
    };
  }
  if (state === "requires_remote_validation_first") {
    return {
      headline: "Call first",
      support: "Confirm a few things by phone before you book OR time",
      context: null,
      tone: "caution",
    };
  }
  if (state === "worth_exploratory_visit") {
    return {
      headline: "Light touch only",
      support: "Worth a short visit — not a full deployment target yet",
      context: null,
      tone: "caution",
    };
  }

  const label = PROVIDER_FIELD_TIME_RISK_STATE_LABELS[state];
  return {
    headline: label ?? "Check before you go",
    support: "Confirm the picture before you commit field time",
    context: null,
    tone: "caution",
  };
}

function pickPrimaryBlocker(
  executionBlockers: CanonicalExecutionBlocker[],
  briefingOpenRisks: Array<{ label: string; dbKey: string; sectionId: ProviderIntelligenceSectionId }>,
): CanonicalExecutionBlocker | null {
  if (executionBlockers[0]) return executionBlockers[0];
  const first = briefingOpenRisks[0];
  if (!first) return null;
  return {
    id: `briefing:${first.dbKey}`,
    kind: "capture_before_deploy",
    headline: first.label,
    operationalImpact: "",
    resolveScan: "",
    sectionId: first.sectionId,
    dbKey: first.dbKey,
    severity: null,
  };
}

function pickOperationalRisk(
  fieldTimeRisk: ProviderFieldTimeRisk,
  blocker: CanonicalExecutionBlocker | null,
): string | null {
  const blockerHeadline = blocker?.headline ?? "";

  if (blocker?.dbKey) {
    const direct = overviewRiskFieldDescription({
      dbKey: blocker.dbKey,
      rawHeadline: blocker.headline,
    });
    if (direct && !textsShareOperationalConcept(direct, blockerHeadline)) {
      return scanLine(direct, 120);
    }
  }

  const topReducer = fieldTimeRisk.narrative?.reducers[0];
  if (topReducer?.dbKey) {
    const direct = overviewRiskFieldDescription({ dbKey: topReducer.dbKey });
    if (direct && !textsShareOperationalConcept(direct, blockerHeadline)) {
      return scanLine(direct, 120);
    }
  }

  const why = fieldTimeRisk.narrative?.whyFieldTimeFails?.trim();
  if (why && !textsShareOperationalConcept(why, blockerHeadline)) {
    return scanLine(why, 120);
  }

  const impact = blocker?.operationalConsequence?.summary ?? blocker?.operationalImpact;
  if (impact?.trim() && !textsShareOperationalConcept(impact, blockerHeadline)) {
    return scanLine(impact, 120);
  }

  return null;
}

function statusCardCopy(steps: ProviderOverviewDeploymentStep[]): ProviderOverviewCardCopy {
  const complete = steps.filter((s) => s.status === "complete").length;
  const open = steps.filter((s) => s.status === "open").length;
  if (complete === steps.length) {
    return { headline: "Ready to deploy", support: "Access, workflow, and scheduling look covered", context: null };
  }
  if (open > 0) {
    return {
      headline: `${open} item${open === 1 ? "" : "s"} still open`,
      support: `${complete} of ${steps.length} areas look solid`,
      context: null,
    };
  }
  return {
    headline: "Mostly ready",
    support: `${complete} of ${steps.length} areas look solid — confirm the rest live`,
    context: null,
  };
}

/** Up to 3 weakest steps for the status card */
function topStatusPriorities(steps: ProviderOverviewDeploymentStep[]): ProviderOverviewDeploymentStep[] {
  const rank = { open: 0, partial: 1, complete: 2 };
  return [...steps].sort((a, b) => rank[a.status] - rank[b.status]).slice(0, 3);
}

function toCardCopy(headline: string, support: string | null = null): ProviderOverviewCardCopy {
  return {
    headline: scanLine(headline, 72),
    support: support ? scanLine(support, 80) : null,
    context: null,
  };
}

/** @deprecated Alias — use ProviderDeploymentCockpitView */
export type ProviderOverviewCommandCenterView = ProviderDeploymentCockpitView;

export function buildProviderDeploymentCockpitView(input: {
  narrative: ProviderOverviewNarrative;
  contact: Record<string, unknown>;
  intelligenceHref: string;
  engagements?: ProviderEngagementSummary[];
}): ProviderDeploymentCockpitView {
  const { narrative, contact } = input;
  const { commandSummary, executionBlockers, nextStep } = narrative;
  const briefing = commandSummary.briefing;
  const fieldTimeRisk = commandSummary.fieldTimeRisk;

  const command = buildCommandCardCopy(fieldTimeRisk);

  const primaryBlocker = pickPrimaryBlocker(executionBlockers, briefing.openRisks);
  const blocker = primaryBlocker?.headline ? toCardCopy(primaryBlocker.headline, null) : null;

  const riskLine = pickOperationalRisk(fieldTimeRisk, primaryBlocker);
  const operationalRisk = riskLine ? toCardCopy(riskLine, null) : null;

  const readinessSteps = buildProviderOverviewDeploymentSteps({
    readinessIndicators: commandSummary.readinessIndicators,
    contact,
  });

  const actionSupport = scanLine(
    commandSummary.recommendedNextStepScan || briefing.nextFieldAction,
    80,
  );

  const mission = narrative.missionControl;
  let upcomingEngagement: ProviderOverviewUpcomingEngagement | null = null;
  if (mission.hasUpcomingEngagement && mission.engagement) {
    const eng = mission.engagement;
    upcomingEngagement = {
      headline: scanLine(eng.typeLabel, 48),
      whenLabel: scanLine(eng.whenLabel, 40),
      ctaLabel: mission.primaryCta.label,
      ctaHref: mission.primaryCta.href,
    };
  }

  const status = statusCardCopy(readinessSteps);

  const deploymentResolution = buildProviderOverviewDeploymentResolution({
    blocker: primaryBlocker,
    fieldTimeRisk,
    primaryAction: nextStep.primaryAction,
    contact,
    intelligenceHref: input.intelligenceHref,
  });

  const confirmedSoFar = buildProviderOverviewConfirmedSoFar({
    contact,
    commercialStage: narrative.commercialStage,
    engagements: input.engagements ?? [],
    fieldTimeRisk,
  });

  const guidanceCards = buildProviderOverviewGuidanceCards({
    blocker: primaryBlocker,
    operationalRiskLine: riskLine,
    action: {
      support: actionSupport,
      ctaLabel: deploymentResolution.ctaLabel,
      ctaHref: deploymentResolution.ctaHref,
    },
    upcoming: upcomingEngagement,
    status,
    readinessSteps,
    fieldTimeRisk,
    includeNextMoveCard: false,
  });

  return {
    command,
    blocker,
    operationalRisk,
    action: {
      headline: "Next best move",
      support: deploymentResolution.nextBestMove,
      context: deploymentResolution.whyItMatters,
      ctaLabel: deploymentResolution.ctaLabel,
      ctaHref: deploymentResolution.ctaHref,
    },
    upcomingEngagement,
    readinessSteps,
    status,
    statusPriorities: topStatusPriorities(readinessSteps),
    guidanceCards,
    deploymentResolution,
    confirmedSoFar,
  };
}

/** @deprecated Alias */
export const buildProviderOverviewCommandCenterView = buildProviderDeploymentCockpitView;
