/**
 * Provider overview — observation access reference rows (informational only).
 * Reads from the unified provider field intelligence model.
 */

import {
  buildProviderFieldIntelligenceModel,
  PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN,
} from "@/lib/surgical-sales/providerFieldIntelligenceModel";
import { ACCESS_INTELLIGENCE_SECTION_TITLE } from "@/lib/surgical-sales/backgroundIntelligenceSections";
import { buildProviderDiscoveryState } from "@/lib/surgical-sales/buildProviderDiscoveryState";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  formatIntelligenceCaptureDisplay,
  formatIntelligenceCaptureSummaryChip,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";

export type ProviderOverviewAccessIntelligenceRow = {
  id: string;
  label: string;
  value: string;
  captured: boolean;
};

export type ProviderOverviewAccessIntelligenceView = {
  title: string;
  rows: ProviderOverviewAccessIntelligenceRow[];
  capturedCount: number;
};

const EMPTY_VALUE = PROVIDER_OVERVIEW_FIELD_INTELLIGENCE_UNKNOWN;

function humanizeValue(value: string): string {
  return value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function readFieldValue(contact: Record<string, unknown>, dbKeys: readonly string[]): string | null {
  for (const dbKey of dbKeys) {
    const raw = String(contact[dbKey] ?? "").trim();
    if (!fieldHasIntelligenceSignal(dbKey, raw)) continue;
    const display =
      formatIntelligenceCaptureDisplay(dbKey, raw) ??
      formatIntelligenceCaptureSummaryChip(dbKey, raw) ??
      raw;
    const polished = humanizeValue(display);
    if (polished) return polished;
  }
  return null;
}

function modelLineRow(
  id: string,
  label: string,
  primaryLine: string,
  secondaryLine: string | null,
  isConfirmed: boolean,
): ProviderOverviewAccessIntelligenceRow {
  if (!isConfirmed) {
    return { id, label, value: EMPTY_VALUE, captured: false };
  }
  const value = secondaryLine?.trim()
    ? `${primaryLine.trim()} · ${secondaryLine.trim()}`
    : primaryLine.trim();
  return { id, label, value, captured: true };
}

function observationStatusRow(
  contact: Record<string, unknown>,
): ProviderOverviewAccessIntelligenceRow {
  const permission = buildProviderDiscoveryState({ contact }).permissionStage;
  if (permission.stageId === "unknown") {
    return {
      id: "observation_status",
      label: "Observation permission",
      value: EMPTY_VALUE,
      captured: false,
    };
  }

  return {
    id: "observation_status",
    label: "Observation permission",
    value: permission.label,
    captured: true,
  };
}

export function buildProviderOverviewAccessIntelligence(input: {
  contact: Record<string, unknown>;
}): ProviderOverviewAccessIntelligenceView {
  const contact = input.contact ?? {};
  const model = buildProviderFieldIntelligenceModel({ contact });

  const rows: ProviderOverviewAccessIntelligenceRow[] = [
    observationStatusRow(contact),
    modelLineRow(
      "scheduler",
      "Scheduler identified",
      model.scheduler.primaryLine,
      model.scheduler.secondaryLine,
      model.scheduler.isConfirmed,
    ),
    modelLineRow(
      "credentialing_path",
      "Credentialing path",
      model.credentialing.primaryLine,
      model.credentialing.secondaryLine,
      model.credentialing.isConfirmed,
    ),
    accessRow(
      "vendor_approval",
      "Vendor approval process",
      ["provider_credentialing_status", "provider_credentialing_platform_id"],
      contact,
    ),
    accessRow("or_coordinator", "OR coordinator", ["provider_observation_coordinator_contact"], contact),
    accessRow(
      "facility_access_notes",
      "Facility access notes",
      ["provider_observation_access_path", "provider_facility_access_notes", "access_notes"],
      contact,
    ),
  ];

  const capturedCount = rows.filter((row) => row.captured).length;

  return {
    title: ACCESS_INTELLIGENCE_SECTION_TITLE,
    rows,
    capturedCount,
  };
}

function accessRow(
  id: string,
  label: string,
  dbKeys: readonly string[],
  contact: Record<string, unknown>,
): ProviderOverviewAccessIntelligenceRow {
  const value = readFieldValue(contact, dbKeys);
  return {
    id,
    label,
    value: value ?? EMPTY_VALUE,
    captured: Boolean(value),
  };
}
