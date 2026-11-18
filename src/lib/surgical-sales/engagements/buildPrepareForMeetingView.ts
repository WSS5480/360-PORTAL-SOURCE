import { formatEngagementActivityType } from "@/lib/surgical-sales/engagements/engagementActivityLabels";
import { formatEngagementStatus, formatEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import { buildProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import {
  buildPrepareOutcomeCaptureContext,
  type PrepareOutcomeCaptureContext,
} from "@/lib/surgical-sales/engagements/prepareOutcomeCaptureContext";
import {
  buildIntelligenceCaptureScopeFromEngagement,
  type IntelligenceCaptureScope,
} from "@/lib/surgical-sales/intelligenceCapture/intelligenceCaptureScope";
import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import { salesStageLabel } from "@/lib/sales/stages";
import {
  buildPrepareAtAGlanceStats,
  type PrepareAtAGlanceMetrics,
  type PrepareAtAGlanceStat,
} from "@/lib/surgical-sales/engagements/prepareForMeetingGlanceMetrics";
import {
  buildPrepareKnownIntelligence,
  type PrepareKnownIntelligence,
} from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import type { PrepareRecentActivityFeed } from "@/lib/surgical-sales/engagements/prepareForMeetingRecentActivity";
import { formatEngagementWhenLabel } from "@/lib/surgical-sales/engagements/engagementScheduleDisplay";
import {
  buildEngagementPreparationStatus,
  type EngagementPreparationStatus,
} from "@/lib/surgical-sales/engagements/markEngagementPrepared";
import {
  buildPrepareRecommendedNextActions,
  type PrepareRecommendedNextActions,
} from "@/lib/surgical-sales/engagements/prepareForMeetingRecommendedNextAction";
import {
  buildPrepareRisksBarriers,
  type PrepareRisksBarriers,
} from "@/lib/surgical-sales/engagements/prepareForMeetingRisksBarriers";
import {
  buildPrepareSuggestedGoal,
  type PrepareSuggestedGoal,
} from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedGoal";
import {
  buildPrepareSuggestedTalkingPoints,
  type PrepareSuggestedTalkingPoints,
} from "@/lib/surgical-sales/engagements/prepareForMeetingTalkingPoints";
import { buildPrepareSuggestedDiscovery } from "@/lib/surgical-sales/engagements/prepareForMeetingSuggestedDiscovery";
import { resolveEngagementPreparationContextState } from "@/lib/surgical-sales/engagements/engagementPreparationContextState";
import { resolvePrepGenerationFlags } from "@/lib/surgical-sales/engagements/engagementDominantPrepMode";
import { harmonizePrepareMeetingPrepSections } from "@/lib/surgical-sales/engagements/prepareMeetingPrepHarmonize";
import {
  buildPrepareWhatMattersMost,
  type PrepareWhatMattersMost,
} from "@/lib/surgical-sales/engagements/buildPrepareWhatMattersMost";
import type { PrepareTodayPlanFields } from "@/lib/surgical-sales/engagements/prepareWhatMattersEditable";
import {
  bootstrapTacticalAsksFromProbes,
  type PrepareTacticalAsk,
} from "@/lib/surgical-sales/engagements/prepareTacticalAsks";
import { bootstrapIntroCallPathwayTacticalAsks } from "@/lib/surgical-sales/engagements/introCallPathwayMission";
import { readStartMissionSnapshot } from "@/lib/surgical-sales/engagements/startMissionSnapshot";
import {
  isPreCallPlanProductLine,
  type PreCallPlanProductLine,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";
import { buildProviderOverviewHref } from "@/lib/surgical-sales/engagements/engagementCreateWizard";
import type { ProviderDebriefPlan } from "@/lib/surgical-sales/engagements/providerDebriefPlanTypes";
import { isProviderDebriefEngagement } from "@/lib/surgical-sales/engagements/providerDebriefEngagement";
import type { DebriefExecutionGuide } from "@/lib/surgical-sales/engagements/debriefExecutionGuideTypes";

export function formatPrepareRelationshipStatus(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim();
  if (!s || s === "unknown") return null;
  if (s === "strong") return "Strong";
  if (s === "medium") return "Developing";
  if (s === "weak") return "Early";
  return s.replace(/_/g, " ");
}

export function formatPrepareInfluenceLevel(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim();
  if (!s || s === "unknown") return null;
  const map: Record<string, string> = {
    decision_maker: "Decision maker",
    influencer: "Influencer",
    gatekeeper: "Gatekeeper",
  };
  return map[s] ?? s.replace(/_/g, " ");
}

export type PrepareOfficeVisitContextLine = {
  label: string;
  value: string;
};

/** Combined date/time line for prepare upcoming card. */
export function formatPrepareEngagementDatetime(row: Record<string, unknown>): string | null {
  const scheduled = trimOrNull(row.scheduled_at);
  const dateOnly = trimOrNull(row.engagement_date);
  const label = formatEngagementWhenLabel({
    engagement_date: dateOnly,
    scheduled_at: scheduled,
  });
  if (label.endsWith("Date TBD")) return null;
  return label;
}

export function buildPrepareOfficeVisitContext(
  engagement: Record<string, unknown>,
): { is_office_visit_360: boolean; lines: PrepareOfficeVisitContextLine[] } | null {
  const type = String(engagement.engagement_type ?? "").trim();
  if (type !== "office_visit_360") return null;

  const candidates: Array<{ label: string; key: string }> = [
    { label: "Sim lab focus", key: "sim_lab_focus" },
    { label: "Products to demo", key: "products_to_demonstrate" },
    { label: "Attendees", key: "attendees" },
    { label: "Hands-on goals", key: "hands_on_goals" },
  ];

  const lines: PrepareOfficeVisitContextLine[] = [];
  const objective = trimOrNull(engagement.observation_goal);
  if (objective) lines.push({ label: "Visit objective", value: objective });

  for (const c of candidates) {
    const value = trimOrNull(engagement[c.key]);
    if (value) lines.push({ label: c.label, value });
  }

  return { is_office_visit_360: true, lines };
}

export function formatPrepareLocationLabel(parts: {
  city?: string | null;
  state?: string | null;
  preferredHospital?: string | null;
}): string | null {
  const city = String(parts.city ?? "").trim();
  const state = String(parts.state ?? "").trim();
  const metro =
    city && state ? `${city}, ${state}` : city || state || "";
  const hospital = String(parts.preferredHospital ?? "").trim();
  if (metro && hospital) return `${metro} · ${hospital}`;
  if (metro) return metro;
  if (hospital) return hospital;
  return null;
}

export type PrepareForMeetingSectionItem = {
  label: string;
  value: string;
};

export type PrepareProviderDebriefBriefing = {
  is_provider_debrief: boolean;
  plan_mode: "generic" | "intelligence";
  completed_observation_count: number;
  plan: ProviderDebriefPlan | null;
  linked_case_id: string | null;
  linked_case_href: string | null;
  missing_case_message: string | null;
};

export type PrepareForMeetingView = {
  engagement_id: string;
  provider_snapshot: {
    provider_id: string;
    display_name: string;
    specialty: string | null;
    organization_name: string | null;
    location_label: string | null;
    relationship_status_label: string | null;
    influence_level_label: string | null;
    last_engagement_date_label: string | null;
    last_engagement_title: string | null;
    last_engagement_href: string | null;
    support_contacts_summary: string | null;
  };
  upcoming_engagement: {
    title: string;
    engagement_type: string;
    type_label: string;
    status: string;
    status_label: string;
    datetime_label: string | null;
    organization_name: string | null;
    opportunity_label: string | null;
    opportunity_href: string | null;
    office_visit_context: { is_office_visit_360: boolean; lines: PrepareOfficeVisitContextLine[] } | null;
  };
  at_a_glance_stats: PrepareAtAGlanceStat[];
  known_intelligence: PrepareKnownIntelligence;
  recent_activity: PrepareRecentActivityFeed;
  suggested_talking_points: PrepareSuggestedTalkingPoints;
  suggested_goal: PrepareSuggestedGoal;
  risks_barriers: PrepareRisksBarriers;
  recommended_next_actions: PrepareRecommendedNextActions;
  what_matters_most: PrepareWhatMattersMost;
  plan_fields: PrepareTodayPlanFields;
  tactical_asks: PrepareTacticalAsk[];
  preparation: EngagementPreparationStatus;
  outcome: import("@/lib/surgical-sales/engagements/prepareOutcomeCaptureContext").PrepareOutcomeCaptureContext;
  edit_plan_href: string;
  provider_href: string | null;
  capture_scope: IntelligenceCaptureScope;
  /** Raw column value — preserves `start_mission` when merging debrief save. */
  debrief_intelligence_snapshot: unknown;
  provider_debrief_briefing: PrepareProviderDebriefBriefing;
  debrief_execution_guide: DebriefExecutionGuide | null;
  live_session: {
    live_notes: string;
    outcome_recorded: boolean;
    outcome_id: import("@/lib/surgical-sales/engagements/startMissionConfig").StartMissionOutcomeId | null;
    outcome_label: string | null;
  } | null;
};

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function splitBullets(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n|;|•|·/)
    .map((s) => s.replace(/^[-*]\s*/, "").trim())
    .filter((s) => s.length > 2)
    .slice(0, 8);
}

function formatEngagementDate(row: Record<string, unknown>): string | null {
  const date = trimOrNull(row.engagement_date);
  if (date) {
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  const scheduled = trimOrNull(row.scheduled_at);
  if (scheduled) {
    return new Date(scheduled).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return null;
}

function countStrategicPlanFilled(engagement: Record<string, unknown>): { filled: number; total: number } {
  const keys = [
    "observation_goal",
    "pre_observation_impact_opening_statement",
    "pre_observation_probes",
    "pre_observation_tools_resources",
    "pre_observation_value_hypothesis",
    "pre_observation_planned_close",
    "pre_observation_additional_notes",
  ];
  const total = keys.length;
  const filled = keys.filter((k) => trimOrNull(engagement[k])).length;
  return { filled, total };
}

export function buildPrepareForMeetingView(input: {
  engagement: Record<string, unknown>;
  provider: Record<string, unknown> | null;
  providerSpecialty: string | null;
  organization: { id?: string; name?: string } | null;
  opportunity: {
    id?: string;
    account_name?: string;
    physician_name?: string | null;
    stage?: string;
    product_line?: string | null;
  } | null;
  activities: Array<{
    id: string;
    activity_type?: string | null;
    body?: string | null;
    created_at?: string | null;
    metadata_json?: Record<string, unknown> | null;
  }>;
  providerTimeline?: Array<{
    id: string;
    at?: string | null;
    title?: string;
    body?: string;
    href?: string | null;
  }>;
  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[];
  planProgress?: { filled: number; total: number } | null;
  glanceMetrics?: PrepareAtAGlanceMetrics;
  recentActivity?: PrepareRecentActivityFeed;
  organizationLocation?: {
    city?: string | null;
    state?: string | null;
  } | null;
  providerOrgLink?: {
    influence_level?: string | null;
    preferred_hospital?: string | null;
  } | null;
  lastPriorEngagement?: {
    id: string;
    title?: string | null;
    engagement_type?: string | null;
    engagement_date?: string | null;
    scheduled_at?: string | null;
  } | null;
  providerDebriefBriefing?: PrepareProviderDebriefBriefing | null;
  debriefExecutionGuide?: DebriefExecutionGuide | null;
  supportContactsSummary?: string | null;
}): PrepareForMeetingView {
  const engagement = input.engagement;
  const engagementId = String(engagement.id);
  const provider = input.provider ?? {};
  const providerId = String(provider.id || engagement.provider_id || "");
  const displayName = trimOrNull(provider.display_name) || trimOrNull(provider.full_name) || "Provider";
  const snap = buildProviderIntelligenceSnapshot(provider, providerId);

  const typeLabel = formatEngagementType(String(engagement.engagement_type));
  const statusLabel = formatEngagementStatus(String(engagement.status));

  const oppStage = input.opportunity?.stage ? salesStageLabel(String(input.opportunity.stage)) : null;
  const oppName = trimOrNull(input.opportunity?.account_name);
  const opportunityLabel = oppName
    ? `${oppName}${oppStage ? ` · ${oppStage}` : ""}${input.opportunity?.product_line ? ` · ${input.opportunity.product_line}` : ""}`
    : null;

  const planProgress = input.planProgress ?? countStrategicPlanFilled(engagement);

  const at_a_glance_stats = input.glanceMetrics
    ? buildPrepareAtAGlanceStats(input.glanceMetrics)
    : buildPrepareAtAGlanceStats({
        engagement_count: 0,
        or_observation_count: 0,
        cases_supported_count: 0,
        active_opportunity_label: oppStage && input.opportunity?.product_line
          ? `${String(input.opportunity.product_line)} · ${oppStage}`
          : "—",
        active_opportunity_href: input.opportunity?.id
          ? `/portal/sales/opportunities/${encodeURIComponent(String(input.opportunity.id))}`
          : null,
      });

  const providerIdForIntel = String(provider.id || engagement.provider_id || "");
  const recent_activity: PrepareRecentActivityFeed = input.recentActivity ?? {
    items: [],
    timeline_href: providerIdForIntel
      ? `/portal/sales/providers/${encodeURIComponent(providerIdForIntel)}?tab=activity`
      : "/portal/sales/engagements",
  };

  const known_intelligence = buildPrepareKnownIntelligence({
    provider,
    snapshot: snap,
    providerTimeline: input.providerTimeline,
    engagementActivities: (input.activities || []).map((a) => {
      const body = trimOrNull(a.body);
      return {
        id: String(a.id),
        at: a.created_at ?? null,
        title: formatEngagementActivityType(a.activity_type),
        body: body ?? undefined,
      };
    }),
  });

  const engagementType = String(engagement.engagement_type ?? "");
  const isProviderDebrief = isProviderDebriefEngagement(engagementType);
  const provider_debrief_briefing: PrepareProviderDebriefBriefing = input.providerDebriefBriefing ?? {
    is_provider_debrief: isProviderDebrief,
    plan_mode: "generic",
    completed_observation_count: 0,
    plan: null,
    linked_case_id: trimOrNull(engagement.case_id),
    linked_case_href: trimOrNull(engagement.case_id)
      ? `/portal/sales/cases/${encodeURIComponent(String(engagement.case_id))}`
      : null,
    missing_case_message: null,
  };
  if (isProviderDebrief && !input.providerDebriefBriefing) {
    provider_debrief_briefing.is_provider_debrief = true;
  }

  const opportunityStage = input.opportunity?.stage ?? null;
  const productLineRaw = String(input.opportunity?.product_line ?? "")
    .split(/[,;|]/)[0]
    ?.trim();
  const productLine: PreCallPlanProductLine | "" = isPreCallPlanProductLine(productLineRaw)
    ? productLineRaw
    : "";
  const providerRelationshipStage = trimOrNull(
    provider.provider_relationship_stage ?? provider.relationship_stage,
  );

  const prepContextState = resolveEngagementPreparationContextState({
    engagementType,
    productLine,
    opportunityProductLine: productLine,
    opportunityId: input.opportunity?.id ?? null,
    opportunityStage,
    caseId: trimOrNull(engagement.case_id),
    providerRelationshipStage,
  });

  const dominantPrep = resolvePrepGenerationFlags({
    engagementType,
    productLine,
    providerSpecialty: input.providerSpecialty,
    prepContextState,
    opportunityStage,
    opportunityId: input.opportunity?.id ?? null,
    caseId: trimOrNull(engagement.case_id),
  });

  const suggestBase = {
    engagementType,
    providerSpecialty: input.providerSpecialty ?? null,
    productLine: dominantPrep.product_line || productLine,
    opportunityStage,
    providerRelationshipStage,
    knownIntelligence: known_intelligence,
    prepContextState,
    prepSpecializationTier: dominantPrep.product_prep_tier,
    intentionalProductFocus: dominantPrep.intentional_product_focus,
    dominantPrep,
    engagement,
  };

  const raw_talking_points = buildPrepareSuggestedTalkingPoints({
    specialty: input.providerSpecialty,
    engagementType,
    productLine,
    opportunityStage,
    knownIntelligence: known_intelligence,
    prepContextState,
    prepSpecializationTier: dominantPrep.product_prep_tier,
    intentionalProductFocus: dominantPrep.intentional_product_focus,
    dominantPrep,
    engagement,
  });

  const raw_goal = buildPrepareSuggestedGoal(suggestBase);

  const raw_discovery = buildPrepareSuggestedDiscovery(suggestBase);

  const raw_risks = buildPrepareRisksBarriers({
    provider,
    snapshot: snap,
    knownIntelligence: known_intelligence,
    opportunity: input.opportunity,
    engagement,
    lastPriorEngagement: input.lastPriorEngagement,
    engagementType,
  });

  const raw_next_actions = buildPrepareRecommendedNextActions({
    engagementId,
    engagementType,
    engagementStatus: String(engagement.status ?? "planned"),
    opportunity: input.opportunity,
    knownIntelligence: known_intelligence,
    risks: raw_risks,
    planProgress,
    orObservationCount: input.glanceMetrics?.or_observation_count,
  });

  const harmonized = harmonizePrepareMeetingPrepSections({
    engagementType,
    prepContextState,
    dominantPrep,
    intentionalProductFocus: dominantPrep.intentional_product_focus,
    productLine: dominantPrep.product_line || productLine,
    knownIntelligence: known_intelligence,
    suggested_goal: raw_goal,
    discovery_questions: raw_discovery.questions,
    suggested_talking_points: raw_talking_points,
    risks_barriers: raw_risks,
    recommended_next_actions: raw_next_actions,
  });

  const suggested_goal = harmonized.suggested_goal;
  const suggested_talking_points = harmonized.suggested_talking_points;
  const risks_barriers = harmonized.risks_barriers;
  const recommended_next_actions = harmonized.recommended_next_actions;

  const what_matters_most = buildPrepareWhatMattersMost({
    engagementType,
    opportunityStage,
    providerSpecialty: input.providerSpecialty,
    provider: input.provider,
    opportunity: input.opportunity,
    prepContextState,
    suggestedGoal: suggested_goal,
    talkingPoints: suggested_talking_points.points,
    risks: risks_barriers,
    nextActions: recommended_next_actions,
  });

  const influenceRaw =
    trimOrNull(input.providerOrgLink?.influence_level) || trimOrNull(provider.influence_level);
  const lastPrior = input.lastPriorEngagement;
  const lastPriorDateLabel = lastPrior
    ? formatEngagementDate(lastPrior as Record<string, unknown>)
    : null;
  const lastPriorType = lastPrior?.engagement_type
    ? formatEngagementType(String(lastPrior.engagement_type))
    : null;
  const lastPriorTitle =
    trimOrNull(lastPrior?.title) ||
    (lastPriorType ? `Last: ${lastPriorType}` : null);

  return {
    engagement_id: engagementId,
    provider_snapshot: {
      provider_id: providerId,
      display_name: displayName,
      specialty: input.providerSpecialty,
      organization_name: input.organization?.name ? String(input.organization.name) : null,
      location_label: formatPrepareLocationLabel({
        city: input.organizationLocation?.city,
        state: input.organizationLocation?.state,
        preferredHospital: input.providerOrgLink?.preferred_hospital,
      }),
      relationship_status_label: formatPrepareRelationshipStatus(
        trimOrNull(provider.relationship_strength),
      ),
      influence_level_label: formatPrepareInfluenceLevel(influenceRaw),
      last_engagement_date_label: lastPriorDateLabel,
      last_engagement_title: lastPriorTitle,
      last_engagement_href: lastPrior?.id
        ? `/portal/sales/engagements/${encodeURIComponent(String(lastPrior.id))}`
        : null,
      support_contacts_summary: trimOrNull(input.supportContactsSummary),
    },
    upcoming_engagement: {
      title: trimOrNull(engagement.title) || typeLabel,
      engagement_type: String(engagement.engagement_type ?? ""),
      type_label: typeLabel,
      status: String(engagement.status ?? "planned").toLowerCase(),
      status_label: statusLabel,
      datetime_label: formatPrepareEngagementDatetime(engagement),
      organization_name: input.organization?.name ? String(input.organization.name) : null,
      opportunity_label: opportunityLabel,
      opportunity_href: input.opportunity?.id
        ? `/portal/sales/opportunities/${encodeURIComponent(String(input.opportunity.id))}`
        : null,
      office_visit_context: buildPrepareOfficeVisitContext(engagement),
    },
    at_a_glance_stats,
    known_intelligence,
    recent_activity,
    suggested_talking_points,
    suggested_goal,
    risks_barriers,
    recommended_next_actions,
    what_matters_most,
    plan_fields: {
      observation_goal: trimOrNull(engagement.observation_goal),
      pre_observation_probes: trimOrNull(engagement.pre_observation_probes),
      pre_observation_value_hypothesis: trimOrNull(engagement.pre_observation_value_hypothesis),
      pre_observation_planned_close: trimOrNull(engagement.pre_observation_planned_close),
      engagement_purpose: trimOrNull(engagement.engagement_purpose),
      next_action: trimOrNull(engagement.next_action),
    },
    tactical_asks:
      engagementType === "intro_call" && !dominantPrep.use_product_bundle
        ? bootstrapIntroCallPathwayTacticalAsks({
            stored: (engagement as { prepare_tactical_asks?: unknown }).prepare_tactical_asks,
            knownIntelligence: known_intelligence,
            probes: trimOrNull(engagement.pre_observation_probes),
          })
        : bootstrapTacticalAsksFromProbes({
            stored: (engagement as { prepare_tactical_asks?: unknown }).prepare_tactical_asks,
            probes: trimOrNull(engagement.pre_observation_probes),
            suggestedPoints: suggested_talking_points.points,
          }),
    preparation: buildEngagementPreparationStatus(engagement),
    outcome: buildPrepareOutcomeCaptureContext(engagement),
    edit_plan_href: `/portal/sales/engagements/${encodeURIComponent(engagementId)}`,
    provider_href: providerId ? buildProviderOverviewHref(providerId) : null,
    capture_scope: buildIntelligenceCaptureScopeFromEngagement({
      engagementId,
      providerId,
      organizationId: input.organization?.id ? String(input.organization.id) : null,
      providerLabel: displayName,
      organizationLabel: input.organization?.name ? String(input.organization.name) : null,
      engagementType: String(engagement.engagement_type ?? ""),
      productLine: trimOrNull(engagement.product_line),
      opportunityProductLine: input.opportunity?.product_line ?? null,
    }),
    debrief_intelligence_snapshot: engagement.debrief_intelligence_snapshot ?? null,
    provider_debrief_briefing,
    debrief_execution_guide: input.debriefExecutionGuide ?? null,
    live_session: (() => {
      const session = readStartMissionSnapshot(engagement.debrief_intelligence_snapshot);
      if (!session) return null;
      return {
        live_notes: session.live_notes,
        outcome_recorded: Boolean(session.outcome_recorded_at),
        outcome_id: session.outcome_id ?? null,
        outcome_label: session.outcome_label ?? null,
      };
    })(),
  };
}
