import { buildRelationshipStrategySummary } from "@/lib/surgical-sales/buildRelationshipStrategySummary";
import { formatRepIntelligenceFieldValue } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import { formatIntelligenceCaptureDisplay } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  buildProviderPlanningCompletion,
  type ProviderPlanningCompletion,
  type ProviderPlanningContext,
  type ProviderPlanningSectionCompletion,
} from "@/lib/surgical-sales/providerPlanning";

export type ProviderIntelligenceRow = {
  label: string;
  value: string;
};

export type ProviderIntelligenceSnapshot = {
  provider_id: string;
  planning: ProviderPlanningCompletion;
  procedures: string | null;
  technique_preferences: string | null;
  product_preferences: string | null;
  current_vendors: string | null;
  competitive_products: string | null;
  evaluation_openness: string | null;
  product_interests: string | null;
  preference_card_signals: string | null;
  or_team_dynamics: string | null;
  observation_readiness: string | null;
  communication_style: string | null;
  relationship_summary: string | null;
  last_updated_at: string | null;
};

function trimOrNull(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

function formatCommunicationStyle(contact: Record<string, unknown>): string | null {
  const parts: string[] = [];
  const method = formatIntelligenceCaptureDisplay(
    "preferred_contact_method",
    contact.preferred_contact_method as string | null | undefined,
  );
  if (method) parts.push(method);
  const warmth = formatIntelligenceCaptureDisplay(
    "provider_communication_style",
    contact.provider_communication_style as string | null | undefined,
  );
  if (warmth) parts.push(warmth);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatCommercialSignals(contact: Record<string, unknown>): string | null {
  const parts = [
    displayField("provider_evaluation_openness", contact),
    displayField("provider_competitive_products", contact),
    displayField("provider_dissatisfaction_areas", contact),
    displayField("provider_preference_card_signals", contact),
  ].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatObservationReadiness(contact: Record<string, unknown>): string | null {
  const parts = [
    displayField("provider_observation_feasibility", contact),
    displayField("provider_observation_credentialing_needed", contact),
    displayField("provider_ideal_observation_cases", contact),
    displayField("provider_observation_access_path", contact),
    displayField("provider_observation_coordinator_contact", contact),
    displayField("provider_observation_cadence_preference", contact),
    displayField("provider_observation_best_days_case_types", contact),
  ].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function displayField(key: string, contact: Record<string, unknown>): string | null {
  const raw = contact[key] as string | null | undefined;
  return formatRepIntelligenceFieldValue(key, raw);
}

export function buildProviderIntelligenceSnapshot(
  contact: Record<string, unknown>,
  providerId: string,
  context?: ProviderPlanningContext,
): ProviderIntelligenceSnapshot {
  const planning = buildProviderPlanningCompletion(contact, context);

  return {
    provider_id: providerId,
    planning,
    procedures: displayField("provider_procedure_focus", contact),
    technique_preferences: displayField("provider_technique_preferences", contact),
    product_preferences: formatCommercialSignals(contact),
    current_vendors: displayField("provider_current_vendors", contact),
    observation_readiness: formatObservationReadiness(contact),
    competitive_products: displayField("provider_competitive_products", contact),
    evaluation_openness: displayField("provider_evaluation_openness", contact),
    product_interests: null,
    preference_card_signals: displayField("provider_preference_card_signals", contact),
    or_team_dynamics: displayField("provider_or_team_dynamics", contact),
    communication_style: formatCommunicationStyle(contact),
    relationship_summary: buildRelationshipStrategySummary(contact),
    last_updated_at:
      String(contact.provider_planning_updated_at || contact.updated_at || "").trim() || null,
  };
}

export function providerIntelligenceHref(providerId: string, sectionId = "clinical_workflow"): string {
  const params = new URLSearchParams({ tab: "intelligence", planning_section: sectionId });
  return `/portal/sales/providers/${encodeURIComponent(providerId)}?${params.toString()}`;
}

/** @deprecated Use providerIntelligenceHref */
export function providerClinicalDiscoveryHref(providerId: string, caseId?: string): string {
  void caseId;
  return providerIntelligenceHref(providerId, "clinical_workflow");
}
