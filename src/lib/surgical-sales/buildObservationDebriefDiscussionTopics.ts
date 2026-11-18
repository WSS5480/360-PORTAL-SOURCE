import {
  collectObservationThingsLearnedFindingIds,
  type ObservationThingsLearnedFindingId,
} from "@/lib/surgical-sales/observationThingsLearnedFindings";
import { buildObservationFocusGuidance } from "@/lib/surgical-sales/buildObservationFocusGuidance";

export const OBSERVATION_DEBRIEF_DISCUSSION_TOPIC_MIN = 3;
export const OBSERVATION_DEBRIEF_DISCUSSION_TOPIC_MAX = 5;

const DISCUSSION_TOPIC_BY_FINDING: Record<ObservationThingsLearnedFindingId, string> = {
  competitor_product: "How does the competitive product fit the surgeon's current workflow?",
  visualization_challenge: "Explore visualization gaps and their impact on technique.",
  staff_workflow_issue: "Review staff workflow friction observed during the case.",
  workflow_bottleneck: "Discuss setup and turnover bottlenecks with the provider.",
  product_fit_opportunity: "Validate whether a product evaluation makes sense based on what you saw.",
  current_product: "Confirm which products are on preference and how they performed today.",
  provider_frustration: "Understand the provider's frustrations and what would improve the case.",
};

const GENERAL_DISCUSSION_TOPICS = [
  "What stood out most clinically during this case?",
  "Which products or trays should we confirm on preference?",
  "What follow-up would be most helpful for the surgeon?",
  "Which workflow moments are worth revisiting with the provider?",
  "What should we prioritize in the debrief conversation?",
] as const;

const FOCUS_CHIP_DISCUSSION_TOPICS: Record<string, string> = {
  "Competitor products": "Understand how competitive products fit the surgeon's current setup.",
  "Current products used": "Confirm which products were used and how they performed.",
  "Provider frustrations": "Explore provider frustrations and what would help in future cases.",
  "Staff frustrations": "Discuss staff pain points observed during setup and turnover.",
  "Workflow bottlenecks": "Review workflow bottlenecks and where time was lost.",
  "Product fit opportunities": "Validate whether a product evaluation makes sense from what you saw.",
};

type NoteActivity = { activity_type?: string; body?: string; metadata_json?: Record<string, unknown> | null };

function countCapturedNotes(activities?: NoteActivity[]): number {
  return (activities ?? []).filter((activity) => {
    if (String(activity.activity_type ?? "").trim().toLowerCase() !== "note") return false;
    return String(activity.body ?? "").trim().length > 0;
  }).length;
}

export function observationHasSufficientNotesForDebriefPlanning(input: {
  caseRow: Record<string, unknown>;
  activities?: NoteActivity[];
}): boolean {
  if (countCapturedNotes(input.activities) > 0) return true;
  return collectObservationThingsLearnedFindingIds(input).length > 0;
}

function pushUniqueTopic(topics: string[], seen: Set<string>, topic: string) {
  const trimmed = topic.trim();
  if (!trimmed) return;
  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  topics.push(trimmed);
}

/** Three to five provider debrief prompts derived from observation findings. */
export function buildObservationDebriefDiscussionTopics(input: {
  caseRow: Record<string, unknown>;
  activities?: NoteActivity[];
}): string[] {
  if (!observationHasSufficientNotesForDebriefPlanning(input)) return [];

  const topics: string[] = [];
  const seen = new Set<string>();

  for (const findingId of collectObservationThingsLearnedFindingIds(input)) {
    pushUniqueTopic(topics, seen, DISCUSSION_TOPIC_BY_FINDING[findingId]);
    if (topics.length >= OBSERVATION_DEBRIEF_DISCUSSION_TOPIC_MAX) break;
  }

  for (const { label: chip } of buildObservationFocusGuidance({ caseRow: input.caseRow, activities: input.activities })) {
    if (topics.length >= OBSERVATION_DEBRIEF_DISCUSSION_TOPIC_MAX) break;
    pushUniqueTopic(topics, seen, FOCUS_CHIP_DISCUSSION_TOPICS[chip] ?? "");
  }

  for (const topic of GENERAL_DISCUSSION_TOPICS) {
    if (topics.length >= OBSERVATION_DEBRIEF_DISCUSSION_TOPIC_MAX) break;
    pushUniqueTopic(topics, seen, topic);
  }

  const count = Math.min(
    OBSERVATION_DEBRIEF_DISCUSSION_TOPIC_MAX,
    Math.max(OBSERVATION_DEBRIEF_DISCUSSION_TOPIC_MIN, topics.length),
  );

  return topics.slice(0, count);
}
