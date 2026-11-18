/**
 * Shared procedure signal extraction — used by DIP clinical supplement and UF rules.
 */

import type { ClinicalIntelligenceSignal } from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import type {
  UniversalCanonicalConcept,
  UniversalDeclaredSourceType,
} from "@/lib/surgical-sales/universalExtractor/types";
import {
  canonicalProcedureLabel,
  compoundParallelVolumeIncrease,
  hasProcedureVolumeLanguage,
  normalizeProcedureKey,
  procedureNamesOverlap,
  selectProcedurePatternsForText,
  techniqueModalityLabelsFromText,
} from "@/lib/surgical-sales/sharedIntelligence/procedurePatterns";
import {
  extractGenericProcedureFocusSignals,
  extractGenericVolumeTrendSignals,
} from "@/lib/surgical-sales/sharedIntelligence/extractGenericClinicalTrends";

export type ProcedureSignal = {
  normalizedLabel: string;
  procedureName: string;
  concept: UniversalCanonicalConcept;
  dipClinicalAttribute?: ClinicalIntelligenceSignal;
  procedureFocus?: string;
  evidence: string;
  dedupeKey: string;
};

function localContextForProcedure(evidence: string, procedureHint: string): string {
  const hint = procedureHint.trim();
  if (!hint) return evidence;
  const pattern = hint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const sentence = evidence
    .split(/(?<=[.!?])\s+/)
    .find((part) => new RegExp(pattern, "i").test(part));
  if (sentence?.trim()) return sentence.trim();
  const match = evidence.match(new RegExp(`.{0,24}${pattern}[^.!?;]{0,72}`, "i"));
  return match?.[0]?.replace(/^\S*\s*/, "").trim() || evidence;
}

function mapConceptToDipSignal(
  concept: UniversalCanonicalConcept,
  hasVolume: boolean,
  procedureFocus: string,
  evidence: string,
  procedureHint: string,
): ClinicalIntelligenceSignal {
  if (concept === "technology_preference") return "technology_preference";
  if (concept === "procedure_volume_trend" && hasVolume) {
    if (compoundParallelVolumeIncrease(evidence)) return "increasing_procedure_volume";
    const scoped = localContextForProcedure(evidence, procedureHint);
    if (/\bcases?\b/i.test(scoped) && !/\bprocedure volume\b/i.test(scoped)) {
      return "increasing_case_volume";
    }
    if (/\bprocedure volume\b/i.test(scoped) || /\brepairs?\b/i.test(scoped)) {
      return "increasing_procedure_volume";
    }
    if (/\breconstruction\b/i.test(procedureFocus)) return "increasing_case_volume";
    return "increasing_procedure_volume";
  }
  return "procedure_focus";
}

function buildDedupeKey(concept: UniversalCanonicalConcept, label: string): string {
  return `procedure:${concept}:${normalizeProcedureKey(label)}`;
}

function isConversationTopicOnlyClinicalContext(text: string): boolean {
  if (
    !/\b(?:discussed|talked about|covered|reviewed|got into|conversation about)\b[^.!?;]{0,140}\b(?:practice|case mix|types? of cases|cases? (?:he|she|they) (?:is|are|'re)?\s*seeing)\b/i.test(
      text,
    )
  ) {
    return false;
  }

  return !/\b(?:focus(?:es|ed)? on|major focus|specializ(?:es|ing)|perform(?:s|ed|ing)?|do(?:es|ing)?|(?:high|strong)[-\s]+volume|case volume|procedure volume|increas|growing\s+.{0,80}(?:cases|procedures|volume)|more\s+.{0,80}(?:cases|procedures|repairs|referrals?)|seeing\s+(?:more|increasing|high(?:er)? volume)|continuing to do|continuing to perform)\b/i.test(
    text,
  );
}

function hasExplicitClinicalProcedureContext(text: string): boolean {
  if (selectProcedurePatternsForText(text).some(({ concept }) => concept === "procedure_focus")) {
    return true;
  }
  return (
    /\b(?:primarily|mainly|mostly|focus(?:es|ed)? on|specializ(?:es|ing)|perform(?:s|ed|ing)?)\b/i.test(text) &&
    /\b(?:hernia|reconstruction|repair|procedure|cases?)\b/i.test(text)
  );
}

function isPlanningOnlyClinicalContext(text: string): boolean {
  if (hasExplicitClinicalProcedureContext(text)) return false;
  return (
    /\b(?:next step|follow[- ]?up|identify|line up|schedule|coordinate|arrange|find|better understand|confirm)\b/i.test(
      text,
    ) &&
    /\b(?:upcoming|available|observation|observe|observing|case observation|window|dates?)\b/i.test(text) &&
    !/\b(?:increas|higher volume|(?:high|strong)[-\s]+volume|doing more|seeing more|case volume|procedure volume|major focus|focus area|currently use(?:s|ing)|use(?:s|ing)? .{0,40} for)\b/i.test(
      text,
    )
  );
}

function techniqueOnlyDescribesCapturedProcedure(
  technique: string,
  text: string,
  existingSignals: ProcedureSignal[],
): boolean {
  if (technique.toLowerCase() !== "robotic") return false;
  if (/\b(?:does|do|performs?|has)\s+(?:a\s+)?(?:fair amount|some|many|lots?|high|strong)\s+(?:volume\s+)?of\s+robotic\b/i.test(text)) {
    return true;
  }
  if (!existingSignals.some((signal) => /\brobotic\b/i.test(signal.procedureName))) return false;
  return !/\b(?:robotically|robotic[- ]first|prefers?\s+robotic|robotic\s+(?:approach|technique|modality|platform)|uses?\s+(?:the\s+)?robot|does\s+most\b[^.!?;]{0,80}\brobotic)\b/i.test(
    text,
  );
}

export function extractProcedureSignalsFromText(input: {
  text: string;
  declaredSource?: UniversalDeclaredSourceType;
}): ProcedureSignal[] {
  const trimmed = input.text.trim();
  if (!trimmed || trimmed.length < 8) return [];
  if (isConversationTopicOnlyClinicalContext(trimmed)) return [];
  if (isPlanningOnlyClinicalContext(trimmed)) return [];

  const signals: ProcedureSignal[] = [];
  const seen = new Set<string>();
  const hasVolume = hasProcedureVolumeLanguage(trimmed);
  const patterns = selectProcedurePatternsForText(trimmed);

  for (const { concept, procedure, dipHint } of patterns) {
    const isVolumeTrend = concept === "procedure_volume_trend" && hasVolume;
    const canonicalProcedure = canonicalProcedureLabel(dipHint || procedure);
    const normalizedLabel = isVolumeTrend
      ? `${canonicalProcedure} · Increasing procedure volume`
      : canonicalProcedure;

    const dedupeKey = buildDedupeKey(concept, normalizedLabel);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    signals.push({
      normalizedLabel,
      procedureName: canonicalProcedure,
      concept,
      dipClinicalAttribute: mapConceptToDipSignal(concept, hasVolume, canonicalProcedure, trimmed, dipHint),
      procedureFocus: dipHint,
      evidence: localContextForProcedure(trimmed, dipHint || procedure),
      dedupeKey,
    });
  }

  // Emit every distinct modality ("robotic and laparoscopic…") — not only the first.
  if (/\b(?:repairs?|hernia|procedure|modality|technique|work|cases?)\b/i.test(trimmed)) {
    const techniques = techniqueModalityLabelsFromText(trimmed);
    // Share the full modality sentence so "robotic and laparoscopic…" stays intact
    // instead of truncating evidence to the first token ("…performs robotic").
    const modalityEvidence =
      trimmed
        .split(/(?<=[.!?])\s+/)
        .find((part) => techniqueModalityLabelsFromText(part).length > 0)
        ?.trim() || trimmed;
    for (const technique of techniques) {
      if (techniqueOnlyDescribesCapturedProcedure(technique, trimmed, signals)) continue;
      const normalizedLabel = `${technique} · Technique / Modality`;
      const dedupeKey = buildDedupeKey("technology_preference", normalizedLabel);
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      signals.push({
        normalizedLabel,
        procedureName: technique,
        concept: "technology_preference",
        dipClinicalAttribute: "technology_preference",
        procedureFocus: technique,
        evidence: modalityEvidence,
        dedupeKey,
      });
    }
  }

  for (const signal of extractGenericVolumeTrendSignals(trimmed)) {
    if (seen.has(signal.dedupeKey)) continue;
    seen.add(signal.dedupeKey);
    signals.push(signal);
  }

  for (const signal of extractGenericProcedureFocusSignals(trimmed)) {
    if (seen.has(signal.dedupeKey)) continue;
    seen.add(signal.dedupeKey);
    signals.push(signal);
  }

  return signals.filter((signal, idx, all) => {
    if (signal.concept !== "procedure_volume_trend") return true;
    return !all.some(
      (other, otherIdx) =>
        otherIdx !== idx &&
        other.concept === "procedure_volume_trend" &&
        other.procedureName.length > signal.procedureName.length &&
        procedureNamesOverlap(other.procedureName, signal.procedureName),
    );
  });
}
