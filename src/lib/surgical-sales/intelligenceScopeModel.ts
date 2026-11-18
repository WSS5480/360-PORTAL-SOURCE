/**

 * Canonical three-scope intelligence model.

 *

 * 1. Organization / Facility intelligence — shared across providers at the same hospital.

 * 2. Provider intelligence — specific to one surgeon/provider.

 * 3. Case intelligence — specific to one scheduled case (logistics, live notes, debrief).

 *

 * Not all intelligence is provider-specific by default. Classify fields and capture

 * routing with intelligenceScopeForDbKey() before assuming provider storage.

 *

 * Engagement Pre-Call Plan fields are case-scoped in capture UX; authoritative storage

 * may be surgical_sales_engagements until fully migrated to the case record.

 */



import {

  CASE_INTELLIGENCE_DB_KEYS,

  CASE_INTELLIGENCE_FIELD_DEFS,

  isCaseIntelligenceDbKey,

} from "@/lib/surgical-sales/caseIntelligenceFields";

import {

  ENGAGEMENT_INTELLIGENCE_DB_KEYS,

  ENGAGEMENT_INTELLIGENCE_FIELD_DEFS,

  isEngagementIntelligenceDbKey,

} from "@/lib/surgical-sales/engagementIntelligenceFields";

import {

  isOrganizationIntelligenceDbKey,

  ORGANIZATION_INTELLIGENCE_DB_KEYS,

  ORGANIZATION_INTELLIGENCE_FIELD_DEFS,

} from "@/lib/surgical-sales/organizationIntelligenceFields";

import {

  isProviderIntelligenceDbKey,

  PROVIDER_INTELLIGENCE_DB_KEYS,

  PROVIDER_INTELLIGENCE_FIELD_DEFS,

} from "@/lib/surgical-sales/providerIntelligenceFields";



export type IntelligenceScope = "organization" | "provider" | "case";



export const INTELLIGENCE_SCOPE_ORDER: IntelligenceScope[] = [

  "organization",

  "provider",

  "case",

];



export const INTELLIGENCE_SCOPE_LABELS: Record<IntelligenceScope, string> = {

  organization: "Organization / Facility Intelligence",

  provider: "Provider Intelligence",

  case: "Case Intelligence",

};



export const INTELLIGENCE_SCOPE_SHORT_LABELS: Record<IntelligenceScope, string> = {

  organization: "Facility",

  provider: "Provider",

  case: "Case",

};



export const INTELLIGENCE_SCOPE_DESCRIPTIONS: Record<IntelligenceScope, string> = {

  organization:

    "Shared across providers at the same hospital or facility — OR access workflow, vendor credentialing, observation policy, scheduling, SPD/tray behavior, purchasing/committee process, facility logistics, and room turnover patterns.",

  provider:

    "Specific to one surgeon or provider — procedure mix, technique preferences, product fit, evaluation openness, relationship style, communication style, and clinical workflow interests.",

  case:

    "Specific to one scheduled case — implants on site, trays sterilized, room assignment, support coverage, arrival time, product needs, live observation notes, debrief, and case-specific risks.",

};



export const INTELLIGENCE_SCOPE_EXAMPLES: Record<IntelligenceScope, readonly string[]> = {

  organization: [

    "Credentialing",

    "OR access rules",

    "Observation process",

    "Scheduling workflow",

    "SPD / tray logistics",

    "Hospital purchasing",

    "Committee process",

    "Room logistics",

  ],

  provider: [

    "Surgeon preferences",

    "Procedure mix",

    "Evaluation appetite",

    "Clinical interests",

    "Relationship status",

    "Communication preferences",

    "Adoption behavior",

  ],

  case: [

    "Implants",

    "Trays",

    "Case timing",

    "Support coverage",

    "Room-specific needs",

    "Product availability",

    "Case risks",

  ],

};



const SCOPE_BY_DB_KEY = new Map<string, IntelligenceScope>();



for (const def of ORGANIZATION_INTELLIGENCE_FIELD_DEFS) {

  SCOPE_BY_DB_KEY.set(def.dbKey, "organization");

}

for (const def of PROVIDER_INTELLIGENCE_FIELD_DEFS) {

  SCOPE_BY_DB_KEY.set(def.dbKey, "provider");

}

for (const def of CASE_INTELLIGENCE_FIELD_DEFS) {

  SCOPE_BY_DB_KEY.set(def.dbKey, "case");

}

for (const def of ENGAGEMENT_INTELLIGENCE_FIELD_DEFS) {

  SCOPE_BY_DB_KEY.set(def.dbKey, "case");

}



/** All persistent intelligence dbKeys on provider/org contact rows. */

export const PERSISTENT_INTELLIGENCE_DB_KEYS = [

  ...ORGANIZATION_INTELLIGENCE_DB_KEYS,

  ...PROVIDER_INTELLIGENCE_DB_KEYS,

] as const;



/** Provider planning PATCH may include org + provider persistent keys (not case). */

export const PERSISTENT_PLANNING_PATCH_DB_KEYS = [...PERSISTENT_INTELLIGENCE_DB_KEYS] as const;



/** Case-scoped keys (case table + engagement touch planning). */

export const CASE_SCOPED_INTELLIGENCE_DB_KEYS = [

  ...CASE_INTELLIGENCE_DB_KEYS,

  ...ENGAGEMENT_INTELLIGENCE_DB_KEYS,

] as const;



export function intelligenceScopeForDbKey(key: string): IntelligenceScope | null {

  return SCOPE_BY_DB_KEY.get(key) ?? null;

}



export function isPersistentIntelligenceDbKey(key: string): boolean {

  return isOrganizationIntelligenceDbKey(key) || isProviderIntelligenceDbKey(key);

}



export function isCaseScopedIntelligenceDbKey(key: string): boolean {

  return isCaseIntelligenceDbKey(key) || isEngagementIntelligenceDbKey(key);

}



export function intelligenceFieldDefsForScope(scope: IntelligenceScope) {

  switch (scope) {

    case "organization":

      return ORGANIZATION_INTELLIGENCE_FIELD_DEFS;

    case "provider":

      return PROVIDER_INTELLIGENCE_FIELD_DEFS;

    case "case":

      return [...CASE_INTELLIGENCE_FIELD_DEFS, ...ENGAGEMENT_INTELLIGENCE_FIELD_DEFS];

  }

}



export function dbKeysForIntelligenceScope(scope: IntelligenceScope): readonly string[] {

  switch (scope) {

    case "organization":

      return ORGANIZATION_INTELLIGENCE_DB_KEYS;

    case "provider":

      return PROVIDER_INTELLIGENCE_DB_KEYS;

    case "case":

      return CASE_SCOPED_INTELLIGENCE_DB_KEYS;

  }

}



/** Default capture destination scope when a field key is not explicitly chosen. */

export function defaultCaptureScopeForDbKey(dbKey: string): IntelligenceScope {

  return intelligenceScopeForDbKey(dbKey) ?? "provider";

}



export function scopeLabelForDbKey(dbKey: string): string {

  const scope = intelligenceScopeForDbKey(dbKey);

  return scope ? INTELLIGENCE_SCOPE_SHORT_LABELS[scope] : "Unknown";

}



/** @deprecated Engagement scope merged into case — use IntelligenceScope "case". */

export type LegacyEngagementIntelligenceScope = never;


