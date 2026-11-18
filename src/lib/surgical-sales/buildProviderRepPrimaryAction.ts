import { OPPORTUNITY_UI } from "@/lib/sales/opportunityUiLabels";
import { normalizeSalesStage, pipelineStageAfter, salesStageLabel, type SalesStage } from "@/lib/sales/stages";
import { buildEngagementOpenHrefFromSummary } from "@/lib/surgical-sales/engagements/engagementWorkflowState";
import {
  isUpcomingEngagementStatus,
  sortUpcomingEngagements,
  type ProviderEngagementSummary,
} from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { pickActiveWorkflowEngagement } from "@/lib/surgical-sales/buildProviderEngagementWorkflowAction";
import { LOG_UPDATE_UI_ENABLED } from "@/lib/surgical-sales/logUpdateUx";
import {
  clinicalDiscoverySectionFromPlanning,
  type ProviderPlanningCompletion,
} from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  encouragesEngagementPreCallOnboarding,
  isEarlyDiscoveryRelationshipStage,
  normalizeProviderRelationshipStage,
} from "@/lib/surgical-sales/providerRelationshipStage";
import {
  operationalDocumentWorkflowLabel,
  operationalInProgressEngagementLabel,
  operationalIntelligenceRefreshLabel,
  operationalOpenEngagementLabel,
  operationalPrepareMeetingLabel,
  operationalFieldActionLabel,
  topOpenFieldDbKey,
} from "@/lib/surgical-sales/providerOperationalActionLabels";

export type ProviderRepPrimaryAction = {
  label: string;
  href: string;
  reason: string;
};

export type ProviderRepSecondaryAction = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
};

export type ProviderRepPrimaryActionInput = {
  providerId: string;
  relationshipStage?: string;
  newEngagementHref: string;
  intelligenceHref: string;
  createOpportunityHref?: string;
  contact?: Record<string, unknown>;
  engagements: ProviderEngagementSummary[];
  planning?: ProviderPlanningCompletion | null;
  cases?: Array<Record<string, unknown>>;
  opportunities?: Array<Record<string, unknown>>;
  activity_timeline?: Array<Record<string, unknown>>;
};

type ActionCandidate = ProviderRepPrimaryAction & { score: number };

const MS_PER_DAY = 86_400_000;

const ADVANCE_INITIATIVE_STAGES = new Set<SalesStage>([
  "evaluation_planned",
  "evaluation_active",
  "outcome_review",
  "preference_card_progress",
  "clinical_validation",
]);

const OBSERVATION_ENGAGEMENT_TYPES = new Set([
  "observation_request",
  "or_visit",
  "or_observation",
]);

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / MS_PER_DAY);
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((t - Date.now()) / MS_PER_DAY);
}

function engagementTimestamp(e: ProviderEngagementSummary): string | null {
  return e.updated_at || e.scheduled_at || (e.engagement_date ? `${e.engagement_date}T12:00:00` : null);
}

function engagementTypeHref(baseHref: string, engagementType: string): string {
  const u = new URL(baseHref, "http://local");
  u.searchParams.set("engagement_type", engagementType);
  return `${u.pathname}${u.search}`;
}

function clinicalIntelligenceHref(intelligenceHref: string): string {
  const u = new URL(intelligenceHref, "http://local");
  u.searchParams.set("planning_section", "clinical_workflow");
  return `${u.pathname}${u.search}`;
}

function sortByRecency(engagements: ProviderEngagementSummary[]): ProviderEngagementSummary[] {
  return [...engagements].sort((a, b) => {
    const ta = engagementTimestamp(a);
    const tb = engagementTimestamp(b);
    return new Date(tb || 0).getTime() - new Date(ta || 0).getTime();
  });
}

function lastCompletedEngagement(engagements: ProviderEngagementSummary[]): ProviderEngagementSummary | null {
  return (
    sortByRecency(engagements).find((e) => String(e.status || "").toLowerCase() === "completed") ?? null
  );
}

function lastTouchDays(
  engagements: ProviderEngagementSummary[],
  timeline: Array<Record<string, unknown>>,
): number | null {
  const engagementDays = sortByRecency(engagements)
    .map((e) => daysSince(engagementTimestamp(e)))
    .filter((d): d is number => d != null);
  const activityDays = [...timeline]
    .map((row) => daysSince(String(row.at ?? "")))
    .filter((d): d is number => d != null);
  const all = [...engagementDays, ...activityDays];
  if (all.length === 0) return null;
  return Math.min(...all);
}

function proceduralUnderstandingThin(input: {
  planning?: ProviderPlanningCompletion | null;
}): boolean {
  const planning = input.planning;
  if (!planning || planning.status === "not_started") return true;

  const clinical = clinicalDiscoverySectionFromPlanning(planning);
  if (!clinical || clinical.total === 0) return true;
  return clinical.percent < 40;
}

function pickAdvanceOpportunity(
  opportunities: Array<Record<string, unknown>>,
): { id: string; label: string; stage: SalesStage } | null {
  const ranked = opportunities
    .map((o) => ({
      id: String(o.id || ""),
      label: String(o.product_line || o.account_name || OPPORTUNITY_UI.fallbackRecordLabel).trim(),
      stage: normalizeSalesStage(String(o.stage || "")),
      updatedAt: String(o.updated_at || o.created_at || ""),
    }))
    .filter((o) => o.id && o.stage && ADVANCE_INITIATIVE_STAGES.has(o.stage))
    .sort((a, b) => {
      const stageRank: Record<string, number> = {
        evaluation_active: 5,
        outcome_review: 4,
        preference_card_progress: 4,
        evaluation_planned: 3,
        clinical_validation: 2,
      };
      const ra = stageRank[a.stage!] ?? 0;
      const rb = stageRank[b.stage!] ?? 0;
      if (rb !== ra) return rb - ra;
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });

  const top = ranked[0];
  if (!top?.stage) return null;
  return { id: top.id, label: top.label, stage: top.stage };
}

function hasObservationEngagement(engagements: ProviderEngagementSummary[]): boolean {
  return engagements.some((e) => OBSERVATION_ENGAGEMENT_TYPES.has(String(e.engagement_type || "").toLowerCase()));
}

function pickWinner(candidates: ActionCandidate[]): ProviderRepPrimaryAction {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  return { label: top.label, href: top.href, reason: top.reason };
}

function collectCandidates(input: ProviderRepPrimaryActionInput): ActionCandidate[] {
  const stage = normalizeProviderRelationshipStage(input.relationshipStage);
  const engagements = input.engagements || [];
  const cases = input.cases || [];
  const opportunities = input.opportunities || [];
  const timeline = input.activity_timeline || [];
  const planning = input.planning ?? null;
  const planningStatus = planning?.status ?? "not_started";

  const upcoming = sortUpcomingEngagements(engagements);
  const activeWorkflow = pickActiveWorkflowEngagement(engagements);
  const nextUpcoming = activeWorkflow ?? upcoming[0] ?? null;
  const lastCompleted = lastCompletedEngagement(engagements);
  const daysSinceCompleted = daysSince(lastCompleted ? engagementTimestamp(lastCompleted) : null);
  const daysSinceTouch = lastTouchDays(engagements, timeline);
  const completedCount = engagements.filter((e) => String(e.status || "").toLowerCase() === "completed").length;
  const clinicalThin = proceduralUnderstandingThin(input);
  const advanceOpp = pickAdvanceOpportunity(opportunities);
  const contact = input.contact ?? {};
  const candidates: ActionCandidate[] = [];

  const push = (candidate: ActionCandidate) => {
    candidates.push(candidate);
  };

  if (nextUpcoming) {
    const title = nextUpcoming.title?.trim() || nextUpcoming.engagement_type_label;
    const openHref = buildEngagementOpenHrefFromSummary(nextUpcoming);
    const whenLabel = nextUpcoming.scheduled_at || nextUpcoming.engagement_date ? "on the calendar" : "upcoming";

    if (
      nextUpcoming.status === "planned" &&
      nextUpcoming.briefing_status !== "not_planned" &&
      !nextUpcoming.pre_call_complete &&
      nextUpcoming.pre_call_total > 0
    ) {
      let score = 120;
      const daysUntil = daysSince(
        nextUpcoming.scheduled_at || (nextUpcoming.engagement_date ? `${nextUpcoming.engagement_date}T12:00:00` : null),
      );
      if (daysUntil != null && daysUntil <= 3) score += 8;
      if (!nextUpcoming.is_meeting_prepared && !nextUpcoming.prepared_at) score += 4;

      push({
        score,
        label: "Open",
        href: openHref,
        reason: `${title} is ${whenLabel} — finish pre-call prep before you walk in.`,
      });
    } else if (nextUpcoming.status === "in_progress") {
      push({
        score: 130,
        label: "Open",
        href: openHref,
        reason: `${title} is in progress — open the live workspace.`,
      });
    } else if (nextUpcoming.status === "planned") {
      push({
        score: 108,
        label: "Open",
        href: openHref,
        reason: `${title} is ${whenLabel} — open to prepare for this touch.`,
      });
    }
  }

  if (
    lastCompleted &&
    !nextUpcoming &&
    daysSinceCompleted != null &&
    daysSinceCompleted <= 14 &&
    stage !== "dormant"
  ) {
    const title = lastCompleted.title?.trim() || lastCompleted.engagement_type_label;
    const org = lastCompleted.organization_name?.trim();
    let score = 106;
    if (daysSinceCompleted <= 5) score += 6;
    if (clinicalThin) score += 3;

    push({
      score,
      label: "Follow up after recent engagement",
      href: engagementTypeHref(input.newEngagementHref, "follow_up"),
      reason: org
        ? `${title} at ${org} wrapped ${daysSinceCompleted === 0 ? "today" : `${daysSinceCompleted}d ago`} — log takeaways and schedule the next touch.`
        : `${title} wrapped ${daysSinceCompleted === 0 ? "today" : `${daysSinceCompleted}d ago`} — log takeaways and schedule the next touch.`,
    });
  }

  if (
    !nextUpcoming &&
    (isEarlyDiscoveryRelationshipStage(stage) ||
      (stage === "dormant" && (daysSinceTouch == null || daysSinceTouch > 30)))
  ) {
    const introHref = engagementTypeHref(input.newEngagementHref, "intro_call");
    let score = stage === "dormant" ? 98 : 100;
    if (engagements.length === 0) score += 6;
    if (encouragesEngagementPreCallOnboarding(stage)) score += 4;

    push({
      score,
      label: "Schedule intro call",
      href: introHref,
      reason:
        stage === "dormant"
          ? "Relationship has gone quiet — reopen with a focused intro call to rebuild context."
          : "Early discovery — schedule an intro conversation and assess observation openness first.",
    });
  }

  if (
    !nextUpcoming &&
    stage === "active_evaluation" &&
    cases.length === 0 &&
    completedCount === 0
  ) {
    push({
      score: 96,
      label: "Request OR observation",
      href: engagementTypeHref(input.newEngagementHref, "observation_request"),
      reason:
        "Evaluation is active — submit observation access or align the next field touch on the engagement.",
    });
  }

  if (
    !nextUpcoming &&
    completedCount > 0 &&
    !hasObservationEngagement(engagements) &&
    (stage === "active_evaluation" || stage === "active_relationship") &&
    !clinicalThin
  ) {
    push({
      score: 88,
      label: "Request OR observation",
      href: engagementTypeHref(input.newEngagementHref, "observation_request"),
      reason: "Intro touchpoints are in motion — formalize OR observation to validate workflow fit.",
    });
  }

  if (clinicalThin && (completedCount > 0 || planningStatus === "in_progress") && !nextUpcoming?.pre_call_complete) {
    let score = 90;
    if (stage === "active_evaluation") score += 4;
    const clinical = planning ? clinicalDiscoverySectionFromPlanning(planning) : null;
    const gap =
      clinical && clinical.total > 0
        ? `${clinical.filled}/${clinical.total} clinical fields`
        : "procedural workflow detail";

    push({
      score,
      label: operationalDocumentWorkflowLabel(),
      href: clinicalIntelligenceHref(input.intelligenceHref),
      reason: `Limited procedural understanding (${gap}) — document technique, volume, and OR workflow before the next visit.`,
    });
  }

  if (advanceOpp && !nextUpcoming) {
    const nextStage = pipelineStageAfter(advanceOpp.stage);
    push({
      score: 92,
      label: "Advance evaluation",
      href: `/portal/sales/opportunities/${encodeURIComponent(advanceOpp.id)}`,
      reason: nextStage
        ? `${advanceOpp.label} is in ${salesStageLabel(advanceOpp.stage)} — move toward ${salesStageLabel(nextStage)} after recent field signals.`
        : `${advanceOpp.label} needs a stage update while evaluation momentum is active.`,
    });
  }

  if (
    (planningStatus === "not_started" || planningStatus === "needs_update") &&
    !nextUpcoming &&
    engagements.length === 0
  ) {
    const topKey = topOpenFieldDbKey(contact);
    push({
      score: planningStatus === "needs_update" ? 84 : 78,
      label: topKey
        ? operationalFieldActionLabel(topKey)
        : "Confirm account understanding",
      href: input.intelligenceHref,
      reason:
        planningStatus === "needs_update"
          ? "Intelligence is stale — refresh procedure focus, vendors, and competitive context before scheduling field time."
          : "No documented intelligence yet — capture what matters before the first touch.",
    });
  } else if (planningStatus === "needs_update" && !nextUpcoming) {
    push({
      score: 80,
      label: operationalIntelligenceRefreshLabel(contact),
      href: input.intelligenceHref,
      reason: "Commercial picture needs a refresh — update intelligence before the next engagement.",
    });
  }

  if (
    completedCount > 0 &&
    opportunities.length === 0 &&
    input.createOpportunityHref &&
    (stage === "active_relationship" || stage === "established_customer" || stage === "active_evaluation")
  ) {
    push({
      score: 74,
      label: OPPORTUNITY_UI.createButtonShort,
      href: input.createOpportunityHref,
      reason: "Engagements are progressing but no evaluation is tied to this provider — link commercial momentum.",
    });
  }

  if (!nextUpcoming && candidates.length === 0) {
    let label = "Plan next engagement";
    let reason = "No upcoming engagements — schedule the next call, visit, or observation.";
    if (stage === "established_customer") {
      label = "Schedule expansion touch";
      reason = "Established customer with open capacity — plan the next case, training, or preference-card conversation.";
    } else if (stage === "active_relationship" && daysSinceTouch != null && daysSinceTouch > 21) {
      label = "Schedule follow-up touch";
      reason = `Last touch was ${daysSinceTouch}d ago — keep the relationship active on the calendar.`;
    } else if (clinicalThin) {
      reason = "Calendar is clear — pair the next visit with procedural workflow discovery.";
    }

    push({
      score: 62,
      label,
      href: input.newEngagementHref,
      reason,
    });
  }

  return candidates;
}

export function buildProviderRepPrimaryAction(input: ProviderRepPrimaryActionInput): ProviderRepPrimaryAction {
  const candidates = collectCandidates(input);
  if (candidates.length === 0) {
    return {
      label: "Plan next engagement",
      href: input.newEngagementHref,
      reason: "No upcoming engagements — schedule the next call, visit, or observation.",
    };
  }
  return pickWinner(candidates);
}

export function buildProviderRepSecondaryActions(input: {
  newEngagementHref: string;
  newCaseHref: string;
  createOpportunityHref: string;
  noteHref: string;
  intelligenceHref: string;
  onCaptureIntelligence: () => void;
  onManageSupport: () => void;
}): ProviderRepSecondaryAction[] {
  return [
    { id: "engagement", label: "New engagement", href: input.newEngagementHref },
    ...(LOG_UPDATE_UI_ENABLED
      ? [{ id: "capture", label: "Update account understanding", onClick: input.onCaptureIntelligence }]
      : []),
    { id: "case", label: "Add case", href: input.newCaseHref },
    { id: "opp", label: OPPORTUNITY_UI.createButtonShort, href: input.createOpportunityHref },
    { id: "note", label: "Quick note", href: input.noteHref },
    { id: "network", label: "Support network", onClick: input.onManageSupport },
    { id: "intelligence", label: "Full intelligence", href: input.intelligenceHref },
  ];
}
