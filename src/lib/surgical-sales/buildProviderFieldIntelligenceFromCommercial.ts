/**
 * Provider Intelligence read model — commercial intelligence is the system of record.
 */

import {
  isGenericClinicalFactText,
  parseClinicalStorageValue,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import type { ProviderFieldIntelligenceModel } from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import {
  parseProviderCommercialIntelligence,
  type ObservationAccessStatus,
  type ProviderCommercialIntelligence,
  type SupportContactIntelligence,
} from "@/lib/surgical-sales/providerCommercialIntelligenceModel";
import { MISSION_ACCESS_STATUS_LABELS } from "@/lib/surgical-sales/providerMissionExecutionLanguage";

export function resolveCommercialIntelligence(
  contact: Record<string, unknown>,
): ProviderCommercialIntelligence | null {
  return parseProviderCommercialIntelligence(contact);
}

export function commercialIntelligenceIsPopulated(
  intel: ProviderCommercialIntelligence | null,
): intel is ProviderCommercialIntelligence {
  if (!intel?.updated_at) return false;
  const { observation, scheduling, credentialing, clinical, support_contacts } = intel;
  return (
    observation.interest !== "unknown" ||
    observation.approval_status !== "unknown" ||
    observation.access_status !== "unknown" ||
    observation.readiness !== "unknown" ||
    observation.credentialing_required !== "unknown" ||
    scheduling.scheduler_identified !== "unknown" ||
    scheduling.scheduler_contact_linked !== "unknown" ||
    scheduling.scheduling_workflow_known !== "unknown" ||
    credentialing.credentialing_required !== "unknown" ||
    credentialing.credentialing_platform_known !== "unknown" ||
    credentialing.credentialing_notes.length > 0 ||
    clinical.procedure_focus.length > 0 ||
    clinical.clinical_frustrations.length > 0 ||
    clinical.clinical_preferences.length > 0 ||
    clinical.workflow_observations.length > 0 ||
    clinical.product_interests.length > 0 ||
    clinical.trends.length > 0 ||
    clinical.entries.length > 0 ||
    support_contacts.length > 0
  );
}

function displayProcedureLabel(value: string): string {
  const parsed = parseClinicalStorageValue(value);
  return parsed?.procedureFocus ?? value.trim();
}

function trendFromProcedureValue(value: string): string | null {
  const parsed = parseClinicalStorageValue(value);
  if (!parsed) return null;
  if (!/increasing|volume|trend|adoption/i.test(parsed.signalLabel)) return null;
  const focus = parsed.procedureFocus;
  return `Increasing ${focus.charAt(0).toLowerCase()}${focus.slice(1)} volume`;
}

export function buildClinicalSectionFromCommercial(
  intel: ProviderCommercialIntelligence,
  contact: Record<string, unknown>,
): ProviderFieldIntelligenceModel["clinical"] {
  const procedures: string[] = [];
  const trends: string[] = [];
  const seenProc = new Set<string>();
  const seenTrend = new Set<string>();

  const pushProcedure = (raw: string) => {
    const label = displayProcedureLabel(raw);
    if (!label || isGenericClinicalFactText(label)) return;
    const key = label.toLowerCase();
    if (seenProc.has(key)) return;
    seenProc.add(key);
    procedures.push(label);
  };

  const pushTrend = (raw: string) => {
    const trend = trendFromProcedureValue(raw) ?? raw.trim();
    if (!trend || isGenericClinicalFactText(trend) || /\bgeneral\s+volume\b/i.test(trend)) return;
    const key = trend.toLowerCase();
    if (seenTrend.has(key)) return;
    seenTrend.add(key);
    trends.push(trend);
  };

  for (const value of intel.clinical.procedure_focus) {
    pushProcedure(value);
    const derived = trendFromProcedureValue(value);
    if (derived) pushTrend(derived);
  }
  for (const value of intel.clinical.trends) {
    pushTrend(value);
  }

  if (procedures.length === 0) {
    const legacy = String(contact.provider_procedure_focus ?? "").trim();
    for (const part of legacy.split(/\||\n/)) {
      if (part.trim()) pushProcedure(part.trim());
    }
  }

  const summaryParts = [
    ...procedures,
    ...trends,
    ...intel.clinical.clinical_frustrations,
    ...intel.clinical.clinical_preferences,
    ...intel.clinical.workflow_observations.map((value) => `Workflow: ${value}`),
    ...intel.clinical.product_interests.map((value) => `Product interest: ${value}`),
  ].filter(Boolean);

  return {
    procedures,
    trends,
    frustrations: [...intel.clinical.clinical_frustrations],
    preferences: [...intel.clinical.clinical_preferences],
    workflowObservations: [...intel.clinical.workflow_observations],
    productInterests: [...intel.clinical.product_interests],
    summary: summaryParts.length > 0 ? summaryParts.slice(0, 4).join(" · ") : null,
  };
}

export function schedulerNameFromCommercial(
  intel: ProviderCommercialIntelligence,
): string | null {
  const schedulingContact = intel.support_contacts.find(
    (row) => row.scope === "provider" && /schedul/i.test(row.contact_role ?? ""),
  );
  if (schedulingContact) return schedulingContact.contact_name;
  const anyProvider = intel.support_contacts.find((row) => row.scope === "provider");
  return anyProvider?.contact_name ?? null;
}

export function schedulingHasCommercialEvidence(intel: ProviderCommercialIntelligence): boolean {
  return (
    intel.scheduling.scheduler_identified !== "unknown" ||
    intel.scheduling.scheduler_contact_linked !== "unknown" ||
    intel.support_contacts.some((row) => /schedul/i.test(row.contact_role ?? ""))
  );
}

export function credentialingHasCommercialEvidence(intel: ProviderCommercialIntelligence): boolean {
  return (
    intel.credentialing.credentialing_required !== "unknown" ||
    intel.credentialing.credentialing_platform_known !== "unknown" ||
    intel.credentialing.credentialing_notes.length > 0 ||
    intel.observation.credentialing_required !== "unknown"
  );
}

export function observationHasCommercialEvidence(intel: ProviderCommercialIntelligence): boolean {
  return (
    intel.observation.interest !== "unknown" ||
    intel.observation.approval_status !== "unknown" ||
    intel.observation.access_status !== "unknown"
  );
}

export function accessStatusDisplayLabel(status: ObservationAccessStatus): string | null {
  switch (status) {
    case "open":
      return "Access open";
    case "partial":
      return "Partial access";
    case "blocked":
      return MISSION_ACCESS_STATUS_LABELS.blocked;
    default:
      return null;
  }
}

export function formatSupportContactsFromCommercial(
  contacts: SupportContactIntelligence[],
  scope: SupportContactIntelligence["scope"],
): string | null {
  const scoped = contacts.filter((row) => row.scope === scope);
  if (scoped.length === 0) return null;
  return scoped
    .map((row) => {
      const role = row.contact_role?.trim();
      return role ? `${row.contact_name} (${role})` : row.contact_name;
    })
    .join("; ");
}

export function credentialingPlatformFromCommercial(
  intel: ProviderCommercialIntelligence,
  contact: Record<string, unknown>,
): string | null {
  if (intel.credentialing.credentialing_platform_known === "no") return null;
  const note = intel.credentialing.credentialing_notes.find((row) => {
    const trimmed = row.trim();
    if (!trimmed || trimmed.length > 120) return false;
    if (/\b(?:unknown|unsure|tbd|next step|identify|upcoming)\b/i.test(trimmed)) return false;
    return true;
  });
  if (note) return note;
  const legacy = String(contact.provider_credentialing_platform_name ?? "").trim();
  if (legacy && !/\b(?:unknown|unsure|tbd)\b/i.test(legacy)) return legacy;
  return null;
}
