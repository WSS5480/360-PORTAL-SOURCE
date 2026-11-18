import { stripStoredIntelligenceEncoding } from "@/lib/surgical-sales/debriefReviewDisplayLanguage";
import {
  CLINICAL_SIGNAL_LABEL,
  clinicalSignalFromLabel,
  type ClinicalIntelligenceSignal,
  isCleanProcedureFocusPhrase,
  isGenericClinicalFactText,
  isProductUsageClinicalClause,
  normalizeClinicalIntelligenceFromFact,
  parseClinicalStorageValue,
} from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import {
  readProviderCommercialIntelligence,
  type ClinicalIntelligenceEntry,
} from "@/lib/surgical-sales/providerCommercialIntelligenceModel";

const PROCEDURE_INTEL_KEYS = [
  "provider_procedure_focus",
  "provider_ideal_observation_cases",
  "provider_observation_best_days_case_types",
] as const;

const OBSERVATION_PROCEDURE_SIGNALS = new Set<ClinicalIntelligenceSignal>([
  "procedure_focus",
  "technology_preference",
]);

function isObservationProcedureSignal(signal: ClinicalIntelligenceSignal): boolean {
  return OBSERVATION_PROCEDURE_SIGNALS.has(signal);
}

const COMMERCIAL_INTERPRETATION_RE =
  /^(?:increasing\s+(?:procedure|case)\s+volume|growing\s+robotic\s+program|commercial\s+opportunity|evaluation\s+pathway|procedure volume supports prioritization)$/i;

export type MissionBoardObservationProcedureSuggestion = {
  label: string;
  /** Optional chip tooltip when intelligence provenance is known. */
  sourceHint?: string;
};

function isCommercialInterpretationLabel(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (clinicalSignalFromLabel(trimmed)) return true;
  if (COMMERCIAL_INTERPRETATION_RE.test(trimmed)) return true;
  return Object.values(CLINICAL_SIGNAL_LABEL).some(
    (label) => label.toLowerCase() === trimmed.toLowerCase(),
  );
}

function extractProcedureEntityFromSegment(segment: string): string | null {
  const trimmed = segment.trim();
  if (!trimmed || isGenericClinicalFactText(trimmed)) return null;

  const parsed = parseClinicalStorageValue(trimmed);
  if (parsed) {
    const focus = parsed.procedureFocus.trim();
    if (!focus || isCommercialInterpretationLabel(focus)) return null;
    return focus;
  }

  const normalized = normalizeClinicalIntelligenceFromFact({ value: trimmed, evidence: trimmed });
  if (normalized && isObservationProcedureSignal(normalized.signal)) {
    const focus = normalized.procedureFocus.trim();
    if (!focus || isCommercialInterpretationLabel(focus)) return null;
    return focus;
  }

  if (isCommercialInterpretationLabel(trimmed)) return null;
  if (isCleanProcedureFocusPhrase(trimmed)) return trimmed;

  if (
    trimmed.split(/\s+/).length >= 2 &&
    trimmed.length >= 3 &&
    trimmed.length <= 48 &&
    !/[.!?;:,]/.test(trimmed) &&
    !isProductUsageClinicalClause(trimmed)
  ) {
    return trimmed;
  }

  return null;
}

function splitIntelligenceSegments(raw: string): string[] {
  return raw
    .split(/\||\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function pushUniqueProcedure(
  seen: Set<string>,
  results: MissionBoardObservationProcedureSuggestion[],
  label: string | null | undefined,
  sourceHint?: string,
): void {
  if (!label?.trim()) return;
  const trimmed = label.trim();
  if (isCommercialInterpretationLabel(trimmed)) return;
  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  results.push({ label: trimmed, ...(sourceHint ? { sourceHint } : {}) });
}

function extractFromStoredField(raw: unknown): string[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];

  const procedures: string[] = [];
  for (const segment of splitIntelligenceSegments(text)) {
    const cleaned = stripStoredIntelligenceEncoding(segment).trim() || segment.trim();
    const entity = extractProcedureEntityFromSegment(cleaned);
    if (entity) procedures.push(entity);
  }
  return procedures;
}

function extractFromClinicalEntry(entry: ClinicalIntelligenceEntry): string | null {
  if (entry.category !== "procedure_focus") return null;

  const fromContext = entry.procedure_context?.trim();
  if (fromContext && !isCommercialInterpretationLabel(fromContext)) {
    const parsed = extractProcedureEntityFromSegment(fromContext);
    if (parsed) return parsed;
  }

  return (
    extractProcedureEntityFromSegment(entry.source_text) ??
    extractProcedureEntityFromSegment(entry.display_label)
  );
}

/** Procedure chips for Mission Board observation scheduling — clinical entities only. */
export function resolveMissionBoardObservationProcedureSuggestions(
  contact: Record<string, unknown>,
  max = 6,
): MissionBoardObservationProcedureSuggestion[] {
  const seen = new Set<string>();
  const results: MissionBoardObservationProcedureSuggestion[] = [];

  for (const dbKey of PROCEDURE_INTEL_KEYS) {
    for (const label of extractFromStoredField(contact[dbKey])) {
      pushUniqueProcedure(seen, results, label);
    }
  }

  const commercial = readProviderCommercialIntelligence(contact);
  if (commercial) {
    for (const proc of commercial.clinical.procedure_focus) {
      pushUniqueProcedure(seen, results, extractProcedureEntityFromSegment(proc));
    }
    for (const entry of commercial.clinical.entries) {
      const entity = extractFromClinicalEntry(entry);
      if (entity) {
        pushUniqueProcedure(seen, results, entity, "Suggested from captured provider intelligence");
      }
    }
  }

  return results.slice(0, max);
}
