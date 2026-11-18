/**
 * Discovery intelligence — human-readable evidence vs capture tokens / workflow enums.
 */

import type { ObservationAccessBlocker } from "@/lib/surgical-sales/observationAccessWorkflowState";
import {
  parseProviderIntelligenceFieldMetadata,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { formatIntelligenceCaptureSummaryChip } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import {
  isIntelligenceCaptureTokenValue,
  sanitizeDiscoveryEvidenceQuote,
} from "@/lib/surgical-sales/discoveryIntelligenceEvidenceFormat";
export {
  isHumanReadableDiscoveryEvidence,
  isIntelligenceCaptureTokenValue,
  sanitizeDiscoveryEvidenceQuote,
} from "@/lib/surgical-sales/discoveryIntelligenceEvidenceFormat";

export type DiscoveryFieldEvidence = {
  quote: string;
  sourceLabel: string;
  accessBlocker?: ObservationAccessBlocker | null;
  accessBlockerLabel?: string | null;
  conditionLine?: string | null;
};

export function accessBlockerDisplayLabel(
  blocker: ObservationAccessBlocker | string | null | undefined,
): string | null {
  if (!blocker) return null;
  switch (blocker) {
    case "credentialing_required":
      return "Credentialing required";
    case "scheduling_required":
      return "Scheduling workflow required";
    case "provider_approval_required":
      return "Provider approval required";
    case "facility_approval_required":
      return "Facility approval required";
    case "unknown":
      return "Access requirement unresolved";
    default:
      return null;
  }
}

export function formatDiscoveryEvidenceSourceLabel(input: {
  sourceLabel?: string | null;
  sourceType?: string | null;
}): string {
  const sourceLabel = String(input.sourceLabel ?? "").trim();
  const sourceType = String(input.sourceType ?? "").trim();
  if (!sourceLabel || /^provider profile$/i.test(sourceLabel)) {
    return "Field capture";
  }
  if (sourceType === "engagement" && !/debrief/i.test(sourceLabel)) {
    return `${sourceLabel} debrief`;
  }
  return sourceLabel;
}

function metadataForKeys(
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
  dbKeys: string[],
) {
  for (const dbKey of dbKeys) {
    const meta = fieldMeta[dbKey];
    if (meta) return { dbKey, meta };
  }
  return null;
}

export function resolveDiscoveryFieldEvidence(input: {
  dbKeys: string[];
  contact: Record<string, unknown>;
  fieldMeta?: ProviderIntelligenceFieldMetadataMap;
}): DiscoveryFieldEvidence | null {
  const fieldMeta =
    input.fieldMeta ??
    parseProviderIntelligenceFieldMetadata(input.contact.provider_intelligence_field_metadata);

  const hit = metadataForKeys(fieldMeta, input.dbKeys);
  if (!hit) return null;

  const { dbKey, meta } = hit;
  const quote = sanitizeDiscoveryEvidenceQuote(meta.evidence_text);
  if (!quote) return null;

  const blockerRaw = String(meta.access_blocker ?? "").trim() as ObservationAccessBlocker;
  const accessBlocker = blockerRaw || null;
  const accessBlockerLabel = accessBlockerDisplayLabel(accessBlocker);

  return {
    quote,
    sourceLabel: formatDiscoveryEvidenceSourceLabel({
      sourceLabel: meta.source_label,
      sourceType: meta.source_type,
    }),
    accessBlocker,
    accessBlockerLabel,
    conditionLine: accessBlockerLabel
      ? `${accessBlockerLabel} before observation scheduling.`
      : null,
  };
}

/** Fallback when field value is a token but metadata has no quote — use chip label, not raw token. */
export function resolveDiscoveryCaptureLabelFallback(
  dbKey: string,
  contact: Record<string, unknown>,
): string | null {
  const raw = String(contact[dbKey] ?? "").trim();
  if (!raw || !isIntelligenceCaptureTokenValue(raw)) return null;
  const chip = formatIntelligenceCaptureSummaryChip(dbKey, raw);
  if (chip && !isIntelligenceCaptureTokenValue(chip)) return chip;
  return null;
}
