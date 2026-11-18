/**
 * Pre-Call Plan — interaction-scoped planning (SMART goal, opening, probes, tools, close).
 *
 * Authoritative storage: surgical_sales_engagements (see engagements/ module).
 * Legacy mirror: surgical_sales_cases.pre_observation_* columns during migration.
 * Do NOT store these fields on the provider profile — see providerIntelligenceFields.ts.
 */

export const PRE_CALL_PLAN_LABEL = "Pre-Call Plan";
export const PRE_CALL_PLAN_STAGE_LABEL = PRE_CALL_PLAN_LABEL;
export const PRE_CALL_PLAN_DESCRIPTION =
  "Case Intelligence — meeting objectives, discovery hypotheses, talking points, and tactical asks for this scheduled case only. Not Organization / Facility or Provider Intelligence.";

export type PreCallPlanFieldKey =
  | "pre_call_hospital_name"
  | "pre_call_surgeon_name"
  | "observation_goal"
  | "pre_observation_impact_opening_statement"
  | "pre_observation_probes"
  | "pre_observation_tools_resources"
  | "pre_observation_value_hypothesis"
  | "pre_observation_planned_close"
  | "pre_observation_additional_notes";

export type PreCallPlanFieldConfig = {
  key: PreCallPlanFieldKey;
  label: string;
  helper?: string;
  rows: number;
  /** When true, value defaults from engagement context but can be overridden. */
  contextualDefault?: boolean;
};

export const PRE_CALL_PLAN_FIELD_CONFIGS: PreCallPlanFieldConfig[] = [
  {
    key: "pre_call_hospital_name",
    label: "Hospital Name",
    helper: "Defaults from the linked organization; override when the visit is at a different facility.",
    rows: 2,
    contextualDefault: true,
  },
  {
    key: "pre_call_surgeon_name",
    label: "Surgeon Name",
    helper: "Defaults from the assigned provider; override when documenting a different clinician.",
    rows: 2,
    contextualDefault: true,
  },
  {
    key: "observation_goal",
    label: "Sales Call Objective / SMART Goal",
    helper: "Objective for this specific interaction — not provider intelligence.",
    rows: 3,
  },
  {
    key: "pre_observation_impact_opening_statement",
    label: "Impact Opening Statement",
    rows: 3,
  },
  {
    key: "pre_observation_probes",
    label: "Probes / Information to be Gathered",
    rows: 5,
  },
  {
    key: "pre_observation_tools_resources",
    label: "Tools and Resources to be Used",
    rows: 4,
  },
  {
    key: "pre_observation_value_hypothesis",
    label: "Value Hypothesis",
    rows: 4,
  },
  {
    key: "pre_observation_planned_close",
    label: "Planned Close / Next Step",
    rows: 4,
  },
  {
    key: "pre_observation_additional_notes",
    label: "Additional Notes",
    rows: 4,
  },
];

export const PRE_CALL_PLAN_CASE_KEYS = PRE_CALL_PLAN_FIELD_CONFIGS.map((f) => f.key);

/** Pre-Call Plan form fields shown in mobile workflow (excludes contextual hospital/surgeon rows). */
export const PRE_CALL_PLAN_MOBILE_PLANNING_FIELDS = PRE_CALL_PLAN_FIELD_CONFIGS.filter(
  (f) => !f.contextualDefault,
);

/** Intro Call wizard prep — strategy fields only; provider/org come from Engagement Details. */
export const INTRO_CALL_PREP_PLAN_FIELD_KEYS: PreCallPlanFieldKey[] =
  PRE_CALL_PLAN_MOBILE_PLANNING_FIELDS.map((f) => f.key);

/** @deprecated Provider columns — historical copies only; not shown as provider intelligence. */
export const PROVIDER_PRE_CALL_PLAN_LEGACY_KEYS = [
  "provider_pre_observation_impact_opening_statement",
  "provider_pre_observation_probes",
  "provider_pre_observation_tools_resources",
  "provider_pre_observation_value_hypothesis",
  "provider_pre_observation_planned_close",
  "provider_pre_observation_additional_notes",
] as const;

export type PreCallPlanContext = {
  hospitalDefault?: string | null;
  surgeonDefault?: string | null;
};

export function preCallPlanDisplayValue(
  caseRow: Record<string, unknown>,
  key: PreCallPlanFieldKey,
  context?: PreCallPlanContext,
): string {
  const stored = String(caseRow[key] ?? "").trim();
  if (stored) return stored;
  if (key === "pre_call_hospital_name") return String(context?.hospitalDefault ?? "").trim();
  if (key === "pre_call_surgeon_name") return String(context?.surgeonDefault ?? "").trim();
  return "";
}

export function buildPreCallPlanDraft(
  caseRow: Record<string, unknown>,
  context?: PreCallPlanContext,
): Record<PreCallPlanFieldKey, string> {
  const draft = {} as Record<PreCallPlanFieldKey, string>;
  for (const field of PRE_CALL_PLAN_FIELD_CONFIGS) {
    draft[field.key] = preCallPlanDisplayValue(caseRow, field.key, context);
  }
  return draft;
}

export function hasPreCallPlanData(caseRow: Record<string, unknown>, context?: PreCallPlanContext): boolean {
  return PRE_CALL_PLAN_FIELD_CONFIGS.some((f) => preCallPlanDisplayValue(caseRow, f.key, context).length > 0);
}

export function countPreCallPlanFilled(caseRow: Record<string, unknown>, context?: PreCallPlanContext): {
  filled: number;
  total: number;
} {
  const total = PRE_CALL_PLAN_FIELD_CONFIGS.length;
  const filled = PRE_CALL_PLAN_FIELD_CONFIGS.filter(
    (f) => preCallPlanDisplayValue(caseRow, f.key, context).length > 0,
  ).length;
  return { filled, total };
}

/** Case Setup readiness — metadata only (not Pre-Call Plan form fields). */
export function countCaseSetupReadiness(caseRow: Record<string, unknown>): { filled: number; total: number } {
  const checks = [
    Boolean(String(caseRow.account_id ?? "").trim()),
    Boolean(String(caseRow.surgeon_contact_id ?? "").trim()),
    Boolean(String(caseRow.case_date ?? "").trim()),
  ];
  return { filled: checks.filter(Boolean).length, total: checks.length };
}

export function buildPreCallPlanPatch(draft: Record<string, string>): Record<string, string | null> {
  const patch: Record<string, string | null> = {};
  for (const field of PRE_CALL_PLAN_FIELD_CONFIGS) {
    const raw = draft[field.key];
    if (raw === undefined) continue;
    patch[field.key] = String(raw).trim() || null;
  }
  return patch;
}

export const OPEN_PROVIDER_INTELLIGENCE_LABEL = "Open provider intelligence";
export const OPEN_PROVIDER_PROFILE_LABEL = "Open provider profile";

export function providerIntelligenceHref(
  providerId: string,
  caseId?: string,
  caseNumber?: string,
): string {
  const params = new URLSearchParams({ tab: "intelligence", planning_section: "clinical_workflow" });
  if (caseId?.trim()) {
    params.set("from_case", caseId.trim());
    if (caseNumber?.trim()) params.set("case_number", caseNumber.trim());
  }
  return `/portal/sales/providers/${encodeURIComponent(providerId)}?${params.toString()}`;
}
