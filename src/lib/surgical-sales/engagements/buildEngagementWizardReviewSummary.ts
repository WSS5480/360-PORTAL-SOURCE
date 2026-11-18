import type { EngagementWorkflowDraft } from "@/lib/surgical-sales/engagements/engagementWorkflowFields";
import { splitEngagementPrepLines } from "@/lib/surgical-sales/engagements/engagementPrepTextLines";

const MAX_TALKING_POINTS = 5;

export type EngagementWizardReviewPrepSummary = {
  playbookName: string | null;
  goal: string | null;
  talkingPoints: string[];
  nextAction: string | null;
};

export function buildEngagementWizardReviewPrepSummary(input: {
  draft: EngagementWorkflowDraft;
  isStrategic: boolean;
  isOfficeVisit: boolean;
  playbookName: string | null;
  suggestedGoal?: string | null;
  suggestedTalkingPoints?: string[];
}): EngagementWizardReviewPrepSummary {
  const draftGoal = String(input.draft.observation_goal ?? "").trim();
  const suggestedGoal = String(input.suggestedGoal ?? "").trim();

  let goal: string | null = null;
  if (input.isStrategic) {
    goal = draftGoal || suggestedGoal || null;
  } else {
    goal = String(input.draft.engagement_purpose ?? "").trim() || draftGoal || suggestedGoal || null;
  }

  const talkingPoints: string[] = [];
  if (input.isStrategic) {
    const opening = String(input.draft.pre_observation_impact_opening_statement ?? "").trim();
    if (opening) talkingPoints.push(opening);
    const probes = String(input.draft.pre_observation_probes ?? "").trim();
    if (probes) talkingPoints.push(...splitEngagementPrepLines(probes));
    if (talkingPoints.length === 0) {
      talkingPoints.push(...(input.suggestedTalkingPoints ?? []).slice(0, MAX_TALKING_POINTS));
    }
  } else {
    const purpose = String(input.draft.engagement_purpose ?? "").trim();
    if (purpose) talkingPoints.push(purpose);
    const notes = String(input.draft.pre_observation_additional_notes ?? "").trim();
    if (notes) {
      for (const line of splitEngagementPrepLines(notes)) {
        if (line !== purpose) talkingPoints.push(line);
      }
    }
  }

  let nextAction = String(input.draft.next_action ?? "").trim() || null;
  if (!nextAction && input.isStrategic) {
    nextAction = String(input.draft.pre_observation_planned_close ?? "").trim() || null;
    if (!nextAction && input.isOfficeVisit) {
      const follow = String(input.draft.follow_up_tasks ?? "").trim();
      nextAction = follow ? (splitEngagementPrepLines(follow)[0] ?? null) : null;
    }
  }
  if (!nextAction && !input.isStrategic) {
    const tasks = String(input.draft.follow_up_tasks ?? "").trim();
    nextAction = tasks ? (splitEngagementPrepLines(tasks)[0] ?? null) : null;
  }

  return {
    playbookName: input.playbookName,
    goal,
    talkingPoints: talkingPoints.slice(0, MAX_TALKING_POINTS),
    nextAction,
  };
}

export function formatEngagementWizardTargetDate(isoDate: string): string {
  const raw = isoDate.trim();
  if (!raw) return "—";
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
