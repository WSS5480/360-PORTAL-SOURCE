import type { PrepareWhatMattersMostLineId } from "@/lib/surgical-sales/engagements/buildPrepareWhatMattersMost";
import { resolveEngagementWorkflowMode } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import type { PrepareTacticalAiAssistActionId } from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistActions";
import {
  readTodayMatterValueFromPlan,
  type PrepareTodayPlanFields,
} from "@/lib/surgical-sales/engagements/prepareWhatMattersEditable";
import {
  diffAddedProbeLines,
  previewProbeLine,
  splitProbeLines,
} from "@/lib/surgical-sales/engagements/prepareTacticalAiAssistProbeUtils";

export type PrepareTacticalAiAssistApplyPayload = {
  patch: Record<string, string | null>;
  label: string;
  summary: string;
  undo: Record<string, string | null>;
  addedProbeLines: string[];
  /** Tighten ask — probes before rewrite (for before/after UI). */
  tightenBefore?: string[];
  tightenAfter?: string[];
  /** Discovery goal text before assist (for intro optimize / regenerate). */
  goalBefore?: string | null;
  goalAfter?: string | null;
};

export function buildAssistUndo(
  before: Record<string, string | null | undefined>,
  patch: Record<string, string | null>,
): Record<string, string | null> {
  const undo: Record<string, string | null> = {};
  for (const key of Object.keys(patch)) {
    const prev = before[key];
    undo[key] = prev == null || String(prev).trim() === "" ? null : String(prev);
  }
  return undo;
}

export function buildAssistChangeSummary(input: {
  action: PrepareTacticalAiAssistActionId;
  patch: Record<string, string | null>;
  beforeProbes: string | null;
  beforeGoal: string | null;
}): { summary: string; addedProbeLines: string[] } {
  const { action, patch } = input;
  const nextProbes = patch.pre_observation_probes ?? null;
  const added = diffAddedProbeLines(input.beforeProbes, nextProbes);

  switch (action) {
    case "tighten_asks": {
      const count = splitProbeLines(nextProbes).length;
      return {
        summary:
          count > 0
            ? `Tightened ${count} ask${count === 1 ? "" : "s"} into short field questions.`
            : "Tightened asks for field use.",
        addedProbeLines: [],
      };
    }
    case "add_surgical_workflow_question": {
      const line = added[0] ?? splitProbeLines(nextProbes).at(-1) ?? "";
      return {
        summary: line
          ? `Added workflow ask: “${previewProbeLine(line)}”`
          : "Added a surgical workflow probe.",
        addedProbeLines: added,
      };
    }
    case "add_access_question": {
      const line = added[0] ?? splitProbeLines(nextProbes).at(-1) ?? "";
      return {
        summary: line
          ? `Added access ask: “${previewProbeLine(line)}”`
          : "Added an OR / vendor access probe.",
        addedProbeLines: added,
      };
    }
    case "simplify_intro_call": {
      const askCount = splitProbeLines(nextProbes).length;
      const goalChanged = Boolean(patch.observation_goal ?? patch.engagement_purpose);
      const parts: string[] = [];
      if (goalChanged) parts.push("softened discovery focus for an intro call");
      if (askCount > 0) parts.push(`set ${askCount} relationship-building ask${askCount === 1 ? "" : "s"}`);
      return {
        summary:
          parts.length > 0
            ? `Optimized for intro call — ${parts.join(" and ")}.`
            : "Optimized tactical prep for an intro call.",
        addedProbeLines: added.length > 0 ? added : splitProbeLines(nextProbes),
      };
    }
    case "regenerate_goal": {
      const goal = patch.observation_goal ?? patch.engagement_purpose ?? "";
      return {
        summary: goal
          ? `Updated discovery focus: “${previewProbeLine(String(goal), 72)}”`
          : "Regenerated discovery focus from visit context.",
        addedProbeLines: [],
      };
    }
    default:
      return { summary: "Applied assist change.", addedProbeLines: added };
  }
}

/** Map persisted field keys to Refine Prep tactical section ids for highlight. */
export function tacticalSectionIdsForPatch(patch: Record<string, string | null>): string[] {
  const ids = new Set<string>();
  if ("observation_goal" in patch || "engagement_purpose" in patch) ids.add("primary_discovery_goal");
  if ("pre_observation_probes" in patch) ids.add("top_asks");
  if ("pre_observation_value_hypothesis" in patch) ids.add("relationship_risk");
  if ("pre_observation_planned_close" in patch || "next_action" in patch) ids.add("next_step_opportunity");
  if ("pre_observation_impact_opening_statement" in patch) ids.add("opening_angle");
  if ("pre_observation_tools_resources" in patch) ids.add("operational_unknowns");
  if ("pre_observation_additional_notes" in patch) ids.add("strategic_notes");
  return [...ids];
}

/** Apply assist patch to local today-card values for immediate UI feedback. */
export function todayValuesAfterAssistPatch(input: {
  patch: Record<string, string | null>;
  planFields: PrepareTodayPlanFields;
  engagementType: string;
  fallbacks: Record<PrepareWhatMattersMostLineId, string>;
}): Record<PrepareWhatMattersMostLineId, string> {
  const merged: PrepareTodayPlanFields = { ...input.planFields };
  for (const [key, value] of Object.entries(input.patch)) {
    if (key in merged) {
      (merged as Record<string, string | null>)[key] = value;
    }
  }
  const mode = resolveEngagementWorkflowMode(input.engagementType, null);
  const lineIds: PrepareWhatMattersMostLineId[] = [
    "discovery_goal",
    "important_unknown",
    "relationship_risk",
    "next_step_opportunity",
  ];
  return Object.fromEntries(
    lineIds.map((id) => [
      id,
      readTodayMatterValueFromPlan(id, merged, input.fallbacks[id] ?? "", input.engagementType),
    ]),
  ) as Record<PrepareWhatMattersMostLineId, string>;
}

export function todayLineIdsForAssistPatch(
  patch: Record<string, string | null>,
  engagementType: string,
): PrepareWhatMattersMostLineId[] {
  const mode = resolveEngagementWorkflowMode(engagementType, null);
  const ids: PrepareWhatMattersMostLineId[] = [];
  if ("observation_goal" in patch || "engagement_purpose" in patch) ids.push("discovery_goal");
  if ("pre_observation_probes" in patch) ids.push("important_unknown");
  if ("pre_observation_value_hypothesis" in patch || "pre_observation_additional_notes" in patch) {
    ids.push("relationship_risk");
  }
  if ("pre_observation_planned_close" in patch || "next_action" in patch) ids.push("next_step_opportunity");
  if (mode === "lightweight" && "pre_observation_probes" in patch && !ids.includes("important_unknown")) {
    ids.push("important_unknown");
  }
  return ids;
}
