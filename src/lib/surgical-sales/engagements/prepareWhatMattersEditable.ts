import { resolveEngagementWorkflowMode } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import type { PrepareWhatMattersMostLineId } from "@/lib/surgical-sales/engagements/buildPrepareWhatMattersMost";
import { PREPARE_TODAY_LINE_LABELS } from "@/lib/surgical-sales/engagements/prepareFlowTerminology";

export const PREPARE_TODAY_MATTER_LINE_IDS: PrepareWhatMattersMostLineId[] = [
  "discovery_goal",
  "important_unknown",
  "relationship_risk",
  "next_step_opportunity",
];

/** User-facing labels on Prepare for Meeting today cards. */
export const PREPARE_TODAY_DISPLAY_LABELS = PREPARE_TODAY_LINE_LABELS;

export type PrepareTodayPlanFields = {
  observation_goal: string | null;
  pre_observation_probes: string | null;
  pre_observation_value_hypothesis: string | null;
  pre_observation_planned_close: string | null;
  pre_observation_additional_notes?: string | null;
  engagement_purpose: string | null;
  next_action: string | null;
};

function setFirstProbeLine(probes: string | null, firstLine: string | null): string | null {
  if (!firstLine) return probes?.trim() || null;
  const lines = (probes ?? "")
    .split(/\n/)
    .map((l) => l.replace(/^[-*•\d.]+\s*/, "").trim())
    .filter(Boolean);
  if (lines.length === 0) return firstLine;
  lines[0] = firstLine;
  return lines.join("\n");
}

export function buildPatchForTodayMatter(input: {
  lineId: PrepareWhatMattersMostLineId;
  value: string;
  planFields: PrepareTodayPlanFields;
  engagementType: string;
}): Record<string, string | null> {
  const trimmed = input.value.trim();
  const v = trimmed || null;
  const mode = resolveEngagementWorkflowMode(input.engagementType, null);

  if (mode === "lightweight") {
    switch (input.lineId) {
      case "discovery_goal":
        return { engagement_purpose: v };
      case "important_unknown":
        return {
          pre_observation_probes: setFirstProbeLine(input.planFields.pre_observation_probes, v),
        };
      case "relationship_risk":
        return { pre_observation_additional_notes: v };
      case "next_step_opportunity":
        return { next_action: v };
      default:
        return {};
    }
  }

  switch (input.lineId) {
    case "discovery_goal":
      return { observation_goal: v };
    case "important_unknown":
      return {
        pre_observation_probes: setFirstProbeLine(input.planFields.pre_observation_probes, v),
      };
    case "relationship_risk":
      return { pre_observation_value_hypothesis: v };
    case "next_step_opportunity":
      return { pre_observation_planned_close: v };
    default:
      return {};
  }
}

/** Saved engagement prep only — no suggested fallback. */
export function readTodayMatterSavedValueFromPlan(
  lineId: PrepareWhatMattersMostLineId,
  planFields: PrepareTodayPlanFields,
  engagementType: string,
): string {
  return readTodayMatterValueFromPlan(lineId, planFields, "", engagementType);
}

export function readTodayMatterValueFromPlan(
  lineId: PrepareWhatMattersMostLineId,
  planFields: PrepareTodayPlanFields,
  fallback: string,
  engagementType: string,
): string {
  const mode = resolveEngagementWorkflowMode(engagementType, null);
  const probes = planFields.pre_observation_probes ?? "";
  const firstProbe =
    probes
      .split(/\n/)
      .map((l) => l.trim())
      .find(Boolean) ?? "";

  if (mode === "lightweight") {
    switch (lineId) {
      case "discovery_goal":
        return planFields.engagement_purpose?.trim() || fallback;
      case "important_unknown":
        return firstProbe || fallback;
      case "relationship_risk":
        return (
          planFields.pre_observation_additional_notes?.trim() ||
          planFields.pre_observation_value_hypothesis?.trim() ||
          fallback
        );
      case "next_step_opportunity":
        return planFields.next_action?.trim() || fallback;
      default:
        return fallback;
    }
  }

  switch (lineId) {
    case "discovery_goal":
      return planFields.observation_goal?.trim() || fallback;
    case "important_unknown":
      return firstProbe || fallback;
    case "relationship_risk":
      return planFields.pre_observation_value_hypothesis?.trim() || fallback;
    case "next_step_opportunity":
      return planFields.pre_observation_planned_close?.trim() || fallback;
    default:
      return fallback;
  }
}
