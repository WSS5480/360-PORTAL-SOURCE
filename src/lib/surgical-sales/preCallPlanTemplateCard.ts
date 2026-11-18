import type { PreCallPlanTemplate } from "@/lib/surgical-sales/preCallPlanTemplateModel";
import { ENGAGEMENT_TYPE_LABELS } from "@/lib/surgical-sales/engagements/engagementTypes";
import { formatFilterSlugLabel } from "@/lib/surgical-sales/preCallPlanTemplateSuggest";
import {
  templateProcedureSlug,
  templateSpecialtySlugs,
} from "@/lib/surgical-sales/preCallPlanTemplateTags";

import { PRE_CALL_PLAN_STRATEGIC_TEMPLATE_MAPPINGS } from "@/lib/surgical-sales/preCallPlanStrategicTemplateMapping";

const SECTION_FIELDS = PRE_CALL_PLAN_STRATEGIC_TEMPLATE_MAPPINGS.map((m) => ({
  key: m.templateKey,
  label: m.label,
}));

export function templateObjectiveSummary(template: PreCallPlanTemplate, maxLen = 120): string {
  const text =
    String(template.smartObjective ?? "").trim() ||
    String(template.procedureFocus ?? "").trim() ||
    String(template.description ?? "").trim();
  if (!text) return "No objective summary";
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

export function templateIncludedSections(template: PreCallPlanTemplate): string[] {
  return SECTION_FIELDS.filter((f) => String(template[f.key] ?? "").trim()).map((f) => f.label);
}

export function templateTagLabels(template: PreCallPlanTemplate): string[] {
  const out: string[] = [];
  for (const slug of templateSpecialtySlugs(template.tags)) {
    out.push(formatFilterSlugLabel(slug));
  }
  const proc = templateProcedureSlug(template.tags) || String(template.procedureFocus ?? "").trim();
  if (proc && proc !== "general") {
    const label = formatFilterSlugLabel(proc);
    if (!out.includes(label)) out.push(label);
  }
  return out.slice(0, 4);
}

export function templateEngagementLabel(template: PreCallPlanTemplate): string {
  return ENGAGEMENT_TYPE_LABELS[template.engagementType] ?? template.engagementType;
}
