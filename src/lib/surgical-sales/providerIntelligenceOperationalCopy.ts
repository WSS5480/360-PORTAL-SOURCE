/**
 * Operational intelligence copy — field execution and commercialization language.
 * Prefer these phrases over CRM/administrative wording across the Intelligence system.
 */

import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { sanitizeLegacyIntelligenceUserCopy } from "@/lib/surgical-sales/legacyIntelligenceUserCopy";
import { operationalVisibilityStateLabel } from "@/lib/surgical-sales/operationalVisibilityVocabulary";

/** Rep-facing field / gap states (replaces "not on file", "not captured"). */
export const OPERATIONAL_INTEL_FIELD_STATE = {
  unset: "Still learning — confirm on next touch",
  building: "Operational read forming",
  pendingCheck: "Needs field validation",
  assumption: "Working assumption — validate live",
  confirmed: "Confirmed for deployment planning",
} as const;

/** Area depth on cards and tracks */
export const OPERATIONAL_INTEL_AREA_DEPTH = {
  unknown: operationalVisibilityStateLabel("early"),
  partial: operationalVisibilityStateLabel("developing"),
  confirmed: operationalVisibilityStateLabel("strong"),
  validated: operationalVisibilityStateLabel("validated"),
} as const;

/** Planning / workspace area status */
export const OPERATIONAL_INTEL_AREA_STATUS = {
  not_started: "Still learning for deployment",
  in_progress: "Operational map in progress",
  complete: "Ready for field execution",
  needs_update: "Stale — revalidate on next touch",
} as const;

/** Trust tier labels */
export const OPERATIONAL_INTEL_TRUST = {
  validated: "Operationally trusted",
  emerging: "Directional — validate before deploying",
  unknown: "Still learning for deployment planning",
} as const;

export const OPERATIONAL_INTEL_TRUST_HINTS = {
  validated: "Enough to plan case days and commercial moves",
  emerging: "Directional read — confirm before committing field time",
  unknown: "Too thin to plan observation or evaluation yet",
} as const;

/** Mission / area readiness badges */
export const OPERATIONAL_INTEL_READINESS_STATUS = {
  confirmed: "Operationally clear",
  partial: "Partially clear",
  high_risk: "Still confirming",
  not_explored: "Still learning",
} as const;

export const OPERATIONAL_INTEL_READINESS_HINTS = {
  confirmed: "Enough to plan case days and field moves",
  partial: "Additional context helps — capture on next touch",
  high_risk: "Confirm on next touch before booking OR time",
  not_explored: "Insight opportunity — refine when you are in the account",
} as const;

/** Section card empty states */
export const OPERATIONAL_INTEL_SECTION_EMPTY: Record<ProviderIntelligenceSectionId, string> = {
  clinical_workflow: "Procedure mix and room rhythm still learning — refine on next touch.",
  or_environment: "OR access and scheduling still learning — additional context welcome.",
  relationship_intelligence: "Relationship signals still learning — influence path can refine later.",
  commercial_signals: "Evaluation appetite still learning — commercial path open for discovery.",
  observation_readiness: "Observation path still learning — credentialing and access can refine before booking.",
};

export const OPERATIONAL_INTEL_SECTION_OPEN_CLEAR =
  "No open items in this lane — refine later if the account shifts.";

/** Scope / workspace empty hints */
export const OPERATIONAL_INTEL_SCOPE_EMPTY = {
  facility:
    "Still learning facility workflow — vendor clearance and observation path not yet confirmed.",
  provider:
    "Still learning this surgeon — procedure mix and evaluation openness not yet discussed.",
} as const;

/** Investigation workspace */
export const OPERATIONAL_INTEL_INVESTIGATION = {
  notCaptured: "Still learning on the operational map",
  notCapturedCount: (n: number) =>
    `${n} open item${n === 1 ? "" : "s"} still learning`,
  likelyRisks: "Open items to confirm",
  nextDiscoveries: "Insight opportunities",
  whatWeKnow: "Operationally confirmed",
  whatWeStillNeed: "Open items",
  fieldReadiness: "Field readiness",
  nextAction: "Next field move",
} as const;

/** Track / strength labels */
export const OPERATIONAL_INTEL_TRACK = {
  clinical: "Workflow & OR",
  relationship: "Relationship",
  commercial: "Commercial & observation",
  strengthStrong: "Operationally clear",
  strengthBuilding: "Map building",
  strengthLimited: "Developing visibility",
} as const;

/** Synthesis fallbacks (account / commercial picture) */
export const OPERATIONAL_INTEL_SYNTHESIS = {
  operateFallback: "OR access, scheduling, and case-flow still need field validation.",
  decisionsFallback: "Evaluation path and relationship influence not validated yet.",
  blockersFallback: "No open items flagged yet — keep building context with each touch.",
  missingFallback: "Core operational signals in place — validate on the next touch.",
  tacticalFallback: "Map access and workflow before observation or evaluation spend.",
} as const;

/** Relationship / maturity headlines */
export const OPERATIONAL_INTEL_RELATIONSHIP = {
  environmentEmpty: "Relationship environment still developing for field planning.",
  engagementUnknown: "Surgeon engagement style not validated in the field",
  vendorRulesUnknown: "Incumbent vendor access rules not validated",
  signalsUncaptured: "Relationship signals thin — validate influence and engagement style.",
} as const;

/** Briefing / chip fallbacks */
export const OPERATIONAL_INTEL_CHIP_FALLBACK = {
  unknown: "Still learning",
  partial: "Needs validation",
} as const;

/** Sanitize legacy CRM/admin phrases in dynamic copy */
export function sanitizeOperationalIntelCopy(text: string): string {
  return sanitizeLegacyIntelligenceUserCopy(
    text
      .replace(/\bno intelligence captured\b/gi, "Still learning")
      .replace(/\boperational visibility limited\b/gi, "Developing visibility")
      .replace(/\bvisibility limited\b/gi, "Developing visibility")
      .replace(/\bnot on file yet?\b/gi, "not validated in the field")
      .replace(/\bnot on file\b/gi, "not validated in the field")
      .replace(/\bnot captured yet\b/gi, "still learning on the operational map")
      .replace(/\bnot captured\b/gi, "still learning")
      .replace(/\bfield missing\b/gi, "additional context open")
      .replace(/\bunmapped\b/gi, "still learning")
      .replace(/\bnot\s+ready\b/gi, "still learning")
      .replace(/\bmissing\s+fields?\b/gi, "additional context")
      .replace(/\bopen\s+questions?\b/gi, "open items")
      .replace(/\bblockers?\b/gi, "open items")
      .replace(/\bgaps?\b/gi, "open items")
      .replace(/\baccess barriers?\b/gi, "access details open")
      .replace(/\bnot pursuing observation\b/gi, "observation permission declined")
      .replace(/\bpriority learning\b/gi, "worth confirming soon")
      .replace(/\blow confidence\b/gi, "limited field context available")
      .replace(/\bdeployment gaps?\b/gi, "supporting details")
      .replace(/\bclinical missing\b/gi, "clinical context not yet captured")
      .replace(/\bincomplete\b/gi, "still learning")
      .replace(/\bnothing confirmed\b/gi, "nothing operationally confirmed")
      .replace(/\bno .+ confirmed yet\b/gi, (m) => m.replace(/confirmed yet/i, "validated yet"))
      .replace(/\bcaptur(e|ing)\s+intelligence\b/gi, "mapping operational context")
      .replace(/\bintelligence captured\b/gi, "operational context mapped")
      .replace(/\bsignal(s)?\b/gi, "read")
      .replace(/\bleverage\b/gi, "priority")
      .replace(/\bunlock(s)?\b/gi, "enables")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );
}
