/**
 * Canonical Pre-Call Plan template model.
 * DB: sales_pre_call_plan_templates (snake_case)
 * API: camelCase JSON via serializePreCallPlanTemplate()
 *
 * Applying a template copies values into the engagement Pre-Call Plan only.
 * Engagement.pre_call_plan_template_id records which template was applied (reporting).
 */

import {
  normalizeTemplateEngagementType,
  type PreCallPlanProductLine,
  type PreCallPlanTemplateEngagementType,
} from "@/lib/surgical-sales/preCallPlanTemplateTypes";
import {
  normalizePreCallPlanTemplateStatus,
  type PreCallPlanTemplateStatus,
} from "@/lib/surgical-sales/preCallPlanTemplateStatus";

/** Canonical template shape (application / API). */
export type PreCallPlanTemplate = {
  id: string;
  name: string;
  productLine: PreCallPlanProductLine;
  engagementType: PreCallPlanTemplateEngagementType;
  procedureFocus: string | null;
  smartObjective: string | null;
  openingStatement: string | null;
  probes: string | null;
  toolsResources: string | null;
  valueHypothesis: string | null;
  plannedClose: string | null;
  suggestedNextStep: string | null;
  tags: string[];
  status: PreCallPlanTemplateStatus;
  isSystemTemplate: boolean;
  isFavorite: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** Custom templates only */
  duplicatedFromId?: string | null;
  /** Short summary; mirrors procedureFocus when seeded */
  description?: string | null;
};

export type PreCallPlanTemplateDbRow = {
  id: string;
  name: string;
  description: string | null;
  product_line: string;
  template_engagement_type: string;
  procedure_focus: string | null;
  smart_objective: string | null;
  opening_statement: string | null;
  probes: string | null;
  tools_resources: string | null;
  value_hypothesis: string | null;
  planned_close: string | null;
  suggested_next_step: string | null;
  tags: string[] | null;
  status?: string | null;
  is_system: boolean;
  owner_user_id: string | null;
  duplicated_from_id: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export const PRE_CALL_PLAN_TEMPLATE_DB_SELECT =
  "id, name, description, product_line, template_engagement_type, procedure_focus, smart_objective, opening_statement, probes, tools_resources, value_hypothesis, planned_close, suggested_next_step, tags, status, is_system, owner_user_id, duplicated_from_id, created_by_user_id, created_at, updated_at";

export function trimOrNull(v: string | null | undefined): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

export function normalizeTags(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return [];
  return [...new Set(raw.map((t) => String(t).trim()).filter(Boolean))];
}

export function templateFromDb(
  row: PreCallPlanTemplateDbRow,
  options?: { isFavorite?: boolean },
): PreCallPlanTemplate {
  return {
    id: String(row.id),
    name: String(row.name),
    productLine: row.product_line as PreCallPlanProductLine,
    engagementType:
      normalizeTemplateEngagementType(row.template_engagement_type) ||
      (row.template_engagement_type as PreCallPlanTemplateEngagementType),
    procedureFocus: trimOrNull(row.procedure_focus) ?? trimOrNull(row.description),
    smartObjective: trimOrNull(row.smart_objective),
    openingStatement: trimOrNull(row.opening_statement),
    probes: trimOrNull(row.probes),
    toolsResources: trimOrNull(row.tools_resources),
    valueHypothesis: trimOrNull(row.value_hypothesis),
    plannedClose: trimOrNull(row.planned_close),
    suggestedNextStep: trimOrNull(row.suggested_next_step),
    tags: normalizeTags(row.tags),
    status: normalizePreCallPlanTemplateStatus(row.status),
    isSystemTemplate: Boolean(row.is_system),
    isFavorite: options?.isFavorite ?? false,
    createdBy: row.created_by_user_id ? String(row.created_by_user_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    duplicatedFromId: row.duplicated_from_id ? String(row.duplicated_from_id) : null,
    description: trimOrNull(row.description),
  };
}

export function serializePreCallPlanTemplate(t: PreCallPlanTemplate): PreCallPlanTemplate {
  return { ...t };
}

/** Map canonical input → DB insert/update payload (canonical columns only). */
export function templateContentToDb(input: {
  procedureFocus?: string | null;
  smartObjective?: string | null;
  openingStatement?: string | null;
  probes?: string | null;
  toolsResources?: string | null;
  valueHypothesis?: string | null;
  plannedClose?: string | null;
  suggestedNextStep?: string | null;
  tags?: string[] | null;
  description?: string | null;
}): Record<string, unknown> {
  return {
    procedure_focus: trimOrNull(input.procedureFocus ?? null),
    description: trimOrNull(input.description ?? input.procedureFocus ?? null),
    smart_objective: trimOrNull(input.smartObjective),
    opening_statement: trimOrNull(input.openingStatement),
    probes: trimOrNull(input.probes),
    tools_resources: trimOrNull(input.toolsResources),
    value_hypothesis: trimOrNull(input.valueHypothesis),
    planned_close: trimOrNull(input.plannedClose),
    suggested_next_step: trimOrNull(input.suggestedNextStep),
    tags: normalizeTags(input.tags ?? []),
  };
}

export function templateHasPlanContent(input: {
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

/** System playbooks cannot be edited or deleted by reps. */
export function isSystemTemplateRow(row: { is_system: boolean }): boolean {
  return Boolean(row.is_system);
}

export function canEditTemplate(
  row: PreCallPlanTemplateDbRow,
  userId: string,
  options?: { isPortalAdmin?: boolean; isStaffAdmin?: boolean },
): boolean {
  if (isSystemTemplateRow(row)) return false;
  if (options?.isPortalAdmin || options?.isStaffAdmin) return true;
  return String(row.owner_user_id) === userId;
}

export function canDeleteTemplate(
  row: PreCallPlanTemplateDbRow,
  userId: string,
  options?: { isPortalAdmin?: boolean; isStaffAdmin?: boolean },
): boolean {
  return canEditTemplate(row, userId, options);
}
