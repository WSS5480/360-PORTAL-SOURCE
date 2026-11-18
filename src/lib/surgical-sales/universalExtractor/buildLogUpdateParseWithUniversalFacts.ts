/**
 * Shared log-update review parse — DIP workflow shell + UF authority projection.
 * Used by quick capture, log-update/map, and other field-note review entry points.
 */

import type { DebriefAtomicFact } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefAtomicFacts";
import type { LogUpdateParseResult } from "@/lib/surgical-sales/logUpdateParseFreeform";
import {
  buildReviewProjectionFromUniversalFacts,
  stripDipLogUpdateToWorkflowOnly,
} from "@/lib/surgical-sales/universalExtractor/buildReviewProjectionFromUniversalFacts";
import type { UniversalFactExtractionRun } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import {
  captureUniversalSurgicalIntelligence,
  mapQuickCaptureToUniversalDeclaredSource,
} from "@/lib/surgical-sales/universalExtractor";
import {
  isDipReviewShadowEnabled,
  isUniversalFactsReviewAuthorityEnabled,
} from "@/lib/surgical-sales/universalExtractor/universalExtractorReviewFlag";
import { universalCaptureToExtractionRun } from "@/lib/surgical-sales/universalExtractor/universalCaptureToExtractionRun";

export type BuildLogUpdateParseWithUniversalFactsResult = {
  parse: LogUpdateParseResult;
  debriefRuns: UniversalFactExtractionRun[];
  universalFactCaptureId: string | null;
};

export function resolveUniversalDeclaredSourceForLogUpdate(input: {
  engagementType?: string | null;
  engagementTypeLabel?: string | null;
}): ReturnType<typeof mapQuickCaptureToUniversalDeclaredSource> {
  return mapQuickCaptureToUniversalDeclaredSource({
    engagementType: input.engagementType,
    engagementTypeLabel: input.engagementTypeLabel ?? null,
  });
}

export function legacyExtractionFromDipFacts(
  facts: DebriefAtomicFact[] | undefined,
): unknown | undefined {
  if (!facts?.length || !isDipReviewShadowEnabled()) return undefined;
  return { facts };
}

export async function captureUniversalFactsForLogUpdateReview(input: {
  rawNote: string;
  userId: string;
  providerId: string;
  organizationId?: string | null;
  engagementId?: string | null;
  productFocus?: string | null;
  providerLabel?: string | null;
  universalDeclaredSource: ReturnType<typeof mapQuickCaptureToUniversalDeclaredSource>;
  legacyExtraction?: unknown;
}): Promise<UniversalFactExtractionRun[]> {
  const capture = await captureUniversalSurgicalIntelligence({
    raw_note: input.rawNote,
    declared_source_type: input.universalDeclaredSource,
    context: {
      provider_id: input.providerId,
      organization_id: String(input.organizationId ?? "").trim() || undefined,
      encounter_id: String(input.engagementId ?? "").trim() || undefined,
      product_context: String(input.productFocus ?? "").trim() || undefined,
      provider_display_name: String(input.providerLabel ?? "").trim() || undefined,
    },
    created_by_user_id: input.userId,
    legacy_extraction: input.legacyExtraction,
  });
  if (!capture) return [];

  return [
    universalCaptureToExtractionRun({
      capture,
      context: {
        provider_id: input.providerId,
        organization_id: String(input.organizationId ?? "").trim() || undefined,
        encounter_id: String(input.engagementId ?? "").trim() || undefined,
        product_context: String(input.productFocus ?? "").trim() || undefined,
        provider_display_name: String(input.providerLabel ?? "").trim() || undefined,
      },
    }),
  ];
}

export function buildLogUpdateReviewParseWithUniversalFacts(input: {
  rawNote: string;
  dipLogUpdate: LogUpdateParseResult;
  debriefRuns: UniversalFactExtractionRun[];
  existingFields: Record<string, string>;
}): LogUpdateParseResult {
  if (isUniversalFactsReviewAuthorityEnabled() && input.debriefRuns.length > 0) {
    return buildReviewProjectionFromUniversalFacts({
      dictation: input.rawNote,
      debriefRuns: input.debriefRuns,
      workflowLogUpdate: stripDipLogUpdateToWorkflowOnly(input.dipLogUpdate),
      existingFields: input.existingFields,
    }).logUpdate;
  }

  if (input.debriefRuns.length === 0) return input.dipLogUpdate;
  return { ...input.dipLogUpdate, debriefUniversalFactsRuns: input.debriefRuns };
}

export async function buildLogUpdateParseWithUniversalFacts(input: {
  rawNote: string;
  userId: string;
  providerId: string;
  dipLogUpdate: LogUpdateParseResult;
  existingFields: Record<string, string>;
  organizationId?: string | null;
  engagementId?: string | null;
  productFocus?: string | null;
  engagementType?: string | null;
  engagementTypeLabel?: string | null;
  providerLabel?: string | null;
  legacyExtraction?: unknown;
}): Promise<BuildLogUpdateParseWithUniversalFactsResult> {
  const universalDeclaredSource = resolveUniversalDeclaredSourceForLogUpdate({
    engagementType: input.engagementType,
    engagementTypeLabel: input.engagementTypeLabel,
  });

  let debriefRuns: UniversalFactExtractionRun[] = [];
  try {
    debriefRuns = await captureUniversalFactsForLogUpdateReview({
      rawNote: input.rawNote,
      userId: input.userId,
      providerId: input.providerId,
      organizationId: input.organizationId,
      engagementId: input.engagementId,
      productFocus: input.productFocus,
      providerLabel: input.providerLabel,
      universalDeclaredSource,
      legacyExtraction: input.legacyExtraction,
    });
  } catch (err) {
    console.error("[buildLogUpdateParseWithUniversalFacts] universal fact capture failed:", err);
  }

  const parse = buildLogUpdateReviewParseWithUniversalFacts({
    rawNote: input.rawNote,
    dipLogUpdate: input.dipLogUpdate,
    debriefRuns,
    existingFields: input.existingFields,
  });

  return {
    parse,
    debriefRuns,
    universalFactCaptureId: debriefRuns[0]?.capture_id ?? null,
  };
}
