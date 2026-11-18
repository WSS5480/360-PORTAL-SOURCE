/**
 * Read-only signal rows for an intelligence section (workspace view).
 */

import {
  PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER,
  type ProviderIntelligenceSectionId,
} from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import { PROVIDER_INTELLIGENCE_FIELD_DEFS } from "@/lib/surgical-sales/providerIntelligenceFields";
import { formatIntelligenceCaptureDisplay } from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";

const LABEL_BY_KEY = new Map(PROVIDER_INTELLIGENCE_FIELD_DEFS.map((f) => [f.dbKey, f.label]));

export type IntelligenceSectionSignalRow = {
  dbKey: string;
  label: string;
  display: string;
};

export function buildIntelligenceSectionSignalRows(
  sectionId: ProviderIntelligenceSectionId,
  contact: Record<string, unknown>,
  maxItems = 8,
): IntelligenceSectionSignalRow[] {
  const keys = PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? [];
  const out: IntelligenceSectionSignalRow[] = [];

  for (const dbKey of keys) {
    if (out.length >= maxItems) break;
    const raw = contact[dbKey] as string | null | undefined;
    if (!fieldHasIntelligenceSignal(dbKey, raw)) continue;
    const display = formatIntelligenceCaptureDisplay(dbKey, raw);
    if (!display) continue;
    out.push({
      dbKey,
      label: LABEL_BY_KEY.get(dbKey) ?? dbKey,
      display,
    });
  }

  return out;
}
