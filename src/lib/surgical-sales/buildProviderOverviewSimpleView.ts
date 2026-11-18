/**
 * Provider overview — field briefing read model (mission control + operational snapshot).
 * Tactical meeting guidance lives on Field Briefing.
 */


import { buildProviderDeploymentCockpitView } from "@/lib/surgical-sales/buildProviderOverviewCommandCenterView";

import {
  buildProviderEngagementWorkflowAction,
  type ProviderEngagementWorkflowAction,
} from "@/lib/surgical-sales/buildProviderEngagementWorkflowAction";

import { buildProviderOverviewDeploymentResolution } from "@/lib/surgical-sales/buildProviderOverviewDeploymentResolution";

import type { ProviderOverviewNarrative } from "@/lib/surgical-sales/buildProviderOverviewNarrative";

import { overviewRiskTitle } from "@/lib/surgical-sales/providerOverviewRiskCopy";

import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

import {

  PROVIDER_FIELD_TIME_RISK_STATE_GUIDANCE,

  PROVIDER_FIELD_TIME_RISK_STATE_LABELS,

  type ProviderFieldTimeRiskState,

} from "@/lib/surgical-sales/providerFieldTimeRiskVocabulary";

import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { overviewScopeBulletLimit } from "@/lib/surgical-sales/buildProviderOverviewIntelligenceDensity";

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { hasCompletedIntroTouch } from "@/lib/surgical-sales/deriveProviderWorkflowRecommendation";

import {

  PROGRESSION_CONFIDENCE_TIER_LABELS,

  type ProviderProgressionConfidenceIndicator,

} from "@/lib/surgical-sales/buildProviderProgressionConfidence";

import type { ProviderOverviewReadinessIndicator } from "@/lib/surgical-sales/providerOverviewQualitativeReadiness";

import {
  overviewIndicatorBecauseLine,
  PROVIDER_OVERVIEW_OPERATIONAL_STATE_LABELS,
} from "@/lib/surgical-sales/providerOverviewQualitativeReadiness";
import { buildProviderIntelligenceScopeDisplay } from "@/lib/surgical-sales/buildProviderIntelligenceScopeDisplay";
import {
  buildProviderOperationalSnapshot,
  type ProviderOperationalSnapshot,
} from "@/lib/surgical-sales/buildProviderOperationalSnapshot";
import {
  buildProviderOverviewOperationalMemory,
  type ProviderOverviewOperationalMemory,
} from "@/lib/surgical-sales/buildProviderOverviewOperationalMemory";
import {
  buildProviderOverviewFieldReadiness,
  resolveProviderOverviewVisibilityLabel,
  type ProviderOverviewFieldReadiness,
} from "@/lib/surgical-sales/buildProviderOverviewFieldReadiness";
import {
  buildProviderOverviewTacticalPresentation,
  type ProviderOverviewTacticalPresentation,
} from "@/lib/surgical-sales/buildProviderOverviewTacticalPresentation";
import { PROVIDER_OVERVIEW_RECOMMENDED_ACTION_LINE_SPARSE } from "@/lib/surgical-sales/providerOverviewFieldBriefingVocabulary";
import {
  FIELD_OPS_PRIMARY_CTA,
  FIELD_OPS_SECONDARY_CTA,
  normalizeFieldOpsPrimaryCta,
  normalizeFieldOpsSecondaryCta,
} from "@/lib/surgical-sales/providerOverviewFieldOpsCta";
import {
  resolveProviderOverviewIntelligenceDensity,
  type ProviderOverviewIntelligenceDensity,
} from "@/lib/surgical-sales/buildProviderOverviewIntelligenceDensity";
import { PROVIDER_OVERVIEW_EARLY_DISCOVERY_SUMMARY } from "@/lib/surgical-sales/providerOverviewFieldBriefingVocabulary";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  combineVisibilityStates,
  operationalVisibilityStateLabel,
  overviewOperationalStateToVisibility,
  OPERATIONAL_VISIBILITY_BECAUSE_KICKER,
  OPERATIONAL_VISIBILITY_GUIDANCE,
} from "@/lib/surgical-sales/operationalVisibilityVocabulary";


export type ProviderOverviewSimpleStatus =

  | "hold_field_time"

  | "ready_to_observe"

  | "ready_to_evaluate"

  | "active_opportunity";



export const PROVIDER_OVERVIEW_SIMPLE_STATUS_LABELS: Record<ProviderOverviewSimpleStatus, string> = {

  hold_field_time: "Hold field time",

  ready_to_observe: "Ready to observe",

  ready_to_evaluate: "Ready to evaluate",

  active_opportunity: "Active opportunity",

};



export type ProviderOverviewSimpleBlocker = {

  headline: string;

  whyItMatters: string;

  ctaLabel: string;

  ctaHref: string;

};



export type ProviderOverviewDeploymentReadiness = {
  /** Aggregate visibility state — Early / Developing / Strong / Validated */
  visibilityState: import("@/lib/surgical-sales/operationalVisibilityVocabulary").OperationalVisibilityState;
  visibilityStateLabel: string;
  becauseLines: string[];
  becauseKicker: string;
  guidanceLine: string;
  label: string;
  scan: string;
  tone: "success" | "caution" | "warn" | "neutral";
};



export type ProviderOverviewInvestFieldTime = {

  answer: string;

  guidance: string;

  tone: ProviderOverviewSimpleStatus;

};



export type ProviderOverviewRecommendedNextAction = {

  headline: string;

  detail: string;

  ctaLabel: string;

  ctaHref: string;

  secondaryCtaLabel: string | null;

  secondaryCtaHref: string | null;

};



export const PROVIDER_OVERVIEW_OPERATIONAL_READINESS_LABELS: Record<
  ProviderOverviewSimpleStatus,
  string
> = {
  hold_field_time: operationalVisibilityStateLabel("developing"),
  ready_to_observe: operationalVisibilityStateLabel("strong"),
  ready_to_evaluate: operationalVisibilityStateLabel("strong"),
  active_opportunity: operationalVisibilityStateLabel("validated"),
};

export type ProviderOverviewSimpleView = {
  stageLabel: string;
  status: ProviderOverviewSimpleStatus;
  statusLabel: string;
  operationalReadinessLabel: string;
  tacticalSummary: string;
  explanation: string;
  intelligenceDensity: ProviderOverviewIntelligenceDensity;
  deploymentReadiness: ProviderOverviewDeploymentReadiness;
  fieldReadiness: ProviderOverviewFieldReadiness;
  operationalSnapshot: ProviderOperationalSnapshot;
  operationalMemory: ProviderOverviewOperationalMemory;
  /** @deprecated Prefer fieldReadiness — retained for tests and gradual migration */
  investFieldTime: ProviderOverviewInvestFieldTime;
  blocker: ProviderOverviewSimpleBlocker;
  strategicWarnings: string[];
  recommendedNextAction: ProviderOverviewRecommendedNextAction;
  /** One-line tactical guidance for the recommended-next-action card. */
  recommendedActionLine: string;
  visibilityLabel: string;
  missionFooter: string;
  tactical: ProviderOverviewTacticalPresentation;
  scopeDisplay: import("@/lib/surgical-sales/buildProviderIntelligenceScopeDisplay").ProviderIntelligenceScopeDisplay;
  currentWorkflowAction: ProviderEngagementWorkflowAction | null;
  briefingHref: string;
  intelligenceHref: string;
  activityHref: string;
};


function hasActiveOpportunity(opportunities?: Array<Record<string, unknown>>): boolean {

  return Boolean(

    opportunities?.some((o) => {

      const stage = String(o?.stage ?? "").toLowerCase();

      return stage && !["won", "lost", "closed_won", "closed_lost"].includes(stage);

    }),

  );

}



function resolveStatus(

  narrative: ProviderOverviewNarrative,

  cockpitTone: "deploy" | "hold" | "caution",

  opportunities?: Array<Record<string, unknown>>,

): { status: ProviderOverviewSimpleStatus; explanation: string } {

  const commercialStage = narrative.commercialStage;

  const mission = narrative.stageMission?.trim();



  if (commercialStage === "adoption" || hasActiveOpportunity(opportunities)) {

    return {

      status: "active_opportunity",

      explanation:

        mission ||

        "An evaluation or open prospect is in motion — keep execution tied to documented understanding.",

    };

  }



  if (commercialStage === "evaluation") {
    return {
      status: "ready_to_evaluate",
      explanation:
        mission || "Product fit and evaluation logistics are the focus — capture open items on the next touch.",
    };
  }


  const observationReady = narrative.commandSummary.readinessIndicators.some(

    (i) => i.state === "observation_ready",

  );



  if (cockpitTone === "deploy" || observationReady) {

    return {

      status: "ready_to_observe",

      explanation:

        mission || "OR access and scheduling look workable — plan observation before you commit more field days.",

    };

  }



  return {

    status: "hold_field_time",

    explanation:

      mission ||

      "Confirm access, scheduling, and workflow basics before you book OR time.",

  };

}



function resolveDeploymentReadiness(
  indicators: ProviderOverviewReadinessIndicator[],
  fieldTimeState: ProviderFieldTimeRiskState,
): ProviderOverviewDeploymentReadiness {
  const visibilityStates = indicators.map((i) => overviewOperationalStateToVisibility(i.state));
  const visibilityState = combineVisibilityStates(visibilityStates);
  const visibilityStateLabel = operationalVisibilityStateLabel(visibilityState);

  const becauseLines = indicators
    .map((i) => overviewIndicatorBecauseLine(i))
    .filter((line) => line.length > 2)
    .slice(0, 4);

  const observation = indicators.find((i) => i.id === "observation_readiness");
  const scan =
    observation?.context?.trim() ||
    PROVIDER_FIELD_TIME_RISK_STATE_GUIDANCE[fieldTimeState] ||
    "Map OR access and scheduling when you can — visibility guides the next move, not a hard gate.";

  let tone: ProviderOverviewDeploymentReadiness["tone"] = "neutral";
  if (visibilityState === "validated" || visibilityState === "strong") {
    tone = fieldTimeState === "high_wasted_field_risk" ? "caution" : "success";
  } else if (
    fieldTimeState === "high_wasted_field_risk" ||
    fieldTimeState === "requires_remote_validation_first"
  ) {
    tone = "warn";
  } else if (fieldTimeState === "worth_exploratory_visit" || visibilityState === "developing") {
    tone = "caution";
  }

  return {
    visibilityState,
    visibilityStateLabel,
    becauseLines,
    becauseKicker: OPERATIONAL_VISIBILITY_BECAUSE_KICKER,
    guidanceLine: OPERATIONAL_VISIBILITY_GUIDANCE,
    label: visibilityStateLabel,
    scan: scanLine(scan, 160),
    tone,
  };
}



function resolveInvestFieldTime(

  status: ProviderOverviewSimpleStatus,

  fieldTimeState: ProviderFieldTimeRiskState,

): ProviderOverviewInvestFieldTime {

  const stateLabel = PROVIDER_FIELD_TIME_RISK_STATE_LABELS[fieldTimeState];

  const guidance = PROVIDER_FIELD_TIME_RISK_STATE_GUIDANCE[fieldTimeState];



  if (status === "active_opportunity" || status === "ready_to_evaluate") {
    return {
      answer: "Ready to support live opportunity",
      guidance: scanLine(guidance, 140),
      tone: status,
    };
  }

  if (status === "ready_to_observe") {
    return {
      answer: "Observation pathway developing",
      guidance: scanLine(guidance, 140),
      tone: status,
    };
  }

  if (fieldTimeState === "worth_exploratory_visit") {
    return {
      answer: "Light touch recommended",
      guidance: scanLine(guidance, 140),
      tone: status,
    };
  }

  return {
    answer: "Early visibility — map access first",
    guidance: scanLine(stateLabel ? `${stateLabel}. ${guidance}` : guidance, 140),
    tone: status,
  };

}



function resolveBlocker(

  narrative: ProviderOverviewNarrative,

  contact: Record<string, unknown>,

  intelligenceHref: string,

): ProviderOverviewSimpleBlocker {

  const resolution = buildProviderOverviewDeploymentResolution({

    blocker: narrative.executionBlockers[0] ?? null,

    fieldTimeRisk: narrative.commandSummary.fieldTimeRisk,

    primaryAction: narrative.nextStep.primaryAction,

    contact,

    intelligenceHref,

  });



  const primary = narrative.executionBlockers[0];

  const headline = primary
    ? overviewRiskTitle({ dbKey: primary.dbKey, rawHeadline: primary.headline })
    : "No open items flagged yet";


  const whyFallback = narrative.commandSummary.fieldTimeRisk.narrative?.whyFieldTimeFails?.trim();

  const whyItMatters =

    resolution.whyItMatters ||

    (whyFallback

      ? scanLine(whyFallback, 140)

      : "Confirm access and workflow basics on your next touch.");


  return {

    headline: scanLine(headline, 56),

    whyItMatters: scanLine(whyItMatters, 160),

    ctaLabel: resolution.ctaLabel,

    ctaHref: resolution.ctaHref,

  };

}



function buildStrategicWarnings(narrative: ProviderOverviewNarrative): string[] {

  const seen = new Set<string>();

  const lines: string[] = [];

  const push = (line: string) => {

    const trimmed = scanLine(line, 120);

    if (!trimmed) return;

    const key = trimmed.toLowerCase();

    if (seen.has(key)) return;

    seen.add(key);

    lines.push(trimmed);

  };



  const fieldState = narrative.commandSummary.fieldTimeRisk.state;

  if (

    fieldState === "high_wasted_field_risk" ||

    fieldState === "requires_remote_validation_first"

  ) {

    push(PROVIDER_FIELD_TIME_RISK_STATE_GUIDANCE[fieldState]);

  }



  for (const indicator of narrative.commandSummary.progressionConfidence) {

    if (indicator.confidence === "emerging" || indicator.confidence === "low") {

      push(

        `${indicator.label}: ${PROGRESSION_CONFIDENCE_TIER_LABELS[indicator.confidence]} — ${indicator.scan}`,

      );

    }

  }



  for (const blocker of narrative.executionBlockers.slice(1, 3)) {

    push(overviewRiskTitle({ dbKey: blocker.dbKey, rawHeadline: blocker.headline }));

  }



  const protect = narrative.commandSummary.fieldTimeRisk.protectFieldTime;

  for (const headline of protect?.blockerHeadlines ?? []) {

    push(headline);

  }



  return lines.slice(0, 4);

}



function isPrepareHref(href: string): boolean {

  return /\/prepare\b/.test(href);

}



function resolveRecommendedActionLine(input: {
  density: ProviderOverviewIntelligenceDensity;
  explanation: string;
  workflow: ProviderEngagementWorkflowAction | null;
}): string {
  if (input.workflow?.detail?.trim()) {
    return scanLine(input.workflow.detail, 100);
  }
  if (input.density === "sparse") {
    return PROVIDER_OVERVIEW_RECOMMENDED_ACTION_LINE_SPARSE;
  }
  const line = input.explanation.trim();
  if (!line) return PROVIDER_OVERVIEW_RECOMMENDED_ACTION_LINE_SPARSE;
  return scanLine(line, 100);
}

function resolveRecommendedNextAction(input: {
  narrative: ProviderOverviewNarrative;
  briefingHref: string;
  newEngagementHref: string;
  workflow: ProviderEngagementWorkflowAction | null;
  engagements?: ProviderEngagementSummary[];
}): ProviderOverviewRecommendedNextAction {
  const { narrative, briefingHref, newEngagementHref, workflow, engagements } = input;
  const primary = narrative.nextStep.primaryAction;

  if (workflow) {
    const hasUpcoming = narrative.missionControl.hasUpcomingEngagement;
    const introCompleted = hasCompletedIntroTouch(engagements);
    return {
      headline: workflow.headline,
      detail: workflow.detail ?? "",
      ctaLabel: normalizeFieldOpsPrimaryCta(workflow.ctaLabel),
      ctaHref: workflow.ctaHref,
      secondaryCtaLabel:
        hasUpcoming || introCompleted
          ? null
          : normalizeFieldOpsSecondaryCta(FIELD_OPS_PRIMARY_CTA.scheduleIntroCall),
      secondaryCtaHref: hasUpcoming || introCompleted ? null : newEngagementHref,
    };
  }

  const headline = scanLine(primary.reason || narrative.stageMission || "", 72);
  const detail = "";

  const useBriefing = isPrepareHref(primary.href);
  const ctaHref = useBriefing ? briefingHref : primary.href;
  const ctaLabel = useBriefing
    ? FIELD_OPS_SECONDARY_CTA.openFieldBriefing
    : normalizeFieldOpsPrimaryCta(primary.label);

  const hasUpcoming = narrative.missionControl.hasUpcomingEngagement;
  const introCompleted = hasCompletedIntroTouch(engagements);
  const secondaryCtaLabel =
    hasUpcoming || introCompleted
      ? null
      : normalizeFieldOpsSecondaryCta(FIELD_OPS_PRIMARY_CTA.scheduleIntroCall);
  const secondaryCtaHref = hasUpcoming || introCompleted ? null : newEngagementHref;

  return {
    headline,
    detail,
    ctaLabel,
    ctaHref,
    secondaryCtaLabel,
    secondaryCtaHref,
  };
}



function resolveTacticalSummary(input: {
  density: ProviderOverviewIntelligenceDensity;
  commercialStage: ProviderCommercialWorkflowStage;
  workflow: ProviderEngagementWorkflowAction | null;
  recommendedHeadline: string;
  explanation: string;
}): string {
  if (input.workflow?.headline?.trim()) {
    return scanLine(input.workflow.headline, 140);
  }
  if (input.density === "sparse" && input.commercialStage === "early_discovery") {
    return PROVIDER_OVERVIEW_EARLY_DISCOVERY_SUMMARY;
  }
  const headline = input.recommendedHeadline?.trim();
  if (headline) return scanLine(headline, 140);
  return scanLine(input.explanation, 140);
}

export function buildProviderOverviewSimpleView(input: {
  narrative: ProviderOverviewNarrative;
  contact: Record<string, unknown>;
  providerId: string;
  intelligenceHref: string;
  briefingHref: string;
  newEngagementHref: string;
  activityHref: string;
  timeline?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  planning?: ProviderPlanningCompletion | null;
  organizationName?: string | null;
  organizationBaseline?: OrganizationIntelligenceBaseline | null;
}): ProviderOverviewSimpleView {
  const { narrative, contact, intelligenceHref, briefingHref, newEngagementHref, activityHref } =

    input;



  const cockpit = buildProviderDeploymentCockpitView({

    narrative,

    contact,

    intelligenceHref,

    engagements: input.engagements,

  });



  const { status, explanation } = resolveStatus(narrative, cockpit.command.tone, input.opportunities);

  const fieldTimeState = narrative.commandSummary.fieldTimeRisk.state;

  const currentWorkflowAction = buildProviderEngagementWorkflowAction({
    engagements: input.engagements,
    briefingHref,
    fallbackAction: narrative.nextStep.primaryAction,
  });

  const recommendedNextAction = resolveRecommendedNextAction({
    narrative,
    briefingHref,
    newEngagementHref,
    workflow: currentWorkflowAction,
    engagements: input.engagements,
  });

  const deploymentReadiness = resolveDeploymentReadiness(
    narrative.commandSummary.readinessIndicators,
    fieldTimeState,
  );

  const intelligenceDensity = resolveProviderOverviewIntelligenceDensity({
    contact,
    engagements: input.engagements,
    cases: input.cases,
    planning: input.planning,
  });

  const tacticalSummary = resolveTacticalSummary({
    density: intelligenceDensity,
    commercialStage: narrative.commercialStage,
    workflow: currentWorkflowAction,
    recommendedHeadline: recommendedNextAction.headline,
    explanation,
  });

  const scopeDisplay = buildProviderIntelligenceScopeDisplay({
    contact,
    organizationName: input.organizationName,
    providerName: undefined,
    organizationBaseline: input.organizationBaseline,
    maxBulletsPerPanel: overviewScopeBulletLimit(intelligenceDensity),
  });

  const nextStepLabel = normalizeFieldOpsPrimaryCta(
    currentWorkflowAction?.ctaLabel ||
      recommendedNextAction.ctaLabel ||
      FIELD_OPS_PRIMARY_CTA.scheduleIntroCall,
  );

  const fieldReadiness = buildProviderOverviewFieldReadiness({
    status,
    fieldTimeState,
    visibilityState: deploymentReadiness.visibilityState,
    density: intelligenceDensity,
  });

  const visibilityLabel = resolveProviderOverviewVisibilityLabel({
    visibilityState: deploymentReadiness.visibilityState,
    density: intelligenceDensity,
    commercialStage: narrative.commercialStage,
    status,
  });

  const openItemCount =
    scopeDisplay.facility.bullets.filter((b) => b.state === "gap").length +
    scopeDisplay.provider.bullets.filter((b) => b.state === "gap").length;

  const operationalSnapshot = buildProviderOperationalSnapshot({
    scope: scopeDisplay,
    density: intelligenceDensity,
    suggestedNextStep: nextStepLabel,
    organizationLinked: Boolean(
      input.organizationName?.trim() || contact.organization_id || contact.account_id,
    ),
    contact,
    fieldReadiness,
    maturityLabel: visibilityLabel,
    openItemCount,
    activityTimeline: input.timeline,
    engagements: input.engagements,
    cases: input.cases,
  });

  const recommendedActionLine = resolveRecommendedActionLine({
    density: intelligenceDensity,
    explanation,
    workflow: currentWorkflowAction,
  });

  const missionFooter =
    intelligenceDensity === "sparse"
      ? fieldReadiness.hint
      : scanLine(fieldReadiness.hint, 80);

  const strategicWarnings =
    intelligenceDensity === "grounded" ? buildStrategicWarnings(narrative) : [];

  const operationalMemory = buildProviderOverviewOperationalMemory({
    contact,
    scope: scopeDisplay,
    density: intelligenceDensity,
    providerId: input.providerId,
    activityTimeline: input.timeline,
    engagements: input.engagements,
    briefingFreshness: operationalSnapshot.briefingFreshness,
  });

  const tactical = buildProviderOverviewTacticalPresentation({
    view: {
      stageLabel: narrative.stageLabel,
      status,
      statusLabel: PROVIDER_OVERVIEW_SIMPLE_STATUS_LABELS[status],
      operationalReadinessLabel: visibilityLabel,
      tacticalSummary,
      explanation: scanLine(explanation, 200),
      intelligenceDensity,
      deploymentReadiness,
      fieldReadiness,
      visibilityLabel,
      missionFooter,
      operationalSnapshot,
      investFieldTime: resolveInvestFieldTime(status, fieldTimeState),
      blocker: resolveBlocker(narrative, contact, intelligenceHref),
      strategicWarnings,
      recommendedNextAction,
      recommendedActionLine,
      currentWorkflowAction,
      briefingHref,
      intelligenceHref,
      activityHref,
    },
    narrative,
    scope: scopeDisplay,
    contact,
    activityTimeline: input.timeline,
    engagements: input.engagements,
    cases: input.cases,
    organizationLinked: Boolean(
      input.organizationName?.trim() || contact.organization_id || contact.account_id,
    ),
  });

  return {
    stageLabel: narrative.stageLabel,
    status,
    statusLabel: PROVIDER_OVERVIEW_SIMPLE_STATUS_LABELS[status],
    operationalReadinessLabel: visibilityLabel,
    tacticalSummary,
    explanation: scanLine(explanation, 200),
    intelligenceDensity,
    deploymentReadiness,
    fieldReadiness,
    visibilityLabel,
    missionFooter,
    tactical,
    scopeDisplay,
    operationalSnapshot,
    operationalMemory,
    investFieldTime: resolveInvestFieldTime(status, fieldTimeState),
    blocker: resolveBlocker(narrative, contact, intelligenceHref),
    strategicWarnings,
    recommendedNextAction,
    recommendedActionLine,
    currentWorkflowAction,
    briefingHref,
    intelligenceHref,
    activityHref,
  };
}


/** @deprecated Use ProviderOverviewSimpleView */

export type ProviderOverviewSimple = ProviderOverviewSimpleView;

