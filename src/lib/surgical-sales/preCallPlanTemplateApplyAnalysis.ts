import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import {
  draftValueForStrategicPlanField,
  PRE_CALL_PLAN_STRATEGIC_TEMPLATE_MAPPINGS,
  templateValueForStrategicPlanField,
} from "@/lib/surgical-sales/preCallPlanStrategicTemplateMapping";

export type PreCallPlanTemplateApplySection = {
  label: string;
  draftKey: PreCallPlanFieldKey;
  templateValue: string | null;
  currentValue: string;
  /** Template provides content for this section. */
  hasTemplateContent: boolean;
  /** Rep has entered content in this field. */
  hasCurrentContent: boolean;
  /** Template would change a field that already has rep content. */
  wouldConflict: boolean;
  /** Would populate on fill-empty apply. */
  wouldFillOnBlankOnly: boolean;
};

/** Sections the playbook can populate, with fill vs conflict hints for preview and apply. */
export function buildPreCallPlanTemplateApplySections(
  draft: Record<PreCallPlanFieldKey, string>,
  template: PreCallPlanTemplate,
): PreCallPlanTemplateApplySection[] {
  return PRE_CALL_PLAN_STRATEGIC_TEMPLATE_MAPPINGS.map((mapping) => {
    const templateValue = templateValueForStrategicPlanField(template, mapping);
    const currentValue = draftValueForStrategicPlanField(draft, mapping);
    const hasTemplateContent = Boolean(templateValue);
    const hasCurrentContent = Boolean(currentValue.trim());
    const wouldConflict = hasTemplateContent && hasCurrentContent;
    const wouldFillOnBlankOnly = hasTemplateContent && !hasCurrentContent;
    return {
      label: mapping.label,
      draftKey: mapping.draftKey,
      templateValue,
      currentValue,
      hasTemplateContent,
      hasCurrentContent,
      wouldConflict,
      wouldFillOnBlankOnly,
    };
  }).filter((s) => s.hasTemplateContent || s.hasCurrentContent);
}

export function preCallPlanTemplateApplyConflicts(
  sections: PreCallPlanTemplateApplySection[],
): PreCallPlanTemplateApplySection[] {
  return sections.filter((s) => s.wouldConflict);
}

export function preCallPlanTemplateHasApplyConflicts(
  draft: Record<PreCallPlanFieldKey, string>,
  template: PreCallPlanTemplate,
): boolean {
  return preCallPlanTemplateApplyConflicts(buildPreCallPlanTemplateApplySections(draft, template)).length > 0;
}

export function preCallPlanTemplateSectionsWithContent(
  sections: PreCallPlanTemplateApplySection[],
): PreCallPlanTemplateApplySection[] {
  return sections.filter((s) => s.hasTemplateContent);
}
