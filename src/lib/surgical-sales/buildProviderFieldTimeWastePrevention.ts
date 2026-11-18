/**
 * Field time waste prevention — five proactive failure modes before OR / field deployment.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  buildProtectFieldTimeAssessment,
  type ProtectFieldTimeAssessment,
  type ProtectFieldTimeDimension,
} from "@/lib/surgical-sales/buildProtectFieldTimeAssessment";
import {
  buildProviderFieldTimeRisk,
  type ProviderFieldTimeRisk,
} from "@/lib/surgical-sales/buildProviderFieldTimeRisk";
import {
  resolveProviderCommercialWorkflowStage,
  type ProviderCommercialWorkflowStage,
} from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { learningGapForField } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { intelligenceContextualCaptureCta } from "@/lib/surgical-sales/providerIntelligenceContextualCtas";
import type { ProtectFieldTimeRiskLevel } from "@/lib/surgical-sales/protectFieldTimeVocabulary";
import {
  FIELD_TIME_WASTE_CATEGORY_IDS,
  FIELD_TIME_WASTE_CATEGORY_LABELS,
  FIELD_TIME_WASTE_PREVENTION_KICKER,
  FIELD_TIME_WASTE_LEVEL_LABELS,
  FIELD_TIME_WASTE_POSTURE_LABELS,
  FIELD_TIME_WASTE_PREVENTION_QUESTION,
  FIELD_TIME_WASTE_PREVENTION_TITLE,
  type FieldTimeWasteCategoryId,
  type FieldTimeWastePosture,
  type FieldTimeWasteRiskLevel,
} from "@/lib/surgical-sales/fieldTimeWastePreventionVocabulary";

export {
  FIELD_TIME_WASTE_PREVENTION_TITLE,
  FIELD_TIME_WASTE_PREVENTION_KICKER,
  FIELD_TIME_WASTE_PREVENTION_QUESTION,
  FIELD_TIME_WASTE_CATEGORY_LABELS,
} from "@/lib/surgical-sales/fieldTimeWastePreventionVocabulary";

export type FieldTimeWasteWarning = {
  id: FieldTimeWasteCategoryId;
  label: string;
  level: FieldTimeWasteRiskLevel;
  levelLabel: string;
  /** Active when level is elevated or worse — drives protective UI. */
  active: boolean;
  visitFailureWarning: string;
  preventionAction: string;
  sectionId: ProviderIntelligenceSectionId;
  dbKey: string;
  captureLabel: string;
};

export type FieldTimeWastePrevention = {
  title: string;
  kicker: string;
  question: string;
  posture: FieldTimeWastePosture;
  postureLabel: string;
  headline: string;
  protectionScore: number;
  primaryWarning: FieldTimeWasteWarning | null;
  warnings: FieldTimeWasteWarning[];
  activeThreatCount: number;
};

const PROTECT_LEVEL_RANK: Record<ProtectFieldTimeRiskLevel, number> = {
  low: 0,
  elevated: 1,
  high: 2,
  critical: 3,
};

const WASTE_LEVEL_RANK: Record<FieldTimeWasteRiskLevel, number> = {
  clear: 0,
  watch: 1,
  elevated: 2,
  high: 3,
  critical: 4,
};

function mapProtectLevel(level: ProtectFieldTimeRiskLevel): FieldTimeWasteRiskLevel {
  if (level === "critical") return "critical";
  if (level === "high") return "high";
  if (level === "elevated") return "elevated";
  return "watch";
}

function isActive(level: FieldTimeWasteRiskLevel): boolean {
  return WASTE_LEVEL_RANK[level] >= WASTE_LEVEL_RANK.elevated;
}

function fieldText(contact: Record<string, unknown>, dbKey: string): string {
  return String(contact[dbKey] ?? "").trim();
}

function observationPathOpen(contact: Record<string, unknown>): boolean {
  const feasibility = fieldText(contact, "provider_observation_feasibility").toLowerCase();
  if (!feasibility) return false;
  if (/\b(not allowed|no observation|restricted|blocked|denied)\b/i.test(feasibility)) {
    return false;
  }
  return /\b(easy|allowed|yes|feasible|open)\b/i.test(feasibility);
}

function assessLowQualityCaseOpportunities(
  contact: Record<string, unknown>,
): Omit<FieldTimeWasteWarning, "id" | "label" | "captureLabel"> & {
  id: FieldTimeWasteCategoryId;
  dbKey: string;
  sectionId: ProviderIntelligenceSectionId;
} {
  const idealGap = learningGapForField(
    "provider_ideal_observation_cases",
    "observation_readiness",
    contact,
  );
  const questionsGap = learningGapForField(
    "provider_first_observation_questions",
    "observation_readiness",
    contact,
  );
  const pathOpen = observationPathOpen(contact);
  const hasIdeal = fieldHasIntelligenceSignal(
    "provider_ideal_observation_cases",
    fieldText(contact, "provider_ideal_observation_cases"),
  );

  let level: FieldTimeWasteRiskLevel = "clear";
  let visitFailureWarning =
    "Target cases and first-day proof plan are on file — observation day should produce signal.";
  let preventionAction = "Maintain ideal-case list after each posting change.";

  if (pathOpen && (idealGap?.state === "unknown" || !hasIdeal)) {
    level = idealGap?.state === "unknown" ? "critical" : "high";
    visitFailureWarning =
      "OR day may run low-signal cases — ideal observation procedures are not locked.";
    preventionAction = "Select high-proof cases with surgeon or scheduler before travel.";
  } else if (idealGap || questionsGap) {
    level = "elevated";
    visitFailureWarning =
      "Case mix may not validate evaluation — confirm which procedures prove adoption.";
    preventionAction = "Align first observation questions to live case types on the calendar.";
  } else if (!pathOpen && (idealGap || questionsGap)) {
    level = "watch";
    visitFailureWarning =
      "Case targeting still open — confirm procedures before observation is scheduled.";
    preventionAction = "Map ideal cases when observation path firms up.";
  }

  const dbKey =
    idealGap?.dbKey ??
    questionsGap?.dbKey ??
    "provider_ideal_observation_cases";

  return {
    id: "low_quality_cases",
    level,
    levelLabel: FIELD_TIME_WASTE_LEVEL_LABELS[level],
    active: isActive(level),
    visitFailureWarning: scanLine(visitFailureWarning, 88),
    preventionAction: scanLine(preventionAction, 72),
    sectionId: "observation_readiness",
    dbKey,
  };
}

function warningFromDimension(
  categoryId: FieldTimeWasteCategoryId,
  dimension: ProtectFieldTimeDimension,
  visitFailureOverride?: string,
  preventionOverride?: string,
): FieldTimeWasteWarning {
  const level = mapProtectLevel(dimension.level);
  return {
    id: categoryId,
    label: FIELD_TIME_WASTE_CATEGORY_LABELS[categoryId],
    level,
    levelLabel: FIELD_TIME_WASTE_LEVEL_LABELS[level],
    active: isActive(level),
    visitFailureWarning: scanLine(visitFailureOverride ?? dimension.scan, 88),
    preventionAction: scanLine(
      preventionOverride ?? `Resolve ${dimension.label.toLowerCase()} before OR travel.`,
      72,
    ),
    sectionId: dimension.sectionId,
    dbKey: dimension.dbKey,
    captureLabel: intelligenceContextualCaptureCta(dimension.dbKey),
  };
}

function mergeAccessPathwayWarnings(
  travel: ProtectFieldTimeDimension,
  vendor: ProtectFieldTimeDimension,
): FieldTimeWasteWarning {
  const mergedLevel = mapProtectLevel(
    PROTECT_LEVEL_RANK[travel.level] >= PROTECT_LEVEL_RANK[vendor.level]
      ? travel.level
      : vendor.level,
  );
  const primary = PROTECT_LEVEL_RANK[travel.level] >= PROTECT_LEVEL_RANK[vendor.level] ? travel : vendor;
  const visitFailureWarning =
    mergedLevel === "critical" || mergedLevel === "high"
      ? "Visit may fail at the OR desk — access pathway or vendor gate is not confirmed."
      : mergedLevel === "elevated"
        ? "Access rules are partial — field team may be turned away or delayed."
        : primary.scan;

  return {
    id: "missing_access_pathway",
    label: FIELD_TIME_WASTE_CATEGORY_LABELS.missing_access_pathway,
    level: mergedLevel,
    levelLabel: FIELD_TIME_WASTE_LEVEL_LABELS[mergedLevel],
    active: isActive(mergedLevel),
    visitFailureWarning: scanLine(visitFailureWarning, 88),
    preventionAction: scanLine(
      "Map allowance, credentialing, and vendor clearance before booking field time.",
      72,
    ),
    sectionId: primary.sectionId,
    dbKey: primary.dbKey,
    captureLabel: intelligenceContextualCaptureCta(primary.dbKey),
  };
}

function buildWarnings(
  contact: Record<string, unknown>,
  assessment: ProtectFieldTimeAssessment,
): FieldTimeWasteWarning[] {
  const byProtectId = Object.fromEntries(
    assessment.dimensions.map((d) => [d.id, d]),
  ) as Record<string, ProtectFieldTimeDimension>;

  const travel = byProtectId.wasted_or_travel!;
  const observation = byProtectId.observation_failure!;
  const wrongProcedure = byProtectId.wrong_procedure_target!;
  const scheduling = byProtectId.scheduling_collapse!;
  const vendor = byProtectId.vendor_gate_failure!;

  const lowQuality = assessLowQualityCaseOpportunities(contact);

  const warnings: FieldTimeWasteWarning[] = [
    warningFromDimension(
      "failed_observation",
      observation,
      observation.level === "critical"
        ? "Observation is likely to fail — allowance or access rules block an in-room day."
        : observation.level === "high"
          ? "Field visit may not yield observation proof — feasibility or access is still soft."
          : undefined,
    ),
    mergeAccessPathwayWarnings(travel, vendor),
    {
      ...lowQuality,
      label: FIELD_TIME_WASTE_CATEGORY_LABELS.low_quality_cases,
      captureLabel: intelligenceContextualCaptureCta(lowQuality.dbKey),
    },
    warningFromDimension(
      "wrong_procedure_targeting",
      wrongProcedure,
      wrongProcedure.level === "critical" || wrongProcedure.level === "high"
        ? "Rep time may chase the wrong procedures — modality and focus are not confirmed."
        : undefined,
    ),
    warningFromDimension(
      "weak_scheduling_pathway",
      scheduling,
      scheduling.level === "critical" || scheduling.level === "high"
        ? "Schedule may collapse after travel — coordinator or posting window is weak."
        : undefined,
    ),
  ];

  return FIELD_TIME_WASTE_CATEGORY_IDS.map(
    (id) => warnings.find((w) => w.id === id)!,
  );
}

function resolvePosture(
  warnings: FieldTimeWasteWarning[],
  assessment: ProtectFieldTimeAssessment,
): FieldTimeWastePosture {
  const active = warnings.filter((w) => w.active);
  if (
    active.some((w) => w.level === "critical") ||
    assessment.posture === "protect_field_time"
  ) {
    return "do_not_deploy";
  }
  if (
    active.some((w) => w.level === "high") ||
    assessment.posture === "hold_field_time"
  ) {
    return "hold_visit";
  }
  if (
    active.length > 0 ||
    assessment.posture === "validate_before_travel"
  ) {
    return "validate_first";
  }
  return "protected";
}

function postureHeadline(
  posture: FieldTimeWastePosture,
  primary: FieldTimeWasteWarning | null,
): string {
  if (posture === "do_not_deploy" && primary) {
    return scanLine(
      `Do not deploy — ${primary.visitFailureWarning}`,
      96,
    );
  }
  if (posture === "hold_visit" && primary) {
    return scanLine(`Hold field visit until ${primary.label.toLowerCase()} is resolved.`, 96);
  }
  if (posture === "validate_first" && primary) {
    return scanLine(
      `Remote-validate ${primary.label.toLowerCase()} before booking OR time.`,
      96,
    );
  }
  return "No critical failure modes detected — field visit risk is contained on current intelligence.";
}

export function buildProviderFieldTimeWastePrevention(input: {
  contact: Record<string, unknown>;
  relationshipStage: string;
  commercialStage?: ProviderCommercialWorkflowStage;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  fieldTimeRisk?: Omit<ProviderFieldTimeRisk, "protectFieldTime"> | null;
}): FieldTimeWastePrevention {
  const commercialStage =
    input.commercialStage ??
    resolveProviderCommercialWorkflowStage({
      relationshipStage: input.relationshipStage,
      opportunities: input.opportunities,
      cases: input.cases,
      engagements: input.engagements,
    });

  const fieldTimeRisk =
    input.fieldTimeRisk ??
    buildProviderFieldTimeRisk({
      contact: input.contact,
      relationshipStage: input.relationshipStage,
      commercialStage,
      engagements: input.engagements,
    });

  const assessment = buildProtectFieldTimeAssessment({
    contact: input.contact,
    relationshipStage: input.relationshipStage,
    commercialStage,
    engagements: input.engagements,
    fieldTimeRisk,
  });

  const warnings = buildWarnings(input.contact, assessment);
  const activeThreatCount = warnings.filter((w) => w.active).length;
  const primaryWarning =
    warnings
      .filter((w) => w.active)
      .sort((a, b) => WASTE_LEVEL_RANK[b.level] - WASTE_LEVEL_RANK[a.level])[0] ?? null;

  const posture = resolvePosture(warnings, assessment);

  return {
    title: FIELD_TIME_WASTE_PREVENTION_TITLE,
    kicker: FIELD_TIME_WASTE_PREVENTION_KICKER,
    question: FIELD_TIME_WASTE_PREVENTION_QUESTION,
    posture,
    postureLabel: FIELD_TIME_WASTE_POSTURE_LABELS[posture],
    headline: postureHeadline(posture, primaryWarning),
    protectionScore: assessment.protectionScore,
    primaryWarning,
    warnings,
    activeThreatCount,
  };
}
