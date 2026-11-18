/**
 * Debrief → discovery evidence → persisted contact shape → Discovery Mapping loader.
 * Single pipeline used by log-update save and tests (no modal-only state).
 */

import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import { buildFieldEvidenceFromLogUpdate } from "@/lib/surgical-sales/engagements/debriefIntelligenceSnapshot";
import { buildFieldSignalsFromLogUpdate } from "@/lib/surgical-sales/propagatedIntelligenceSignal";
import { buildDiscoveryMappingItemsFromLogUpdate } from "@/lib/surgical-sales/discoveryMappingIntelligenceItem";
import { buildDiscoveryIntelligenceGroupsView } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import {
  buildDiscoveryMappingQuestionView,
  findDiscoverySignalRowForDbKey,
} from "@/lib/surgical-sales/buildDiscoveryMappingQuestionView";
import { resolveDiscoveryFieldEvidence } from "@/lib/surgical-sales/discoveryIntelligenceEvidence";
import type { DiscoveryStructuredSignalId } from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  mergeIntelligenceFieldMetadata,
  type IntelligenceCaptureContext,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { logUpdateAcceptedFieldPatches } from "@/lib/surgical-sales/logUpdateProviderRouting";
import type { SchedulingControlPathId } from "@/lib/surgical-sales/schedulingOwnershipFields";
import { discoveryIntelligenceDebug } from "@/lib/surgical-sales/discoveryIntelligenceDebug";
import {
  buildProviderOperationalState,
  operationalEvidenceForDbKey,
  sanitizeOperationalUserText,
} from "@/lib/surgical-sales/operationalIntelligenceEngine";
import { applyAcceptedCommercialIntelligenceToContactPatch } from "@/lib/surgical-sales/applyCommercialIntelligenceToContactPatch";
import type { DebriefProposedContactItem } from "@/lib/surgical-sales/debriefDetectedContact";

export type DebriefDiscoveryMappingItem = {
  providerId: string;
  signalId: DiscoveryStructuredSignalId | null;
  dbKey: string;
  question: string;
  currentUnderstanding: string;
  evidence: string | null;
  suggestedAnswer: string | null;
  status: string;
  source: string | null;
};

export type DebriefDiscoveryPersistPayload = {
  contactPatch: Record<string, unknown>;
  fieldEvidence: Record<string, string>;
  fieldPatches: Array<{ dbKey: string; value: string }>;
};

const SCHEDULING_PATH_LABEL: Record<SchedulingControlPathId, string> = {
  provider_office: "Provider office",
  facility: "Facility / hospital",
  shared_workflow: "Shared scheduling workflow",
  unknown: "Unknown",
};

function schedulingSuggestedAnswer(contact: Record<string, unknown>): string | null {
  const raw = String(contact.provider_observation_scheduling_control ?? "").trim() as SchedulingControlPathId;
  if (!raw || raw === "unknown") return null;
  return SCHEDULING_PATH_LABEL[raw] ?? SCHEDULING_PATH_LABEL.shared_workflow;
}

function mappingStatusLabel(maturityLabel: string, hasEvidence: boolean): string {
  if (/partial/i.test(maturityLabel)) return "Partial";
  if (/conditional/i.test(maturityLabel)) return "Conditional";
  if (/captured|interest|owner named/i.test(maturityLabel) && hasEvidence) return "Partial";
  if (/unknown/i.test(maturityLabel)) return "Unknown";
  return maturityLabel;
}

/** Build contact row + metadata as if log-update save succeeded. */
export function buildDebriefDiscoveryPersistPayload(input: {
  logUpdate: LogUpdateParseResult;
  sourceLabel: string;
  sourceType?: IntelligenceCaptureContext["source_type"];
  existingContact?: Record<string, unknown>;
  actor?: { userId: string; userName: string };
  proposedContacts?: DebriefProposedContactItem[];
}): DebriefDiscoveryPersistPayload {
  const captureContext: IntelligenceCaptureContext = {
    source_type: input.sourceType ?? "engagement",
    source_label: input.sourceLabel,
  };
  const fieldEvidence = buildFieldEvidenceFromLogUpdate(input.logUpdate);
  const fieldSignals = buildFieldSignalsFromLogUpdate(input.logUpdate);
  const fieldDiscoveryMapping = buildDiscoveryMappingItemsFromLogUpdate({
    logUpdate: input.logUpdate,
    captureContext,
  });
  const fieldPatches = logUpdateAcceptedFieldPatches(input.logUpdate.fieldUpdates);
  const actor = input.actor ?? { userId: "test-user", userName: "Test" };
  const existingContact = input.existingContact ?? {};
  const contactFields: Record<string, string> = {};

  for (const fp of fieldPatches) {
    contactFields[fp.dbKey] = fp.value.trim();
  }

  discoveryIntelligenceDebug("debrief:mappedDiscoveryEvidenceBeforeSave", {
    fieldPatches: fieldPatches.map((f) => f.dbKey),
    fieldEvidence,
  });

  const existingMetadata =
    (existingContact.provider_intelligence_field_metadata as Record<string, unknown>) ?? {};
  const metadata = mergeIntelligenceFieldMetadata({
    existing:
      typeof existingMetadata === "object" && !Array.isArray(existingMetadata)
        ? (existingMetadata as never)
        : {},
    changedKeys: [...new Set([...Object.keys(contactFields), ...Object.keys(fieldEvidence)])],
    fieldValues: { ...existingContact, ...contactFields } as Record<string, string | null | undefined>,
    captureContext,
    actor,
    fieldEvidence,
    fieldSignals,
    fieldDiscoveryMapping,
  });

  let contactPatch: Record<string, unknown> = {
    ...existingContact,
    ...contactFields,
    provider_intelligence_field_metadata: metadata,
  };

  contactPatch = applyAcceptedCommercialIntelligenceToContactPatch(contactPatch, {
    existingContact,
    fieldPatches,
    logUpdate: input.logUpdate,
    proposedContacts: input.proposedContacts,
  });

  discoveryIntelligenceDebug("debrief:savedDiscoveryEvidence", {
    patchKeys: Object.keys(contactFields),
    metadataKeys: Object.keys(metadata),
  });

  return { contactPatch, fieldEvidence, fieldPatches };
}

/** Discovery Mapping read model from a provider contact row (post-save). */
export function loadDiscoveryMappingFromContact(input: {
  providerId: string;
  contact: Record<string, unknown>;
}): { providerId: string; items: DebriefDiscoveryMappingItem[] } {
  const operationalState = buildProviderOperationalState({
    providerId: input.providerId,
    contact: input.contact,
  });
  const view = buildDiscoveryIntelligenceGroupsView({ contact: input.contact });
  const signalDbKeys: Array<{ signalId: DiscoveryStructuredSignalId; dbKey: string }> = [
    { signalId: "observation_approval", dbKey: "provider_observation_feasibility" },
    { signalId: "scheduling_owner", dbKey: "provider_observation_scheduling_control" },
    { signalId: "workflow_visibility", dbKey: "provider_procedure_focus" },
  ];

  const observationEvidenceDbKeys = [
    "provider_observation_feasibility",
    "provider_observation_access_path",
  ] as const;
  const schedulingEvidenceDbKeys = [
    "provider_observation_scheduling_control",
    "provider_scheduling_contact",
    "provider_facility_scheduling_contact",
    "provider_observation_coordinator_contact",
  ] as const;

  const items = signalDbKeys.map(({ signalId, dbKey }) => {
    const row = findDiscoverySignalRowForDbKey(view, dbKey);
    const mapping = buildDiscoveryMappingQuestionView({
      dbKey,
      contact: input.contact,
      discoveryView: view,
    });
    const crossFieldEvidence =
      signalId === "observation_approval"
        ? resolveDiscoveryFieldEvidence({
            dbKeys: [...observationEvidenceDbKeys],
            contact: input.contact,
          })
        : signalId === "scheduling_owner"
          ? resolveDiscoveryFieldEvidence({
              dbKeys: [...schedulingEvidenceDbKeys],
              contact: input.contact,
            })
          : null;
    const suggestedAnswer =
      signalId === "scheduling_owner" ? schedulingSuggestedAnswer(input.contact) : null;

    const canonical = operationalEvidenceForDbKey(operationalState, dbKey);
    const canonicalEvidence = canonical?.evidence
      ? sanitizeOperationalUserText(canonical.evidence)
      : null;
    const canonicalSummary = canonical?.summary
      ? sanitizeOperationalUserText(canonical.summary)
      : null;

    return {
      providerId: input.providerId,
      signalId,
      dbKey,
      question: mapping?.title ?? row?.label ?? dbKey,
      currentUnderstanding:
        canonicalSummary ||
        mapping?.currentState.summary?.trim() ||
        crossFieldEvidence?.quote ||
        row?.evidenceSnippet ||
        "",
      evidence:
        canonicalEvidence ??
        mapping?.evidence?.quote ??
        crossFieldEvidence?.quote ??
        row?.evidenceSnippet ??
        null,
      suggestedAnswer,
      status: canonical
        ? mappingStatusLabel(
            canonical.status === "partial"
              ? "Partial"
              : canonical.status === "likely"
                ? "Captured"
                : canonical.status === "confirmed"
                  ? "Validated"
                  : "Unknown",
            Boolean(canonicalEvidence),
          )
        : mappingStatusLabel(
            mapping?.currentState.maturityLabel ?? row?.maturityLabel ?? "Unknown",
            Boolean(mapping?.evidence?.quote ?? row?.evidenceSnippet),
          ),
      source:
        mapping?.evidence?.sourceLabel ??
        crossFieldEvidence?.sourceLabel ??
        row?.evidenceSourceLabel ??
        null,
    };
  });

  discoveryIntelligenceDebug("debrief:discoveryMappingLoaderResult", {
    providerId: input.providerId,
    items: items.map((i) => ({
      signalId: i.signalId,
      dbKey: i.dbKey,
      hasEvidence: Boolean(i.evidence),
      status: i.status,
    })),
  });

  return { providerId: input.providerId, items };
}
