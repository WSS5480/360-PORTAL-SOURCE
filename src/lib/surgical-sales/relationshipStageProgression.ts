/**
 * Evidence-driven provider relationship / mission stage progression.
 * Planning activities (engagement create, briefing, templates) must never advance stage.
 */

import type { ProviderDirectoryRow } from "@/lib/surgical-sales/providerDirectory";
import { isProviderSalesCustomer } from "@/lib/surgical-sales/providerRelationshipStage";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import { DISCOVERY_FIELD_STATUS } from "@/lib/surgical-sales/discoveryFieldStatus";
import { resolveObservationApprovalStatus } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { engagementHasTacticalDebrief } from "@/lib/surgical-sales/engagements/engagementTacticalDebrief";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import {
  hasAccessPathwayIdentified,
} from "@/lib/surgical-sales/providerOverviewDiscoveryNextMove";
import { providerDebriefReady, deriveProviderObservationCount } from "@/lib/surgical-sales/providerObservationProgress";
import { hasSchedulingIntelligenceOnFile } from "@/lib/surgical-sales/schedulingIntelligenceReadModel";

const F = DISCOVERY_FIELD_STATUS;

/** Sources that must never advance workflow stage. */
export const WORKFLOW_STAGE_NON_EXECUTION_SOURCES = [
  "engagement_create",
  "briefing_generate",
  "template_generate",
  "planning_activity",
] as const;

export type WorkflowStageNonExecutionSource = (typeof WORKFLOW_STAGE_NON_EXECUTION_SOURCES)[number];

export type WorkflowStageAdvancementSource =
  | WorkflowStageNonExecutionSource
  | "outcome_log"
  | "case_completion"
  | "debrief_complete"
  | "manual_relationship_stage";

export function isNonExecutionStageAdvancementSource(
  source: string,
): source is WorkflowStageNonExecutionSource {
  return (WORKFLOW_STAGE_NON_EXECUTION_SOURCES as readonly string[]).includes(source);
}

/** Returns false for engagement create, briefing, template, and planning-only sources. */
export function workflowSourceMayAdvanceStage(source: WorkflowStageAdvancementSource): boolean {
  return !isNonExecutionStageAdvancementSource(source);
}

/** Logged outcome notes / debrief marker — execution evidence, not planning. */
export function engagementHasLoggedExecutionOutcome(
  engagement: Pick<ProviderEngagementSummary, "notes" | "debrief_completed" | "debrief_completed_at">,
): boolean {
  return engagementHasTacticalDebrief(engagement);
}

function hasLoggedProviderOpenness(contact: Record<string, unknown>): boolean {
  return (
    fieldHasIntelligenceSignal(
      "provider_evaluation_openness",
      contact.provider_evaluation_openness as string | null | undefined,
    ) ||
    isIntelligenceFieldValidatedOnFile("provider_evaluation_openness", contact)
  );
}

/** Observation approval validated on file from outcome-applied intelligence. */
export function providerHasObservationApprovalEvidence(contact: Record<string, unknown>): boolean {
  return hasProviderObservationApprovalValidated(contact);
}

/** Access secured and scheduling captured through outcome logging — not calendar planning alone. */
export function providerHasObservationScheduledEvidence(contact: Record<string, unknown>): boolean {
  if (!hasSchedulingIntelligenceOnFile(contact)) return false;
  return hasAccessPathwayIdentified(contact) || providerHasObservationApprovalEvidence(contact);
}

/** Partial observation / access intel from logged outcomes — not engagement type or calendar alone. */
export function providerHasObservationAccessIntelEvidence(contact: Record<string, unknown>): boolean {
  const approval = resolveObservationApprovalStatus(contact);
  if (approval !== F.unknown && approval !== F.blocked) return true;
  if (hasSchedulingIntelligenceOnFile(contact)) return true;
  if (hasAccessPathwayIdentified(contact)) return true;
  if (hasLoggedProviderOpenness(contact)) return true;
  return false;
}

export function providerHasObservationRequestedEvidence(input: {
  contact: Record<string, unknown>;
}): boolean {
  if (providerHasObservationScheduledEvidence(input.contact)) return false;
  if (providerHasObservationApprovalEvidence(input.contact)) return false;
  return providerHasObservationAccessIntelEvidence(input.contact);
}

export function providerContactRecord(contact: ProviderDirectoryRow): Record<string, unknown> {
  return contact as Record<string, unknown>;
}

/** Canonical field mission label — evidence-driven, never planning-driven. */
export function deriveEvidenceBasedProviderFieldMission(p: ProviderDirectoryRow): string {
  if (p.archived_at) return "Archived";
  if (isProviderSalesCustomer(p)) return "Customer";
  if (p.onboarding_status === "draft") return "Intro Call Needed";

  if ((p.linked_opportunities_count ?? 0) > 0) return "Prospect Active";

  if (providerDebriefReady(p)) return "Debrief Ready";

  const contact = providerContactRecord(p);
  const observationCount = deriveProviderObservationCount(p);

  if (observationCount > 0) {
    return "Observation In Progress";
  }

  if (providerHasObservationScheduledEvidence(contact)) {
    return "Observation Scheduled";
  }

  if (providerHasObservationApprovalEvidence(contact)) {
    return "Discovery — Approved";
  }

  if (providerHasObservationRequestedEvidence({ contact })) {
    return "Discovery In Progress";
  }

  return "Intro Call Needed";
}
