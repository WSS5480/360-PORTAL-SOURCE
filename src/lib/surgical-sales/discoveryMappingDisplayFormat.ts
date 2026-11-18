/**
 * Discovery Mapping — rep-facing display copy for intelligence cards.
 */

import {
  DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY,
  isPlaceholderDiscoveryMappingAnswer,
  type DiscoveryMappingScanStatusSlug,
} from "@/lib/surgical-sales/discoveryMappingEvidenceQuality";

const STATUS_PREFIX_RE =
  /^(?:Potential signal found|Partial understanding|Confirmed):\s*/i;

export function stripDiscoveryMappingStatusPrefix(text: string | null | undefined): string {
  return String(text ?? "")
    .trim()
    .replace(STATUS_PREFIX_RE, "")
    .trim();
}

export function formatDiscoveryMappingIntelligenceDisplaySummary(input: {
  scanSlug: DiscoveryMappingScanStatusSlug;
  interpretation: string | null | undefined;
  questionText?: string | null;
}): string {
  const interpretation = stripDiscoveryMappingStatusPrefix(input.interpretation);
  const isEmpty =
    !interpretation ||
    interpretation === DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY ||
    isPlaceholderDiscoveryMappingAnswer(interpretation, input.questionText);

  if (input.scanSlug === "open" || isEmpty) {
    return DISCOVERY_MAPPING_NO_EVIDENCE_SUMMARY;
  }

  switch (input.scanSlug) {
    case "potential_lead":
      return `Potential signal found: ${interpretation}`;
    case "partial":
      return `Partial understanding: ${interpretation}`;
    case "confirmed":
      return `Confirmed: ${interpretation}`;
    default:
      return interpretation;
  }
}

export function formatDiscoveryMappingSourceDisplay(
  sourceLine: string | null | undefined,
): string | null {
  const line = String(sourceLine ?? "").trim();
  if (!line) return null;
  if (/^Source:\s*/i.test(line)) return line;
  return line.replace(/^Source reviewed:\s*/i, "Source: ");
}

export const DISCOVERY_MAPPING_DISPLAY_LABELS = {
  source: "Source",
  confidence: "Confidence",
  stillNeed: "Still Need",
  suggestedNextAction: "Suggested Next Action",
  rawEvidence: "Raw evidence",
} as const;
