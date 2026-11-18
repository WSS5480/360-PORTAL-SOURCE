/**
 * Scope classification rules — organization vs provider vs case intelligence.
 */

import type { IntelligenceScope } from "@/lib/surgical-sales/intelligenceScopeModel";
import { isOrganizationIntelligenceDbKey } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { isProviderIntelligenceDbKey } from "@/lib/surgical-sales/providerIntelligenceFields";
import {
  containsExplicitFacilityWideLanguage,
  containsProviderSpecificLanguage,
  isEligibleOrganizationBaselineValue,
  ORGANIZATION_CLINICAL_COMMERCIAL_DB_KEYS,
  ORGANIZATION_OPERATIONAL_BASELINE_DB_KEYS,
} from "@/lib/surgical-sales/organizationIntelligenceReusableFilter";

const ORGANIZATION_LANGUAGE =
  /\b(at this hospital|for this facility|the OR team usually|credentialing here requires|all vendors go through|the hospital uses|the facility requires|the scheduler for this hospital|facility[- ]wide|hospital[- ]wide|site[- ]wide|this facility|this hospital)\b/i;

const PROVIDER_LANGUAGE =
  /\b(dr\.|doctor|surgeon|his workflow|her workflow|his cases|her cases|he prefers|she prefers|he struggled|she struggled|during his case|during her case|with this provider|this provider)\b/i;

const CASE_LANGUAGE =
  /\b(during (the|this) case|in (the|this) case|that case|observed during|case[- ]specific|this observation)\b/i;

const PROVIDER_SPECIFIC_DB_KEYS = new Set([
  "provider_competitive_products",
  "provider_workflow_pain_points",
  "provider_clinical_frustrations",
  "provider_technique_preferences",
  "provider_technique_detail",
  "provider_observation_feasibility",
  "provider_procedure_focus",
  "provider_case_volume_estimate",
  "provider_evaluation_appetite",
  "provider_dissatisfaction_signals",
  "provider_champion_potential",
  "provider_follow_up_rhythm",
  "provider_communication_style",
  "provider_responsiveness",
  "provider_decision_maker_status",
  "influence_level",
  "provider_scheduling_contact",
  "provider_observation_scheduling_control",
]);

export type ScopeClassificationInput = {
  text: string;
  dbKey?: string | null;
  sourceCaseId?: string | null;
  sourceProviderId?: string | null;
};

export type ScopeClassificationResult = {
  scope: IntelligenceScope;
  isClinicalProviderSpecific: boolean;
  isOperationalReusable: boolean;
  reason: string;
  /** When true, do not promote to organization-level automatically. */
  ambiguous: boolean;
};

export function classifyIntelligenceScope(input: ScopeClassificationInput): ScopeClassificationResult {
  const text = String(input.text ?? "").trim();
  const dbKey = String(input.dbKey ?? "").trim();

  if (input.sourceCaseId && CASE_LANGUAGE.test(text)) {
    return {
      scope: "case",
      isClinicalProviderSpecific: true,
      isOperationalReusable: false,
      reason: "Observed during a specific case",
      ambiguous: false,
    };
  }

  if (containsProviderSpecificLanguage(text)) {
    return {
      scope: "provider",
      isClinicalProviderSpecific: true,
      isOperationalReusable: false,
      reason: "Provider-specific pronoun or reference language detected",
      ambiguous: false,
    };
  }

  if (dbKey && PROVIDER_SPECIFIC_DB_KEYS.has(dbKey)) {
    return {
      scope: "provider",
      isClinicalProviderSpecific: /clinical|product|competitive|frustration|pain|technique|procedure|volume/i.test(
        dbKey,
      ),
      isOperationalReusable: false,
      reason: `Field ${dbKey} is provider-specific`,
      ambiguous: false,
    };
  }

  if (dbKey && ORGANIZATION_CLINICAL_COMMERCIAL_DB_KEYS.has(dbKey)) {
    if (containsExplicitFacilityWideLanguage(text)) {
      return {
        scope: "organization",
        isClinicalProviderSpecific: false,
        isOperationalReusable: true,
        reason: "Explicit facility-wide clinical/commercial language",
        ambiguous: false,
      };
    }
    return {
      scope: "provider",
      isClinicalProviderSpecific: true,
      isOperationalReusable: false,
      reason: "Clinical/commercial org field without explicit facility-wide language",
      ambiguous: true,
    };
  }

  if (dbKey && isOrganizationIntelligenceDbKey(dbKey)) {
    if (dbKey && isEligibleOrganizationBaselineValue(dbKey, text)) {
      return {
        scope: "organization",
        isClinicalProviderSpecific: false,
        isOperationalReusable: ORGANIZATION_OPERATIONAL_BASELINE_DB_KEYS.has(dbKey),
        reason: `Field ${dbKey} is reusable organization intelligence`,
        ambiguous: false,
      };
    }
    return {
      scope: "provider",
      isClinicalProviderSpecific: ORGANIZATION_CLINICAL_COMMERCIAL_DB_KEYS.has(dbKey),
      isOperationalReusable: false,
      reason: `Field ${dbKey} stored on org mirror but not facility-wide`,
      ambiguous: true,
    };
  }

  if (dbKey && isProviderIntelligenceDbKey(dbKey)) {
    return {
      scope: "provider",
      isClinicalProviderSpecific: true,
      isOperationalReusable: false,
      reason: `Field ${dbKey} is provider intelligence`,
      ambiguous: false,
    };
  }

  if (ORGANIZATION_LANGUAGE.test(text)) {
    return {
      scope: "organization",
      isClinicalProviderSpecific: false,
      isOperationalReusable: true,
      reason: "Facility-wide language detected",
      ambiguous: false,
    };
  }

  if (PROVIDER_LANGUAGE.test(text)) {
    return {
      scope: "provider",
      isClinicalProviderSpecific: true,
      isOperationalReusable: false,
      reason: "Provider-specific language detected",
      ambiguous: false,
    };
  }

  if (CASE_LANGUAGE.test(text)) {
    return {
      scope: "case",
      isClinicalProviderSpecific: true,
      isOperationalReusable: false,
      reason: "Case-specific language detected",
      ambiguous: false,
    };
  }

  return {
    scope: "provider",
    isClinicalProviderSpecific: true,
    isOperationalReusable: false,
    reason: "Ambiguous — default to provider/case-level; do not promote to organization",
    ambiguous: true,
  };
}

/** Returns true when a peer provider field value must NOT surface as org suggestion for a new provider. */
export function isProviderSpecificIntelligenceDbKey(dbKey: string): boolean {
  return PROVIDER_SPECIFIC_DB_KEYS.has(dbKey);
}
