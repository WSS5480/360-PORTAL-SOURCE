/**
 * Early Discovery vs access-mapping progression for provider overview.
 * Relationship and openness come before operational access mapping.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/providerObservationApproval";
import { deriveDiscoveryWorkflowRecommendation } from "@/lib/surgical-sales/deriveProviderWorkflowRecommendation";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import type { SalesPathwayRequirement } from "@/lib/surgical-sales/providerSalesPathwayExecution";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  hasAccessPathwayIdentified,
  resolveDiscoveryPathwayNextMoveLine,
} from "@/lib/surgical-sales/providerOverviewDiscoveryNextMove";
import { hasSchedulingIntelligenceOnFile } from "@/lib/surgical-sales/schedulingIntelligenceReadModel";
import { engagementHasLoggedExecutionOutcome } from "@/lib/surgical-sales/relationshipStageProgression";
import { hasCompletedIntroTouch } from "@/lib/surgical-sales/deriveProviderWorkflowRecommendation";
import {
  ADVANCE_OBSERVATION_ACCESS_OBJECTIVE,
  buildProviderObservationReadiness,
} from "@/lib/surgical-sales/providerObservationReadiness";
import { isObservationAccessConditionallyAllowed } from "@/lib/surgical-sales/observationAccessWorkflowState";

export type ProviderDiscoveryMotionPhase = "relationship_first" | "access_mapping";

export const EARLY_DISCOVERY_NEXT_FIELD_ACTION_DETAIL =
  "Schedule provider intro conversation to assess openness to observation and workflow collaboration.";

const ACCESS_MAPPING_DETAIL_PATTERN =
  /\b(access path|scheduling owner|scheduler|vendor clearance|credentialing|OR access|OR sponsor|coordinate observation logistics)\b/i;

const RELATIONSHIP_FIRST_DEFAULT_SUBTEXT =
  "Build the provider relationship before mapping facility access or scheduling logistics.";

export function buildProviderEngagementTypeHref(baseHref: string, engagementType: string): string {
  const u = new URL(baseHref, "http://local");
  u.searchParams.set("engagement_type", engagementType);
  return `${u.pathname}${u.search}`;
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

function hasObservationPermission(contact: Record<string, unknown>): boolean {
  const v = String(contact.provider_observation_feasibility ?? "").trim().toLowerCase();
  return v === "easy" || v === "restricted" || v === "approved" || v === "yes";
}

/** True only before a completed intro establishes observation interest — not after debrief save. */
export function isRelationshipFirstDiscovery(input: {
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
}): boolean {
  if (hasProviderObservationApprovalValidated(input.contact)) return false;
  if (hasCompletedIntroTouch(input.engagements)) return false;
  if (isObservationAccessConditionallyAllowed(input.contact)) return false;
  return true;
}

export function resolveProviderDiscoveryMotionPhase(input: {
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
}): ProviderDiscoveryMotionPhase {
  return isRelationshipFirstDiscovery(input) ? "relationship_first" : "access_mapping";
}

export function discoveryPathwayStageObjective(phase: ProviderDiscoveryMotionPhase): string {
  if (phase === "access_mapping") return ADVANCE_OBSERVATION_ACCESS_OBJECTIVE;
  return "Assess provider interest in OR observation.";
}

function hasProviderInterestSignal(
  contact: Record<string, unknown>,
  engagements: ProviderEngagementSummary[],
): boolean {
  return (
    engagements.some(engagementHasLoggedExecutionOutcome) ||
    hasLoggedProviderOpenness(contact) ||
    isIntelligenceFieldValidatedOnFile("provider_evaluation_openness", contact) ||
    fieldHasIntelligenceSignal(
      "provider_communication_style",
      contact.provider_communication_style as string | null | undefined,
    )
  );
}

function hasObservationOpennessSignal(contact: Record<string, unknown>): boolean {
  return hasObservationPermission(contact) || hasLoggedProviderOpenness(contact);
}

function hasWorkflowFitSignal(contact: Record<string, unknown>): boolean {
  return (
    fieldHasIntelligenceSignal(
      "provider_procedure_focus",
      contact.provider_procedure_focus as string | null | undefined,
    ) ||
    isIntelligenceFieldValidatedOnFile("provider_procedure_focus", contact)
  );
}

export function buildRelationshipFirstDiscoveryRequirements(input: {
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
}): SalesPathwayRequirement[] {
  const engagements = input.engagements ?? [];
  return [
    {
      label: "Understand provider interest",
      met: hasProviderInterestSignal(input.contact, engagements),
      dbKey: "provider_evaluation_openness",
      sectionId: "relationship_intelligence",
    },
    {
      label: "Assess observation openness",
      met: hasObservationOpennessSignal(input.contact),
      dbKey: "provider_observation_feasibility",
      sectionId: "observation_readiness",
    },
    {
      label: "Understand workflow fit",
      met: hasWorkflowFitSignal(input.contact),
      dbKey: "provider_procedure_focus",
      sectionId: "clinical_workflow",
    },
  ];
}

export function buildAccessMappingDiscoveryRequirements(input: {
  contact: Record<string, unknown>;
}): SalesPathwayRequirement[] {
  return [
    {
      label: "Identify scheduling ownership",
      met: hasSchedulingIntelligenceOnFile(input.contact),
      dbKey: "provider_scheduling_contact",
      sectionId: "observation_readiness",
    },
    {
      label: "Map facility access pathway",
      met: hasAccessPathwayIdentified(input.contact),
      dbKey: "provider_observation_access_path",
      sectionId: "observation_readiness",
    },
    {
      label: "Confirm observation logistics",
      met:
        hasObservationPermission(input.contact) &&
        (fieldHasIntelligenceSignal(
          "provider_observation_best_days_case_types",
          input.contact.provider_observation_best_days_case_types as string | null | undefined,
        ) ||
          isIntelligenceFieldValidatedOnFile("provider_observation_best_days_case_types", input.contact)),
      dbKey: "provider_observation_best_days_case_types",
      sectionId: "observation_readiness",
    },
  ];
}

export function resolveDiscoveryNextFieldAction(input: {
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  providerId: string;
  briefingHref: string;
  newEngagementHref: string;
  fallbackLabel: string;
  fallbackDetail: string;
  fallbackHref: string;
  pathwayStageId: string;
}): { label: string; detail: string; href: string } {
  if (input.pathwayStageId !== "discovery") {
    return {
      label: input.fallbackLabel,
      detail: sanitizeDiscoveryNextFieldDetail(input.fallbackDetail, "access_mapping"),
      href: input.fallbackHref,
    };
  }

  const motionPhase = resolveProviderDiscoveryMotionPhase({
    contact: input.contact,
    engagements: input.engagements,
  });
  const recommendation = deriveDiscoveryWorkflowRecommendation({
    contact: input.contact,
    engagements: input.engagements,
    providerId: input.providerId,
    newEngagementHref: input.newEngagementHref,
  });
  const detail =
    resolveDiscoveryPathwayNextMoveLine(input.contact) ??
    sanitizeDiscoveryNextFieldDetail(input.fallbackDetail, motionPhase);

  return {
    label: scanLine(recommendation.label, 48),
    detail,
    href: recommendation.href,
  };
}

export function sanitizeDiscoveryNextFieldDetail(
  detail: string,
  phase: ProviderDiscoveryMotionPhase,
): string {
  const trimmed = detail.trim();
  if (!trimmed) {
    return phase === "relationship_first"
      ? EARLY_DISCOVERY_NEXT_FIELD_ACTION_DETAIL
      : RELATIONSHIP_FIRST_DEFAULT_SUBTEXT;
  }

  if (phase === "relationship_first" && ACCESS_MAPPING_DETAIL_PATTERN.test(trimmed)) {
    return EARLY_DISCOVERY_NEXT_FIELD_ACTION_DETAIL;
  }

  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}

export function resolveDiscoveryStageDefaultDetail(
  pathwayStageId: string,
  phase: ProviderDiscoveryMotionPhase,
  contact?: Record<string, unknown>,
): string {
  if (pathwayStageId !== "discovery") {
    return "";
  }
  if (phase === "relationship_first") {
    return EARLY_DISCOVERY_NEXT_FIELD_ACTION_DETAIL;
  }
  if (contact) {
    return buildProviderObservationReadiness(contact).briefingStatusLine;
  }
  return "Provider is receptive to observation. Scheduling coordination and credentialing process still need to be confirmed.";
}
