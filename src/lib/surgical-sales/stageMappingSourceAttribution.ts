/**
 * Discovery Mapping — lightweight source attribution for compact summaries.
 */

import { stageMappingRegistryDbKeys } from "@/lib/surgical-sales/stageMappingQuestionRegistry";
import type { StageMappingValidationStatus } from "@/lib/surgical-sales/stageMappingAnswerTypes";
import { STAGE_MAPPING_VALIDATION_LABELS } from "@/lib/surgical-sales/stageMappingAnswerTypes";
import type { StageMappingSignalId } from "@/lib/surgical-sales/stageMappingQuestions";
import {
  inferDiscoveryMappingEvidenceConfidence,
  type DiscoveryMappingEvidenceConfidence,
} from "@/lib/surgical-sales/discoveryMappingEvidenceConfidence";
import {
  assessDiscoveryMappingEvidence,
  isDiscoveryMappingValidatedOnFile,
} from "@/lib/surgical-sales/discoveryMappingEvidenceQuality";
import {
  parseProviderIntelligenceFieldMetadata,
  type IntelligenceCaptureContext,
  type IntelligenceFieldAttribution,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";

export type DiscoveryMappingSourceCategory =
  | "manual_mapping"
  | "debrief_extraction"
  | "provider_profile"
  | "case_observation"
  | "imported_note";

export const STAGE_MAPPING_CAPTURE_CONTEXT: IntelligenceCaptureContext = {
  source_type: "profile",
  source_label: "Field capture",
};

const MANUAL_MAPPING_LABELS = new Set([
  "manual mapping",
  "discovery mapping",
  "stage mapping",
  "field capture",
  "rapid discovery",
]);

function parseRelativeAttributionWhen(updatedAt: string | undefined): string | null {
  if (!updatedAt?.trim()) return null;
  const d = new Date(updatedAt);
  if (Number.isNaN(d.getTime())) return null;

  const diffMs = Date.now() - d.getTime();
  const dayMs = 86_400_000;

  if (diffMs < dayMs) return "Today";
  if (diffMs < dayMs * 2) return "Yesterday";
  const days = Math.floor(diffMs / dayMs);
  if (days <= 14) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function isManualMappingSource(meta: IntelligenceFieldAttribution | null | undefined): boolean {
  if (!meta) return false;
  const label = meta.source_label?.trim().toLowerCase() ?? "";
  return MANUAL_MAPPING_LABELS.has(label);
}

export function isDebriefExtractionSource(meta: IntelligenceFieldAttribution | null | undefined): boolean {
  if (!meta) return false;
  if (meta.source_type === "intro_call") return true;
  if (meta.source_type === "engagement") {
    const label = meta.source_label?.trim().toLowerCase() ?? "";
    return /debrief|intro call|tactical/i.test(label);
  }
  return false;
}

export function isDebriefCaptureContext(ctx: IntelligenceCaptureContext): boolean {
  if (ctx.source_type === "intro_call") return true;
  if (ctx.source_type === "engagement") {
    const label = String(ctx.source_label ?? "").trim().toLowerCase();
    return /debrief|intro call|tactical/i.test(label);
  }
  return false;
}

export function classifyDiscoveryMappingSource(
  meta: IntelligenceFieldAttribution | null | undefined,
): DiscoveryMappingSourceCategory | null {
  if (!meta?.source_label?.trim()) return null;

  if (isManualMappingSource(meta)) return "manual_mapping";
  if (isDebriefExtractionSource(meta)) return "debrief_extraction";
  if (meta.source_type === "observation" || meta.source_type === "case") return "case_observation";
  if (meta.source_type === "ai_capture") return "imported_note";
  if (meta.source_type === "promote") return "imported_note";

  if (meta.source_type === "profile") return "provider_profile";
  if (meta.source_type === "engagement") return "debrief_extraction";

  return "provider_profile";
}

const SOURCE_CATEGORY_LABEL: Record<DiscoveryMappingSourceCategory, string> = {
  manual_mapping: "Field capture",
  debrief_extraction: "Debrief extraction",
  provider_profile: "Provider profile",
  case_observation: "Case observation",
  imported_note: "Imported note",
};

export function discoveryMappingSourceLabel(
  meta: IntelligenceFieldAttribution | null | undefined,
): string | null {
  const category = classifyDiscoveryMappingSource(meta);
  return category ? SOURCE_CATEGORY_LABEL[category] : null;
}

function attributionSecondaryLine(input: {
  meta: IntelligenceFieldAttribution | null | undefined;
  validationStatus: StageMappingValidationStatus;
}): string | null {
  const { meta, validationStatus } = input;

  if (validationStatus === "needs_validation") {
    return STAGE_MAPPING_VALIDATION_LABELS.needs_validation;
  }
  if (validationStatus === "likely") {
    return STAGE_MAPPING_VALIDATION_LABELS.likely;
  }
  if (validationStatus === "unknown") {
    return STAGE_MAPPING_VALIDATION_LABELS.unknown;
  }

  if (meta?.validated_at || meta?.lifecycle_state === "validated") {
    return parseRelativeAttributionWhen(meta.updated_at) ?? "Confirmed";
  }

  if (isDebriefExtractionSource(meta) && validationStatus !== "confirmed") {
    return STAGE_MAPPING_VALIDATION_LABELS.needs_validation;
  }

  return parseRelativeAttributionWhen(meta?.updated_at);
}

export function formatDiscoveryMappingAttributionLine(input: {
  meta: IntelligenceFieldAttribution | null | undefined;
  validationStatus: StageMappingValidationStatus;
}): string | null {
  const source = discoveryMappingSourceLabel(input.meta);
  if (!source) return null;

  const secondary = attributionSecondaryLine(input);
  if (!secondary) return source;
  return `${source} · ${secondary}`;
}

/** Source attribution for unanswered cards — never implies confirmation. */
export function formatDiscoveryMappingSourceReviewedLine(
  meta: IntelligenceFieldAttribution | null | undefined,
): string | null {
  const label = meta?.source_label?.trim() || discoveryMappingSourceLabel(meta);
  if (!label) return null;
  return `Source reviewed: ${label}`;
}

export function resolveStageMappingSignalAttribution(
  signalId: StageMappingSignalId,
  contact: Record<string, unknown>,
): IntelligenceFieldAttribution | null {
  const fieldMeta = parseProviderIntelligenceFieldMetadata(
    contact.provider_intelligence_field_metadata,
  );
  return pickLatestAttribution(fieldMeta, stageMappingRegistryDbKeys(signalId));
}

export function pickLatestAttribution(
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
  dbKeys: string[],
): IntelligenceFieldAttribution | null {
  let best: IntelligenceFieldAttribution | null = null;
  let bestTime = 0;

  for (const dbKey of dbKeys) {
    const meta = fieldMeta[dbKey];
    if (!meta?.source_label?.trim() || !meta.updated_at) continue;
    const ts = new Date(meta.updated_at).getTime();
    if (!Number.isNaN(ts) && ts >= bestTime) {
      best = meta;
      bestTime = ts;
    }
  }

  return best;
}

export function inferStageMappingValidationStatus(input: {
  meta: IntelligenceFieldAttribution | null | undefined;
  resolved?: boolean;
  explicitStatus?: StageMappingValidationStatus | null;
}): StageMappingValidationStatus {
  if (input.explicitStatus) return input.explicitStatus;
  if (input.resolved && (input.meta?.validated_at || input.meta?.lifecycle_state === "validated")) {
    return "confirmed";
  }

  const stance = input.meta?.discovery_stance;
  if (stance === "needs_validation") return "needs_validation";
  if (stance === "ask_next_touch") return "likely";
  if (stance === "unknown") return "unknown";

  if (isDebriefExtractionSource(input.meta)) {
    if (input.meta?.validated_at || input.meta?.lifecycle_state === "validated") {
      return "confirmed";
    }
    return "needs_validation";
  }

  if (input.meta?.validated_at || input.meta?.lifecycle_state === "validated") {
    return "confirmed";
  }

  if (isManualMappingSource(input.meta) && input.resolved) {
    return "needs_validation";
  }

  return "unknown";
}

export function seedStageMappingValidationStatuses(input: {
  contact: Record<string, unknown>;
  signalIds: StageMappingSignalId[];
  resolvedBySignal?: Partial<Record<StageMappingSignalId, boolean>>;
}): Record<string, StageMappingValidationStatus> {
  const out: Record<string, StageMappingValidationStatus> = {};
  for (const signalId of input.signalIds) {
    const meta = resolveStageMappingSignalAttribution(signalId, input.contact);
    out[signalId] = inferStageMappingValidationStatus({
      meta,
      resolved: input.resolvedBySignal?.[signalId],
    });
  }
  return out;
}

export function seedStageMappingEvidenceConfidence(input: {
  contact: Record<string, unknown>;
  signalIds: StageMappingSignalId[];
  resolvedBySignal?: Partial<Record<StageMappingSignalId, boolean>>;
}): Record<string, DiscoveryMappingEvidenceConfidence> {
  const out: Record<string, DiscoveryMappingEvidenceConfidence> = {};
  for (const signalId of input.signalIds) {
    const meta = resolveStageMappingSignalAttribution(signalId, input.contact);
    const dbKeys = stageMappingRegistryDbKeys(signalId);
    const fieldValues = dbKeys
      .map((key) => String(input.contact[key] ?? "").trim())
      .filter(Boolean);
    const evidenceStrength = assessDiscoveryMappingEvidence({ fieldValues });
    const validatedOnFile = isDiscoveryMappingValidatedOnFile({ dbKeys, contact: input.contact });
    const validationStatus = inferStageMappingValidationStatus({
      meta,
      resolved: input.resolvedBySignal?.[signalId],
    });
    out[signalId] = inferDiscoveryMappingEvidenceConfidence({
      validationStatus,
      validatedOnFile,
      evidenceStrength,
    });
  }
  return out;
}
