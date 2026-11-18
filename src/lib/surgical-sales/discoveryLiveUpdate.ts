/**
 * Rapid Discovery live dashboard updates — deltas after each answer.
 */

import {
  buildCommercialDeploymentReadinessSnapshot,
  buildDeploymentReadinessImprovementReasons,
  type CommercialDeploymentReadinessSnapshot,
} from "@/lib/surgical-sales/commercialDeploymentReadiness";
import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  PROVIDER_INTELLIGENCE_SECTION_LABELS,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { buildSectionOperationalMappingProgress } from "@/lib/surgical-sales/providerIntelligenceOperationalMapping";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  buildDiscoveryLearnedFeedback,
  buildSectionSynthesizedScanSummary,
  deploymentReadinessBadgeLabel,
  intelligenceSectionForDbKey,
  synthesizeOperationalInsight,
} from "@/lib/surgical-sales/discoveryOperationalSynthesis";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { findPlanningSection } from "@/lib/surgical-sales/providerPlanningCompletion";
import {
  buildSingleIntelligenceSaveConfirmation,
  type IntelligenceSaveConfirmationGroup,
} from "@/lib/surgical-sales/intelligenceSaveConfirmation";
import type { IntelligenceDiscoveryStakeholder } from "@/lib/surgical-sales/providerIntelligenceStakeholderDiscovery";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildRapidDiscoveryPathwayImpact,
  type RapidDiscoveryPathwayImpact,
} from "@/lib/surgical-sales/buildRapidDiscoveryPathwayImpact";
import {
  RAPID_DISCOVERY_OPERATIONAL_STATUS_LABELS,
  type RapidDiscoveryOperationalStatus,
} from "@/lib/surgical-sales/rapidDiscoveryOperationalStatus";
import type { RapidDiscoveryRequirementLink } from "@/lib/surgical-sales/rapidDiscoverySupportContact";

export type DiscoveryLiveFeedback = {
  id: string;
  sectionId: ProviderIntelligenceSectionId;
  line: string;
  scanSummary: string;
  at: number;
};

export type DiscoveryAnswerImpact = {
  dbKey: string;
  sectionId: ProviderIntelligenceSectionId;
  sectionTitle: string;
  feedbackLine: string;
  scanSummaryLine: string;
  statusBadge: string;
  confirmedBefore: number;
  confirmedAfter: number;
  openBefore: number;
  openAfter: number;
  readinessBefore: number;
  readinessAfter: number;
  readinessReasons: string[];
  deploymentBefore: CommercialDeploymentReadinessSnapshot;
  deploymentAfter: CommercialDeploymentReadinessSnapshot;
  /** Where this answer was stored (organization / provider / engagement). */
  saveConfirmation: IntelligenceSaveConfirmationGroup | null;
  pathwayImpact: RapidDiscoveryPathwayImpact | null;
  operationalStatusLabel: string | null;
  requirementLink: RapidDiscoveryRequirementLink | null;
  linkedSupportContactName: string | null;
  answerValue?: string;
  at: number;
};

function deploymentSnapshot(
  contact: Record<string, unknown>,
  planning?: ProviderPlanningCompletion | null,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
  engagements?: ProviderEngagementSummary[],
): CommercialDeploymentReadinessSnapshot {
  const gaps = buildIntelligenceLearningGaps(contact, planning, 24);
  return buildCommercialDeploymentReadinessSnapshot({
    contact,
    planning,
    fieldMetadata,
    engagements,
    unresolvedDiscoveryCount: gaps.length,
  });
}

export function buildDiscoveryAnswerImpact(input: {
  dbKey: string;
  value: string;
  beforeContact: Record<string, unknown>;
  afterContact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;
  discoveryStakeholder?: IntelligenceDiscoveryStakeholder;
  organizationName?: string | null;
  operationalStatus?: RapidDiscoveryOperationalStatus;
  linkedSupportContactName?: string | null;
}): DiscoveryAnswerImpact | null {
  const sectionId = intelligenceSectionForDbKey(input.dbKey);
  if (!sectionId) return null;

  const sectionConf = findPlanningSection(input.planning, sectionId)?.confidence;

  const before = buildSectionOperationalMappingProgress(sectionId, input.beforeContact, {
    planning: input.planning,
    confidence: sectionConf,
    fieldMetadata: input.fieldMetadata,
  });
  const after = buildSectionOperationalMappingProgress(sectionId, input.afterContact, {
    planning: input.planning,
    confidence: sectionConf,
    fieldMetadata: input.fieldMetadata,
  });

  const topGap = buildIntelligenceLearningGaps(input.afterContact, input.planning, 8).find(
    (g) => g.sectionId === sectionId,
  );

  const scanSummaryLine = buildSectionSynthesizedScanSummary({
    sectionId,
    contact: input.afterContact,
    progress: after,
    topGap: topGap ?? null,
    preferDbKey: input.dbKey,
  });

  const feedbackLine = buildDiscoveryLearnedFeedback(input.dbKey, input.value);
  const insight = synthesizeOperationalInsight(input.dbKey, input.value);

  const readinessReasons: string[] = [];
  if (after.mapped > before.mapped) {
    readinessReasons.push(
      `${after.mapped} field${after.mapped === 1 ? "" : "s"} confirmed in this area`,
    );
  }
  if (after.unresolvedCount < before.unresolvedCount) {
    readinessReasons.push("open questions reduced");
  }
  if (insight) {
    readinessReasons.push(insight);
  }
  if (readinessReasons.length === 0) {
    readinessReasons.push(feedbackLine);
  }

  const deploymentBefore = deploymentSnapshot(
    input.beforeContact,
    input.planning,
    input.fieldMetadata,
  );
  const deploymentAfter = deploymentSnapshot(
    input.afterContact,
    input.planning,
    input.fieldMetadata,
  );
  const readinessBefore = deploymentBefore.provider.confidenceIndex;
  const readinessAfter = deploymentAfter.provider.confidenceIndex;

  const saveConfirmation = buildSingleIntelligenceSaveConfirmation({
    dbKey: input.dbKey,
    contact: input.afterContact,
    discoveryStakeholder: input.discoveryStakeholder,
    organizationName: input.organizationName,
  });

  const operationalStatus = input.operationalStatus ?? "in_progress";
  const pathwayImpact = buildRapidDiscoveryPathwayImpact({
    dbKey: input.dbKey,
    operationalStatus,
    contactName: input.linkedSupportContactName,
  });

  return {
    dbKey: input.dbKey,
    sectionId,
    sectionTitle: PROVIDER_INTELLIGENCE_SECTION_LABELS[sectionId],
    feedbackLine: `+ ${feedbackLine}`,
    scanSummaryLine,
    statusBadge: deploymentReadinessBadgeLabel(after),
    confirmedBefore: before.mapped,
    confirmedAfter: after.mapped,
    openBefore: before.unresolvedCount,
    openAfter: after.unresolvedCount,
    readinessBefore,
    readinessAfter,
    readinessReasons,
    answerValue: input.value,
    deploymentBefore,
    deploymentAfter,
    saveConfirmation,
    pathwayImpact,
    operationalStatusLabel: RAPID_DISCOVERY_OPERATIONAL_STATUS_LABELS[operationalStatus],
    requirementLink: pathwayImpact.requirementLink,
    linkedSupportContactName: input.linkedSupportContactName ?? null,
    at: Date.now(),
  };
}

export function buildDiscoveryReadinessChangelog(
  impacts: DiscoveryAnswerImpact[],
  max = 4,
): string[] {
  const last = impacts[impacts.length - 1];
  if (!last) return [];

  return buildDeploymentReadinessImprovementReasons({
    before: last.deploymentBefore,
    after: last.deploymentAfter,
    answerDbKey: last.dbKey,
    answerValue: last.answerValue,
    impactReasons: last.readinessReasons,
  }).slice(0, max);
}

export function fieldBecameMapped(
  dbKey: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): boolean {
  return (
    !fieldHasIntelligenceSignal(dbKey, before[dbKey] as string | null | undefined) &&
    fieldHasIntelligenceSignal(dbKey, after[dbKey] as string | null | undefined)
  );
}
