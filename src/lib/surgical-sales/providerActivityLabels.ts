import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";

export function formatProviderActivityType(t: string | null | undefined): string {
  const s = String(t ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    clinical_discovery_updated: "Planning updated",
    provider_updated: "Provider updated",
    provider_created: "Provider created",
    provider_intelligence_promoted: "Intelligence updated from case",
    planning_section_completed: "Planning section completed",
    pre_call_plan_created: "Pre-Call Plan created",
    pre_call_plan_updated: "Pre-Call Plan updated",
    pre_call_plan_completed: "Pre-Call Plan completed",
    engagement_created: "Engagement created",
    engagement_updated: "Engagement updated",
    engagement_completed: "Engagement completed",
    engagement_converted_to_case: "Engagement converted to case",
    engagement_prepared: "Meeting prepared",
    ai_note_capture: "AI note captured",
    note_added: "Note added",
  };
  return map[s] ?? (s ? s.replace(/_/g, " ") : PROVIDER_FIELD_OPS_SECTION.fieldActivity);
}
