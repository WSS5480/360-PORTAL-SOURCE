import { normalizeEngagementType } from "@/lib/surgical-sales/engagements/engagementTypes";
import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import { isGenericTemplate } from "@/lib/surgical-sales/preCallPlanTemplateTags";
import {
  PRE_CALL_PLAN_PRODUCT_LINES,
  type PreCallPlanProductLine,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";

export const INTRO_CALL_PREPARE_PLAYBOOK_PREFIX = "Intro Call — ";

export const INTRO_CALL_PREPARE_PLAYBOOK_ALL_PRODUCTS_NAME = "Intro Call — All products";

export function isIntroCallPreparePlaybookName(name: string): boolean {
  return name.trim().startsWith(INTRO_CALL_PREPARE_PLAYBOOK_PREFIX);
}

export function isIntroCallPreparePlaybookTemplate(template: PreCallPlanTemplate): boolean {
  return (
    normalizeEngagementType(template.engagementType) === "intro_call" &&
    isIntroCallPreparePlaybookName(template.name)
  );
}

export function isIntroCallAllProductsPlaybook(template: PreCallPlanTemplate): boolean {
  return (
    isIntroCallPreparePlaybookTemplate(template) &&
    (template.name.trim() === INTRO_CALL_PREPARE_PLAYBOOK_ALL_PRODUCTS_NAME ||
      isGenericTemplate(template.tags ?? []))
  );
}

export function introCallPreparePlaybookDisplayLabel(template: PreCallPlanTemplate): string {
  if (isIntroCallAllProductsPlaybook(template)) return "All products";
  const suffix = template.name.trim().slice(INTRO_CALL_PREPARE_PLAYBOOK_PREFIX.length);
  return suffix || template.productLine;
}

export function filterIntroCallPreparePlaybooks(templates: PreCallPlanTemplate[]): PreCallPlanTemplate[] {
  return templates.filter(isIntroCallPreparePlaybookTemplate);
}

export function sortIntroCallPreparePlaybooks(templates: PreCallPlanTemplate[]): PreCallPlanTemplate[] {
  const productOrder = new Map(PRE_CALL_PLAN_PRODUCT_LINES.map((line, index) => [line, index]));

  return [...templates].sort((a, b) => {
    const aAll = isIntroCallAllProductsPlaybook(a);
    const bAll = isIntroCallAllProductsPlaybook(b);
    if (aAll !== bAll) return aAll ? -1 : 1;

    const aIndex = productOrder.get(a.productLine as PreCallPlanProductLine) ?? 99;
    const bIndex = productOrder.get(b.productLine as PreCallPlanProductLine) ?? 99;
    if (aIndex !== bIndex) return aIndex - bIndex;

    return a.name.localeCompare(b.name);
  });
}

export function introCallPreparePlaybooksForPicker(templates: PreCallPlanTemplate[]): PreCallPlanTemplate[] {
  return sortIntroCallPreparePlaybooks(filterIntroCallPreparePlaybooks(templates));
}
