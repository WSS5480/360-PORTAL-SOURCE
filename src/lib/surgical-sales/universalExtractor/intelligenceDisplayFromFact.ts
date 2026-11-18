import { scanLine } from "@/lib/surgical-sales/providerOverviewScanCopy";
import type { UniversalFactExtractionRun, UniversalSurgicalFactRow } from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import {
  reviewProposedValueFromFact,
  shouldSkipUniversalFactFieldProjection,
  shouldSkipUniversalFactWorkflowCard,
} from "@/lib/surgical-sales/universalExtractor/reviewProposedValueFromFact";
import { isUniversalFactNonDisplayMetaConcept } from "@/lib/surgical-sales/universalExtractor/universalNonDisplayConcepts";
import {
  isIncompleteSentenceFragment,
  isRawFragmentUnsuitableForCard,
} from "@/lib/surgical-sales/operationalIntelligenceDisplay";

/** Skip facts that should not surface on the provider Intelligence tab. */
export function shouldSkipUniversalFactIntelligenceDisplay(fact: UniversalSurgicalFactRow): boolean {
  if (shouldSkipUniversalFactFieldProjection(fact)) return true;
  if (shouldSkipUniversalFactWorkflowCard(fact)) return true;
  if (isUniversalFactNonDisplayMetaConcept(fact.concept)) return true;
  if (String(fact.concept) === "next_action") return true;
  return false;
}

export function intelligenceSourceLabelFromRun(run: UniversalFactExtractionRun): string {
  switch (run.declared_source_type) {
    case "intro_call":
      return "Intro Call";
    case "debrief_note":
    case "debrief_validation":
      return "Debrief";
    case "observation_case":
      return "Observation";
    case "product_support_case":
      return "Support case note";
    case "office_visit":
    case "discovery_note":
      return "Field Note";
    default:
      return "Field Note";
  }
}

const INTERNAL_UF_LABEL_PREFIX_RE =
  /^(?:commercial disposition:|relationship:|workflow priority:|observation access interest|next step recommended)/i;

const NON_ACTIONABLE_CHIP_TEXT_RE =
  /^(?:spoke|talked|met|connected|checked in|had (?:a )?(?:call|conversation))\s+with\s+dr\.?$/i;

function cleanChipText(text: string | null | undefined): string | null {
  const cleaned = String(text ?? "").trim();
  if (!cleaned) return null;
  if (NON_ACTIONABLE_CHIP_TEXT_RE.test(cleaned)) return null;
  return cleaned;
}

export function intelligenceEvidenceQuoteFromFact(fact: UniversalSurgicalFactRow): string | null {
  const evidence = fact.evidence_text?.trim();
  if (evidence && evidence.length >= 12) return evidence;
  const proposed = reviewProposedValueFromFact(fact);
  if (!proposed || proposed.length < 12) return null;
  if (INTERNAL_UF_LABEL_PREFIX_RE.test(proposed)) {
    return null;
  }
  return proposed;
}

export function intelligenceChipTextFromFact(fact: UniversalSurgicalFactRow): string | null {
  if (shouldSkipUniversalFactIntelligenceDisplay(fact)) return null;
  const evidence = fact.evidence_text?.trim() ?? "";
  const label = fact.normalized_label?.trim() ?? "";
  if (INTERNAL_UF_LABEL_PREFIX_RE.test(label)) {
    if (evidence.length >= 16 && !isIncompleteSentenceFragment(evidence)) {
      const scanned = cleanChipText(scanLine(evidence, 120));
      if (scanned && !isRawFragmentUnsuitableForCard(scanned, evidence)) return scanned;
    }
    return null;
  }
  const proposed = reviewProposedValueFromFact(fact);
  if (!proposed || proposed.length < 12) return null;
  if (isIncompleteSentenceFragment(proposed) || isRawFragmentUnsuitableForCard(proposed, evidence)) {
    return null;
  }
  return cleanChipText(scanLine(proposed, 120));
}

export type UniversalEmergingChip = {
  id: string;
  text: string;
  evidenceQuote: string | null;
  evidenceSource: string | null;
  evidenceCapturedAt: string | null;
};

export function universalEmergingChipFromFact(
  fact: UniversalSurgicalFactRow,
  run: UniversalFactExtractionRun,
): UniversalEmergingChip | null {
  const text = intelligenceChipTextFromFact(fact);
  if (!text) return null;
  return {
    id: `uf-chip-${fact.id}`,
    text,
    evidenceQuote: intelligenceEvidenceQuoteFromFact(fact),
    evidenceSource: intelligenceSourceLabelFromRun(run),
    evidenceCapturedAt: run.created_at ?? fact.created_at ?? null,
  };
}
