import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";

export type PrepareTacticalAiAssistActionId =
  | "regenerate_goal"
  | "tighten_asks"
  | "add_surgical_workflow_question"
  | "add_access_question"
  | "simplify_intro_call";

export const PREPARE_TACTICAL_AI_ASSIST_LABELS: Record<PrepareTacticalAiAssistActionId, string> = {
  regenerate_goal: "Regenerate goal",
  tighten_asks: "Tighten ask",
  add_surgical_workflow_question: "Add workflow Q",
  add_access_question: "Add access Q",
  simplify_intro_call: "Optimize for Intro Call",
};

export const PREPARE_TACTICAL_AI_ASSIST_TITLES: Record<PrepareTacticalAiAssistActionId, string> = {
  regenerate_goal: "Regenerate goal from current context",
  tighten_asks: "Tighten discovery asks into short field questions",
  add_surgical_workflow_question: "Add surgical workflow question",
  add_access_question: "Add OR / vendor access question",
  simplify_intro_call: "Optimize for Intro Call — soften goal and asks for early relationship building",
};

export function assistActionsForTacticalSection(
  sectionId: string,
  engagementType: string,
): PrepareTacticalAiAssistActionId[] {
  const type = normalizeEngagementType(engagementType) ?? engagementType;
  const isIntro = type === "intro_call";

  switch (sectionId) {
    case "primary_discovery_goal":
      return isIntro ? ["regenerate_goal", "simplify_intro_call"] : ["regenerate_goal"];
    case "top_asks":
      return isIntro
        ? [
            "tighten_asks",
            "add_surgical_workflow_question",
            "add_access_question",
            "simplify_intro_call",
          ]
        : ["tighten_asks", "add_surgical_workflow_question", "add_access_question"];
    default:
      return [];
  }
}

export function assistActionsForPrepareTodayGoal(_engagementType: string): PrepareTacticalAiAssistActionId[] {
  return [];
}

export function assistActionsForPrepareAsks(_engagementType: string): PrepareTacticalAiAssistActionId[] {
  return [];
}
