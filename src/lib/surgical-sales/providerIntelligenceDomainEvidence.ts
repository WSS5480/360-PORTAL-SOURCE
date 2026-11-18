/**
 * Intelligence domain evidence — traceable field captures only.
 */

import type { IntelligenceCaptureSourceType } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  parseProviderIntelligenceFieldMetadata,
  type IntelligenceFieldAttribution,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { sanitizeDiscoveryEvidenceQuote } from "@/lib/surgical-sales/discoveryIntelligenceEvidence";

export type IntelligenceDomainTraceKind =
  | "engagement"
  | "observation"
  | "debrief"
  | "case"
  | "note";

export type IntelligenceDomainTraceSource = {
  kind: IntelligenceDomainTraceKind;
  label: string;
};

const TRACEABLE_SOURCE_TYPES = new Set<IntelligenceCaptureSourceType>([
  "intro_call",
  "observation",
  "case",
  "engagement",
  "ai_capture",
  "promote",
]);

function trimmedFieldRaw(raw: unknown): string {
  return String(raw ?? "").trim();
}

export function resolveIntelligenceDomainTraceSource(
  meta: IntelligenceFieldAttribution | undefined,
): IntelligenceDomainTraceSource | null {
  if (!meta?.source_label?.trim() || !meta.updated_at?.trim()) return null;

  const label = meta.source_label.trim();
  const hasTrace =
    Boolean(meta.evidence_text?.trim()) ||
    Boolean(meta.source_engagement_id) ||
    Boolean(meta.source_case_id) ||
    (meta.source_type && TRACEABLE_SOURCE_TYPES.has(meta.source_type));

  if (!hasTrace) return null;

  if (meta.source_type === "observation") {
    return { kind: "observation", label };
  }
  if (meta.source_type === "case") {
    return { kind: "case", label };
  }
  if (meta.source_type === "intro_call" || meta.source_type === "engagement") {
    if (/debrief/i.test(label)) return { kind: "debrief", label };
    return { kind: "engagement", label };
  }
  if (meta.source_type === "ai_capture" || meta.source_type === "promote") {
    return { kind: "note", label };
  }
  if (/debrief/i.test(label)) return { kind: "debrief", label };
  if (/observation|case support|live case/i.test(label)) {
    return { kind: "observation", label };
  }
  if (/intro call|engagement|call|meeting/i.test(label)) {
    return { kind: "engagement", label };
  }
  return { kind: "note", label };
}

export function isTraceableIntelligenceFieldEvidence(input: {
  dbKey: string;
  contact: Record<string, unknown>;
  fieldMeta: ProviderIntelligenceFieldMetadataMap;
}): boolean {
  const raw = trimmedFieldRaw(input.contact[input.dbKey]);
  if (!raw || !fieldHasIntelligenceSignal(input.dbKey, raw)) return false;
  return Boolean(resolveIntelligenceDomainTraceSource(input.fieldMeta[input.dbKey]));
}

export function traceableEvidenceQuote(
  dbKeys: string[],
  fieldMeta: ProviderIntelligenceFieldMetadataMap,
): { quote: string; source: IntelligenceDomainTraceSource } | null {
  for (const dbKey of dbKeys) {
    const meta = fieldMeta[dbKey];
    const source = resolveIntelligenceDomainTraceSource(meta);
    if (!source) continue;
    const quote = sanitizeDiscoveryEvidenceQuote(meta?.evidence_text);
    if (quote) return { quote, source };
  }
  return null;
}

export function parseIntelligenceDomainFieldMetadata(
  contact: Record<string, unknown>,
): ProviderIntelligenceFieldMetadataMap {
  return parseProviderIntelligenceFieldMetadata(contact.provider_intelligence_field_metadata);
}
