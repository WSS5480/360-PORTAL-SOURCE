/**
 * Protect field time — continuous evaluation of threats to scarce OR / field execution.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { learningGapForField } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  buildProviderFieldTimeRisk,
  type ProviderFieldTimeRiskCore,
  type ProviderFieldTimeRiskInput,
  type ProviderFieldTimeRiskInputStatus,
} from "@/lib/surgical-sales/buildProviderFieldTimeRisk";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { overviewRiskTitle } from "@/lib/surgical-sales/providerOverviewRiskCopy";
import {
  PROTECT_FIELD_TIME_DIMENSION_LABELS,
  PROTECT_FIELD_TIME_KICKER,
  PROTECT_FIELD_TIME_LEVEL_LABELS,
  PROTECT_FIELD_TIME_POSTURE_LABELS,
  PROTECT_FIELD_TIME_TITLE,
  type ProtectFieldTimeDimensionId,
  type ProtectFieldTimePosture,
  type ProtectFieldTimeRiskLevel,
} from "@/lib/surgical-sales/protectFieldTimeVocabulary";

export type {
  ProtectFieldTimeDimensionId,
  ProtectFieldTimePosture,
  ProtectFieldTimeRiskLevel,
} from "@/lib/surgical-sales/protectFieldTimeVocabulary";

export {
  PROTECT_FIELD_TIME_TITLE,
  PROTECT_FIELD_TIME_KICKER,
  PROTECT_FIELD_TIME_DIMENSION_LABELS,
} from "@/lib/surgical-sales/protectFieldTimeVocabulary";

export type ProtectFieldTimeDimension = {
  id: ProtectFieldTimeDimensionId;
  label: string;
  level: ProtectFieldTimeRiskLevel;
  levelLabel: string;
  scan: string;
  sectionId: ProviderIntelligenceSectionId;
  dbKey: string;
};

export type ProtectFieldTimeAssessment = {
  title: string;
  kicker: string;
  posture: ProtectFieldTimePosture;
  postureLabel: string;
  headline: string;
  overallLevel: ProtectFieldTimeRiskLevel;
  /** 0–100 protection score — higher means safer to deploy field time. */
  protectionScore: number;
  dimensions: ProtectFieldTimeDimension[];
  topThreat: ProtectFieldTimeDimension | null;
  deploymentRecommendation: string;
  /** dbKeys to boost in discovery priorities */
  priorityDbKeys: string[];
  /** Hard-stop style headlines for execution blockers */
  blockerHeadlines: string[];
  fieldTimeRisk: ProviderFieldTimeRiskCore;
};

const LEVEL_RANK: Record<ProtectFieldTimeRiskLevel, number> = {
  low: 0,
  elevated: 1,
  high: 2,
  critical: 3,
};

const DASH_CLAUSE_RE = /\s*—\s*/;

const STATUS_TO_LEVEL: Record<ProviderFieldTimeRiskInputStatus, ProtectFieldTimeRiskLevel> = {
  strong: "low",
  partial: "elevated",
  open: "high",
  blocking: "critical",
};

function levelFromStatus(status: ProviderFieldTimeRiskInputStatus): ProtectFieldTimeRiskLevel {
  return STATUS_TO_LEVEL[status];
}

function worstLevel(levels: ProtectFieldTimeRiskLevel[]): ProtectFieldTimeRiskLevel {
  return levels.reduce(
    (worst, current) => (LEVEL_RANK[current] > LEVEL_RANK[worst] ? current : worst),
    "low" as ProtectFieldTimeRiskLevel,
  );
}

function fieldText(contact: Record<string, unknown>, dbKey: string): string {
  return String(contact[dbKey] ?? "").trim();
}

function assessVendorGate(contact: Record<string, unknown>): {
  level: ProtectFieldTimeRiskLevel;
  scan: string;
  dbKey: string;
} {
  const credGap = learningGapForField("provider_credentialing_status", "or_environment", contact);
  const vendorsGap = learningGapForField("provider_current_vendors", "or_environment", contact);
  const accessText = fieldText(contact, "provider_observation_access_path");
  const credentialingNeeded = /\bcredential/i.test(
    `${accessText} ${fieldText(contact, "provider_observation_credentialing_needed")}`,
  );
  const committee = /\bcommittee\b/i.test(accessText);

  if (credGap?.state === "unknown" && vendorsGap?.state === "unknown" && !credentialingNeeded) {
    return {
      level: "high",
      scan: "Vendor clearance and access rules not confirmed.",
      dbKey: "provider_credentialing_status",
    };
  }
  if (credentialingNeeded || committee || credGap) {
    return {
      level: credentialingNeeded || committee ? "critical" : "elevated",
      scan: committee
        ? "Committee or credentialing gate may block the case."
        : "Vendor credentialing path not complete.",
      dbKey: "provider_credentialing_status",
    };
  }
  if (vendorsGap?.state === "unknown") {
    return {
      level: "elevated",
      scan: "Incumbent OR footprint still unclear.",
      dbKey: "provider_current_vendors",
    };
  }
  return {
    level: "low",
    scan: "Vendor gates documented on file.",
    dbKey: "provider_credentialing_status",
  };
}

function assessWrongProcedure(contact: Record<string, unknown>, workflow: ProviderFieldTimeRiskInput): ProtectFieldTimeDimension {
  const procedureGap = learningGapForField("provider_procedure_focus", "clinical_workflow", contact);
  const techniqueGap = learningGapForField("provider_technique_preferences", "clinical_workflow", contact);
  const level = worstLevel([
    levelFromStatus(workflow.status),
    procedureGap?.state === "unknown" ? "high" : procedureGap ? "elevated" : "low",
    techniqueGap?.state === "unknown" ? "elevated" : "low",
  ]);

  const scan =
    level === "critical" || level === "high"
      ? "Procedure and modality mix not confirmed."
      : level === "elevated"
        ? "Confirm high-volume procedures before observation."
        : "Procedure focus aligned on file.";

  return {
    id: "wrong_procedure_target",
    label: PROTECT_FIELD_TIME_DIMENSION_LABELS.wrong_procedure_target,
    level,
    levelLabel: PROTECT_FIELD_TIME_LEVEL_LABELS[level],
    scan: scanLine(scan, 72),
    sectionId: "clinical_workflow",
    dbKey: "provider_procedure_focus",
  };
}

function buildDimensions(
  contact: Record<string, unknown>,
  inputs: ProviderFieldTimeRiskInput[],
): ProtectFieldTimeDimension[] {
  const byId = (id: ProviderFieldTimeRiskInput["id"]) => inputs.find((i) => i.id === id)!;
  const access = byId("or_access_known");
  const feasibility = byId("observation_feasibility");
  const coordinator = byId("coordinator_mapped");
  const scheduling = byId("scheduling_clarity");
  const workflow = byId("workflow_intelligence");

  const wastedLevel = worstLevel([
    levelFromStatus(access.status),
    levelFromStatus(feasibility.status),
    levelFromStatus(coordinator.status),
  ]);
  const wasted: ProtectFieldTimeDimension = {
    id: "wasted_or_travel",
    label: PROTECT_FIELD_TIME_DIMENSION_LABELS.wasted_or_travel,
    level: wastedLevel,
    levelLabel: PROTECT_FIELD_TIME_LEVEL_LABELS[wastedLevel],
    scan: scanLine(
      wastedLevel === "critical" || wastedLevel === "high"
        ? "OR access not confirmed."
        : wastedLevel === "elevated"
          ? "Confirm access before booking the case."
          : "OR access path documented.",
      72,
    ),
    sectionId: access.sectionId,
    dbKey: access.dbKey ?? "provider_observation_access_path",
  };

  const obsLevel = worstLevel([levelFromStatus(feasibility.status), levelFromStatus(access.status)]);
  const observation: ProtectFieldTimeDimension = {
    id: "observation_failure",
    label: PROTECT_FIELD_TIME_DIMENSION_LABELS.observation_failure,
    level: obsLevel,
    levelLabel: PROTECT_FIELD_TIME_LEVEL_LABELS[obsLevel],
    scan: scanLine(
      obsLevel === "critical"
        ? "Observation approval unconfirmed."
        : obsLevel === "high"
          ? "Observation allowance not firm."
          : obsLevel === "elevated"
            ? "Recheck allowance before the visit."
            : "Observation path looks workable.",
      72,
    ),
    sectionId: "observation_readiness",
    dbKey: feasibility.dbKey ?? "provider_observation_feasibility",
  };

  const schedLevel = worstLevel([levelFromStatus(scheduling.status), levelFromStatus(coordinator.status)]);
  const schedulingDim: ProtectFieldTimeDimension = {
    id: "scheduling_collapse",
    label: PROTECT_FIELD_TIME_DIMENSION_LABELS.scheduling_collapse,
    level: schedLevel,
    levelLabel: PROTECT_FIELD_TIME_LEVEL_LABELS[schedLevel],
    scan: scanLine(
      schedLevel === "critical" || schedLevel === "high"
        ? "Case schedule may not hold."
        : schedLevel === "elevated"
          ? "Confirm posting window before OR day."
          : "Scheduling owner mapped on file.",
      72,
    ),
    sectionId: "observation_readiness",
    dbKey: scheduling.dbKey ?? "provider_observation_cadence_preference",
  };

  const vendor = assessVendorGate(contact);
  const vendorDim: ProtectFieldTimeDimension = {
    id: "vendor_gate_failure",
    label: PROTECT_FIELD_TIME_DIMENSION_LABELS.vendor_gate_failure,
    level: vendor.level,
    levelLabel: PROTECT_FIELD_TIME_LEVEL_LABELS[vendor.level],
    scan: scanLine(vendor.scan, 72),
    sectionId: "or_environment",
    dbKey: vendor.dbKey,
  };

  return [wasted, observation, assessWrongProcedure(contact, workflow), schedulingDim, vendorDim];
}

function resolvePosture(
  overallLevel: ProtectFieldTimeRiskLevel,
  fieldTimeState: ProviderFieldTimeRiskCore["state"],
): ProtectFieldTimePosture {
  if (overallLevel === "critical" || fieldTimeState === "high_wasted_field_risk") {
    return "protect_field_time";
  }
  if (overallLevel === "high" || fieldTimeState === "requires_remote_validation_first") {
    return "hold_field_time";
  }
  if (overallLevel === "elevated" || fieldTimeState === "worth_exploratory_visit") {
    return "validate_before_travel";
  }
  return "clear_to_deploy";
}

function deploymentRecommendation(
  posture: ProtectFieldTimePosture,
  top: ProtectFieldTimeDimension | null,
  fieldTimeRisk: ProviderFieldTimeRiskCore,
): string {
  if (posture === "protect_field_time") {
    return top
      ? `Confirm ${top.label.toLowerCase()} before booking OR time. ${scanLine(top.scan, 80)}`
      : scanLine(fieldTimeRisk.narrative.whyFieldTimeFails, 96).replace(DASH_CLAUSE_RE, ". ");
  }
  if (posture === "hold_field_time") {
    return top
      ? `Hold OR time until ${top.label.toLowerCase()} is confirmed.`
      : fieldTimeRisk.guidance;
  }
  if (posture === "validate_before_travel") {
    return top
      ? `Confirm ${top.label.toLowerCase()} before booking OR time.`
      : "Light touch only until scheduling and access are firm.";
  }
  return "OR checks look clear. Proceed when observation motion is ready.";
}

function protectionScore(dimensions: ProtectFieldTimeDimension[]): number {
  if (dimensions.length === 0) return 0;
  const avgRank =
    dimensions.reduce((sum, d) => sum + LEVEL_RANK[d.level], 0) / dimensions.length;
  // 0 = all low → 100% protected; 3 = all critical → ~0%
  return Math.round(Math.max(0, Math.min(100, 100 - avgRank * 33)));
}

function priorityDbKeysFromDimensions(dimensions: ProtectFieldTimeDimension[]): string[] {
  return dimensions
    .filter((d) => LEVEL_RANK[d.level] >= LEVEL_RANK.elevated)
    .sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level])
    .map((d) => d.dbKey);
}

function blockerHeadlinesFromDimensions(dimensions: ProtectFieldTimeDimension[]): string[] {
  return dimensions
    .filter((d) => LEVEL_RANK[d.level] >= LEVEL_RANK.high)
    .sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level])
    .map((d) => overviewRiskTitle({ protectDimensionId: d.id, dbKey: d.dbKey, rawHeadline: d.scan }));
}

export function buildProtectFieldTimeAssessment(input: {
  contact: Record<string, unknown>;
  relationshipStage: string;
  commercialStage: ProviderCommercialWorkflowStage;
  engagements?: ProviderEngagementSummary[];
  fieldTimeRisk?: ProviderFieldTimeRiskCore | null;
}): ProtectFieldTimeAssessment {
  const fieldTimeRisk: ProviderFieldTimeRiskCore = input.fieldTimeRisk ?? (() => {
    const { protectFieldTime: _nested, ...core } = buildProviderFieldTimeRisk({
      contact: input.contact,
      relationshipStage: input.relationshipStage,
      commercialStage: input.commercialStage,
      engagements: input.engagements,
    });
    return core;
  })();

  const dimensions = buildDimensions(input.contact, fieldTimeRisk.inputs);
  const overallLevel = worstLevel(dimensions.map((d) => d.level));
  const topThreat =
    dimensions
      .filter((d) => LEVEL_RANK[d.level] >= LEVEL_RANK.elevated)
      .sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level])[0] ?? null;

  const posture = resolvePosture(overallLevel, fieldTimeRisk.state);

  return {
    title: PROTECT_FIELD_TIME_TITLE,
    kicker: PROTECT_FIELD_TIME_KICKER,
    posture,
    postureLabel: PROTECT_FIELD_TIME_POSTURE_LABELS[posture],
    headline: deploymentRecommendation(posture, topThreat, fieldTimeRisk),
    overallLevel,
    protectionScore: protectionScore(dimensions),
    dimensions,
    topThreat,
    deploymentRecommendation: deploymentRecommendation(posture, topThreat, fieldTimeRisk),
    priorityDbKeys: [...new Set(priorityDbKeysFromDimensions(dimensions))],
    blockerHeadlines: blockerHeadlinesFromDimensions(dimensions),
    fieldTimeRisk,
  };
}
