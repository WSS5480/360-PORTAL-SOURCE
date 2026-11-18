/**
 * Lightweight procedure-aware notes from provider profile intelligence (new case form).
 */

import { discoveryReadinessNarrativeLine } from "@/lib/surgical-sales/discoveryIntelligenceCopy";
import {
  isDiscoverySignalStatusResolved,
  resolveDiscoveryStructuredSignalStatus,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";
import {
  formatRepIntelligenceFieldValue,
  isMachineGeneratedIntelligenceLabel,
  translateRepIntelligenceText,
} from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import { intelligenceGapStateLabel } from "@/lib/surgical-sales/providerIntelligenceGapVocabulary";
import { learningGapForField } from "@/lib/surgical-sales/providerIntelligenceLearningGaps";
import { intelligenceSectionIdForDbKey } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

const SNAKE_CASE_LABEL_RE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+){2,}\b/;

const PROCEDURE_MATCH_FIELDS = [
  "provider_procedure_focus",
  "provider_ideal_observation_cases",
  "provider_observation_best_days_case_types",
] as const;

const PRIOR_NOTE_FIELDS = [
  "provider_workflow_pain_points",
  "provider_technique_preferences",
  "provider_technique_detail",
  "provider_dissatisfaction_areas",
] as const;

function normalizeProcedureText(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
}

function tokenizeProcedureText(raw: string): string[] {
  return normalizeProcedureText(raw)
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

export function procedureTextsRelate(procedureType: string, providerProcedureText: string): boolean {
  const left = normalizeProcedureText(procedureType);
  const right = normalizeProcedureText(providerProcedureText);
  if (!left || !right) return false;
  if (left.includes(right) || right.includes(left)) return true;

  const leftTokens = new Set(tokenizeProcedureText(procedureType));
  return tokenizeProcedureText(providerProcedureText).some((token) => leftTokens.has(token));
}

export function procedureMatchesProviderContext(
  procedureType: string,
  contact: Record<string, unknown>,
): boolean {
  const procedure = procedureType.trim();
  if (!procedure) return false;

  for (const dbKey of PROCEDURE_MATCH_FIELDS) {
    const raw = String(contact[dbKey] ?? "").trim();
    if (raw && procedureTextsRelate(procedure, raw)) return true;
  }

  return false;
}

function isRepSafeNote(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (isMachineGeneratedIntelligenceLabel(trimmed)) return false;
  if (SNAKE_CASE_LABEL_RE.test(trimmed)) return false;
  if (/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/i.test(trimmed)) return false;
  return true;
}

function pushNote(notes: string[], seen: Set<string>, text: string, maxItems: number): void {
  if (notes.length >= maxItems) return;
  const trimmed = text.trim();
  if (!trimmed || !isRepSafeNote(trimmed)) return;
  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  notes.push(trimmed);
}

function formatPriorNote(raw: string): string | null {
  const translated = translateRepIntelligenceText(raw) ?? raw.trim();
  if (!translated || !isRepSafeNote(translated)) return null;

  if (/^prior note:/i.test(translated)) {
    return translated.endsWith(".") ? translated : `${translated}.`;
  }

  const body = translated.replace(/\.$/, "");
  return `Prior note: ${body.charAt(0).toLowerCase()}${body.slice(1)}.`;
}

function addPriorNotesFromFields(
  notes: string[],
  seen: Set<string>,
  contact: Record<string, unknown>,
  maxItems: number,
): void {
  for (const dbKey of PRIOR_NOTE_FIELDS) {
    const raw = contact[dbKey] as string | null | undefined;
    const formatted = formatRepIntelligenceFieldValue(dbKey, raw);
    if (!formatted) continue;

    if (dbKey === "provider_workflow_pain_points" && /visual/i.test(formatted)) {
      pushNote(notes, seen, "Prior note: visualization concerns were mentioned.", maxItems);
      continue;
    }

    const prior = formatPriorNote(formatted);
    if (prior) pushNote(notes, seen, prior, maxItems);
  }
}

function addWorkflowFitNote(
  notes: string[],
  seen: Set<string>,
  contact: Record<string, unknown>,
  maxItems: number,
): void {
  const workflowStatus = resolveDiscoveryStructuredSignalStatus("workflow_visibility", contact);
  if (!isDiscoverySignalStatusResolved("workflow_visibility", workflowStatus)) {
    const line = discoveryReadinessNarrativeLine("workflow_visibility", workflowStatus);
    if (line && /workflow/i.test(line)) {
      pushNote(notes, seen, "Workflow fit still needs validation.", maxItems);
      return;
    }
  }

  const productStatus = resolveDiscoveryStructuredSignalStatus("product_alignment", contact);
  if (!isDiscoverySignalStatusResolved("product_alignment", productStatus)) {
    pushNote(notes, seen, "Workflow fit still needs validation.", maxItems);
    return;
  }

  for (const dbKey of ["provider_evaluation_openness", "provider_competitive_products"] as const) {
    const formatted = formatRepIntelligenceFieldValue(dbKey, contact[dbKey] as string | null | undefined);
    if (formatted && /fit.*(confirmation|validation|confirm)|needs confirmation/i.test(formatted)) {
      pushNote(notes, seen, "Workflow fit still needs validation.", maxItems);
      return;
    }
  }

  const gap = learningGapForField(
    "provider_procedure_focus",
    intelligenceSectionIdForDbKey("provider_procedure_focus") ?? "clinical_workflow",
    contact,
  );
  if (gap && /workflow|fit|procedure/i.test(gap.phrase)) {
    pushNote(notes, seen, "Workflow fit still needs validation.", maxItems);
  }
}

function addProductPreferenceNote(
  notes: string[],
  seen: Set<string>,
  contact: Record<string, unknown>,
  maxItems: number,
): void {
  const productStatus = resolveDiscoveryStructuredSignalStatus("product_alignment", contact);
  const competitive = formatRepIntelligenceFieldValue(
    "provider_competitive_products",
    contact.provider_competitive_products as string | null | undefined,
  );
  const preference = formatRepIntelligenceFieldValue(
    "provider_preference_card_signals",
    contact.provider_preference_card_signals as string | null | undefined,
  );
  const evaluation = formatRepIntelligenceFieldValue(
    "provider_evaluation_openness",
    contact.provider_evaluation_openness as string | null | undefined,
  );

  if (competitive || preference || evaluation) return;

  if (!isDiscoverySignalStatusResolved("product_alignment", productStatus)) {
    pushNote(notes, seen, "No product preference confirmed.", maxItems);
    return;
  }

  const gap = learningGapForField(
    "provider_competitive_products",
    "commercial_signals",
    contact,
  );
  if (gap) {
    const phrase = translateRepIntelligenceText(gap.phrase) ?? intelligenceGapStateLabel(gap.dbKey, gap.state);
    if (phrase && /product|preference|competitive|fit/i.test(phrase)) {
      pushNote(notes, seen, "No product preference confirmed.", maxItems);
    }
  }
}

/**
 * Up to `maxItems` compact notes when the entered procedure aligns with provider context.
 */
export function buildNewCaseProceduralContextNotes(input: {
  procedureType: string;
  contact: Record<string, unknown> | null | undefined;
  maxItems?: number;
}): string[] {
  const procedure = input.procedureType.trim();
  const contact = input.contact;
  if (!procedure || !contact || typeof contact !== "object") return [];
  if (!procedureMatchesProviderContext(procedure, contact)) return [];

  const maxItems = input.maxItems ?? 3;
  const notes: string[] = [];
  const seen = new Set<string>();

  addPriorNotesFromFields(notes, seen, contact, maxItems);
  addWorkflowFitNote(notes, seen, contact, maxItems);
  addProductPreferenceNote(notes, seen, contact, maxItems);

  return notes.slice(0, maxItems);
}
