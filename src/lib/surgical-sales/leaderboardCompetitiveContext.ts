import type { ExecutionLeaderboardConfig } from "@/lib/surgical-sales/executionLeaderboardConfig";
import { DEFAULT_EXECUTION_LEADERBOARD_CONFIG } from "@/lib/surgical-sales/executionLeaderboardConfig";
import type { LeaderboardBoardEntry } from "@/lib/surgical-sales/leaderboardCategoryBoards";
import type { LeaderboardPortalRepRow } from "@/lib/surgical-sales/leaderboardPortalTypes";
import { formatPathwayPoints, metricPoints } from "@/lib/surgical-sales/leaderboardTransparentScoring";

export type LeaderboardCompetitiveStatus = "leader" | "can_advance" | "tied_above" | "solo";

export type LeaderboardCompetitiveContext = {
  currentRank: number;
  totalReps: number;
  executionScore: number;
  targetRank: number | null;
  pointsNeeded: number | null;
  rankDisplay: string;
  scoreDisplay: string;
  advanceDisplay: string;
  status: LeaderboardCompetitiveStatus;
  targetRepName: string | null;
};

export type LeaderboardInsightStrip = {
  message: string;
};

function repExecutionScore(
  rep: LeaderboardPortalRepRow | undefined,
  entry: LeaderboardBoardEntry | undefined,
): number {
  if (rep?.pathway_score.total_points != null) return rep.pathway_score.total_points;
  if (rep?.leaderboard_score != null) return Math.round(rep.leaderboard_score);
  if (entry) return Math.round(entry.score);
  return 0;
}

export function buildLeaderboardCompetitiveContext(args: {
  selfRank: number;
  totalReps: number;
  selfUserId: string;
  entries: LeaderboardBoardEntry[];
  repById: Map<string, LeaderboardPortalRepRow>;
}): LeaderboardCompetitiveContext {
  const { selfRank, totalReps, selfUserId, entries, repById } = args;
  const selfEntry = entries.find((e) => e.user_id === selfUserId);
  const selfRep = repById.get(selfUserId);
  const executionScore = repExecutionScore(selfRep, selfEntry);

  const rankDisplay = `#${selfRank} of ${Math.max(totalReps, 1)}`;
  const scoreDisplay = `Score ${formatPathwayPoints(executionScore)}`;

  const base = {
    currentRank: selfRank,
    totalReps,
    executionScore,
    targetRank: null as number | null,
    pointsNeeded: null as number | null,
    rankDisplay,
    scoreDisplay,
    advanceDisplay: "",
    status: "can_advance" as LeaderboardCompetitiveStatus,
    targetRepName: null as string | null,
  };

  if (totalReps <= 1) {
    return {
      ...base,
      advanceDisplay: "You're the only rep on this board — set the pace",
      status: "solo",
    };
  }

  if (selfRank <= 1) {
    return {
      ...base,
      advanceDisplay: "You're in first — defend your lead",
      status: "leader",
    };
  }

  const aboveEntry = entries.find((e) => e.rank === selfRank - 1);
  if (!aboveEntry) {
    return {
      ...base,
      advanceDisplay: "Keep stacking execution points to climb",
    };
  }

  const targetRank = aboveEntry.rank;
  const targetRepName = aboveEntry.display_name;
  const aboveScore = repExecutionScore(repById.get(aboveEntry.user_id), aboveEntry);

  if (executionScore >= aboveScore) {
    return {
      ...base,
      targetRank,
      targetRepName,
      pointsNeeded: 1,
      advanceDisplay: `Need 1 point to pass #${targetRank}`,
      status: "tied_above",
    };
  }

  const pointsNeeded = aboveScore - executionScore;
  return {
    ...base,
    targetRank,
    targetRepName,
    pointsNeeded,
    advanceDisplay: `Need ${formatPathwayPoints(pointsNeeded)} points to pass #${targetRank}`,
    status: "can_advance",
  };
}

export function buildLeaderboardInsightStrip(args: {
  context: LeaderboardCompetitiveContext;
  scoringConfig?: ExecutionLeaderboardConfig;
}): LeaderboardInsightStrip | null {
  const { context } = args;
  const config = args.scoringConfig ?? DEFAULT_EXECUTION_LEADERBOARD_CONFIG;

  if (context.status === "leader") {
    return { message: "Defend your lead — you're #1 on the board" };
  }

  if (context.status === "solo") {
    return null;
  }

  const targetRank = context.targetRank;
  const pointsNeeded = context.pointsNeeded;
  const targetName = context.targetRepName;

  if (targetName && pointsNeeded != null && targetRank != null) {
    return {
      message: `Next rank target: ${targetName} (+${formatPathwayPoints(pointsNeeded)})`,
    };
  }

  if (pointsNeeded != null && targetRank != null) {
    const obsPoints = metricPoints(config, "observation_completed");
    if (obsPoints > 0 && pointsNeeded <= obsPoints * 6) {
      const obsCount = Math.ceil(pointsNeeded / obsPoints);
      if (obsCount <= 6) {
        return {
          message: `${obsCount} observation${obsCount === 1 ? "" : "s"} would move you ahead of #${targetRank}`,
        };
      }
    }
    return { message: context.advanceDisplay };
  }

  return { message: context.advanceDisplay };
}
