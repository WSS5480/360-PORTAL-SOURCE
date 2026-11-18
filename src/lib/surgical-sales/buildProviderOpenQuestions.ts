/**
 * Provider open questions — evidence-based only (unknown ≠ open question).
 *
 * Surfaces 0–3 items when:
 * 1. Field notes explicitly reference something unresolved.
 * 2. The item blocks the next immediate observation action.
 * 3. The rep saved partial intelligence marked still needed (captured / assumed).
 */

import {
  hasProviderPainPoints,
  hasScheduledObservation,
  hasStaffWorkflowPainPoints,
  productNeedsConfirmation,
  resolveSchedulerName,
  workflowOpportunityNeedsValidation,
} from "@/lib/surgical-sales/buildProviderIntelligenceFieldEvidenceCards";
import { buildProviderObservationReadiness } from "@/lib/surgical-sales/providerObservationReadiness";
import type { ProviderFieldIntelligenceModel } from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";
import { buildIntelligenceLearningGaps } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import {
  resolveIntelligenceGapStageId,
  schedulingContactUnresolvedPhrase,
} from "@/lib/surgical-sales/intelligenceGapQualification";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { resolveNormalizedObservationPermission } from "@/lib/surgical-sales/observationPermissionModel";
import { readProviderCommercialIntelligence } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import { hasOrganizationSchedulerConfirmedForProvider } from "@/lib/surgical-sales/organizationIntelligenceInheritance";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import type { SalesPathwayStageId } from "@/lib/surgical-sales/salesPathwayCanonical";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { ProviderPathwayExecutionAction } from "@/lib/surgical-sales/providerPathwayExecutionRouting";
import type { ProviderObservationIntelligenceRollup } from "@/lib/surgical-sales/buildProviderObservationIntelligenceRollup";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import type { UniversalFactsReadModelPayload } from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";

export const PROVIDER_OPEN_QUESTIONS_MAX = 3;
export const PROVIDER_PATHWAY_OPEN_QUESTIONS_MAX = 5;

export type ProviderOpenQuestion = {
  id: string;
  text: string;
  description?: string | null;
  actionLabel?: string | null;
  action?: ProviderPathwayExecutionAction | null;
};

const GENERIC_SCHEDULING_GAP_RE =
  /\b(?:which case should be observed|which date should observation happen)\b/i;

const APPROVED_OBSERVATION_SUPPRESSED_GAP_RE = [
  /\bobservation allowance\b/i,
  /\bre-validate on next touch\b/i,
  /\bwhether you can observe\b/i,
  /\bneeds reconfirmation\b/i,
  /\bvendor list partial\b/i,
  /\breconfirm observation\b/i,
  /\bre-confirm observation\b/i,
  /\bconfirm during evaluation\b/i,
];

const VENDOR_LIST_GAP_RE =
  /\bvendor list\b/i;

const PATHWAY_GAP_PRIORITY: Record<string, number> = {
  "gap-scheduler-contact": 1,
  "gap-credentialing-path": 2,
  "immediate-scheduler": 2,
  "gap-first-observation": 3,
  "gap-product-confirmation": 4,
  "gap-provider-pain": 5,
  "gap-staff-pain": 6,
  "gap-workflow-validation": 7,
};

const SCHEDULING_FIELD_KEYS = [
  "provider_observation_coordinator_contact",
  "provider_scheduling_contact",
  "provider_facility_scheduling_contact",
] as const;

const STILL_LEARNING_QUESTION_IDS = new Set([
  "scheduler-contact",
  "cred-platform",
  "follow-scheduler",
  "follow-credentialing",
]);

function isSuppressedPostApprovalGap(text: string, contact: Record<string, unknown>): boolean {
  const line = text.trim();
  if (!line) return true;
  if (APPROVED_OBSERVATION_SUPPRESSED_GAP_RE.some((re) => re.test(line))) return true;

  if (VENDOR_LIST_GAP_RE.test(line) && !vendorListExplicitlyReferenced(contact)) {
    return true;
  }

  return false;
}

function vendorListExplicitlyReferenced(contact: Record<string, unknown>): boolean {
  const blob = [
    contact.provider_credentialing_status,
    contact.provider_credentialing_platform_name,
    contact.provider_observation_credentialing_needed,
    contact.provider_approved_vendor_list,
    contact.provider_hospital_vendor_system,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");

  return /\b(?:approved vendor list|vendor list|hospital vendor|credentialing vendor|vendor system|vendor credentialing platform)\b/i.test(
    blob,
  );
}

function shouldShowCredentialingPathGap(
  contact: Record<string, unknown>,
  readiness: ReturnType<typeof buildProviderObservationReadiness>,
): boolean {
  if (readiness.credentialingRequired !== "yes") return false;
  if (readiness.credentialingPathKnown === "yes") return false;

  const statusBlob = [
    contact.provider_credentialing_status,
    contact.provider_observation_credentialing_needed,
    contact.provider_credentialing_platform_name,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");

  if (
    /vendor credential|credentialing required|required before|symplr|intellicentrics|acsis|healthstream|credentialing platform/i.test(
      statusBlob,
    ) &&
    !/\b(?:unknown platform|don't know which platform|pathway unknown|not sure which platform|platform unknown)\b/i.test(
      statusBlob,
    )
  ) {
    return false;
  }

  return true;
}

function sortPathwayOpenQuestions(items: ProviderOpenQuestion[]): ProviderOpenQuestion[] {
  return [...items].sort(
    (a, b) => (PATHWAY_GAP_PRIORITY[a.id] ?? 99) - (PATHWAY_GAP_PRIORITY[b.id] ?? 99),
  );
}

function observationApprovalConfirmed(contact: Record<string, unknown>): boolean {
  return buildProviderObservationReadiness(contact).observationApproved === "yes";
}

const SPECULATIVE_QUESTION_RE =
  /\b(?:real evaluation|evaluation openness|first[- ]case validation|procedure mix forming|open vs lap vs robotic mix|whether they(?:'|')?ll run)\b/i;

function pushUnique(
  items: ProviderOpenQuestion[],
  seen: Set<string>,
  question: Omit<ProviderOpenQuestion, "id"> & { id: string },
  options?: { observationApproved?: boolean; contact?: Record<string, unknown> },
) {
  const line = scanLine(question.text, 160).trim();
  if (!line || SPECULATIVE_QUESTION_RE.test(line) || GENERIC_SCHEDULING_GAP_RE.test(line)) return;
  if (
    options?.observationApproved &&
    isSuppressedPostApprovalGap(line, options.contact ?? {})
  ) {
    return;
  }
  const key = line.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);

  const baseId = question.id.trim() || `question-${items.length}`;
  let uniqueId = baseId;
  let suffix = 0;
  while (items.some((item) => item.id === uniqueId)) {
    suffix += 1;
    uniqueId = `${baseId}-${suffix}`;
  }
  items.push({
    id: uniqueId,
    text: line,
    description: question.description ?? null,
    actionLabel: question.actionLabel ?? null,
    action: question.action ?? null,
  });
}

export function buildImmediateActionOpenQuestions(
  contact: Record<string, unknown>,
  options?: {
    model?: Pick<ProviderFieldIntelligenceModel, "clinical">;
    engagements?: ProviderEngagementSummary[];
    cases?: Array<Record<string, unknown>>;
    observationRollup?: ProviderObservationIntelligenceRollup | null;
    providerRuns?: UniversalFactExtractionRun[];
  },
): ProviderOpenQuestion[] {
  const readiness = buildProviderObservationReadiness(contact);
  if (readiness.observationApproved !== "yes") return [];

  const items: ProviderOpenQuestion[] = [];
  const permission = resolveNormalizedObservationPermission({
    contact,
    engagements: options?.engagements,
  });
  const commercial = readProviderCommercialIntelligence(contact);
  const schedulerName = resolveSchedulerName(contact, commercial);

  if (
    schedulerName &&
    readiness.schedulerContactInfoCaptured !== "yes" &&
    !hasOrganizationSchedulerConfirmedForProvider(contact)
  ) {
    items.push({
      id: "gap-scheduler-contact",
      text: `${schedulerName} contact information unknown`,
      description: "Scheduler was referenced, but contact details are incomplete.",
      actionLabel: "Update Scheduler Contact",
    });
  } else if (
    readiness.schedulerIdentified !== "no" &&
    readiness.schedulerContactInfoCaptured !== "yes" &&
    !hasOrganizationSchedulerConfirmedForProvider(contact)
  ) {
    items.push({
      id: "gap-scheduler-contact",
      text: "Scheduler contact information unknown",
      description: "Scheduler was referenced, but contact details are incomplete.",
      actionLabel: "Update Scheduler Contact",
    });
  }

  if (
    shouldShowCredentialingPathGap(contact, readiness)
  ) {
    items.push({
      id: "gap-credentialing-path",
      text: "Credentialing path needs confirmation",
      description:
        "Credentialing is required. Confirm platform, owner, status, and required steps.",
      actionLabel: "Add Credentialing Note",
    });
  }

  if (!hasScheduledObservation({ permission, cases: options?.cases })) {
    items.push({
      id: "gap-first-observation",
      text: "First observation not scheduled",
      description: "Observation is approved. Add an observation case to plan the OR day.",
      actionLabel: "Add Observation Case",
    });
  }

  const productEvidence = options?.observationRollup?.productEvidence;
  const product = productNeedsConfirmation(contact, {
    providerRuns: options?.providerRuns,
  });
  if (productEvidence && productEvidence.maturity === "repeated_completed_cases") {
    // Repeated observation evidence satisfies the intro-call product confirmation gap.
  } else if (productEvidence && productEvidence.maturity !== "intro_only") {
    items.push({
      id: "gap-product-confirmation",
      text: productEvidence.gapText,
      description: productEvidence.gapDescription,
      actionLabel: "View Observation Details",
    });
  } else if (product) {
    items.push({
      id: "gap-product-confirmation",
      text: "Confirm current product use",
      description: `${product.productName} was mentioned. Confirm product usage during first observation.`,
      actionLabel: "Add Observation Case",
    });
  }

  const workflowOpp = workflowOpportunityNeedsValidation(contact);
  if (workflowOpp) {
    items.push({
      id: "gap-workflow-validation",
      text: "Validate visualization/fixation workflow",
    });
  }

  const model = options?.model;
  if (model && !hasProviderPainPoints(contact, model as ProviderFieldIntelligenceModel)) {
    items.push({
      id: "gap-provider-pain",
      text: "Identify provider pain points",
      description: "No validated provider pain points captured yet.",
      actionLabel: "Add provider pain points",
    });
  }

  if (!hasStaffWorkflowPainPoints(contact)) {
    items.push({
      id: "gap-staff-pain",
      text: "Identify staff workflow pain points",
      description: "No validated staff workflow pain points captured yet.",
      actionLabel: "Add staff workflow pain",
    });
  }

  if (
    readiness.schedulerIdentified !== "yes" &&
    readiness.providerInterest === "yes" &&
    !schedulerName
  ) {
    items.push({ id: "immediate-scheduler", text: "Who coordinates observation scheduling?" });
  }

  return items;
}

function schedulingQuestionsFromContact(contact: Record<string, unknown>): ProviderOpenQuestion[] {
  const items: ProviderOpenQuestion[] = [];
  for (const dbKey of SCHEDULING_FIELD_KEYS) {
    const raw = contact[dbKey] as string | null | undefined;
    const phrase = schedulingContactUnresolvedPhrase(dbKey, raw, contact);
    if (phrase) {
      items.push({ id: `scheduling-${dbKey}`, text: phrase });
    }
  }
  return items;
}

function modelStillLearningQuestions(
  stillLearning: ProviderFieldIntelligenceModel["stillLearning"],
): ProviderOpenQuestion[] {
  return stillLearning
    .filter((item) => STILL_LEARNING_QUESTION_IDS.has(item.id))
    .map((item) => ({ id: item.id, text: item.text }));
}

export function buildProviderOpenQuestions(input: {
  contact: Record<string, unknown>;
  planning?: ProviderPlanningCompletion | null;
  model?: Pick<
    ProviderFieldIntelligenceModel,
    "stillLearning" | "hasFieldEvidence" | "clinical"
  >;
  maxItems?: number;
  stageId?: SalesPathwayStageId | null;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  observationRollup?: ProviderObservationIntelligenceRollup | null;
  universalFactsReadModel?: UniversalFactsReadModelPayload | null;
}): ProviderOpenQuestion[] {
  const contact = input.contact ?? {};
  const maxItems = input.maxItems ?? PROVIDER_OPEN_QUESTIONS_MAX;
  const approved = observationApprovalConfirmed(contact);

  if (approved) {
    return sortPathwayOpenQuestions(
      buildImmediateActionOpenQuestions(contact, {
        model: input.model,
        engagements: input.engagements,
        cases: input.cases,
        observationRollup: input.observationRollup,
        providerRuns: input.universalFactsReadModel?.providerRuns,
      }).filter((question) => !isSuppressedPostApprovalGap(question.text, contact)),
    ).slice(0, Math.min(maxItems, PROVIDER_PATHWAY_OPEN_QUESTIONS_MAX));
  }

  const stageId = resolveIntelligenceGapStageId(contact, input.stageId);
  const items: ProviderOpenQuestion[] = [];
  const seen = new Set<string>();

  for (const question of buildImmediateActionOpenQuestions(contact, {
    model: input.model,
    engagements: input.engagements,
    cases: input.cases,
    observationRollup: input.observationRollup,
    providerRuns: input.universalFactsReadModel?.providerRuns,
  })) {
    pushUnique(items, seen, question, { observationApproved: approved, contact });
  }

  for (const question of schedulingQuestionsFromContact(contact)) {
    if (items.some((item) => item.id === "gap-scheduler-contact")) continue;
    pushUnique(
      items,
      seen,
      {
        id: question.id,
        text: question.text,
        description: "Scheduler was referenced, but contact details are incomplete.",
        actionLabel: "Update Scheduler Contact",
      },
      { observationApproved: approved, contact },
    );
  }

  if (input.model?.stillLearning?.length) {
    for (const question of modelStillLearningQuestions(input.model.stillLearning)) {
      if (GENERIC_SCHEDULING_GAP_RE.test(question.text)) continue;
      const mapped =
        question.id === "cred-platform"
          ? {
              ...question,
              text: "Credentialing path needs confirmation",
              description:
                "Credentialing is required. Confirm platform, owner, status, and required steps.",
              actionLabel: "Add Credentialing Note",
            }
          : question.id === "scheduler-contact"
            ? {
                ...question,
                text: question.text.replace(/contact information unknown/i, "contact information unknown"),
                description: "Scheduler was referenced, but contact details are incomplete.",
                actionLabel: "Update Scheduler Contact",
              }
            : question;
      pushUnique(items, seen, mapped, { observationApproved: approved, contact });
    }
  }

  for (const gap of buildIntelligenceLearningGaps(contact, input.planning, maxItems + 2, {
    stageId,
  })) {
    const raw = contact[gap.dbKey] as string | null | undefined;
    if (!fieldHasIntelligenceSignal(gap.dbKey, raw) && gap.state === "unknown") {
      continue;
    }
    if (GENERIC_SCHEDULING_GAP_RE.test(gap.phrase)) continue;
    pushUnique(
      items,
      seen,
      {
        id: `gap-${gap.dbKey}`,
        text: gap.phrase,
      },
      { observationApproved: approved, contact },
    );
  }

  return items.slice(0, maxItems);
}
