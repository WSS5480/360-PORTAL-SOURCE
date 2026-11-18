import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { normalizeSalesStage, pipelineStageAfter, type SalesStage } from "@/lib/sales/stages";
import { normalizeEngagementType, type EngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import { ENGAGEMENT_DETAIL_REFINE_PREP_LABEL } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import type { PrepareRisksBarriers } from "@/lib/surgical-sales/engagements/prepareForMeetingRisksBarriers";

export type PreparePrimaryCtaKind = "add_follow_up_task" | "open_engagement" | "update_opportunity";

export type PreparePrimaryCta = {
  kind: PreparePrimaryCtaKind;
  label: string;
  href: string;
};

export type PrepareRecommendedNextActions = {
  actions: string[];
  primary_cta: PreparePrimaryCta;
};

const ACTION = {
  scheduleObservation: "Schedule observation access with coordinator",
  schedule360: "Schedule 360 Experience for hands-on evaluation",
  sendClinicalStudy: "Send clinical study or heal-rate data",
  createFollowUpTask: "Create follow-up task with date and owner",
  askEvaluationCase: "Ask for product evaluation case",
  updateOpportunityStage: OPPORTUNITY_UI.updateInitiativeStageAfterDebrief,
  captureIntelligence: "Capture provider intelligence after meeting",
  documentWorkflow: "Document OR workflow and procedural friction points",
  qualifyObservation: "Qualify observation candidacy (volume + case profile)",
  mapAccessBarriers: "Map coordinator and access barriers for OR observation",
} as const;

const TYPE_ACTIONS: Partial<Record<EngagementType, string[]>> = {
  intro_call: [ACTION.captureIntelligence, ACTION.createFollowUpTask, ACTION.scheduleObservation],
  observation_request: [
    ACTION.scheduleObservation,
    ACTION.createFollowUpTask,
    ACTION.captureIntelligence,
    ACTION.askEvaluationCase,
  ],
  product_demo: [
    ACTION.askEvaluationCase,
    ACTION.updateOpportunityStage,
    ACTION.createFollowUpTask,
    ACTION.sendClinicalStudy,
  ],
  office_visit_360: [
    ACTION.schedule360,
    ACTION.createFollowUpTask,
    ACTION.captureIntelligence,
    ACTION.askEvaluationCase,
  ],
  follow_up: [
    ACTION.createFollowUpTask,
    ACTION.captureIntelligence,
    ACTION.sendClinicalStudy,
  ],
  post_case_follow_up: [
    ACTION.captureIntelligence,
    ACTION.updateOpportunityStage,
    ACTION.askEvaluationCase,
    ACTION.createFollowUpTask,
  ],
  or_visit: [
    ACTION.scheduleObservation,
    ACTION.captureIntelligence,
    ACTION.createFollowUpTask,
  ],
  in_service_training: [
    ACTION.createFollowUpTask,
    ACTION.askEvaluationCase,
    ACTION.captureIntelligence,
  ],
  evaluation_planning: [
    ACTION.askEvaluationCase,
    ACTION.updateOpportunityStage,
    ACTION.createFollowUpTask,
  ],
  evaluation_follow_up: [
    ACTION.updateOpportunityStage,
    ACTION.askEvaluationCase,
    ACTION.createFollowUpTask,
  ],
  preference_card_discussion: [
    ACTION.updateOpportunityStage,
    ACTION.createFollowUpTask,
    ACTION.captureIntelligence,
  ],
  reactivation: [
    ACTION.createFollowUpTask,
    ACTION.scheduleObservation,
    ACTION.captureIntelligence,
  ],
};

const STAGE_ACTIONS: Partial<Record<SalesStage, string[]>> = {
  discovery: [ACTION.scheduleObservation, ACTION.createFollowUpTask],
  clinical_validation: [ACTION.sendClinicalStudy, ACTION.askEvaluationCase],
  evaluation_planned: [ACTION.askEvaluationCase, ACTION.scheduleObservation],
  evaluation_active: [ACTION.askEvaluationCase, ACTION.updateOpportunityStage],
  outcome_review: [ACTION.sendClinicalStudy, ACTION.updateOpportunityStage],
  preference_card_progress: [ACTION.updateOpportunityStage, ACTION.createFollowUpTask],
};

function pushUnique(target: string[], item: string, max: number) {
  const t = item.trim();
  if (!t || target.length >= max) return;
  if (target.some((a) => a.toLowerCase() === t.toLowerCase())) return;
  target.push(t);
}

function hasRisk(risks: PrepareRisksBarriers, key: string): boolean {
  return risks.risks.some((r) => r.key === key);
}

function pickPrimaryCta(input: {
  engagementId: string;
  engagementType: string;
  engagementStatus: string;
  opportunityId: string | null;
  opportunityStage: string | null;
  risks: PrepareRisksBarriers;
  planProgress: { filled: number; total: number };
}): PreparePrimaryCta {
  const engagementHref = `/portal/sales/engagements/${encodeURIComponent(input.engagementId)}`;
  const type = normalizeEngagementType(input.engagementType);
  const stage = normalizeSalesStage(input.opportunityStage);
  const oppId = input.opportunityId;
  const planIncomplete =
    input.planProgress.total > 0 && input.planProgress.filled < input.planProgress.total;
  const status = input.engagementStatus.toLowerCase();

  const opportunityHref = oppId
    ? `/portal/sales/opportunities/${encodeURIComponent(oppId)}`
    : null;

  const wantsOpportunityUpdate =
    Boolean(oppId) &&
    (type === "post_case_follow_up" ||
      type === "evaluation_follow_up" ||
      type === "product_demo" ||
      type === "preference_card_discussion" ||
      hasRisk(input.risks, "evaluation_stalled") ||
      stage === "evaluation_active" ||
      stage === "outcome_review" ||
      stage === "preference_card_progress");

  if (wantsOpportunityUpdate && opportunityHref) {
    return {
      kind: "update_opportunity",
      label: "Update opportunity",
      href: opportunityHref,
    };
  }

  const wantsFollowUpTask =
    type === "follow_up" ||
    type === "post_case_follow_up" ||
    type === "evaluation_follow_up" ||
    type === "reactivation" ||
    type === "intro_call" ||
    hasRisk(input.risks, "follow_up_overdue");

  if (wantsFollowUpTask) {
    return {
      kind: "add_follow_up_task",
      label: "Add follow-up task",
      href: `${engagementHref}?focus=follow_up`,
    };
  }

  if (planIncomplete && (status === "planned" || status === "in_progress")) {
    return {
      kind: "open_engagement",
      label: ENGAGEMENT_DETAIL_REFINE_PREP_LABEL,
      href: `${engagementHref}?focus=pre_call`,
    };
  }

  return {
    kind: "open_engagement",
    label: "Open engagement",
    href: engagementHref,
  };
}

export function buildPrepareRecommendedNextActions(input: {
  engagementId: string;
  engagementType: string;
  engagementStatus: string;
  opportunity: { id?: string; stage?: string | null } | null;
  knownIntelligence: PrepareKnownIntelligence;
  risks: PrepareRisksBarriers;
  planProgress: { filled: number; total: number };
  orObservationCount?: number;
}): PrepareRecommendedNextActions {
  const max = 4;
  const actions: string[] = [];
  const type = normalizeEngagementType(input.engagementType);
  const stage = normalizeSalesStage(input.opportunity?.stage);

  if (type && TYPE_ACTIONS[type]) {
    for (const a of TYPE_ACTIONS[type]!) pushUnique(actions, a, max);
  }

  if (stage && STAGE_ACTIONS[stage]) {
    for (const a of STAGE_ACTIONS[stage]!) pushUnique(actions, a, max);
  }

  if (hasRisk(input.risks, "follow_up_overdue")) pushUnique(actions, ACTION.createFollowUpTask, max);
  if (hasRisk(input.risks, "evaluation_stalled")) {
    pushUnique(actions, ACTION.updateOpportunityStage, max);
    pushUnique(actions, ACTION.askEvaluationCase, max);
  }
  if (hasRisk(input.risks, "limited_or_access")) pushUnique(actions, ACTION.scheduleObservation, max);
  if (hasRisk(input.risks, "competitor_loyalty")) pushUnique(actions, ACTION.sendClinicalStudy, max);
  if (hasRisk(input.risks, "pricing_concern")) pushUnique(actions, ACTION.sendClinicalStudy, max);

  const intelText = input.knownIntelligence.bullets.map((b) => b.value).join(" ").toLowerCase();
  if (/committee|formulary|evidence|heal-?rate|study/i.test(intelText)) {
    pushUnique(actions, ACTION.sendClinicalStudy, max);
  }

  if (type === "intro_call" && (input.orObservationCount ?? 0) === 0) {
    pushUnique(actions, ACTION.scheduleObservation, max);
  }

  if (stage && pipelineStageAfter(stage) && !actions.includes(ACTION.updateOpportunityStage)) {
    pushUnique(actions, ACTION.updateOpportunityStage, max);
  }

  pushUnique(actions, ACTION.captureIntelligence, max);

  if (actions.length === 0) {
    pushUnique(actions, ACTION.createFollowUpTask, max);
    pushUnique(actions, ACTION.captureIntelligence, max);
  }

  const primary_cta = pickPrimaryCta({
    engagementId: input.engagementId,
    engagementType: input.engagementType,
    engagementStatus: input.engagementStatus,
    opportunityId: input.opportunity?.id ? String(input.opportunity.id) : null,
    opportunityStage: input.opportunity?.stage ?? null,
    risks: input.risks,
    planProgress: input.planProgress,
  });

  return { actions: actions.slice(0, max), primary_cta };
}
