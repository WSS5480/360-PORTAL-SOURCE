import { z } from "zod";
import { ENGAGEMENT_TYPES } from "@/lib/surgical-sales/engagements/engagementTypes";
import { PRE_CALL_PLAN_PRODUCT_LINES } from "@/lib/surgical-sales/preCallPlanTemplateTypes";
import { PRE_CALL_PLAN_TEMPLATE_STATUSES } from "@/lib/surgical-sales/preCallPlanTemplateStatus";

const planFields = {
  procedureFocus: z.string().max(2000).optional().nullable(),
  smartObjective: z.string().max(1200).optional().nullable(),
  openingStatement: z.string().max(4000).optional().nullable(),
  probes: z.string().max(8000).optional().nullable(),
  toolsResources: z.string().max(8000).optional().nullable(),
  valueHypothesis: z.string().max(8000).optional().nullable(),
  plannedClose: z.string().max(8000).optional().nullable(),
  suggestedNextStep: z.string().max(4000).optional().nullable(),
  tags: z.array(z.string().max(80)).max(24).optional(),
};

/** Accept camelCase (canonical) or legacy snake_case keys from older clients. */
export function normalizeTemplateBodyInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown>;
  return {
    ...o,
    productLine: o.productLine ?? o.product_line,
    engagementType: o.engagementType ?? o.template_engagement_type,
    procedureFocus: o.procedureFocus ?? o.procedure_focus ?? o.description,
    smartObjective: o.smartObjective ?? o.smart_objective ?? o.observation_goal,
    openingStatement: o.openingStatement ?? o.opening_statement ?? o.pre_observation_impact_opening_statement,
    probes: o.probes ?? o.pre_observation_probes,
    toolsResources: o.toolsResources ?? o.tools_resources ?? o.pre_observation_tools_resources,
    valueHypothesis: o.valueHypothesis ?? o.value_hypothesis ?? o.pre_observation_value_hypothesis,
    plannedClose: o.plannedClose ?? o.planned_close ?? o.pre_observation_planned_close,
    suggestedNextStep: o.suggestedNextStep ?? o.suggested_next_step,
    tags: o.tags,
    description: o.description,
    status: o.status,
  };
}

export const PreCallPlanTemplateBodySchema = z
  .object({
    name: z.string().min(1).max(200),
    productLine: z.enum(PRE_CALL_PLAN_PRODUCT_LINES),
    engagementType: z.enum(ENGAGEMENT_TYPES),
    ...planFields,
    description: z.string().max(2000).optional().nullable(),
  })
  .strict();

export const CreatePreCallPlanTemplateSchema = z.preprocess(
  normalizeTemplateBodyInput,
  PreCallPlanTemplateBodySchema,
);

export const UpdatePreCallPlanTemplateSchema = z.preprocess(
  normalizeTemplateBodyInput,
  PreCallPlanTemplateBodySchema.partial()
    .extend({ status: z.enum(PRE_CALL_PLAN_TEMPLATE_STATUSES).optional() })
    .strict(),
);

export const AdminCreatePlaybookSchema = z.preprocess(
  normalizeTemplateBodyInput,
  PreCallPlanTemplateBodySchema.extend({
    status: z.enum(PRE_CALL_PLAN_TEMPLATE_STATUSES).optional(),
  }).strict(),
);
