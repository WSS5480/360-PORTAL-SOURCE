/**
 * Rep-facing operational action labels — explicit field verbs, not CRM-generic CTAs.
 */

import { ENGAGEMENT_DEBRIEF_LABEL } from "@/lib/surgical-sales/engagements/engagementUiLabels";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  normalizeEngagementType,
  type EngagementType,
} from "@/lib/surgical-sales/engagements/engagementTypes";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { learningGapForField } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  intelligenceContextualCaptureCta,
  intelligenceContextualReviewCta,
  type IntelligenceStatusCardId,
} from "@/lib/surgical-sales/providerIntelligenceContextualCtas";

/** Priority open fields when choosing an in-progress engagement action. */
const PRIORITY_OPEN_DB_KEYS: { dbKey: string; sectionId: ProviderIntelligenceSectionId }[] = [
  { dbKey: "provider_observation_coordinator_contact", sectionId: "observation_readiness" },
  { dbKey: "provider_observation_feasibility", sectionId: "observation_readiness" },
  { dbKey: "provider_credentialing_status", sectionId: "or_environment" },
  { dbKey: "provider_observation_access_path", sectionId: "observation_readiness" },
  { dbKey: "provider_observation_cadence_preference", sectionId: "observation_readiness" },
  { dbKey: "provider_procedure_focus", sectionId: "clinical_workflow" },
  { dbKey: "influence_level", sectionId: "relationship_intelligence" },
];

const IN_PROGRESS_BY_TYPE: Partial<Record<EngagementType, string>> = {};

const OPEN_BY_TYPE: Partial<Record<EngagementType, string>> = {
  intro_call: "Prepare intro call outreach",
  observation_request: "Prepare observation outreach",
  or_visit: "Prepare observation outreach",
  follow_up: "Confirm follow-up plan",
};

const PREP_BY_TYPE: Partial<Record<EngagementType, string>> = {
  intro_call: "Prep intro call agenda",
  observation_request: "Prep observation day",
  or_visit: "Prep OR visit plan",
  follow_up: "Prep follow-up agenda",
};

export function operationalFieldActionLabel(
  dbKey: string,
  options?: { revalidate?: boolean },
): string {
  return intelligenceContextualCaptureCta(dbKey, options);
}

export function operationalCloseGapLabel(dbKey: string): string {
  return operationalFieldActionLabel(dbKey);
}

export function operationalReviewAreaLabel(cardId: IntelligenceStatusCardId): string {
  return intelligenceContextualReviewCta(cardId);
}

export function operationalReviewAccountLabel(): string {
  return "Review account understanding";
}

export function topOpenFieldDbKey(contact: Record<string, unknown>): string | null {
  for (const { dbKey, sectionId } of PRIORITY_OPEN_DB_KEYS) {
    const gap = learningGapForField(dbKey, sectionId, contact);
    if (gap) return dbKey;
  }
  return null;
}

export function operationalOverviewCaptureLabel(contact?: Record<string, unknown>): string {
  const dbKey = contact ? topOpenFieldDbKey(contact) : null;
  if (dbKey) return operationalFieldActionLabel(dbKey);
  return "Confirm open field items";
}

function engagementTypeOf(engagement: ProviderEngagementSummary): EngagementType | "" {
  return normalizeEngagementType(engagement.engagement_type);
}

export function operationalInProgressEngagementLabel(
  engagement: ProviderEngagementSummary,
  _contact?: Record<string, unknown>,
): string {
  const type = engagementTypeOf(engagement);
  if (type && IN_PROGRESS_BY_TYPE[type]) return IN_PROGRESS_BY_TYPE[type];

  return ENGAGEMENT_DEBRIEF_LABEL;
}

export function operationalOpenEngagementLabel(engagement: ProviderEngagementSummary): string {
  const type = engagementTypeOf(engagement);
  if (type && OPEN_BY_TYPE[type]) return OPEN_BY_TYPE[type];
  return "Review touch plan";
}

export function operationalPrepareMeetingLabel(engagement: ProviderEngagementSummary): string {
  const type = engagementTypeOf(engagement);
  if (type && PREP_BY_TYPE[type]) return PREP_BY_TYPE[type];
  return "Prep before visit";
}

export function operationalUpcomingEngagementLabel(
  engagement: ProviderEngagementSummary,
  contact?: Record<string, unknown>,
): string {
  if (engagement.status === "in_progress") {
    return operationalInProgressEngagementLabel(engagement, contact);
  }
  return operationalOpenEngagementLabel(engagement);
}

export function operationalIntelligenceRefreshLabel(contact?: Record<string, unknown>): string {
  const dbKey = contact ? topOpenFieldDbKey(contact) : null;
  if (dbKey) return operationalFieldActionLabel(dbKey, { revalidate: true });
  return "Refresh account understanding";
}

export function operationalDocumentWorkflowLabel(): string {
  return operationalFieldActionLabel("provider_procedure_focus");
}

export function operationalDiscoveryPrioritiesLabel(): string {
  return "Confirm open field items";
}

export function operationalValidateBeforeDeployLabel(dbKey?: string | null): string {
  if (dbKey) return operationalFieldActionLabel(dbKey);
  return "Confirm before booking";
}
