/**
 * Contextual pathway execution routing — shared by Overview quick actions and Intelligence tab gaps.
 */

import { observationPermissionConfirmedOnFile } from "@/lib/surgical-sales/observationPermissionModel";
import { buildProviderObservationCaseHref } from "@/lib/surgical-sales/providerDirectoryLinks";
import type { ProviderOverviewExecutionAction } from "@/lib/surgical-sales/buildProviderOverviewExecutionCtas";
import type { ProviderOverviewFocusedModal } from "@/lib/surgical-sales/providerOverviewFocusedActionRouting";
import { PROVIDER_FIELD_OPS_CTA } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";
import { buildProviderObservationReadiness } from "@/lib/surgical-sales/providerObservationReadiness";
import { isCredentialingWorkflowComplete } from "@/lib/surgical-sales/observationAccessWorkflowState";
import {
  hasScheduledObservation,
  productNeedsConfirmation,
  resolveSchedulerName,
} from "@/lib/surgical-sales/buildProviderIntelligenceFieldEvidenceCards";
import { resolveNormalizedObservationPermission } from "@/lib/surgical-sales/observationPermissionModel";
import { readProviderCommercialIntelligence } from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import type { FieldBriefingAccessStepState } from "@/lib/surgical-sales/buildProviderIntelligenceKnowledgeDashboardView";
import type { IntelligenceCaptureCategoryId } from "@/lib/surgical-sales/intelligenceCaptureCategories";
import {
  resolveIntelligenceCaptureCategoryForDbKey,
  resolveIntelligenceCaptureCategoryForGapQuestion,
} from "@/lib/surgical-sales/intelligenceCapture/resolveIntelligenceCaptureCategoryForGap";
import {
  resolvePathwayActionForAccessStep as resolveAccessStepPathwayAction,
  type ProviderAccessStepPathwayAction,
} from "@/lib/surgical-sales/providerAccessStepPathwayActions";

const QUICK_NOTE_BY_QUESTION_ID: Record<string, { label: string; hint?: string }> = {
  "gap-provider-pain": {
    label: "Add provider pain points",
    hint: "Dictate or type what you heard — we route it to clinical challenges when you save.",
  },
  "gap-staff-pain": {
    label: "Add staff workflow pain",
    hint: "Dictate or type what staff mentioned — we route it when you save.",
  },
  "gap-workflow-validation": {
    label: "Validate workflow",
    hint: "Quick note on how cases actually run — we route it to procedure workflow when you save.",
  },
  "gap-product-confirmation": {
    label: "Confirm product use",
    hint: "What products are in use or competing — we route it to commercial landscape when you save.",
  },
};

function quickNoteActionForCategory(
  categoryId: IntelligenceCaptureCategoryId,
  label = "Add note",
  hint?: string,
): ProviderPathwayExecutionAction {
  return { kind: "quickNote", categoryId, label, hint };
}

function quickNoteActionForQuestionId(questionId: string): ProviderPathwayExecutionAction | null {
  const mapped = QUICK_NOTE_BY_QUESTION_ID[questionId];
  if (mapped) {
    const categoryId = resolveIntelligenceCaptureCategoryForGapQuestion(questionId);
    if (!categoryId) return null;
    return quickNoteActionForCategory(categoryId, mapped.label, mapped.hint);
  }

  if (questionId.startsWith("gap-provider_")) {
    const dbKey = questionId.slice(4);
    return quickNoteActionForCategory(
      resolveIntelligenceCaptureCategoryForDbKey(dbKey),
      "Add note",
    );
  }

  return null;
}

export type ProviderPathwayExecutionAction =
  | ProviderAccessStepPathwayAction
  | {
      kind: "quickNote";
      categoryId: IntelligenceCaptureCategoryId;
      label: string;
      hint?: string;
    };

export type ProviderPathwayGapCard = {
  id: string;
  text: string;
  description: string | null;
  actionLabel: string | null;
  action: ProviderPathwayExecutionAction | null;
};

export function observationApprovalConfirmed(contact: Record<string, unknown>): boolean {
  return observationPermissionConfirmedOnFile(contact);
}

export function buildObservationCaseHref(input: {
  providerId: string;
  accountId?: string | null;
}): string {
  return buildProviderObservationCaseHref({
    providerId: input.providerId,
    accountId: input.accountId ?? null,
  });
}

export function resolvePathwayActionForOpenQuestionId(
  questionId: string,
  input: {
    providerId: string;
    accountId?: string | null;
    intelligenceHref?: string;
  },
): ProviderPathwayExecutionAction | null {
  const observationHref = buildObservationCaseHref(input);

  if (
    questionId === "gap-first-observation" ||
    questionId === "learn-case" ||
    questionId === "learn-date" ||
    questionId === "follow-case" ||
    questionId === "follow-date"
  ) {
    return { kind: "href", href: observationHref, label: "Add Observation Case" };
  }

  if (
    questionId === "gap-credentialing-path" ||
    questionId === "cred-platform" ||
    questionId === "follow-credentialing" ||
    questionId.startsWith("gap-provider_credentialing") ||
    questionId.startsWith("gap-provider_observation_credentialing")
  ) {
    return { kind: "focusedModal", modal: "credentialing" };
  }

  if (
    questionId === "gap-scheduler-contact" ||
    questionId === "scheduler-contact" ||
    questionId === "follow-scheduler" ||
    questionId === "immediate-scheduler" ||
    questionId.startsWith("scheduling-")
  ) {
    return { kind: "focusedModal", modal: "scheduler" };
  }

  if (questionId === "gap-product-confirmation") {
    return quickNoteActionForQuestionId(questionId);
  }

  const quickNote = quickNoteActionForQuestionId(questionId);
  if (quickNote) return quickNote;

  return null;
}

export function resolvePathwayActionForAccessStep(
  stepId: string,
  stepState: FieldBriefingAccessStepState,
  input: {
    providerId: string;
    accountId?: string | null;
  },
): ProviderPathwayExecutionAction | null {
  return resolveAccessStepPathwayAction(stepId, stepState, input);
}

export function enrichOpenQuestionWithPathwayAction(
  question: { id: string; text: string; description?: string | null; actionLabel?: string | null },
  input: {
    providerId: string;
    accountId?: string | null;
    intelligenceHref?: string;
  },
): ProviderPathwayGapCard {
  const action = resolvePathwayActionForOpenQuestionId(question.id, input);
  return {
    id: question.id,
    text: question.text,
    description: question.description ?? null,
    actionLabel: question.actionLabel ?? action?.label ?? null,
    action,
  };
}

export function buildContextualProviderQuickActions(input: {
  intelligenceHref: string;
  newEngagementHref: string;
  providerId: string;
  accountId?: string | null;
  contact: Record<string, unknown>;
  engagements?: ProviderEngagementSummary[];
  cases?: Array<Record<string, unknown>>;
  stageId?: string;
}): ProviderOverviewExecutionAction[] {
  const contact = input.contact ?? {};
  const approved = observationApprovalConfirmed(contact);
  const readiness = buildProviderObservationReadiness(contact);
  const permission = resolveNormalizedObservationPermission({
    contact,
    engagements: input.engagements,
    cases: input.cases,
  });
  const commercial = readProviderCommercialIntelligence(contact);
  const schedulerName = resolveSchedulerName(contact, commercial);
  const credentialingComplete = isCredentialingWorkflowComplete(contact);
  const credentialingRequired = readiness.credentialingRequired === "yes";
  const observationCaseHref = buildObservationCaseHref({
    providerId: input.providerId,
    accountId: input.accountId,
  });

  const supportContactAction: ProviderOverviewExecutionAction = {
    id: "add_support_contacts",
    label: PROVIDER_FIELD_OPS_CTA.addSupportContact,
    customAction: "openSupportContacts",
  };

  const actions: ProviderOverviewExecutionAction[] = [
    {
      id: "add_intelligence",
      label: "Field note",
      missionBoardShortcutId: "dictate",
    },
    supportContactAction,
  ];

  if (!approved) {
    actions.push({
      id: "update_permission_status",
      label: "Update Permission",
      customAction: "openObservationApproval",
    });
    return actions;
  }

  if (!hasScheduledObservation({ permission, cases: input.cases })) {
    actions.push({
      id: "add_observation_case",
      label: "Add Observation Case",
      href: observationCaseHref,
    });
  }

  if (schedulerName && readiness.schedulerContactInfoCaptured !== "yes") {
    actions.push({
      id: "add_scheduler",
      label: "Update Scheduler Contact",
      customAction: "openScheduler",
    });
  } else if (readiness.schedulerIdentified === "no" || readiness.schedulerIdentified === "unknown") {
    actions.push({
      id: "add_scheduler",
      label: "Add Scheduler",
      customAction: "openScheduler",
    });
  } else if (readiness.schedulerIdentified === "partial") {
    actions.push({
      id: "add_scheduler",
      label: "Update Scheduler Contact",
      customAction: "openScheduler",
    });
  }

  if (credentialingRequired && !credentialingComplete) {
    actions.push({
      id: "add_credentialing_note",
      label: "Add Credentialing Note",
      customAction: "openCredentialingNote",
    });
  }

  return actions;
}

export function pathwayActionToFocusedModal(
  action: ProviderPathwayExecutionAction | null | undefined,
): ProviderOverviewFocusedModal | null {
  if (!action) return null;
  if (action.kind === "focusedModal") return action.modal;
  return null;
}
