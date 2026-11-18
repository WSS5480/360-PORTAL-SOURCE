/**

 * Deterministic provider overview body — sales pathway execution layout.

 */



import type { ProviderOverviewNarrative } from "@/lib/surgical-sales/buildProviderOverviewNarrative";

import { buildProviderOverviewSimpleView } from "@/lib/surgical-sales/buildProviderOverviewSimpleView";

import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";

export { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";

import type { OperationalVisibilityState } from "@/lib/surgical-sales/operationalVisibilityVocabulary";

import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";

import { sanitizeLegacyIntelligenceUserCopy } from "@/lib/surgical-sales/legacyIntelligenceUserCopy";
import { sanitizeFieldFriendlyOverviewCopy } from "@/lib/surgical-sales/providerOverviewBriefingCopy";

import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

import { deriveSalesPathwayState, salesPathwayWorkspaceHref } from "@/lib/surgical-sales/deriveSalesPathwayState";
import {

  buildSalesPathwayRequirements,

  buildSalesPathwayTimeline,

  salesPathwayConfidenceLevel,

  salesPathwayProgressPercent,

  salesPathwayRiskLevel,

  SALES_PATHWAY_STAGE_LABELS,

  SALES_PATHWAY_STAGE_OBJECTIVES,

  type SalesPathwayStageId,

  type SalesPathwayTimelinePhase,

} from "@/lib/surgical-sales/providerSalesPathwayExecution";
import {
  buildProviderDiscoveryProgressView,
  type ProviderDiscoveryProgressView,
} from "@/lib/surgical-sales/buildProviderDiscoveryProgressView";

import {
  buildProviderOverviewPathwayRequirements,
  type ProviderOverviewRequirementItem,
} from "@/lib/surgical-sales/buildProviderOverviewPathwayRequirements";
import {
  buildProviderDiscoveryStageProgression,
  type ProviderOverviewDiscoveryProgressionModel,
} from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import {
  buildProviderOverviewTacticalHero,
  buildProviderOverviewTacticalProgression,
  buildProviderOverviewUpcomingTouch,
  resolveProviderOverviewWorkflowAction,
  type ProviderOverviewTacticalHeroModel,
  type ProviderOverviewTacticalProgressionModel,
  type ProviderOverviewUpcomingTouchModel,
} from "@/lib/surgical-sales/buildProviderOverviewTacticalLayout";
import type { ProviderEngagementWorkflowAction } from "@/lib/surgical-sales/buildProviderEngagementWorkflowAction";

import { buildProviderOverviewFieldIntelFeed } from "@/lib/surgical-sales/buildProviderOverviewFieldIntelFeed";

import type { ProviderOverviewFieldIntelFeedItem } from "@/lib/surgical-sales/buildProviderOverviewFieldIntelFeed";

import { buildProviderIntelligenceMaturitySnapshot } from "@/lib/surgical-sales/providerIntelligenceMaturity";

import {
  buildProviderEngagementTypeHref,
  discoveryPathwayStageObjective,
  resolveDiscoveryNextFieldAction,
  resolveDiscoveryStageDefaultDetail,
  resolveProviderDiscoveryMotionPhase,
  sanitizeDiscoveryNextFieldDetail,
} from "@/lib/surgical-sales/providerOverviewDiscoveryProgression";
import {
  buildProviderOverviewPriorityUnknowns,
  type ProviderOverviewPriorityUnknown,
} from "@/lib/surgical-sales/buildProviderOverviewPriorityUnknowns";
import { providerProfileFieldContext } from "@/lib/surgical-sales/backgroundIntelligenceSections";
import {
  buildProviderOverviewOperationalCommandWithEngagements,
  type ProviderOverviewOperationalCommandModel,
} from "@/lib/surgical-sales/buildProviderOverviewOperationalCommand";
import { providerHasFieldIntelligenceEvidence } from "@/lib/surgical-sales/providerFieldIntelligenceEvidence";
import { isProviderSalesCustomer } from "@/lib/surgical-sales/providerRelationshipStage";
import {
  buildProviderProfilePathwayNextAction,
  type ProviderPathwayNextActionView,
} from "@/lib/surgical-sales/buildProviderPathwayNextAction";
import {
  buildProviderEvaluationPathViewFromEngagements,
  type ProviderEvaluationPathView,
} from "@/lib/surgical-sales/buildProviderEvaluationPathView";
import {
  buildProviderCommitmentView,
  buildProviderOutcomesTrackingView,
  type ProviderCommitmentView,
  type ProviderOutcomesTrackingView,
} from "@/lib/surgical-sales/providerCommitmentOutcomes";
import {
  buildProviderObservationProgress,
  resolveNextObservationDateLabel,
  type ProviderObservationProgress,
} from "@/lib/surgical-sales/providerObservationProgress";



export const FIELD_COMMAND_DEFAULT_SUBTEXT =
  "Provider is receptive to observation. Scheduling coordination and credentialing process still need to be confirmed.";



export const VALIDATION_GROUP_LABELS = {

  needsValidation: "Still Validating",

  confirmed: "Confirmed",

  unknown: "Unknown",

} as const;



/** @deprecated Use VALIDATION_GROUP_LABELS.unknown */

export const VALIDATION_GROUP_LABELS_LEGACY = {

  ...VALIDATION_GROUP_LABELS,

  stillLearning: "Unknown",

} as const;



const BANNED_COPY_PATTERN =

  /blocker|critical|not viable|strategic warning|commercialization|commercial influence|field execution risk|should we invest|visibility risk/i;



/** Strip legacy dashboard / risk language from user-visible overview copy. */

export function sanitizeOverviewDisplayText(text: string): string {
  let t = sanitizeLegacyIntelligenceUserCopy(text.trim());
  if (!t) return "";
  if (/^needs validation$/i.test(t) || /^primary blockers?$/i.test(t)) {
    return VALIDATION_GROUP_LABELS.needsValidation;
  }
  t = t.replace(/\bcommercial influence\b/gi, "stakeholder influence");
  if (BANNED_COPY_PATTERN.test(t)) return "";
  return sanitizeFieldFriendlyOverviewCopy(t);
}



export type OverviewValidationGroup = {

  label: string;

  pills: string[];

};



/** @deprecated Legacy field command model — retained for gradual migration */

export type ProviderOverviewFieldCommandModel = {

  eyebrow: string;

  heading: string;

  subtext: string;

  stage: string;

  visibility: string;

  fieldConfidence: string;

  validationGroups: OverviewValidationGroup[];

  primaryCta: { label: string; href: string };

  secondaryCta: { label: string } | null;

};



export type ProviderOverviewPathwayStageModel = {

  stageId: SalesPathwayStageId;

  stageLabel: string;

  stageObjective: string;

  progressPercent: number;

  riskLevel: string;

  confidenceLevel: string;

  requirements: ProviderOverviewRequirementItem[];

  /** Discovery-only: advancement signal vs operational readiness (not stage gates). */
  discoveryProgression: ProviderOverviewDiscoveryProgressionModel | null;

  /** Discovery milestone checklist — why the provider remains in Discovery. */
  discoveryProgress: ProviderDiscoveryProgressView | null;

  /** Observation stage volume — completed procedures toward debrief threshold. */
  observationProgress: ProviderObservationProgress | null;

  /** Evaluation-only: active evaluation activity within the Evaluation stage. */
  evaluationPath: ProviderEvaluationPathView | null;

  commitment: ProviderCommitmentView | null;

  outcomesTracking: ProviderOutcomesTrackingView | null;

  /** Why the provider remains at this stage (strict gates — not sentiment or follow-up). */
  stageExplanation: string;

  /** Plain-language reason the next stage is locked, when applicable. */
  nextStageLockReason: string | null;

  /** True when engagements, cases, debriefs, or field notes exist on file. */
  hasFieldEvidence: boolean;

};



import {
  buildProviderOverviewWhatWeKnow,
  type ProviderOverviewWhatWeKnowItem,
  type ProviderOverviewWhatWeKnowModel,
} from "@/lib/surgical-sales/buildProviderOverviewWhatWeKnow";

export type { ProviderOverviewWhatWeKnowItem, ProviderOverviewWhatWeKnowModel };

export {
  WHAT_WE_KNOW_OPERATIONAL_CATEGORY,
  buildProviderOverviewWhatWeKnow,
  flattenWhatWeKnowLines,
  whatWeKnowItemLabels,
} from "@/lib/surgical-sales/buildProviderOverviewWhatWeKnow";



export type ProviderOverviewNextBestActionModel = {

  label: string;

  detail: string;

  href: string;

};



export type ProviderOverviewPathwayTimelineModel = {

  phases: SalesPathwayTimelinePhase[];

};



export type ProviderOverviewBodyModel = {

  pathwayStage: ProviderOverviewPathwayStageModel;

  whatWeKnow: ProviderOverviewWhatWeKnowModel;

  nextBestAction: ProviderOverviewNextBestActionModel;

  pathwayTimeline: ProviderOverviewPathwayTimelineModel;

  recentFieldIntel: ProviderOverviewFieldIntelFeedItem[];

  tacticalHero: ProviderOverviewTacticalHeroModel;

  tacticalProgression: ProviderOverviewTacticalProgressionModel;

  upcomingTouch: ProviderOverviewUpcomingTouchModel;

  workflowAction: ProviderEngagementWorkflowAction | null;

  completedObservationCount: number;

  /** Discovery stage — top 1–2 open questions for the action rail */
  priorityUnknowns: ProviderOverviewPriorityUnknown[];

  /** Canonical operational intelligence command summary (read-only). */
  operationalCommand: ProviderOverviewOperationalCommandModel;

  /** Explicit customer classification — hide sales pathway UI and coaching. */
  isSalesCustomer: boolean;

};

export type {
  ProviderOverviewTacticalHeroModel,
  ProviderOverviewTacticalProgressionModel,
  ProviderOverviewUpcomingTouchModel,
} from "@/lib/surgical-sales/buildProviderOverviewTacticalLayout";



/** @deprecated */

export type ProviderOverviewContextColumn = {

  title: string;

  subtext: string;

  bullets: string[];

};



/** @deprecated */

export type ProviderOverviewOperationalContextModel = {

  facility: ProviderOverviewContextColumn;

  provider: ProviderOverviewContextColumn;

};



/** @deprecated */

export type ProviderOverviewNextMoveItem = {

  title: string;

  purpose: string;

  actionLabel: string;

  href: string;

  kind: "schedule" | "log" | "briefing";

};



function fieldConfidenceLabel(visibilityState: OperationalVisibilityState): string {

  return salesPathwayConfidenceLevel(visibilityState);

}



function resolveSubtext(workflowDetail: string | undefined): string {

  const line = workflowDetail?.trim() ?? "";

  if (!line) return FIELD_COMMAND_DEFAULT_SUBTEXT;

  if (

    /visibility still forming|observation viability|not viable|blocker|strategic warning|commercial/i.test(

      line,

    )

  ) {

    return FIELD_COMMAND_DEFAULT_SUBTEXT;

  }

  if (line.length > 100) return FIELD_COMMAND_DEFAULT_SUBTEXT;

  return line.endsWith(".") ? line : `${line}.`;

}




function resolveProfilePathwayActionHref(
  action: ProviderPathwayNextActionView,
  newEngagementHref: string,
): string {
  if (action.ctaHref?.trim()) return action.ctaHref.trim();
  if (action.label === "Create Intro Call") {
    return buildProviderEngagementTypeHref(newEngagementHref, "intro_call");
  }
  if (
    action.label === "Create Access Follow-Up" ||
    action.label === "Start Access Follow-Up"
  ) {
    return buildProviderEngagementTypeHref(newEngagementHref, "follow_up");
  }
  return newEngagementHref;
}

function resolveNextBestActionDetail(
  subtext: string,
  stageId: SalesPathwayStageId,
  discoveryPhase: ReturnType<typeof resolveProviderDiscoveryMotionPhase>,
  contact: Record<string, unknown>,
): string {
  const sanitized = sanitizeDiscoveryNextFieldDetail(subtext, discoveryPhase);
  if (sanitized && sanitized !== FIELD_COMMAND_DEFAULT_SUBTEXT) return sanitized;

  const stageDefault = resolveDiscoveryStageDefaultDetail(stageId, discoveryPhase, contact);
  if (stageDefault) return stageDefault;

  switch (stageId) {
    case "discovery":
      return discoveryPathwayStageObjective(discoveryPhase);

    case "observe":

      return "Lock observation window and validate credentialing before OR day.";

    case "debrief":

      return "Capture what you learned and what unlocks the next stage.";

    case "evaluation":

      return "Align on evaluation path and schedule the next evaluation activity.";

    case "commitment":

      return "Prove preference-card path and champion support.";

    case "outcomes":

      return "Sustain rhythm and capture expansion signals.";

    default:

      return FIELD_COMMAND_DEFAULT_SUBTEXT;

  }

}



export function buildProviderOverviewBody(input: {

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

}): ProviderOverviewBodyModel {

  const isSalesCustomer = isProviderSalesCustomer(input.contact);

  const view = buildProviderOverviewSimpleView(input);

  const workflow = view.currentWorkflowAction;

  const visibilityState = view.deploymentReadiness.visibilityState;

  const fieldTimeState = input.narrative.commandSummary.fieldTimeRisk.state;



  const pathwayState = deriveSalesPathwayState({
    providerId: input.providerId,
    contact: input.contact,
    planning: input.planning,
    relationshipStage: String(input.contact.provider_relationship_stage || ""),
    engagements: input.engagements,
    opportunities: input.opportunities,
    cases: input.cases,
  });

  const stageId = pathwayState.currentStage;



  const maturity = buildProviderIntelligenceMaturitySnapshot({

    contact: input.contact,

    planning: input.planning,

    relationshipStage: String(input.contact.provider_relationship_stage || ""),

    opportunities: input.opportunities,

    cases: input.cases,

    engagements: input.engagements,

  });



  const pathwayRequirementsForProgress = buildSalesPathwayRequirements({

    contact: input.contact,

    planning: input.planning,

    relationshipStage: String(input.contact.provider_relationship_stage || ""),

    engagements: input.engagements,

    opportunities: input.opportunities,

    cases: input.cases,

    maturity,

  });

  const discoveryProgression =
    stageId === "discovery"
      ? buildProviderDiscoveryStageProgression({
          contact: input.contact,
          planning: input.planning,
          engagements: input.engagements,
          relationshipStage: String(input.contact.provider_relationship_stage || ""),
          opportunities: input.opportunities,
          cases: input.cases,
        })
      : null;

  const requirements =
    stageId === "discovery"
      ? []
      : buildProviderOverviewPathwayRequirements({
          contact: input.contact,
          planning: input.planning,
          relationshipStage: String(input.contact.provider_relationship_stage || ""),
          engagements: input.engagements,
          opportunities: input.opportunities,
          cases: input.cases,
        });

  const progressPercent =
    discoveryProgression?.progressPercent ??
    salesPathwayProgressPercent({
      requirements: pathwayRequirementsForProgress,
      maturity,
    });



  const actionLabel = workflow

    ? scanLine(workflow.ctaLabel, 48)

    : scanLine(view.recommendedNextAction.ctaLabel, 48);



  const subtext = resolveSubtext(workflow?.detail ?? view.recommendedNextAction.detail);

  const discoveryPhase = resolveProviderDiscoveryMotionPhase({
    contact: input.contact,
    engagements: input.engagements,
  });

  const hasFieldEvidence = providerHasFieldIntelligenceEvidence({
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
    activityTimeline: input.timeline,
  });

  const discoveryProgress =
    stageId === "discovery"
      ? buildProviderDiscoveryProgressView({
          contact: input.contact,
        })
      : null;

  const showEvaluationPath =
    stageId === "evaluation" || stageId === "commitment" || stageId === "outcomes";
  const evaluationPath = showEvaluationPath
    ? buildProviderEvaluationPathViewFromEngagements({
        contact: input.contact,
        engagements: input.engagements,
        linkedOpportunitiesCount: input.opportunities?.length ?? 0,
        observationCount: pathwayState.observedCaseCount,
        cases: input.cases,
      })
    : null;

  const commitment =
    stageId === "commitment" || stageId === "outcomes"
      ? buildProviderCommitmentView(input.contact)
      : null;
  const outcomesTracking =
    stageId === "outcomes"
      ? buildProviderOutcomesTrackingView(input.contact)
      : null;

  const pathwayStage: ProviderOverviewPathwayStageModel = {

    stageId,

    stageLabel: SALES_PATHWAY_STAGE_LABELS[stageId],

    stageObjective:
      stageId === "discovery"
        ? hasFieldEvidence
          ? discoveryPathwayStageObjective(discoveryPhase)
          : ""
        : SALES_PATHWAY_STAGE_OBJECTIVES[stageId],

    progressPercent,

    riskLevel: salesPathwayRiskLevel(fieldTimeState),

    confidenceLevel: fieldConfidenceLabel(visibilityState),

    requirements,

    discoveryProgression,

    discoveryProgress,

    observationProgress:
      stageId === "observe" || stageId === "debrief" || pathwayState.observedCaseCount > 0
        ? buildProviderObservationProgress(
            pathwayState.observedCaseCount,
            undefined,
            resolveNextObservationDateLabel({ engagements: input.engagements }),
          )
        : null,

    evaluationPath,

    commitment,

    outcomesTracking,

    stageExplanation: pathwayState.pathwayAdvancement.stageSummary,

    nextStageLockReason: pathwayState.pathwayAdvancement.blockedSummary,

    hasFieldEvidence,

  };



  const whatWeKnow = buildProviderOverviewWhatWeKnow({
    signalGroups: view.tactical.fieldSignalGroups,
    contact: input.contact,
    organizationName: input.organizationName,
    specialty: String(input.contact.specialty ?? "").trim() || null,
    discoveryPhase,
  });

  const completedObservationCount = pathwayState.observedCaseCount;

  const workflowAction = resolveProviderOverviewWorkflowAction({
    engagements: input.engagements,
    briefingHref: input.briefingHref,
    completedObservationCount,
    fallbackAction: {
      label: actionLabel,
      href: workflow?.ctaHref ?? view.recommendedNextAction.ctaHref,
    },
  });

  const pathwayWorkspaceHref = salesPathwayWorkspaceHref(input.providerId, stageId);

  const profilePathwayAction =
    stageId === "discovery"
      ? buildProviderProfilePathwayNextAction({
          contact: input.contact,
          providerId: input.providerId,
          pathwayStageId: stageId,
          engagements: input.engagements,
          cases: input.cases,
          linkedOpportunitiesCount: input.opportunities?.length ?? 0,
          observationCount: pathwayState.observedCaseCount,
        })
      : null;

  const resolvedNextBestAction =
    profilePathwayAction && stageId === "discovery"
      ? {
          label: scanLine(profilePathwayAction.label, 48),
          detail: sanitizeDiscoveryNextFieldDetail(subtext, discoveryPhase),
          href: resolveProfilePathwayActionHref(profilePathwayAction, input.newEngagementHref),
        }
      : resolveDiscoveryNextFieldAction({
          contact: input.contact,
          engagements: input.engagements,
          providerId: input.providerId,
          briefingHref: input.briefingHref,
          newEngagementHref: input.newEngagementHref,
          fallbackLabel:
            stageId === "discovery" ? actionLabel : scanLine(pathwayState.nextAction.label, 48),
          fallbackDetail:
            stageId === "discovery"
              ? resolveNextBestActionDetail(subtext, stageId, discoveryPhase, input.contact)
              : pathwayState.nextAction.detail,
          fallbackHref:
            stageId === "discovery"
              ? workflowAction?.ctaHref ?? workflow?.ctaHref ?? view.recommendedNextAction.ctaHref
              : pathwayWorkspaceHref,
          pathwayStageId: stageId,
        });

  const nextBestAction: ProviderOverviewNextBestActionModel =
    workflowAction &&
    (workflowAction.phase === "awaiting_debrief" || workflowAction.phase === "in_progress")
      ? {
          label: workflowAction.ctaLabel,
          detail:
            workflowAction.detail ??
            resolvedNextBestAction.detail ??
            "Capture outcome and field intelligence while details are fresh.",
          href: workflowAction.ctaHref,
        }
      : isSalesCustomer
        ? { label: "", detail: "", href: "" }
        : resolvedNextBestAction;



  const pathwayTimeline: ProviderOverviewPathwayTimelineModel = {

    phases: buildSalesPathwayTimeline(stageId),

  };



  const recentFieldIntel = buildProviderOverviewFieldIntelFeed({

    contact: input.contact,

    commercialStage: input.narrative.commercialStage,

    engagements: input.engagements,

    signalGroups: view.tactical.fieldSignalGroups,

    providerId: input.providerId,

  });

  const tacticalHero = buildProviderOverviewTacticalHero({
    pathway: pathwayStage,
    contact: input.contact,
    engagements: input.engagements,
    nextBestAction,
    briefingHref: input.briefingHref,
    newEngagementHref: input.newEngagementHref,
    workflow: workflowAction,
  });

  const tacticalProgression = buildProviderOverviewTacticalProgression({
    pathway: pathwayStage,
    contact: input.contact,
    fieldContext: providerProfileFieldContext({
      cases: input.cases,
      engagements: input.engagements,
    }),
  });

  const upcomingTouch = buildProviderOverviewUpcomingTouch({
    engagements: input.engagements,
    briefingHref: input.briefingHref,
    completedObservationCount,
  });

  const priorityUnknowns =
    !isSalesCustomer && stageId === "discovery" && hasFieldEvidence
      ? buildProviderOverviewPriorityUnknowns({
          contact: input.contact,
          engagements: input.engagements,
          cases: input.cases,
        })
      : [];

  const operationalCommand = buildProviderOverviewOperationalCommandWithEngagements({
    providerId: input.providerId,
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
  });

  return {

    pathwayStage,

    whatWeKnow,

    nextBestAction,

    pathwayTimeline,

    recentFieldIntel,

    tacticalHero,

    tacticalProgression,

    upcomingTouch,

    workflowAction,

    completedObservationCount,

    priorityUnknowns,

    operationalCommand,

    isSalesCustomer,

  };

}


