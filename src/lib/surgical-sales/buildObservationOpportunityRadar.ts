import { buildObservationIntelligenceView } from "@/lib/surgical-sales/buildObservationIntelligenceView";
import { formatRepIntelligenceFieldValue } from "@/lib/surgical-sales/formatProviderIntelligencePreviewForRep";
import { OBSERVATION_BRIEFING_GENERIC_OPPORTUNITY_HYPOTHESES } from "@/lib/surgical-sales/observationBriefingDefaults";
import {
  observationQuickFindingsFromCaseRow,
  type ObservationQuickFindingsDraft,
} from "@/lib/surgical-sales/observationQuickFindings";
import type { ProviderIntelligenceSnapshot } from "@/lib/surgical-sales/providerIntelligenceSnapshot";
import {
  DISCOVERY_FIELD_STATUS,
  resolveDiscoveryStructuredSignalStatus,
} from "@/lib/surgical-sales/discoveryIntelligenceSignalStatus";

export type ObservationOpportunityRadarConfidence = "low" | "medium" | "high";

export type ObservationOpportunityRadarTrend = "unchanged" | "up" | "down";

export type ObservationOpportunityRadarBlip = {
  id: string;
  title: string;
  confidence: ObservationOpportunityRadarConfidence;
  confidenceLabel: "Low" | "Medium" | "High";
  baselineConfidence: ObservationOpportunityRadarConfidence;
  trend: ObservationOpportunityRadarTrend;
  detail: string | null;
  sourceLabel: string;
  validated: boolean;
};

export type ObservationOpportunityRadarView = {
  blips: ObservationOpportunityRadarBlip[];
  hasObservationCapture: boolean;
  headline: string;
  lead: string;
};

const ACSIS_PATTERN = /\bacs?is\b/i;
const ENDOLUMIK_PATTERN = /\bendolumik\b/i;

const CONFIDENCE_LABEL: Record<
  ObservationOpportunityRadarConfidence,
  ObservationOpportunityRadarBlip["confidenceLabel"]
> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

type RadarSlotId = "acsis" | "endolumik" | "workflow_improvement" | "training" | "conversion";

type RadarContext = {
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
  discoveryText: string;
  observationText: string;
  quickFindings: ObservationQuickFindingsDraft;
  intelligenceById: Record<string, string[]>;
  hasObservationCapture: boolean;
};

function confidenceScore(level: ObservationOpportunityRadarConfidence): number {
  if (level === "high") return 2;
  if (level === "medium") return 1;
  return 0;
}

function scoreToConfidence(score: number): ObservationOpportunityRadarConfidence {
  if (score >= 2) return "high";
  if (score >= 1) return "medium";
  return "low";
}

function providerFieldText(
  contact: Record<string, unknown> | null | undefined,
  dbKey: string,
): string | null {
  if (!contact) return null;
  return formatRepIntelligenceFieldValue(dbKey, contact[dbKey] as string | null | undefined);
}

function resolveProductFocus(input: {
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
}): string | null {
  for (const candidate of [
    input.engagement?.product_focus,
    input.caseRow.product_focus,
    input.caseRow.product_line,
    input.caseRow.product_name,
  ]) {
    const text = String(candidate ?? "").trim();
    if (text) return text;
  }
  return null;
}

function collectDiscoveryText(input: {
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
  productFocus: string | null;
}): string {
  const chunks: string[] = [];
  if (input.productFocus) chunks.push(input.productFocus);

  for (const dbKey of [
    "provider_product_gaps",
    "provider_future_opportunity_signals",
    "provider_workflow_pain_points",
    "provider_product_interests",
    "provider_clinical_frustrations",
    "provider_competitive_products",
    "provider_dissatisfaction_areas",
    "provider_preference_card_signals",
  ] as const) {
    const text = providerFieldText(input.providerContact, dbKey);
    if (text) chunks.push(text);
  }

  if (input.providerIntelligence?.competitive_products) {
    chunks.push(input.providerIntelligence.competitive_products);
  }
  if (input.providerIntelligence?.product_preferences) {
    chunks.push(input.providerIntelligence.product_preferences);
  }
  if (input.providerIntelligence?.technique_preferences) {
    chunks.push(input.providerIntelligence.technique_preferences);
  }

  chunks.push(
    String(input.engagement?.pre_observation_value_hypothesis ?? input.caseRow.pre_observation_value_hypothesis ?? ""),
  );
  chunks.push(...OBSERVATION_BRIEFING_GENERIC_OPPORTUNITY_HYPOTHESES);

  return chunks.join("\n");
}

function collectObservationText(caseRow: Record<string, unknown>): string {
  const keys = [
    "live_observation_product_fit",
    "live_observation_clinical_pain_points",
    "live_observation_workflow",
    "live_observation_competitors",
    "live_observation_staff_process",
    "live_observation_surgeon_reactions",
    "live_observation_questions",
    "debrief_key_findings",
    "observation_workflow_intelligence_snapshot",
  ] as const;

  return keys.map((key) => String(caseRow[key] ?? "")).join("\n");
}

function hasObservationCapture(caseRow: Record<string, unknown>): boolean {
  const findings = observationQuickFindingsFromCaseRow(caseRow);
  if (findings.product_interest && findings.product_interest !== "None") return true;
  if (findings.workflow_fit && findings.workflow_fit !== "Unknown" && findings.workflow_fit !== "Weak") {
    return true;
  }
  if (findings.competitor_seen === "Yes") return true;
  if (findings.workflow_friction === "Yes") return true;
  if (findings.key_finding_note.trim()) return true;
  return buildObservationIntelligenceView(caseRow).hasAnyContent;
}

function discoverySignalBoost(
  providerContact: Record<string, unknown> | null | undefined,
  signalId: "product_alignment" | "workflow_visibility",
): number {
  if (!providerContact) return 0;
  const status = resolveDiscoveryStructuredSignalStatus(signalId, providerContact);
  if (status === DISCOVERY_FIELD_STATUS.validated) return 2;
  if (status === DISCOVERY_FIELD_STATUS.captured || status === DISCOVERY_FIELD_STATUS.conditional) {
    return 1;
  }
  return 0;
}

function buildTrend(
  baseline: ObservationOpportunityRadarConfidence,
  current: ObservationOpportunityRadarConfidence,
): ObservationOpportunityRadarTrend {
  const delta = confidenceScore(current) - confidenceScore(baseline);
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "unchanged";
}

function buildProductBlip(input: {
  id: RadarSlotId;
  title: string;
  pattern: RegExp;
  ctx: RadarContext;
  discoveryNeedle: RegExp;
}): ObservationOpportunityRadarBlip | null {
  const productFocus = resolveProductFocus(input.ctx);
  const discoveryHit =
    input.discoveryNeedle.test(input.ctx.discoveryText) ||
    (productFocus ? input.pattern.test(productFocus) : false);

  if (!discoveryHit && !input.ctx.hasObservationCapture) return null;

  let baselineScore = 0;
  if (providerFieldText(input.ctx.providerContact, "provider_product_gaps")) baselineScore = 1;
  if (providerFieldText(input.ctx.providerContact, "provider_product_interests")) baselineScore = 1;
  if (productFocus && input.pattern.test(productFocus)) baselineScore = Math.max(baselineScore, 1);
  if (discoverySignalBoost(input.ctx.providerContact, "product_alignment") >= 1) {
    baselineScore = Math.max(baselineScore, 1);
  }

  let score = baselineScore;
  const mentioned = input.pattern.test(`${input.ctx.discoveryText}\n${input.ctx.observationText}`);
  const { quickFindings } = input.ctx;

  if (input.ctx.hasObservationCapture) {
    if (mentioned && quickFindings.product_interest === "Strong") score = 2;
    else if (
      mentioned &&
      (quickFindings.product_interest === "Mentioned" || quickFindings.workflow_fit === "Possible")
    ) {
      score = Math.max(score, 1);
    } else if (mentioned) score = Math.max(score, 1);
    else if (discoveryHit) score = Math.max(0, score - 1);

    if (quickFindings.workflow_fit === "Strong") score = Math.min(2, score + 1);
    if (quickFindings.workflow_fit === "Weak") score = Math.max(0, score - 1);
  }

  const baselineConfidence = scoreToConfidence(baselineScore);
  const confidence = scoreToConfidence(score);

  const detail =
    input.ctx.intelligenceById.product_fit_signals?.find((line) => input.pattern.test(line)) ??
    providerFieldText(input.ctx.providerContact, "provider_product_gaps") ??
    (productFocus && input.pattern.test(productFocus) ? `${productFocus} flagged for this case.` : null);

  return {
    id: input.id,
    title: input.title,
    confidence,
    confidenceLabel: CONFIDENCE_LABEL[confidence],
    baselineConfidence,
    trend: buildTrend(baselineConfidence, confidence),
    detail,
    sourceLabel: input.ctx.hasObservationCapture ? "Field capture" : "Discovery intel",
    validated: confidence === "high" && input.ctx.hasObservationCapture,
  };
}

function buildWorkflowBlip(ctx: RadarContext): ObservationOpportunityRadarBlip {
  const pain = providerFieldText(ctx.providerContact, "provider_workflow_pain_points");
  const frustrations = providerFieldText(ctx.providerContact, "provider_clinical_frustrations");

  let baselineScore = pain || frustrations ? 1 : 0;
  if (discoverySignalBoost(ctx.providerContact, "workflow_visibility") >= 1) {
    baselineScore = Math.max(baselineScore, 1);
  }

  let score = baselineScore;
  if (ctx.hasObservationCapture) {
    if (ctx.quickFindings.workflow_friction === "Yes") score = Math.max(score, 1);
    if (ctx.intelligenceById.workflow_friction?.length) score = Math.max(score, 1);
    if (ctx.quickFindings.workflow_fit === "Strong") score = 2;
    if (ctx.quickFindings.workflow_friction === "No" && baselineScore > 0) score = Math.max(0, score - 1);
  }

  const baselineConfidence = scoreToConfidence(baselineScore);
  const confidence = scoreToConfidence(score);

  return {
    id: "workflow_improvement",
    title: "Workflow improvement opportunity",
    confidence,
    confidenceLabel: CONFIDENCE_LABEL[confidence],
    baselineConfidence,
    trend: buildTrend(baselineConfidence, confidence),
    detail: pain ?? frustrations ?? "Validate whether workflow friction repeats in the OR.",
    sourceLabel: ctx.hasObservationCapture ? "Field capture" : "Discovery intel",
    validated: confidence === "high" && ctx.hasObservationCapture,
  };
}

function buildTrainingBlip(ctx: RadarContext): ObservationOpportunityRadarBlip {
  const interests = providerFieldText(ctx.providerContact, "provider_product_interests");
  const technique =
    ctx.providerIntelligence?.technique_preferences ??
    providerFieldText(ctx.providerContact, "provider_technique_preferences");

  let baselineScore = interests || technique ? 1 : 0;
  let score = baselineScore;

  if (ctx.hasObservationCapture) {
    if (ctx.intelligenceById.staff_observations?.length) score = Math.max(score, 1);
    if (/training|technique|adoption|reproduc/i.test(ctx.observationText)) score = Math.max(score, 1);
    if (ctx.quickFindings.workflow_fit === "Weak") score = Math.max(0, score - 1);
  }

  const baselineConfidence = scoreToConfidence(baselineScore);
  const confidence = scoreToConfidence(score);

  return {
    id: "training",
    title: "Training opportunity",
    confidence,
    confidenceLabel: CONFIDENCE_LABEL[confidence],
    baselineConfidence,
    trend: buildTrend(baselineConfidence, confidence),
    detail: interests ?? technique ?? "Watch for technique adoption or staff coaching gaps.",
    sourceLabel: ctx.hasObservationCapture ? "Field capture" : "Discovery intel",
    validated: confidence === "high" && ctx.hasObservationCapture,
  };
}

function buildConversionBlip(ctx: RadarContext): ObservationOpportunityRadarBlip {
  const competitive =
    providerFieldText(ctx.providerContact, "provider_competitive_products") ??
    ctx.providerIntelligence?.competitive_products ??
    null;
  const future = providerFieldText(ctx.providerContact, "provider_future_opportunity_signals");

  let baselineScore = competitive || future ? 1 : 0;
  let score = baselineScore;

  if (ctx.hasObservationCapture) {
    if (ctx.quickFindings.competitor_seen === "Yes") score = Math.max(score, 1);
    if (ctx.intelligenceById.competitor_products?.length) score = Math.max(score, 1);
    if (ctx.intelligenceById.growth_opportunities?.length) score = Math.max(score, 2);
    if (ctx.quickFindings.competitor_seen === "None" && baselineScore > 0) score = Math.max(0, score - 1);
  }

  const baselineConfidence = scoreToConfidence(baselineScore);
  const confidence = scoreToConfidence(score);

  return {
    id: "conversion",
    title: "Conversion opportunity",
    confidence,
    confidenceLabel: CONFIDENCE_LABEL[confidence],
    baselineConfidence,
    trend: buildTrend(baselineConfidence, confidence),
    detail: future ?? competitive ?? "Validate competitor weakness or product gaps in the room.",
    sourceLabel: ctx.hasObservationCapture ? "Field capture" : "Discovery intel",
    validated: confidence === "high" && ctx.hasObservationCapture,
  };
}

export function buildObservationOpportunityRadar(input: {
  caseRow: Record<string, unknown>;
  engagement?: Record<string, unknown> | null;
  providerContact?: Record<string, unknown> | null;
  providerIntelligence?: ProviderIntelligenceSnapshot | null;
}): ObservationOpportunityRadarView {
  const productFocus = resolveProductFocus(input);
  const discoveryText = collectDiscoveryText({ ...input, productFocus });
  const observationText = collectObservationText(input.caseRow);
  const quickFindings = observationQuickFindingsFromCaseRow(input.caseRow);
  const intelligence = buildObservationIntelligenceView(input.caseRow);
  const intelligenceById = Object.fromEntries(intelligence.categories.map((cat) => [cat.id, cat.items]));
  const hasCapture = hasObservationCapture(input.caseRow);

  const ctx: RadarContext = {
    caseRow: input.caseRow,
    engagement: input.engagement,
    providerContact: input.providerContact,
    providerIntelligence: input.providerIntelligence,
    discoveryText,
    observationText,
    quickFindings,
    intelligenceById,
    hasObservationCapture: hasCapture,
  };

  const blips: ObservationOpportunityRadarBlip[] = [];

  const acsis = buildProductBlip({
    id: "acsis",
    title: "ACSIS opportunity",
    pattern: ACSIS_PATTERN,
    discoveryNeedle: ACSIS_PATTERN,
    ctx,
  });
  if (acsis) blips.push(acsis);

  const endolumik = buildProductBlip({
    id: "endolumik",
    title: "Endolumik opportunity",
    pattern: ENDOLUMIK_PATTERN,
    discoveryNeedle: ENDOLUMIK_PATTERN,
    ctx,
  });
  if (endolumik) blips.push(endolumik);

  blips.push(buildWorkflowBlip(ctx));
  blips.push(buildTrainingBlip(ctx));

  if (
    providerFieldText(input.providerContact, "provider_competitive_products") ||
    providerFieldText(input.providerContact, "provider_future_opportunity_signals") ||
    /conversion opportunity/i.test(discoveryText) ||
    hasCapture
  ) {
    blips.push(buildConversionBlip(ctx));
  }

  const sorted = [...blips].sort(
    (a, b) => confidenceScore(b.confidence) - confidenceScore(a.confidence),
  );

  return {
    blips: sorted,
    hasObservationCapture: hasCapture,
    headline: hasCapture ? "Product fit signals · field updated" : "Product fit signals · pre-observation",
    lead: hasCapture
      ? "Confidence shifts as field signals confirm or weaken each product fit hypothesis."
      : "Hypotheses from discovery intelligence — validate each one during observation.",
  };
}
