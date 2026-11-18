/**
 * Canonical pathway intelligence — signal maturity per stage (discovery mapping pattern).
 */

import type { ProviderEngagementSummary } from "@/lib/surgical-sales/engagements/providerEngagementSummary";
import {
  DISCOVERY_FIELD_STATUS,
  resolveDiscoveryStructuredSignalStatus,
  type DiscoveryStructuredSignalId,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { isIntelligenceFieldValidatedOnFile } from "@/lib/surgical-sales/providerIntelligenceValidatedOnFile";
import {
  countObservedProcedures,
  hasDebriefNotesReviewedWithSurgeon,
  hasValidatedClinicalInterest,
  type PathwayGateInput,
} from "@/lib/surgical-sales/pathwayStageGates";
import {
  pathwayIntelligenceForStage,
  SALES_PATHWAY_MIN_COMMITTED_CASES,
  SALES_PATHWAY_MIN_OBSERVATIONS,
  type PathwayIntelligenceSignalId,
  type PathwayIntelligenceSignalSpec,
  type SalesPathwayStageId,
} from "@/lib/surgical-sales/salesPathwayCanonical";

const F = DISCOVERY_FIELD_STATUS;

export type PathwayIntelligenceMaturity = "unknown" | "partial" | "confirmed";

export type PathwayIntelligenceSignalState = {
  id: PathwayIntelligenceSignalId;
  label: string;
  stageId: SalesPathwayStageId;
  dbKey: string;
  sectionId: PathwayIntelligenceSignalSpec["sectionId"];
  maturity: PathwayIntelligenceMaturity;
  met: boolean;
  summary: string | null;
};

const DISCOVERY_SIGNAL_MAP: Partial<Record<PathwayIntelligenceSignalId, DiscoveryStructuredSignalId>> = {
  observation_approval: "observation_approval",
  scheduling_owner: "scheduling_owner",
  facility_access_requirements: "facility_vendor_pathway",
  target_observation_dates: "observation_logistics",
};

function discoveryMaturityForSignal(
  signalId: PathwayIntelligenceSignalId,
  contact: Record<string, unknown>,
): PathwayIntelligenceMaturity {
  const mapped = DISCOVERY_SIGNAL_MAP[signalId];
  if (!mapped) {
    return "unknown";
  }
  const status = resolveDiscoveryStructuredSignalStatus(mapped, contact);
  if (status === F.validated || status === F.notApplicable) return "confirmed";
  if (status === F.captured || status === F.conditional) return "partial";
  return "unknown";
}

function fieldReady(dbKey: string, contact: Record<string, unknown>): boolean {
  return (
    isIntelligenceFieldValidatedOnFile(dbKey, contact) ||
    fieldHasIntelligenceSignal(dbKey, contact[dbKey] as string | null | undefined)
  );
}

function fieldReadyPartial(dbKey: string, contact: Record<string, unknown>): PathwayIntelligenceMaturity {
  if (isIntelligenceFieldValidatedOnFile(dbKey, contact)) return "confirmed";
  if (fieldHasIntelligenceSignal(dbKey, contact[dbKey] as string | null | undefined)) return "partial";
  return "unknown";
}

function resolveSignalMaturity(
  spec: PathwayIntelligenceSignalSpec,
  input: PathwayGateInput,
): PathwayIntelligenceMaturity {
  const { contact } = input;

  if (spec.stageId === "discovery") {
    if (spec.id === "surgeon_relationship_owner") {
      return fieldReadyPartial("provider_decision_maker_status", contact);
    }
    if (spec.id === "credentialing_requirement") {
      return fieldReadyPartial("provider_observation_credentialing_needed", contact);
    }
    return discoveryMaturityForSignal(spec.id, contact);
  }

  if (spec.id === "observed_case_count") {
    const count = countObservedProcedures(input);
    if (count >= SALES_PATHWAY_MIN_OBSERVATIONS) return "confirmed";
    if (count > 0) return "partial";
    return "unknown";
  }

  if (spec.id === "notes_reviewed_with_surgeon") {
    return hasDebriefNotesReviewedWithSurgeon(input) ? "confirmed" : "unknown";
  }

  if (spec.id === "clinical_value_opportunity") {
    return hasValidatedClinicalInterest(input) ? "confirmed" : fieldReadyPartial(spec.dbKey, contact);
  }

  if (spec.id === "committed_case_target") {
    const raw = String(contact.provider_case_volume_estimate ?? "").trim();
    if (!raw) return "unknown";
    const match = raw.match(/\b(\d{1,3})\b/);
    const n = match ? Number(match[1]) : 0;
    if (n >= SALES_PATHWAY_MIN_COMMITTED_CASES) return "confirmed";
    if (n > 0) return "partial";
    return fieldReadyPartial(spec.dbKey, contact);
  }

  if (spec.id === "evaluation_path_selected") {
    const storedPath = String(contact.provider_evaluation_path ?? "").trim();
    if (storedPath) return "confirmed";
    const hasEvaluationActivity = (input.engagements ?? []).some((e) =>
      [
        "office_visit_360",
        "lab_visit",
        "peer_discussion",
        "product_demo",
        "evaluation_planning",
        "evaluation_follow_up",
        "in_service_training",
      ].includes(String(e.engagement_type || "").toLowerCase()),
    );
    if (hasEvaluationActivity) return "confirmed";
    return fieldReadyPartial(spec.dbKey, contact);
  }

  if (spec.id === "evaluation_scheduled_or_completed") {
    const done = (input.engagements ?? []).some(
      (e) =>
        [
          "office_visit_360",
          "lab_visit",
          "peer_discussion",
          "product_demo",
          "evaluation_planning",
          "evaluation_follow_up",
          "in_service_training",
        ].includes(String(e.engagement_type || "").toLowerCase()) &&
        ["completed", "done", "closed"].includes(String(e.status || "").toLowerCase()),
    );
    if (done) return "confirmed";
    return fieldReadyPartial(spec.dbKey, contact);
  }

  return fieldReadyPartial(spec.dbKey, contact);
}

function summaryForSignal(
  spec: PathwayIntelligenceSignalSpec,
  maturity: PathwayIntelligenceMaturity,
  input: PathwayGateInput,
): string | null {
  if (spec.id === "observed_case_count") {
    const count = countObservedProcedures(input);
    return `${count} / ${SALES_PATHWAY_MIN_OBSERVATIONS}`;
  }
  if (maturity === "unknown") return null;
  const raw = String(input.contact[spec.dbKey] ?? "").trim();
  if (raw) return raw.length > 72 ? `${raw.slice(0, 69)}…` : raw;
  if (maturity === "partial") return "Partially captured";
  return "Confirmed on file";
}

export function resolvePathwayIntelligenceSignal(
  spec: PathwayIntelligenceSignalSpec,
  input: PathwayGateInput,
): PathwayIntelligenceSignalState {
  const maturity = resolveSignalMaturity(spec, input);
  return {
    id: spec.id,
    label: spec.label,
    stageId: spec.stageId,
    dbKey: spec.dbKey,
    sectionId: spec.sectionId,
    maturity,
    met: maturity === "confirmed",
    summary: summaryForSignal(spec, maturity, input),
  };
}

export function buildPathwayIntelligenceForStage(
  stageId: SalesPathwayStageId,
  input: PathwayGateInput,
): PathwayIntelligenceSignalState[] {
  return pathwayIntelligenceForStage(stageId).map((spec) =>
    resolvePathwayIntelligenceSignal(spec, input),
  );
}

export function buildPathwayIntelligenceByStage(
  input: PathwayGateInput,
): Record<SalesPathwayStageId, PathwayIntelligenceSignalState[]> {
  const out = {} as Record<SalesPathwayStageId, PathwayIntelligenceSignalState[]>;
  for (const stageId of [
    "discovery",
    "observe",
    "debrief",
    "evaluation",
    "commitment",
    "outcomes",
  ] as const) {
    out[stageId] = buildPathwayIntelligenceForStage(stageId, input);
  }
  return out;
}
