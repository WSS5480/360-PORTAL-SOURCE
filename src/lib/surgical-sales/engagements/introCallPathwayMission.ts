import type { PrepareKnownIntelligence } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import { toScannableIntelligenceLine } from "@/lib/surgical-sales/engagements/prepareForMeetingKnownIntelligence";
import {
  bootstrapTacticalAsksFromProbes,
  createTacticalAsk,
  parsePrepareTacticalAsksDocument,
  type PrepareTacticalAsk,
} from "@/lib/surgical-sales/engagements/prepareTacticalAsks";
import { splitProbeLines } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistProbeUtils";
import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  INTRO_CALL_START_MISSION_OBJECTIVE,
  INTRO_CALL_START_MISSION_PRIMARY_QUESTION,
  INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS,
} from "@/lib/surgical-sales/engagements/startMissionConfig";

export {
  INTRO_CALL_START_MISSION_OBJECTIVE,
  INTRO_CALL_START_MISSION_PRIMARY_QUESTION,
  INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS,
};

export const INTRO_CALL_PATHWAY_OBJECTIVE_WHY =
  "Learn their workflow through observation before any product talk — permission from the surgeon first, logistics handled separately.";

export function isIntroCallPathwayMission(engagementType: string): boolean {
  return normalizeEngagementType(engagementType) === "intro_call";
}

export function buildIntroCallPathwaySuggestedGoal(): { goal: string; why: string } {
  return {
    goal: INTRO_CALL_START_MISSION_OBJECTIVE,
    why: INTRO_CALL_PATHWAY_OBJECTIVE_WHY,
  };
}

const ENRICHMENT_KEYWORDS =
  /observation|workflow|procedure|case mix|friction|technique|volume|fixation|closure|graft|reinforcement|calibration|fit/i;

function enrichIntroCallQuestionsFromIntelligence(intel: PrepareKnownIntelligence): string[] {
  const enriched: string[] = [];
  for (const bullet of intel.bullets) {
    const combined = `${bullet.label} ${bullet.value}`.trim();
    if (!ENRICHMENT_KEYWORDS.test(combined)) continue;
    const line = toScannableIntelligenceLine(
      bullet.value ? `${bullet.label}: ${bullet.value}` : bullet.label,
      160,
    );
    if (line && !enriched.some((e) => e.toLowerCase() === line.toLowerCase())) {
      enriched.push(line);
    }
  }
  if (intel.last_key_insight?.body) {
    const insight = toScannableIntelligenceLine(intel.last_key_insight.body, 140);
    if (insight && ENRICHMENT_KEYWORDS.test(insight)) {
      enriched.push(`Known: ${insight}`);
    }
  }
  return enriched.slice(0, 3);
}

export function buildIntroCallPathwayTalkingPoints(intel: PrepareKnownIntelligence, max = 8): string[] {
  const content = buildIntroCallFieldBriefingContent(intel);
  return [content.priorityQuestion, ...content.followUpQuestions].slice(0, max);
}

export type IntroCallFieldBriefingContent = {
  missionGoal: string;
  priorityQuestion: string;
  followUpQuestions: string[];
};

const CASE_SELECTION_KNOWN_PATTERN =
  /which case|case type|comfortable.*observe|observe.*case|observation on|first observation|lap ventral|hernia mix|wound volume|extremity|bariatric|foregut/i;
const OBSERVATION_FOCUS_KNOWN_PATTERN =
  /pay attention|want us to notice|watch for|capture during observation|what to look|observe.*workflow/i;
const WORKFLOW_FRICTION_KNOWN_PATTERN =
  /workflow friction|friction show|slows cases|adds time|coordination friction|throughput|turnover friction/i;

function intelligenceCorpus(intel: PrepareKnownIntelligence): string {
  const parts = intel.bullets.map((b) => `${b.label} ${b.value}`);
  if (intel.last_key_insight?.body) parts.push(intel.last_key_insight.body);
  return parts.join(" ");
}

function isDuplicateQuestion(candidate: string, existing: string[]): boolean {
  const normalized = candidate.trim().toLowerCase();
  return existing.some((q) => q.trim().toLowerCase() === normalized);
}

/** Fixed pathway briefing — drops answered follow-ups as intelligence confidence grows. */
export function buildIntroCallFieldBriefingContent(
  intel: PrepareKnownIntelligence,
): IntroCallFieldBriefingContent {
  const corpus = intelligenceCorpus(intel);
  const followUpQuestions: string[] = [];

  if (!CASE_SELECTION_KNOWN_PATTERN.test(corpus)) {
    followUpQuestions.push(INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS[0]!);
  }
  if (!OBSERVATION_FOCUS_KNOWN_PATTERN.test(corpus)) {
    followUpQuestions.push(INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS[1]!);
  }
  if (!WORKFLOW_FRICTION_KNOWN_PATTERN.test(corpus)) {
    followUpQuestions.push(INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS[2]!);
  }

  for (const line of enrichIntroCallQuestionsFromIntelligence(intel)) {
    const trimmed = line.trim();
    if (!trimmed.includes("?")) continue;
    if (isDuplicateQuestion(trimmed, followUpQuestions)) continue;
    followUpQuestions.push(trimmed);
  }

  return {
    missionGoal: INTRO_CALL_START_MISSION_OBJECTIVE,
    priorityQuestion: INTRO_CALL_START_MISSION_PRIMARY_QUESTION,
    followUpQuestions,
  };
}

/** Ordered queue for field execution — priority question first, then pathway follow-ups. */
export function buildIntroCallQuestionQueue(intel: PrepareKnownIntelligence): string[] {
  const content = buildIntroCallFieldBriefingContent(intel);
  return [content.priorityQuestion, ...content.followUpQuestions];
}

/** Mission goal for intro-call briefing UI (stored goal wins over pathway default). */
export function resolveIntroCallMissionGoalDisplay(observationGoal: string | null | undefined): string {
  const stored = String(observationGoal ?? "").trim();
  return stored || INTRO_CALL_START_MISSION_OBJECTIVE;
}

export function bootstrapIntroCallPathwayTacticalAsks(input: {
  stored: unknown;
  knownIntelligence: PrepareKnownIntelligence;
  probes?: string | null;
}): PrepareTacticalAsk[] {
  const parsed = parsePrepareTacticalAsksDocument(input.stored);
  if (parsed && parsed.asks.length > 0) {
    return parsed.asks;
  }

  const pathwayTalkingPoints = buildIntroCallPathwayTalkingPoints(input.knownIntelligence);
  if (splitProbeLines(input.probes).length > 0) {
    return bootstrapTacticalAsksFromProbes({
      stored: input.stored,
      probes: input.probes ?? null,
      suggestedPoints: pathwayTalkingPoints,
    });
  }

  const base = [
    INTRO_CALL_START_MISSION_PRIMARY_QUESTION,
    ...INTRO_CALL_START_MISSION_SECONDARY_QUESTIONS,
  ];
  const enrichment = enrichIntroCallQuestionsFromIntelligence(input.knownIntelligence);

  return [...base, ...enrichment].map((text, priority) =>
    createTacticalAsk({ text, source: "ai_recommended", priority }),
  );
}

export function mergeIntroCallPathwayProbes(
  stored: unknown,
  probes: string | null,
  knownIntelligence: PrepareKnownIntelligence,
): PrepareTacticalAsk[] {
  return bootstrapIntroCallPathwayTacticalAsks({
    stored,
    knownIntelligence,
    probes,
  });
}
