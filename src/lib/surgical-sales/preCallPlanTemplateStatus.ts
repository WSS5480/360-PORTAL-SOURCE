export const PRE_CALL_PLAN_TEMPLATE_STATUSES = ["active", "inactive", "archived"] as const;

export type PreCallPlanTemplateStatus = (typeof PRE_CALL_PLAN_TEMPLATE_STATUSES)[number];

export const PRE_CALL_PLAN_TEMPLATE_STATUS_LABELS: Record<PreCallPlanTemplateStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

export function normalizePreCallPlanTemplateStatus(
  raw: string | null | undefined,
): PreCallPlanTemplateStatus {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "inactive" || v === "archived") return v;
  return "active";
}

export function isPlaybookVisibleToReps(status: string | null | undefined): boolean {
  return normalizePreCallPlanTemplateStatus(status) === "active";
}
