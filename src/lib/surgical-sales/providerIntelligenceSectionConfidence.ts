/**

 * Section-level operational maturity — signal quality, recency, attribution, and anchors.

 * Completion % is secondary; never the primary maturity driver.

 */



import type { ProviderIntelligenceSectionId } from "@/lib/surgical-sales/providerIntelligenceArchitecture";
import { resolveIntelligenceCardReadiness } from "@/lib/surgical-sales/providerIntelligenceCardStatus";

import { PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER } from "@/lib/surgical-sales/providerIntelligenceArchitecture";

import type { ProviderIntelligenceFieldMetadataMap } from "@/lib/surgical-sales/providerIntelligenceFieldMetadata";
import { resolveIntelligenceFieldLifecycle } from "@/lib/surgical-sales/providerIntelligenceLifecycle";
import {
  fieldRecencyIso,
  recencyMultiplierFromFieldMeta,
  resolveIntelligenceFieldFreshness,
} from "@/lib/surgical-sales/providerIntelligenceFreshness";

import {

  intelligenceCaptureHasSignal,

  intelligenceCaptureSpecForKey,

  parseIntelligenceCaptureValue,

} from "@/lib/surgical-sales/providerIntelligenceStructuredCapture";



/** Internal tier — maps to rep-facing Low / Partial / Strong / Validated. */

export type IntelligenceSectionConfidence = "unknown" | "partial" | "confirmed" | "validated";



import {
  OPERATIONAL_MATURITY_SECTION_HINTS,
  OPERATIONAL_MATURITY_SECTION_LABELS,
} from "@/lib/surgical-sales/providerOperationalMaturityVocabulary";

export const INTELLIGENCE_CONFIDENCE_DISPLAY_LABELS: Record<
  IntelligenceSectionConfidence,
  string
> = { ...OPERATIONAL_MATURITY_SECTION_LABELS };

export const INTELLIGENCE_SECTION_CONFIDENCE_HINTS: Record<
  IntelligenceSectionConfidence,
  string
> = { ...OPERATIONAL_MATURITY_SECTION_HINTS };



/** @deprecated Prefer INTELLIGENCE_CONFIDENCE_DISPLAY_LABELS */

export const INTELLIGENCE_SECTION_CONFIDENCE_LABELS = INTELLIGENCE_CONFIDENCE_DISPLAY_LABELS;



/** Progress bar fill keyed to maturity tier (not field completion %). */

export const INTELLIGENCE_SECTION_CONFIDENCE_PROGRESS: Record<IntelligenceSectionConfidence, number> = {

  unknown: 0,

  partial: 34,

  confirmed: 67,

  validated: 100,

};



const CONFIDENCE_RANK: Record<IntelligenceSectionConfidence, number> = {

  unknown: 0,

  partial: 1,

  confirmed: 2,

  validated: 3,

};



const STALE_MS = 90 * 24 * 60 * 60 * 1000;

const RECENT_MS = 45 * 24 * 60 * 60 * 1000;



const HIGH_TRUST_SOURCES = new Set(["observation", "case", "intro_call", "promote"]);



/** Primary fields that anchor confidence for each section. */

export const SECTION_CONFIDENCE_ANCHORS: Record<ProviderIntelligenceSectionId, readonly string[]> = {

  clinical_workflow: ["provider_procedure_focus", "provider_technique_preferences"],

  or_environment: ["provider_credentialing_status", "provider_or_team_dynamics"],

  relationship_intelligence: ["provider_communication_style", "influence_level"],

  commercial_signals: ["provider_evaluation_openness", "provider_competitive_products"],

  observation_readiness: [

    "provider_observation_feasibility",

    "provider_observation_credentialing_needed",

    "provider_ideal_observation_cases",

  ],

};



export type IntelligenceFieldQualityAssessment = {

  dbKey: string;

  score: number;

  hasSignal: boolean;

  depth: "none" | "weak" | "structured" | "validated";

};



export type IntelligenceConfidenceDeriveOptions = {

  fieldMetadata?: ProviderIntelligenceFieldMetadataMap;

  nowMs?: number;

};



export type IntelligenceSectionConfidenceResult = {

  confidence: IntelligenceSectionConfidence;

  confidence_score: number;

  confidence_progress: number;

  field_assessments: IntelligenceFieldQualityAssessment[];

  anchor_score: number;

  average_score: number;

  validated_field_count: number;

  anchors_confirmed: boolean;

  recency_factor: number;

  attribution_factor: number;

  outdated_signal_count: number;

  refresh_reminder_count: number;

};



const EMPTY_TOKENS = new Set(["unknown", ""]);



function notesDepth(notes: string): boolean {

  return notes.trim().length >= 12;

}



function legacyDepth(text: string): "weak" | "structured" | "validated" {

  const len = text.trim().length;

  if (len >= 48) return "validated";

  if (len >= 18) return "structured";

  return "weak";

}



/** Score 0–1 for a single intelligence field based on structure and narrative depth. */

export function assessIntelligenceFieldQuality(

  dbKey: string,

  raw: string | null | undefined,

): IntelligenceFieldQualityAssessment {

  const trimmed = String(raw ?? "").trim();

  if (!trimmed || !intelligenceCaptureHasSignal(dbKey, trimmed)) {

    return { dbKey, score: 0, hasSignal: false, depth: "none" };

  }



  const spec = intelligenceCaptureSpecForKey(dbKey);

  if (!spec) {

    const depth = legacyDepth(trimmed);

    const score = depth === "validated" ? 0.92 : depth === "structured" ? 0.72 : 0.45;

    return { dbKey, score, hasSignal: true, depth: depth === "validated" ? "validated" : depth === "structured" ? "structured" : "weak" };

  }



  const parsed = parseIntelligenceCaptureValue(dbKey, trimmed);



  if (parsed.legacyText && !parsed.token && parsed.tokens.length === 0) {

    const depth = legacyDepth(parsed.legacyText);

    const score = depth === "validated" ? 0.9 : depth === "structured" ? 0.68 : 0.42;

    return { dbKey, score, hasSignal: true, depth: depth === "validated" ? "validated" : depth === "structured" ? "structured" : "weak" };

  }



  if (spec.input === "textarea") {

    const depth = legacyDepth(parsed.notes || trimmed);

    const score = depth === "validated" ? 0.95 : depth === "structured" ? 0.78 : 0.5;

    return { dbKey, score, hasSignal: true, depth: depth === "validated" ? "validated" : depth === "structured" ? "structured" : "weak" };

  }



  const validTokens = [

    ...(parsed.token && !EMPTY_TOKENS.has(parsed.token) ? [parsed.token] : []),

    ...parsed.tokens.filter((t) => !EMPTY_TOKENS.has(t)),

  ];

  const hasStructured = validTokens.length > 0;

  const tokenIsWeak = parsed.token && EMPTY_TOKENS.has(parsed.token);

  const deepNotes = notesDepth(parsed.notes);



  if (!hasStructured && deepNotes) {

    return { dbKey, score: 0.72, hasSignal: true, depth: "structured" };

  }



  if (!hasStructured && tokenIsWeak) {

    return { dbKey, score: 0.22, hasSignal: true, depth: "weak" };

  }



  if (hasStructured && (deepNotes || validTokens.length >= 2)) {

    return { dbKey, score: 1, hasSignal: true, depth: "validated" };

  }



  if (hasStructured) {

    return { dbKey, score: 0.68, hasSignal: true, depth: "structured" };

  }



  if (deepNotes) {

    return { dbKey, score: 0.58, hasSignal: true, depth: "structured" };

  }



  return { dbKey, score: 0.35, hasSignal: true, depth: "weak" };

}



function mean(nums: number[]): number {

  if (nums.length === 0) return 0;

  return nums.reduce((a, b) => a + b, 0) / nums.length;

}



function recencyMultiplier(iso: string | undefined, nowMs: number): number {

  if (!iso) return 0.72;

  const ms = nowMs - new Date(iso).getTime();

  if (!Number.isFinite(ms)) return 0.72;

  if (ms <= RECENT_MS) return 1;

  if (ms <= STALE_MS) return 0.88;

  return 0.62;

}



function fieldEffectiveScore(

  assessment: IntelligenceFieldQualityAssessment,

  metadata: ProviderIntelligenceFieldMetadataMap | undefined,

  nowMs: number,

  contact?: Record<string, unknown>,

): number {

  if (!assessment.hasSignal) return 0;



  let score = assessment.score;

  const meta = metadata?.[assessment.dbKey];



  if (meta?.validated_at) {

    score = Math.min(1, score + 0.14);

  }



  score *= recencyMultiplierFromFieldMeta(meta, assessment.dbKey, nowMs);



  if (meta?.source_type && HIGH_TRUST_SOURCES.has(meta.source_type)) {

    score = Math.min(1, score + 0.06);

  }



  if (meta?.source_label && meta.source_label !== "Provider profile") {

    score = Math.min(1, score + 0.03);

  }

  const freshness = resolveIntelligenceFieldFreshness(
    assessment.dbKey,
    contact?.[assessment.dbKey] as string | null | undefined,
    meta,
    nowMs,
  );
  if (freshness) {
    score *= freshness.confidenceDecay;
  }

  return score;

}



function anchorIsConfirmed(

  dbKey: string,

  assessments: IntelligenceFieldQualityAssessment[],

  metadata: ProviderIntelligenceFieldMetadataMap | undefined,

  contact: Record<string, unknown>,

  nowMs: number,

): boolean {

  const assessment = assessments.find((a) => a.dbKey === dbKey);

  if (!assessment?.hasSignal) return false;

  const lifecycle = resolveIntelligenceFieldLifecycle(
    dbKey,
    contact[dbKey] as string | null | undefined,
    metadata?.[dbKey],
    nowMs,
  );
  if (lifecycle?.state === "outdated" || lifecycle?.state === "assumed") return false;

  if (assessment.depth === "validated") return true;

  const meta = metadata?.[dbKey];

  if (meta?.validated_at) return true;

  if (
    lifecycle?.state === "confirmed" ||
    lifecycle?.state === "validated"
  ) {
    return true;
  }

  if (

    assessment.depth === "structured" &&

    meta?.source_type &&

    HIGH_TRUST_SOURCES.has(meta.source_type)

  ) {

    return true;

  }

  return false;

}



function sectionRecencyAndAttribution(

  fieldKeys: readonly string[],

  metadata: ProviderIntelligenceFieldMetadataMap | undefined,

  nowMs: number,

): { recency_factor: number; attribution_factor: number } {

  const recencyScores: number[] = [];

  let attributed = 0;

  let withSignal = 0;



  for (const key of fieldKeys) {

    const meta = metadata?.[key];

    if (!meta) continue;

    withSignal += 1;

    recencyScores.push(recencyMultiplierFromFieldMeta(meta, key, nowMs));

    if (meta.source_type && meta.source_type !== "profile") attributed += 1;

    if (meta.validated_at) attributed += 0.5;

  }



  return {

    recency_factor: recencyScores.length > 0 ? mean(recencyScores) : 0.5,

    attribution_factor: withSignal > 0 ? Math.min(1, attributed / withSignal) : 0,

  };

}



export function formatIntelligenceConfidenceDisplayLabel(

  confidence: IntelligenceSectionConfidence,

): string {

  return INTELLIGENCE_CONFIDENCE_DISPLAY_LABELS[confidence];

}

export function formatSectionSignalsCapturedDetail(
  filled: number,
  total: number,
  options?: { unresolvedCount?: number; confidence?: IntelligenceSectionConfidence },
): string {
  return resolveIntelligenceCardReadiness({
    mapped: filled,
    total,
    unresolvedCount: options?.unresolvedCount ?? Math.max(0, total - filled),
    confidence: options?.confidence,
  }).metricsLine;
}



export function weakestSectionConfidence(

  confidences: IntelligenceSectionConfidence[],

): IntelligenceSectionConfidence {

  let weakest: IntelligenceSectionConfidence = "validated";

  for (const c of confidences) {

    if (CONFIDENCE_RANK[c] < CONFIDENCE_RANK[weakest]) weakest = c;

  }

  return weakest;

}



export function deriveIntelligenceSectionConfidence(

  sectionId: ProviderIntelligenceSectionId,

  contact: Record<string, unknown>,

  options?: IntelligenceConfidenceDeriveOptions,

): IntelligenceSectionConfidenceResult {

  const fieldKeys = PROVIDER_INTELLIGENCE_SECTION_FIELD_ORDER[sectionId] ?? [];

  const anchorKeys = SECTION_CONFIDENCE_ANCHORS[sectionId] ?? [];

  const metadata = options?.fieldMetadata;

  const nowMs = options?.nowMs ?? Date.now();



  const field_assessments = fieldKeys.map((key) =>

    assessIntelligenceFieldQuality(key, contact[key] as string | null | undefined),

  );



  const effectiveScores = field_assessments.map((a) =>

    fieldEffectiveScore(a, metadata, nowMs, contact),

  );

  const signalScores = effectiveScores.filter((_, i) => field_assessments[i]!.hasSignal);

  const average_score = mean(effectiveScores);
  const signal_average = mean(signalScores);

  const anchor_score = mean(

    anchorKeys.map((key) => {

      const idx = field_assessments.findIndex((a) => a.dbKey === key);

      return idx >= 0 ? effectiveScores[idx]! : 0;

    }),

  );

  const validated_field_count = field_assessments.filter((a) => a.depth === "validated").length;

  const structured_or_better = field_assessments.filter(

    (a) => a.depth === "structured" || a.depth === "validated",

  ).length;

  const anchors_confirmed = anchorKeys.every((key) =>

    anchorIsConfirmed(key, field_assessments, metadata, contact, nowMs),

  );



  const { recency_factor, attribution_factor } = sectionRecencyAndAttribution(

    fieldKeys,

    metadata,

    nowMs,

  );



  let confidence: IntelligenceSectionConfidence = "unknown";



  if (signalScores.length === 0 || signal_average < 0.18) {

    confidence = "unknown";

  } else if (

    signal_average >= 0.74 &&

    anchor_score >= 0.68 &&

    anchors_confirmed &&

    recency_factor >= 0.7 &&

    (validated_field_count >= 2 ||

      (validated_field_count >= 1 && structured_or_better >= 3 && attribution_factor >= 0.25))

  ) {

    confidence = "validated";

  } else if (

    signal_average >= 0.48 &&

    anchor_score >= 0.55 &&

    (anchors_confirmed || anchor_score >= 0.62)

  ) {

    confidence = "confirmed";

  } else if (signalScores.length > 0) {

    confidence = "partial";

  }



  if (confidence === "confirmed" && recency_factor < 0.65 && !anchors_confirmed) {

    confidence = "partial";

  }

  if (confidence === "validated" && recency_factor < 0.55) {

    confidence = "confirmed";

  }

  let outdated_signal_count = 0;
  let refresh_reminder_count = 0;
  for (const key of fieldKeys) {
    const lifecycle = resolveIntelligenceFieldLifecycle(
      key,
      contact[key] as string | null | undefined,
      metadata?.[key],
      nowMs,
    );
    if (!lifecycle) continue;
    if (lifecycle.state === "outdated") outdated_signal_count += 1;
    if (lifecycle.needsRefresh) refresh_reminder_count += 1;
  }
  if (outdated_signal_count > 0 && confidence === "validated") {
    confidence = "confirmed";
  }
  if (outdated_signal_count > 0 && confidence === "confirmed" && recency_factor < 0.75) {
    confidence = "partial";
  }



  const confidence_progress = INTELLIGENCE_SECTION_CONFIDENCE_PROGRESS[confidence];

  const confidence_score = Math.round(

    confidence === "unknown"

      ? 0

      : confidence === "partial"

        ? 18 + signal_average * 38 + recency_factor * 8

        : confidence === "confirmed"

          ? 52 + signal_average * 28 + attribution_factor * 10

          : 80 + signal_average * 14 + recency_factor * 6,

  );



  return {

    confidence,

    confidence_score,

    confidence_progress,

    field_assessments,

    anchor_score,

    average_score,

    validated_field_count,

    anchors_confirmed,

    recency_factor,

    attribution_factor,

    outdated_signal_count,

    refresh_reminder_count,

  };

}



export function formatIntelligenceSectionConfidenceLabel(confidence: IntelligenceSectionConfidence): string {

  return formatIntelligenceConfidenceDisplayLabel(confidence);

}



export function formatIntelligenceSectionConfidenceHint(

  confidence: IntelligenceSectionConfidence,

  result?: Pick<
    IntelligenceSectionConfidenceResult,
    "anchors_confirmed" | "recency_factor" | "attribution_factor"
  > &
    Partial<
      Pick<
        IntelligenceSectionConfidenceResult,
        "outdated_signal_count" | "refresh_reminder_count"
      >
    >,

): string {

  const base = INTELLIGENCE_SECTION_CONFIDENCE_HINTS[confidence];

  if (!result) return base;

  const parts: string[] = [base];

  if (!result.anchors_confirmed && confidence !== "unknown") {

    parts.push("Key items still open before the visit");

  }

  if (result.recency_factor < 0.65 && confidence !== "unknown") {

    parts.push("Refresh stale signals");

  }

  if ((result?.outdated_signal_count ?? 0) > 0) {

    parts.push("Some validated signals are outdated — re-validate on your next touch");

  } else if ((result?.refresh_reminder_count ?? 0) > 0 && confidence !== "unknown") {

    parts.push("Refresh signals validated more than nine months ago");

  }

  if (result.attribution_factor < 0.2 && confidence === "partial") {

    parts.push("Add source context when you capture");

  }

  return parts.join(" · ");

}



export function planningStatusFromConfidence(

  confidence: IntelligenceSectionConfidence,

): "not_started" | "in_progress" | "complete" {

  if (confidence === "unknown") return "not_started";

  if (confidence === "validated") return "complete";

  return "in_progress";

}


