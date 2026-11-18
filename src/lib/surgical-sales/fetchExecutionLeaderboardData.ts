import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchExecutionLeaderboardConfigOverrides } from "@/lib/surgical-sales/leaderboardConfigDb";
import { SALES_ORGANIZATIONS_TABLE } from "@/lib/surgical-sales/salesOrganizationTable";
import type { PartialExecutionLeaderboardConfig } from "@/lib/surgical-sales/executionLeaderboardConfig";
import {
  buildExecutionLeaderboard,
  emptyExecutionLeaderboardCounts,
  engagementCompletionYmd,
  isCompletedCaseStatus,
  isCompletedEngagementStatus,
  isDebriefCompleted,
  tsInYmdRange,
  type ExecutionLeaderboardCounts,
  type ExecutionLeaderboardResult,
} from "@/lib/surgical-sales/executionLeaderboardMetrics";
import { buildLeaderboardCategoryBoards } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import {
  computeRepAchievementBadges,
  nearestBadgeProgress,
  type EarnedAchievementBadge,
} from "@/lib/surgical-sales/executionAchievementBadges";
import {
  leaderboardPeriodBounds,
  leaderboardPriorPeriodBounds,
  resolveLeaderboardPeriodKey,
  type LeaderboardPeriodKey,
} from "@/lib/surgical-sales/leaderboardPeriod";
import {
  buildLeaderboardFilterOptions,
  entityMatchesTeamFilter,
  resolveLeaderboardTeamFilter,
  type LeaderboardFilterOptions,
  type LeaderboardTeamFilter,
} from "@/lib/surgical-sales/leaderboardTeamFilters";
import {
  engagementQualifiesForScore,
  observationRequestQualifiesForScore,
  type OpportunityScoreMeta,
} from "@/lib/surgical-sales/executionLeaderboardSafeguards";
import {
  countCompletedObservationsForProvider,
  isEvaluationEngagementType,
  LEADERBOARD_COMMITMENT_SECURED_EVENT_TYPES,
  LEADERBOARD_EVALUATION_STARTED_EVENT_TYPES,
  LEADERBOARD_OUTCOME_QTI_EVENT_TYPES,
  promotedFieldScoresCommitment,
  promotedFieldScoresOutcomeQti,
  providerMilestoneKey,
} from "@/lib/surgical-sales/leaderboardPathwayScoring";

const CHUNK = 400;

async function fetchExecutionLeaderboardConfigOverridesSafe(): Promise<PartialExecutionLeaderboardConfig | null> {
  try {
    return await fetchExecutionLeaderboardConfigOverrides();
  } catch {
    return null;
  }
}

const LEADERBOARD_PATHWAY_EVENT_TYPES = [
  ...LEADERBOARD_EVALUATION_STARTED_EVENT_TYPES,
  ...LEADERBOARD_COMMITMENT_SECURED_EVENT_TYPES,
  ...LEADERBOARD_OUTCOME_QTI_EVENT_TYPES,
] as const;

type InternalRep = { user_id: string; display_name: string; email: string | null };

type CaseRow = {
  id: string;
  sales_rep_id: string;
  account_id: string | null;
  surgeon_contact_id: string | null;
  product_id: string | null;
  case_type: string | null;
  status: string | null;
  updated_at: string;
  created_at?: string | null;
  observation_access_pathway?: string | null;
  live_observation_clinical_pain_points?: string | null;
  live_observation_competitors?: string | null;
  live_observation_product_fit?: string | null;
  live_observation_workflow?: string | null;
  live_observation_staff_process?: string | null;
  observation_quick_finding_product_interest?: string | null;
};

type EngagementRow = {
  id: string;
  sales_rep_id: string;
  engagement_type: string;
  status: string;
  case_id: string | null;
  organization_id: string | null;
  opportunity_id: string | null;
  debrief_completed?: boolean | null;
  debrief_completed_at?: string | null;
  updated_at: string;
  engagement_date?: string | null;
};

type OpportunityMeta = OpportunityScoreMeta & {
  accountId: string | null;
};

type TeamFilterContext = {
  filter: LeaderboardTeamFilter;
  accountStateById: Map<string, string | null>;
  productNameById: Map<string, string>;
  opportunityMetaById: Map<string, OpportunityMeta>;
  caseMetaById: Map<string, { accountId: string | null; productId: string | null }>;
};

type CaseQualitySignals = {
  productSupportPostReviewCaseIds: Set<string>;
};

function caseFilterContext(c: CaseRow, ctx: TeamFilterContext) {
  const productName = c.product_id ? ctx.productNameById.get(String(c.product_id)) ?? null : null;
  const accountState = c.account_id ? ctx.accountStateById.get(String(c.account_id)) ?? null : null;
  return entityMatchesTeamFilter({ filter: ctx.filter, accountState, productName });
}

function engagementFilterContext(e: EngagementRow, ctx: TeamFilterContext) {
  const linkedCase = e.case_id ? ctx.caseMetaById.get(String(e.case_id)) : undefined;
  const accountId = e.organization_id || linkedCase?.accountId || null;
  const accountState = accountId ? ctx.accountStateById.get(String(accountId)) ?? null : null;
  const productName = linkedCase?.productId ? ctx.productNameById.get(String(linkedCase.productId)) ?? null : null;
  return entityMatchesTeamFilter({ filter: ctx.filter, accountState, productName });
}

function opportunityFilterContext(
  opportunityId: string | null | undefined,
  ctx: TeamFilterContext,
): boolean {
  if (!opportunityId) return ctx.filter.type === "all";
  const meta = ctx.opportunityMetaById.get(String(opportunityId));
  if (!meta) return ctx.filter.type === "all";
  const accountState = meta.accountId ? ctx.accountStateById.get(String(meta.accountId)) ?? null : null;
  return entityMatchesTeamFilter({
    filter: ctx.filter,
    accountState,
    productName: meta.productLine,
  });
}

function bump(counts: ExecutionLeaderboardCounts, key: keyof ExecutionLeaderboardCounts, delta = 1) {
  counts[key] = (counts[key] || 0) + delta;
}

function buildCaseQualitySignals(engagements: EngagementRow[]): CaseQualitySignals {
  const productSupportPostReviewCaseIds = new Set<string>();

  for (const e of engagements) {
    if (!e.case_id) continue;
    const caseId = String(e.case_id);
    const engagementType = String(e.engagement_type || "").toLowerCase();
    if (engagementType === "post_case_follow_up" && isCompletedEngagementStatus(e.status)) {
      productSupportPostReviewCaseIds.add(caseId);
    }
  }

  return { productSupportPostReviewCaseIds };
}

function awardProviderMilestone(
  seen: Set<string>,
  repId: string,
  providerId: string | null | undefined,
  counts: ExecutionLeaderboardCounts,
  metric: keyof ExecutionLeaderboardCounts,
): void {
  const key = `${repId}:${providerMilestoneKey(providerId)}:${metric}`;
  if (seen.has(key)) return;
  seen.add(key);
  bump(counts, metric);
}

async function aggregateExecutionCountsForPeriod(args: {
  start: string;
  end: string;
  repIds: string[];
  cases: CaseRow[];
  engagements: EngagementRow[];
  observationCaseIds: Set<string>;
  caseQuality: CaseQualitySignals;
  teamFilter: TeamFilterContext;
}): Promise<Map<string, ExecutionLeaderboardCounts>> {
  const { start, end, repIds, cases, engagements, teamFilter } = args;
  const periodStartIso = `${start}T00:00:00.000Z`;
  const periodEndIso = `${end}T23:59:59.999Z`;
  const repIdSet = new Set(repIds);

  const countsByRep = new Map<string, ExecutionLeaderboardCounts>();
  const observationApprovedByRep = new Map<string, Set<string>>();
  const fiveObsMilestoneAwarded = new Set<string>();
  const evaluationStartedAwarded = new Set<string>();
  const commitmentAwarded = new Set<string>();
  const outcomeQtiAwarded = new Set<string>();

  for (const repId of repIds) {
    countsByRep.set(repId, emptyExecutionLeaderboardCounts());
    observationApprovedByRep.set(repId, new Set());
  }

  for (const c of cases) {
    const counts = countsByRep.get(c.sales_rep_id);
    if (!counts) continue;
    if (!caseFilterContext(c, teamFilter)) continue;

    const inPeriod = tsInYmdRange(c.updated_at, start, end);
    const createdInPeriod = tsInYmdRange(c.created_at ?? c.updated_at, start, end);
    const completed = isCompletedCaseStatus(c.status);
    const caseType = String(c.case_type || "").toLowerCase();
    const approvedCases = observationApprovedByRep.get(c.sales_rep_id)!;

    if (caseType === "observation") {
      if (
        observationRequestQualifiesForScore(c) &&
        (inPeriod || createdInPeriod) &&
        !approvedCases.has(c.id)
      ) {
        approvedCases.add(c.id);
        bump(counts, "observation_approved");
      }
      if (completed && inPeriod) {
        bump(counts, "observation_completed");
        const totalForProvider = countCompletedObservationsForProvider(cases, c.sales_rep_id, c.surgeon_contact_id);
        if (totalForProvider >= 5) {
          awardProviderMilestone(
            fiveObsMilestoneAwarded,
            c.sales_rep_id,
            c.surgeon_contact_id,
            counts,
            "five_observations_completed",
          );
        }
      }
    }

    if (caseType === "product_support" && completed && inPeriod) {
      bump(counts, "product_support_case_completed");
    }
  }

  for (const e of engagements) {
    const counts = countsByRep.get(e.sales_rep_id);
    if (!counts) continue;
    if (!engagementFilterContext(e, teamFilter)) continue;

    const completionYmd = engagementCompletionYmd(e);
    const completedInPeriod =
      isCompletedEngagementStatus(e.status) && completionYmd && tsInYmdRange(completionYmd, start, end);
    const engagementType = String(e.engagement_type || "").toLowerCase();

    const qualifiesForScore = engagementQualifiesForScore({
      status: e.status,
      engagement_type: e.engagement_type,
      case_id: e.case_id,
      opportunity_id: e.opportunity_id,
      organization_id: e.organization_id,
      debrief_completed: e.debrief_completed,
      debrief_completed_at: e.debrief_completed_at,
    });

    if (completedInPeriod && qualifiesForScore) {
      if (engagementType === "intro_call") bump(counts, "intro_call_completed");
      if (isEvaluationEngagementType(engagementType)) {
        awardProviderMilestone(
          evaluationStartedAwarded,
          e.sales_rep_id,
          e.organization_id,
          counts,
          "evaluation_started",
        );
      }
    }

    if (engagementType === "provider_debrief" && isDebriefCompleted(e) && qualifiesForScore) {
      const debriefYmd = e.debrief_completed_at?.slice(0, 10) ?? completionYmd;
      if (debriefYmd && tsInYmdRange(debriefYmd, start, end)) {
        bump(counts, "debrief_completed");
      }
    }
  }

  for (let i = 0; i < repIds.length; i += CHUNK) {
    const slice = repIds.slice(i, i + CHUNK);
    const { data: providerActs, error: paErr } = await supabaseAdmin
      .from("surgical_sales_provider_activities")
      .select("user_id, activity_type, metadata_json, body, created_at")
      .in("user_id", slice)
      .gte("created_at", periodStartIso)
      .lte("created_at", periodEndIso)
      .eq("activity_type", "provider_intelligence_promoted");
    if (paErr) throw new Error(paErr.message);

    for (const row of providerActs || []) {
      const uid = String((row as { user_id: string }).user_id);
      const counts = countsByRep.get(uid);
      if (!counts) continue;
      const meta = ((row as { metadata_json?: unknown }).metadata_json ?? null) as Record<string, unknown> | null;
      const body = String((row as { body?: string | null }).body ?? "");
      const fieldLabel = String((meta?.field_label ?? meta?.field ?? body.slice(0, 120)) || "");
      const providerId = String(meta?.provider_id ?? meta?.providerId ?? "");

      if (promotedFieldScoresCommitment(fieldLabel)) {
        awardProviderMilestone(commitmentAwarded, uid, providerId, counts, "commitment_secured");
      }
      if (promotedFieldScoresOutcomeQti(fieldLabel)) {
        awardProviderMilestone(outcomeQtiAwarded, uid, providerId, counts, "outcome_qti_started");
      }
    }
  }

  const seenPathwayEvents = new Set<string>();

  for (let i = 0; i < repIds.length; i += CHUNK) {
    const slice = repIds.slice(i, i + CHUNK);
    const { data: events, error: evErr } = await supabaseAdmin
      .from("unified_activity_events")
      .select("id, type, created_by_user_id, entity_id, metadata, created_at")
      .in("created_by_user_id", slice)
      .gte("created_at", periodStartIso)
      .lte("created_at", periodEndIso)
      .in("type", [...LEADERBOARD_PATHWAY_EVENT_TYPES]);
    if (evErr) throw new Error(evErr.message);

    for (const row of events || []) {
      const uid = String((row as { created_by_user_id: string | null }).created_by_user_id || "");
      if (!repIdSet.has(uid)) continue;
      const counts = countsByRep.get(uid);
      if (!counts) continue;
      const type = String((row as { type: string }).type);
      const entityId = String((row as { entity_id: string }).entity_id || "");
      if (!opportunityFilterContext(entityId, teamFilter)) continue;
      const eventId = String((row as { id: string }).id);
      const dedupeKey = `${uid}:${type}:${entityId}:${eventId}`;
      if (seenPathwayEvents.has(dedupeKey)) continue;
      seenPathwayEvents.add(dedupeKey);

      if (LEADERBOARD_EVALUATION_STARTED_EVENT_TYPES.has(type)) {
        bump(counts, "evaluation_started");
        continue;
      }
      if (LEADERBOARD_COMMITMENT_SECURED_EVENT_TYPES.has(type)) {
        bump(counts, "commitment_secured");
        continue;
      }
      if (LEADERBOARD_OUTCOME_QTI_EVENT_TYPES.has(type)) {
        bump(counts, "outcome_qti_started");
      }
    }
  }

  return countsByRep;
}

function achievementBadgesByRep(args: {
  reps: Array<{ user_id: string; leaderboard_score: number }>;
  currentCountsByRep: Map<string, ExecutionLeaderboardCounts>;
  priorCountsByRep: Map<string, ExecutionLeaderboardCounts>;
}): Record<string, EarnedAchievementBadge[]> {
  const out: Record<string, EarnedAchievementBadge[]> = {};
  for (const rep of args.reps) {
    const counts = args.currentCountsByRep.get(rep.user_id) ?? emptyExecutionLeaderboardCounts();
    const priorCounts = args.priorCountsByRep.get(rep.user_id) ?? emptyExecutionLeaderboardCounts();
    out[rep.user_id] = computeRepAchievementBadges({
      counts,
      priorCounts,
      currentLeaderboardScore: rep.leaderboard_score,
    });
  }
  return out;
}

export async function fetchRepAchievementSummary(args: {
  userId: string;
  now?: Date;
  period?: LeaderboardPeriodKey | "mtd" | "30d";
}) {
  const result = await fetchExecutionLeaderboard({
    now: args.now,
    period: args.period,
    repFilterIds: [args.userId],
    selfUserId: args.userId,
  });
  const rep = result.reps.find((r) => r.user_id === args.userId);
  const badges = result.achievement_badges_by_rep?.[args.userId] ?? [];
  return {
    period_label: result.period_label,
    achievement_badges: badges,
    nearest_progress: rep ? nearestBadgeProgress(rep.metrics) : null,
  };
}

export async function fetchExecutionLeaderboard(args: {
  now?: Date;
  period?: LeaderboardPeriodKey | "mtd" | "30d";
  customStart?: string | null;
  customEnd?: string | null;
  teamFilter?: LeaderboardTeamFilter;
  config?: PartialExecutionLeaderboardConfig | null;
  selfUserId?: string | null;
  repFilterIds?: string[] | null;
}): Promise<ExecutionLeaderboardResult & { filter_options: LeaderboardFilterOptions }> {
  const now = args.now ?? new Date();
  const periodKey = resolveLeaderboardPeriodKey(args.period);
  const current = leaderboardPeriodBounds(now, periodKey, {
    start: args.customStart,
    end: args.customEnd,
  });
  const prior = leaderboardPriorPeriodBounds(now, periodKey, current);
  const teamFilterValue = args.teamFilter ?? { type: "all" as const };
  const configOverrides = args.config ?? (await fetchExecutionLeaderboardConfigOverridesSafe());

  const { data: repRows, error: repErr } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id, full_name, email, is_internal_sales_rep")
    .eq("is_internal_sales_rep", true)
    .order("email", { ascending: true });

  if (repErr) throw new Error(repErr.message);

  let internalReps: InternalRep[] = (repRows || []).map((r: { user_id: string; full_name?: string | null; email?: string | null }) => {
    const fn = String(r.full_name ?? "").trim();
    const em = String(r.email ?? "").trim();
    return {
      user_id: String(r.user_id),
      display_name: fn || em || String(r.user_id),
      email: r.email ?? null,
    };
  });

  if (args.repFilterIds?.length) {
    const allowed = new Set(args.repFilterIds.map(String));
    internalReps = internalReps.filter((r) => allowed.has(r.user_id));
  }

  const repIds = internalReps.map((r) => r.user_id);
  const emptyCountsByRep = new Map<string, ExecutionLeaderboardCounts>();
  for (const rep of internalReps) {
    emptyCountsByRep.set(rep.user_id, emptyExecutionLeaderboardCounts());
  }

  const emptyFilterOptions: LeaderboardFilterOptions = { territories: [], regions: [], product_lines: [] };

  if (repIds.length === 0) {
    const base = buildExecutionLeaderboard({
      periodStart: current.start,
      periodEnd: current.end,
      periodLabel: current.label,
      internalReps,
      countsByRep: emptyCountsByRep,
      config: configOverrides,
      selfUserId: args.selfUserId,
    });
    const boardsResult = buildLeaderboardCategoryBoards({
      reps: base.reps,
      priorCountsByRep: emptyCountsByRep,
      config: base.config,
      priorPeriodLabel: prior.label,
      selfUserId: args.selfUserId,
    });
    return {
      ...base,
      prior_period_start: prior.start,
      prior_period_end: prior.end,
      prior_period_label: prior.label,
      boards: boardsResult.boards,
      filter_options: emptyFilterOptions,
      achievement_badges_by_rep: achievementBadgesByRep({
        reps: base.reps,
        currentCountsByRep: emptyCountsByRep,
        priorCountsByRep: emptyCountsByRep,
      }),
    };
  }

  const { data: casesRaw, error: caseErr } = await supabaseAdmin
    .from("surgical_sales_cases")
    .select(
      "id, sales_rep_id, account_id, surgeon_contact_id, product_id, case_type, status, updated_at, created_at, observation_access_pathway, live_observation_clinical_pain_points, live_observation_competitors, live_observation_product_fit, live_observation_workflow, live_observation_staff_process, observation_quick_finding_product_interest",
    )
    .in("sales_rep_id", repIds)
    .order("updated_at", { ascending: false })
    .limit(25_000);

  if (caseErr) throw new Error(caseErr.message);

  const cases = (casesRaw || []) as CaseRow[];
  const observationCaseIds = new Set<string>();
  const caseMetaById = new Map<string, { accountId: string | null; productId: string | null }>();
  const accountIds = new Set<string>();
  const productIds = new Set<string>();

  for (const c of cases) {
    caseMetaById.set(c.id, {
      accountId: c.account_id ? String(c.account_id) : null,
      productId: c.product_id ? String(c.product_id) : null,
    });
    if (String(c.case_type || "").toLowerCase() === "observation") {
      observationCaseIds.add(c.id);
    }
    if (c.account_id) accountIds.add(String(c.account_id));
    if (c.product_id) productIds.add(String(c.product_id));
  }

  const { data: engagementsRaw, error: engErr } = await supabaseAdmin
    .from("surgical_sales_engagements")
    .select(
      "id, sales_rep_id, engagement_type, status, case_id, organization_id, opportunity_id, debrief_completed, debrief_completed_at, updated_at, engagement_date",
    )
    .in("sales_rep_id", repIds)
    .is("archived_at", null)
    .limit(25_000);

  if (engErr) throw new Error(engErr.message);

  const engagements = (engagementsRaw || []) as EngagementRow[];
  for (const e of engagements) {
    if (e.organization_id) accountIds.add(String(e.organization_id));
  }

  const accountStateById = new Map<string, string | null>();
  const accountIdList = [...accountIds];
  for (let i = 0; i < accountIdList.length; i += CHUNK) {
    const slice = accountIdList.slice(i, i + CHUNK);
    if (slice.length === 0) break;
    const { data: accts } = await supabaseAdmin
      .from(SALES_ORGANIZATIONS_TABLE)
      .select("id, surgical_crm_billing_state")
      .in("id", slice);
    for (const a of accts || []) {
      accountStateById.set(String((a as { id: string }).id), String((a as { surgical_crm_billing_state?: string | null }).surgical_crm_billing_state ?? "").trim() || null);
    }
  }

  const productNameById = new Map<string, string>();
  const productIdList = [...productIds];
  for (let i = 0; i < productIdList.length; i += CHUNK) {
    const slice = productIdList.slice(i, i + CHUNK);
    if (slice.length === 0) break;
    const { data: prods } = await supabaseAdmin.from("surgical_sales_products").select("id, name").in("id", slice);
    for (const p of prods || []) {
      productNameById.set(String((p as { id: string }).id), String((p as { name?: string | null }).name ?? "").trim());
    }
  }

  const opportunityMetaById = new Map<string, OpportunityMeta>();
  const opportunityProductIds = new Set<string>();
  for (let i = 0; i < repIds.length; i += CHUNK) {
    const slice = repIds.slice(i, i + CHUNK);
    const { data: oppsMeta } = await supabaseAdmin
      .from("sales_opportunities")
      .select(
        "id, product_line, account_id, surgeon_contact_id, physician_name, product_id, source_case_id, source_engagement_id",
      )
      .in("owner_user_id", slice);
    for (const o of oppsMeta || []) {
      const id = String((o as { id: string }).id);
      const accountId = (o as { account_id?: string | null }).account_id ? String((o as { account_id: string }).account_id) : null;
      const productId = (o as { product_id?: string | null }).product_id ? String((o as { product_id: string }).product_id) : null;
      if (productId) opportunityProductIds.add(productId);
      opportunityMetaById.set(id, {
        productLine: String((o as { product_line?: string | null }).product_line ?? "").trim() || null,
        accountId,
        surgeonContactId: (o as { surgeon_contact_id?: string | null }).surgeon_contact_id
          ? String((o as { surgeon_contact_id: string }).surgeon_contact_id)
          : null,
        physicianName: String((o as { physician_name?: string | null }).physician_name ?? "").trim() || null,
        productId,
        sourceCaseId: (o as { source_case_id?: string | null }).source_case_id
          ? String((o as { source_case_id: string }).source_case_id)
          : null,
        sourceEngagementId: (o as { source_engagement_id?: string | null }).source_engagement_id
          ? String((o as { source_engagement_id: string }).source_engagement_id)
          : null,
      });
      if (accountId) accountIds.add(accountId);
    }
  }

  const extraProductIdList = [...opportunityProductIds].filter((id) => !productNameById.has(id));
  for (let i = 0; i < extraProductIdList.length; i += CHUNK) {
    const slice = extraProductIdList.slice(i, i + CHUNK);
    if (slice.length === 0) break;
    const { data: prods } = await supabaseAdmin.from("surgical_sales_products").select("id, name").in("id", slice);
    for (const p of prods || []) {
      productNameById.set(String((p as { id: string }).id), String((p as { name?: string | null }).name ?? "").trim());
    }
  }

  for (const meta of opportunityMetaById.values()) {
    if (!meta.productLine && meta.productId) {
      meta.productLine = productNameById.get(meta.productId) ?? null;
    }
  }

  const filter_options = buildLeaderboardFilterOptions({
    accountStates: [...accountStateById.values()].filter(Boolean) as string[],
    productNames: [...productNameById.values(), ...[...opportunityMetaById.values()].map((o) => o.productLine || "")],
  });

  const teamFilterCtx: TeamFilterContext = {
    filter: teamFilterValue,
    accountStateById,
    productNameById,
    opportunityMetaById,
    caseMetaById,
  };

  const caseQuality = buildCaseQualitySignals(engagements);

  const sharedArgs = { repIds, cases, engagements, observationCaseIds, caseQuality, teamFilter: teamFilterCtx };

  const [currentCountsByRep, priorCountsByRep] = await Promise.all([
    aggregateExecutionCountsForPeriod({ ...sharedArgs, start: current.start, end: current.end }),
    aggregateExecutionCountsForPeriod({ ...sharedArgs, start: prior.start, end: prior.end }),
  ]);

  const base = buildExecutionLeaderboard({
    periodStart: current.start,
    periodEnd: current.end,
    periodLabel: current.label,
    internalReps,
    countsByRep: currentCountsByRep,
    config: configOverrides,
    selfUserId: args.selfUserId,
  });

  const boardsResult = buildLeaderboardCategoryBoards({
    reps: base.reps,
    priorCountsByRep,
    config: base.config,
    priorPeriodLabel: prior.label,
    selfUserId: args.selfUserId,
  });

  return {
    ...base,
    prior_period_start: prior.start,
    prior_period_end: prior.end,
    prior_period_label: prior.label,
    boards: boardsResult.boards,
    filter_options,
    achievement_badges_by_rep: achievementBadgesByRep({
      reps: base.reps,
      currentCountsByRep,
      priorCountsByRep,
    }),
  };
}
