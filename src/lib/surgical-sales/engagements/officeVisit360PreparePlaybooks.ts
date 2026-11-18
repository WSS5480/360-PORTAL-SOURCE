import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import { isGenericTemplate } from "@/lib/surgical-sales/preCallPlanTemplateTags";

export const OFFICE_VISIT_360_PREPARE_PLAYBOOK_PREFIX = "360 Experience — ";

export const OFFICE_VISIT_360_PREPARE_PLAYBOOK_ALL_PRODUCTS_NAME = "360 Experience — All products";

export function isOfficeVisit360PreparePlaybookName(name: string): boolean {
  return name.trim().startsWith(OFFICE_VISIT_360_PREPARE_PLAYBOOK_PREFIX);
}

export function isOfficeVisit360PreparePlaybookTemplate(template: PreCallPlanTemplate): boolean {
  return (
    normalizeEngagementType(template.engagementType) === "office_visit_360" &&
    isOfficeVisit360PreparePlaybookName(template.name)
  );
}

export function isOfficeVisit360AllProductsPlaybook(template: PreCallPlanTemplate): boolean {
  return (
    isOfficeVisit360PreparePlaybookTemplate(template) &&
    (template.name.trim() === OFFICE_VISIT_360_PREPARE_PLAYBOOK_ALL_PRODUCTS_NAME ||
      isGenericTemplate(template.tags ?? []))
  );
}

export function officeVisit360PreparePlaybookDisplayLabel(template: PreCallPlanTemplate): string {
  if (isOfficeVisit360AllProductsPlaybook(template)) return "All products";
  const suffix = template.name.trim().slice(OFFICE_VISIT_360_PREPARE_PLAYBOOK_PREFIX.length);
  return suffix || template.productLine;
}

export function filterOfficeVisit360PreparePlaybooks(templates: PreCallPlanTemplate[]): PreCallPlanTemplate[] {
  return templates.filter(isOfficeVisit360PreparePlaybookTemplate);
}

export function officeVisit360PreparePlaybooksForPicker(templates: PreCallPlanTemplate[]): PreCallPlanTemplate[] {
  return filterOfficeVisit360PreparePlaybooks(templates);
}
