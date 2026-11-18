import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import { trimOrNull } from "@/lib/surgical-sales/preCallPlanTemplateModel";

/**
 * Playbook template ↔ planned pre-call plan fields (source of truth on the engagement row).
 * Templates must not surface as separate suggested-goal / talking-points UI.
 */
export type PreCallPlanStrategicTemplateFieldMapping = {
  label: string;
  draftKey: PreCallPlanFieldKey;
  templateKey: keyof Pick<
    PreCallPlanTemplate,
    | "smartObjective"
    | "openingStatement"
    | "probes"
    | "toolsResources"
    | "valueHypothesis"
    | "plannedClose"
    | "suggestedNextStep"
  >;
};

export const PRE_CALL_PLAN_STRATEGIC_TEMPLATE_MAPPINGS: readonly PreCallPlanStrategicTemplateFieldMapping[] =
  [
    { label: "SMART objective", draftKey: "observation_goal", templateKey: "smartObjective" },
    {
      label: "Opening statement",
      draftKey: "pre_observation_impact_opening_statement",
      templateKey: "openingStatement",
    },
    { label: "Probes / questions", draftKey: "pre_observation_probes", templateKey: "probes" },
    { label: "Tools / resources", draftKey: "pre_observation_tools_resources", templateKey: "toolsResources" },
    { label: "Value hypothesis", draftKey: "pre_observation_value_hypothesis", templateKey: "valueHypothesis" },
    { label: "Planned close", draftKey: "pre_observation_planned_close", templateKey: "plannedClose" },
    {
      label: "Strategic notes",
      draftKey: "pre_observation_additional_notes",
      templateKey: "suggestedNextStep",
    },
  ];

/** Strategic plan keys populated from playbooks (excludes contextual hospital/surgeon). */
export const PRE_CALL_PLAN_STRATEGIC_DRAFT_KEYS: readonly PreCallPlanFieldKey[] =
  PRE_CALL_PLAN_STRATEGIC_TEMPLATE_MAPPINGS.map((m) => m.draftKey);

export function templateValueForStrategicPlanField(
  template: PreCallPlanTemplate,
  mapping: PreCallPlanStrategicTemplateFieldMapping,
): string | null {
  return trimOrNull(template[mapping.templateKey]);
}

export function draftValueForStrategicPlanField(
  draft: Record<PreCallPlanFieldKey, string>,
  mapping: PreCallPlanStrategicTemplateFieldMapping,
): string {
  return String(draft[mapping.draftKey] ?? "");
}

export function strategicMappingForDraftKey(
  draftKey: string,
): PreCallPlanStrategicTemplateFieldMapping | null {
  return PRE_CALL_PLAN_STRATEGIC_TEMPLATE_MAPPINGS.find((m) => m.draftKey === draftKey) ?? null;
}

/** Playbook content for a single plan field (null if no playbook selected or field empty in template). */
export function playbookValueForPlanField(
  template: PreCallPlanTemplate | null,
  draftKey: string,
): string | null {
  const mapping = strategicMappingForDraftKey(draftKey);
  if (!mapping || !template) return null;
  return templateValueForStrategicPlanField(template, mapping);
}
