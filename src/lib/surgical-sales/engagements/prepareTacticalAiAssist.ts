import { resolveEngagementWorkflowMode } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";

import { INTRO_CALL_DISCOVERY_CORE } from "@/lib/surgical-sales/engagements/introCallDiscoveryFocus";

import { INTRO_CALL_OBSERVATION_QUALIFICATION_DISCOVERY } from "@/lib/surgical-sales/engagements/introCallPreparationContent";

import { loadPrepareForMeetingViewForActor } from "@/lib/surgical-sales/engagements/loadPrepareForMeetingView";

import { formatAskForFieldGuide } from "@/lib/surgical-sales/engagements/prepareFieldConversationAsk";

import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";

import {

  buildAssistChangeSummary,

  buildAssistUndo,

  type PrepareTacticalAiAssistApplyPayload,

} from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistApply";

import {

  isSimilarProbeLine,

  joinProbeLines,

  splitProbeLines,

} from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistProbeUtils";

import {

  PREPARE_TACTICAL_AI_ASSIST_TITLES,

  type PrepareTacticalAiAssistActionId,

} from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistActions";



export type { PrepareTacticalAiAssistActionId } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistActions";

export type { PrepareTacticalAiAssistApplyPayload } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistApply";

export {

  PREPARE_TACTICAL_AI_ASSIST_LABELS,

  PREPARE_TACTICAL_AI_ASSIST_TITLES,

  assistActionsForPrepareAsks,

  assistActionsForPrepareTodayGoal,

  assistActionsForTacticalSection,

} from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistActions";

export { splitProbeLines, joinProbeLines } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistProbeUtils";



const FALLBACK_WORKFLOW_PROBE =

  "Which high-volume procedure workflow should we understand first — and where is the friction?";

const FALLBACK_ACCESS_PROBE = INTRO_CALL_OBSERVATION_QUALIFICATION_DISCOVERY[1];



function appendProbe(probes: string | null, line: string): string {

  const next = formatAskForFieldGuide(line) || line.trim();

  if (!next) return probes?.trim() || "";

  const lines = splitProbeLines(probes);

  if (lines.some((l) => isSimilarProbeLine(l, next))) return joinProbeLines(lines) ?? "";

  return joinProbeLines([...lines, next]) ?? next;

}



function tightenProbeLines(lines: string[]): string[] {

  const seen = new Set<string>();

  const out: string[] = [];

  for (const raw of lines) {

    const q = formatAskForFieldGuide(raw);

    if (!q) continue;

    const key = q.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);

    out.push(q);

    if (out.length >= 3) break;

  }

  return out;

}



const WORKFLOW_TOPIC_PATTERN =

  /workflow|procedure|fixation|closure|hernia|mesh|volume|sequence|habit|friction|bottleneck|OR\b|operative/i;



export type RunPrepareTacticalAiAssistResult =

  | ({ ok: true } & PrepareTacticalAiAssistApplyPayload)

  | { ok: false; message: string; status: 400 | 404 | 500 };



function planSnapshot(plan: {

  observation_goal: string | null;

  pre_observation_probes: string | null;

  pre_observation_value_hypothesis: string | null;

  pre_observation_planned_close: string | null;

  engagement_purpose: string | null;

  next_action: string | null;

}): Record<string, string | null> {

  return {

    observation_goal: plan.observation_goal,

    pre_observation_probes: plan.pre_observation_probes,

    pre_observation_value_hypothesis: plan.pre_observation_value_hypothesis,

    pre_observation_planned_close: plan.pre_observation_planned_close,

    engagement_purpose: plan.engagement_purpose,

    next_action: plan.next_action,

  };

}



function successResult(input: {
  action: PrepareTacticalAiAssistActionId;
  patch: Record<string, string | null>;
  before: Record<string, string | null>;
  beforeProbes: string | null;
  beforeGoal: string | null;
  tightenBefore?: string[];
  tightenAfter?: string[];
}): RunPrepareTacticalAiAssistResult {
  const { summary, addedProbeLines } = buildAssistChangeSummary({
    action: input.action,
    patch: input.patch,
    beforeProbes: input.beforeProbes,
    beforeGoal: input.beforeGoal,
  });
  const goalKey =
    "observation_goal" in input.patch
      ? "observation_goal"
      : "engagement_purpose" in input.patch
        ? "engagement_purpose"
        : null;
  const goalAfter =
    goalKey != null ? String(input.patch[goalKey] ?? "").trim() || null : null;
  return {
    ok: true,
    patch: input.patch,
    label: PREPARE_TACTICAL_AI_ASSIST_TITLES[input.action],
    summary,
    undo: buildAssistUndo(input.before, input.patch),
    addedProbeLines,
    tightenBefore: input.tightenBefore,
    tightenAfter: input.tightenAfter,
    goalBefore: input.beforeGoal?.trim() ? input.beforeGoal : null,
    goalAfter,
  };
}



export async function runPrepareTacticalAiAssist(input: {

  engagementId: string;

  userId: string;

  action: PrepareTacticalAiAssistActionId;

}): Promise<RunPrepareTacticalAiAssistResult> {

  const loaded = await loadPrepareForMeetingViewForActor(input.engagementId, input.userId);

  if (!loaded.ok) {

    return { ok: false, message: loaded.error, status: loaded.status };

  }



  const prepare = loaded.prepare;

  const engagementType = prepare.upcoming_engagement.engagement_type;

  const mode = resolveEngagementWorkflowMode(engagementType, null);

  const plan = prepare.plan_fields;

  const before = planSnapshot(plan);

  const isIntro = normalizeEngagementType(engagementType) === "intro_call";



  if (input.action === "simplify_intro_call" && !isIntro) {

    return {

      ok: false,

      message: "Optimize for Intro Call applies to intro calls only.",

      status: 400,

    };

  }



  const goalKey = mode === "lightweight" ? "engagement_purpose" : "observation_goal";

  const probes = plan.pre_observation_probes;

  const beforeGoal = String(before[goalKey] ?? "");



  switch (input.action) {

    case "regenerate_goal": {

      const goal = prepare.suggested_goal.goal?.trim() || null;

      if (!goal) {

        return { ok: false, message: "No suggested goal available for this visit.", status: 400 };

      }

      const patch = { [goalKey]: goal };

      return successResult({

        action: input.action,

        patch,

        before,

        beforeProbes: probes,

        beforeGoal,

      });

    }

    case "tighten_asks": {
      const source =
        splitProbeLines(probes).length > 0
          ? splitProbeLines(probes)
          : prepare.suggested_talking_points.points;
      const beforeLines = splitProbeLines(probes);
      const tightened = tightenProbeLines(source);
      if (tightened.length === 0) {
        return { ok: false, message: "No asks to tighten yet — add a probe in Field Briefing first.", status: 400 };
      }
      const patch = { pre_observation_probes: joinProbeLines(tightened) };
      return successResult({
        action: input.action,
        patch,
        before,
        beforeProbes: probes,
        beforeGoal,
        tightenBefore: beforeLines.length > 0 ? beforeLines : source.slice(0, 3),
        tightenAfter: tightened,
      });
    }

    case "add_surgical_workflow_question": {

      const existing = splitProbeLines(probes);

      const candidate =

        prepare.suggested_talking_points.points.find(

          (p) => WORKFLOW_TOPIC_PATTERN.test(p) && !existing.some((e) => isSimilarProbeLine(e, p)),

        ) ??

        prepare.suggested_talking_points.points.find(

          (p) => !existing.some((e) => isSimilarProbeLine(e, p)),

        ) ??

        FALLBACK_WORKFLOW_PROBE;

      const patch = { pre_observation_probes: appendProbe(probes, candidate) };

      return successResult({

        action: input.action,

        patch,

        before,

        beforeProbes: probes,

        beforeGoal,

      });

    }

    case "add_access_question": {

      const existing = splitProbeLines(probes);

      const pool = [...INTRO_CALL_OBSERVATION_QUALIFICATION_DISCOVERY];

      const candidate =

        pool.find((q) => !existing.some((e) => isSimilarProbeLine(e, q))) ?? FALLBACK_ACCESS_PROBE;

      const patch = { pre_observation_probes: appendProbe(probes, candidate) };

      return successResult({

        action: input.action,

        patch,

        before,

        beforeProbes: probes,

        beforeGoal,

      });

    }

    case "simplify_intro_call": {
      const goal =
        prepare.suggested_goal.goal?.trim() ||
        "Build enough trust to confirm whether OR observation fits their highest-volume workflows.";
      const introAsks = tightenProbeLines(
        INTRO_CALL_DISCOVERY_CORE.slice(0, 4).map((q) => formatAskForFieldGuide(q) || q),
      );
      const patch = {
        [goalKey]: goal.length > 160 ? `${goal.slice(0, 157)}…` : goal,
        pre_observation_probes: joinProbeLines(introAsks.slice(0, 3)),
      };
      return successResult({
        action: input.action,
        patch,
        before,
        beforeProbes: probes,
        beforeGoal,
        tightenBefore: splitProbeLines(probes),
        tightenAfter: introAsks.slice(0, 3),
      });
    }

    default:

      return { ok: false, message: "Unknown assist action", status: 400 };

  }

}


