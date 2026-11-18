import type { CaseIdentity } from "@/lib/surgical-sales/buildCaseIdentity";
import {
  buildObservationMissionBriefing,
  type ObservationMissionBriefingPillar,
  type ObservationMissionBriefingView,
} from "@/lib/surgical-sales/buildObservationMissionBriefing";
import { formatRepIntelligenceFieldValue } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import {
  buildObservationMissionIntelligenceCards,
  type ObservationMissionIntelligenceCard,
} from "@/lib/surgical-sales/buildObservationMissionIntelligenceCards";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerPlanningCompletion";

export type ObservationMissionBriefLayout = ObservationMissionBriefingView & {
  missionObjective: string;
  focusAreas: string[];
  providerIntelligenceSummary: string[];
  learningQuestions: string[];
  opportunityHypotheses: string[];
  nextSteps: string[];
  watchTargetCards: ObservationMissionIntelligenceCard[];
  learningGapCards: ObservationMissionIntelligenceCard[];
  opportunityCards: ObservationMissionIntelligenceCard[];
  productFocus: string | null;
  procedureLabel: string | null;
  providerName: string | null;
  pillarsById: Record<ObservationMissionBriefingPillar["id"], ObservationMissionBriefingPillar>;
};

function takeUnique(values: string[], max: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= max) break;
  }
  return result;
}

function providerFieldText(
  contact: Record<string, unknown> | null | undefined,
  dbKey: string,
): string | null {
  if (!contact) return null;
  return formatRepIntelligenceFieldValue(dbKey, contact[dbKey] as string | null | undefined);
}

/** Short labels for focus-area chips in the mission header. */
export function normalizeObservationFocusAreaLabel(raw: string): string {
  let label = raw
    .trim()
    .replace(/^Workflow bottleneck:\s*/i, "")
    .replace(/^Clinical frustration:\s*/i, "")
    .replace(/^Staff frustration:\s*/i, "")
    .replace(/^Workaround:\s*/i, "")
    .replace(/^Competitor products present:\s*/i, "Competitor products")
    .replace(/^Current products used:\s*/i, "Product utilization")
    .replace(/^Product fit signal:\s*/i, "")
    .replace(/^Outcome priority:\s*/i, "")
    .replace(/^Product interest:\s*/i, "")
    .replace(/^Watch:\s*/i, "")
    .replace(/\s+fit signals$/i, "")
    .trim();

  if (/^competitor products:?/i.test(label)) return "Competitor products";
  if (/workflow bottleneck/i.test(label)) return "Workflow bottlenecks";
  if (/workflow friction/i.test(label)) return "Workflow friction";
  if (/clinical frustration/i.test(label)) return "Clinical frustrations";
  if (/staff frustration/i.test(label)) return "Staff frustrations";
  if (/product utilization/i.test(label)) return "Product utilization";
  if (/workflow consistency/i.test(label)) return "Workflow consistency";
  if (/fixation/i.test(label)) return "Fixation challenges";
  if (/visualization/i.test(label)) return "Visualization challenges";
  if (/workaround/i.test(label)) return "Staff workarounds";
  if (/product fit signal/i.test(label)) return "Product fit signals";
  if (/outcome priorit/i.test(label)) return "Outcome priorities";

  if (label.length > 52) label = `${label.slice(0, 49).trim()}…`;
  if (!label) return raw.trim();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function buildObservationFocusAreas(watchSignals: string[], max = 8): string[] {
  return takeUnique(watchSignals.map(normalizeObservationFocusAreaLabel), max);
}

export function buildProviderIntelligenceSummary(input: {
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
  productFocus?: string | null;
  procedureLabel?: string | null;
}): string[] {
  const lines: string[] = [];

  const procedure =
    providerFieldText(input.providerContact, "provider_procedure_focus") ||
    input.procedureLabel?.trim() ||
    null;
  if (procedure) lines.push(`Procedure focus: ${procedure}`);

  if (input.productFocus?.trim()) {
    lines.push(`Product focus: ${input.productFocus.trim()}`);
  }

  const competitive =
    providerFieldText(input.providerContact, "provider_competitive_products") ||
    input.providerIntelligence?.competitive_products ||
    null;
  if (competitive) lines.push(`Competitive landscape: ${competitive}`);

  const pain = providerFieldText(input.providerContact, "provider_workflow_pain_points");
  if (pain) lines.push(`Workflow pain: ${pain}`);

  const frustrations = providerFieldText(input.providerContact, "provider_clinical_frustrations");
  if (frustrations) lines.push(`Clinical frustrations: ${frustrations}`);

  const gaps = providerFieldText(input.providerContact, "provider_product_gaps");
  if (gaps) lines.push(`Product gaps: ${gaps}`);

  const technique = input.providerIntelligence?.technique_preferences?.trim();
  if (technique) lines.push(`Technique preferences: ${technique}`);

  return takeUnique(lines, 5);
}

function resolveProductFocus(input: {
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
}): string | null {
  for (const candidate of [
    input.engagement?.product_focus,
    input.caseRow.product_focus,
    input.caseRow.product_line,
  ]) {
    const text = String(candidate ?? "").trim();
    if (text) return text;
  }
  return null;
}

export function buildObservationMissionBriefLayout(input: {
  caseRow: Record<string, unknown>;
  identity: CaseIdentity;
  engagement?: Record<string, unknown> | null;
  activities?: Array<{ activity_type?: string }>;
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
  planning?: ProviderPlanningCompletion | null;
  procedureLabel?: string | null;
}): ObservationMissionBriefLayout {
  const briefing = buildObservationMissionBriefing(input);
  const procedureLabel = input.procedureLabel ?? input.identity.procedureType ?? null;
  const productFocus = resolveProductFocus(input);

  const watchPillar = briefing.pillars.find((pillar) => pillar.id === "watch_signals");
  const learningPillar = briefing.pillars.find((pillar) => pillar.id === "still_to_learn");
  const opportunityPillar = briefing.pillars.find((pillar) => pillar.id === "opportunities");

  const pillarsById = Object.fromEntries(
    briefing.pillars.map((pillar) => [pillar.id, pillar]),
  ) as ObservationMissionBriefLayout["pillarsById"];

  const watchSignals = watchPillar?.items ?? [];
  const learningQuestions = learningPillar?.items ?? [];
  const opportunityHypotheses = opportunityPillar?.items ?? [];
  const intelligenceCards = buildObservationMissionIntelligenceCards({
    caseRow: input.caseRow,
    watchSignals,
    learningQuestions,
    opportunityHypotheses,
    providerContact: input.providerContact,
    providerIntelligence: input.providerIntelligence,
  });

  return {
    ...briefing,
    missionObjective: briefing.missionLead ?? "",
    focusAreas: buildObservationFocusAreas(watchSignals),
    providerIntelligenceSummary: buildProviderIntelligenceSummary({
      providerContact: input.providerContact,
      providerIntelligence: input.providerIntelligence,
      productFocus,
      procedureLabel,
    }),
    learningQuestions,
    opportunityHypotheses,
    nextSteps: [],
    watchTargetCards: intelligenceCards.watchTargets,
    learningGapCards: intelligenceCards.learningGaps,
    opportunityCards: intelligenceCards.opportunities,
    productFocus,
    procedureLabel,
    providerName: input.identity.providerName ?? null,
    pillarsById,
  };
}
