export function formatSurgicalCaseActivityType(t: string | null | undefined): string {
  const s = String(t ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    note: "Note",
    status_change: "Status change",
    document_uploaded: "Document uploaded",
    document_deleted: "Document removed",
    product_updated: "Products",
    billing_update: "Billing",
    case_created: "Case created",
    case_updated: "Case updated",
    pre_call_plan_created: "Pre-Call Plan created",
    pre_call_plan_updated: "Pre-Call Plan updated",
    pre_call_plan_completed: "Pre-Call Plan completed",
    provider_intelligence_promoted: "Provider intelligence updated",
    clinical_discovery_insight_from_case: "Provider discovery insight added",
  };
  return map[s] ?? (s ? s.replace(/_/g, " ") : "Activity");
}
