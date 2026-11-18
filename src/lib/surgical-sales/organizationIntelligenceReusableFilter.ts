/**
 * Filters organization intelligence to reusable facility-wide operational context only.
 * Provider-specific clinical/product statements must not surface as org suggestions.
 */

import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { noteClearlyFacilityWide, noteClearlyProviderSpecific } from "@/lib/surgical-sales/intelligenceMappingGuardrails";
import type { OrganizationIntelligenceBaseline } from "@/lib/surgical-sales/loadOrganizationIntelligenceBaseline";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

/** Operational org fields — suggestable when text is not provider-specific. */
export const ORGANIZATION_OPERATIONAL_BASELINE_DB_KEYS = new Set([
  "provider_credentialing_status",
  "provider_observation_credentialing_needed",
  "provider_credentialing_platform_id",
  "provider_credentialing_platform_name",
  "provider_credentialing_contact",
  "provider_credentialing_approval_contact",
  "provider_credentialing_renewal_notes",
  "provider_credentialing_required_documents",
  "provider_credentialing_facility_instructions",
  "provider_observation_access_path",
  "provider_observation_coordinator_contact",
  "provider_facility_scheduling_contact",
  "provider_observation_best_days_case_types",
  "provider_facility_logistics_notes",
]);

/** Clinical/commercial org mirror fields — require explicit facility-wide language. */
export const ORGANIZATION_CLINICAL_COMMERCIAL_DB_KEYS = new Set([
  "provider_preference_card_signals",
  "provider_current_vendors",
]);

/** Facility workflow context — reusable when not provider-specific; facility-wide language not required. */
export const ORGANIZATION_WORKFLOW_CONTEXT_DB_KEYS = new Set([
  "provider_or_team_dynamics",
  "provider_support_expectations",
  "provider_facility_spd_tray_behavior",
  "provider_facility_room_turnover_patterns",
]);

const PROVIDER_SPECIFIC_LANGUAGE =
  /\b((?:he|she)\s+(?:is|was|are|uses|used|using|prefers|preferred|struggled|had|has|currently|often|mainly|typically|mentioned)|(?:his|her)\s+(?:cases?|case\s+mix|workflow|patients?|approach|technique|preference|pain|frustration|observation|approval|scheduler|coordination|hernias?)|(?:during|in|from|on)\s+(?:his|her)\s+case|with\s+(?:this\s+provider|dr\.?\s+[A-Z])|(?:^|\s)(?:he|she|his|her|him)\s+(?:is|was|uses|used|using|had|has)\b|dr\.?\s+[A-Z][a-zA-Z'-]+(?:'s)?\b|this\s+provider\b)/i;

const EXPLICIT_FACILITY_WIDE_LANGUAGE =
  /\b((?:the|this)\s+(?:hospital|facility|site)\s+(?:uses|requires|has|employs|standardizes)|(?:hospital|facility)\s+(?:uses|requires|has|employs)|(?:hospital's|facility's)\s+(?:\w+\s+)?(?:service\s+line|formulary|standard)|the\s+or\s+scheduling\s+team|or\s+scheduling\s+team\s+handles|all\s+vendors|all\s+surgeons|facility[- ]wide|hospital[- ]wide|site[- ]wide|standard\s+formulary|formulary\s+item|growing\s+robotic|service\s+line\s+has\s+been)\b/i;

const CLINICAL_PRODUCT_USAGE_LANGUAGE =
  /\b(currently\s+using|uses\s+\w+\s+mesh|bard\s+mesh|competitor\s+product|product\s+usage|in\s+a\s+lot\s+of\s+(?:his|her)\s+|from\s+what\s+i\s+understood)\b/i;

export type OrganizationScopeCorrection = {
  dbKey: string;
  correctedScope: "provider" | "case";
  reason: string;
};

export function containsProviderSpecificLanguage(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (noteClearlyProviderSpecific(trimmed)) return true;
  return PROVIDER_SPECIFIC_LANGUAGE.test(trimmed);
}

export function containsExplicitFacilityWideLanguage(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (noteClearlyFacilityWide(trimmed)) return true;
  return EXPLICIT_FACILITY_WIDE_LANGUAGE.test(trimmed);
}

export function looksLikeProviderClinicalProductStatement(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (containsExplicitFacilityWideLanguage(trimmed)) return false;
  return CLINICAL_PRODUCT_USAGE_LANGUAGE.test(trimmed) || containsProviderSpecificLanguage(trimmed);
}

/**
 * Whether a peer provider field value may contribute to organization baseline / suggestions.
 */
export function isEligibleOrganizationBaselineValue(dbKey: string, value: string): boolean {
  const raw = String(value ?? "").trim();
  if (!fieldHasIntelligenceSignal(dbKey, raw)) return false;
  if (containsProviderSpecificLanguage(raw)) return false;
  if (looksLikeProviderClinicalProductStatement(raw)) return false;

  if (ORGANIZATION_OPERATIONAL_BASELINE_DB_KEYS.has(dbKey)) {
    return true;
  }

  if (ORGANIZATION_CLINICAL_COMMERCIAL_DB_KEYS.has(dbKey)) {
    return containsExplicitFacilityWideLanguage(raw);
  }

  if (ORGANIZATION_WORKFLOW_CONTEXT_DB_KEYS.has(dbKey)) {
    return true;
  }

  return containsExplicitFacilityWideLanguage(raw);
}

export function isEligibleOrganizationSuggestion(dbKey: string, value: string, displayLine?: string): boolean {
  const combined = [value, displayLine].filter(Boolean).join(" ");
  return isEligibleOrganizationBaselineValue(dbKey, combined || value);
}

/** Remove ineligible fields from a loaded organization baseline (read-time cleanup). */
export function filterOrganizationIntelligenceBaseline(
  baseline: OrganizationIntelligenceBaseline,
): OrganizationIntelligenceBaseline {
  const fields: OrganizationIntelligenceBaseline["fields"] = {};
  for (const [dbKey, field] of Object.entries(baseline.fields)) {
    if (isEligibleOrganizationSuggestion(dbKey, field.value, field.displayLine)) {
      fields[dbKey] = field;
    }
  }
  return { ...baseline, fields };
}

/** Detect mis-scoped organization mirror values that should be treated as provider intelligence. */
export function detectOrganizationScopeCorrection(
  dbKey: string,
  value: string,
): OrganizationScopeCorrection | null {
  const raw = String(value ?? "").trim();
  if (!raw || !fieldHasIntelligenceSignal(dbKey, raw)) return null;
  if (!ORGANIZATION_CLINICAL_COMMERCIAL_DB_KEYS.has(dbKey) && !ORGANIZATION_OPERATIONAL_BASELINE_DB_KEYS.has(dbKey)) {
    return null;
  }
  if (ORGANIZATION_OPERATIONAL_BASELINE_DB_KEYS.has(dbKey) && containsProviderSpecificLanguage(raw)) {
    return {
      dbKey,
      correctedScope: "provider",
      reason: "Operational org field contains provider-specific pronoun language",
    };
  }
  if (
    ORGANIZATION_CLINICAL_COMMERCIAL_DB_KEYS.has(dbKey) &&
    (containsProviderSpecificLanguage(raw) || looksLikeProviderClinicalProductStatement(raw))
  ) {
    return {
      dbKey,
      correctedScope: "provider",
      reason: "Clinical/commercial statement is provider-specific, not facility-wide",
    };
  }
  if (ORGANIZATION_CLINICAL_COMMERCIAL_DB_KEYS.has(dbKey) && !containsExplicitFacilityWideLanguage(raw)) {
    return {
      dbKey,
      correctedScope: "provider",
      reason: "Clinical/commercial context lacks explicit facility-wide language",
    };
  }
  return null;
}

/** Stamp corrected scope on field metadata without deleting the underlying value. */
export function applyOrganizationScopeCorrectionToMetadata(
  metadata: ProviderIntelligenceFieldMetadataMap,
  dbKey: string,
  correction: OrganizationScopeCorrection,
  nowIso = new Date().toISOString(),
): ProviderIntelligenceFieldMetadataMap {
  const prior = metadata[dbKey];
  return {
    ...metadata,
    [dbKey]: {
      ...prior,
      source_type: prior?.source_type ?? "profile",
      source_label: prior?.source_label
        ? `${prior.source_label} (scoped to provider — not organization-wide)`
        : "Scoped to provider — not organization-wide",
      updated_at: nowIso,
    },
  };
}
