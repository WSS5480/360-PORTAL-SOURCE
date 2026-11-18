import type { ActivityEntityType, ActivityRelatedEntity } from "@/lib/activity/activityEvent";
import { AI_NOTE_CLASSIFICATION_LABELS } from "@/lib/surgical-sales/aiNoteCapture/labels";
import type {
  AiNoteCaptureClassification,
  AiNoteCaptureContext,
  AiNoteCaptureDestination,
  AiNoteCaptureExtractedSuggestion,
  AiNoteCaptureExtractResult,
} from "@/lib/surgical-sales/aiNoteCapture/types";
import type {
  IntelligenceCaptureContext,
  IntelligenceCaptureDestinationType,
  IntelligenceCaptureResponseBody,
  IntelligenceCaptureSuggestion,
} from "./types";

const CLASSIFICATION_TO_NOTE_TYPE: Record<AiNoteCaptureClassification, string> = {
  workflow_field_suggestion: "provider_intelligence",
  provider_intelligence: "provider_intelligence",
  case_observation: "case_observation",
  opportunity_signal: "opportunity_signal",
  organization_intelligence: "organization_intelligence",
  competitive_intelligence: "provider_intelligence",
  follow_up_task: "follow_up",
  product_usage: "product_usage",
  resource_or_document_note: "general",
  unclassified: "general",
};

function destinationToType(dest: AiNoteCaptureDestination): IntelligenceCaptureDestinationType | null {
  if (dest === "unclassified") return null;
  return dest;
}

function inferDestinationFromContext(
  ctx: IntelligenceCaptureContext,
): IntelligenceCaptureDestinationType {
  if (ctx.caseId) return "case";
  if (ctx.providerId) return "provider";
  if (ctx.opportunityId) return "opportunity";
  if (ctx.organizationId) return "organization";
  return "case";
}

function entityTypeForDestination(dest: IntelligenceCaptureDestinationType): ActivityEntityType {
  return dest === "product" ? "product_line" : dest;
}

function buildRelatedEntities(
  ctx: IntelligenceCaptureContext,
  suggestion: AiNoteCaptureExtractedSuggestion,
  destinationType: IntelligenceCaptureDestinationType,
): ActivityRelatedEntity[] {
  const out: ActivityRelatedEntity[] = [];
  const push = (entityType: ActivityEntityType, entityId: string | undefined, role: string, label?: string | null) => {
    if (!entityId) return;
    out.push({ entityType, entityId, role, label: label ?? null });
  };

  push("case", ctx.caseId, "context");
  push("provider", ctx.providerId, "context", ctx.providerLabel);
  push("opportunity", ctx.opportunityId, "context", ctx.opportunityLabel);
  push("organization", ctx.organizationId, "context", ctx.organizationLabel);

  for (const productId of ctx.productIds ?? []) {
    push("product_line", productId, "context_product");
  }

  const primaryId = suggestion.destinationRecordId ?? suggestion.suggestedRecordId;
  const primaryLabel = suggestion.destinationRecordLabel ?? suggestion.suggestedRecordLabel;
  if (primaryId) {
    push(entityTypeForDestination(destinationType), primaryId, "primary", primaryLabel);
  }

  return out;
}

function suggestionTitle(s: AiNoteCaptureExtractedSuggestion): string {
  if (s.workflowTarget?.fieldLabel) return s.workflowTarget.fieldLabel;
  return AI_NOTE_CLASSIFICATION_LABELS[s.category] ?? "Suggestion";
}

function buildSuggestedFields(s: AiNoteCaptureExtractedSuggestion): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    classification: s.category,
    reasoningShort: s.reasoningShort,
    originalText: s.originalText,
    cleanedText: s.cleanedText,
    destinationRecordId: s.destinationRecordId,
    destinationRecordLabel: s.destinationRecordLabel,
  };
  if (s.workflowTarget) {
    fields.workflowTarget = s.workflowTarget;
    fields.mergeStrategy = s.workflowTarget.mergeStrategy;
  }
  if (s.existingFieldValue != null) {
    fields.existingFieldValue = s.existingFieldValue;
  }
  return fields;
}

function mapSuggestion(
  s: AiNoteCaptureExtractedSuggestion,
  ctx: IntelligenceCaptureContext,
): IntelligenceCaptureSuggestion | null {
  let destinationType = destinationToType(s.destination);
  if (!destinationType) {
    destinationType = inferDestinationFromContext(ctx);
  }

  return {
    id: s.id,
    destinationType,
    noteType: CLASSIFICATION_TO_NOTE_TYPE[s.category] ?? "general",
    title: suggestionTitle(s),
    summary: s.cleanedText.trim() || s.originalText.trim(),
    confidence: s.confidence,
    relatedEntities: buildRelatedEntities(ctx, s, destinationType),
    suggestedFields: buildSuggestedFields(s),
    requiresReview: true,
  };
}

export function mapExtractResultToIntelligenceCaptureResponse(
  result: AiNoteCaptureExtractResult,
  ctx: IntelligenceCaptureContext,
): IntelligenceCaptureResponseBody {
  const allLegacy = [...result.suggestions, ...result.unclassified];
  const suggestions = allLegacy
    .map((s) => mapSuggestion(s, ctx))
    .filter((s): s is IntelligenceCaptureSuggestion => s !== null);

  return {
    phiDetected: result.phiDetected,
    phiWarning: result.phiWarning,
    extractedText: result.rawExtractedText,
    suggestions,
  };
}

export function toLegacyCaptureContext(ctx: IntelligenceCaptureContext): AiNoteCaptureContext {
  return {
    caseId: ctx.caseId,
    caseLabel: ctx.caseLabel,
    providerId: ctx.providerId,
    providerLabel: ctx.providerLabel,
    opportunityId: ctx.opportunityId,
    opportunityLabel: ctx.opportunityLabel,
    organizationId: ctx.organizationId,
    organizationLabel: ctx.organizationLabel,
  };
}

export function captureSourceToInputMode(
  source: "photo" | "upload" | "dictation" | "typed",
): "photo" | "upload" | "dictate" | "type" {
  switch (source) {
    case "dictation":
      return "dictate";
    case "typed":
      return "type";
    default:
      return source;
  }
}
