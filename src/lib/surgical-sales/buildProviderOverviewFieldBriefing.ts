/**
 * Provider overview — Field Briefing read model.
 * Mission progress (commercial milestones) and intelligence confidence are independent.
 * Gaps improve execution recommendations — they do not block advancement.
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { hydrateDiscoveryContactFromLegacy } from "@/lib/surgical-sales/discoveryIntelligenceLegacyMigration";
import {
  deriveProviderOverviewNextBestAction,
  type ProviderOverviewNextBestActionKind,
} from "@/lib/surgical-sales/buildProviderOverviewCommandIntelligence";
import { buildProviderOverviewConfirmedFacts } from "@/lib/surgical-sales/buildProviderOverviewConfirmedFacts";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import {
  buildProviderFieldIntelligenceModel,
  type ProviderFieldIntelligenceModel,
} from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import {
  buildIntelligenceGapEngine,
  INTELLIGENCE_GAP_PRIORITY_LABELS,
  type IntelligenceGapEngineItem,
  type IntelligenceGapPriority,
} from "@/lib/surgical-sales/buildIntelligenceGapEngine";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import {
  formatIntelligenceCaptureDisplay,
  formatIntelligenceCaptureSummaryChip,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { contactDisplayName } from "@/lib/surgical-sales/labels";
import { formatSupportContactRecord } from "@/lib/surgical-sales/optionalIntelligenceCategories";
import {
  buildProviderMissionProgress,
  missionProgressAtLeast,
  type ProviderMissionProgressView,
} from "@/lib/surgical-sales/buildProviderMissionProgress";
import {
  buildProviderIntelligenceConfidence,
  type ProviderIntelligenceConfidenceView,
} from "@/lib/surgical-sales/buildProviderIntelligenceConfidence";
import {
  MISSION_EXECUTION_PILLARS,
  MISSION_ACCESS_HEADLINE_LABELS,
  missionIntelligenceConfidenceLabel,
  type MissionAccessHeadlineKey,
} from "@/lib/surgical-sales/providerMissionExecutionLanguage";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import { PROVIDER_OVERVIEW_BRIEFING_VOCABULARY as BRIEF } from "@/lib/surgical-sales/providerOverviewBriefingVocabulary";
import { buildProviderProfilePathwayNextAction } from "@/lib/surgical-sales/buildProviderPathwayNextAction";
import {
  buildProviderEvidenceBasedRecommendations,
  evidenceBasedRecommendationLabels,
} from "@/lib/surgical-sales/providerEvidenceBasedRecommendations";
import { resolveSalesPathwayStage } from "@/lib/surgical-sales/pathway/resolveSalesPathwayStage";
import { resolveNormalizedObservationPermission } from "@/lib/surgical-sales/observationPermissionModel";

export const FIELD_BRIEFING_SECTION = {
  title: BRIEF.fieldBriefing,
  accessStatus: BRIEF.accessStatus,
  whatWeKnow: BRIEF.whatWeKnow,
  openQuestions: BRIEF.openQuestions,
  /** @deprecated Use openQuestions */
  intelligenceGaps: BRIEF.openQuestions,
  nextMission: BRIEF.nextMission,
  whatWeKnowEmpty: "No known facts on file yet — first touch will start the mission log.",
  openQuestionsEmpty: "No open questions — keep current reads fresh before the next touch.",
  /** @deprecated Use openQuestionsEmpty */
  gapsEmpty: "No open questions — keep current reads fresh before the next touch.",
  observationStatus: "Observation status",
  approvalStatus: "Approval status",
  executionRecommendations: BRIEF.executionRecommendations,
  /** @deprecated Use executionRecommendations */
  blockers: BRIEF.executionRecommendations,
  confidence: BRIEF.intelligenceConfidence,
  objective: "Objective",
  whyItMatters: "Why it matters",
  expectedOutcome: "Expected outcome",
  manageKeyRelationships: BRIEF.manageKeyRelationships,
  fieldBriefingKicker: BRIEF.fieldBriefingKicker,
  missionProgress: BRIEF.missionProgress,
  intelligenceConfidence: BRIEF.intelligenceConfidence,
  gapsImproveExecution: BRIEF.gapsImproveExecution,
} as const;

export type FieldBriefingAccessHeadline = MissionAccessHeadlineKey;

export type FieldBriefingConfidenceTone = "high" | "moderate" | "low" | "none";

export type FieldBriefingItem = {
  id: string;
  text: string;
};

export type FieldBriefingGapItem = FieldBriefingItem & {
  priority: IntelligenceGapPriority;
  priorityLabel: string;
  domain: IntelligenceGapEngineItem["domain"];
  topicLabel: string;
  completeness: IntelligenceGapEngineItem["completeness"];
};

export type ProviderOverviewFieldBriefingView = {
  title: string;
  missionProgress: ProviderMissionProgressView;
  intelligenceConfidence: ProviderIntelligenceConfidenceView;
  accessStatus: {
    headline: string;
    headlineKey: FieldBriefingAccessHeadline;
    observationStatus: string;
    approvalStatus: string;
    /** Execution recommendations — not advancement blockers. */
    executionRecommendations: string[];
    confidenceLabel: string;
    confidenceTone: FieldBriefingConfidenceTone;
  };
  whatWeKnow: FieldBriefingItem[];
  intelligenceGaps: FieldBriefingGapItem[];
  intelligenceGapDomains: ReturnType<typeof buildIntelligenceGapEngine>["domains"];
  nextMission: {
    objective: string;
    whyItMatters: string;
    expectedOutcome: string;
  };
  hasFieldEvidence: boolean;
};

const CLINICAL_CONFIRMED_FIELDS: Array<{ dbKey: string; prefix: string }> = [
  { dbKey: "provider_workflow_pain_points", prefix: "Workflow observation" },
  { dbKey: "provider_clinical_frustrations", prefix: "Clinical frustration" },
  { dbKey: "provider_staff_frustrations", prefix: "Staff frustration" },
  { dbKey: "provider_case_volume_estimate", prefix: "Volume trend" },
  { dbKey: "provider_technique_preferences", prefix: "Clinical interest" },
  { dbKey: "provider_procedure_focus", prefix: "Procedure focus" },
];

function humanizeValue(value: string): string {
  return value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function validatedFieldFact(contact: Record<string, unknown>, dbKey: string, prefix: string): string | null {
  if (!isIntelligenceFieldValidatedOnFile(dbKey, contact)) return null;
  const raw = String(contact[dbKey] ?? "").trim();
  if (!raw || !fieldHasIntelligenceSignal(dbKey, raw)) return null;
  const display =
    formatIntelligenceCaptureDisplay(dbKey, raw) ??
    formatIntelligenceCaptureSummaryChip(dbKey, raw) ??
    raw;
  const polished = humanizeValue(display);
  if (!polished) return null;
  if (/^(workflow observation|clinical frustration|staff frustration|volume trend|clinical interest|procedure focus)/i.test(polished)) {
    return polished.charAt(0).toUpperCase() + polished.slice(1);
  }
  return `${prefix}: ${polished}`;
}

function deriveAccessHeadline(
  contact: Record<string, unknown>,
  engagements?: ProviderEngagementSummary[],
): FieldBriefingAccessHeadline {
  return resolveNormalizedObservationPermission({ contact, engagements }).headlineKey;
}

export function fieldBriefingAccessHeadlineLabel(headline: FieldBriefingAccessHeadline): string {
  return MISSION_ACCESS_HEADLINE_LABELS[headline];
}

function deriveObservationPermissionLines(
  contact: Record<string, unknown>,
  engagements?: ProviderEngagementSummary[],
): { observationStatus: string; approvalStatus: string } {
  const permission = resolveNormalizedObservationPermission({ contact, engagements });
  return {
    observationStatus: permission.label,
    approvalStatus: permission.approvalDetailLabel,
  };
}

function deriveExecutionRecommendations(
  model: ProviderFieldIntelligenceModel,
  contact: Record<string, unknown>,
  missionProgress: ProviderMissionProgressView,
  planning?: ProviderPlanningCompletion | null,
  engagements?: ProviderEngagementSummary[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (label: string) => {
    const line = scanLine(label, 96).trim();
    if (!line) return;
    const key = line.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(line);
  };

  // Milestone gate labels — advancement evidence, not blank-field gaps.
  if (!missionProgress.primaryMilestoneMet && missionProgress.stageGateBlockers.length > 0) {
    for (const gate of missionProgress.stageGateBlockers) {
      push(gate.label);
    }
    return out.slice(0, 3);
  }

  // Evidence → Conclusion → Recommendation chains only.
  for (const label of evidenceBasedRecommendationLabels(
    { contact, planning, engagements, maxItems: 5 },
    5,
  )) {
    push(label);
  }

  void model;
  return out.slice(0, 5);
}

function buildWhatWeKnow(input: {
  contact: Record<string, unknown>;
  model: ProviderFieldIntelligenceModel;
  organizationName?: string | null;
  relatedContacts?: Array<Record<string, unknown>>;
}): FieldBriefingItem[] {
  const items: FieldBriefingItem[] = [];
  const seen = new Set<string>();

  const push = (id: string, text: string) => {
    const line = scanLine(text, 140).trim();
    if (!line) return;
    const key = line.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ id, text: line });
  };

  for (const item of input.model.verified) {
    push(item.id, item.text);
  }

  for (const fact of buildProviderOverviewConfirmedFacts({
    contact: input.contact,
    organizationName: input.organizationName,
  })) {
    push(`confirmed-${fact.slice(0, 24)}`, fact);
  }

  for (const spec of CLINICAL_CONFIRMED_FIELDS) {
    const fact = validatedFieldFact(input.contact, spec.dbKey, spec.prefix);
    if (fact) push(`field-${spec.dbKey}`, fact);
  }

  for (const trend of input.model.clinical.trends) {
    push(`trend-${trend}`, trend);
  }
  if (isIntelligenceFieldValidatedOnFile("provider_procedure_focus", input.contact)) {
    for (const proc of input.model.clinical.procedures) {
      push(`proc-${proc}`, `Performs ${proc}`);
    }
  }

  for (const line of input.model.clinical.workflowObservations) {
    push(`workflow-${line}`, `Workflow observation: ${line}`);
  }
  for (const frustration of input.model.clinical.frustrations) {
    push(`frustration-${frustration}`, `Clinical frustration: ${frustration}`);
  }

  if (input.model.scheduler.captureState === "verified" && input.model.scheduler.isConfirmed) {
    push(
      "scheduler-confirmed",
      `Scheduler identified: ${input.model.scheduler.displayValue}`,
    );
  }
  if (input.model.credentialing.captureState === "verified" && input.model.credentialing.isConfirmed) {
    push(
      "credentialing-confirmed",
      `Credentialing: ${input.model.credentialing.displayValue}`,
    );
  }

  for (const related of input.relatedContacts ?? []) {
    const formatted = formatSupportContactRecord(related);
    if (!formatted.trim()) continue;
    push(`contact-${String(related.id ?? formatted)}`, `Identified contact: ${formatted}`);
  }

  if (
    input.model.supportContacts.captureState === "verified" &&
    input.model.supportContacts.isConfirmed
  ) {
    push("support-contacts", `Identified contacts: ${input.model.supportContacts.primaryLine}`);
  }

  return items.slice(0, 12);
}

function buildIntelligenceGaps(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
}): { gaps: FieldBriefingGapItem[]; domains: ReturnType<typeof buildIntelligenceGapEngine>["domains"] } {
  const engine = buildIntelligenceGapEngine({
    contact: input.contact,
    planning: input.planning,
    maxGaps: 3,
  });

  return {
    gaps: engine.gaps.map((gap) => ({
      id: gap.id,
      text: gap.text,
      priority: gap.priority,
      priorityLabel: INTELLIGENCE_GAP_PRIORITY_LABELS[gap.priority],
      domain: gap.domain,
      topicLabel: gap.topicLabel,
      completeness: gap.completeness,
    })),
    domains: engine.domains,
  };
}

function buildNextMission(input: {
  contact: Record<string, unknown>;
  model: ProviderFieldIntelligenceModel;
  gaps: FieldBriefingGapItem[];
  engagements?: ProviderEngagementSummary[];
  missionProgress: ProviderMissionProgressView;
  providerId?: string;
}): ProviderOverviewFieldBriefingView["nextMission"] {
  const nextAction = deriveProviderOverviewNextBestAction({
    contact: input.contact,
    engagements: input.engagements,
  });

  const stageId = resolveSalesPathwayStage({
    contact: input.contact,
    engagements: input.engagements,
  });
  const evidenceRec = buildProviderEvidenceBasedRecommendations({
    contact: input.contact,
    engagements: input.engagements,
    stageId,
    maxItems: 1,
  })[0];

  const progress = input.missionProgress;
  const commercialGatePending = !progress.primaryMilestoneMet;

  let objective = progress.primaryMilestoneLabel;
  let whyItMatters = "Commercial milestones drive pathway advancement — not field completeness.";
  let expectedOutcome = progress.primaryMilestoneMet
    ? "Ready for the next commercial milestone."
    : `Complete: ${progress.primaryMilestoneLabel.toLowerCase()}.`;

  if (commercialGatePending && progress.stageGateBlockers[0]?.summary) {
    whyItMatters = scanLine(progress.stageGateBlockers[0].summary, 160);
  }

  const applyKind = (kind: ProviderOverviewNextBestActionKind) => {
    switch (kind) {
      case "observation_execution":
        objective = "Execute scheduled observation";
        whyItMatters = "The touch is live — capture workflow learning while access is open.";
        expectedOutcome = "Observation debrief logged with validated field intelligence.";
        break;
      case "observation_scheduling":
        objective = evidenceRec?.recommendation ?? "Schedule first observation";
        whyItMatters =
          evidenceRec?.conclusion ??
          (missionProgressAtLeast(progress.levelId, "approved")
            ? "Approval is secured — coordinate the case to maintain momentum."
            : "Lock a case day once observation approval is validated.");
        expectedOutcome =
          evidenceRec?.expectedOutcome ??
          "Observation engagement scheduled with coordinator alignment.";
        break;
      case "access_mapping":
      default:
        if (commercialGatePending) {
          objective = progress.primaryMilestoneLabel;
          if (progress.stageGateBlockers[0]?.summary) {
            expectedOutcome = scanLine(progress.stageGateBlockers[0].summary, 120);
          }
        } else if (evidenceRec) {
          objective = evidenceRec.recommendation;
          whyItMatters = `${evidenceRec.evidence} → ${evidenceRec.conclusion}`;
          expectedOutcome = evidenceRec.expectedOutcome;
        } else if (input.providerId) {
          const pathway = buildProviderProfilePathwayNextAction({
            contact: input.contact,
            providerId: input.providerId,
            pathwayStageId: stageId,
            engagements: input.engagements,
          });
          objective = pathway.label;
          whyItMatters = "Pathway milestone drives the next commercial move.";
          expectedOutcome = pathway.label;
        } else {
          objective = progress.nextMilestoneLabel ?? "Prepare for next milestone";
          whyItMatters = "Advance the commercial pathway with evidence from the next touch.";
        }
        break;
    }
  };

  applyKind(nextAction.kind);

  if (nextAction.detailLine?.trim() && commercialGatePending) {
    whyItMatters = scanLine(nextAction.detailLine, 160);
  }

  return {
    objective: scanLine(objective, 72),
    whyItMatters: scanLine(whyItMatters, 160),
    expectedOutcome: scanLine(expectedOutcome, 120),
  };
}

export function buildProviderOverviewFieldBriefing(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  organizationName?: string | null;
  relatedContacts?: Array<Record<string, unknown>>;
  engagements?: ProviderEngagementSummary[];
}): ProviderOverviewFieldBriefingView {
  const contact = hydrateDiscoveryContactFromLegacy(input.contact ?? {});
  const model = buildProviderFieldIntelligenceModel({
    contact,
    relatedContacts: input.relatedContacts,
    engagements: input.engagements,
  });

  const missionProgress = buildProviderMissionProgress({
    contact,
    engagements: input.engagements,
  });
  const intelligenceConfidence = buildProviderIntelligenceConfidence({
    contact,
    planning: input.planning,
  });

  const { gaps: intelligenceGaps, domains: intelligenceGapDomains } = buildIntelligenceGaps({
    contact,
    planning: input.planning,
  });

  const accessHeadlineKey = deriveAccessHeadline(contact, input.engagements);
  const permissionLines = deriveObservationPermissionLines(contact, input.engagements);

  return {
    title: FIELD_BRIEFING_SECTION.title,
    missionProgress,
    intelligenceConfidence,
    accessStatus: {
      headline: fieldBriefingAccessHeadlineLabel(accessHeadlineKey),
      headlineKey: accessHeadlineKey,
      observationStatus: permissionLines.observationStatus,
      approvalStatus: permissionLines.approvalStatus,
      executionRecommendations: deriveExecutionRecommendations(
        model,
        contact,
        missionProgress,
        input.planning,
        input.engagements,
      ),
      confidenceLabel: intelligenceConfidence.label,
      confidenceTone: intelligenceConfidence.tone,
    },
    whatWeKnow: buildWhatWeKnow({
      contact,
      model,
      organizationName: input.organizationName,
      relatedContacts: input.relatedContacts,
    }),
    intelligenceGaps,
    intelligenceGapDomains,
    nextMission: buildNextMission({
      contact,
      model,
      gaps: intelligenceGaps,
      engagements: input.engagements,
      missionProgress,
      providerId: String(contact.id ?? contact.provider_id ?? ""),
    }),
    hasFieldEvidence: model.hasFieldEvidence,
  };
}

/** @internal — rep-facing contact label for support rows */
export function fieldBriefingContactLabel(contact: Record<string, unknown>): string {
  return contactDisplayName(
    contact as { first_name?: string; last_name?: string; email?: string },
  );
}
