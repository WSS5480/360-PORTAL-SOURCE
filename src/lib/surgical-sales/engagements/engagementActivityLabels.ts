const ENGAGEMENT_ACTIVITY_LABELS: Record<string, string> = {
  engagement_created: "Engagement created",
  engagement_updated: "Engagement updated",
  engagement_completed: "Engagement completed",
  engagement_converted_to_case: "Engagement converted to case",
  case_created_from_engagement: "Case created from engagement",
  pre_call_plan_created: "Pre-Call Plan created",
  pre_call_plan_updated: "Pre-Call Plan updated",
  pre_call_plan_completed: "Pre-Call Plan completed",
  engagement_prepared: "Prepared for meeting",
  engagement_archived: "Engagement deleted",
  engagement_restored: "Engagement restored",
};

export function formatEngagementActivityType(raw: string | null | undefined): string {
  const key = String(raw ?? "").trim().toLowerCase();
  return ENGAGEMENT_ACTIVITY_LABELS[key] ?? (key ? key.replace(/_/g, " ") : "Engagement activity");
}
