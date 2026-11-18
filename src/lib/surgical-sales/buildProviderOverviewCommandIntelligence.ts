import { PROVIDER_OVERVIEW_BRIEFING_VOCABULARY as BRIEF } from "@/lib/surgical-sales/providerOverviewBriefingVocabulary";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import {
  observationReadinessBlockerLabels,
  resolveDerivedObservationReadinessFromContact,
  resolveObservationReadinessLevelForPlanning,
} from "@/lib/surgical-sales/deriveProviderObservationReadiness";
import {
  buildProviderFieldIntelligenceModel,
  type ProviderFieldIntelligenceModel,
} from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import { deriveIntelligenceSectionConfidence } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import {
  resolveWorkflowMaturityFromContact,
  type WorkflowMaturityValue,
} from "@/lib/surgical-sales/workflowUnderstandingMaturity";
import { buildProviderEvidenceBasedRecommendations } from "@/lib/surgical-sales/providerEvidenceBasedRecommendations";
import { pickActiveObservationCase } from "@/lib/surgical-sales/buildProviderOverviewExecutionCtas";

export type ProviderOverviewCommandIntelligenceId =
  | "access_readiness"
  | "workflow_understanding"
  | "clinical_understanding"
  | "next_best_action";

export type AccessReadinessLevel = "not_started" | "learning" | "conditional" | "ready";
export type WorkflowUnderstandingLevel = "minimal" | "partial" | "established";
export type ClinicalUnderstandingLevel = "minimal" | "partial" | "strong";
export type ProviderOverviewNextBestActionKind =
  | "access_mapping"
  | "observation_scheduling"
  | "observation_execution";

export type ProviderOverviewCommandIntelligenceTone =
  | "open"
  | "learning"
  | "progress"
  | "ready"
  | "action";

export type ProviderOverviewCommandIntelligenceItem = {
  id: ProviderOverviewCommandIntelligenceId;
  label: string;
  value: string;
  level: string;
  detailLine: string | null;
  tone: ProviderOverviewCommandIntelligenceTone;
};

export const ACCESS_READINESS_DISPLAY: Record<AccessReadinessLevel, string> = {
  not_started: "Not Started",
  learning: "Learning",
  conditional: "Conditional",
  ready: "Ready",
};

export const WORKFLOW_UNDERSTANDING_DISPLAY: Record<WorkflowUnderstandingLevel, string> = {
  minimal: "Minimal",
  partial: "Partial",
  established: "Established",
};

export const CLINICAL_UNDERSTANDING_DISPLAY: Record<ClinicalUnderstandingLevel, string> = {
  minimal: "Minimal",
  partial: "Partial",
  strong: "Strong",
};

export const NEXT_BEST_ACTION_DISPLAY: Record<ProviderOverviewNextBestActionKind, string> = {
  access_mapping: "Map access pathway",
  observation_scheduling: "Add observation case",
  observation_execution: "Open observation case",
};

function accessReadinessTone(level: AccessReadinessLevel): ProviderOverviewCommandIntelligenceTone {
  switch (level) {
    case "ready":
      return "ready";
    case "conditional":
      return "progress";
    case "learning":
      return "learning";
    default:
      return "open";
  }
}

function understandingTone(
  level: WorkflowUnderstandingLevel | ClinicalUnderstandingLevel,
): ProviderOverviewCommandIntelligenceTone {
  if (level === "minimal") return "open";
  if (level === "partial") return "learning";
  return "ready";
}

export function deriveAccessReadinessLevel(input: {
  model: ProviderFieldIntelligenceModel;
  contact: Record<string, unknown>;
}): AccessReadinessLevel {
  const planningLevel = resolveObservationReadinessLevelForPlanning(input.contact);
  if (planningLevel === "ready") return "ready";
  if (planningLevel === "conditional") return "conditional";

  const accessLines = [
    input.model.observationApproval,
    input.model.scheduler,
    input.model.credentialing,
  ];
  const hasEvidence = accessLines.some((line) => line.captureState !== "empty");
  if (!hasEvidence && !input.model.hasFieldEvidence) return "not_started";
  return "learning";
}

function accessReadinessDetailLine(input: {
  level: AccessReadinessLevel;
  model: ProviderFieldIntelligenceModel;
  contact: Record<string, unknown>;
}): string | null {
  if (input.level === "ready") {
    return "Observation access pathway is clear for scheduling";
  }

  const derived = resolveDerivedObservationReadinessFromContact(input.contact);
  const blockerLabels =
    derived && derived.blockers.length > 0
      ? observationReadinessBlockerLabels(derived.blockers)
      : input.model.readiness.blockers;

  if (blockerLabels.length > 0) {
    return blockerLabels.slice(0, 3).join(" · ");
  }

  if (input.level === "not_started") {
    return "No observation access intelligence captured yet";
  }

  if (input.level === "learning") {
    const learning = input.model.stillLearning
      .filter((item) =>
        /scheduler|credential|observation|access|approval/i.test(item.text),
      )
      .slice(0, 2)
      .map((item) => item.text);
    if (learning.length > 0) return learning.join(" · ");
    return "Access signals captured — validation still in progress";
  }

  return null;
}

function workflowLevelFromMaturity(maturity: WorkflowMaturityValue | null): WorkflowUnderstandingLevel {
  switch (maturity) {
    case "observed_in_field":
    case "fully_validated":
      return "established";
    case "discussed_only":
    case "partially_understood":
      return "partial";
    case "unknown":
    default:
      return "minimal";
  }
}

export function deriveWorkflowUnderstandingLevel(
  contact: Record<string, unknown>,
): WorkflowUnderstandingLevel {
  const maturity = resolveWorkflowMaturityFromContact(contact);
  if (maturity && maturity !== "unknown") {
    return workflowLevelFromMaturity(maturity);
  }

  const clinical = deriveIntelligenceSectionConfidence("clinical_workflow", contact).confidence;
  const orEnv = deriveIntelligenceSectionConfidence("or_environment", contact).confidence;

  if (clinical === "validated" || orEnv === "validated") return "established";
  if (clinical === "confirmed" || orEnv === "confirmed") return "established";
  if (clinical === "partial" || orEnv === "partial") return "partial";
  return "minimal";
}

function workflowUnderstandingDetailLine(
  level: WorkflowUnderstandingLevel,
  model: ProviderFieldIntelligenceModel,
): string | null {
  if (level === "established") {
    if (model.workflowNotes.isConfirmed) return model.workflowNotes.primaryLine;
    if (model.clinical.workflowObservations.length > 0) {
      return model.clinical.workflowObservations.slice(0, 2).join(" · ");
    }
    return "Workflow directly observed or validated in field";
  }

  if (level === "partial") {
    const parts = [
      model.procedureInterests.isConfirmed ? model.procedureInterests.primaryLine : null,
      model.workflowNotes.isConfirmed ? model.workflowNotes.primaryLine : null,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(" · ");
    return "Some workflow visibility — gaps still exist";
  }

  return "Scheduling and OR workflow not yet mapped";
}

export function deriveClinicalUnderstandingLevel(input: {
  model: ProviderFieldIntelligenceModel;
  contact: Record<string, unknown>;
}): ClinicalUnderstandingLevel {
  const { clinical } = input.model;
  const signalCount =
    clinical.procedures.length +
    clinical.frustrations.length +
    clinical.preferences.length +
    clinical.trends.length;

  const confidence = deriveIntelligenceSectionConfidence("clinical_workflow", input.contact).confidence;

  if (confidence === "validated" || (confidence === "confirmed" && signalCount >= 2)) {
    return "strong";
  }
  if (signalCount > 0 || confidence === "confirmed" || confidence === "partial") {
    return "partial";
  }
  return "minimal";
}

function clinicalUnderstandingDetailLine(model: ProviderFieldIntelligenceModel): string | null {
  const { clinical } = model;
  if (clinical.procedures.length > 0) {
    const focus = clinical.procedures.slice(0, 2).join(" · ");
    if (clinical.frustrations.length > 0) {
      return `${focus} · ${clinical.frustrations[0]}`;
    }
    return focus;
  }
  if (clinical.frustrations.length > 0) return clinical.frustrations.slice(0, 2).join(" · ");
  if (clinical.summary?.trim()) return clinical.summary.trim();
  return null;
}

export function deriveProviderOverviewNextBestAction(input: {
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
}): { kind: ProviderOverviewNextBestActionKind; detailLine: string | null } {
  const contact = input.contact ?? {};

  if (pickActiveObservationCase(input.cases)) {
    return {
      kind: "observation_execution",
      detailLine: "Observation case is open — capture workflow intelligence",
    };
  }

  const readiness = resolveObservationReadinessLevelForPlanning(contact);
  if (readiness === "ready") {
    return {
      kind: "observation_scheduling",
      detailLine: "Access pathway clear — add an observation case",
    };
  }

  if (readiness === "conditional" && hasProviderObservationApprovalValidated(contact)) {
    return {
      kind: "observation_scheduling",
      detailLine: "Resolve remaining access conditions, then add an observation case",
    };
  }

  if (readiness === "conditional") {
    const top = buildProviderEvidenceBasedRecommendations({ contact, maxItems: 1 })[0];
    return {
      kind: "access_mapping",
      detailLine: top
        ? `${top.evidence} → ${top.conclusion}`
        : "Advance access conversation with evidence from the last touch",
    };
  }

  return {
    kind: "access_mapping",
    detailLine: "Establish observation interest before mapping facility access",
  };
}

export function buildProviderOverviewCommandIntelligence(input: {
  contact: Record<string, unknown>;
  relatedContacts?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
}): ProviderOverviewCommandIntelligenceItem[] {
  const contact = hydrateDiscoveryContactFromLegacy(input.contact ?? {});
  const model = buildProviderFieldIntelligenceModel({
    contact,
    relatedContacts: input.relatedContacts,
  });

  const accessLevel = deriveAccessReadinessLevel({ model, contact });
  const workflowLevel = deriveWorkflowUnderstandingLevel(contact);
  const clinicalLevel = deriveClinicalUnderstandingLevel({ model, contact });
  const nextAction = deriveProviderOverviewNextBestAction({
    contact,
    engagements: input.engagements,
    cases: input.cases,
  });

  return [
    {
      id: "access_readiness",
      label: BRIEF.accessReadiness,
      value: ACCESS_READINESS_DISPLAY[accessLevel],
      level: accessLevel,
      detailLine: accessReadinessDetailLine({ level: accessLevel, model, contact }),
      tone: accessReadinessTone(accessLevel),
    },
    {
      id: "workflow_understanding",
      label: BRIEF.progressDrivers,
      value: WORKFLOW_UNDERSTANDING_DISPLAY[workflowLevel],
      level: workflowLevel,
      detailLine: workflowUnderstandingDetailLine(workflowLevel, model),
      tone: understandingTone(workflowLevel),
    },
    {
      id: "clinical_understanding",
      label: BRIEF.clinicalSignals,
      value: CLINICAL_UNDERSTANDING_DISPLAY[clinicalLevel],
      level: clinicalLevel,
      detailLine: clinicalUnderstandingDetailLine(model),
      tone: understandingTone(clinicalLevel),
    },
    {
      id: "next_best_action",
      label: BRIEF.nextBestAction,
      value: NEXT_BEST_ACTION_DISPLAY[nextAction.kind],
      level: nextAction.kind,
      detailLine: nextAction.detailLine,
      tone: "action",
    },
  ];
}
