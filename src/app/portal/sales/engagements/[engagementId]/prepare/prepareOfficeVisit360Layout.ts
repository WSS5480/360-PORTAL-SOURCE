import type { EngagementWorkflowFieldConfig } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import type { OfficeVisit360PrepareFieldKey } from "@/lib/surgical-sales/engagements/officeVisit360PrepareFields";

export type OfficeVisit360PlanSection = {
  id: "experience";
  label: string;
  hint: string;
  keys: readonly OfficeVisit360PrepareFieldKey[];
};

export const OFFICE_VISIT_360_PREPARE_PLAN_SECTIONS: OfficeVisit360PlanSection[] = [
  {
    id: "experience",
    label: "Plan the 360 Experience",
    hint: "What you need to accomplish and what to cover in the sim lab.",
    keys: ["observation_goal", "sim_lab_focus"],
  },
];

export function groupOfficeVisit360PlanFields(
  fields: EngagementWorkflowFieldConfig[],
): Array<{ section: OfficeVisit360PlanSection; fields: EngagementWorkflowFieldConfig[] }> {
  const byKey = new Map(fields.map((field) => [field.key, field]));

  return OFFICE_VISIT_360_PREPARE_PLAN_SECTIONS.map((section) => {
    const sectionFields = section.keys
      .map((key) => byKey.get(key))
      .filter((field): field is EngagementWorkflowFieldConfig => Boolean(field));
    return { section, fields: sectionFields };
  }).filter((entry) => entry.fields.length > 0);
}
