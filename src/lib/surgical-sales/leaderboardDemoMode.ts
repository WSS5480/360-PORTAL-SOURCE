import { computeRepAchievementBadges } from "@/lib/surgical-sales/executionAchievementBadges";
import { DEFAULT_EXECUTION_LEADERBOARD_CONFIG } from "@/lib/surgical-sales/executionLeaderboardConfig";
import {
  buildExecutionLeaderboard,
  emptyExecutionLeaderboardCounts,
  type ExecutionLeaderboardCounts,
} from "@/lib/surgical-sales/executionLeaderboardMetrics";
import { buildLeaderboardCategoryBoards, type LeaderboardBoard } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import { bestCategoryLabel } from "@/lib/surgical-sales/leaderboardPresentation";
import type { LeaderboardPortalResponse } from "@/lib/surgical-sales/leaderboardPortalTypes";
import {
  buildLeaderboardPortalScoringPayload,
  enrichLeaderboardPortalRow,
} from "@/lib/surgical-sales/leaderboardPortalEnrichment";
import type { LeaderboardPeriodKey } from "@/lib/surgical-sales/leaderboardPeriod";
import { leaderboardPeriodBounds } from "@/lib/surgical-sales/leaderboardPeriod";
import type { LeaderboardTeamFilter } from "@/lib/surgical-sales/leaderboardTeamFilters";
import { computePathwayTotalPoints } from "@/lib/surgical-sales/leaderboardTransparentScoring";

export const LEADERBOARD_DEMO_MODE_STORAGE_KEY = "360-leaderboard-demo-mode";

/** Fictional reps for in-memory demo previews — never persisted. */
export const LEADERBOARD_DEMO_REP_NAMES = [
  "Sarah Mitchell",
  "Mike Reynolds",
  "Jessica Carter",
  "Ryan Thompson",
  "Ashley Parker",
  "David Lopez",
  "Chris Morgan",
  "Emily Davis",
  "Brandon Clark",
  "Nicole Harris",
] as const;

const PREVIEW_SELF_REP_NAME = "Brandon Clark";

function demoCounts(partial: Partial<ExecutionLeaderboardCounts>): ExecutionLeaderboardCounts {
  return { ...emptyExecutionLeaderboardCounts(), ...partial };
}

export type DemoRepPersonalityProfile = {
  observations: number;
  debriefs: number;
  debriefAfterObservationRatio: number;
  painPoints: number;
  competitorInsights: number;
  productSignals: number;
  opportunities: number;
  evaluations: number;
  supportCases: number;
  relationshipEngagements: number;
};

export type DemoRepPersonality = {
  name: (typeof LEADERBOARD_DEMO_REP_NAMES)[number];
  archetype: string;
  summary: string;
  trendPercent: number;
  /** Hand-authored metric counts — no scaling layer that homogenizes rep shapes. */
  counts: ExecutionLeaderboardCounts;
};

/** Ten distinct sales-team archetypes with believable pathway metric fingerprints. */
export const LEADERBOARD_DEMO_REP_PERSONALITIES: DemoRepPersonality[] = [
  {
    name: "Sarah Mitchell",
    archetype: "Evaluation Leader",
    summary: "Moves providers through observation, debrief, and into active evaluation.",
    trendPercent: 12,
    counts: demoCounts({
      intro_call_completed: 4,
      observation_approved: 25,
      observation_completed: 25,
      five_observations_completed: 4,
      debrief_completed: 11,
      evaluation_started: 5,
      commitment_secured: 2,
      product_support_case_completed: 5,
    }),
  },
  {
    name: "Mike Reynolds",
    archetype: "Observation Specialist",
    summary: "Strong observation volume with consistent five-observation milestones.",
    trendPercent: 9,
    counts: demoCounts({
      intro_call_completed: 2,
      observation_approved: 15,
      observation_completed: 15,
      five_observations_completed: 3,
      debrief_completed: 8,
      evaluation_started: 1,
      product_support_case_completed: 4,
    }),
  },
  {
    name: "Jessica Carter",
    archetype: "Relationship Builder",
    summary: "Strong intro calls and debriefs that keep providers moving.",
    trendPercent: 7,
    counts: demoCounts({
      intro_call_completed: 9,
      observation_approved: 18,
      observation_completed: 18,
      five_observations_completed: 3,
      debrief_completed: 17,
      evaluation_started: 2,
      commitment_secured: 1,
      product_support_case_completed: 5,
    }),
  },
  {
    name: "Ryan Thompson",
    archetype: "Product Support Specialist",
    summary: "Strong product support specialist — closes cases reliably.",
    trendPercent: 5,
    counts: demoCounts({
      intro_call_completed: 3,
      observation_approved: 12,
      observation_completed: 12,
      five_observations_completed: 2,
      debrief_completed: 6,
      evaluation_started: 1,
      product_support_case_completed: 18,
    }),
  },
  {
    name: "Ashley Parker",
    archetype: "Rising Rep",
    summary: "Newer to the team — lower totals but the strongest momentum in the region.",
    trendPercent: 17,
    counts: demoCounts({
      intro_call_completed: 5,
      observation_approved: 13,
      observation_completed: 13,
      five_observations_completed: 2,
      debrief_completed: 8,
      evaluation_started: 2,
      commitment_secured: 1,
      product_support_case_completed: 4,
    }),
  },
  {
    name: "David Lopez",
    archetype: "Debrief Driver",
    summary: "Wraps observation series with strong debrief execution.",
    trendPercent: 2,
    counts: demoCounts({
      intro_call_completed: 3,
      observation_approved: 10,
      observation_completed: 10,
      five_observations_completed: 2,
      debrief_completed: 9,
      evaluation_started: 1,
      product_support_case_completed: 3,
    }),
  },
  {
    name: "Chris Morgan",
    archetype: "Commitment Closer",
    summary: "Converts evaluation momentum into secured commitments.",
    trendPercent: -1,
    counts: demoCounts({
      intro_call_completed: 2,
      observation_approved: 7,
      observation_completed: 7,
      five_observations_completed: 1,
      debrief_completed: 4,
      evaluation_started: 4,
      commitment_secured: 3,
      product_support_case_completed: 1,
    }),
  },
  {
    name: "Emily Davis",
    archetype: "Steady Executor",
    summary: "Balanced contributor — consistent across observations, debriefs, and support.",
    trendPercent: -3,
    counts: demoCounts({
      intro_call_completed: 4,
      observation_approved: 12,
      observation_completed: 12,
      five_observations_completed: 2,
      debrief_completed: 8,
      evaluation_started: 1,
      product_support_case_completed: 4,
    }),
  },
  {
    name: "Brandon Clark",
    archetype: "Developing All-Rounder",
    summary: "Building rhythm — solid debriefs with room to grow on evaluation starts.",
    trendPercent: -4,
    counts: demoCounts({
      intro_call_completed: 5,
      observation_approved: 9,
      observation_completed: 9,
      five_observations_completed: 1,
      debrief_completed: 8,
      evaluation_started: 1,
      product_support_case_completed: 3,
    }),
  },
  {
    name: "Nicole Harris",
    archetype: "Rebuilding Quarter",
    summary: "Quiet month — fewer cases while resetting account plans.",
    trendPercent: -8,
    counts: demoCounts({
      intro_call_completed: 1,
      observation_approved: 7,
      observation_completed: 7,
      debrief_completed: 4,
      product_support_case_completed: 2,
    }),
  },
];

function demoRepSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export function demoRepUserId(name: string, previewUserId?: string | null): string {
  if (previewUserId && name === PREVIEW_SELF_REP_NAME) return previewUserId;
  return `demo-rep-${demoRepSlug(name)}`;
}

export type DemoRepProfileInput = DemoRepPersonalityProfile & {
  name: (typeof LEADERBOARD_DEMO_REP_NAMES)[number];
};

export function getDemoRepPersonality(index: number): DemoRepPersonality {
  return LEADERBOARD_DEMO_REP_PERSONALITIES[index] ?? LEADERBOARD_DEMO_REP_PERSONALITIES.at(-1)!;
}

function profileFromCounts(
  name: (typeof LEADERBOARD_DEMO_REP_NAMES)[number],
  countsInput: ExecutionLeaderboardCounts,
): DemoRepProfileInput {
  const observations = countsInput.observation_completed || 0;
  const debriefs = countsInput.debrief_completed || 0;
  return {
    name,
    observations,
    debriefs,
    debriefAfterObservationRatio: observations > 0 ? debriefs / observations : 0,
    painPoints: 0,
    competitorInsights: 0,
    productSignals: 0,
    opportunities: countsInput.commitment_secured || 0,
    evaluations: countsInput.evaluation_started || 0,
    supportCases: countsInput.product_support_case_completed || 0,
    relationshipEngagements: countsInput.intro_call_completed || 0,
  };
}

/** @deprecated Use getDemoRepPersonality — kept for tests and backward compatibility. */
export function buildDemoRepProfileInput(_tier: number, index: number): DemoRepProfileInput {
  const personality = getDemoRepPersonality(index);
  return profileFromCounts(personality.name, personality.counts);
}

export function demoProfileToCounts(profile: DemoRepProfileInput | DemoRepPersonalityProfile): ExecutionLeaderboardCounts {
  const personality = LEADERBOARD_DEMO_REP_PERSONALITIES.find((p) => p.name === (profile as DemoRepProfileInput).name);
  if (personality) return { ...personality.counts };

  return demoCounts({
    intro_call_completed: Math.max(1, Math.round(profile.relationshipEngagements * 0.35)),
    observation_approved: profile.observations,
    observation_completed: profile.observations,
    five_observations_completed: Math.max(0, Math.floor(profile.observations / 5)),
    debrief_completed: profile.debriefs,
    evaluation_started: profile.evaluations,
    commitment_secured: profile.opportunities,
    product_support_case_completed: profile.supportCases,
  });
}

export function demoRepPathwayPoints(countsInput: ExecutionLeaderboardCounts): number {
  return computePathwayTotalPoints(countsInput, DEFAULT_EXECUTION_LEADERBOARD_CONFIG);
}

/** Pathway point totals from hand-tuned counts (rank order #1 highest). */
export const LEADERBOARD_DEMO_TARGET_POINTS: readonly number[] = LEADERBOARD_DEMO_REP_PERSONALITIES.map((p) =>
  demoRepPathwayPoints(p.counts),
);

function priorCountsFromCurrent(current: ExecutionLeaderboardCounts, trendPct: number): ExecutionLeaderboardCounts {
  const factor = 1 / (1 + trendPct / 100);
  const prior = { ...emptyExecutionLeaderboardCounts() };
  for (const key of Object.keys(current) as (keyof ExecutionLeaderboardCounts)[]) {
    const value = current[key] || 0;
    if (value <= 0) continue;
    prior[key] = Math.max(0, Math.round(value * factor * 10) / 10);
  }
  return prior;
}

export function formatDemoTrendLabel(percent: number): string {
  if (percent > 0) return `▲ +${percent}%`;
  if (percent < 0) return `▼ ${percent}%`;
  return "→ No change";
}

export function applyDemoTrendLabels(
  boards: LeaderboardBoard[],
  trendByUserId: Map<string, number>,
): LeaderboardBoard[] {
  return boards.map((board) => ({
    ...board,
    entries: board.entries.map((entry) => {
      const pct = trendByUserId.get(entry.user_id) ?? 0;
      return {
        ...entry,
        trend: pct,
        trend_label: formatDemoTrendLabel(pct),
      };
    }),
  }));
}

/**
 * Builds a fully populated in-memory leaderboard for design/admin preview.
 * Never writes to the database.
 */
export function buildLeaderboardDemoModeResponse(args?: {
  previewUserId?: string | null;
  periodKey?: LeaderboardPeriodKey;
  periodLabel?: string;
  customPeriod?: { start?: string | null; end?: string | null };
  teamFilter?: LeaderboardTeamFilter;
}): LeaderboardPortalResponse {
  const now = new Date();
  const periodKey = args?.periodKey ?? "month";
  const bounds = leaderboardPeriodBounds(now, periodKey, args?.customPeriod);
  const periodLabel = args?.periodLabel ?? `${bounds.label} (Demo)`;
  const previewUserId = args?.previewUserId ?? null;
  const personalities = LEADERBOARD_DEMO_REP_PERSONALITIES;

  const internalReps = personalities.map((p) => ({
    user_id: demoRepUserId(p.name, previewUserId),
    display_name: p.name,
    email: `${demoRepSlug(p.name)}@demo.360med.local`,
  }));

  const currentCountsByRep = new Map<string, ExecutionLeaderboardCounts>();
  const trendByUserId = new Map<string, number>();

  for (const [index, rep] of internalReps.entries()) {
    const personality = personalities[index]!;
    currentCountsByRep.set(rep.user_id, personality.counts);
    trendByUserId.set(rep.user_id, personality.trendPercent);
  }

  const priorCountsByRep = new Map<string, ExecutionLeaderboardCounts>();
  for (const rep of internalReps) {
    const current = currentCountsByRep.get(rep.user_id)!;
    const pct = trendByUserId.get(rep.user_id) ?? 0;
    priorCountsByRep.set(rep.user_id, priorCountsFromCurrent(current, pct));
  }

  const selfUserId = previewUserId ?? demoRepUserId(PREVIEW_SELF_REP_NAME, previewUserId);

  const base = buildExecutionLeaderboard({
    periodStart: bounds.start,
    periodEnd: bounds.end,
    periodLabel,
    internalReps,
    countsByRep: currentCountsByRep,
    selfUserId,
  });

  const boardsResult = buildLeaderboardCategoryBoards({
    reps: base.reps,
    priorCountsByRep,
    config: base.config,
    priorPeriodLabel: "May 2026",
    selfUserId,
  });

  const boards = applyDemoTrendLabels(boardsResult.boards, trendByUserId);

  const achievementBadgesByRep: LeaderboardPortalResponse["achievement_badges_by_rep"] = {};
  for (const rep of base.reps) {
    achievementBadgesByRep[rep.user_id] = computeRepAchievementBadges({
      counts: currentCountsByRep.get(rep.user_id)!,
      priorCounts: priorCountsByRep.get(rep.user_id)!,
      currentLeaderboardScore: rep.leaderboard_score,
    });
  }

  const fieldCommander = boards.find((b) => b.id === "field_commander");
  const scoringPayload = buildLeaderboardPortalScoringPayload(base.config);

  return {
    ok: true,
    demo: true,
    demo_mode: true,
    generated_at: new Date().toISOString(),
    period: base.period_label,
    period_key: periodKey,
    period_start: base.period_start,
    period_end: base.period_end,
    prior_period: "May 2026 (demo)",
    prior_period_start: "2026-05-01",
    prior_period_end: "2026-05-31",
    team_filter: args?.teamFilter ?? { type: "all" },
    filter_options: {
      territories: ["TX", "CA", "FL", "NY", "IL"],
      regions: ["South", "West", "Southeast", "Northeast", "Midwest"],
      product_lines: ["Hernia Mesh", "Tissue Management", "Surgical Sealant", "Energy Platform"],
    },
    ...scoringPayload,
    boards,
    rows: base.reps.map((r) =>
      enrichLeaderboardPortalRow({
        rank: r.rank,
        user_id: r.user_id,
        name: r.display_name,
        leaderboard_score: r.leaderboard_score,
        category_scores: r.category_scores,
        metrics: r.metrics,
        best_category: bestCategoryLabel(r.category_scores),
        achievement_badges: achievementBadgesByRep[r.user_id] ?? [],
        config: base.config,
      }),
    ),
    achievement_badges_by_rep: achievementBadgesByRep,
    self_user_id: selfUserId,
    self_rank: fieldCommander?.self_rank ?? base.self_rank,
  };
}

/** @deprecated Use buildLeaderboardDemoModeResponse */
export function buildLeaderboardMockResponse(selfUserId?: string | null): LeaderboardPortalResponse {
  return buildLeaderboardDemoModeResponse({ previewUserId: selfUserId });
}

/** Demo trend percents aligned to rep personalities (Ashley surges, Nicole dips). */
export const LEADERBOARD_DEMO_TREND_PERCENT = LEADERBOARD_DEMO_REP_PERSONALITIES.map((p) => p.trendPercent);
