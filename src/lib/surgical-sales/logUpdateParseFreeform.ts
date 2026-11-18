import type { AiNoteCaptureContext } from "@/lib/surgical-sales/aiNoteCapture/types";
import {
  buildLogUpdateIntelligenceReview,
  type LogUpdateIntelligenceReview,
} from "@/lib/surgical-sales/logUpdateRelatedIntelligence";
import {
  routeLogUpdateToProviderFields,
  type LogUpdateRoutedFieldUpdate,
} from "@/lib/surgical-sales/logUpdateProviderRouting";

export type { LogUpdateConflictResolution, LogUpdateFieldConflict, LogUpdateRoutedFieldUpdate } from "@/lib/surgical-sales/logUpdateProviderRouting";

export type LogUpdateSuggestedUpdate = {
  id: string;
  label: string;
  accepted: boolean;
};

export type LogUpdateMappingSource = "openai" | "keyword_fallback" | "regression_stand_in";

export type LogUpdateParseResult = {
  sourceText: string;
  suggestedUpdates: LogUpdateSuggestedUpdate[];
  /** Provider intelligence field bindings (empty when not on a provider). */
  fieldUpdates: LogUpdateRoutedFieldUpdate[];
  intelligenceReview: LogUpdateIntelligenceReview;
  /** @deprecated Use intelligenceReview.stillWorthConfirming */
  stillMissing: string[];
  saveAsNoteAccepted: boolean;
  usesProviderIntelligence: boolean;
  /** Present when mapping used OpenAI structured output. */
  aiMapping?: import("@/lib/surgical-sales/logUpdateOpenAiMapping").LogUpdateOpenAiMapping | null;
  mappingSource?: LogUpdateMappingSource | null;
  /** Canonical debrief facts — single source of truth for review cards. */
  atomicFacts?: import("@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts").DebriefAtomicFact[];
  /** Inline UF capture from debrief analyze — clinical read overlay for Suggested Updates. */
  debriefUniversalFactsRuns?: import("@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts").UniversalFactExtractionRun[];
};

type DetectedSignal = { id: string; label: string };

function detectGenericSignals(text: string): DetectedSignal[] {
  const t = text.trim();
  if (!t) return [];
  const found: DetectedSignal[] = [];

  if (/\bor\s+access\b/i.test(t) || /\baccess\s+(goes|through|via|path)/i.test(t)) {
    found.push({ id: "or_access_path", label: "OR access — how you get in" });
  }
  if (
    /\b(scheduler|scheduling).{0,50}\b(approve|approv)/i.test(t) ||
    /\bobservation\s+requests?\s+(are\s+)?(approved|cleared)/i.test(t)
  ) {
    found.push({ id: "observation_approval", label: "Who approves observations" });
  }
  if (/\bvendor\s+credential/i.test(t) || /\bthrough\s+vendor\s+credential/i.test(t)) {
    found.push({ id: "vendor_credentialing", label: "Vendor credentialing on file" });
  }
  if (found.length >= 2) {
    found.push({ id: "deployment_risk_reduced", label: "Field readiness improved" });
  }
  if (found.length === 0) {
    found.push({ id: "field_learning", label: "Update noted" });
  }

  const seen = new Set<string>();
  return found.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

/** Rule-based parse for freeform log updates (no AI). */
export function parseLogUpdateFreeform(
  sourceText: string,
  context?: AiNoteCaptureContext,
  existingFields?: Record<string, string>,
): LogUpdateParseResult {
  const text = sourceText.trim();
  const usesProviderIntelligence = Boolean(context?.providerId);

  if (usesProviderIntelligence) {
    const fieldUpdates = routeLogUpdateToProviderFields(text, existingFields ?? {});
    const suggestedUpdates: LogUpdateSuggestedUpdate[] = fieldUpdates.map((u) => ({
      id: u.id,
      label: u.label,
      accepted: u.accepted,
    }));
    const intelligenceReview = buildLogUpdateIntelligenceReview(text, fieldUpdates, existingFields);
    return {
      sourceText: text,
      suggestedUpdates,
      fieldUpdates,
      intelligenceReview,
      stillMissing: intelligenceReview.stillWorthConfirming,
      saveAsNoteAccepted: true,
      usesProviderIntelligence: true,
    };
  }

  const signals = detectGenericSignals(text);
  const emptyReview = buildLogUpdateIntelligenceReview(text, [], {});
  return {
    sourceText: text,
    suggestedUpdates: signals.map((s) => ({ ...s, accepted: true })),
    fieldUpdates: [],
    intelligenceReview: emptyReview,
    stillMissing: emptyReview.stillWorthConfirming,
    saveAsNoteAccepted: true,
    usesProviderIntelligence: false,
  };
}

/** Recompute confirmed / partial / still-worth-confirming after toggling field acceptance. */
export function refreshLogUpdateIntelligenceReview(
  review: LogUpdateParseResult,
  existingFields?: Record<string, string>,
): LogUpdateParseResult {
  const intelligenceReview = buildLogUpdateIntelligenceReview(
    review.sourceText,
    review.fieldUpdates,
    existingFields,
  );
  return {
    ...review,
    intelligenceReview,
    stillMissing: intelligenceReview.stillWorthConfirming,
  };
}
