import type { EngagementWorkflowFieldConfig } from "@/lib/surgical-sales/engagements/engagementWorkflowConfig";
import {
  OFFICE_VISIT_360_FIELD_CONFIGS,
  type OfficeVisit360FieldKey,
} from "@/lib/surgical-sales/engagements/officeVisit360Workflow";

/** Prepare route — two rep-facing questions (not full 8-section visit plan). */
export const OFFICE_VISIT_360_PREPARE_FIELD_KEYS = [
  "observation_goal",
  "sim_lab_focus",
] as const satisfies readonly OfficeVisit360FieldKey[];

export type OfficeVisit360PrepareFieldKey = (typeof OFFICE_VISIT_360_PREPARE_FIELD_KEYS)[number];

export const OFFICE_VISIT_360_PREPARE_FIELD_CONFIGS: EngagementWorkflowFieldConfig[] =
  OFFICE_VISIT_360_FIELD_CONFIGS.filter((field) =>
    (OFFICE_VISIT_360_PREPARE_FIELD_KEYS as readonly string[]).includes(field.key),
  );
