/**
 * Provider Intelligence tab — knowledge workspace (known facts + gaps + evidence trail).
 */

import {
  buildProviderIntelligenceTimeline,
  mapTimelineToTabItems,
} from "@/lib/surgical-sales/buildProviderIntelligenceTimeline";
import type { ProviderClinicalDiscoveryAnswer } from "@/lib/surgical-sales/providerClinicalDiscoveryAnswers";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  providerHasFieldIntelligenceEvidence,
  type ProviderFieldIntelligenceEvidenceInput,
} from "@/lib/surgical-sales/providerFieldIntelligenceEvidence";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export type ProviderIntelligenceProgressiveStateId =
  | "new_provider"
  | "discovery_started"
  | "observation_completed"
  | "debrief_completed";

export type ProviderIntelligenceTimelineItem = {
  id: string;
  title: string;
  detail: string | null;
  whenLabel: string;
  href: string;
  sourceLabel: string;
};

export type ProviderIntelligenceTabView = {
  stateId: ProviderIntelligenceProgressiveStateId;
  pageTitle: string;
  subtitle: string;
  emptyKnowledgeMessage: string | null;
  timeline: ProviderIntelligenceTimelineItem[];
  timelineEmptyLabel: string;
};

const OBSERVATION_INTEL_FIELD_MAP: Array<{ caseKeys: string[] }> = [
  { caseKeys: ["live_observation_clinical_pain_points"] },
  { caseKeys: ["live_observation_workflow", "live_observation_staff_process"] },
  { caseKeys: ["live_observation_competitors"] },
  { caseKeys: ["live_observation_questions", "live_observation_follow_up_items"] },
  { caseKeys: ["live_observation_product_fit", "observation_quick_finding_product_interest"] },
];

function normalizeCaseType(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

function observationCases(cases: Array<Record<string, unknown>> | undefined): Array<Record<string, unknown>> {
  return (cases ?? []).filter((c) => normalizeCaseType(c.case_type) === "observation");
}

function hasDebriefCompleted(input: ProviderFieldIntelligenceEvidenceInput): boolean {
  if ((input.engagements ?? []).some((e) => Boolean(e.debrief_completed))) return true;
  return (input.cases ?? []).some((c) => Boolean(c.debrief_completed));
}

function observationCaseHasFieldIntel(caseRow: Record<string, unknown>): boolean {
  for (const spec of OBSERVATION_INTEL_FIELD_MAP) {
    for (const key of spec.caseKeys) {
      if (String(caseRow[key] ?? "").trim()) return true;
    }
  }
  return Boolean(String(caseRow.debrief_key_findings ?? "").trim());
}

function hasObservationFieldFindings(input: ProviderFieldIntelligenceEvidenceInput): boolean {
  return observationCases(input.cases).some(observationCaseHasFieldIntel);
}

export function resolveProviderIntelligenceProgressiveState(
  input: ProviderFieldIntelligenceEvidenceInput,
): ProviderIntelligenceProgressiveStateId {
  if (hasDebriefCompleted(input)) return "debrief_completed";
  if (hasObservationFieldFindings(input)) return "observation_completed";
  if (providerHasFieldIntelligenceEvidence(input)) return "discovery_started";
  return "new_provider";
}

export function buildProviderIntelligenceTabView(input: {
  contact: Record<string, unknown>;
  providerId: string;
  accountId?: string | null;
  specialty?: string | null;
  organizationName?: string | null;
  planning?: ProviderPlanningCompletion | null;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  clinicalDiscoveryAnswers?: ProviderClinicalDiscoveryAnswer[];
  activityTimeline?: Array<Record<string, unknown>>;
}): ProviderIntelligenceTabView {
  const evidenceInput: ProviderFieldIntelligenceEvidenceInput = {
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
    clinicalDiscoveryAnswers: input.clinicalDiscoveryAnswers,
    activityTimeline: input.activityTimeline,
  };

  const stateId = resolveProviderIntelligenceProgressiveState(evidenceInput);

  const intelligenceTimeline = buildProviderIntelligenceTimeline({
    providerId: input.providerId,
    contact: input.contact,
    engagements: input.engagements,
    cases: input.cases,
    activityTimeline: input.activityTimeline,
    clinicalDiscoveryAnswers: input.clinicalDiscoveryAnswers,
  });

  const timeline = mapTimelineToTabItems(intelligenceTimeline.events);

  const emptyKnowledgeMessage =
    stateId === "new_provider" ? "No field intelligence captured yet." : null;

  return {
    stateId,
    pageTitle: "Provider Intelligence",
    subtitle: "Accumulated field intelligence — review what the team has learned.",
    emptyKnowledgeMessage,
    timeline,
    timelineEmptyLabel: intelligenceTimeline.emptyLabel,
  };
}
