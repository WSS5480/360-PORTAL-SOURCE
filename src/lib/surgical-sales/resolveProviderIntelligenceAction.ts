/**
 * Evidence-based primary actions for provider field intelligence (rep-facing labels).
 */

import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import {
  providerHasFieldIntelligenceEvidence,
  type ProviderFieldIntelligenceEvidenceInput,
} from "@/lib/surgical-sales/providerFieldIntelligenceEvidence";

export type ProviderIntelligenceActionId =
  | "start_discovery"
  | "build_intelligence"
  | "capture_field_insights"
  | "review_findings";

export type ProviderIntelligenceAction = {
  id: ProviderIntelligenceActionId;
  label: string;
  description: string;
};

export const PROVIDER_INTELLIGENCE_ACTION_LABEL: Record<ProviderIntelligenceActionId, string> = {
  start_discovery: "Start Discovery",
  build_intelligence: "Build Intelligence",
  capture_field_insights: "Capture Field Insights",
  review_findings: "Review Findings",
};

const OBSERVATION_INTEL_KEYS = [
  "live_observation_workflow",
  "live_observation_clinical_pain_points",
  "live_observation_surgeon_reactions",
  "live_observation_product_fit",
  "live_observation_competitors",
  "live_observation_staff_process",
  "live_observation_questions",
  "live_observation_follow_up_items",
  "debrief_key_findings",
  "observation_workflow_intelligence_snapshot",
  "observation_quick_finding_product_interest",
] as const;

const CLOSED_OBSERVATION_STATUSES = new Set(["closed", "cancelled", "canceled"]);

function normalizeCaseType(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

function observationCases(cases: Array<Record<string, unknown>> | undefined): Array<Record<string, unknown>> {
  return (cases ?? []).filter((c) => normalizeCaseType(c.case_type) === "observation");
}

function observationCaseHasIntelligence(caseRow: Record<string, unknown>): boolean {
  for (const key of OBSERVATION_INTEL_KEYS) {
    if (String(caseRow[key] ?? "").trim()) return true;
  }
  return false;
}

function hasActiveObservationCase(cases: Array<Record<string, unknown>> | undefined): boolean {
  return observationCases(cases).some((caseRow) => {
    if (observationCaseHasIntelligence(caseRow)) return false;
    const status = String(caseRow.status ?? "").trim().toLowerCase();
    return !CLOSED_OBSERVATION_STATUSES.has(status);
  });
}

function hasObservationIntelligence(cases: Array<Record<string, unknown>> | undefined): boolean {
  return observationCases(cases).some(observationCaseHasIntelligence);
}

const ACTION_DESCRIPTION: Record<ProviderIntelligenceActionId, string> = {
  start_discovery:
    "Begin learning how this provider operates — schedule an intro call or capture your first field notes.",
  build_intelligence:
    "Add what you know about access, clinical fit, product use, and who can help move this forward.",
  capture_field_insights:
    "Document workflow, product use, and surgeon reactions while the observation is active.",
  review_findings:
    "Walk through observation learnings and confirm what is validated versus still open.",
};

export function resolveProviderIntelligenceAction(
  input: ProviderFieldIntelligenceEvidenceInput,
): ProviderIntelligenceAction {
  if (hasObservationIntelligence(input.cases)) {
    return {
      id: "review_findings",
      label: PROVIDER_INTELLIGENCE_ACTION_LABEL.review_findings,
      description: ACTION_DESCRIPTION.review_findings,
    };
  }

  if (hasActiveObservationCase(input.cases)) {
    return {
      id: "capture_field_insights",
      label: PROVIDER_INTELLIGENCE_ACTION_LABEL.capture_field_insights,
      description: ACTION_DESCRIPTION.capture_field_insights,
    };
  }

  if (providerHasFieldIntelligenceEvidence(input)) {
    return {
      id: "build_intelligence",
      label: PROVIDER_INTELLIGENCE_ACTION_LABEL.build_intelligence,
      description: ACTION_DESCRIPTION.build_intelligence,
    };
  }

  return {
    id: "start_discovery",
    label: PROVIDER_INTELLIGENCE_ACTION_LABEL.start_discovery,
    description: ACTION_DESCRIPTION.start_discovery,
  };
}
