/**
 * Progressive disclosure — collapsed scan vs expanded operational detail.
 */

import { fieldHasIntelligenceSignal } from "@/lib/surgical-sales/providerIntelligenceIncrementalCapture";
import {
  formatFieldCaptureHistoryLine,
  type ProviderIntelligenceFieldMetadataMap,
} from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import {
  formatIntelligenceCaptureDisplay,
  parseIntelligenceCaptureValue,
} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";
import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";

export const UNCERTAINTY_SUMMARY_LINES_MAX = 4;
const SUMMARY_LINE_MAX = 120;
const RECENT_NOTE_MAX = 200;

export type UncertaintyCardRecentNotes = {
  text: string | null;
  historyLine: string | null;
};

export function buildUncertaintyCardSummaryLines(input: {
  primaryUnknown: string;
  bestSource: string;
  nextMove: string;
}): string[] {
  const lines: string[] = [];
  const primary = scanLine(input.primaryUnknown.trim(), SUMMARY_LINE_MAX);
  if (primary) lines.push(primary);

  const askLine = scanLine(`Ask ${input.bestSource.trim()} on your next touch.`, SUMMARY_LINE_MAX);
  if (askLine && lines.length < UNCERTAINTY_SUMMARY_LINES_MAX) lines.push(askLine);

  const nextLine = scanLine(`Next: ${input.nextMove.trim()}`, SUMMARY_LINE_MAX);
  if (nextLine && lines.length < UNCERTAINTY_SUMMARY_LINES_MAX) lines.push(nextLine);

  return lines.slice(0, UNCERTAINTY_SUMMARY_LINES_MAX);
}

export function buildUncertaintyCardRecentNotes(
  contact: Record<string, unknown>,
  dbKey: string,
  fieldMetadata?: ProviderIntelligenceFieldMetadataMap,
): UncertaintyCardRecentNotes {
  const raw = String(contact[dbKey] ?? "").trim();
  const parsed = parseIntelligenceCaptureValue(dbKey, raw);
  const freeformNotes = String(parsed.notes ?? "").trim();

  let text: string | null = null;
  if (freeformNotes) {
    text = scanLine(freeformNotes, RECENT_NOTE_MAX);
  } else if (raw && fieldHasIntelligenceSignal(dbKey, raw)) {
    text = scanLine(formatIntelligenceCaptureDisplay(dbKey, raw) ?? raw, RECENT_NOTE_MAX);
  }

  const historyLine = formatFieldCaptureHistoryLine(fieldMetadata?.[dbKey]);

  return { text, historyLine };
}
