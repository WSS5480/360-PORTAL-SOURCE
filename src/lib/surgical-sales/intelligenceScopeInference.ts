/**

 * Assign extracted intelligence to organization, provider, or case scope.

 */



import type { TacticalDebriefCategoryId } from "@/lib/surgical-sales/engagements/prepareTacticalDebriefAnalyze";

import type { IntelligenceDomain, IntelligenceTarget } from "@/lib/surgical-sales/logUpdateOpenAiMapping";

import {

  dbKeysForIntelligenceScope,

  intelligenceScopeForDbKey,

  INTELLIGENCE_SCOPE_LABELS,

  INTELLIGENCE_SCOPE_SHORT_LABELS,

  type IntelligenceScope,

} from "@/lib/surgical-sales/intelligenceScopeModel";



import { applyIntelligenceMappingGuardrails } from "@/lib/surgical-sales/intelligenceMappingGuardrails";



export type IntelligenceScopeResolution = {

  scope: IntelligenceScope;

  reason: string;

  /** Set when a mapping guardrail corrected scope away from the raw heuristic. */

  guardrailApplied?: string;

};



const ORGANIZATION_TEXT =

  /\b(vendor\s+credential|credentialing|credentialed|OR\s+access|observation\s+(approval|process|policy|requests?)|scheduler|scheduling\s+(path|workflow|owner|process)|coordinator|committee|purchasing|procurement|preference\s+card|value\s+analysis|supply\s+chain|SPD|sterile\s+processing|tray\s+logistic|hospital\s+purchasing|room\s+logistic|facility\s+polic|hospital\s+polic|site[- ]wide|facility[- ]wide|all\s+surgeons|vendor\s+access|sterile\s+field\s+rules|turnover\s+pattern|facility\s+logistic)\b/i;



const PROVIDER_TEXT =

  /\b(surgeon\s+pref|provider\s+pref|technique\s+pref|procedure\s+mix|modality|clinical\s+interest|evaluation\s+(appetite|open)|open\s+to\s+evaluat|relationship\s+(status|strength)|champion|communication\s+pref|communication\s+style|responsive|follow[- ]?up\s+rhythm|case\s+mix|dissatisfaction|competitor|product\s+fit|adoption\s+behavior)\b/i;



const CASE_LOGISTICS_TEXT =

  /\b(implants?|trays?|case\s+timing|support\s+coverage|room[- ]specific|product\s+availability|case\s+risks?|trays?\s+(ready|steril)|room\s+assignment|arrival\s+time|product\s+needs?)\b/i;



const ENGAGEMENT_NOTE_TEXT =

  /\b(this\s+(visit|meeting|call|touch|conversation|engagement)|during\s+(the\s+)?(visit|meeting|call)|what\s+happened|agreed\s+to\s+(today|on\s+the\s+call)|before\s+(we\s+)?leave|follow[- ]?up\s+(from\s+(this|the)\s+(meeting|visit)|next\s+week)|intro\s+call\s+(went|outcome)|meeting\s+notes?|observation\s+notes?|commitment\s+from\s+this|temporary\s+context|next\s+step\s+from\s+this|on\s+this\s+engagement)\b/i;



const DOMAIN_DEFAULT_SCOPE: Record<IntelligenceDomain, IntelligenceScope> = {

  or_access: "organization",

  credentialing: "organization",

  scheduling: "organization",

  procurement: "organization",

  workflow: "provider",

  relationship: "provider",

  stakeholders: "provider",

  evaluation: "provider",

  product_fit: "provider",

  case_mix: "provider",

  next_steps: "case",

};



const DEBRIEF_CATEGORY_SCOPE: Record<TacticalDebriefCategoryId, IntelligenceScope> = {

  or_access: "organization",

  blockers_resolved: "organization",

  deployment_readiness: "organization",

  workflow_intelligence: "provider",

  product_interest: "provider",

  new_stakeholders: "provider",

  next_step_opportunity: "case",

};



const TARGET_TO_SCOPE: Record<IntelligenceTarget, IntelligenceScope | "infer"> = {

  organization: "organization",

  provider: "provider",

  engagement: "case",

  engagement_note: "case",

  case: "case",

  multiple: "infer",

};



export function intelligenceScopeBadgeLabel(scope: IntelligenceScope): string {

  return INTELLIGENCE_SCOPE_SHORT_LABELS[scope];

}



export {

  intelligenceSaveDestinationLabel,

  intelligenceSaveDestinationFromScope,

  resolveIntelligenceSaveDestination,

  type IntelligenceSaveDestination,

} from "@/lib/surgical-sales/intelligenceSaveDestination";



export function intelligenceScopeFullLabel(scope: IntelligenceScope): string {

  return INTELLIGENCE_SCOPE_LABELS[scope];

}



function scopeFromText(text: string): IntelligenceScope | null {

  const t = text.trim();

  if (!t) return null;

  if (CASE_LOGISTICS_TEXT.test(t)) return "case";

  if (ENGAGEMENT_NOTE_TEXT.test(t) && !ORGANIZATION_TEXT.test(t) && !PROVIDER_TEXT.test(t)) return "case";

  if (ORGANIZATION_TEXT.test(t)) return "organization";

  if (PROVIDER_TEXT.test(t)) return "provider";

  if (ENGAGEMENT_NOTE_TEXT.test(t)) return "case";

  return null;

}



function reasonForScope(scope: IntelligenceScope, source: string): string {

  switch (scope) {

    case "organization":

      return `${source} — facility-wide (credentialing, OR access, scheduling, purchasing, policies).`;

    case "provider":

      return `${source} — specific to this surgeon (preferences, mix, evaluation, relationship).`;

    case "case":

      return `${source} — this scheduled case only (logistics, live notes, debrief, visit prep).`;

  }

}



function resolveIntelligenceScopeHeuristic(input: {

  text?: string;

  dbKey?: string | null;

  domain?: IntelligenceDomain | null;

  debriefCategoryId?: TacticalDebriefCategoryId | null;

  logUpdateTarget?: IntelligenceTarget | null;

}): IntelligenceScopeResolution {

  const text = String(input.text ?? "").trim();



  if (input.dbKey) {

    const fromKey = intelligenceScopeForDbKey(input.dbKey);

    if (fromKey) {

      return { scope: fromKey, reason: reasonForScope(fromKey, `Mapped field (${input.dbKey})`) };

    }

  }



  if (input.logUpdateTarget && input.logUpdateTarget !== "multiple") {

    const mapped = TARGET_TO_SCOPE[input.logUpdateTarget];

    if (mapped !== "infer") {

      return { scope: mapped, reason: reasonForScope(mapped, "AI target") };

    }

  }



  const fromText = scopeFromText(text);

  if (fromText) {

    return { scope: fromText, reason: reasonForScope(fromText, "Note wording") };

  }



  if (input.debriefCategoryId) {

    const scope = DEBRIEF_CATEGORY_SCOPE[input.debriefCategoryId];

    return { scope, reason: reasonForScope(scope, `Debrief category (${input.debriefCategoryId})`) };

  }



  if (input.domain) {

    const scope = DOMAIN_DEFAULT_SCOPE[input.domain];

    if (input.domain === "stakeholders" && ORGANIZATION_TEXT.test(text)) {

      return { scope: "organization", reason: reasonForScope("organization", "Stakeholder / scheduling at facility") };

    }

    if (input.domain === "workflow" && ORGANIZATION_TEXT.test(text) && !PROVIDER_TEXT.test(text)) {

      return { scope: "organization", reason: reasonForScope("organization", "Facility workflow signal") };

    }

    return { scope, reason: reasonForScope(scope, `Domain (${input.domain})`) };

  }



  return { scope: "provider", reason: "Default — surgeon-specific unless clearly facility-wide or case-only." };

}



export function resolveIntelligenceScope(input: {

  text?: string;

  dbKey?: string | null;

  domain?: IntelligenceDomain | null;

  debriefCategoryId?: TacticalDebriefCategoryId | null;

  logUpdateTarget?: IntelligenceTarget | null;

}): IntelligenceScopeResolution {

  const heuristic = resolveIntelligenceScopeHeuristic(input);

  return applyIntelligenceMappingGuardrails({

    ...input,

    resolution: heuristic,

  });

}



export function resolveScopeForDbKey(dbKey: string, text?: string): IntelligenceScopeResolution {

  return resolveIntelligenceScope({ dbKey, text });

}



export function resolveScopeForLogUpdateField(

  dbKey: string,

  label: string,

  proposedValue: string,

): IntelligenceScopeResolution {

  return resolveIntelligenceScope({

    dbKey,

    text: `${label} ${proposedValue}`,

  });

}



export function resolveScopeForOperationalSignal(signal: {

  domain: IntelligenceDomain;

  operational_meaning: string;

  evidence?: string;

  target: IntelligenceTarget;

}): IntelligenceScopeResolution {

  return resolveIntelligenceScope({

    domain: signal.domain,

    text: `${signal.operational_meaning} ${signal.evidence ?? ""}`,

    logUpdateTarget: signal.target,

  });

}



export function resolveScopeForTacticalDebriefItem(

  categoryId: TacticalDebriefCategoryId,

  item: string,

): IntelligenceScopeResolution {

  return resolveIntelligenceScope({

    debriefCategoryId: categoryId,

    text: item,

  });

}



/** Writable contact fields for scope (org + provider persistent keys only). */

export function writableDbKeysForScope(scope: IntelligenceScope): Set<string> | null {

  if (scope === "case") return null;

  return new Set(dbKeysForIntelligenceScope(scope));

}



export const PERSISTENT_INTELLIGENCE_WRITABLE_DB_KEYS = [

  ...dbKeysForIntelligenceScope("organization"),

  ...dbKeysForIntelligenceScope("provider"),

] as const;


