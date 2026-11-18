/**
 * Evidence → Conclusion → Recommendation
 *
 * Recommendations require captured evidence. Blank fields are absence of evidence —
 * never evidence of a problem.
 */

import { hasCompletedIntroTouch } from "@/lib/surgical-sales/deriveProviderWorkflowRecommendation";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import { isUpcomingEngagementStatus } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  buildProviderMissionProgress,
  missionProgressAtLeast,
} from "@/lib/surgical-sales/buildProviderMissionProgress";
import {
  buildProviderFieldIntelligenceModel,
  type ProviderFieldIntelligenceModel,
} from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import {
  buildRevalidationPriorities,
  intelligenceFieldDisplayName,
} from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import { parseProviderIntelligenceFieldMetadata } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  intelligenceSectionIdForDbKey,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import {
  isFieldExplicitlyReferenced,
  resolveIntelligenceGapStageId,
  schedulingContactUnresolvedPhrase,
} from "@/lib/surgical-sales/intelligenceGapQualification";
import { assessIntelligenceFieldQuality } from "@/lib/surgical-sales/providerIntelligenceSectionConfidence";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/providerObservationApproval";
import {
  buildProviderObservationReadiness,
  type ProviderObservationReadiness,
} from "@/lib/surgical-sales/providerObservationReadiness";
import { isProviderSalesCustomer } from "@/lib/surgical-sales/providerRelationshipStage";
import { resolveSalesPathwayStage } from "@/lib/surgical-sales/pathway/resolveSalesPathwayStage";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { resolveSuggestedSchedulerCandidate } from "@/lib/surgical-sales/candidateContactIntelligence";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

export type EvidenceBasedRecommendationDriver =
  | "evidence_chain"
  | "revalidation"
  | "engagement_stage"
  | "pathway_milestone";

export type EvidenceBasedRecommendation = {
  id: string;
  evidence: string;
  conclusion: string;
  recommendation: string;
  /** Primary action label — same as recommendation for most surfaces. */
  missionTitle: string;
  /** Narrative headline for cards. */
  headline: string;
  rationale: string;
  whyItMatters: string;
  expectedOutcome: string;
  dbKey: string;
  sectionId: ProviderIntelligenceSectionId;
  priorityScore: number;
  drivers: EvidenceBasedRecommendationDriver[];
};

const SCHEDULING_CONTACT_KEYS = [
  "provider_observation_coordinator_contact",
  "provider_scheduling_contact",
  "provider_facility_scheduling_contact",
] as const;

function pushChain(
  chains: EvidenceBasedRecommendation[],
  seen: Set<string>,
  chain: Omit<EvidenceBasedRecommendation, "missionTitle" | "headline" | "rationale" | "whyItMatters" | "expectedOutcome"> & {
    whyItMatters?: string;
    expectedOutcome?: string;
  },
): void {
  const key = chain.id.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  chains.push({
    ...chain,
    missionTitle: chain.recommendation,
    headline: chain.recommendation,
    rationale: `${chain.evidence} → ${chain.conclusion}`,
    whyItMatters: chain.whyItMatters ?? chain.conclusion,
    expectedOutcome: chain.expectedOutcome ?? chain.recommendation,
  });
}

function chainsFromObservationReadiness(
  readiness: ProviderObservationReadiness,
  contact: Record<string, unknown>,
  stageId: SalesPathwayStageId,
  upcomingEngagements: number,
): EvidenceBasedRecommendation[] {
  const chains: EvidenceBasedRecommendation[] = [];
  const seen = new Set<string>();

  if (
    readiness.providerInterest === "yes" &&
    readiness.observationApproved !== "yes"
  ) {
    pushChain(chains, seen, {
      id: "seek_observation_approval",
      evidence: "Provider interested in observation",
      conclusion: "Access pathway exists",
      recommendation: "Seek observation approval",
      dbKey: "provider_observation_feasibility",
      sectionId: "observation_readiness",
      priorityScore: 92,
      drivers: ["evidence_chain"],
      whyItMatters: "Interest is on file — formal approval unlocks OR scheduling.",
      expectedOutcome: "Observation approval validated before case coordination.",
    });
  }

  if (
    hasProviderObservationApprovalValidated(contact) &&
    readiness.credentialingRequired === "yes" &&
    readiness.credentialingPathKnown !== "yes"
  ) {
    pushChain(chains, seen, {
      id: "confirm_credentialing_process",
      evidence: "Credentialing required",
      conclusion: "Facility access has dependency",
      recommendation: "Confirm credentialing process",
      dbKey: "provider_observation_credentialing_needed",
      sectionId: "observation_readiness",
      priorityScore: 88,
      drivers: ["evidence_chain"],
      whyItMatters: "Vendor clearance must be confirmed before observation can proceed.",
      expectedOutcome: "Credentialing path documented and actionable.",
    });
  }

  if (
    hasProviderObservationApprovalValidated(contact) &&
    readiness.providerInterest === "yes" &&
    (readiness.schedulerIdentified === "partial" ||
      readiness.schedulerContactInfoCaptured === "no")
  ) {
    const suggested = resolveSuggestedSchedulerCandidate(contact);
    const schedLine =
      SCHEDULING_CONTACT_KEYS.map((k) => String(contact[k] ?? "").trim()).find(Boolean) ?? "";
    const schedulerName = suggested?.contact_name?.trim();
    pushChain(chains, seen, {
      id: "confirm_scheduling_contact",
      evidence: schedulerName
        ? `Scheduler identified: ${schedulerName}`
        : schedLine
          ? scanLine(schedLine, 72)
          : "Scheduling contact referenced",
      conclusion: "Scheduling contact unresolved",
      recommendation: schedulerName ? "Create Contact" : "Confirm scheduling contact",
      dbKey: "provider_observation_coordinator_contact",
      sectionId: "observation_readiness",
      priorityScore: 86,
      drivers: ["evidence_chain"],
      whyItMatters: schedulerName
        ? `${schedulerName} was referenced — link or create the scheduler support contact.`
        : "Named scheduler without contact info blocks case coordination.",
      expectedOutcome: "Scheduler identified with reachable contact information.",
    });
  }

  if (
    hasProviderObservationApprovalValidated(contact) &&
    (stageId === "discovery" || stageId === "observe")
  ) {
    pushChain(chains, seen, {
      id: "schedule_observation",
      evidence: "Observation approved",
      conclusion: "Access pathway clear",
      recommendation: "Schedule observation",
      dbKey: "provider_ideal_observation_cases",
      sectionId: "observation_readiness",
      priorityScore: 90,
      drivers: ["evidence_chain", "pathway_milestone"],
      whyItMatters: "Approval is secured — coordinate the case while momentum holds.",
      expectedOutcome: "Observation engagement scheduled with coordinator alignment.",
    });
  }

  if (
    readiness.observationApproved === "yes" &&
    readiness.candidateCasesIdentified === "no"
  ) {
    pushChain(chains, seen, {
      id: "identify_observation_cases",
      evidence: "Observation approved — candidate cases not yet identified",
      conclusion: "Case selection still open",
      recommendation: "Identify ideal observation cases",
      dbKey: "provider_ideal_observation_cases",
      sectionId: "observation_readiness",
      priorityScore: 74,
      drivers: ["evidence_chain"],
      whyItMatters: "Approval without case targets risks a misaligned OR day.",
      expectedOutcome: "Specific procedures confirmed for first observation.",
    });
  }

  if (upcomingEngagements > 0 && chains.length > 0) {
    for (const chain of chains) {
      if (!chain.drivers.includes("engagement_stage")) {
        chain.drivers.push("engagement_stage");
        chain.priorityScore += 12;
      }
    }
  }

  return chains;
}

function chainsFromIntroAndMilestones(input: {
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  stageId: SalesPathwayStageId;
}): EvidenceBasedRecommendation[] {
  const chains: EvidenceBasedRecommendation[] = [];
  const seen = new Set<string>();
  const readiness = buildProviderObservationReadiness(input.contact);
  const missionProgress = buildProviderMissionProgress({
    contact: input.contact,
    engagements: input.engagements,
  });

  if (
    hasCompletedIntroTouch(input.engagements) &&
    readiness.providerInterest === "yes" &&
    !hasProviderObservationApprovalValidated(input.contact) &&
    readiness.observationApproved !== "yes"
  ) {
    pushChain(chains, seen, {
      id: "request_observation_approval_post_intro",
      evidence: "Intro call completed · provider interested in observation",
      conclusion: "Access conversation ready to advance",
      recommendation: "Request observation approval",
      dbKey: "provider_observation_feasibility",
      sectionId: "observation_readiness",
      priorityScore: 94,
      drivers: ["evidence_chain", "pathway_milestone"],
      whyItMatters: "Intro established rapport — approval is the natural next milestone.",
      expectedOutcome: "Formal observation approval captured on file.",
    });
  }

  if (
    missionProgressAtLeast(missionProgress.levelId, "observed") &&
    input.stageId === "debrief" &&
    !missionProgressAtLeast(missionProgress.levelId, "debriefed")
  ) {
    pushChain(chains, seen, {
      id: "schedule_debrief",
      evidence: "Observation series captured on file",
      conclusion: "Clinical learning ready to synthesize",
      recommendation: "Schedule debrief",
      dbKey: "provider_workflow_pain_points",
      sectionId: "clinical_workflow",
      priorityScore: 80,
      drivers: ["evidence_chain", "pathway_milestone"],
      whyItMatters: "Field observations need synthesis before evaluation positioning.",
      expectedOutcome: "Debrief logged with validated workflow intelligence.",
    });
  }

  return chains;
}

function chainsFromExplicitlyReferencedFields(
  contact: Record<string, unknown>,
  stageId: SalesPathwayStageId,
): EvidenceBasedRecommendation[] {
  const chains: EvidenceBasedRecommendation[] = [];
  const seen = new Set<string>();

  for (const dbKey of SCHEDULING_CONTACT_KEYS) {
    const raw = contact[dbKey] as string | null | undefined;
    if (!fieldHasIntelligenceSignal(dbKey, raw)) continue;
    const assessment = assessIntelligenceFieldQuality(dbKey, raw);
    if (!isFieldExplicitlyReferenced(dbKey, contact, raw, assessment)) continue;

    const phrase = schedulingContactUnresolvedPhrase(dbKey, raw, contact);
    if (!phrase) continue;

    pushChain(chains, seen, {
      id: `referenced:${dbKey}`,
      evidence: scanLine(String(raw ?? ""), 72),
      conclusion: "Scheduling contact unresolved",
      recommendation: phrase,
      dbKey,
      sectionId: intelligenceSectionIdForDbKey(dbKey) ?? "observation_readiness",
      priorityScore: 85,
      drivers: ["evidence_chain"],
      whyItMatters: "Contact was referenced in conversation but not confirmed.",
      expectedOutcome: "Scheduler identified with reachable contact information.",
    });
  }

  void stageId;
  return chains;
}

function chainsFromRevalidation(
  contact: Record<string, unknown>,
  upcomingEngagements: number,
): EvidenceBasedRecommendation[] {
  const fieldMetadata = parseProviderIntelligenceFieldMetadata(
    contact.provider_intelligence_field_metadata,
  );
  const revalidation = buildRevalidationPriorities(contact, fieldMetadata, 6);
  const chains: EvidenceBasedRecommendation[] = [];
  const seen = new Set<string>();

  for (const lifecycle of revalidation) {
    const sectionId = intelligenceSectionIdForDbKey(lifecycle.dbKey) ?? "clinical_workflow";
    const fieldLabel = intelligenceFieldDisplayName(lifecycle.dbKey);
    const evidence =
      lifecycle.state === "outdated"
        ? `${fieldLabel} was validated but may be stale`
        : `${fieldLabel} captured earlier — confirm still accurate`;

    pushChain(chains, seen, {
      id: `revalidate:${lifecycle.dbKey}`,
      evidence,
      conclusion: "Prior signal needs confirmation",
      recommendation: lifecycle.refreshLine ?? `Re-validate ${fieldLabel.toLowerCase()}`,
      dbKey: lifecycle.dbKey,
      sectionId,
      priorityScore: lifecycle.revalidationPriority + 40,
      drivers: ["revalidation"],
      whyItMatters:
        lifecycle.state === "outdated"
          ? "Account may have shifted since this was last confirmed."
          : "Confirm the signal still matches how the account runs.",
      expectedOutcome: `Updated ${fieldLabel.toLowerCase()} on file.`,
    });
  }

  if (upcomingEngagements > 0) {
    for (const chain of chains) {
      chain.priorityScore += 10;
      if (!chain.drivers.includes("engagement_stage")) {
        chain.drivers.push("engagement_stage");
      }
    }
  }

  return chains;
}

/** Build ranked recommendations from evidence chains — never from blank fields. */
export function buildProviderEvidenceBasedRecommendations(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  stageId?: SalesPathwayStageId | null;
  maxItems?: number;
}): EvidenceBasedRecommendation[] {
  const contact = input.contact ?? {};
  if (isProviderSalesCustomer(contact)) return [];
  const stageId =
    resolveIntelligenceGapStageId(contact, input.stageId) ??
    resolveSalesPathwayStage({ contact, engagements: input.engagements, cases: input.cases });

  const upcomingEngagements = (input.engagements ?? []).filter((e) =>
    isUpcomingEngagementStatus(e.status),
  ).length;

  const readiness = buildProviderObservationReadiness(contact);

  const merged = [
    ...chainsFromObservationReadiness(readiness, contact, stageId, upcomingEngagements),
    ...chainsFromIntroAndMilestones({ contact, engagements: input.engagements, stageId }),
    ...chainsFromExplicitlyReferencedFields(contact, stageId),
    ...chainsFromRevalidation(contact, upcomingEngagements),
  ];

  const seen = new Set<string>();
  const deduped: EvidenceBasedRecommendation[] = [];
  for (const chain of merged.sort((a, b) => b.priorityScore - a.priorityScore)) {
    const key = `${chain.dbKey}:${chain.recommendation.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(chain);
  }

  return deduped.slice(0, input.maxItems ?? 8);
}

/** Recommendation labels only — for compact execution surfaces. */
export function evidenceBasedRecommendationLabels(
  input: Parameters<typeof buildProviderEvidenceBasedRecommendations>[0],
  max = 5,
): string[] {
  return buildProviderEvidenceBasedRecommendations({ ...input, maxItems: max }).map(
    (c) => c.recommendation,
  );
}

/** Whether any captured evidence supports forward recommendations. */
export function providerHasEvidenceForRecommendations(
  contact: Record<string, unknown>,
  model?: ProviderFieldIntelligenceModel,
): boolean {
  const fieldModel = model ?? buildProviderFieldIntelligenceModel({ contact });
  if (fieldModel.verified.length > 0 || fieldModel.hasFieldEvidence) return true;
  const readiness = buildProviderObservationReadiness(contact);
  return (
    readiness.providerInterest === "yes" ||
    readiness.observationApproved === "yes" ||
    readiness.credentialingRequired === "yes" ||
    readiness.schedulerIdentified === "yes" ||
    readiness.schedulerIdentified === "partial"
  );
}
