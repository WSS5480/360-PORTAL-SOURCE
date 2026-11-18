/**
 * Intelligence tab — per-signal validation history and operational notes for expanded cards.
 */

import type { DiscoveryIntelligenceSignalRow } from "@/lib/surgical-sales/buildDiscoveryIntelligenceGroupsView";
import { hasProviderObservationApprovalValidated } from "@/lib/surgical-sales/buildProviderDiscoveryStageProgression";
import {
  DISCOVERY_FIELD_STATUS,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { intelligenceMetadataFromContact } from "@/lib/surgical-sales/providerCreateWizard";
import {
  formatFieldCaptureHistoryLine,
  parseProviderIntelligenceFieldMetadata,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { formatWorkflowConfirmedDate } from "@/lib/surgical-sales/providerOverviewWorkflowActions";
import { resolveSchedulingOwnerFieldText } from "@/lib/surgical-sales/schedulingIntelligenceDbKeys";
import { buildProviderObservationReadiness } from "@/lib/surgical-sales/providerObservationReadiness";

const F = DISCOVERY_FIELD_STATUS;
const OBSERVATION_APPROVAL_DB_KEY = "provider_observation_feasibility";

function metaForKey(contact: Record<string, unknown>, dbKey: string) {
  return parseProviderIntelligenceFieldMetadata(contact)[dbKey];
}

export function discoverySignalValidationHistory(
  contact: Record<string, unknown>,
  row: DiscoveryIntelligenceSignalRow,
): string | null {
  if (!row.signalId) return null;

  if (row.signalId === "observation_approval" && hasProviderObservationApprovalValidated(contact)) {
    const meta = intelligenceMetadataFromContact(contact)[OBSERVATION_APPROVAL_DB_KEY];
    const date = formatWorkflowConfirmedDate(meta);
    return date ? `Validated on file · ${date}` : "Validated on file";
  }

  const meta = metaForKey(contact, row.primaryDbKey);
  if (!meta) return null;

  if (meta.validated_at) {
    const validated = formatFieldCaptureHistoryLine({
      ...meta,
      updated_at: meta.validated_at,
    });
    return validated ? `Validated · ${validated.replace(/^Updated /, "")}` : "Validated on file";
  }

  const captured = formatFieldCaptureHistoryLine(meta);
  if (captured) return `Last captured · ${captured.replace(/^Updated /, "")}`;

  return null;
}

export function discoverySignalOperationalNote(
  contact: Record<string, unknown>,
  row: DiscoveryIntelligenceSignalRow,
): string | null {
  if (!row.signalId) return null;

  const signalId = row.signalId as DiscoveryStructuredSignalId;

  if (signalId === "scheduling_owner") {
    const readiness = buildProviderObservationReadiness(contact);
    if (readiness.schedulerIdentified === "partial" || readiness.schedulerIdentified === "yes") {
      return readiness.display.scheduler;
    }
    const text = resolveSchedulingOwnerFieldText(contact);
    return text || null;
  }

  if (signalId === "clinical_champion" || signalId === "decision_influence") {
    const raw = contact.provider_champion_potential ?? contact.influence_level;
    const text = typeof raw === "string" ? raw.trim() : "";
    if (text && !/^(high|medium|low|unknown)$/i.test(text)) return text;
  }

  if (signalId === "facility_vendor_pathway") {
    const raw = contact.provider_observation_access_path;
    const text = typeof raw === "string" ? raw.trim() : "";
    if (text) return text;
  }

  if (row.statusLabel === F.validated || row.statusLabel === F.captured) {
    const raw = contact[row.primaryDbKey];
    if (typeof raw === "string" && raw.trim() && raw.trim().length > 24) {
      return raw.trim();
    }
  }

  return null;
}
