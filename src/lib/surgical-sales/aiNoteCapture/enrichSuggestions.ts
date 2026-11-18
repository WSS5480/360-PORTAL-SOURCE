import type { AiNoteCaptureContext, AiNoteCaptureExtractedSuggestion, AiNoteCaptureExtractResult } from "./types";
import { loadProviderPlanningFieldValues } from "./loadProviderPlanningFields";
import { buildWorkflowTarget, logicalFieldFromDbColumn } from "./workflowTargets";

export async function enrichExtractResultWithPlanningFields(
  result: AiNoteCaptureExtractResult,
  context: AiNoteCaptureContext,
): Promise<AiNoteCaptureExtractResult> {
  if (!context.providerId) return result;

  const existingFields = await loadProviderPlanningFieldValues(context.providerId);
  const enrich = (s: AiNoteCaptureExtractedSuggestion): AiNoteCaptureExtractedSuggestion => {
    let workflowTarget = s.workflowTarget;
    if (!workflowTarget && s.destination === "provider" && s.category === "workflow_field_suggestion") {
      return s;
    }
    if (workflowTarget) {
      const existing = existingFields[workflowTarget.field] ?? null;
      return {
        ...s,
        existingFieldValue: existing,
        needsUserReview: s.needsUserReview || Boolean(existing),
        destinationRecordId: s.destinationRecordId ?? context.providerId ?? null,
        destinationRecordLabel: s.destinationRecordLabel ?? context.providerLabel ?? null,
        suggestedRecordId: s.suggestedRecordId ?? context.providerId ?? null,
        suggestedRecordLabel: s.suggestedRecordLabel ?? context.providerLabel ?? null,
      };
    }
    return {
      ...s,
      destinationRecordId: s.destinationRecordId ?? (s.destination === "provider" ? context.providerId ?? null : s.destinationRecordId),
      destinationRecordLabel:
        s.destinationRecordLabel ?? (s.destination === "provider" ? context.providerLabel ?? null : s.destinationRecordLabel),
      suggestedRecordId: s.suggestedRecordId ?? s.destinationRecordId,
      suggestedRecordLabel: s.suggestedRecordLabel ?? s.destinationRecordLabel,
    };
  };

  return {
    ...result,
    suggestions: result.suggestions.map(enrich),
    unclassified: result.unclassified.map(enrich),
  };
}

export function normalizeWorkflowTargetFromApi(raw: {
  workflow?: string;
  section?: string;
  field?: string;
  field_label?: string;
  merge_strategy?: string;
} | null | undefined): AiNoteCaptureExtractedSuggestion["workflowTarget"] {
  if (!raw?.workflow || raw.workflow !== "provider_planning" || !raw.field) return null;
  const logical = logicalFieldFromDbColumn(raw.field) ?? (raw.field as never);
  try {
    return buildWorkflowTarget({
      field: logical,
      mergeStrategy: (raw.merge_strategy as "append") || "append",
    });
  } catch {
    return null;
  }
}
