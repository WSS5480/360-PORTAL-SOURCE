import { formatRepFacingDisplayText } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import { isSurgicalObservationCase } from "@/lib/surgical-sales/labels";
import { observationQuickFindingsFromCaseRow } from "@/lib/surgical-sales/observationQuickFindings";
import { buildObservationAiExtractedInsightsView } from "@/lib/surgical-sales/observationAiExtractedInsights";

export type ProviderLongitudinalProcedure = {
  procedure: string;
  count: number;
  lastCaseDate: string | null;
};

export type ProviderLongitudinalSignal = {
  signal: string;
  count: number;
  lastCaseDate: string | null;
};

export type ProviderLongitudinalProductFitTrend = {
  label: string;
  count: number;
  latestSignal: string | null;
};

export type ProviderLongitudinalIntelligence = {
  observationCaseCount: number;
  observedProcedures: ProviderLongitudinalProcedure[];
  recurringPainPoints: ProviderLongitudinalSignal[];
  competitiveProductsSeen: ProviderLongitudinalSignal[];
  opportunitySignals: ProviderLongitudinalSignal[];
  productFitTrends: ProviderLongitudinalProductFitTrend[];
};

const MAX_ITEMS = 5;

function readTrimmed(row: Record<string, unknown>, key: string): string | null {
  const value = String(row[key] ?? "").trim();
  return value || null;
}

function humanizeSignal(raw: string): string {
  return formatRepFacingDisplayText(raw) ?? raw.trim();
}

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\.$/, "");
}

function splitSignalLines(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/\n+/)
    .flatMap((chunk) => chunk.split(/\s*•\s*/))
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .map(humanizeSignal)
    .filter(Boolean);
}

function bumpSignal(
  map: Map<string, ProviderLongitudinalSignal>,
  raw: string,
  caseDate: string | null,
): void {
  const signal = humanizeSignal(raw);
  if (!signal || signal.length > 160) return;
  const key = normalizeKey(signal);
  const existing = map.get(key);
  if (existing) {
    existing.count += 1;
    if (caseDate && (!existing.lastCaseDate || caseDate > existing.lastCaseDate)) {
      existing.lastCaseDate = caseDate;
    }
    return;
  }
  map.set(key, { signal, count: 1, lastCaseDate: caseDate });
}

function bumpProcedure(
  map: Map<string, ProviderLongitudinalProcedure>,
  procedure: string,
  caseDate: string | null,
): void {
  const key = normalizeKey(procedure);
  const existing = map.get(key);
  if (existing) {
    existing.count += 1;
    if (caseDate && (!existing.lastCaseDate || caseDate > existing.lastCaseDate)) {
      existing.lastCaseDate = caseDate;
    }
    return;
  }
  map.set(key, { procedure, count: 1, lastCaseDate: caseDate });
}

function bumpFitTrend(
  map: Map<string, ProviderLongitudinalProductFitTrend>,
  label: string,
  latestSignal: string | null,
  caseDate: string | null,
): void {
  const key = normalizeKey(label);
  const existing = map.get(key);
  if (existing) {
    existing.count += 1;
    if (latestSignal) existing.latestSignal = latestSignal;
    return;
  }
  map.set(key, { label, count: 1, latestSignal });
}

function sortSignals(items: ProviderLongitudinalSignal[]): ProviderLongitudinalSignal[] {
  return [...items].sort((a, b) => b.count - a.count || (b.lastCaseDate ?? "").localeCompare(a.lastCaseDate ?? ""));
}

function sortProcedures(items: ProviderLongitudinalProcedure[]): ProviderLongitudinalProcedure[] {
  return [...items].sort((a, b) => b.count - a.count || (b.lastCaseDate ?? "").localeCompare(a.lastCaseDate ?? ""));
}

function sortFitTrends(items: ProviderLongitudinalProductFitTrend[]): ProviderLongitudinalProductFitTrend[] {
  return [...items].sort((a, b) => b.count - a.count);
}

function extractCaseDate(row: Record<string, unknown>): string | null {
  const value = String(row.case_date ?? "").trim();
  return value || null;
}

function collectCaseSignals(caseRow: Record<string, unknown>): {
  painPoints: string[];
  competitive: string[];
  opportunities: string[];
  fitTrends: Array<{ label: string; latestSignal: string | null }>;
} {
  const painPoints: string[] = [];
  const competitive: string[] = [];
  const opportunities: string[] = [];
  const fitTrends: Array<{ label: string; latestSignal: string | null }> = [];

  for (const line of splitSignalLines(readTrimmed(caseRow, "live_observation_clinical_pain_points"))) {
    painPoints.push(line);
  }
  for (const line of splitSignalLines(readTrimmed(caseRow, "debrief_key_findings"))) {
    painPoints.push(line);
  }
  for (const line of splitSignalLines(readTrimmed(caseRow, "live_observation_workflow"))) {
    painPoints.push(line);
  }

  for (const line of splitSignalLines(readTrimmed(caseRow, "live_observation_competitors"))) {
    competitive.push(line);
  }

  const snapshot = buildObservationAiExtractedInsightsView(caseRow);
  for (const section of snapshot.sections) {
    if (section.id === "competitor_observations") {
      for (const item of section.items) competitive.push(item);
    }
    if (section.id === "product_opportunities") {
      for (const item of section.items) opportunities.push(item);
    }
  }

  const quickFindings = observationQuickFindingsFromCaseRow(caseRow);
  if (quickFindings.competitor_seen === "Yes") {
    competitive.push("Competitor product observed in the OR");
  }
  if (quickFindings.product_interest === "Mentioned" || quickFindings.product_interest === "Strong") {
    opportunities.push(`Product interest ${quickFindings.product_interest.toLowerCase()}`);
  }
  if (quickFindings.key_finding_note.trim()) {
    opportunities.push(quickFindings.key_finding_note.trim());
  }

  const fitRaw = readTrimmed(caseRow, "live_observation_product_fit");
  if (fitRaw) {
    const normalized = fitRaw.toLowerCase();
    if (normalized === "possible" || normalized === "strong") {
      fitTrends.push({
        label: `${fitRaw} workflow fit`,
        latestSignal: fitRaw,
      });
    } else if (fitRaw.length > 12 && /\s/.test(fitRaw)) {
      fitTrends.push({ label: fitRaw, latestSignal: fitRaw });
    }
  }

  if (quickFindings.workflow_fit === "Possible" || quickFindings.workflow_fit === "Strong") {
    fitTrends.push({
      label: `${quickFindings.workflow_fit} workflow fit`,
      latestSignal: quickFindings.workflow_fit,
    });
  }

  return { painPoints, competitive, opportunities, fitTrends };
}

export function buildProviderLongitudinalIntelligence(
  cases: Array<Record<string, unknown>>,
  options?: { excludeCaseId?: string | null },
): ProviderLongitudinalIntelligence {
  const excludeCaseId = String(options?.excludeCaseId ?? "").trim();
  const observationCases = cases.filter((row) => {
    if (!isSurgicalObservationCase(row.case_type)) return false;
    if (excludeCaseId && String(row.id ?? "") === excludeCaseId) return false;
    return true;
  });

  const procedureMap = new Map<string, ProviderLongitudinalProcedure>();
  const painMap = new Map<string, ProviderLongitudinalSignal>();
  const competitiveMap = new Map<string, ProviderLongitudinalSignal>();
  const opportunityMap = new Map<string, ProviderLongitudinalSignal>();
  const fitMap = new Map<string, ProviderLongitudinalProductFitTrend>();

  for (const caseRow of observationCases) {
    const caseDate = extractCaseDate(caseRow);
    const procedure = readTrimmed(caseRow, "procedure_type");
    if (procedure) bumpProcedure(procedureMap, procedure, caseDate);

    const signals = collectCaseSignals(caseRow);
    for (const line of signals.painPoints) bumpSignal(painMap, line, caseDate);
    for (const line of signals.competitive) bumpSignal(competitiveMap, line, caseDate);
    for (const line of signals.opportunities) bumpSignal(opportunityMap, line, caseDate);
    for (const trend of signals.fitTrends) bumpFitTrend(fitMap, trend.label, trend.latestSignal, caseDate);
  }

  return {
    observationCaseCount: observationCases.length,
    observedProcedures: sortProcedures([...procedureMap.values()]).slice(0, MAX_ITEMS),
    recurringPainPoints: sortSignals([...painMap.values()])
      .filter((item) => item.count >= 1)
      .slice(0, MAX_ITEMS),
    competitiveProductsSeen: sortSignals([...competitiveMap.values()]).slice(0, MAX_ITEMS),
    opportunitySignals: sortSignals([...opportunityMap.values()]).slice(0, MAX_ITEMS),
    productFitTrends: sortFitTrends([...fitMap.values()]).slice(0, MAX_ITEMS),
  };
}

export function providerLongitudinalHasSignals(summary: ProviderLongitudinalIntelligence): boolean {
  return (
    summary.observationCaseCount > 0 &&
    (summary.observedProcedures.length > 0 ||
      summary.recurringPainPoints.length > 0 ||
      summary.competitiveProductsSeen.length > 0 ||
      summary.opportunitySignals.length > 0 ||
      summary.productFitTrends.length > 0)
  );
}
