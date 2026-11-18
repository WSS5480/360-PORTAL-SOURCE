/**
 * Lightweight procedure/specialty chips for the Add Case quick-capture form.
 * Reuses Mission Board intelligence resolution (commercial JSON + observation fields).
 */

import { isGenericClinicalFactText } from "@/lib/surgical-sales/debriefClinicalFactExtraction";
import { resolveMissionBoardObservationProcedureSuggestions } from "@/lib/surgical-sales/resolveMissionBoardObservationProcedureSuggestions";

const MACHINE_PROCEDURE_TOKEN_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/i;

function isTrendOrVolumePhrase(text: string): boolean {
  return /\b(increasing|decreasing|volume|trend|adoption)\b/i.test(text);
}

function hasMachineJoinedWord(text: string): boolean {
  return /[a-z][A-Z]/.test(text.replace(/\s+/g, ""));
}

function isConcatenatedIntelligencePhrase(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (/[·•]/.test(trimmed)) return true;
  if (!/\s/.test(trimmed) && /[a-z][A-Z]/.test(trimmed)) return true;
  if (hasMachineJoinedWord(trimmed)) return true;
  return false;
}

function isCleanQuickAddProcedureSuggestion(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2) return false;
  if (MACHINE_PROCEDURE_TOKEN_RE.test(trimmed)) return false;
  if (isGenericClinicalFactText(trimmed)) return false;
  if (isTrendOrVolumePhrase(trimmed)) return false;
  if (isConcatenatedIntelligencePhrase(trimmed)) return false;
  return true;
}

export function priorCaseProcedureTypesFromRows(
  cases: Array<{ procedure_type?: unknown }> | null | undefined,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of cases ?? []) {
    const proc = String(row.procedure_type ?? "").trim();
    if (!proc) continue;
    const key = proc.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(proc);
  }
  return out;
}

export function cleanProcedureSuggestions(values: Array<string | null | undefined>, limit = 6): string[] {
  const seen = new Set<string>();
  const suggestions: string[] = [];
  for (const raw of values) {
    const cleaned = String(raw ?? "").trim();
    if (!isCleanQuickAddProcedureSuggestion(cleaned)) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push(cleaned);
    if (suggestions.length >= limit) break;
  }
  return suggestions;
}

function mergeProcedureSuggestionLists(lists: string[][], limit = 6): string[] {
  const seen = new Set<string>();
  const suggestions: string[] = [];
  for (const list of lists) {
    for (const raw of list) {
      if (suggestions.length >= limit) return suggestions;
      const cleaned = String(raw ?? "").trim();
      if (!cleaned) continue;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push(cleaned);
    }
  }
  return suggestions;
}

/**
 * Clean procedure/specialty chips for quick-add.
 * Priority: procedures typed on prior cases → provider intelligence → specialty.
 */
export function collectQuickAddProcedureSuggestions(
  contact: Record<string, unknown> | null | undefined,
  specialty?: string | null,
  priorCaseProcedureTypes?: string[] | null,
): string[] {
  const intelligenceLabels = contact
    ? resolveMissionBoardObservationProcedureSuggestions(contact).map((suggestion) => suggestion.label)
    : [];

  const priorCaseLabels = cleanProcedureSuggestions(priorCaseProcedureTypes ?? []);
  const specialtyLabel = cleanProcedureSuggestions([String(specialty ?? "").trim() || null]);

  return mergeProcedureSuggestionLists([priorCaseLabels, intelligenceLabels, specialtyLabel]);
}
