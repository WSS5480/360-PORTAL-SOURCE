/**
 * Pass 3 — deterministic review UI copy (templates only; no AI prose).
 */

import { formatClinicalFocusLearned, normalizeClinicalIntelligenceFromFact } from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import type { DebriefFactKey } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefFactKeys";
import type {
  DebriefClassifiedFact,
  DebriefIntelligenceCapturedKind,
  DebriefRulesOutcome,
} from "@/lib/surgical-sales/debriefIntelligencePipeline/types";
import { formatCommercialImpactDestination, commercialImpactForCapturedKind } from "@/lib/surgical-sales/debriefReviewPropagation";

export const DEBRIEF_REVIEW_SECTION_INTELLIGENCE_CAPTURED = "Intelligence Captured";
export const DEBRIEF_REVIEW_SECTION_RECOMMENDED_ACTIONS = "Recommended Actions";

export const INTELLIGENCE_CARD_TITLES: Record<DebriefIntelligenceCapturedKind, string> = {
  observation_access_status: "Observation access status",
  credentialing_requirement: "Credentialing requirement",
  clinical_focus: "Clinical focus",
  workflow_ownership: "Workflow ownership",
  product_relevance: "Product relevance",
  current_product_use: "Current product use",
};

const CLINICAL_LEARNED_BY_KEY: Partial<Record<DebriefFactKey, string>> = {
  clinical_robotic_ventral_hernia_increasing:
    "Robotic ventral hernia repair · Increasing procedure volume",
  clinical_abdominal_wall_reconstruction_increasing:
    "Abdominal wall reconstruction · Increasing case volume",
  clinical_robotic_ventral_hernia: "Robotic ventral hernia repair · Procedure focus area",
  clinical_abdominal_wall_reconstruction: "Abdominal wall reconstruction · Procedure focus area",
  product_fit_discussed: "Product evaluation · Product-relevant opportunity",
  product_acsis_discussed: "ACSIS evaluation · Product-relevant opportunity",
};

export function learnedLineForObservationAccess(rules: DebriefRulesOutcome): string {
  if (rules.observationApprovedExplicit) {
    return "Observation access was explicitly approved.";
  }
  if (rules.observationInterestOnly) {
    return "Observation appears possible; approval not yet explicit.";
  }
  return "Observation access still needs validation.";
}

export function learnedLineForCredentialing(
  rules: DebriefRulesOutcome,
  credFacts: DebriefClassifiedFact[],
): string {
  if (rules.credentialingPlatformLabel === "Unknown") {
    const hasRequired = credFacts.some((f) =>
      [
        "credentialing_required_platform_unknown",
        "credentialing_discussed",
        "credentialing_platform_mentioned_unconfirmed",
      ].includes(f.fact_key),
    );
    if (hasRequired) {
      return "Credentialing is required; credentialing platform is Unknown on file.";
    }
    return "Credentialing platform is Unknown on file.";
  }
  if (rules.credentialingPlatformConfirmed) {
    return `Credentialing goes through ${rules.credentialingPlatformLabel} (confirmed in debrief).`;
  }
  return "Vendor credentialing is required before observation.";
}

export function learnedLineForWorkflowOwnership(
  schedFacts: DebriefClassifiedFact[],
): string | null {
  const roleBits = schedFacts
    .filter((f) => f.named_people[0])
    .map((f) => {
      const name = f.named_people[0]!;
      const quote = f.evidence_quote.trim();
      if (/\bhandles?\s+scheduling\b/i.test(quote)) {
        return `${name} handles scheduling.`;
      }
      if (/\bcoordinat\w*\s+scheduling\b/i.test(quote)) {
        return `${name} coordinates scheduling.`;
      }
      return `${name} was mentioned in relation to scheduling.`;
    });
  if (roleBits.length > 0) return roleBits.join(" ");
  if (schedFacts.some((f) => f.fact_key === "scheduling_discussed")) {
    return "Scheduling coordination was discussed.";
  }
  return null;
}

export function learnedLinesForClinicalFocus(facts: DebriefClassifiedFact[]): string[] {
  const lines: string[] = [];
  for (const fact of facts) {
    const atomicValue = typeof fact.attributes?.value === "string" ? fact.attributes.value.trim() : "";
    const normalized = normalizeClinicalIntelligenceFromFact({
      value: atomicValue || fact.evidence_quote,
      evidence: fact.evidence_quote,
    });
    if (normalized) {
      lines.push(normalized.storageValue);
      continue;
    }
    const key = fact.fact_key as DebriefFactKey;
    const template = CLINICAL_LEARNED_BY_KEY[key];
    if (template) lines.push(template);
  }
  return [...new Set(lines)];
}

export function formatClinicalFocusCardLearned(facts: DebriefClassifiedFact[]): string {
  return formatClinicalFocusLearned(learnedLinesForClinicalFocus(facts));
}

export function whatWillUpdateForKind(kind: DebriefIntelligenceCapturedKind): string {
  return formatCommercialImpactDestination(commercialImpactForCapturedKind(kind));
}

export const ACTION_TITLES = {
  createWorkflowContact: (name: string) => name,
  followUpTask: "Create follow-up task?",
  updateObservationStatus: "Update observation status?",
  scheduleEngagement: "Schedule follow-up engagement?",
} as const;

export function workflowContactBody(input: {
  displayName: string;
  possibleRole: string | null;
}): string {
  if (input.possibleRole) {
    return `${input.displayName}. Possible role: ${input.possibleRole}.`;
  }
  return `${input.displayName} was mentioned during the debrief.`;
}

export const BRIEFING_ACCESS_SUMMARY_TITLE = "Access Summary";

export function briefingAccessSummaryLines(rules: DebriefRulesOutcome): string[] {
  const lines: string[] = [BRIEFING_ACCESS_SUMMARY_TITLE];
  if (rules.observationApprovedExplicit) {
    lines.push("Observation was explicitly approved.");
  } else if (rules.observationInterestOnly) {
    lines.push("Observation appears possible with follow-through on access steps.");
  } else {
    lines.push("Observation access still needs validation.");
  }
  return lines;
}

export function briefingCredentialingLine(rules: DebriefRulesOutcome): string | null {
  if (rules.credentialingPlatformLabel === "Unknown") {
    return "Credentialing platform is Unknown; vendor names mentioned without confirmation are not confirmed.";
  }
  if (rules.credentialingPlatformConfirmed) {
    return `Credentialing goes through ${rules.credentialingPlatformLabel} (confirmed in debrief).`;
  }
  return null;
}
