import type { PrepareTacticalAiAssistActionId } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistActions";

/** Shown after an assist action is applied (chip replaced by status row). */
export const PREPARE_TACTICAL_AI_ASSIST_ACTIVATED: Record<PrepareTacticalAiAssistActionId, string> = {
  regenerate_goal: "Goal updated",
  tighten_asks: "Asks tightened",
  add_surgical_workflow_question: "Workflow Q added",
  add_access_question: "Access Q added",
  simplify_intro_call: "Intro optimized",
};

/** Revert control label per action. */
export const PREPARE_TACTICAL_AI_ASSIST_REVERT_LABEL: Record<PrepareTacticalAiAssistActionId, string> = {
  regenerate_goal: "Undo",
  tighten_asks: "Undo rewrite",
  add_surgical_workflow_question: "Remove",
  add_access_question: "Remove",
  simplify_intro_call: "Undo",
};

export const PREPARE_TACTICAL_AI_BADGE_ADDED = "AI added";
export const PREPARE_TACTICAL_AI_BADGE_MODIFIED = "AI modified";
