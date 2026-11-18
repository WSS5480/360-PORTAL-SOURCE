import { buildObservationDebriefDiscussionTopics } from "@/lib/surgical-sales/buildObservationDebriefDiscussionTopics";
import { buildObservationTakeaways } from "@/lib/surgical-sales/buildObservationTakeaways";
import { resolveObservationCaseExecutionStatus } from "@/lib/surgical-sales/observationCaseExecutionStatus";

export type ObservationDebriefSummaryView = {
  debriefed: boolean;
  debriefDateLabel: string | null;
  discussionTopics: number;
  keyInsights: number;
  actionItems: number;
  followUps: number;
};

function countLines(raw: unknown): number {
  return String(raw ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function readDebriefDate(caseRow: Record<string, unknown>): string | null {
  const candidates = [
    caseRow.debrief_completed_at,
    caseRow.debrief_scheduled_at,
    caseRow.updated_at,
  ];
  for (const value of candidates) {
    const raw = String(value ?? "").trim();
    if (!raw) continue;
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  return null;
}

export function buildObservationDebriefSummaryView(input: {
  caseRow: Record<string, unknown>;
  activities?: Array<{ activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null }>;
}): ObservationDebriefSummaryView | null {
  const status = resolveObservationCaseExecutionStatus({
    caseRow: input.caseRow,
    activities: input.activities,
  });
  const debriefed = status === "debrief_planned" || status === "completed" || status === "closed";
  if (!debriefed) return null;

  const takeaways = buildObservationTakeaways({
    caseRow: input.caseRow,
    activities: input.activities,
  });
  const topics = buildObservationDebriefDiscussionTopics({
    caseRow: input.caseRow,
    activities: input.activities,
  });

  const followUps = countLines(input.caseRow.live_observation_follow_up_items);
  const actionItems = countLines(input.caseRow.debrief_key_findings);

  return {
    debriefed: true,
    debriefDateLabel: readDebriefDate(input.caseRow),
    discussionTopics: topics.length,
    keyInsights: takeaways.length,
    actionItems: actionItems || Math.min(takeaways.length, 3),
    followUps: followUps || (input.caseRow.follow_up_needed === true ? 1 : 0),
  };
}
