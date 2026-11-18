/**
 * Scan-first intelligence cards — short summaries and progress pills (no truncation).
 */

import {
  ACCOUNT_UNDERSTANDING_AREAS,
  ACCOUNT_UNDERSTANDING_GAP_STATE,
  accountUnderstandingAreaForSection,
  type AccountUnderstandingAreaId,
} from "@/lib/surgical-sales/providerAccountUnderstanding";
import type { IntelligenceLearningGap } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { intelligenceFieldDisplayName } from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { SectionOperationalMappingProgress } from "@/lib/surgical-sales/providerIntelligenceOperationalMapping";
import { sanitizeUnansweredIntelligenceCopy } from "@/lib/surgical-sales/aiSynthesisGuardrails";
import { intelligenceSectionEmptyConfirmed } from "@/lib/surgical-sales/providerIntelligenceCardStatus";
import { buildSectionSynthesizedScanSummary } from "@/lib/surgical-sales/discoveryOperationalSynthesis";

export type IntelligenceProgressPill = {
  id: string;
  label: string;
  variant: "confirmed" | "open";
};

/** One-line scan summaries — developmental language, never truncated fragments. */
export const FIELD_SCAN_SUMMARY: Partial<Record<string, string>> = {
  provider_observation_feasibility: "Observation allowance still learning in the field",
  provider_observation_credentialing_needed: "Pre-observation steps still learning",
  provider_ideal_observation_cases: "Target observation cases still learning",
  provider_observation_access_path: "Observation access path still learning",
  provider_observation_coordinator_contact: "Scheduling owner still learning",
  provider_observation_cadence_preference: "Observation cadence still learning",
  provider_observation_best_days_case_types: "Scheduling lead time still learning",
  provider_first_observation_questions: "First-case focus still learning",
  provider_procedure_focus: "Procedure mix still learning",
  provider_technique_preferences: "Surgical approach still learning",
  provider_technique_detail: "Technique detail still learning in the field",
  provider_workflow_pain_points: "Workflow friction still learning",
  provider_case_volume_estimate: "Case volume still learning",
  provider_or_team_dynamics: "OR workflow rhythm still learning",
  provider_credentialing_status: "Credentialing path still learning",
  provider_current_vendors: "Vendors in active cases still learning",
  provider_support_expectations: "In-room support expectations still learning",
  provider_communication_style: "Engagement style still learning in the field",
  provider_responsiveness: "Office responsiveness still learning",
  influence_level: "Clinical influence still learning",
  provider_decision_maker_status: "Evaluation approver still learning",
  provider_champion_potential: "Internal champion still learning",
  provider_follow_up_approach: "Follow-up rhythm still learning",
  provider_evaluation_openness: "Evaluation appetite still learning",
  provider_competitive_products: "Incumbent footprint still learning",
  provider_dissatisfaction_areas: "Vendor friction still an open item on the map",
  provider_preference_card_signals: "Preference-card path still learning",
};

const SECTION_SCAN_CONFIRMED: Partial<Record<ProviderIntelligenceSectionId, string>> = {
  or_environment: "OR access and scheduling path are clear",
  clinical_workflow: "Case workflow picture is clear",
  relationship_intelligence: "Relationship read is clear",
  commercial_signals: "Evaluation and vendor picture is clear",
  observation_readiness: "Observation access picture is clear",
};

export function fieldScanSummaryLine(dbKey: string): string {
  const fixed = FIELD_SCAN_SUMMARY[dbKey];
  if (fixed) return sanitizeUnansweredIntelligenceCopy(fixed);
  const label = intelligenceFieldDisplayName(dbKey);
  const short = label.length > 42 ? label.slice(0, 40).trim() : label;
  return sanitizeUnansweredIntelligenceCopy(`${short} still learning`);
}

export function buildIntelligenceSectionProgressPills(
  progress: Pick<SectionOperationalMappingProgress, "mapped" | "unresolvedCount">,
): IntelligenceProgressPill[] {
  const pills: IntelligenceProgressPill[] = [];
  if (progress.mapped > 0) {
    pills.push({
      id: "confirmed",
      label: `${progress.mapped} confirmed`,
      variant: "confirmed",
    });
  }
  if (progress.unresolvedCount > 0) {
    pills.push({
      id: "open",
      label: `${progress.unresolvedCount} open`,
      variant: "open",
    });
  }
  return pills;
}

export function buildIntelligenceSectionScanSummary(input: {
  sectionId: ProviderIntelligenceSectionId;
  progress: SectionOperationalMappingProgress;
  topGap?: IntelligenceLearningGap | null;
  contact?: Record<string, unknown>;
  preferDbKey?: string;
}): string {
  if (input.contact) {
    return buildSectionSynthesizedScanSummary({
      sectionId: input.sectionId,
      contact: input.contact,
      progress: input.progress,
      topGap: input.topGap,
      preferDbKey: input.preferDbKey,
    });
  }

  const { sectionId, progress, topGap } = input;

  if (progress.mapped === 0 || progress.readinessTone === "not_started") {
    const areaId = accountUnderstandingAreaForSection(sectionId);
    if (areaId && ACCOUNT_UNDERSTANDING_GAP_STATE[areaId]) {
      return ACCOUNT_UNDERSTANDING_GAP_STATE[areaId];
    }
    return intelligenceSectionEmptyConfirmed(sectionId);
  }

  if (
    progress.unresolvedCount === 0 &&
    progress.total > 0 &&
    progress.mapped >= progress.total
  ) {
    return (
      SECTION_SCAN_CONFIRMED[sectionId] ??
      "This area is mapped enough to plan the next touch"
    );
  }

  if (topGap?.dbKey) {
    return fieldScanSummaryLine(topGap.dbKey);
  }

  const areaId = accountUnderstandingAreaForSection(sectionId);
  if (areaId && ACCOUNT_UNDERSTANDING_GAP_STATE[areaId]) {
    return ACCOUNT_UNDERSTANDING_GAP_STATE[areaId];
  }

  if (progress.unresolvedCount > 0) {
    return `${progress.unresolvedCount} open item${progress.unresolvedCount === 1 ? "" : "s"} in this area`;
  }

  return intelligenceSectionEmptyConfirmed(sectionId);
}

export function areaIdForIntelligenceSection(
  sectionId: ProviderIntelligenceSectionId,
): AccountUnderstandingAreaId | null {
  const entry = Object.entries(ACCOUNT_UNDERSTANDING_AREAS).find(
    ([, def]) => def.sectionId === sectionId,
  );
  return entry ? (entry[0] as AccountUnderstandingAreaId) : null;
}
