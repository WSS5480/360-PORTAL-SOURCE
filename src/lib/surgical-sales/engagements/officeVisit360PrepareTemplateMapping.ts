import type { OfficeVisit360FieldKey } from "@/lib/surgical-sales/engagements/officeVisit360Workflow";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import { trimOrNull } from "@/lib/surgical-sales/preCallPlanTemplateModel";

export type OfficeVisit360TemplateFieldMapping = {
  label: string;
  draftKey: OfficeVisit360FieldKey;
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

/** Playbook columns → 360 Experience prepare fields (two questions on the prepare screen). */
export const OFFICE_VISIT_360_TEMPLATE_MAPPINGS: readonly OfficeVisit360TemplateFieldMapping[] = [
  { label: "Visit objective", draftKey: "observation_goal", templateKey: "smartObjective" },
  { label: "Sim lab focus", draftKey: "sim_lab_focus", templateKey: "probes" },
];

export function officeVisit360MappingForDraftKey(
  draftKey: string,
): OfficeVisit360TemplateFieldMapping | null {
  return OFFICE_VISIT_360_TEMPLATE_MAPPINGS.find((m) => m.draftKey === draftKey) ?? null;
}

export function playbookValueForOfficeVisit360Field(
  template: PreCallPlanTemplate | null,
  draftKey: string,
): string | null {
  const mapping = officeVisit360MappingForDraftKey(draftKey);
  if (!mapping || !template) return null;

  return trimOrNull(template[mapping.templateKey]);
}
