/**
 * Enforced guardrails for AI intelligence scope mapping.
 *
 * - Credentialing / OR access / scheduling → organization unless the note clearly
 *   states a surgeon-only exception.
 * - Surgeon preferences, mix, evaluation, relationship → provider unless clearly
 *   facility-wide.
 * - Facility policies propagate at organization scope (not folded into other providers).
 * - Provider behavior must not map to organization without facility-wide wording.
 * - Visit-only narrative stays on engagement unless it states durable operational facts.
 */

import type { TacticalDebriefCategoryId } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefAnalyze";
import type { IntelligenceDomain, IntelligenceTarget } from "@/lib/surgical-sales/logUpdateOpenAiMapping";
import {
  intelligenceScopeForDbKey,
  type IntelligenceScope,
} from "@/lib/surgical-sales/intelligenceScopeModel";
import { isOrganizationIntelligenceDbKey } from "@/lib/surgical-sales/organizationIntelligenceFields";
import { isProviderIntelligenceDbKey } from "@/lib/surgical-sales/providerIntelligenceFields";
import {
  containsProviderSpecificLanguage,
  ORGANIZATION_CLINICAL_COMMERCIAL_DB_KEYS,
} from "@/lib/surgical-sales/organizationIntelligenceReusableFilter";
export type IntelligenceScopeGuardrailResolution = {
  scope: IntelligenceScope;
  reason: string;
  guardrailApplied?: string;
};

/** Domains that default to facility-wide (organization) intelligence. */
export const ORGANIZATION_POLICY_DOMAINS: ReadonlySet<IntelligenceDomain> = new Set([
  "or_access",
  "credentialing",
  "scheduling",
  "procurement",
]);

/** Domains that default to surgeon-specific (provider) intelligence. */
export const PROVIDER_BEHAVIOR_DOMAINS: ReadonlySet<IntelligenceDomain> = new Set([
  "workflow",
  "relationship",
  "evaluation",
  "product_fit",
  "case_mix",
]);

const PROVIDER_UNIQUE_TEXT =
  /\b(only\s+(for|with|at)\s+(this|that)\s+(surgeon|provider|doctor|dr\.?)|unique\s+to\s+(this|that)\s+(surgeon|provider|doctor)|this\s+surgeon\s+(only|alone|specifically|is\s+the\s+exception)|surgeon[- ]?specific|provider[- ]?specific|for\s+dr\.?\s+[A-Z][a-z]+(\s+only)?|dr\.?\s+[A-Z][a-z]+'s\b|does\s+not\s+apply\s+to\s+other\s+surgeons|exception\s+for\s+(this|that)\s+(surgeon|provider)|handles\s+his\b|handles\s+her\b|coordinates\s+his\b|coordinates\s+her\b|his\s+(credentialing|access|workflow|observation|scheduler)|her\s+(credentialing|access|workflow|observation|scheduler)|unlike\s+other\s+surgeons\s+at\s+this\s+(hospital|facility)|differently\s+from\s+(other|the\s+rest))\b/i;

const FACILITY_WIDE_TEXT =
  /\b(all\s+surgeons|every\s+provider|each\s+provider|facility[- ]?wide|hospital[- ]?wide|site[- ]?wide|at\s+this\s+(hospital|facility|site)|whole\s+hospital|entire\s+(OR|department)|department\s+policy|hospital\s+policy|OR\s+policy|standard\s+(at|for)\s+this\s+(hospital|facility|site)|across\s+(all\s+)?providers|everyone\s+here|all\s+cases\s+here)\b/i;

const ENGAGEMENT_ONLY_TEXT =
  /\b(this\s+(visit|meeting|call|touch|conversation|engagement)|during\s+(the\s+)?(visit|meeting|call)|on\s+this\s+(visit|call|meeting)|what\s+happened\s+(today|on\s+the\s+call)|agreed\s+(today|on\s+the\s+call)|before\s+(we\s+)?leave|follow[- ]?up\s+(next\s+week|call|email)\s+(next|tomorrow)?|next\s+week('s)?\s+(call|meeting)|intro\s+call\s+went|intro\s+call\s+outcome|meeting\s+notes?\s+from\s+today|observation\s+notes?\s+from\s+today|commitment\s+from\s+this|temporary\s+context|on\s+this\s+engagement)\b/i;

const DURABLE_INTELLIGENCE_TEXT =
  /\b(always\s+requires?|required\s+for\s+all|standard\s+process|must\s+be\s+credentialed|credentialing\s+required|hospital\s+requires|facility\s+requires|policy\s+is|routinely|typically\s+prefers|usually\s+(uses|prefers|requires)|generally\s+open|standing\s+rule|ongoing\s+process|before\s+any\s+observation)\b/i;

const ORGANIZATION_SIGNAL_TEXT =
  /\b(vendor\s+credential|credentialing|credentialed|OR\s+access|observation\s+(approval|process)|scheduler|scheduling\s+(path|workflow|owner)|coordinator|committee|purchasing|procurement|preference\s+card|value\s+analysis|supply\s+chain|facility\s+polic|hospital\s+polic)\b/i;

const PROVIDER_SIGNAL_TEXT =
  /\b(surgeon\s+pref|technique\s+pref|procedure\s+mix|modality|clinical\s+interest|evaluation\s+open|communication\s+style|relationship\s+strength|champion|case\s+mix|dissatisfaction|competitor)\b/i;

export function noteClearlyProviderSpecific(text: string): boolean {
  return PROVIDER_UNIQUE_TEXT.test(text.trim());
}

export function noteClearlyFacilityWide(text: string): boolean {
  return FACILITY_WIDE_TEXT.test(text.trim());
}

export function noteIsEngagementOnly(text: string): boolean {
  return ENGAGEMENT_ONLY_TEXT.test(text.trim());
}

export function noteRevealsDurableIntelligence(text: string, domain?: IntelligenceDomain | null): boolean {
  const t = text.trim();
  if (!t) return false;
  if (noteIsEngagementOnly(t) && !DURABLE_INTELLIGENCE_TEXT.test(t)) return false;
  if (DURABLE_INTELLIGENCE_TEXT.test(t)) return true;
  if (domain && ORGANIZATION_POLICY_DOMAINS.has(domain) && ORGANIZATION_SIGNAL_TEXT.test(t)) {
    return true;
  }
  if (domain && PROVIDER_BEHAVIOR_DOMAINS.has(domain) && PROVIDER_SIGNAL_TEXT.test(t)) {
    return true;
  }
  if (ORGANIZATION_SIGNAL_TEXT.test(t) && !noteClearlyProviderSpecific(t)) return true;
  if (PROVIDER_SIGNAL_TEXT.test(t) && !noteClearlyFacilityWide(t)) return true;
  return false;
}

function isOrganizationPolicyDbKey(dbKey: string | null | undefined): boolean {
  if (!dbKey) return false;
  return isOrganizationIntelligenceDbKey(dbKey);
}

function isProviderBehaviorDbKey(dbKey: string | null | undefined): boolean {
  if (!dbKey) return false;
  return isProviderIntelligenceDbKey(dbKey);
}

function domainImpliesOrganization(domain: IntelligenceDomain | null | undefined): boolean {
  return domain != null && ORGANIZATION_POLICY_DOMAINS.has(domain);
}

function domainImpliesProvider(domain: IntelligenceDomain | null | undefined): boolean {
  return domain != null && PROVIDER_BEHAVIOR_DOMAINS.has(domain);
}

function appendGuardrailReason(base: string, guardrail: string): string {
  return `${base} Guardrail: ${guardrail}`;
}

/**
 * Apply mapping guardrails on top of heuristic scope resolution.
 */
export function applyIntelligenceMappingGuardrails(input: {
  text?: string;
  dbKey?: string | null;
  domain?: IntelligenceDomain | null;
  debriefCategoryId?: TacticalDebriefCategoryId | null;
  logUpdateTarget?: IntelligenceTarget | null;
  resolution: IntelligenceScopeGuardrailResolution;
}): IntelligenceScopeGuardrailResolution {
  const text = String(input.text ?? "").trim();
  const { domain, dbKey, logUpdateTarget } = input;
  let { scope, reason } = input.resolution;
  let guardrailApplied: string | undefined;

  const orgPolicy =
    isOrganizationPolicyDbKey(dbKey) ||
    domainImpliesOrganization(domain) ||
    (dbKey != null && intelligenceScopeForDbKey(dbKey) === "organization");
  const providerBehavior =
    isProviderBehaviorDbKey(dbKey) ||
    domainImpliesProvider(domain) ||
    (dbKey != null && intelligenceScopeForDbKey(dbKey) === "provider");

  // Credentialing / access / scheduling → organization unless surgeon-only exception.
  if (orgPolicy && scope === "provider" && !noteClearlyProviderSpecific(text)) {
    scope = "organization";
    guardrailApplied =
      "credentialing and facility access policies stay at facility scope unless the note states a surgeon-only exception.";
    reason = appendGuardrailReason(reason, guardrailApplied);
  }

  // Surgeon-only scheduling/coordination → provider exception (do not overwrite facility baseline).
  if (orgPolicy && scope === "organization" && (noteClearlyProviderSpecific(text) || containsProviderSpecificLanguage(text))) {
    scope = "provider";
    guardrailApplied =
      "surgeon-specific scheduling or access exceptions stay on this provider — not a facility-wide overwrite.";
    reason = appendGuardrailReason(reason, guardrailApplied);
  }

  // Product/vendor org mirror fields require facility-wide language — never promote provider usage.
  if (
    dbKey &&
    ORGANIZATION_CLINICAL_COMMERCIAL_DB_KEYS.has(dbKey) &&
    scope === "organization" &&
    !noteClearlyFacilityWide(text)
  ) {
    scope = "provider";
    guardrailApplied =
      "product and vendor usage stays on the source provider unless the note explicitly describes a hospital-wide formulary or standard.";
    reason = appendGuardrailReason(reason, guardrailApplied);
  }

  if (
    dbKey &&
    ORGANIZATION_CLINICAL_COMMERCIAL_DB_KEYS.has(dbKey) &&
    scope === "organization" &&
    containsProviderSpecificLanguage(text)
  ) {
    scope = "provider";
    guardrailApplied = "provider-specific product language does not propagate as organization intelligence.";
    reason = appendGuardrailReason(reason, guardrailApplied);
  }

  // Surgeon preferences and provider behavior → provider unless clearly facility-wide.
  if (providerBehavior && scope === "organization" && !noteClearlyFacilityWide(text)) {
    scope = "provider";
    guardrailApplied =
      "surgeon preferences and provider behavior do not propagate organization-wide unless the note describes a facility-wide rule.";
    reason = appendGuardrailReason(reason, guardrailApplied);
  }

  if (providerBehavior && scope === "provider" && noteClearlyFacilityWide(text)) {
    scope = "organization";
    guardrailApplied =
      "facility-wide workflow or preference rules propagate at organization scope across providers at this hospital.";
    reason = appendGuardrailReason(reason, guardrailApplied);
  }

  // AI target provider on facility policy domains without surgeon-only wording → organization.
  if (
    orgPolicy &&
    logUpdateTarget === "provider" &&
    scope === "provider" &&
    !noteClearlyProviderSpecific(text)
  ) {
    scope = "organization";
    guardrailApplied =
      "facility credentialing and access policies are not saved as provider-specific by default.";
    reason = appendGuardrailReason(reason, guardrailApplied);
  }

  // AI target organization on surgeon-specific domains without facility-wide wording → provider.
  if (
    providerBehavior &&
    logUpdateTarget === "organization" &&
    scope === "organization" &&
    !noteClearlyFacilityWide(text)
  ) {
    scope = "provider";
    guardrailApplied = "provider behavior does not propagate to other surgeons at the facility.";
    reason = appendGuardrailReason(reason, guardrailApplied);
  }

  const engagementOnly = noteIsEngagementOnly(text);
  const durable = noteRevealsDurableIntelligence(text, domain);

  // Visit-only narrative → engagement unless durable operational intelligence is stated.
  if (engagementOnly && !durable && scope !== "case") {
    scope = "case";
    guardrailApplied =
      "case and visit notes stay on this case unless the note states durable facility or surgeon intelligence.";
    reason = appendGuardrailReason(reason, guardrailApplied);
  }

  // Promote visit narrative that states durable facts out of case scope.
  if (scope === "case" && durable && domain !== "next_steps") {
    if (orgPolicy || (ORGANIZATION_SIGNAL_TEXT.test(text) && !noteClearlyProviderSpecific(text))) {
      scope = "organization";
      guardrailApplied = "durable facility policy stated during the visit maps to organization intelligence.";
      reason = appendGuardrailReason(reason, guardrailApplied);
    } else if (providerBehavior || PROVIDER_SIGNAL_TEXT.test(text)) {
      scope = "provider";
      guardrailApplied = "durable surgeon-specific facts stated during the visit map to provider intelligence.";
      reason = appendGuardrailReason(reason, guardrailApplied);
    }
  }

  // next_steps without durable promotion stays on the case.
  if (domain === "next_steps" && !durable) {
    scope = "case";
    reason = appendGuardrailReason(
      reason,
      "follow-up from this case stays case-scoped unless it states a standing facility or surgeon rule.",
    );
  }

  return { scope, reason, guardrailApplied };
}

/** Pick the first writable db key whose canonical scope matches the resolved scope. */
export function pickDbKeyForScope(
  candidates: readonly string[],
  scope: IntelligenceScope,
  writableKeys: Set<string>,
): string | null {
  if (scope === "case") return null;
  for (const key of candidates) {
    if (!writableKeys.has(key)) continue;
    const keyScope = intelligenceScopeForDbKey(key);
    if (keyScope === scope) return key;
  }
  for (const key of candidates) {
    if (writableKeys.has(key)) return key;
  }
  return null;
}
