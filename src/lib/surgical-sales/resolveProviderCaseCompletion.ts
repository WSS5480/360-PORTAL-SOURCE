import {
  formatObservationCaseExecutionStatusLabel,
  resolveObservationCaseExecutionStatus,
} from "@/lib/surgical-sales/observationCaseExecutionStatus";
import { buildObservationWorkflowIntelView } from "@/lib/surgical-sales/observationCaseExtractedWorkflowIntel";
import { isSurgicalObservationCase } from "@/lib/surgical-sales/labels";

export type ProviderCaseCompletionItem = {
  id: string;
  label: string;
  done: boolean;
};

export type ProviderCaseCompletionView = {
  items: ProviderCaseCompletionItem[];
};

function fieldPopulated(caseRow: Record<string, unknown>, key: string): boolean {
  const value = caseRow[key];
  if (value == null) return false;
  if (typeof value === "boolean") return value;
  return String(value).trim().length > 0;
}

function observationNotesComplete(caseRow: Record<string, unknown>): boolean {
  const liveKeys = [
    "live_observation_workflow",
    "live_observation_clinical_pain_points",
    "live_observation_product_fit",
    "live_observation_staff_process",
    "live_observation_surgeon_reactions",
    "debrief_key_findings",
    "notes",
  ];
  return liveKeys.some((key) => fieldPopulated(caseRow, key));
}

function observationIntelligenceProcessed(caseRow: Record<string, unknown>): boolean {
  if (buildObservationWorkflowIntelView(caseRow).hasContent) return true;
  return fieldPopulated(caseRow, "debrief_key_findings");
}

function resolveObservationCompletion(caseRow: Record<string, unknown>): ProviderCaseCompletionView {
  return {
    items: [
      { id: "notes", label: "Notes complete", done: observationNotesComplete(caseRow) },
      { id: "intelligence", label: "Intelligence processed", done: observationIntelligenceProcessed(caseRow) },
    ],
  };
}

function resolveProductSupportCompletion(caseRow: Record<string, unknown>): ProviderCaseCompletionView {
  const hasNotes =
    fieldPopulated(caseRow, "notes") ||
    fieldPopulated(caseRow, "debrief_key_findings") ||
    fieldPopulated(caseRow, "live_observation_workflow");
  const hasOutcome = fieldPopulated(caseRow, "case_support_outcome");

  return {
    items: [
      { id: "notes", label: "Notes complete", done: hasNotes },
      { id: "outcome", label: "Outcome recorded", done: hasOutcome },
    ],
  };
}

export function resolveProviderCaseCompletion(caseRow: Record<string, unknown>): ProviderCaseCompletionView {
  if (isSurgicalObservationCase(caseRow.case_type)) {
    return resolveObservationCompletion(caseRow);
  }
  return resolveProductSupportCompletion(caseRow);
}

export function resolveProviderCaseStatusPresentation(caseRow: Record<string, unknown>): {
  id: string;
  label: string;
} {
  if (isSurgicalObservationCase(caseRow.case_type)) {
    const id = resolveObservationCaseExecutionStatus({ caseRow });
    return { id, label: formatObservationCaseExecutionStatusLabel(id) };
  }

  const status = String(caseRow.status ?? "").trim().toLowerCase() || "scheduled";
  const label =
    status === "in_progress"
      ? "In Progress"
      : status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
  return { id: status, label };
}
