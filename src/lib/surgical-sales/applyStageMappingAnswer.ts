/**
 * Stage mapping mode — persist contextual answer choices for discovery signals.
 */

import { assignProviderSupportContact } from "@/lib/surgical-sales/assignProviderSupportContact";
import type { ProviderOverviewWorkflowApiAction } from "@/lib/surgical-sales/buildProviderOverviewStageRequirementsView";
import {
  discoveryIntelligenceSignalSupportsContact,
  discoverySupportContactPrimaryDbKey,
  type DiscoverySupportContactSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSupportContact";
import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { persistRapidDiscoveryAnswer } from "@/lib/surgical-sales/persistRapidDiscoveryAnswer";
import type { RapidDiscoveryOperationalStatus } from "@/lib/surgical-sales/rapidDiscoveryOperationalStatus";
import type { RapidDiscoverySupportContactDraft } from "@/lib/surgical-sales/rapidDiscoverySupportContact";
import {
  stageMappingChoiceToLegacy,
  stageMappingChoiceTone,
  type StageMappingAnswerPayload,
  type StageMappingLegacyChoice,
  type StageMappingValidationStatus,
} from "@/lib/surgical-sales/stageMappingAnswerTypes";
import {
  evidenceConfidenceToPersistence,
  validationStatusFromEvidenceConfidence,
  type DiscoveryMappingEvidenceConfidence,
} from "@/lib/surgical-sales/discoveryMappingEvidenceConfidence";
import { getStageMappingSignalSpec, isStageMappingSignalId, type StageMappingSignalId } from "@/lib/surgical-sales/stageMappingQuestions";
import { formatWorkflowMaturityPersistValue } from "@/lib/surgical-sales/workflowUnderstandingMaturity";
import {
  facilityCredentialingDraftFromMappingMetadata,
  persistFacilityCredentialingIntelligence,
} from "@/lib/surgical-sales/facilityCredentialingIntelligence";
import {
  applySchedulingOwnershipStageMappingAnswer,
} from "@/lib/surgical-sales/schedulingOwnershipIntelligence";
import type { SchedulingControlPathId } from "@/lib/surgical-sales/schedulingOwnershipFields";
import type { IntelligenceDiscoveryStance } from "@/lib/surgical-sales/operationalIntelligenceReadiness";
import { STAGE_MAPPING_CAPTURE_CONTEXT } from "@/lib/surgical-sales/stageMappingSourceAttribution";

function operationalStatusForLegacy(choice: StageMappingLegacyChoice): RapidDiscoveryOperationalStatus {
  switch (choice) {
    case "confirmed":
      return "cleared";
    case "partial":
      return "in_progress";
    case "declined":
      return "blocked";
    case "unknown":
    default:
      return "unknown";
  }
}

function operationalStatusForChoice(
  signalId: StageMappingSignalId,
  choice: string,
): RapidDiscoveryOperationalStatus {
  const spec = getStageMappingSignalSpec(signalId);
  const legacy = stageMappingChoiceToLegacy(choice, stageMappingChoiceTone(spec, choice));
  return operationalStatusForLegacy(legacy);
}

function mapValidationStatusToPersistence(status: StageMappingValidationStatus): {
  stance: IntelligenceDiscoveryStance;
  uncertaintyKind?: "unexplored" | "opaque";
  validateField: boolean;
} {
  switch (status) {
    case "confirmed":
      return { stance: "needs_validation", validateField: true };
    case "likely":
      return { stance: "ask_next_touch", validateField: false };
    case "needs_validation":
      return { stance: "needs_validation", validateField: false };
    case "unknown":
    default:
      return { stance: "unknown", uncertaintyKind: "unexplored", validateField: false };
  }
}

function resolveAnswerPersistence(input: {
  evidenceConfidence?: DiscoveryMappingEvidenceConfidence;
  validationStatus?: StageMappingValidationStatus;
}): {
  stance: IntelligenceDiscoveryStance;
  uncertaintyKind?: "unexplored" | "opaque";
  validateField: boolean;
  validationStatus: StageMappingValidationStatus;
} {
  if (input.evidenceConfidence) {
    const mapped = evidenceConfidenceToPersistence(input.evidenceConfidence);
    return {
      ...mapped,
      validationStatus: validationStatusFromEvidenceConfidence(input.evidenceConfidence),
    };
  }
  const legacy = mapValidationStatusToPersistence(input.validationStatus ?? "confirmed");
  return {
    ...legacy,
    validationStatus: input.validationStatus ?? "confirmed",
  };
}

function operationalStatusForValidationStatus(
  fallback: RapidDiscoveryOperationalStatus,
  validationStatus: StageMappingValidationStatus,
): RapidDiscoveryOperationalStatus {
  if (validationStatus === "unknown") return "unknown";
  if (validationStatus === "confirmed") return fallback;
  return "in_progress";
}

async function patchDiscoveryValidationStatus(input: {
  providerId: string;
  dbKey: string;
  validationStatus: StageMappingValidationStatus;
  evidenceConfidence?: DiscoveryMappingEvidenceConfidence;
}): Promise<Record<string, unknown>> {
  const mapped = input.evidenceConfidence
    ? evidenceConfidenceToPersistence(input.evidenceConfidence)
    : mapValidationStatusToPersistence(input.validationStatus);
  const res = await fetch(`/api/portal/sales/providers/${encodeURIComponent(input.providerId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      planning_capture_context: STAGE_MAPPING_CAPTURE_CONTEXT,
      intelligence_discovery_stances: {
        [input.dbKey]: {
          stance: mapped.stance,
          uncertainty_kind: mapped.uncertaintyKind,
        },
      },
      intelligence_validate_fields: mapped.validateField ? [input.dbKey] : [],
    }),
  });
  const payload = (await res.json()) as { provider?: Record<string, unknown>; error?: string };
  if (!res.ok || !payload.provider) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Could not save that answer.");
  }
  return payload.provider;
}

function workflowActionForChoice(
  signalId: DiscoveryStructuredSignalId,
  choice: string,
): ProviderOverviewWorkflowApiAction | null {
  switch (signalId) {
    case "observation_approval":
      if (choice === "approved") return "mark_observation_approved";
      if (choice === "partial" || choice === "pending") return "mark_observation_interested";
      if (choice === "declined") return "mark_observation_declined";
      return null;
    case "facility_vendor_pathway":
      if (choice === "path_clear") return "mark_access_path_known";
      if (choice === "partial_path" || choice === "required_pending") return "mark_pathway_partially_known";
      return null;
    case "clinical_champion":
      if (choice === "confirmed") return "mark_champion_confirmed";
      return null;
    default:
      return null;
  }
}

function formatMetadataBlock(metadata?: Record<string, string>): string {
  if (!metadata) return "";
  const lines = Object.entries(metadata)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v.trim()}`);
  return lines.join(" · ");
}

function defaultValueForChoice(
  signalId: StageMappingSignalId,
  choice: string,
  notes: string,
  metadata?: Record<string, string>,
): string {
  const trimmedNotes = notes.trim();
  const metaBlock = formatMetadataBlock(metadata);
  const combined = [trimmedNotes, metaBlock].filter(Boolean).join(" · ");

  if (signalId === "workflow_visibility") {
    return formatWorkflowMaturityPersistValue(choice, combined || trimmedNotes, metadata);
  }

  if (combined) return combined;

  const spec = getStageMappingSignalSpec(signalId);
  const label = spec.choices.find((c) => c.value === choice)?.label ?? choice;

  switch (signalId) {
    case "scheduling_owner":
      if (choice === "unknown") return "Scheduling control unknown — follow up required";
      if (choice === "provider_office") return "Scheduling controlled by provider office";
      if (choice === "facility") return "Scheduling controlled by facility / hospital";
      if (choice === "shared_workflow") return "Shared scheduling workflow";
      break;
    case "facility_vendor_pathway":
      if (choice === "path_clear") return "Facility / vendor path clear";
      if (choice === "partial_path") return "Pathway partially mapped";
      if (choice === "required_pending") return "Credentials required — pending";
      break;
    case "observation_logistics":
      if (choice === "immediate") return "Immediate observation access";
      if (choice === "scheduled") return "Observation scheduled";
      if (choice === "delayed") return "Observation delayed — timing constraints";
      break;
    case "product_alignment":
      if (choice === "high") return "High product alignment confidence";
      if (choice === "moderate") return "Moderate product alignment confidence";
      if (choice === "low") return "Low product alignment confidence";
      break;
    case "case_opportunity":
      if (choice === "high") return "High case opportunity";
      if (choice === "medium") return "Medium case opportunity";
      if (choice === "low") return "Low case opportunity";
      break;
    case "clinical_champion":
      if (choice === "confirmed") return "Clinical champion confirmed";
      if (choice === "suspected") return "Champion suspected — needs confirmation";
      if (choice === "none_identified") return "No clinical champion identified";
      break;
    default:
      break;
  }

  return `${label} on file`;
}

async function postWorkflowAction(
  providerId: string,
  action: ProviderOverviewWorkflowApiAction,
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `/api/portal/sales/providers/${encodeURIComponent(providerId)}/workflow-actions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    },
  );
  const payload = (await res.json()) as {
    ok?: boolean;
    error?: string;
    provider?: Record<string, unknown>;
  };
  if (!res.ok || !payload.ok || !payload.provider) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Could not save that answer.");
  }
  return payload.provider;
}

export async function applyStageMappingContactAnswer(input: {
  providerId: string;
  signalId: DiscoverySupportContactSignalId;
  dbKey: string;
  draft: RapidDiscoverySupportContactDraft;
  choice: string;
  metadata?: Record<string, string>;
}): Promise<Record<string, unknown>> {
  const metaNotes = formatMetadataBlock(input.metadata);
  const draft =
    metaNotes && !input.draft.notes.trim()
      ? { ...input.draft, notes: metaNotes }
      : input.draft;

  const result = await assignProviderSupportContact({
    providerId: input.providerId,
    dbKey: input.dbKey || discoverySupportContactPrimaryDbKey(input.signalId),
    draft,
    discoverySignalId: input.signalId,
    sourceLabel: "Field capture",
  });

  const workflowAction = workflowActionForChoice(input.signalId, input.choice);
  if (workflowAction) {
    return postWorkflowAction(input.providerId, workflowAction);
  }

  return result.provider;
}

export async function applyStageMappingAnswer(input: {
  providerId: string;
  signalId: DiscoveryStructuredSignalId;
  dbKey: string;
  answer: StageMappingAnswerPayload;
  contact?: Record<string, unknown>;
  providerContactDraft?: RapidDiscoverySupportContactDraft | null;
  facilityContactDraft?: RapidDiscoverySupportContactDraft | null;
}): Promise<Record<string, unknown>> {
  const { choice, notes = "", metadata, evidenceText } = input.answer;
  const persistence = resolveAnswerPersistence({
    evidenceConfidence: input.answer.evidenceConfidence,
    validationStatus: input.answer.validationStatus,
  });
  const validationStatus = persistence.validationStatus;
  if (!isStageMappingSignalId(input.signalId)) {
    throw new Error(`Signal ${input.signalId} is not available in field intelligence capture.`);
  }
  const signalId = input.signalId;
  const workflowAction = workflowActionForChoice(signalId, choice);
  const operationalStatus = operationalStatusForValidationStatus(
    operationalStatusForChoice(signalId, choice),
    validationStatus,
  );
  const validationPersistence = persistence;

  if (signalId === "scheduling_owner") {
    await applySchedulingOwnershipStageMappingAnswer({
      providerId: input.providerId,
      choice: choice as SchedulingControlPathId,
      notes,
      providerContactDraft: input.providerContactDraft,
      facilityContactDraft: input.facilityContactDraft,
    });
    return patchDiscoveryValidationStatus({
      providerId: input.providerId,
      dbKey: input.dbKey,
      validationStatus,
      evidenceConfidence: input.answer.evidenceConfidence,
    });
  }

  if (signalId === "facility_vendor_pathway") {
    let provider: Record<string, unknown> | undefined;
    if (workflowAction) {
      provider = await postWorkflowAction(input.providerId, workflowAction);
    }
    const draft = facilityCredentialingDraftFromMappingMetadata(metadata);
    await persistFacilityCredentialingIntelligence({
      providerId: input.providerId,
      choice,
      draft,
      notes,
      workflowProvider: provider,
      contact: input.contact ?? provider,
    });
    return patchDiscoveryValidationStatus({
      providerId: input.providerId,
      dbKey: input.dbKey,
      validationStatus,
      evidenceConfidence: input.answer.evidenceConfidence,
    });
  }

  if (workflowAction) {
    let provider = await postWorkflowAction(input.providerId, workflowAction);
    const value = defaultValueForChoice(signalId, choice, notes, metadata);
    if (value && input.dbKey && (notes.trim() || metadata)) {
      provider = await persistRapidDiscoveryAnswer({
        providerId: input.providerId,
        dbKey: input.dbKey,
        value,
        operationalStatus,
        fieldEvidence: notes.trim() ? { [input.dbKey]: notes.trim() } : undefined,
        captureContext: STAGE_MAPPING_CAPTURE_CONTEXT,
      });
    }
    return patchDiscoveryValidationStatus({
      providerId: input.providerId,
      dbKey: input.dbKey,
      validationStatus,
      evidenceConfidence: input.answer.evidenceConfidence,
    });
  }

  const isUnknownOnly =
    choice === "unknown" && !notes.trim() && !formatMetadataBlock(metadata);

  if (isUnknownOnly) {
    return patchDiscoveryValidationStatus({
      providerId: input.providerId,
      dbKey: input.dbKey,
      validationStatus: "unknown",
    });
  }

  const trimmedNotes = notes.trim();
  const trimmedEvidence = evidenceText?.trim() ?? "";
  return persistRapidDiscoveryAnswer({
    providerId: input.providerId,
    dbKey: input.dbKey,
    value: defaultValueForChoice(signalId, choice, notes, metadata),
    operationalStatus,
    fieldEvidence: trimmedEvidence ? { [input.dbKey]: trimmedEvidence } : undefined,
    discoveryStanceOverride: {
      stance: validationPersistence.stance,
      uncertaintyKind: validationPersistence.uncertaintyKind,
    },
    validateFieldOverride: validationPersistence.validateField,
    captureContext: STAGE_MAPPING_CAPTURE_CONTEXT,
  });
}

export function stageMappingSignalAcceptsContactAnswer(signalId: string): signalId is DiscoverySupportContactSignalId {
  return discoveryIntelligenceSignalSupportsContact(signalId);
}
