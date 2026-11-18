/**
 * Field deployment briefing — four instant answers; operational readiness is canonical via framework.
 */

import {
  buildProviderOperationalReadinessFramework,
  type ProviderOperationalReadinessFramework,
} from "@/lib/surgical-sales/buildProviderOperationalReadinessFramework";
import type { ProviderFieldCommandBriefing } from "@/lib/surgical-sales/buildProviderFieldCommandBriefing";
import type { ProviderFieldTimeRisk } from "@/lib/surgical-sales/buildProviderFieldTimeRisk";
import type { ProtectFieldTimeAssessment } from "@/lib/surgical-sales/buildProtectFieldTimeAssessment";
import type { CanonicalExecutionBlocker } from "@/lib/surgical-sales/buildProviderCanonicalExecutionBlockers";
import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import type { ProviderCommercialWorkflowStage } from "@/lib/surgical-sales/providerCommercialWorkflowStage";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import {
  PROVIDER_CANONICAL_SURFACES,
} from "@/lib/surgical-sales/providerProfileCanonicalSurfaces";
import {
  buildProviderOverviewKnownSoFar,
} from "@/lib/surgical-sales/buildProviderOverviewKnownSoFar";
import {
  PROVIDER_DEPLOYMENT_BRIEFING_KICKER,
  PROVIDER_DEPLOYMENT_BRIEFING_TITLE,
  PROVIDER_DEPLOYMENT_QUESTIONS,
} from "@/lib/surgical-sales/providerOverviewVocabulary";
import {
  operationalCloseGapLabel,
  operationalDiscoveryPrioritiesLabel,
  operationalFieldActionLabel,
  operationalValidateBeforeDeployLabel,
} from "@/lib/surgical-sales/providerOperationalActionLabels";

export type FieldDeploymentAnswerId =
  | "or_entry"
  | "field_time_risk"
  | "must_validate"
  | "next_move";

export type FieldDeploymentAnswerTone = "success" | "caution" | "warn" | "neutral" | "blocked";

export type FieldDeploymentAnswer = {
  id: FieldDeploymentAnswerId;
  question: string;
  answer: string;
  tone: FieldDeploymentAnswerTone;
  bullets: string[];
  actionLabel: string | null;
  /** null + actionLabel "Discovery priorities" → intelligence tab */
  sectionId: ProviderIntelligenceSectionId | null;
  dbKey: string | null;
  /** When set, UI should switch to Intelligence tab instead of opening a section. */
  openDiscoveryPriorities?: boolean;
};

export type ProviderFieldDeploymentBriefing = {
  title: string;
  kicker: string;
  laneLabel: string;
  directive: string;
  protectFieldTime: ProtectFieldTimeAssessment;
  readiness: ProviderOperationalReadinessFramework;
  answers: FieldDeploymentAnswer[];
  primaryActionLabel: string;
  primaryActionScan: string;
  discoveryPriorityCount: number;
  /** Validated / high-confidence positives — max 4, under deployment directive. */
  knownSoFar: string[];
};

function motionTone(
  verdict: string,
): FieldDeploymentAnswerTone {
  if (verdict === "ready") return "success";
  if (verdict === "blocked") return "blocked";
  if (verdict === "approaching") return "caution";
  return "warn";
}

function pillarTone(posture: string): FieldDeploymentAnswerTone {
  if (posture === "validated") return "success";
  if (posture === "blocked") return "blocked";
  if (posture === "forming") return "caution";
  return "neutral";
}

function buildOrEntryAnswer(framework: ProviderOperationalReadinessFramework): FieldDeploymentAnswer {
  const motion = framework.motions.find((m) => m.motion === "observation")!;
  const pillar = framework.pillars.find((p) => p.id === "or_access_maturity")!;

  return {
    id: "or_entry",
    question: PROVIDER_DEPLOYMENT_QUESTIONS.or_entry,
    answer: scanLine(motion.headline, 120),
    tone: motionTone(motion.verdict),
    bullets: motion.blockers.slice(0, 3),
    actionLabel: motion.verdict === "ready" ? null : operationalFieldActionLabel("provider_observation_access_path"),
    sectionId: pillar.primarySectionId,
    dbKey: "provider_observation_feasibility",
  };
}

function fieldTimeToneFromRisk(
  risk: Pick<ProviderFieldTimeRisk, "tone">,
): FieldDeploymentAnswerTone {
  if (risk.tone === "danger") return "blocked";
  if (risk.tone === "warn") return "warn";
  if (risk.tone === "caution") return "caution";
  if (risk.tone === "success") return "success";
  return "neutral";
}

function buildFieldTimeAnswer(protectFieldTime: ProtectFieldTimeAssessment): FieldDeploymentAnswer {
  const { narrative } = protectFieldTime.fieldTimeRisk;

  return {
    id: "field_time_risk",
    question: PROVIDER_DEPLOYMENT_QUESTIONS.field_time_risk,
    answer: scanLine(protectFieldTime.headline, 120),
    tone: fieldTimeToneFromRisk(protectFieldTime.fieldTimeRisk),
    bullets: [
      ...protectFieldTime.dimensions
        .filter((d) => d.level === "critical" || d.level === "high")
        .map((d) => `${d.label}: ${d.scan}`),
      narrative.dangerousAssumption,
    ].slice(0, 4),
    actionLabel:
      protectFieldTime.posture === "clear_to_deploy"
        ? null
        : operationalValidateBeforeDeployLabel(
            narrative.reducers[0]?.dbKey ??
              protectFieldTime.fieldTimeRisk.primaryDbKey ??
              protectFieldTime.topThreat?.dbKey ??
              null,
          ),
    sectionId: protectFieldTime.fieldTimeRisk.primarySectionId,
    dbKey:
      protectFieldTime.fieldTimeRisk.primaryDbKey ??
      protectFieldTime.topThreat?.dbKey ??
      narrative.reducers[0]?.dbKey ??
      null,
  };
}

function buildMustValidateAnswer(input: {
  blockers: CanonicalExecutionBlocker[];
  discoveryPriorityCount: number;
}): FieldDeploymentAnswer {
  const captureBullets = input.blockers.slice(0, 3).map((b) => b.headline);
  const discoveryLabel = PROVIDER_CANONICAL_SURFACES.discovery_priorities.label;

  let answer: string;
  if (input.discoveryPriorityCount > 0 && captureBullets.length > 0) {
    answer = `${input.discoveryPriorityCount} ${discoveryLabel.toLowerCase()} on Intelligence; ${captureBullets.length} hard validation${captureBullets.length === 1 ? "" : "s"} before deploy.`;
  } else if (input.discoveryPriorityCount > 0) {
    answer = `${input.discoveryPriorityCount} ${discoveryLabel.toLowerCase()} on Intelligence — capture before high-stakes field time.`;
  } else if (captureBullets.length > 0) {
    answer =
      captureBullets.length === 1
        ? `Confirm before deploy: ${captureBullets[0]}.`
        : `${captureBullets.length} validations must be confirmed before OR deployment.`;
  } else {
    answer = "Core procedural validations are on file — refresh stale signals before high-stakes moves.";
  }

  const top = input.blockers[0];

  return {
    id: "must_validate",
    question: PROVIDER_DEPLOYMENT_QUESTIONS.must_validate,
    answer: scanLine(answer, 120),
    tone:
      captureBullets.length === 0 && input.discoveryPriorityCount === 0
        ? "success"
        : input.discoveryPriorityCount >= 3
          ? "warn"
          : "caution",
    bullets: captureBullets,
    actionLabel:
      input.discoveryPriorityCount > 0
        ? operationalDiscoveryPrioritiesLabel()
        : top
          ? operationalCloseGapLabel(top.dbKey)
          : null,
    sectionId: top?.sectionId ?? null,
    dbKey: top?.dbKey ?? null,
    openDiscoveryPriorities: input.discoveryPriorityCount > 0 && !top,
  };
}

function buildNextMoveAnswer(input: {
  framework: ProviderOperationalReadinessFramework;
  briefing: ProviderFieldCommandBriefing;
  recommendedNextStep: string;
}): FieldDeploymentAnswer {
  const focus = input.framework.motions.find((m) => m.motion === input.framework.primaryFocusMotion)!;
  const action = input.briefing.nextFieldAction || input.recommendedNextStep;

  return {
    id: "next_move",
    question: PROVIDER_DEPLOYMENT_QUESTIONS.next_move,
    answer: scanLine(action, 120),
    tone: motionTone(focus.verdict),
    bullets: focus.proceduralChecks.slice(0, 2),
    actionLabel: null,
    sectionId: null,
    dbKey: null,
  };
}

export function buildProviderFieldDeploymentBriefing(input: {
  contact: Record<string, unknown>;
  relationshipStage?: string | null;
  commercialStage: ProviderCommercialWorkflowStage;
  laneLabel: string;
  briefing: ProviderFieldCommandBriefing;
  recommendedNextStep: string;
  executionBlockers: CanonicalExecutionBlocker[];
  discoveryPriorityCount: number;
  fieldTimeRisk?: ProviderFieldTimeRisk | null;
  engagements?: ProviderEngagementSummary[];
  opportunities?: Array<Record<string, unknown>>;
  cases?: Array<Record<string, unknown>>;
  readinessFramework?: ProviderOperationalReadinessFramework;
}): ProviderFieldDeploymentBriefing {
  const readiness =
    input.readinessFramework ??
    buildProviderOperationalReadinessFramework({
      contact: input.contact,
      relationshipStage: input.relationshipStage,
      engagements: input.engagements,
      opportunities: input.opportunities,
      cases: input.cases,
    });

  const protectFieldTime =
    input.fieldTimeRisk?.protectFieldTime ?? readiness.protectFieldTime;

  const answers: FieldDeploymentAnswer[] = [
    buildOrEntryAnswer(readiness),
    buildFieldTimeAnswer(protectFieldTime),
    buildMustValidateAnswer({
      blockers: input.executionBlockers,
      discoveryPriorityCount: input.discoveryPriorityCount,
    }),
    buildNextMoveAnswer({
      framework: readiness,
      briefing: input.briefing,
      recommendedNextStep: input.recommendedNextStep,
    }),
  ];

  const knownSoFar = buildProviderOverviewKnownSoFar({
    contact: input.contact,
    commercialStage: input.commercialStage,
    engagements: input.engagements,
    briefingValidated: input.briefing.validated,
    fieldTimeRisk: input.fieldTimeRisk,
  });

  return {
    title: PROVIDER_DEPLOYMENT_BRIEFING_TITLE,
    kicker: PROVIDER_DEPLOYMENT_BRIEFING_KICKER,
    laneLabel: input.laneLabel,
    directive: scanLine(protectFieldTime.headline, 140),
    protectFieldTime,
    readiness,
    answers,
    primaryActionLabel: "Execute next move",
    primaryActionScan: scanLine(
      input.briefing.nextFieldAction || input.recommendedNextStep,
      96,
    ),
    discoveryPriorityCount: input.discoveryPriorityCount,
    knownSoFar,
  };
}
