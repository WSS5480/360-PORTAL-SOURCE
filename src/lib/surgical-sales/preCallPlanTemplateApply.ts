import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import { templateHasPlanContent, trimOrNull } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import {
  PRE_CALL_PLAN_STRATEGIC_TEMPLATE_MAPPINGS,
  templateValueForStrategicPlanField,
} from "@/lib/surgical-sales/preCallPlanStrategicTemplateMapping";

/**
 * Copy template values into engagement pre-call plan fields (does not modify the template row).
 * @param mode `fill_empty` — only set blank draft fields; `overwrite` — set all fields the template provides.
 */
export function applyPreCallPlanTemplateToDraft(
  draft: Record<PreCallPlanFieldKey, string>,
  template: PreCallPlanTemplate,
  mode: "fill_empty" | "overwrite" = "overwrite",
): Record<PreCallPlanFieldKey, string> {
  const next = { ...draft };

  for (const mapping of PRE_CALL_PLAN_STRATEGIC_TEMPLATE_MAPPINGS) {
    const value = templateValueForStrategicPlanField(template, mapping);
    if (!value) continue;
    if (mode === "fill_empty" && String(next[mapping.draftKey] ?? "").trim()) continue;
    next[mapping.draftKey] = value;
  }

  return next;
}

export function templatePlanContentFromDraft(
  draft: Record<PreCallPlanFieldKey, string>,
): Pick<
  PreCallPlanTemplate,
  | "smartObjective"
  | "openingStatement"
  | "probes"
  | "toolsResources"
  | "valueHypothesis"
  | "plannedClose"
  | "suggestedNextStep"
> {
  return {
    smartObjective: trimOrNull(draft.observation_goal),
    openingStatement: trimOrNull(draft.pre_observation_impact_opening_statement),
    probes: trimOrNull(draft.pre_observation_probes),
    toolsResources: trimOrNull(draft.pre_observation_tools_resources),
    valueHypothesis: trimOrNull(draft.pre_observation_value_hypothesis),
    plannedClose: trimOrNull(draft.pre_observation_planned_close),
    suggestedNextStep: trimOrNull(draft.pre_observation_additional_notes),
  };
}

export function templateHasContentFromDraft(draft: Record<PreCallPlanFieldKey, string>): boolean {
  const c = templatePlanContentFromDraft(draft);
  return templateHasPlanFields(c);
}

export function templateHasPlanFields(input: {
  smartObjective?: string | null;
  openingStatement?: string | null;
  probes?: string | null;
  toolsResources?: string | null;
  valueHypothesis?: string | null;
  plannedClose?: string | null;
  suggestedNextStep?: string | null;
}): boolean {
  return Boolean(
    trimOrNull(input.smartObjective) ||
      trimOrNull(input.openingStatement) ||
      trimOrNull(input.probes) ||
      trimOrNull(input.toolsResources) ||
      trimOrNull(input.valueHypothesis) ||
      trimOrNull(input.plannedClose) ||
      trimOrNull(input.suggestedNextStep),
  );
}

/** @deprecated Use templateHasPlanFields or templateHasPlanContent */
export function templateHasContent(template: {
  observation_goal?: string | null;
  smart_objective?: string | null;
  smartObjective?: string | null;
  suggested_next_step?: string | null;
  suggestedNextStep?: string | null;
  [key: string]: string | null | undefined;
}): boolean {
  return templateHasPlanContent({
    smartObjective: template.smartObjective ?? template.smart_objective ?? template.observation_goal,
    openingStatement:
      (template.opening_statement as string | null | undefined) ??
      (template.pre_observation_impact_opening_statement as string | null | undefined),
    probes: (template.probes as string | null | undefined) ?? (template.pre_observation_probes as string | null | undefined),
    toolsResources:
      (template.tools_resources as string | null | undefined) ??
      (template.pre_observation_tools_resources as string | null | undefined),
    valueHypothesis:
      (template.value_hypothesis as string | null | undefined) ??
      (template.pre_observation_value_hypothesis as string | null | undefined),
    plannedClose:
      (template.planned_close as string | null | undefined) ??
      (template.pre_observation_planned_close as string | null | undefined),
    suggestedNextStep: template.suggestedNextStep ?? template.suggested_next_step,
  });
}
