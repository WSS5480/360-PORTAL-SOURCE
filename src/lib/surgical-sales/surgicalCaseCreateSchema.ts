import { z } from "zod";

export const SURGICAL_CASE_CREATE_STATUSES = [
  "draft",
  "scheduled",
  "rescheduled",
  "confirmed",
  "completed",
  "docs_needed",
  "billing_review",
  "invoiced",
  "closed",
  "cancelled",
] as const;

const LineItemSchema = z.object({
  product_id: z.string().uuid(),
  sku_id: z.string().uuid(),
  expected_quantity: z.number().positive().max(1_000_000),
});

const ObservationAccessSchema = z.object({
  scheduling_owner: z.string().max(500).nullable().optional(),
  access_pathway: z.string().max(500).nullable().optional(),
  credentialing_requirement: z
    .enum(["unknown", "not_required", "required_not_started", "in_progress", "verified"])
    .optional(),
  vendor_restrictions: z.string().max(2000).nullable().optional(),
  preferred_timing: z.string().max(1000).nullable().optional(),
});

const ObservationValidationTargetSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(1000),
  source: z.enum(["manual", "provider_signal", "procedural_context", "chip"]),
  status: z.literal("planned"),
  created_at: z.string().min(1).max(80),
});

export const SurgicalCaseCreateSchema = z
  .object({
    case_type: z.enum(["observation", "product_support"]).optional().default("product_support"),
    account_id: z.string().uuid(),
    surgeon_contact_id: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.string().uuid().nullable()),
    case_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    case_time: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? null : v),
      z
        .string()
        .regex(/^\d{2}:\d{2}(:\d{2})?$/)
        .nullable()
        .optional(),
    ),
    procedure_type: z.string().max(400).optional().nullable(),
    product_id: z.string().uuid().nullable().optional(),
    sku_id: z.string().uuid().optional(),
    expected_quantity: z.number().positive().max(1_000_000).optional(),
    line_items: z.array(LineItemSchema).min(1).max(25).optional(),
    expected_revenue: z.number().nonnegative().max(1e12).nullable().optional(),
    notes: z.string().max(8000).optional().nullable(),
    observation_goal: z.string().max(1200).optional().nullable(),
    observation_key_questions: z.string().max(4000).optional().nullable(),
    observation_signals_to_validate: z.string().max(4000).optional().nullable(),
    observation_access: ObservationAccessSchema.optional(),
    observation_validation_targets: z.array(ObservationValidationTargetSchema).max(200).optional(),
    pre_call_hospital_name: z.string().max(400).optional().nullable(),
    pre_call_surgeon_name: z.string().max(400).optional().nullable(),
    pre_observation_impact_opening_statement: z.string().max(4000).optional().nullable(),
    pre_observation_probes: z.string().max(8000).optional().nullable(),
    pre_observation_tools_resources: z.string().max(8000).optional().nullable(),
    pre_observation_value_hypothesis: z.string().max(8000).optional().nullable(),
    pre_observation_planned_close: z.string().max(8000).optional().nullable(),
    pre_observation_additional_notes: z.string().max(8000).optional().nullable(),
    follow_up_needed: z.boolean().optional(),
    related_opportunity_id: z.string().uuid().optional().nullable(),
    status: z.enum(SURGICAL_CASE_CREATE_STATUSES).optional(),
    confirm_duplicate: z.boolean().optional(),
    engagement_id: z.string().uuid().optional().nullable(),
    case_support_coverage: z.string().max(4000).optional().nullable(),
    case_product_needs: z.string().max(4000).optional().nullable(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const hasLines = Boolean(val.line_items && val.line_items.length > 0);
    const hasLegacy = Boolean(val.sku_id && val.expected_quantity != null);
    const isObservation = val.case_type === "observation";
    const isDraft = val.status === "draft";
    if (!isObservation && !isDraft && !hasLines && !hasLegacy) {
      ctx.addIssue({
        code: "custom",
        message: "Provide line_items or sku_id with expected_quantity",
        path: ["line_items"],
      });
      return;
    }
    if (hasLines && val.line_items && val.product_id) {
      const first = val.line_items[0];
      if (first && first.product_id !== val.product_id) {
        ctx.addIssue({
          code: "custom",
          message: "product_id must match the first line_items entry",
          path: ["product_id"],
        });
      }
    }
  });
