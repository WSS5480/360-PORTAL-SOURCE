import type { IntelligenceReferenceListGroup } from "@/lib/surgical-sales/buildProviderIntelligenceReferenceView";
import { isValidProductName } from "@/lib/surgical-sales/debriefIntelligencePipeline/debriefProductIntelligenceExtraction";
import type {
  UniversalFactExtractionRun,
  UniversalSurgicalFactRow,
} from "@/lib/surgical-sales/universalExtractor/loadUniversalSurgicalFacts";
import {
  resolveReadModelSection,
  UNIVERSAL_FACTS_SURGICAL_READ_CONCEPTS,
} from "@/lib/surgical-sales/universalExtractor/universalFactsReadModelAdapters";

const PROVIDER_CLINICAL_SOURCE_TYPES = new Set([
  "intro_call",
  "office_visit",
  "discovery_note",
  "observation_case",
  "debrief_note",
  "debrief_validation",
]);

const PRODUCT_CONCEPTS = new Set(["current_product", "competitor_product"]);

export { PROCEDURE_VOLUME_PATTERNS } from "@/lib/surgical-sales/sharedIntelligence/procedurePatterns";

import { PROCEDURE_VOLUME_PATTERNS } from "@/lib/surgical-sales/sharedIntelligence/procedurePatterns";

function isSurgicalReadConcept(concept: string): boolean {
  return (UNIVERSAL_FACTS_SURGICAL_READ_CONCEPTS as readonly string[]).includes(concept);
}

function factText(fact: UniversalSurgicalFactRow): string {
  return `${fact.normalized_label ?? ""} ${fact.evidence_text ?? ""}`.trim();
}

function hasProcedureVolumeEvidence(fact: UniversalSurgicalFactRow): boolean {
  const text = factText(fact);
  if (!text) return false;
  if (PROCEDURE_VOLUME_PATTERNS.some(({ pattern }) => pattern.test(text))) return true;
  return /increas|growing|higher volume|more .{0,60} (?:repairs|cases)|uptick/i.test(text);
}

function isEligibleProviderClinicalFact(fact: UniversalSurgicalFactRow): boolean {
  if (fact.suppressed || fact.negated || fact.uncertain || fact.assertion_level === "rejected") {
    return false;
  }
  const concept = String(fact.concept);
  return (
    isSurgicalReadConcept(concept) ||
    PRODUCT_CONCEPTS.has(concept) ||
    hasProcedureVolumeEvidence(fact)
  );
}

/** Phase 0: drop UF rows whose dictation names a different provider than the contact. */
export function factMatchesProviderScope(
  fact: UniversalSurgicalFactRow,
  contact: Record<string, unknown>,
): boolean {
  const evidence = `${fact.evidence_text ?? ""} ${fact.normalized_label ?? ""}`.trim();
  if (!evidence) return true;

  const lastName = String(contact.last_name ?? "").trim().toLowerCase();
  const firstName = String(contact.first_name ?? "").trim().toLowerCase();
  if (!lastName && !firstName) return true;

  const doctorNames = [...evidence.matchAll(/\bDr\.?\s+([A-Za-z]+)/gi)].map((match) =>
    String(match[1] ?? "").trim().toLowerCase(),
  );
  if (doctorNames.length === 0) return true;

  const allowed = new Set([lastName, firstName].filter(Boolean));
  return doctorNames.every((name) => allowed.has(name));
}

export function filterProviderScopedFactRuns(
  runs: UniversalFactExtractionRun[],
  contact: Record<string, unknown>,
): UniversalFactExtractionRun[] {
  return runs
    .map((run) => ({
      ...run,
      facts: run.facts.filter(
        (fact) => isEligibleProviderClinicalFact(fact) && factMatchesProviderScope(fact, contact),
      ),
    }))
    .filter((run) => run.facts.length > 0);
}

function clinicalRuns(runs: UniversalFactExtractionRun[]): UniversalFactExtractionRun[] {
  return runs.filter((run) => PROVIDER_CLINICAL_SOURCE_TYPES.has(run.declared_source_type));
}

function flattenProviderClinicalFacts(runs: UniversalFactExtractionRun[]): UniversalSurgicalFactRow[] {
  return clinicalRuns(runs).flatMap((run) => run.facts).filter(isEligibleProviderClinicalFact);
}

export function extractProcedureVolumeHits(facts: UniversalSurgicalFactRow[]): string[] {
  const procedures: string[] = [];

  for (const fact of facts) {
    const label = fact.normalized_label?.trim();
    if (
      (fact.concept === "procedure_volume_trend" || fact.concept === "procedure_focus") &&
      label
    ) {
      const proc = label.includes("·") ? label.split("·")[0]?.trim() || label : label;
      if (proc && !procedures.includes(proc)) procedures.push(proc);
    }
  }

  const hasVolumeLanguage = facts.some((fact) =>
    /increas|growing|higher volume|more .{0,60} (?:repairs|cases)|uptick/i.test(factText(fact)),
  );

  for (const { procedure, pattern } of PROCEDURE_VOLUME_PATTERNS) {
    if (facts.some((fact) => pattern.test(factText(fact))) && !procedures.includes(procedure)) {
      procedures.push(procedure);
    }
  }

  if (procedures.length === 0 && hasVolumeLanguage) {
    for (const fact of facts) {
      const label = fact.normalized_label?.trim();
      if (label && /repair|reconstruction|hernia|procedure/i.test(label) && label.length <= 80) {
        procedures.push(label);
      }
    }
  }

  return [...new Set(procedures)];
}

function procedureFocusItems(facts: UniversalSurgicalFactRow[]): string[] {
  const items: string[] = [];
  const seen = new Set<string>();
  const hasVolume = facts.some((fact) =>
    /increas|growing|higher volume|more .{0,60} (?:repairs|cases)|uptick/i.test(factText(fact)),
  );

  for (const fact of facts) {
    const label = fact.normalized_label?.trim();
    if (!label) continue;
    if (fact.concept === "procedure_volume_trend" || fact.concept === "procedure_focus") {
      const key = label.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        items.push(label);
      }
    }
  }

  for (const procedure of extractProcedureVolumeHits(facts)) {
    const segment = hasVolume ? `${procedure} · Increasing procedure volume` : procedure;
    const key = segment.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      items.push(segment);
    }
  }

  return items.slice(0, 6);
}

function volumeTrendItems(facts: UniversalSurgicalFactRow[]): string[] {
  const trends: string[] = [];
  const seen = new Set<string>();
  const hasVolume = facts.some((fact) =>
    /increas|growing|higher volume|more .{0,60} (?:repairs|cases)|uptick/i.test(factText(fact)),
  );
  if (!hasVolume) return trends;

  for (const fact of facts) {
    const label = fact.normalized_label?.trim();
    if (fact.concept === "procedure_volume_trend" && label && /increas/i.test(label)) {
      const proc = label.split("·")[0]?.trim() || label;
      const trend = `Increasing ${proc.charAt(0).toLowerCase()}${proc.slice(1)} volume`;
      const key = trend.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        trends.push(trend);
      }
    }
  }

  for (const procedure of extractProcedureVolumeHits(facts)) {
    const trend = `Increasing ${procedure.charAt(0).toLowerCase()}${procedure.slice(1)} volume`;
    const key = trend.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      trends.push(trend);
    }
  }

  return trends.slice(0, 4);
}

/** Phase 1: reference.clinicalSignals from UF (replaces CRM provider_procedure_focus reads). */
export function adaptUniversalFactsToClinicalReferenceSignalGroups(input: {
  providerRuns: UniversalFactExtractionRun[];
  contact: Record<string, unknown>;
}): IntelligenceReferenceListGroup[] {
  const scopedRuns = filterProviderScopedFactRuns(input.providerRuns, input.contact);
  const facts = flattenProviderClinicalFacts(scopedRuns);
  if (facts.length === 0) return [];

  const groups: IntelligenceReferenceListGroup[] = [];
  const procedureItems = procedureFocusItems(facts);
  const trendItems = volumeTrendItems(facts);

  if (procedureItems.length > 0) {
    groups.push({ id: "procedure-focus", label: "Procedure focus", items: procedureItems });
  }
  if (trendItems.length > 0) {
    groups.push({ id: "volume-trends", label: "Volume trends", items: trendItems });
  }

  return groups;
}

/** Phase 1: product confirmation gap + field brief from UF product facts. */
export function adaptUniversalFactsToProductNeedsConfirmation(input: {
  providerRuns: UniversalFactExtractionRun[];
  contact: Record<string, unknown>;
}): { productName: string; sourceText: string | null } | null {
  const scopedRuns = filterProviderScopedFactRuns(input.providerRuns, input.contact);
  const facts = flattenProviderClinicalFacts(scopedRuns)
    .filter((fact) => PRODUCT_CONCEPTS.has(String(fact.concept)))
    .sort((left, right) => right.created_at.localeCompare(left.created_at));

  for (const fact of facts) {
    const productName =
      fact.product_mentioned?.trim() ||
      fact.normalized_label?.replace(/^competitor product:\s*/i, "").trim() ||
      "";
    if (!productName || !isValidProductName(productName)) continue;
    return {
      productName,
      sourceText: fact.evidence_text?.trim() || null,
    };
  }

  return null;
}

export function resolveClinicalReferenceSignalGroups(input: {
  providerRuns?: UniversalFactExtractionRun[];
  contact: Record<string, unknown>;
  crmFallback: () => IntelligenceReferenceListGroup[];
}): IntelligenceReferenceListGroup[] {
  const adapted =
    input.providerRuns?.length
      ? adaptUniversalFactsToClinicalReferenceSignalGroups({
          providerRuns: input.providerRuns,
          contact: input.contact,
        })
      : [];
  return resolveReadModelSection(adapted, input.crmFallback);
}

export function resolveProductNeedsConfirmation(input: {
  contact: Record<string, unknown>;
  providerRuns?: UniversalFactExtractionRun[];
  crmFallback: () => { productName: string; sourceText: string | null } | null;
}): { productName: string; sourceText: string | null } | null {
  const adapted =
    input.providerRuns?.length
      ? adaptUniversalFactsToProductNeedsConfirmation({
          providerRuns: input.providerRuns,
          contact: input.contact,
        })
      : null;
  if (adapted) return adapted;
  return input.crmFallback();
}
